import fs from "node:fs";
import { checkCompositionToken, compositionFile, compositionFiles } from "@/lib/live-engine/server/composition";
import { EDIT_AGENT_JS } from "@/lib/director-engine/edit-agent";

// the first request of a version unpacks its composition and the brand's packs
export const maxDuration = 120;

// the composition may load only its own files and talk to nobody (it runs agent-written code)
const CSP = "default-src 'self' data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src 'none'; form-action 'none'; frame-ancestors 'self'; sandbox allow-scripts";

/** GET /api/compositions/<videoId>/<version>/<token>/video.html (and the files it loads) — the edit room's live composition */
export async function GET(_req: Request, { params }: { params: Promise<{ videoId: string; version: string; token: string; path: string[] }> }) {
  const { videoId, version, token, path: parts } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(videoId) || !/^\d+$/.test(version) || !checkCompositionToken(videoId, +version, token)) return new Response("not found", { status: 404 });
  const files = await compositionFiles(videoId, +version);
  if (!files) return new Response("this version has no editable composition", { status: 404 });
  const rel = parts.map(decodeURIComponent).join("/");
  const f = compositionFile(files, rel);
  if (!f) return new Response("not found", { status: 404 });
  const headers = { "content-type": f.type, "cache-control": "private, max-age=3600", "content-security-policy": CSP, "x-content-type-options": "nosniff" };
  if (rel === "video.html") {
    // the edit room's helper runs after the composition's own scripts: seek, find the elements, apply the edits
    const html = fs.readFileSync(f.file, "utf8");
    const at = html.toLowerCase().lastIndexOf("</body>");
    const tag = `<script data-mgx-agent>${EDIT_AGENT_JS}</script>`;
    return new Response(at >= 0 ? html.slice(0, at) + tag + html.slice(at) : html + tag, { headers });
  }
  return new Response(fs.readFileSync(f.file), { headers });
}
