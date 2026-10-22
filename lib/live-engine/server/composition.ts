import "server-only";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { download, unpackPacks, untar } from "./capture-cache";

/** A director version's composition, rebuilt for the edit room: its video.html (real UI pasted in) from director.tgz,
 *  and the brand files it loads from the capture's packs — in a local cache, served same-origin so the editor can seek
 *  the timeline and move elements. The paths the composition uses (capture/…, ../../../../brands/<slug>/…) point at
 *  the unpacked brand files. */
export type CompositionFiles = { comp: string; brand: string };

const ROOT = path.join(os.tmpdir(), "mgx-composition");
const building = new Map<string, Promise<CompositionFiles | null>>();
const PACKS = /^(clones|assets|library|screens|parts)$/;

async function build(videoId: string, version: number, dir: string): Promise<CompositionFiles | null> {
  const db = createAdminClient();
  const { data: v } = await db.from("video_versions").select("mp4_path, live_job_id").eq("video_id", videoId).eq("version", version).maybeSingle();
  if (!v?.mp4_path || !v.live_job_id) return null;
  const { data: job } = await db.from("live_jobs").select("workspace_id, capture_id").eq("id", v.live_job_id).maybeSingle();
  const run = v.mp4_path.replace(/\/[^/]+$/, "");
  const tmp = `${dir}.part-${process.pid}`;
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(path.join(tmp, "brand"), { recursive: true });
  try {
    untar(await download(db, `${run}/director.tgz`), tmp);
  } catch {
    fs.rmSync(tmp, { recursive: true, force: true });
    return null; // not a director version (or saved before the work dir was kept)
  }
  if (job?.capture_id) {
    await unpackPacks(db, `${job.workspace_id}/captures/${job.capture_id}`, path.join(tmp, "brand"), PACKS);
    for (const f of ["brand.json"]) { try { fs.writeFileSync(path.join(tmp, "brand", f), await download(db, `${job.workspace_id}/captures/${job.capture_id}/${f}`)); } catch { /* optional */ } }
  }
  const comp = path.join(tmp, "director", "composition");
  const html = fs.readFileSync(path.join(comp, "video.html"), "utf8")
    .replace(/(?:\.\.\/)+brands\/[^/"')]+\//g, "brand/")
    .replace(/(["'(])capture\//g, "$1brand/");
  fs.writeFileSync(path.join(comp, "editor.html"), html);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.renameSync(tmp, dir);
  return { comp: path.join(dir, "director", "composition"), brand: path.join(dir, "brand") };
}

export async function compositionFiles(videoId: string, version: number): Promise<CompositionFiles | null> {
  const dir = path.join(ROOT, `${videoId}-v${version}`);
  if (fs.existsSync(path.join(dir, "director", "composition", "editor.html"))) return { comp: path.join(dir, "director", "composition"), brand: path.join(dir, "brand") };
  const key = `${videoId}:${version}`;
  if (!building.has(key)) building.set(key, build(videoId, version, dir).finally(() => building.delete(key)));
  return building.get(key)!;
}

const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".otf": "font/otf", ".gif": "image/gif", ".mp4": "video/mp4", ".ogg": "audio/ogg", ".wav": "audio/wav", ".mp3": "audio/mpeg" };

/** a file of the composition (video.html = the editor's copy); null outside it */
export function compositionFile(files: CompositionFiles, rel: string): { file: string; type: string } | null {
  const clean = rel.replace(/^\/+/, "");
  const file = clean === "video.html" ? path.join(files.comp, "editor.html") : clean.startsWith("brand/") ? path.join(files.brand, clean.slice(6)) : path.join(files.comp, clean);
  const base = clean.startsWith("brand/") ? files.brand : files.comp;
  if (!path.resolve(file).startsWith(path.resolve(base)) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
  return { file, type: TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream" };
}

// The edit room shows the composition in a sandboxed frame (scripts only, no same-origin): it cannot reach the app, and
// its requests carry no cookies — so its files are authorised by a signed, expiring path segment instead.
const secret = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const sign = (payload: string) => crypto.createHmac("sha256", `mgx-composition:${secret()}`).update(payload).digest("base64url").slice(0, 32);

export function compositionToken(videoId: string, version: number, hours = 12) {
  const exp = Math.floor(Date.now() / 1000) + hours * 3600;
  return `${exp}.${sign(`${videoId}:${version}:${exp}`)}`;
}

export function checkCompositionToken(videoId: string, version: number, token: string) {
  const [exp, mac] = token.split(".");
  if (!exp || !mac || !secret() || +exp < Date.now() / 1000) return false;
  const want = sign(`${videoId}:${version}:${exp}`);
  return want.length === mac.length && crypto.timingSafeEqual(Buffer.from(want), Buffer.from(mac));
}
