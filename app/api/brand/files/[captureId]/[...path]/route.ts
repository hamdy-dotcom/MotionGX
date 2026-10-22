import fs from "node:fs";
import { getApiContext } from "@/lib/context";
import { captureDir, captureImage } from "@/lib/live-engine/server/capture-cache";

// the first request of a capture unpacks its packs
export const maxDuration = 120;

/** GET /api/brand/files/<captureId>/<path> — an image a capture saved (screens, parts, library, site images), to members
 *  of the capture's workspace */
export async function GET(_req: Request, { params }: { params: Promise<{ captureId: string; path: string[] }> }) {
  const { captureId, path: parts } = await params;
  const ctx = await getApiContext();
  if (!ctx) return new Response("unauthorized", { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(captureId)) return new Response("not found", { status: 404 });
  const dir = await captureDir(ctx.workspace.id, captureId);
  const f = dir ? captureImage(dir, parts.map(decodeURIComponent).join("/")) : null;
  if (!f) return new Response("not found", { status: 404 });
  return new Response(fs.readFileSync(f.file), { headers: { "content-type": f.type, "cache-control": "private, max-age=86400", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'" } });
}
