// Step 3 — design: one model call per canvas (4:5 / 9:16 / 16:9) designs every slide as HTML + CSS from the brand's
// real identity — its exact colours and fonts, its logo, its real screens (whole, in a phone or on a laptop), its
// captured images and the AI scenes. The first canvas sets the look; the others adapt the same design to their shape.
/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "node:fs";
import path from "node:path";
import type { PostJob } from "../../live-engine/protocol";
import { callTool, imageBlock, type Ledger } from "../../live-engine/worker/claude";
import { CANVAS, type Canvas } from "./platforms";
import type { Slide } from "./write";

export type SlideDesign = { css: string; body: string };
export type Design = Partial<Record<Canvas, SlideDesign[]>>;

const MOBILE_VIEW = 844, DESKTOP_VIEW = 900; // the capture's viewports (CSS px)

/** the real screens the slides use: their page height, the viewport and their blocks (where a long page can be scrolled to) */
export function screenInfo(brand: any, brandDir: string, slides: Slide[]) {
  const out: Record<string, any> = {};
  for (const s of slides) {
    const v = s.visual;
    if (v.kind !== "screen" || !v.screen || !v.device) continue;
    const sc = (brand.screens ?? []).find((x: any) => x.id === v.screen);
    const cid = v.device === "phone" ? sc?.clones?.mobile?.id : sc?.clones?.screen?.id;
    if (!cid) continue;
    const file = path.join(brandDir, "clones", `${cid}.json`);
    if (!fs.existsSync(file)) continue;
    const c = JSON.parse(fs.readFileSync(file, "utf8"));
    const blocks = (c.keys ?? []).filter((k: any) => k.role === "part").slice(0, 10).map((k: any) => ({ part: k.part, top: k.box[1], height: k.box[3], text: String(k.text ?? "").slice(0, 50) }));
    out[`${v.screen}:${v.device}`] = { screen: v.screen, device: v.device, clone: cid, width: c.w, page_height: c.h, viewport: Math.min(c.h, v.device === "phone" ? MOBILE_VIEW : DESKTOP_VIEW), blocks };
  }
  return out;
}

const SYSTEM = `You are a senior brand designer. You design social media post images in HTML + CSS that a headless browser
renders at the exact canvas size. Each slide is { css, body }: body is the HTML placed inside <div id="post"> (the
canvas: position:relative, overflow:hidden, exactly W×H px); css is the slide's stylesheet (scope it under #post).

What you may use (nothing else — there is no network):
- The brand's fonts by family name (they are loaded): use the display family for headlines, the body family for text,
  then sans-serif. The brand's exact colours.
- Images: <img src="brand/library/…"> (the captured files listed) and <img src="ai/slide-N.jpg"> (the AI scene made
  for slide N, when listed). Photos/AI scenes may be cropped with object-fit:cover.
- The logo: <img src="LOGO">.
- A real product screen, always shown whole, in its own device (the renderer draws the device and pastes the real UI):
    <x-phone screen="ID" width="PX" scroll="Y"></x-phone>    a phone; it is PX wide and about PX × VIEWPORT / WIDTH + 4%
                                                             tall (listed per screen); scroll = the page's CSS px
                                                             shown at the top (default 0)
    <x-laptop screen="ID" width="PX" scroll="Y"></x-laptop>  a laptop; its screen is PX wide and PX × 0.625 tall, the
                                                             base adds PX × 0.05 below and is PX × 1.16 wide
  Place a device with a positioned wrapper (e.g. <div class="device" style="position:absolute;…"><x-phone …></x-phone></div>).
  Keep the whole device inside the canvas. Never draw, fake or rebuild a screen, chart, number or UI yourself.

Design rules:
- One clear idea per slide: a strong headline, at most one supporting line or a few short points, the visual, and
  breathing room. Brand-consistent, premium, not cluttered. Arabic text: dir="rtl", right-aligned unless centred.
- Every text inside the canvas with a safe margin (≥ 64 px on a 1080-wide canvas, scale with the width). Headlines
  ≥ 64 px, other text ≥ 32 px (1080-wide canvas). Contrast ≥ 4.5:1 (≥ 3:1 for large bold text); on photos, use a
  scrim/gradient or a solid panel behind text.
- Use only the slide's own words (headline, sub, points, cta) and the company name — no other text.
- Carousel: one consistent template across slides (same grid, type scale, colours, logo position), a small slide
  counter (e.g. 2/5), the last slide carries the call to action and the logo.`;

