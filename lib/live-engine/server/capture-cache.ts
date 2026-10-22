import "server-only";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createAdminClient } from "@/lib/supabase/admin";
import { LIVE_BUCKET } from "@/lib/live-engine/protocol";

// A capture uploads its complete results as packs (_pack/<folder>.tgz, split above 45 MB) and only the files the profile
// picked one by one. What the brand page and the company profile show of "everything captured" comes from the packs,
// unpacked once into a local cache.

type Db = ReturnType<typeof createAdminClient>;
const ROOT = path.join(os.tmpdir(), "mgx-capture");
const building = new Map<string, Promise<string | null>>();

export async function download(db: Db, p: string) {
  const { data, error } = await db.storage.from(LIVE_BUCKET).download(p);
  if (error || !data) throw new Error(`download ${p}: ${error?.message ?? "missing"}`);
  return Buffer.from(await data.arrayBuffer());
}

export function untar(buf: Buffer, into: string) {
  const f = path.join(into, `.pack-${Math.random().toString(36).slice(2)}.tgz`);
  fs.writeFileSync(f, buf);
  try { execFileSync("tar", ["-xzf", f, "-C", into]); } finally { fs.rmSync(f, { force: true }); }
}

/** unpack a capture's packs whose folder matches `folders` into `into` (a split pack is joined in order first) */
export async function unpackPacks(db: Db, capturePrefix: string, into: string, folders: RegExp) {
  const prefix = `${capturePrefix}/_pack`;
  const { data: files } = await db.storage.from(LIVE_BUCKET).list(prefix, { limit: 200 });
  const groups = new Map<string, string[]>();
  for (const f of (files ?? []).map((x) => x.name)) {
    const m = f.match(/^(.+?)\.tgz(?:\.part\d+)?$/);
    if (!m || !folders.test(m[1])) continue;
    groups.set(m[1], [...(groups.get(m[1]) ?? []), f]);
  }
  const partNo = (n: string) => +(n.match(/\.part(\d+)$/)?.[1] ?? 0);
  for (const parts of groups.values()) untar(Buffer.concat(await Promise.all(parts.sort((a, b) => partNo(a) - partNo(b)).map((p) => download(db, `${prefix}/${p}`)))), into);
}

/** the capture's screens, parts, library and asset images, unpacked (null: not this workspace's capture, or no packs) */
export async function captureDir(workspaceId: string, captureId: string): Promise<string | null> {
  const dir = path.join(ROOT, captureId);
  if (fs.existsSync(path.join(dir, ".ready"))) return dir;
  if (!building.has(captureId)) {
    building.set(captureId, (async () => {
      const db = createAdminClient();
      const { data: cap } = await db.from("live_brand_captures").select("id").eq("id", captureId).eq("workspace_id", workspaceId).maybeSingle();
      if (!cap) return null;
      const tmp = `${dir}.part-${process.pid}`;
      fs.rmSync(tmp, { recursive: true, force: true });
      fs.mkdirSync(tmp, { recursive: true });
      try {
        await unpackPacks(db, `${workspaceId}/captures/${captureId}`, tmp, /^(screens|parts|library|assets)$/);
      } catch (err) {
        console.error("[capture-cache] unpack failed", { captureId, err });
        fs.rmSync(tmp, { recursive: true, force: true });
        return null;
      }
      fs.writeFileSync(path.join(tmp, ".ready"), "");
      fs.rmSync(dir, { recursive: true, force: true });
      fs.renameSync(tmp, dir);
      return dir;
    })().finally(() => building.delete(captureId)));
  }
  return building.get(captureId)!;
}

const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml", ".avif": "image/avif" };
export const IMAGE = /\.(jpe?g|png|webp|gif|svg|avif)$/i;

/** an image inside the cache (never outside it, never anything but an image) */
export function captureImage(dir: string, rel: string): { file: string; type: string } | null {
  const file = path.resolve(dir, rel);
  if (!file.startsWith(path.resolve(dir) + path.sep) || !IMAGE.test(file) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
  return { file, type: TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream" };
}

/** every image file under a folder of the cache (relative paths) */
export function listImages(dir: string, folder: string): { rel: string; bytes: number }[] {
  const base = path.join(dir, folder);
  if (!fs.existsSync(base)) return [];
  const out: { rel: string; bytes: number }[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (IMAGE.test(e.name)) out.push({ rel: path.relative(dir, p), bytes: fs.statSync(p).size });
    }
  };
  walk(base);
  return out.sort((a, b) => a.rel.localeCompare(b.rel));
}
