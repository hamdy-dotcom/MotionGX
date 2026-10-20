// Step 1 — write: one model call writes the post's angle, every platform's text and (for image posts) each slide's
// content and visual. Facts come only from the brand (brand.json); the visuals only from what was captured, or an AI
// scene with no text in it.
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PostJob, PostPlatform } from "../../live-engine/protocol";
import { callTool, type Ledger } from "../../live-engine/worker/claude";
import { LANGUAGE, PLATFORM } from "./platforms";

export type Visual = { kind: "screen" | "image" | "ai_image" | "logo" | "none"; screen?: string; device?: "phone" | "laptop"; at?: string; image?: string; prompt?: string };
export type Slide = { headline: string; sub?: string; points?: string[]; cta?: string; visual: Visual; ai_file?: string };
export type PostText = { text: string; hashtags: string[] };
export type Written = { angle: string; alt_text: string; platforms: Partial<Record<PostPlatform, PostText>>; slides: Slide[] };

/** the brand's facts and the captured material the writer may use */
export function brandBrief(brand: any) {
  const screens = (brand.screens ?? [])
    .filter((s: any) => !s.empty && (s.clones?.screen || s.clones?.mobile))
    .map((s: any) => ({ id: s.id, shows: s.shows ?? s.label, app: Boolean(s.app), customer: Boolean(s.customer), devices: [s.clones?.mobile ? "phone" : null, s.clones?.screen ? "laptop" : null].filter(Boolean) }));
  const images = (brand.images ?? [])
    .filter((i: any) => ["product", "lifestyle", "people", "background", "illustration", "object-images"].includes(i.kind) && i.w >= 300)
    .slice(0, 30)
    .map((i: any) => ({ file: i.file, kind: i.kind, about: i.note || i.alt || "", ...(i.demo ? { test_data: true } : {}) }));
  const facts = { name: brand.name, name_ar: brand.name_ar, site: brand.site, tagline: brand.tagline, summary: brand.summary, audience: brand.audience, voice: brand.voice, selling_points: brand.selling_points, features: (brand.features ?? []).map((f: any) => ({ name: f.name, detail: f.detail, benefit: f.benefit })) };
  return { facts, screens, images };
}

const SYSTEM = `You are the social media lead of the company below. You write posts its marketer can publish as they are.
Hard rules:
- Facts only from the company's facts (summary, selling points, features, tagline). Never invent numbers, prices,
  discounts, dates, customer names, reviews or claims. If the brief asks for something the facts don't support, write
  around it honestly.
- Write in the requested language and dialect, in the company's own voice. Every platform gets its own text written
  for that platform's habits (rules below) — not the same text pasted five times.
- No links except the company's own site.`;

