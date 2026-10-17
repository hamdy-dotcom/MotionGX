// Port of the Node side of video-sandbox/lib/snapshot.mjs (the in-page SNAPSHOT lives in inpage.js).
// LIVE UI SNAPSHOT — a real screen (or one block of it) copied out of the live page as standalone HTML;
// videos embed these instead of screenshots.
/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { APIRequestContext } from "playwright";

export type Manifest = { assets: Record<string, string>; [k: string]: any };

// Collect @font-face rules from every stylesheet that loaded (incl. downloaded css files).
export function fontFaceCss(manifest: Manifest, brandDir: string) {
  const byFile = Object.fromEntries(Object.entries(manifest.assets).map(([u, f]) => [f, u]));
  const rules = new Set<string>();
  for (const [file, url] of Object.entries(byFile)) {
    if (!file.endsWith(".css")) continue;
    let css = "";
    try {
      css = fs.readFileSync(path.join(brandDir, file), "utf8");
    } catch {
      continue;
    }
    for (const m of css.matchAll(/@font-face\s*{[^}]*}/g)) {
      rules.add(
        m[0].replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (_, q, u) => {
          if (u.startsWith("data:")) return `url(${u})`;
          let abs;
          try {
            abs = new URL(u, url).href;
          } catch {
            return `url(${u})`;
          }
          const local = manifest.assets[abs];
          return `url("${local ? "../" + local : abs}")`;
        }),
      );
    }
  }
  return [...rules].join("\n");
}

// Node side: write a snapshot to clones/<id>.json, pointing its images at the files we downloaded.
export async function saveSnapshot({ snap, id, brandDir, manifest, request, extra = {} }: { snap: any; id: string; brandDir: string; manifest: Manifest; request?: APIRequestContext; extra?: Record<string, any> }) {
  if (!snap) return null;
  fs.mkdirSync(path.join(brandDir, "clones"), { recursive: true });
  fs.mkdirSync(path.join(brandDir, "assets/images"), { recursive: true });
  const urls = new Set<string>();
  for (const m of snap.html.matchAll(/src="(https?:[^"]+)"/g)) urls.add(m[1].replace(/&amp;/g, "&"));
  for (const m of snap.html.matchAll(/url\('?(https?:[^')]+)'?\)/g)) urls.add(m[1].replace(/&amp;/g, "&"));
  let fetched = 0;
  for (const u of urls) {
    if (manifest.assets[u] || !request || fetched > 60) continue;
    try {
      const res = await request.get(u, { timeout: 8000 });
      if (!res.ok()) continue;
      const ct = res.headers()["content-type"] || "";
      const ext = (ct.match(/image\/(svg\+xml|png|jpeg|webp|gif|avif)/)?.[1] || "png").replace("svg+xml", "svg").replace("jpeg", "jpg");
      const f = `assets/images/clone-${crypto.createHash("sha1").update(u).digest("hex").slice(0, 12)}.${ext}`;
      fs.writeFileSync(path.join(brandDir, f), await res.body());
      manifest.assets[u] = f;
      fetched++;
    } catch {}
  }
  // brand-relative placeholders: {{B}} is replaced with the path to the brand folder when a video embeds the clone
  const local = (u: string) => {
    const f = manifest.assets[u.replace(/&amp;/g, "&")];
    return f ? `{{B}}/${f}` : u;
  };
  const html = snap.html.replace(/src="(https?:[^"]+)"/g, (_: string, u: string) => `src="${local(u)}"`).replace(/url\('?(https?:[^')]+)'?\)/g, (_: string, u: string) => `url('${local(u)}')`);
  const out = { id, ...extra, w: snap.w, h: snap.h, dir: snap.dir, elements: snap.count, url: snap.url, keys: snap.keys, html };
  fs.writeFileSync(path.join(brandDir, "clones", `${id}.json`), JSON.stringify(out));
  return { id, file: `clones/${id}.json`, w: snap.w, h: snap.h, elements: snap.count, kb: Math.round(html.length / 1024) };
}
