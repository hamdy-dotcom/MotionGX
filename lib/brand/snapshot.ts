// Page snapshot: the "Save page as… (complete)" of a brand's website.
// From Firecrawl's rawHtml we collect every image, stylesheet, font and icon the page uses,
// download them (public hosts only, size-capped), lift each inline <svg> out as its own object file,
// and package it all as page.html + assets/ + objects/ + screenshot.png + manifest.json + snapshot.zip.
import { isPrivateHost, sanitizeSvg } from "./logo";
import { zip } from "./zip";

export const SNAPSHOT_LIMITS = {
  files: 150,
  fileBytes: 6 * 1024 * 1024,
  totalBytes: 40 * 1024 * 1024,
  objects: 80,
  concurrency: 6,
  timeoutMs: 10_000,
  /** whole-snapshot budget: the extract route runs under maxDuration=120s */
  budgetMs: 25_000,
};

export type SnapshotFile = { path: string; bytes: Uint8Array; contentType: string };
export type SnapshotManifest = {
  url: string;
  captured_at: string;
  page: "page.html";
  screenshot: string | null;
  assets: { path: string; source: string; type: string; bytes: number }[];
  objects: string[];
  skipped: number;
};
export type Snapshot = { files: SnapshotFile[]; manifest: SnapshotManifest };

type Fetched = { bytes: Uint8Array; contentType: string } | null;
export type Fetcher = (url: string) => Promise<Fetched>;

// ---------------------------------------------------------------------------
// URL collection (pure)

const decodeEntities = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

function resolve(ref: string, base: string): string | null {
  const r = decodeEntities(ref.trim());
  if (!r || r.startsWith("data:") || r.startsWith("blob:") || r.startsWith("#") || r.startsWith("javascript:")) return null;
  try {
    const u = new URL(r, base);
    if (!/^https?:$/.test(u.protocol)) return null;
    u.hash = "";
    return u.href;
  } catch {
    return null;
  }
}

const attr = (tag: string, name: string) => {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? (m[2] ?? m[3] ?? m[4] ?? "") : null;
};

/** Largest candidate of a srcset ("a.jpg 640w, b.jpg 1280w" → b.jpg). */
function bestFromSrcset(srcset: string): string | null {
  let best: { url: string; score: number } | null = null;
  for (const part of srcset.split(/,(?=\s*\S)/)) {
    const [url, d] = part.trim().split(/\s+/);
    if (!url) continue;
    const score = d ? parseFloat(d) * (d.endsWith("x") ? 1000 : 1) : 1;
    if (!best || score > best.score) best = { url, score };
  }
  return best?.url ?? null;
}

