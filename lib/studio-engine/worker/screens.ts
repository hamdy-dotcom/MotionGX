// The screenshot-to-code step (the abi/screenshot-to-code method): each screen a scene shows is rebuilt as a clean
// HTML component at video size from its real screenshot (and its captured text, so the words are exact), then rendered
// and compared with the screenshot once, and fixed — the way the MotionGX ads' UI was hand-built as components
// instead of pasted screenshots: sharp, readable at video size, with every element the voice acts on addressable.
/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { callTool, imageBlock, type Ledger } from "../../live-engine/worker/claude";
import { smallJpeg } from "../../posts-engine/worker/render";
import type { Scene } from "./script";
import { embedClones } from "../../live-engine/worker/steps/build";

/** the component's box: the ads' phone screen (434×924 inside the phone) and browser panel (920 wide, 16:10) */
export const BOX = { phone: { w: 434, h: 924 }, desktop: { w: 920, h: 575 } };

/** a mobile clone's first screen as a picture (the posts engine's phoneShot, copied so that engine stays untouched) */
async function phoneShot(cloneId: string, brandDir: string, out: string) {
  const dir = path.join(path.dirname(out), `phone-${cloneId}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "video.src.html"), `<!doctype html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0}html,body{width:390px;height:844px;overflow:hidden;background:#fff}</style></head><body><div data-clone="${cloneId}" data-w="390" data-h="844" data-frame="none"></div></body></html>`);
  embedClones({ runDir: dir, brandDir, layout: "9:16" });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    await page.route("**/*", (r) => (r.request().url().startsWith("file://") || r.request().url().startsWith("data:") ? r.continue() : r.abort()));
    await page.goto("file://" + path.join(dir, "video.html"), { waitUntil: "load", timeout: 60000 });
    await page.evaluate("Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 8000))])");
    await page.screenshot({ path: out, type: "jpeg", quality: 90 });
    return out;
  } catch {
    return null;
  } finally {
    await browser.close();
  }
}

/** the visible words of a clone (its HTML without tags), so the rebuilt screen copies them exactly */
function cloneText(brandDir: string, id?: string) {
  if (!id) return "";
  try {
    const c = JSON.parse(fs.readFileSync(path.join(brandDir, "clones", `${id}.json`), "utf8"));
    return String(c.html ?? "").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim().slice(0, 4000);
  } catch { return ""; }
}

const SYSTEM = `You rebuild a real product screen as an HTML component for a motion-graphics video — the screenshot-to-code
method. The result replaces the screenshot in the video, so it must look like the same product, only sharper and
readable at video size.
- FAITHFUL: the same layout idea, colours, shapes, icons and words as the screenshot. Copy the words exactly from the
  screenshot / the captured TEXT (never invent copy, numbers or names). Icons as inline SVG. Images: use one of the
  brand's files (given, by relative path) when it matches; otherwise a soft shape in the brand's colours — never a
  broken <img>, never a stock-photo URL.
- VIDEO-READABLE: no text smaller than {MIN}px; body text {BODY}px; headlines bigger. Simplify: keep what the scene
  shows and the elements the actions use; drop clutter (cookie bars, long footers, legal lines, tiny nav links).
- SIZE: exactly {W}×{H} CSS px (content may run taller only when an action scrolls). {DEVICE}
- ADDRESSABLE: put data-k="<key>" on each element an action targets (the keys are given). A "type" target holds the
  final typed text; a "pop" target is an element that appears (a result, a badge, a card).
- TECH: one root element; styles inline or in ONE <style> block at the top (it lives in a shadow root, so plain
  selectors are fine); font-family: the brand's fonts with "Readex Pro", sans-serif as the fallback; dir="{DIR}".
  No scripts, no external URLs, no position:fixed.`;

const tool = { name: "screen_component", description: "The rebuilt screen.", input_schema: { type: "object", required: ["html"], properties: { html: { type: "string", description: "the component's full HTML" }, notes: { type: "string" } } } };
const review = { name: "review_component", description: "The comparison of the rendered component with the real screenshot.", input_schema: { type: "object", required: ["ok", "problems"], properties: { ok: { type: "boolean", description: "true when it is faithful to the real screen, every word is right, nothing overflows or is cut, and every text is readable" }, problems: { type: "array", items: { type: "string" } }, html: { type: "string", description: "when not ok: the full corrected component HTML" } } } };

