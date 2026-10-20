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

const SYSTEM = `You are the senior designer of this brand at a top agency. You design its social media posts in HTML +
CSS that a headless browser renders at the exact canvas size. Each slide is { css, body }: body is the HTML placed
inside <div id="post"> (the canvas: position:relative, overflow:hidden, exactly W×H px); css is the slide's
stylesheet (scope it under #post).

THE BAR: someone who knows this brand recognises the post as theirs before reading the name — and it looks like a
premium agency made it, never like a template or a stock photo with a caption.

Brand presence, on every slide:
- The logo: <x-logo height="PX"></x-logo> (the real logo file, cropped to its mark; ≥ 72 px tall on a 1080-wide
  canvas), placed like a signature — a corner, or a lockup with the company name / site.
- The brand's own visual language, taken from its REFERENCE screenshots: its background treatment (surface colour,
  grids, glows, textures), its accent colours and gradients, its card shapes and corner radius, its borders and
  shadows, its type (display family and weight for headlines). Recreate these decorative elements in CSS / inline SVG.
- The brand palette dominates the slide. A photo or AI scene is colour-graded into it (overlays, gradient maps,
  mix-blend-mode, duotone) and framed in the brand's shapes.

Composition:
- Layer it: background (brand surface + its motif) → the hero visual → the typography → the brand signature.
- Never the generic look of a full-bleed photo with centred text on top. Give the image a designed frame: a card with
  the brand's radius, an arch or window, a split layout, an offset frame with the brand gradient as its border, a
  masked shape — and tie it to the layout.
- One dominant headline (display family, heavy weight, big), one supporting line; deliberate alignment and spacing;
  highlight the key word with the brand accent / gradient.
- An occasion (holiday, greeting): culturally fitting motifs drawn as fine line art / patterns in the brand's colours
  and style (inline SVG or CSS), not clip-art.
- When the post is about the product, prove it with a real screen in its device.

What you may use (nothing else — there is no network):
- The brand's fonts by family name (they are loaded): display for headlines, body for text, then sans-serif.
- Images: <img src="brand/library/…"> (the captured files listed) and <img src="ai/slide-N.jpg"> (the AI scene made
  for slide N, when listed — it is shown to you). Photos / AI scenes may be cropped with object-fit:cover.
- Inline <svg> for motifs, shapes and line art (never text, numbers or UI drawn in it).
- A real product screen, always shown whole, in its own device (the renderer draws the device and pastes the real UI):
    <x-phone screen="ID" width="PX" scroll="Y"></x-phone>    a phone; it is PX wide and about PX × VIEWPORT / WIDTH + 4%
                                                             tall (listed per screen); scroll = the page's CSS px
                                                             shown at the top (default 0)
    <x-laptop screen="ID" width="PX" scroll="Y"></x-laptop>  a laptop; its screen is PX wide and PX × 0.625 tall, the
                                                             base adds PX × 0.05 below and is PX × 1.16 wide
  Place a device with a positioned wrapper (e.g. <div class="device" style="position:absolute;…"><x-phone …></x-phone></div>).
  Keep the whole device inside the canvas. Never draw, fake or rebuild a screen, chart, number or UI yourself.

Rules:
- Arabic text: dir="rtl", right-aligned unless centred.
- Every text inside the canvas with a safe margin (≥ 64 px on a 1080-wide canvas, scale with the width). Headlines
  ≥ 64 px, other text ≥ 32 px (1080-wide canvas). Contrast ≥ 4.5:1 (≥ 3:1 for large bold text); on photos, use a
  scrim / gradient or a solid panel behind text.
- Only the slide's own words (headline, sub, points, cta), the company name and its site's domain — no other text.
- Carousel: one consistent template across slides (same grid, type scale, colours, logo position), a small slide
  counter (e.g. 2/5), the last slide carries the call to action.`;

/** what the designer looks at: the brand's own screenshots, then each slide's AI scene */
export type Looks = { brand: { label: string; jpg: Buffer }[]; ai: Record<string, Buffer> };
const lookBlocks = (looks: Looks) => [
  ...looks.brand.flatMap((r) => [{ type: "text", text: `REFERENCE — ${r.label} (the brand's real look: take its visual language, never copy its UI):` }, imageBlock(r.jpg)]),
  ...Object.entries(looks.ai).flatMap(([file, jpg]) => [{ type: "text", text: `AI scene ${file}:` }, imageBlock(jpg)]),
];