export async function designCanvas(opts: { post: PostJob; brand: any; canvas: Canvas; slides: Slide[]; screens: Record<string, any>; ledger: Ledger; reference?: { canvas: Canvas; design: SlideDesign[] } | null; prev?: SlideDesign[] | null; log: (l: string) => void }): Promise<SlideDesign[]> {
  const { post, brand, canvas, slides, screens, ledger } = opts;
  const [W, H] = CANVAS[canvas];
  const content = [
    `CANVAS ${W}×${H} px (${canvas})`,
    `BRAND\n${JSON.stringify({ name: brand.name, name_ar: brand.name_ar, palette: brand.palette, fonts: { display: brand.fonts?.display, body: brand.fonts?.body }, look: brand.look, logo: brand.logo?.file ? { src: `brand/${brand.logo.file}`, on_dark: brand.logo.on_dark ?? null } : null, language: brand.language })}`,
    `SLIDES\n${JSON.stringify(slides.map((s, i) => ({ n: i + 1, headline: s.headline, sub: s.sub, points: s.points, cta: s.cta, visual: s.visual.kind === "ai_image" ? (s.ai_file ? { kind: "ai_image", src: s.ai_file, scene: s.visual.prompt } : { kind: "none" }) : s.visual.kind === "image" ? { kind: "image", src: `brand/${s.visual.image}` } : s.visual.kind === "logo" ? { kind: "logo" } : s.visual.kind === "screen" ? { kind: "screen", ...screens[`${s.visual.screen}:${s.visual.device}`], show: s.visual.at } : { kind: "none" } })))}`,
    opts.reference ? `THE SAME DESIGN ALREADY MADE FOR ${opts.reference.canvas} — adapt it to this canvas's shape (same look, type, colours, imagery; re-balance the layout for ${W}×${H}):\n${JSON.stringify(opts.reference.design)}` : "",
    opts.prev ? `THE CURRENT DESIGN OF THIS CANVAS\n${JSON.stringify(opts.prev)}\nTHE CLIENT ASKS FOR THIS CHANGE: ${post.request}\nChange what they ask for (and what the new slide content needs); keep the rest.` : "",
  ].filter(Boolean).join("\n\n");
  const tool = slidesTool(slides.length);
  const out = await callTool({ ledger, step: "post-design", model: post.model, system: SYSTEM, content, tool, maxTokens: 16000, cacheSystem: true, effort: "medium" });
  const list = ((out as any).slides ?? []) as SlideDesign[];
  if (list.length < slides.length) throw new Error(`design ${canvas}: ${list.length} of ${slides.length} slides`);
  opts.log(`✓ design ${canvas}: ${slides.length} slide(s)`);
  return list.slice(0, slides.length);
}

/** one repair round: the rendered slides with the check's findings go back to the designer */
export async function repairCanvas(opts: { post: PostJob; canvas: Canvas; design: SlideDesign[]; issues: string[][]; pngs: string[]; ledger: Ledger; log: (l: string) => void }): Promise<SlideDesign[]> {
  const { post, canvas, design, issues, pngs, ledger } = opts;
  const [W, H] = CANVAS[canvas];
  const blocks: any[] = [{ type: "text", text: `CANVAS ${W}×${H} px (${canvas}). The rendered slides failed the check. Fix every finding; change nothing else.\n\nTHE DESIGN\n${JSON.stringify(design)}\n\nFINDINGS\n${issues.map((l, i) => `slide ${i + 1}: ${l.length ? l.join(" | ") : "ok"}`).join("\n")}` }];
  for (const [i, p] of pngs.entries()) if (issues[i]?.length && fs.existsSync(p)) blocks.push({ type: "text", text: `slide ${i + 1} as rendered:` }, imageBlock(fs.readFileSync(p), "image/png"));
  const out = await callTool({ ledger, step: "post-repair", model: post.model, system: SYSTEM, content: blocks, tool: slidesTool(design.length), maxTokens: 16000, cacheSystem: true, effort: "medium" });
  const list = ((out as any).slides ?? []) as SlideDesign[];
  opts.log(`✓ repair ${canvas}: ${issues.filter((l) => l.length).length} slide(s) fixed`);
  return list.length >= design.length ? list.slice(0, design.length) : design;
}

const slidesTool = (n: number) => ({
  name: "design_slides",
  description: "Every slide of the post for this canvas.",
  input_schema: { type: "object", required: ["slides"], properties: { slides: { type: "array", description: `exactly ${n} slide(s), in order`, items: { type: "object", required: ["css", "body"], properties: { css: { type: "string" }, body: { type: "string" } } } } } },
});