export async function buildScreens(o: { scenes: Scene[]; brand: any; brandDir: string; pageDir: string; fontsHead: string; ledger: Ledger; model: string; rtl: boolean; log: (l: string) => void }) {
  const { brand, brandDir, pageDir } = o;
  const shotsDir = path.join(pageDir, "screens-ref");
  fs.mkdirSync(shotsDir, { recursive: true });
  const images = (brand.images ?? []).filter((i: any) => !i.demo && fs.existsSync(path.join(brandDir, i.file))).slice(0, 24).map((i: any) => ({ file: `capture/${i.file}`, kind: i.kind, note: i.note ?? i.alt ?? "" }));
  const logo = brand.logo?.file && fs.existsSync(path.join(brandDir, brand.logo.file)) ? `capture/${brand.logo.file}` : null;
  const browser = await chromium.launch();
  const render = async (html: string, w: number, h: number, file: string) => {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    try {
      fs.writeFileSync(file.replace(/\.jpg$/, ".html"), `<!doctype html><html><head><meta charset="utf-8"><base href="file://${pageDir}/">${o.fontsHead}<style>*{box-sizing:border-box;margin:0;padding:0}html,body{width:${w}px;height:${h}px;overflow:hidden;background:#fff}</style></head><body>${html}</body></html>`);
      await page.goto("file://" + file.replace(/\.jpg$/, ".html"), { waitUntil: "load", timeout: 60000 });
      await page.evaluate("Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 8000))])");
      await page.screenshot({ path: file, type: "jpeg", quality: 88 });
    } finally { await page.close(); }
    return fs.readFileSync(file);
  };
  try {
    for (const [i, s] of o.scenes.entries()) {
      if (s.type !== "screen") continue;
      const d = s.data, sc = (brand.screens ?? []).find((x: any) => x.id === d.screen);
      const device: "phone" | "desktop" = d.device === "desktop" ? "desktop" : "phone";
      const { w, h } = BOX[device];
      const refs: { label: string; buf: Buffer }[] = [];
      const view = [sc?.view, sc?.file].find((f) => f && fs.existsSync(path.join(brandDir, f)));
      if (device === "phone" && sc?.clones?.mobile?.id) {
        const f = await phoneShot(sc.clones.mobile.id, brandDir, path.join(shotsDir, `${d.screen}-mobile.jpg`)).catch(() => null);
        if (f) refs.push({ label: "THE REAL SCREEN ON A PHONE (its mobile layout, top of the page)", buf: (await smallJpeg(f, 700)) ?? fs.readFileSync(f) });
      }
      if (view) refs.push({ label: device === "phone" && refs.length ? "THE SAME PAGE ON DESKTOP (for its content further down)" : "THE REAL SCREEN (screenshot)", buf: (await smallJpeg(path.join(brandDir, view), 1400)) ?? fs.readFileSync(path.join(brandDir, view)) });
      if (!refs.length) { o.log(`! screen ${d.screen}: no screenshot — scene ${i + 1} shown as a title only`); s.type = "title"; continue; }
      const keys = (d.actions ?? []).map((a: any, k: number) => ({ key: `a${k}`, target: a.target, do: a.do, ...(a.text ? { text: a.text } : {}) }));
      d.actions = (d.actions ?? []).map((a: any, k: number) => ({ k: `a${k}`, do: a.do, text: a.text, word: a.word }));
      const system = SYSTEM.replace("{MIN}", device === "phone" ? "22" : "20").replace("{BODY}", device === "phone" ? "26–30" : "22–26").replace("{W}", String(w)).replace("{H}", String(h)).replace("{DIR}", o.rtl && device === "phone" && !sc?.clones?.mobile ? "rtl" : "auto")
        .replace("{DEVICE}", device === "phone" ? "It fills a phone screen: the top 70px are the status-bar area (keep them empty, in the screen's own background colour). A desktop page is reflowed into a proper mobile layout." : "It fills a browser window (the URL bar is drawn around it).");
      const content: any[] = [];
      for (const r of refs) content.push({ type: "text", text: `${r.label}:` }, imageBlock(r.buf));
      content.push({ type: "text", text: [
        `THE SCENE: «${s.vo}» — it shows ${d.shows ?? sc?.shows ?? "this screen"}.`,
        `ACTIONS (put data-k on each target): ${JSON.stringify(keys)}`,
        `CAPTURED TEXT of this screen (for exact words): ${cloneText(brandDir, device === "phone" ? sc?.clones?.mobile?.id ?? sc?.clones?.screen?.id : sc?.clones?.screen?.id) || "(none — read the screenshot)"}`,
        `BRAND: palette ${JSON.stringify(brand.palette ?? {})} · fonts ${brand.fonts?.display ?? ""} / ${brand.fonts?.body ?? ""}${logo ? ` · logo file ${logo}` : ""}`,
        `BRAND FILES you may use as <img src>: ${JSON.stringify(images)}`,
      ].join("\n") });
      const r1 = await callTool({ ledger: o.ledger, step: "director", model: o.model, system, content, tool, maxTokens: 16000 });
      let html = String(r1.html ?? "");
      // the check: render it, compare with the real screen, fix once
      const shot = await render(html, w, h, path.join(shotsDir, `${d.screen}-${i}-v1.jpg`));
      const rv = await callTool({ ledger: o.ledger, step: "director", model: o.model, system, content: [
        ...content.filter((c) => c.type === "image").slice(0, 1).flatMap((img) => [{ type: "text", text: "THE REAL SCREEN:" }, img]),
        { type: "text", text: "YOUR COMPONENT, RENDERED:" }, imageBlock(shot),
        { type: "text", text: `Compare them. Is the component faithful (layout, colours, icons, exact words), every text readable (≥ ${device === "phone" ? 22 : 20}px), nothing overflowing, cut or overlapping, and every action target (${keys.map((k: any) => k.key).join(", ") || "none"}) present? If yes, ok = true. If not, list the problems and give the full corrected HTML.\n\nTHE COMPONENT HTML:\n${html}` },
      ], tool: review, maxTokens: 16000 });
      if (!rv.ok && rv.html) { html = String(rv.html); await render(html, w, h, path.join(shotsDir, `${d.screen}-${i}-v2.jpg`)); }
      o.log(`✓ screen ${d.screen} (${device}, scene ${i + 1}): rebuilt as code${rv.ok ? " · check passed" : ` · fixed: ${(rv.problems ?? []).join(" | ").slice(0, 200)}`}`);
      Object.assign(d, { device, html, w, h, dir: "auto" });
    }
  } finally {
    await browser.close();
  }
}
