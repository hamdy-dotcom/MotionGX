import "server-only";
// A brand pack's files, kept unzipped next to the zip so the brand's page can show them: the website, the photos, the
// documents and the logos. raw = {source: "created", pack: "<workspace>/brand-packs/<id>"} on the company points here.
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "brand-assets", WEEK = 7 * 24 * 3600;
const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", svg: "image/svg+xml", html: "text/html", md: "text/markdown", json: "application/json", css: "text/css", js: "text/javascript", pdf: "application/pdf", zip: "application/zip" };
const typeOf = (p: string) => TYPES[p.split(".").pop() ?? ""] ?? "application/octet-stream";

export type WorldLabel = { kind: string; label: string };
export type CreatedBrand = {
  name: string; files: number; packUrl: string; logoUrl: string; siteHtml: string | null;
  world: { kind: string; label: string; url: string }[];
  docs: { path: string; url: string }[];
  logos: { path: string; url: string }[];
};

export async function storePack(base: string, name: string, zip: Uint8Array, files: { path: string; bytes: Uint8Array }[], world: WorldLabel[]) {
  const db = createAdminClient();
  const put = async (path: string, bytes: Uint8Array, contentType: string) => {
    const { error } = await db.storage.from(BUCKET).upload(`${base}/${path}`, bytes, { contentType, upsert: true });
    if (error) throw new Error(`pack upload ${path}: ${error.message}`);
  };
  await put("pack.zip", zip, "application/zip");
  for (let i = 0; i < files.length; i += 8) await Promise.all(files.slice(i, i + 8).map((f) => put(`files/${f.path}`, f.bytes, typeOf(f.path))));
  await put("manifest.json", new TextEncoder().encode(JSON.stringify({ name, paths: files.map((f) => f.path), world })), "application/json");
}

export async function createdBrand(workspaceId: string, pack: string): Promise<CreatedBrand | null> {
  if (!pack.startsWith(`${workspaceId}/brand-packs/`)) return null;
  const db = createAdminClient(), bucket = db.storage.from(BUCKET);
  const { data: raw } = await bucket.download(`${pack}/manifest.json`);
  if (!raw) return null;
  const m = JSON.parse(await raw.text()) as { name: string; paths: string[]; world: WorldLabel[] };
  const signed = async (paths: string[], download = false) => {
    const out: Record<string, string> = {};
    await Promise.all(paths.map(async (p) => { const { data } = await bucket.createSignedUrl(`${pack}/files/${p}`, WEEK, download ? { download: p.split("/").pop() } : undefined); if (data) out[p] = data.signedUrl; }));
    return out;
  };
  const docPaths = m.paths.filter((p) => !p.includes("/") && !/\.(js|css)$/.test(p) && p !== "README.md"), logoPaths = m.paths.filter((p) => /^logo\/(svg\/(logo|icon)-(ar-)?color\.svg|png\/logo-(ar-)?color\.png)$/.test(p));
  const sitePhotos = m.paths.filter((p) => p.startsWith("website/images/")), worldPaths = m.world.map((w) => `designs/${w.kind}.jpg`).filter((p) => m.paths.includes(p));
  const [docs, logos, images, { data: zipUrl }, { data: siteFile }] = await Promise.all([signed(docPaths, true), signed(logoPaths, true), signed([...sitePhotos, ...worldPaths]), bucket.createSignedUrl(`${pack}/pack.zip`, WEEK, { download: `${m.name}-brand-pack.zip` }), bucket.download(`${pack}/files/website/index.html`)]);
  let siteHtml = siteFile ? await siteFile.text() : null;
  // the page's own relative image paths become addresses the sandboxed frame can load
  if (siteHtml) for (const p of sitePhotos) siteHtml = siteHtml.split(p.replace("website/", "")).join(images[p] ?? "");
  return {
    name: m.name, files: m.paths.length, packUrl: zipUrl?.signedUrl ?? "", logoUrl: images["website/images/logo.png"] ?? "", siteHtml,
    world: m.world.flatMap((w) => { const url = images[`designs/${w.kind}.jpg`]; return url ? [{ ...w, url }] : []; }),
    docs: docPaths.flatMap((path) => (docs[path] ? [{ path, url: docs[path] }] : [])),
    logos: logoPaths.flatMap((path) => (logos[path] ? [{ path: path.split("/").pop()!, url: logos[path] }] : [])),
  };
}
