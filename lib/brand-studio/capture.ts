import "server-only";
// A created brand has no website to capture, so its pack becomes its capture: the same brand.json + library the video and
// post engines read, and a finished live_brand_captures row. Nothing here runs for a brand captured from a website.
import { gzipSync } from "node:zlib";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import { LIVE_BUCKET, storagePath } from "@/lib/live-engine/protocol";

export const CREATED_DOMAIN = "created.local";

/** a .tar of files (POSIX ustar), enough for the worker's `tar -xzf` */
function tar(files: { path: string; bytes: Uint8Array }[]) {
  const blocks: Buffer[] = [];
  for (const f of files) {
    const h = Buffer.alloc(512);
    h.write(f.path, 0, 100);
    h.write("0000644\0", 100); h.write("0000000\0", 108); h.write("0000000\0", 116);
    h.write(`${f.bytes.length.toString(8).padStart(11, "0")}\0`, 124);
    h.write(`${Math.floor(Date.now() / 1000).toString(8).padStart(11, "0")}\0`, 136);
    h.write("        ", 148); h.write("0", 156); h.write("ustar\0" + "00", 257);
    let sum = 0; for (const b of h) sum += b;
    h.write(`${sum.toString(8).padStart(6, "0")}\0 `, 148);
    blocks.push(h, Buffer.from(f.bytes), Buffer.alloc((512 - (f.bytes.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(blocks));
}

/** make (or return) the capture of a created brand, from its stored pack */
export async function captureFromPack(workspaceId: string, companyId: string, pack: string) {
  if (!pack.startsWith(`${workspaceId}/brand-packs/`)) throw new Error("not this workspace's pack");
  const db = createAdminClient(), store = db.storage.from("brand-assets");
  const { data: existing } = await db.from("live_brand_captures").select("id").eq("company_id", companyId).eq("domain", CREATED_DOMAIN).eq("status", "done").limit(1).maybeSingle();
  if (existing) return existing.id as string;
  const read = async (p: string) => { const { data } = await store.download(`${pack}/files/${p}`); return data ? new Uint8Array(await data.arrayBuffer()) : null; };
  const { data: mf } = await store.download(`${pack}/manifest.json`);
  if (!mf) throw new Error("the pack has no manifest");
  const m = JSON.parse(await mf.text()) as { name: string; paths: string[]; world: { kind: string; label: string }[] };
  const brandFile = await read("brand.json");
  if (!brandFile) throw new Error("the pack has no brand.json");
  const brand = JSON.parse(new TextDecoder().decode(brandFile));
  const logo = await read("website/images/logo.png") ?? await read("logo/png/logo-color.png");
  if (!logo) throw new Error("the pack has no logo");
  const library: { path: string; bytes: Uint8Array }[] = [{ path: "library/logo/logo.png", bytes: logo }];
  const images: Record<string, unknown>[] = [];
  const addImage = async (from: string, name: string, note: string) => {
    const bytes = await read(from);
    if (!bytes) return;
    const meta = await sharp(Buffer.from(bytes)).metadata(), file = `library/images/${name}.jpg`;
    library.push({ path: file, bytes });
    images.push({ file, kind: "lifestyle", w: meta.width, h: meta.height, alt: "", note });
  };
  for (const w of m.world) await addImage(`designs/${w.kind}.jpg`, w.kind, `Concept photo of the brand: ${w.label}. AI-made for the brand's identity, not a real location or customer.`);
  for (const p of m.paths.filter((x) => /^website\/images\/.+\.jpg$/.test(x))) await addImage(p, `site-${p.split("/").pop()!.replace(/\.jpg$/, "")}`, "Photo from the brand's designed website. AI-made, not a real customer.");
  const screens: Record<string, unknown>[] = [];
  const site = await read("designs/website.jpg");
  if (site) {
    const view = new Uint8Array(await sharp(Buffer.from(site)).extract({ left: 0, top: 0, width: 1440, height: 900 }).jpeg({ quality: 85 }).toBuffer());
    library.push({ path: "library/screens/website.full.jpg", bytes: site }, { path: "library/screens/website.jpg", bytes: view });
    screens.push({ id: "website", file: "library/screens/website.full.jpg", view: "library/screens/website.jpg", label: "Designed home page", app: false, customer: false, empty: false, use: "hero", features: [], covers: [], url: "", shows: "The brand's designed home page. A design for a brand that is just starting: not a live site, so never say it is online or show a web address." });
  }
  const profile = { ...brand, site: "", created: true, screens, images, app_access: "none" };
  const manifest = { created: true, pages: [], app: { status: "skipped", screens: [], plan: [], notes: "A brand created in MotionGX: there is no website or app to capture yet. Only what brand.json says is true of it." } };
  const { data: cap, error } = await db.from("live_brand_captures").insert({ workspace_id: workspaceId, company_id: companyId, version: 4, domain: CREATED_DOMAIN, site_url: `https://${companyId}.${CREATED_DOMAIN}/`, status: "queued", app_status: "skipped", pages: 0, app_screens: 0, manifest, profile }).select("id").single();
  if (error || !cap) throw new Error(`capture row: ${error?.message}`);
  const ids = { workspaceId, captureId: cap.id as string }, bucket = db.storage.from(LIVE_BUCKET);
  const put = async (logical: string, body: Uint8Array, contentType: string) => { const { error: e } = await bucket.upload(storagePath(logical, ids), body, { contentType, upsert: true }); if (e) throw new Error(`capture upload ${logical}: ${e.message}`); };
  await put("brand/_pack/library.tgz", tar(library), "application/gzip");
  await put("brand/brand.json", new TextEncoder().encode(JSON.stringify(profile, null, 2)), "application/json");
  await put("brand/capture.json", new TextEncoder().encode(JSON.stringify(manifest, null, 2)), "application/json");
  await db.from("live_brand_captures").update({ status: "done" }).eq("id", cap.id);
  return cap.id as string;
}