export async function writePost(opts: { post: PostJob; brand: any; ledger: Ledger; prev?: Written | null; log: (l: string) => void }): Promise<Written> {
  const { post, brand, ledger, prev } = opts;
  const { facts, screens, images } = brandBrief(brand);
  const visualPost = post.type !== "text";
  const count = post.type === "single" ? 1 : post.slides ?? null;
  const platforms = Object.fromEntries(post.platforms.map((p) => [p, { type: "object", required: ["text", "hashtags"], properties: { text: { type: "string", description: `the ${PLATFORM[p].name} text (without the hashtags)` }, hashtags: { type: "array", items: { type: "string" }, description: "without the # sign" } } }]));
  const slide = {
    type: "object",
    required: ["headline", "visual"],
    properties: {
      headline: { type: "string", description: "the big line on the image — short (≤ 8 words)" },
      sub: { type: "string", description: "optional supporting line (≤ 14 words)" },
      points: { type: "array", items: { type: "string" }, description: "optional, up to 4 very short points (carousel teaching / feature slides)" },
      cta: { type: "string", description: "optional call to action on the image (usually the last slide)" },
      visual: {
        type: "object",
        required: ["kind"],
        properties: {
          kind: { type: "string", enum: ["screen", "image", "ai_image", "logo", "none"], description: "screen = a real captured screen of the product, shown whole in a phone or on a laptop; image = one of the captured images; ai_image = a generated scene/photo/illustration (no text in it); logo = the logo as the visual; none = type only" },
          screen: { type: "string", description: "kind=screen: a screen id from SCREENS" },
          device: { type: "string", enum: ["phone", "laptop"], description: "kind=screen: one the screen has" },
          at: { type: "string", description: "kind=screen, optional: what part of a long screen to show (in words)" },
          image: { type: "string", description: "kind=image: a file from IMAGES" },
          prompt: { type: "string", description: "kind=ai_image: in English, the scene to generate — subject, setting, light, mood, composition; it must contain NO text, letters, numbers, logos or UI" },
        },
      },
    },
  };
  const tool = {
    name: "write_post",
    description: "The post: its angle, each platform's text, and the slides.",
    input_schema: {
      type: "object",
      required: ["angle", "alt_text", "platforms", ...(visualPost ? ["slides"] : [])],
      properties: {
        angle: { type: "string", description: "the one idea this post is about (one sentence)" },
        alt_text: { type: "string", description: "accessibility description of the visual(s), in the post's language" },
        platforms: { type: "object", required: post.platforms, properties: platforms },
        ...(visualPost ? { slides: { type: "array", items: slide, description: count ? `exactly ${count} slide(s)` : "3–7 slides" } } : {}),
      },
    },
  };
  const ai = post.aiImage === "no" ? "Never use ai_image." : post.aiImage === "yes" ? "Use ai_image for at least one slide (the first, unless another fits better)." : "Use ai_image only where a scene, photo or illustration says more than a real screen (at most 2 slides); real screens prove the product.";
  const content = [
    `COMPANY FACTS\n${JSON.stringify(facts)}`,
    visualPost ? `SCREENS (real captured screens; show them whole in their device)\n${JSON.stringify(screens)}\nIMAGES (captured; test_data ones are the capture's demo content — products shown as an example of a store's catalogue, never as the company's own photos)\n${JSON.stringify(images)}` : "",
    `THE POST\n- What the client wants: ${post.brief}\n- Type: ${post.type === "single" ? "one image + text" : post.type === "carousel" ? `carousel${count ? ` of ${count} slides` : ""} + text — slide 1 hooks, the middle slides deliver, the last slide closes with the call to action` : "text only (no image)"}\n- Language: ${LANGUAGE[post.dialect] ?? post.dialect}\n- Platforms and their rules:\n${post.platforms.map((p) => `  - ${PLATFORM[p].name}: ${PLATFORM[p].rules} (max ${PLATFORM[p].maxChars} characters)`).join("\n")}${visualPost ? `\n- Visuals: ${ai} On-image text is short (the platform text carries the detail).` : ""}`,
    prev ? `THE CURRENT VERSION\n${JSON.stringify(prev)}\n\nTHE CLIENT ASKS FOR THIS CHANGE: ${post.request}\nChange what they ask for and keep everything else as it is.` : "",
  ].filter(Boolean).join("\n\n");
  const out = (await callTool({ ledger, step: "post-write", model: post.model, system: `${SYSTEM}`, content, tool, maxTokens: 8000, effort: "medium" })) as Written;
  out.slides = visualPost ? (out.slides ?? []).slice(0, post.type === "single" ? 1 : 10) : [];
  if (visualPost && !out.slides.length) throw new Error("the writer returned no slides");
  // X: the text and its hashtags must fit in 280 characters — hashtags go first, then the text is cut at a word
  const x = out.platforms.x;
  if (x) {
    const len = () => x.text.length + x.hashtags.reduce((n, h) => n + h.length + 2, 0);
    while (len() > 280 && x.hashtags.length) x.hashtags.pop();
    if (len() > 280) x.text = `${x.text.slice(0, 277).replace(/\s+\S*$/, "")}…`;
  }
  for (const s of out.slides) {
    const v = s.visual ?? { kind: "none" };
    // only what exists: an unknown screen / image falls back to type only
    if (v.kind === "screen" && !screens.some((x: any) => x.id === v.screen && x.devices.includes(v.device ?? (x.devices[0] as string)))) s.visual = { kind: "none" };
    if (v.kind === "screen" && !v.device) v.device = screens.find((x: any) => x.id === v.screen)?.devices[0];
    if (v.kind === "image" && !images.some((x: any) => x.file === v.image)) s.visual = { kind: "none" };
    if (v.kind === "ai_image" && (post.aiImage === "no" || !v.prompt)) s.visual = { kind: "none" };
  }
  opts.log(`✓ write: "${out.angle}" · ${post.platforms.join(", ")} · ${out.slides.length} slide(s)${out.slides.length ? ` (${out.slides.map((s) => s.visual.kind).join(", ")})` : ""}`);
  return out;
}