export function cssUrls(css: string): string[] {
  const out: string[] = [];
  for (const m of css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi)) out.push(m[2]);
  for (const m of css.matchAll(/@import\s+(['"])([^'"]+)\1/gi)) out.push(m[2]);
  return out;
}

/** Every asset URL referenced by the HTML, absolute. */
export function collectAssetUrls(html: string, pageUrl: string, extra: string[] = []): string[] {
  const baseHref = html.match(/<base\s[^>]*href\s*=\s*["']([^"']+)["']/i)?.[1];
  const base = (baseHref && resolve(baseHref, pageUrl)) || pageUrl;
  const found: string[] = [];
  const add = (ref: string | null | undefined) => {
    const u = ref ? resolve(ref, base) : null;
    if (u) found.push(u);
  };

  for (const [tag] of html.matchAll(/<link\s[^>]*>/gi)) {
    const rel = (attr(tag, "rel") ?? "").toLowerCase();
    const as = (attr(tag, "as") ?? "").toLowerCase();
    if (/stylesheet|icon|apple-touch-icon|mask-icon/.test(rel) || (rel.includes("preload") && /image|font|style/.test(as))) add(attr(tag, "href"));
  }
  for (const [tag] of html.matchAll(/<(img|source|image|video|input)\s[^>]*>/gi)) {
    add(attr(tag, "src"));
    add(attr(tag, "data-src"));
    add(attr(tag, "poster"));
    add(attr(tag, "href"));
    add(attr(tag, "xlink:href"));
    const ss = attr(tag, "srcset") ?? attr(tag, "data-srcset");
    if (ss) add(bestFromSrcset(ss));
  }
  for (const [tag] of html.matchAll(/<meta\s[^>]*>/gi)) {
    const key = (attr(tag, "property") ?? attr(tag, "name") ?? "").toLowerCase();
    if (/^(og:image|og:image:url|twitter:image)$/.test(key)) add(attr(tag, "content"));
  }
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) cssUrls(m[1]).forEach(add);
  for (const m of html.matchAll(/\sstyle\s*=\s*("([^"]*)"|'([^']*)')/gi)) cssUrls(decodeEntities(m[2] ?? m[3] ?? "")).forEach(add);
  extra.forEach(add);

  return [...new Set(found)];
}

/** Inline <svg> elements: the site's own drawn objects (icons, illustrations, logo marks). */
export function collectInlineSvgs(html: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  // Outermost <svg>…</svg> blocks (nested svgs stay inside their parent).
  const re = /<svg[\s>]|<\/svg\s*>/gi;
  let depth = 0;
  let start = -1;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    if (m[0].toLowerCase().startsWith("<svg")) {
      if (depth === 0) start = m.index;
      depth++;
    } else if (depth > 0) {
      depth--;
      if (depth === 0 && start >= 0) {
        let svg = html.slice(start, m.index + m[0].length);
        if (!/\sxmlns\s*=/.test(svg)) svg = svg.replace(/^<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
        svg = sanitizeSvg(svg);
        const key = svg.replace(/\s+/g, " ");
        if (key.length > 120 && !seen.has(key)) {
          seen.add(key);
          out.push(svg);
        }
        start = -1;
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Fetching

const FONT_EXT = /\.(woff2?|ttf|otf|eot)(\?|$)/i;

function kindOf(contentType: string, url: string): "images" | "fonts" | "css" | null {
  const t = contentType.split(";")[0].trim().toLowerCase();
  if (t === "text/css") return "css";
  if (t.startsWith("image/")) return "images";
  if (t.startsWith("font/") || /font|vnd\.ms-fontobject/.test(t)) return "fonts";
  if ((t === "application/octet-stream" || t === "binary/octet-stream" || !t) && FONT_EXT.test(url)) return "fonts";
  if (!t && /\.css(\?|$)/i.test(url)) return "css";
  return null;
}

/** Public-host-only fetch with manual redirects (each hop re-checked), timeout and size cap. */
export const safeFetch: Fetcher = async (source) => {
  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol) || isPrivateHost(url.hostname)) return null;
  try {
    let res: Response | null = null;
    for (let hop = 0; hop < 4; hop++) {
      res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(SNAPSHOT_LIMITS.timeoutMs) });
      const location = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
      if (!location) break;
      url = new URL(location, url);
      if (!/^https?:$/.test(url.protocol) || isPrivateHost(url.hostname)) return null;
      res = null;
    }
    if (!res || !res.ok) return null;
    if (Number(res.headers.get("content-length") ?? 0) > SNAPSHOT_LIMITS.fileBytes) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > SNAPSHOT_LIMITS.fileBytes) return null;
    return { bytes, contentType: res.headers.get("content-type") ?? "" };
  } catch {
    return null;
  }
};

async function hash6(s: string) {
  const d = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].slice(0, 3).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fileName(url: string, kind: string, contentType: string) {
  let base = "file";
  try {
    base = decodeURIComponent(new URL(url).pathname.split("/").pop() || "file");
  } catch {}
  base = base.replace(/[^\w.\-]+/g, "_").replace(/^_+/, "").slice(-60) || "file";
  if (!/\.[a-z0-9]{2,5}$/i.test(base)) {
    const t = contentType.split(";")[0].trim().toLowerCase();
    const ext = t === "image/svg+xml" ? "svg" : t === "text/css" ? "css" : t.split("/")[1]?.replace(/[^a-z0-9]/g, "") || (kind === "fonts" ? "woff2" : "bin");
    base += `.${ext}`;
  }
  return base;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Replace every way `url` may be written in the source (absolute, protocol-relative, root-relative, entity-escaped). */
function rewriteRefs(text: string, url: string, to: string, docUrl: string) {
  const u = new URL(url);
  const variants = new Set<string>([url, url.replace(/&/g, "&amp;"), `//${u.host}${u.pathname}${u.search}`]);
  if (u.origin === new URL(docUrl).origin) variants.add(`${u.pathname}${u.search}`);
  let out = text;
  for (const v of [...variants].sort((a, b) => b.length - a.length)) {
    if (v.length < 2) continue;
    out = out.replace(new RegExp(`(["'(\\s,=])${escapeRe(v)}(?=["')\\s,>]|$)`, "g"), `$1${to}`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Build

export async function buildSnapshot(opts: {
  pageUrl: string;
  rawHtml: string;
  screenshotUrl?: string | null;
  imageUrls?: string[];
  fetcher?: Fetcher;
}): Promise<Snapshot> {
  const fetcher = opts.fetcher ?? safeFetch;
  const L = SNAPSHOT_LIMITS;
  const deadline = Date.now() + L.budgetMs;
  const files: SnapshotFile[] = [];
  const assets: SnapshotManifest["assets"] = [];
  const saved = new Map<string, { path: string; kind: string }>();
  let total = 0;
  let skipped = 0;

  const queue = collectAssetUrls(opts.rawHtml, opts.pageUrl, opts.imageUrls ?? []);
  const queued = new Set(queue);
  const cssTexts = new Map<string, string>(); // css path -> text (rewritten after all fetched)

  async function take(url: string) {
    if (saved.size >= L.files || total >= L.totalBytes || Date.now() > deadline) {
      skipped++;
      return;
    }
    const got = await fetcher(url);
    const kind = got ? kindOf(got.contentType, url) : null;
    if (!got || !kind || total + got.bytes.byteLength > L.totalBytes) {
      skipped++;
      return;
    }
    let bytes = got.bytes;
    const type = got.contentType.split(";")[0].trim().toLowerCase() || (kind === "css" ? "text/css" : "application/octet-stream");
    if (type === "image/svg+xml") bytes = new TextEncoder().encode(sanitizeSvg(new TextDecoder().decode(bytes)));
    const path = `assets/${kind}/${await hash6(url)}-${fileName(url, kind, type)}`;
    saved.set(url, { path, kind });
    total += bytes.byteLength;
    if (kind === "css") {
      const css = new TextDecoder().decode(bytes);
      cssTexts.set(path, css);
      for (const ref of cssUrls(css)) {
        const abs = resolve(ref, url);
        if (abs && !queued.has(abs)) {
          queued.add(abs);
          queue.push(abs);
        }
      }
    } else {
      files.push({ path, bytes, contentType: type });
    }
    assets.push({ path, source: url, type, bytes: bytes.byteLength });
  }

  // Simple worker pool; CSS discovered mid-way is appended to the same queue.
  let next = 0;
  await Promise.all(
    Array.from({ length: L.concurrency }, async () => {
      while (next < queue.length) await take(queue[next++]);
    }),
  );

  // Stylesheets: point their url()s at the local copies (relative to assets/css/).
  for (const [path, css] of cssTexts) {
    const source = assets.find((a) => a.path === path)!.source;
    let out = css;
    for (const ref of new Set(cssUrls(css))) {
      const abs = resolve(ref, source);
      const local = abs ? saved.get(abs) : null;
      if (local) out = out.split(ref).join(`../${local.path.slice("assets/".length)}`);
    }
    files.push({ path, bytes: new TextEncoder().encode(out), contentType: "text/css" });
  }

  // Inline SVG objects.
  const objects: string[] = [];
  collectInlineSvgs(opts.rawHtml)
    .slice(0, L.objects)
    .forEach((svg, i) => {
      const path = `objects/svg-${String(i + 1).padStart(3, "0")}.svg`;
      objects.push(path);
      files.push({ path, bytes: new TextEncoder().encode(svg), contentType: "image/svg+xml" });
    });

  // Full-page screenshot.
  let screenshot: string | null = null;
  if (opts.screenshotUrl) {
    const shot = await fetcher(opts.screenshotUrl);
    if (shot && shot.contentType.startsWith("image/")) {
      screenshot = `screenshot.${shot.contentType.includes("jpeg") ? "jpg" : "png"}`;
      files.push({ path: screenshot, bytes: shot.bytes, contentType: shot.contentType.split(";")[0] });
    }
  }

  // page.html: scripts stripped (it's a static copy), asset refs pointed at local files.
  let html = opts.rawHtml
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(/<link\s[^>]*rel\s*=\s*["']?(modulepreload|preload)["']?[^>]*as\s*=\s*["']?script["']?[^>]*>/gi, "");
  const docUrl = opts.pageUrl;
  for (const [url, { path }] of [...saved].sort((a, b) => b[0].length - a[0].length)) html = rewriteRefs(html, url, path, docUrl);
  html = html.replace(/<head([^>]*)>/i, `<head$1>\n<!-- Saved by MotionGX from ${opts.pageUrl.replace(/--/g, "")} -->`);
  files.unshift({ path: "page.html", bytes: new TextEncoder().encode(html), contentType: "text/html" });

  const manifest: SnapshotManifest = {
    url: opts.pageUrl,
    captured_at: new Date().toISOString(),
    page: "page.html",
    screenshot,
    assets,
    objects,
    skipped,
  };
  files.push({ path: "manifest.json", bytes: new TextEncoder().encode(JSON.stringify(manifest, null, 2)), contentType: "application/json" });
  return { files, manifest };
}

/** All snapshot files as one archive (snapshot.zip). */
export function snapshotZip(snapshot: Snapshot): Uint8Array {
  return zip(snapshot.files.map((f) => ({ path: f.path, bytes: f.bytes })));
}

// ---------------------------------------------------------------------------
// Storage layout: brand-assets/{workspace_id}/snapshots/{site key}/...

/** Folder for a site's snapshot. Keyed by urlKey(website) so a re-read overwrites it. */
export async function snapshotFolder(workspaceId: string, siteKey: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(siteKey));
  const h = [...new Uint8Array(d)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${workspaceId}/snapshots/${h}`;
}
