import "server-only";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { LIVE_BUCKET } from "@/lib/live-engine/protocol";

/** A director version's composition, rebuilt for the edit room: its video.html (real UI pasted in) from director.tgz,
 *  and the brand files it loads from the capture's packs — in a local cache, served same-origin so the editor can seek
 *  the timeline and move elements. The paths the composition uses (capture/…, ../../../../brands/<slug>/…) point at
 *  the unpacked brand files. */
export type CompositionFiles = { comp: string; brand: string };

const ROOT = path.join(os.tmpdir(), "mgx-composition");
const building = new Map<string, Promise<CompositionFiles | null>>();
const PACKS = /^(clones|assets|library|screens|parts)\.tgz(\.part\d+)?$/;

async function download(db: ReturnType<typeof createAdminClient>, p: string) {
  const { data, error } = await db.storage.from(LIVE_BUCKET).download(p);
  if (error || !data) throw new Error(`download ${p}: ${error?.message ?? "missing"}`);
  return Buffer.from(await data.arrayBuffer());
}
const untar = (buf: Buffer, into: string) => { const f = path.join(into, `.pack-${Math.random().toString(36).slice(2)}.tgz`); fs.writeFileSync(f, buf); try { execFileSync("tar", ["-xzf", f, "-C", into]); } finally { fs.rmSync(f, { force: true }); } };

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
    const prefix = `${job.workspace_id}/captures/${job.capture_id}/_pack`;
    const { data: files } = await db.storage.from(LIVE_BUCKET).list(prefix, { limit: 200 });
    // a big pack is stored in parts: joined in order, then unpacked
    const groups = new Map<string, string[]>();
    for (const f of (files ?? []).map((x) => x.name).filter((n) => PACKS.test(n)).sort()) { const base = f.replace(/\.part\d+$/, ""); groups.set(base, [...(groups.get(base) ?? []), f]); }
    for (const parts of groups.values()) untar(Buffer.concat(await Promise.all(parts.sort((a, b) => (+(a.match(/\.part(\d+)$/)?.[1] ?? 0)) - (+(b.match(/\.part(\d+)$/)?.[1] ?? 0))).map((p) => download(db, `${prefix}/${p}`)))), path.join(tmp, "brand"));
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
