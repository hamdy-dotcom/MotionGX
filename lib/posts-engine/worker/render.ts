// Step 4 — slides: each slide's HTML becomes a page (the real UI pasted into its phone / laptop by the live engine's
// embedClones, personal data blurred), rendered by headless Chromium to a PNG at the canvas size, then checked: text
// inside the canvas with margins, readable, with contrast, not overlapping or clipped; screens whole; images loaded.
/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { chromium, type Browser } from "playwright";
import { embedClones } from "../../live-engine/worker/steps/build";
import { CANVAS, type Canvas } from "./platforms";
import type { SlideDesign } from "./design";

const MOBILE_VIEW = 844;
export const canvasKey = (c: Canvas) => c.replace(":", "x");

/** <x-phone> / <x-laptop> → the device with the real screen's clone placeholder (whole viewport, optional scroll) */
function devices(body: string, screens: Record<string, any>, brandDir: string) {
  const attr = (tag: string, n: string) => tag.match(new RegExp(`\\s${n}\\s*=\\s*["']([^"']*)["']`))?.[1];
  return body.replace(/<x-(phone|laptop)\b([^>]*)>\s*(?:<\/x-\1>)?/gi, (_m, kind: string, attrs: string) => {
    const tag = ` ${attrs}`, id = attr(tag, "screen") ?? "", device = kind.toLowerCase() === "phone" ? "phone" : "laptop";
    const info = screens[`${id}:${device}`];
    if (!info || !fs.existsSync(path.join(brandDir, "clones", `${info.clone}.json`))) return "";
    const px = Math.max(160, Math.round(Number(attr(tag, "width")) || (device === "phone" ? 480 : 860)));
    const scroll = Math.max(0, Math.round(Number(attr(tag, "scroll")) || 0));
    if (device === "laptop") return `<div class="mgx-laptop" style="position:relative;width:${px}px;height:${Math.round(px * 0.675)}px"><div data-clone="${info.clone}" data-w="${px}" data-frame="laptop" data-scroll="${scroll}"></div></div>`;
    const b = Math.round(px * 0.035), inner = px - 2 * b, view = Math.min(info.page_height, MOBILE_VIEW), innerH = Math.round((inner * view) / info.width);
    return `<div class="mgx-phone" style="width:${px}px;padding:${b}px;border-radius:${Math.round(px * 0.13)}px;background:#0b0c0f;box-shadow:0 0 0 2px #2a2d35,0 30px 80px rgba(0,0,0,.35)"><div style="position:relative;width:${inner}px;height:${innerH}px;border-radius:${Math.round(px * 0.1)}px;overflow:hidden;background:#fff"><div data-clone="${info.clone}" data-w="${inner}" data-h="${innerH}" data-frame="none" data-scroll="${scroll}" style="position:absolute;left:0;top:0"></div></div></div>`;
  });
}

