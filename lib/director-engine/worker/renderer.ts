// The director's renderer — what Hyperframes does for /brag (composition contract, check, snapshot, render), done
// locally with Playwright frames + ffmpeg. No network: every page blocks all requests except file://.
//   prepare()  → composition/video.html: the real UI clones pasted in (the live engine's embedClones), the capture's
//                media linked in (never auth.json), personal data inside clones blurred
//   Session    → one headless page: seek(t), still(t) (JPEG), analyze(t) (the check: offstage text, safe margins,
//                small text, contrast, overlaps, visible personal data, blank frames)
//   renderVideo() → every frame at 30fps → H.264, the music bed + the composition's SFX mixed, poster baked as frame 0
/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium, type Browser, type Page } from "playwright";
import { embedClones } from "../../live-engine/worker/steps/build";

const here = path.dirname(fileURLToPath(import.meta.url));
export const FPS = 30;
export const SIZES: Record<string, [number, number]> = { "9:16": [1080, 1920], "1:1": [1080, 1080], "16:9": [1920, 1080] };
const ffmpegPath = async () => process.env.FFMPEG_PATH || ((await import("ffmpeg-static").then((m: any) => m.default).catch(() => null)) as string | null) || "ffmpeg";
/** the engine's own assets (CC0 SFX): next to the source, or next to the bundled worker in the sandbox */
export const assetsDir = () => [path.join(here, "..", "assets"), path.join(here, "director-assets")].find((d) => fs.existsSync(path.join(d, "sfx"))) ?? path.join(here, "..", "assets");

// capture folders the composition may load by relative path (capture/<dir>/…) — media and the clones' fonts only
const CAPTURE_LINKS = ["library", "screens", "parts", "assets", "clips"];

// A phone screen as captured: 390 × 844 CSS px (the capture's mobile viewport)
const PHONE_VIEW = 844 / 390;
/**
 * Every real screen shown as its source: a desktop screen on the laptop (its whole 16:10 view), a phone screen as a
 * whole phone viewport (its width × 844/390). Blocks (…-pN) stay as the agent placed them.
 */
function screensAsCaptured(src: string, brandDir: string, W: number, H: number) {
  const size = new Map<string, { w: number; h: number } | null>();
  const load = (id: string) => { if (!size.has(id)) { try { const c = JSON.parse(fs.readFileSync(path.join(brandDir, "clones", `${id}.json`), "utf8")); size.set(id, { w: +c.w, h: +c.h }); } catch { size.set(id, null); } } return size.get(id) ?? null; };
  const attr = (tag: string, n: string) => tag.match(new RegExp(`\\s${n}\\s*=\\s*"([^"]*)"`))?.[1];
  const drop = (tag: string, n: string) => tag.replace(new RegExp(`\\s${n}\\s*=\\s*"[^"]*"`), "");
  return src.replace(/<([a-z]+)(\s[^>]*?\sdata-clone\s*=\s*"([^"]+)"[^>]*?)(\/?)>/gi, (whole: string, _tag: string, _attrs: string, id: string) => {
    const cid = [id, id.replace(/-phone$/, "-mobile"), id.replace(/-flow$/, "")].find((x) => fs.existsSync(path.join(brandDir, "clones", `${x}.json`)));
    const c = cid && !/-p\d+$/.test(cid) ? load(cid) : null;
    if (!c || !(c.w > 0)) return whole;
    if (c.w >= 1000) return drop(drop(whole, "data-frame"), "data-h"); // the laptop, drawn by the renderer
    const view = Math.min(c.h, c.w * PHONE_VIEW);
    let w = Math.round(+(attr(whole, "data-w") || 0) || W * 0.62), h = Math.round((w * view) / c.w);
    if (h > H * 0.82) { w = Math.round((w * H * 0.82) / h); h = Math.round((w * view) / c.w); }
    return drop(drop(drop(whole, "data-w"), "data-h"), "data-frame").replace(/\sdata-clone\s*=/, ` data-w="${w}" data-h="${h}" data-frame="none" data-clone=`);
  });
}

