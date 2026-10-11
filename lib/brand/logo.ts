import "server-only";
import { isIP } from "node:net";

const MAX_BYTES = 2 * 1024 * 1024;

export const LOGO_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/gif": "gif",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
};

export type LogoFile = { bytes: Uint8Array; contentType: string; ext: string };

function isPrivateHost(hostname: string) {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  const kind = isIP(h);
  if (kind === 4) {
    const [a, b] = h.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  if (kind === 6) return h === "::1" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80") || h.startsWith("::ffff:");
  return false;
}

/** Strip anything executable from an SVG before we store it. */
function sanitizeSvg(svg: string) {
  return svg
    .replace(/<script[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|xlink:href)\s*=\s*("|')\s*javascript:[^"']*\2/gi, "");
}

/** Validates type/size and sanitizes SVG. Also used for logos the user uploads. */
export function logoFromBytes(bytes: Uint8Array, contentType: string): LogoFile | null {
  const type = contentType.split(";")[0].trim().toLowerCase();
  const ext = LOGO_TYPES[type];
  if (!ext || bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) return null;
  if (type === "image/svg+xml") {
    const clean = sanitizeSvg(new TextDecoder().decode(bytes));
    if (!/<svg[\s>]/i.test(clean)) return null;
    return { bytes: new TextEncoder().encode(clean), contentType: type, ext };
  }
  return { bytes, contentType: type, ext };
}

/**
 * Loads a logo from a data: URI or a public http(s) URL. Returns null when it isn't a usable image.
 * Refuses private/loopback hosts, non-image types and anything over 2 MB.
 */
export async function loadLogo(source: string): Promise<LogoFile | null> {
  if (source.startsWith("data:")) {
    const m = source.match(/^data:([^;,]+)((?:;[^;,]*)*),(.*)$/s);
    if (!m) return null;
    const base64 = /;base64/i.test(m[2]);
    try {
      const bytes = base64 ? new Uint8Array(Buffer.from(m[3], "base64")) : new TextEncoder().encode(decodeURIComponent(m[3]));
      return logoFromBytes(bytes, m[1]);
    } catch {
      return null;
    }
  }

  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol) || isPrivateHost(url.hostname)) return null;

  try {
    // Follow redirects by hand so every hop is checked before it is requested.
    let res: Response | null = null;
    for (let hop = 0; hop < 4; hop++) {
      res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(8000), headers: { accept: "image/*" } });
      const location = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
      if (!location) break;
      url = new URL(location, url);
      if (!/^https?:$/.test(url.protocol) || isPrivateHost(url.hostname)) return null;
      res = null;
    }
    if (!res || !res.ok || !res.body) return null;
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_BYTES) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    return logoFromBytes(bytes, res.headers.get("content-type") ?? "");
  } catch {
    return null;
  }
}