export async function designCanvas(opts: { post: PostJob; brand: any; canvas: Canvas; slides: Slide[]; screens: Record<string, any>; looks: Looks; ledger: Ledger; reference?: { canvas: Canvas; design: SlideDesign[] } | null; prev?: SlideDesign[] | null; log: (l: string) => void }): Promise<SlideDesign[]> {
  const { post, brand, canvas, slides, screens, ledger } = opts;
  const [W, H] = CANVAS[canvas];
  const content = [
    `CANVAS ${W}×${H} px (${canvas})`,
    `BRAND\n${JSON.stringify({ name: brand.name, name_ar: brand.name_ar, site: brand.site, palette: brand.palette, fonts: { display: brand.fonts?.display, body: brand.fonts?.body }, look: brand.look, logo: brand.logo?.file ? { tag: "<x-logo height=…>", made_for: brand.logo.on_dark ? "dark backgrounds" : "light backgrounds" } : null, language: brand.language, voice: brand.voice })}`,
    `SLIDES\n${JSON.stringify(slides.map((s, i) => ({ n: i + 1, headline: s.headline, sub: s.sub, points: s.points, cta: s.cta, visual: s.visual.kind === "ai_image" ? (s.ai_file ? { kind: "ai_image", src: s.ai_file, scene: s.visual.prompt } : { kind: "none" }) : s.visual.kind === "image" ? { kind: "image", src: `brand/${s.visual.image}` } : s.visual.kind === "logo" ? { kind: "logo" } : s.visual.kind === "screen" ? { kind: "screen", ...screens[`${s.visual.screen}:${s.visual.device}`], show: s.visual.at } : { kind: "none" } })))}`,
    opts.reference ? `THE SAME DESIGN ALREADY MADE FOR ${opts.reference.canvas} — adapt it to this canvas's shape (same look, type, colours, imagery; re-balance the layout for ${W}×${H}):\n${JSON.stringify(opts.reference.design)}` : "",
    opts.prev ? `THE CURRENT DESIGN OF THIS CANVAS\n${JSON.stringify(opts.prev)}\nTHE CLIENT ASKS FOR THIS CHANGE: ${post.request}\nChange what they ask for (and what the new slide content needs); keep the rest.` : "",
  ].filter(Boolean).join("\n\n");
  const tool = slidesTool(slides.length);
  const out = await callTool({ ledger, step: "post-design", model: post.model, system: SYSTEM, content: [...(lookBlocks(opts.looks) as any[]), { type: "text", text: content }], tool, maxTokens: 24000, cacheSystem: true, effort: "high" });
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

/** the art director: the rendered slides next to the brand's look — ship them, or return them improved */
export async function reviewCanvas(opts: { post: PostJob; brand: any; canvas: Canvas; design: SlideDesign[]; pngs: string[]; looks: Looks; ledger: Ledger; log: (l: string) => void; small: (file: string) => Promise<Buffer | null> }): Promise<SlideDesign[] | null> {
  const { post, canvas, design, pngs, ledger } = opts;
  const [W, H] = CANVAS[canvas];
  const blocks: any[] = [...lookBlocks({ brand: opts.looks.brand, ai: {} })];
  for (const [i, p] of pngs.entries()) { const jpg = await opts.small(p); if (jpg) blocks.push({ type: "text", text: `SLIDE ${i + 1} as rendered (${W}×${H}):` }, imageBlock(jpg)); }
  blocks.push({ type: "text", text: `You are the art director. Judge the rendered slides above against THE BAR and the brand presence rules: is it unmistakably this brand (its look from the references, its palette, its logo)? Premium, not a template? A clear hierarchy, the image designed into the layout, every word legible? If it already meets the bar, verdict "ship". Otherwise verdict "improve" with the problems and the full improved slides (same words, same rules).\n\nTHE DESIGN\n${JSON.stringify(design)}` });
  const tool = { name: "review_slides", description: "The verdict on the slides, and the improved slides when they don't meet the bar.", input_schema: { type: "object", required: ["verdict", "problems"], properties: { verdict: { type: "string", enum: ["ship", "improve"] }, problems: { type: "array", items: { type: "string" } }, slides: { type: "array", description: `verdict improve: all ${design.length} slide(s), improved`, items: { type: "object", required: ["css", "body"], properties: { css: { type: "string" }, body: { type: "string" } } } } } } };
  const out = (await callTool({ ledger, step: "post-review", model: post.model, system: SYSTEM, content: blocks, tool, maxTokens: 24000, cacheSystem: true, effort: "high" })) as { verdict: string; problems?: string[]; slides?: SlideDesign[] };
  if (out.verdict !== "improve" || (out.slides ?? []).length < design.length) { opts.log(`✓ review ${canvas}: ship${out.problems?.length ? ` (${out.problems.join(" | ").slice(0, 200)})` : ""}`); return null; }
  opts.log(`✓ review ${canvas}: improved — ${(out.problems ?? []).join(" | ").slice(0, 300)}`);
  return out.slides!.slice(0, design.length);
}

const slidesTool = (n: number) => ({
  name: "design_slides",
  description: "Every slide of the post for this canvas.",
  input_schema: { type: "object", required: ["slides"], properties: { slides: { type: "array", description: `exactly ${n} slide(s), in order`, items: { type: "object", required: ["css", "body"], properties: { css: { type: "string" }, body: { type: "string" } } } } } },
});