/** composition/: lib/ (gsap, kit), sfx/, capture/ links, and video.html built from video.src.html */
export function prepare(opts: { compDir: string; brandDir: string; root: string; layout: string; identity: string[] }) {
  const { compDir, brandDir, root, layout } = opts;
  fs.mkdirSync(path.join(compDir, "lib"), { recursive: true });
  for (const f of ["gsap.min.js", "kit.js"]) { const src = path.join(root, "vendor", f); if (fs.existsSync(src) && !fs.existsSync(path.join(compDir, "lib", f))) fs.copyFileSync(src, path.join(compDir, "lib", f)); }
  const link = (target: string, at: string) => { if (fs.existsSync(target) && !fs.existsSync(at)) fs.symlinkSync(target, at, "dir"); };
  link(path.join(assetsDir(), "sfx"), path.join(compDir, "sfx"));
  fs.mkdirSync(path.join(compDir, "capture"), { recursive: true });
  for (const d of CAPTURE_LINKS) link(path.join(brandDir, d), path.join(compDir, "capture", d));
  // the brand's fonts as a stylesheet the composition can link (capture/clones/fonts.css → its relative font URLs)
  const fonts = path.join(brandDir, "clones", "fonts.css");
  if (fs.existsSync(fonts)) { fs.mkdirSync(path.join(compDir, "capture", "clones"), { recursive: true }); fs.writeFileSync(path.join(compDir, "capture", "clones", "fonts.css"), fs.readFileSync(fonts, "utf8").replace(/url\((['"]?)(?!data:)(\.\.\/)?assets\//g, "url($1../assets/")); }
  if (!fs.existsSync(path.join(compDir, "video.src.html"))) return { ok: false, error: "composition/video.src.html does not exist yet" };
  // embedClones reads video.src.html: it gets the screens as captured; the agent's own file is put back exactly as written
  const srcFile = path.join(compDir, "video.src.html"), own = fs.readFileSync(srcFile, "utf8"), [SW, SH] = SIZES[layout] || SIZES["9:16"];
  const shown = screensAsCaptured(own, brandDir, SW, SH);
  try { if (shown !== own) fs.writeFileSync(srcFile, shown); embedClones({ runDir: compDir, brandDir, layout }); } finally { if (shown !== own) fs.writeFileSync(srcFile, own); }
  // personal data inside the pasted real UI: phones, e-mails and the test identity are blurred before any frame
  const html = fs.readFileSync(path.join(compDir, "video.html"), "utf8");
  const guard = `<style>.pii,.pii-auto{filter:blur(9px)!important}</style><script>(()=>{const ID=${JSON.stringify(opts.identity.filter((s) => s && s.length >= 4))};const RE=/(\\+?\\d[\\d\\s().-]{7,}\\d)|([\\w.+-]+@[\\w-]+\\.[\\w.-]+)/;for(const root of document.querySelectorAll(".ui-cam")){const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const hits=[];for(let n=w.nextNode();n;n=w.nextNode()){const t=n.textContent||"";if(RE.test(t)||ID.some((s)=>t.includes(s)))hits.push(n)}for(const n of hits){const s=document.createElement("span");s.className="pii-auto";n.parentNode.insertBefore(s,n);s.appendChild(n)}}})();</script>`;
  // screenshots and clip frames are never cropped by object-fit; K.focus / K.scrollTo move through a whole screen at its
  // own width (they never zoom it); blocks (…-pN) keep the normal K.focus
  const whole = `<style>img[src*="screens/"],img[src*="clipframes/"]{object-fit:contain!important}</style>`;
  const noZoom = `<script>(()=>{const K=window.K;if(!K||!K.focus)return;const f=K.focus;K.focus=(tl,ui,target,at,opts)=>{opts=opts||{};const el=typeof ui==="string"?document.querySelector(ui):ui;const id=el&&el.dataset&&el.dataset.clone;const m=id&&(window.__clones||{})[id];if(!m||/-p\\d+$/.test(id))return f(tl,ui,target,at,opts);const s=+el.dataset.scale||1,vh=(+el.dataset.vh||m.h*s)/s;const b=Array.isArray(target)?target:target==="all"?[0,0,m.w,m.h]:String(target).indexOf("part:")===0?m.parts[String(target).slice(5)]:m.keys[target];if(!b)return f(tl,ui,target,at,opts);const y=Math.max(0,Math.min(m.h-vh,b[1]+b[3]/2-vh/2));return f(tl,ui,[0,y,m.w,vh],at,Object.assign({},opts,{zoom:1,bounds:null,fill:false}));};})();</script>`;
  let out = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${guard}</body>`) : html + guard;
  out = /<\/head>/i.test(out) ? out.replace(/<\/head>/i, `${whole}</head>`) : whole + out;
  const kit = /<script[^>]*src\s*=\s*["'][^"']*kit\.js["'][^>]*>\s*<\/script>/i;
  if (kit.test(out)) out = out.replace(kit, (m) => m + noZoom);
  fs.writeFileSync(path.join(compDir, "video.html"), out);
  return { ok: true };
}

// The check, run inside the page at a given time. Plain JS (a string): no bundler helpers can leak into the page.
const ANALYZER = `((full) => {
  const W = innerWidth, H = innerHeight, SX = Math.round(80 * W / 1080), SY = Math.round(140 * H / 1920), out = [];
  const opacity = (el) => { let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden") return 0; o *= +cs.opacity; } return o; };
  const blurred = (el) => { for (let e = el; e && e.nodeType === 1; e = e.parentElement) if (/blur\\(/.test(getComputedStyle(e).filter) || e.classList.contains("pii") || e.classList.contains("pii-auto")) return true; return false; };
  const rgb = (c) => { const m = String(c).match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const bgOf = (el) => { for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage && cs.backgroundImage !== "none") return "image"; const c = rgb(cs.backgroundColor); if (c && c.a > 0.6) return c; } return rgb(getComputedStyle(document.body).backgroundColor) || { r: 0, g: 0, b: 0, a: 1 }; };
  const label = (el) => (el.id ? "#" + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\\s+/).slice(0, 2).join(".") : ""));
  const PII = /(\\+?\\d[\\d\\s().-]{7,}\\d)|([\\w.+-]+@[\\w-]+\\.[\\w.-]+)/;
  const texts = [];
  let media = 0;
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const o = opacity(el); if (o < 0.15) continue;
    if (el.matches("img, video, canvas, svg, [data-clone]") && r.width * r.height > W * H * 0.01 && r.right > 0 && r.left < W && r.bottom > 0 && r.top < H) media++;
    const own = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
    if (!own) continue;
    const inUi = !!el.closest(".ui-cam, [data-clone]");
    if (PII.test(own) && !blurred(el) && o > 0.4) out.push({ sev: "error", code: "pii", msg: "personal data visible unblurred: " + label(el) + " «" + own.slice(0, 40) + "»" });
    if (inUi) continue; // the real UI: its own sizes and colours
    texts.push({ el, r, o, own });
    const fs = parseFloat(getComputedStyle(el).fontSize), bold = +getComputedStyle(el).fontWeight >= 600;
    if (o > 0.5 && (r.left < -2 || r.top < -2 || r.right > W + 2 || r.bottom > H + 2)) out.push({ sev: "error", code: "offstage", msg: label(el) + " «" + own.slice(0, 40) + "» runs off the frame (" + [r.left, r.top, r.right, r.bottom].map(Math.round).join(",") + ")" });
    else if (o > 0.5 && (r.left < SX - 4 || r.right > W - SX + 4 || r.top < SY - 4 || r.bottom > H - SY + 4)) out.push({ sev: "warn", code: "margin", msg: label(el) + " «" + own.slice(0, 40) + "» is outside the safe margins" });
    if (o > 0.6 && own.length > 2 && fs < 34 * W / 1080) out.push({ sev: "warn", code: "small", msg: label(el) + " «" + own.slice(0, 40) + "» is " + Math.round(fs) + "px — too small to read on a phone" });
    const bg = bgOf(el), fg = rgb(getComputedStyle(el).color);
    if (o > 0.6 && bg !== "image" && fg && fg.a > 0.5) {
      const a = lum(fg), b = lum(bg), ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), need = (fs >= 24 * W / 1080 && bold) || fs >= 32 * W / 1080 ? 3 : 4.5;
      if (ratio < need) out.push({ sev: "error", code: "contrast", msg: label(el) + " «" + own.slice(0, 30) + "» contrast " + ratio.toFixed(2) + ":1 (needs " + need + ":1) — text " + getComputedStyle(el).color + " on " + "rgb(" + [bg.r, bg.g, bg.b].join(",") + "); move it toward " + (b > 0.4 ? "a darker" : "a lighter") + " shade of the brand palette" });
    }
  }
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const A = texts[i], B = texts[j]; if (A.el.contains(B.el) || B.el.contains(A.el) || A.o < 0.6 || B.o < 0.6) continue;
    const ix = Math.max(0, Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left)), iy = Math.max(0, Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top));
    if (ix * iy > 0.25 * Math.min(A.r.width * A.r.height, B.r.width * B.r.height)) out.push({ sev: "warn", code: "overlap", msg: label(A.el) + " «" + A.own.slice(0, 24) + "» overlaps " + label(B.el) + " «" + B.own.slice(0, 24) + "»" });
  }
  if (!texts.length && !media) out.push({ sev: "warn", code: "blank", msg: "nothing visible" });
  // at a scene's main moment: every real screen whole — not cut by the frame or a box, not zoomed, in its own device
  if (full) {
    const clipOf = (el) => { let c = { l: 0, t: 0, r: W, b: H }; for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.overflowX !== "visible" || cs.overflowY !== "visible") { const q = e.getBoundingClientRect(); c = { l: Math.max(c.l, q.left), t: Math.max(c.t, q.top), r: Math.min(c.r, q.right), b: Math.min(c.b, q.bottom) }; } } return c; };
    const shownPart = (el) => { const r = el.getBoundingClientRect(), c = clipOf(el), w = Math.max(0, Math.min(c.r, r.right) - Math.max(c.l, r.left)), h = Math.max(0, Math.min(c.b, r.bottom) - Math.max(c.t, r.top)); return r.width * r.height > 0 ? (w * h) / (r.width * r.height) : 1; };
    for (const el of document.querySelectorAll("[data-clone]")) {
      const id = el.getAttribute("data-clone") || ""; if (/-p\\d+$/.test(id) || opacity(el) < 0.5) continue;
      const r = el.getBoundingClientRect(); if (r.width * r.height < W * H * 0.01) continue;
      const seen = shownPart(el);
      if (seen < 0.97) out.push({ sev: "error", code: "screen-cut", msg: label(el) + " (" + id + ") is cut — only " + Math.round(seen * 100) + "% of the screen is inside the frame; show the whole " + (el.querySelector(".ui-lid") ? "laptop" : "phone") + " screen" });
      const cl = el.querySelector(".ui-clone");
      if (cl) { const z = cl.getBoundingClientRect().width / r.width; if (z > 1.03) out.push({ sev: "error", code: "screen-zoom", msg: label(el) + " (" + id + ") is zoomed in ×" + z.toFixed(2) + " — show the screen at its own width (move through it with K.scrollTo / K.focus, which never zoom)" }); }
    }
    for (const img of document.images) {
      const src = img.getAttribute("src") || ""; if (!/screens\\/|clipframes\\//.test(src) || !img.naturalWidth || opacity(img) < 0.5) continue;
      const r = img.getBoundingClientRect(); if (r.width * r.height < W * H * 0.01) continue;
      const seen = shownPart(img);
      if (seen < 0.97) out.push({ sev: "error", code: "screen-cut", msg: label(img) + " «" + src.split("/").slice(-2).join("/") + "» is cut — only " + Math.round(seen * 100) + "% of the screenshot is visible; show the whole screen, not a crop or a zoom" });
      if (img.naturalWidth > img.naturalHeight) { let box = null; for (let e = img.parentElement; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.overflowX !== "visible" || cs.overflowY !== "visible") { box = e.getBoundingClientRect(); break; } } if (box && box.height > box.width * 1.2) out.push({ sev: "error", code: "screen-device", msg: label(img) + " is a desktop screen inside a portrait (phone) frame — desktop screens go on a laptop, phone screens on a phone" }); }
    }
  }
  return out.slice(0, 40);
})`;

export class Session {
  browser!: Browser; page!: Page; errors: string[] = [];
  constructor(private html: string, private W: number, private H: number) {}
  static async open(html: string, W: number, H: number) { const s = new Session(html, W, H); await s.load(); return s; }
  private async newPage() {
    this.browser ??= await chromium.launch();
    const page = await this.browser.newPage({ viewport: { width: this.W, height: this.H } });
    await page.route("**/*", (route) => (route.request().url().startsWith("file://") ? route.continue() : route.abort())); // no network
    page.on("pageerror", (e) => this.errors.push(`page error: ${e.message}`.slice(0, 300)));
    page.on("console", (m) => { if (m.type() === "error") this.errors.push(`console: ${m.text()}`.slice(0, 300)); });
    await page.goto("file://" + this.html + "?render", { waitUntil: "load", timeout: 60000 });
    await page.evaluate("Promise.race([Promise.resolve(window.__ready), new Promise((r) => setTimeout(r, 30000))])");
    return page;
  }
  async load() { this.page = await this.newPage(); }
  /** the contract: window.__duration and window.__seek */
  async contract() { return (await this.page.evaluate("({ d: window.__duration, seek: typeof window.__seek, sfx: Array.isArray(window.__sfx) ? window.__sfx : [] })")) as { d: number; seek: string; sfx: { t: number; src: string; vol?: number }[] }; }
  async seek(t: number, page = this.page) { await page.evaluate(`Promise.resolve(window.__seek(${t})).then(() => Promise.all(Array.from(document.images).filter((i) => !i.complete).map((i) => i.decode().catch(() => null))))`); }
  async still(t: number, page = this.page) { await this.seek(t, page); return page.screenshot({ type: "jpeg", quality: 82 }); }
  async analyze(t: number, full = true) { await this.seek(t); return (await this.page.evaluate(`(${ANALYZER})(${full})`)) as { sev: string; code: string; msg: string }[]; }
  async frames(from: number, to: number, onFrame: (jpg: Buffer) => Promise<void>) {
    const page = await this.newPage();
    for (let i = from; i < to; i++) await onFrame(await this.still(i / FPS, page));
    await page.close();
  }
  async close() { await this.browser?.close().catch(() => {}); }
}

/** a still scaled down for the agent to look at (≈540 px wide) */
export async function smallJpeg(jpg: Buffer, width = 540): Promise<Buffer> {
  const r = spawnSync(await ffmpegPath(), ["-loglevel", "error", "-f", "image2pipe", "-i", "-", "-vf", `scale=${width}:-2`, "-q:v", "5", "-f", "image2", "-c:v", "mjpeg", "-"], { input: jpg, maxBuffer: 1 << 26 });
  return r.status === 0 && r.stdout?.length ? r.stdout : jpg;
}

const run = async (args: string[]) => { const bin = await ffmpegPath(); await new Promise<void>((ok, no) => { const p = spawn(bin, ["-loglevel", "error", "-y", ...args]); let e = ""; p.stderr.on("data", (d) => (e += d)); p.on("close", (c) => (c === 0 ? ok() : no(new Error(`ffmpeg: ${e.slice(-600)}`)))); }); };

/** every frame → H.264 (parallel pages) → the music bed + the declared SFX mixed under it → poster baked as frame 0 */
export async function renderVideo(opts: { html: string; compDir: string; layout: string; duration: number; musicFile: string; outFile: string; posterTime: number; log: (l: string) => void }) {
  const [W, H] = SIZES[opts.layout] || SIZES["9:16"];
  const total = Math.round(opts.duration * FPS), dir = path.dirname(opts.outFile), workers = Math.max(2, Math.min(6, os.cpus().length - 2)), t0 = Date.now();
  const s = await Session.open(opts.html, W, H);
  try {
    const { sfx } = await s.contract();
    opts.log(`▶ director render: ${total} frames at ${W}×${H}, ${workers} workers, ${sfx.length} sound effects`);
    const bin = await ffmpegPath();
    let done = 0;
    const segs = await Promise.all(Array.from({ length: workers }, async (_, w) => {
      const a = Math.floor((total * w) / workers), b = Math.floor((total * (w + 1)) / workers), seg = path.join(dir, `.dseg${w}.mp4`);
      const enc = spawn(bin, ["-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "18", seg]);
      await s.frames(a, b, async (jpg) => { if (!enc.stdin.write(jpg)) await new Promise((r) => enc.stdin.once("drain", r)); if (++done % (FPS * 5) === 0) opts.log(`  ${Math.round((done / total) * 100)}% · ${((Date.now() - t0) / 1000).toFixed(0)}s`); });
      enc.stdin.end(); await new Promise((r) => enc.on("close", r));
      return seg;
    }));
    const list = path.join(dir, ".dsegs.txt"); fs.writeFileSync(list, segs.map((x) => `file '${x}'`).join("\n"));
    const silent = path.join(dir, ".dvideo.mp4");
    await run(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", silent]);
    // audio: the bed at full level, each effect delayed to its time at its volume, mixed without normalising, limited
    const fx = sfx.map((x) => ({ ...x, file: path.resolve(opts.compDir, x.src) })).filter((x) => x.file.startsWith(path.resolve(opts.compDir)) && fs.existsSync(x.file) && x.t >= 0 && x.t < opts.duration);
    const inputs = ["-i", silent, "-i", opts.musicFile, ...fx.flatMap((x) => ["-i", x.file])];
    const parts = fx.map((x, i) => `[${i + 2}:a]adelay=${Math.round(x.t * 1000)}|${Math.round(x.t * 1000)},volume=${Math.max(0, Math.min(1, x.vol ?? 0.7)).toFixed(2)}[s${i}]`);
    const filter = fx.length ? `${parts.join(";")};[1:a]${fx.map((_, i) => `[s${i}]`).join("")}amix=inputs=${fx.length + 1}:normalize=0:duration=first,alimiter=limit=0.95[aout]` : `[1:a]alimiter=limit=0.95[aout]`;
    const mixed = path.join(dir, ".dmixed.mp4");
    await run([...inputs, "-filter_complex", filter, "-map", "0:v", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", mixed]);
    // poster: the chosen settled frame, baked as frame 0 (same duration, frame count and audio)
    const poster = path.join(dir, "poster.jpg"), pt = Math.max(0, Math.min(opts.duration - 0.05, opts.posterTime));
    await run(["-ss", pt.toFixed(2), "-i", mixed, "-frames:v", "1", "-q:v", "2", poster]);
    await run(["-i", mixed, "-i", poster, "-filter_complex", "[0:v][1:v]overlay=0:0:enable='eq(n,0)'[v]", "-map", "[v]", "-map", "0:a?", "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", opts.outFile]);
    for (const f of [...segs, list, silent, mixed]) fs.rmSync(f, { force: true });
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    opts.log(`✓ director render: ${path.basename(opts.outFile)} (${(fs.statSync(opts.outFile).size / 1048576).toFixed(1)} MB) in ${secs}s · poster at ${pt.toFixed(2)}s`);
    return { frames: total, sfx: fx.length, seconds: +secs, poster };
  } finally { await s.close(); }
}