/** <x-logo height="N"> (or a src="LOGO" left by the designer) → the brand's own logo file */
function logos(body: string, logo: string | null) {
  if (!logo) return body.replace(/<x-logo\b[^>]*>\s*(?:<\/x-logo>)?/gi, "");
  return body
    .replace(/<x-logo\b([^>]*)>\s*(?:<\/x-logo>)?/gi, (_m, attrs: string) => { const h = Math.max(24, Math.round(Number(attrs.match(/height\s*=\s*["']?(\d+)/)?.[1]) || 96)); const cls = attrs.match(/class\s*=\s*["']([^"']*)["']/)?.[1] ?? ""; return `<img class="mgx-logo ${cls}" data-mgx-logo="1" src="${logo}" alt="" style="height:${h}px;width:auto">`; })
    .replace(/src\s*=\s*["'](?:LOGO|\.?\/?brand\/library\/logo\/[^"']+)["']/gi, `src="${logo}" data-mgx-logo="1"`);
}

/** no scripts, no remote URLs: a slide is HTML + CSS over local files only */
const clean = (s: string) => String(s ?? "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, "").replace(/(https?:)?\/\/[^\s"')]+/gi, "about:blank");

export function buildSlidePage(opts: { dir: string; canvas: Canvas; design: SlideDesign; screens: Record<string, any>; brandDir: string; runDir: string; rtl: boolean; identity: string[]; logo: string | null }) {
  const { dir, canvas, design, screens, brandDir, runDir, rtl } = opts;
  const [W, H] = CANVAS[canvas];
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, target] of [["brand", brandDir], ["ai", path.join(runDir, "ai")]] as const) {
    const at = path.join(dir, name);
    if (fs.existsSync(target) && !fs.existsSync(at)) fs.symlinkSync(target, at, "dir");
  }
  const base = `*{box-sizing:border-box;margin:0;padding:0}html,body{width:${W}px;height:${H}px;overflow:hidden;background:#000}#post{position:relative;width:${W}px;height:${H}px;overflow:hidden}img{display:block}.mgx-phone,.mgx-laptop{margin-inline:auto}`;
  const src = `<!doctype html><html lang="${rtl ? "ar" : "en"}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><style>${base}</style><style>${clean(design.css)}</style></head><body><div id="post">${logos(devices(clean(design.body), screens, brandDir), opts.logo)}</div></body></html>`;
  fs.writeFileSync(path.join(dir, "video.src.html"), src);
  embedClones({ runDir: dir, brandDir, layout: canvas === "16:9" ? "16:9" : "9:16" });
  // a long screen scrolled to its part (whole width, no zoom); personal data inside the real UI blurred
  const after = `<style>.pii-auto{filter:blur(9px)!important}</style><script>(()=>{for(const el of document.querySelectorAll("[data-scroll]")){const y=+el.dataset.scroll||0,s=+el.dataset.scale||1,cam=el.querySelector(".ui-cam");if(!cam||!y)continue;const max=Math.max(0,cam.offsetHeight-(+el.dataset.vh||0));cam.style.transform="translateY("+(-Math.min(y*s,max))+"px)"}const ID=${JSON.stringify(opts.identity.filter((s) => s && s.length >= 4))};const RE=/(\\+?\\d[\\d\\s().-]{7,}\\d)|([\\w.+-]+@[\\w-]+\\.[\\w.-]+)/;for(const root of document.querySelectorAll(".ui-cam")){const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const hits=[];for(let n=w.nextNode();n;n=w.nextNode()){const t=n.textContent||"";if(RE.test(t)||ID.some((s)=>t.includes(s)))hits.push(n)}for(const n of hits){const s=document.createElement("span");s.className="pii-auto";n.parentNode.insertBefore(s,n);s.appendChild(n)}}})();</script>`;
  // an SVG logo is cropped to its own outline (logo files often sit in a big empty square), so its height is the mark's
  const svgFile = opts.logo && /\.svg$/i.test(opts.logo) ? path.join(dir, opts.logo) : null;
  const svg = svgFile && fs.existsSync(svgFile) ? fs.readFileSync(svgFile, "utf8").replace(/<\?xml[^>]*>/, "").replace(/<script[\s\S]*?<\/script>/gi, "") : null;
  const crop = svg ? `<template id="mgx-logo-svg">${svg}</template><script>(()=>{const t=document.getElementById("mgx-logo-svg"),imgs=document.querySelectorAll("#post img[data-mgx-logo]");if(!t||!imgs.length)return;const box=document.createElement("div");box.style.cssText="position:absolute;left:-99999px;top:0;width:1200px;height:1200px";box.appendChild(t.content.cloneNode(true));document.body.appendChild(box);const s=box.querySelector("svg");if(!s){box.remove();return}try{const b=s.getBBox();if(b.width>0&&b.height>0){s.setAttribute("viewBox",[b.x,b.y,b.width,b.height].join(" "));s.setAttribute("width",String(Math.round(b.width)));s.setAttribute("height",String(Math.round(b.height)));s.setAttribute("preserveAspectRatio","xMidYMid meet");const url="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(new XMLSerializer().serializeToString(s));for(const i of imgs)i.src=url}}catch(e){}box.remove()})();</script>` : "";
  const html = fs.readFileSync(path.join(dir, "video.html"), "utf8");
  fs.writeFileSync(path.join(dir, "video.html"), /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${crop}${after}</body>`) : html + crop + after);
  return path.join(dir, "video.html");
}

// The check, in the page (plain JS: no bundler helpers can leak in). U = the canvas width / 1080.
const CHECK = `((logo) => {
  const W = innerWidth, H = innerHeight, U = W / 1080, M = Math.round(56 * U), out = [];
  const opacity = (el) => { let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden") return 0; o *= +cs.opacity; } return o; };
  const rgb = (c) => { const m = String(c).match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const bgOf = (el) => { for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage && cs.backgroundImage !== "none") return "image"; const c = rgb(cs.backgroundColor); if (c && c.a > 0.6) return c; } return null; };
  const label = (el) => "«" + (el.textContent || "").trim().slice(0, 30) + "»";
  const texts = [];
  let media = 0;
  for (const el of document.querySelectorAll("#post *")) {
    if (el.closest(".ui-clone")) continue;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const o = opacity(el); if (o < 0.3) continue;
    if (el.tagName === "IMG") { if (!el.naturalWidth) out.push("an image did not load: " + (el.getAttribute("src") || "").slice(-60)); else if (r.width * r.height > W * H * 0.01) media++; continue; }
    if (el.matches("[data-clone]")) { media++; const v = Math.max(0, Math.min(W, r.right) - Math.max(0, r.left)) * Math.max(0, Math.min(H, r.bottom) - Math.max(0, r.top)); if (v < r.width * r.height * 0.97) out.push("a product screen is cut by the canvas edge — keep the whole device inside"); continue; }
    const own = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
    if (!own) continue;
    texts.push({ el, r });
    const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 600;
    if (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1) out.push(label(el) + " runs off the canvas");
    else if (r.left < M - 2 || r.top < M - 2 || r.right > W - M + 2 || r.bottom > H - M + 2) out.push(label(el) + " is inside the " + M + " px safe margin");
    if (own.length > 1 && fs < 26 * U) out.push(label(el) + " is " + Math.round(fs) + " px — too small to read on a phone (≥ " + Math.round(30 * U) + " px)");
    if ((cs.overflow !== "visible" || cs.textOverflow === "ellipsis") && (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2)) out.push(label(el) + " is clipped by its box");
    const bg = bgOf(el), fg = rgb(cs.color);
    if (bg && bg !== "image" && fg && fg.a > 0.5) {
      const a = lum(fg), b = lum(bg), ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), need = (fs >= 40 * U && bold) || fs >= 56 * U ? 3 : 4.5;
      if (ratio < need) out.push(label(el) + " contrast " + ratio.toFixed(2) + ":1 (needs " + need + ":1)");
    }
  }
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const A = texts[i], B = texts[j]; if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
    const ix = Math.max(0, Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left)), iy = Math.max(0, Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top));
    if (ix * iy > 0.2 * Math.min(A.r.width * A.r.height, B.r.width * B.r.height)) out.push(label(A.el) + " overlaps " + label(B.el));
  }
  if (!texts.length && !media) out.push("the slide is empty");
  // the brand signs every slide: its logo, loaded and visible, at a size that reads
  if (logo) {
    const marks = Array.from(document.querySelectorAll("#post img[data-mgx-logo]")).filter((i) => i.naturalWidth && opacity(i) > 0.5);
    const seen = marks.map((i) => i.getBoundingClientRect()).filter((r) => r.width > 2 && r.right > 0 && r.left < W && r.bottom > 0 && r.top < H);
    if (!seen.length) out.push("the brand's logo is missing — every slide carries it (<x-logo height=…>)");
    else if (Math.max(...seen.map((r) => r.height)) < 60 * U) out.push("the logo is too small to recognise (≥ " + Math.round(72 * U) + " px tall)");
  }
  return [...new Set(out)].slice(0, 12);
})`;

export class SlideRenderer {
  private browser: Browser | null = null;
  async render(html: string, canvas: Canvas, png: string, logo: string | null = null): Promise<string[]> {
    const [W, H] = CANVAS[canvas];
    this.browser ??= await chromium.launch();
    const page = await this.browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    try {
      await page.route("**/*", (route) => (route.request().url().startsWith("file://") || route.request().url().startsWith("data:") ? route.continue() : route.abort()));
      await page.goto("file://" + html, { waitUntil: "load", timeout: 60000 });
      await page.evaluate("Promise.race([Promise.all([document.fonts.ready, ...Array.from(document.images).map((i) => (i.complete ? null : i.decode().catch(() => null)))]), new Promise((r) => setTimeout(r, 15000))])");
      fs.mkdirSync(path.dirname(png), { recursive: true });
      await page.screenshot({ path: png, type: "png" });
      return (await page.evaluate(`(${CHECK})(${JSON.stringify(logo)})`)) as string[];
    } finally {
      await page.close();
    }
  }
  async close() { await this.browser?.close().catch(() => {}); this.browser = null; }
}

/** an image scaled down for the model to look at (JPEG, ≈ width px wide) — ffmpeg, as the renderer's other stills */
export async function smallJpeg(file: string, width = 900): Promise<Buffer | null> {
  const ff = process.env.FFMPEG_PATH || ((await import("ffmpeg-static").then((m: any) => m.default).catch(() => null)) as string | null) || "ffmpeg";
  const r = spawnSync(ff, ["-v", "error", "-i", file, "-vf", `scale='min(${width},iw)':-2`, "-q:v", "4", "-f", "image2", "-c:v", "mjpeg", "pipe:1"], { maxBuffer: 64 * 1024 * 1024 });
  return r.status === 0 && r.stdout?.length ? r.stdout : null;
}
