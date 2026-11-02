import "server-only";
// The brand in the world. The website is designed by the AI as a real page for this brand, never a layout filled in.
// The physical things (clothes, booth, cards, packaging, storefront) are photo-real images with the brand's own logo
// given to the image model as a reference. Previews use a short page and one low-quality image; the paid pack the full set.
import { z } from "zod";
import { callTool, OPUS, SONNET } from "@/lib/ai/claude";
import { AiError } from "@/lib/ai/usage";
import { postsSettings } from "@/lib/posts/config";
import type { BrandLanguage, Direction, Identity, Palette } from "./types";

const PRICE = { text: 5, image: 8, out: 30 }; // GPT Image, per 1M tokens (same table as the posts engine)
const IMAGE_MODEL = () => postsSettings().image.model;

export type Photo = { bytes: Uint8Array; usd: number };
/** one image; with a logo it goes through the edits endpoint so the real mark is what appears */
export async function photo(prompt: string, o: { logo?: Uint8Array; size?: string; quality: "low" | "medium" | "high" }): Promise<Photo> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  const size = o.size ?? "1024x1024";
  let res: Response | null = null, last = "";
  for (const wait of [0, 3000, 8000]) {
    if (wait) await new Promise((ok) => setTimeout(ok, wait));
    try {
      if (o.logo) {
        const form = new FormData();
        for (const [k, v] of Object.entries({ model: IMAGE_MODEL(), prompt, size, quality: o.quality, output_format: "jpeg", output_compression: "90" })) form.append(k, v);
        form.append("image[]", new Blob([o.logo as BlobPart], { type: "image/png" }), "logo.png");
        res = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: { authorization: `Bearer ${key}` }, body: form, signal: AbortSignal.timeout(240_000) });
      } else {
        res = await fetch("https://api.openai.com/v1/images/generations", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` }, body: JSON.stringify({ model: IMAGE_MODEL(), prompt, size, quality: o.quality, output_format: "jpeg", output_compression: 90, n: 1 }), signal: AbortSignal.timeout(240_000) });
      }
      if (res.status !== 429 && res.status < 500) break;
      last = `OpenAI ${res.status}`;
    } catch (err) { res = null; last = String(err); }
  }
  if (!res) throw new Error(`the image could not be made: ${last}`);
  const body = (await res.json().catch(() => null)) as { data?: { b64_json?: string }[]; usage?: { input_tokens?: number; output_tokens?: number; input_tokens_details?: { text_tokens?: number; image_tokens?: number } }; error?: { message?: string } } | null;
  if (!res.ok || !body?.data?.[0]?.b64_json) throw new Error(`OpenAI ${res.status}: ${body?.error?.message?.slice(0, 200) ?? "no image"}`);
  const u = body.usage, tin = u?.input_tokens ?? 0, timg = u?.input_tokens_details?.image_tokens ?? 0, ttxt = u?.input_tokens_details?.text_tokens ?? Math.max(0, tin - timg);
  return { bytes: new Uint8Array(Buffer.from(body.data[0].b64_json, "base64")), usd: (ttxt * PRICE.text + timg * PRICE.image + (u?.output_tokens ?? 0) * PRICE.out) / 1e6 };
}

const colours = (p: Palette) => `primary ${p.primary}, accent ${p.accent}, dark ${p.ink}, light ${p.background}`;
const PHOTO_RULES = "Photorealistic commercial product photography, as shot for a premium brand's guidelines by a professional photographer: real materials and fabric texture, natural light, believable shadows and perspective, shallow depth of field. Never an illustration, a cartoon or a flat vector. The attached image is the brand's logo: reproduce it exactly, same shape, letters and colours, printed or fixed naturally on the object, and never invent another logo. No other text, words or numbers anywhere.";

export const WORLD_SCENES = [
  { kind: "tshirt", scene: "A premium heavyweight cotton T-shirt in the brand's colour, worn by a person cropped at the neck, against a clean studio backdrop, with the logo on the chest." },
  { kind: "uniform", scene: "A real staff member at work in the business's own setting, wearing a smart branded uniform (polo or apron fitting this business) with the logo on the chest, face natural and friendly." },
  { kind: "booth", scene: "A real, professionally built retail booth in a modern shopping mall in Cairo, three-quarter view: branded fascia with the logo lit, counter, displays fitting this business, warm mall lighting, softly blurred shoppers." },
  { kind: "card", scene: "A stack of premium thick matte business cards on a textured surface, the top card showing the logo large, with a second card beside it in the brand colour, soft window light." },
  { kind: "packaging", scene: "The business's real packaging, chosen for what it sells (bag, box, wrap or label), arranged on a clean surface with the logo printed on it, as a premium brand shoot." },
  { kind: "storefront", scene: "The street-level storefront of this business at golden hour on a real Cairo street, with an illuminated sign showing the logo, glass window and warm interior." },
  { kind: "billboard", scene: "A large outdoor billboard on a Cairo road at dusk showing only the logo big on the brand colour, with soft traffic light trails." },
] as const;

export const worldPrompt = (scene: string, name: string, about: string, p: Palette) => `${scene}\n\nThe business: ${name}. ${about}\nBrand colours: ${colours(p)}.\n\n${PHOTO_RULES}`;
export const previewScene = (d: Direction, about: string) => worldPrompt("A premium brand identity flat lay photographed from above on a real textured surface: a business card, a folded T-shirt and a shopping bag, all carrying the logo, arranged by an art director.", d.name, about, d.palette);

/** nothing runs in these pages: they are shown in a sandboxed frame and shipped as files */
export function cleanHtml(html: string) {
  return html.replace(/<script[\s\S]*?<\/script\s*>/gi, "").replace(/<iframe[\s\S]*?<\/iframe\s*>/gi, "").replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "").replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
}
const htmlOk = (h: string) => (/<html[\s>]/i.test(h) && /<style[\s>]/i.test(h) && h.length > 1500 ? null : "return one complete HTML document with its CSS in a style tag");
const DESIGN = `You are one of the best web designers alive, the kind whose sites win Awwwards and whom premium brands hire. Design this brand's website with a real point of view: a layout, type treatment and art direction that come from this brand's idea and could not belong to another company. Avoid the generic startup look: no centred hero over three feature cards, no gradient blobs, no emoji icons. Use bold typographic scale, confident composition, generous space and considered details. One complete HTML document, CSS in a <style> tag, no JavaScript. Load its fonts from Google Fonts with a <link>. Responsive. Real, specific copy in the brand's language, never lorem ipsum; dir="rtl" for Arabic. Only claims the brief supports: no invented statistics, customers, testimonials, prices or awards.`;
const SITE_TOOL = (extra: object) => ({ name: "website", description: "The page.", input_schema: { type: "object" as const, properties: { html: { type: "string" }, ...extra }, required: ["html", ...Object.keys(extra)] } });
const language = (l: BrandLanguage) => (l === "ar" ? "Arabic (Egyptian market)" : l === "en" ? "English" : "the brand's main language, with the other as a switch in the nav");

/** the top of the home page, for a preview: no images, so only type, colour and CSS */
export async function previewPage(o: { workspaceId: string; d: Direction; brief: string; lang: BrandLanguage }) {
  const r = await callTool({
    workspaceId: o.workspaceId, kind: "brand_facts", strict: false, model: SONNET, effort: "medium", maxTokens: 7000,
    system: `${DESIGN} This is a first look, so design only the first screen of the home page at 1280×800, navigation and hero, with no images: only type, colour, shapes and CSS. It must already look finished and striking, with a rich composition and real design details. Where the logo goes, write the literal token {{logo}} in an element sized about 40px tall.`,
    prompt: `Brief:\n${o.brief}\n\nBrand direction:\n${JSON.stringify({ ...o.d, icon: undefined })}\n\nLanguage: ${language(o.lang)}.`,
    tool: SITE_TOOL({}), schema: z.object({ html: z.string().max(40000) }), check: (v) => htmlOk(v.html),
  });
  if (!r.value) throw new AiError("ai_failed", r.problem);
  return cleanHtml(r.value.html);
}

/** the full home page, with its own photographs */
export async function fullSite(o: { workspaceId: string; id: Identity; brief: string; lang: BrandLanguage }) {
  const Out = z.object({ html: z.string().max(90000), photos: z.array(z.object({ key: z.string().regex(/^[a-z0-9-]+$/).max(24), prompt: z.string().max(600), wide: z.boolean() })).min(1).max(8).transform((xs) => xs.slice(0, 6)) });
  const r = await callTool({
    workspaceId: o.workspaceId, kind: "brand_facts", strict: false, model: OPUS, effort: "high", maxTokens: 20000,
    system: `${DESIGN} Design the complete home page, using at most 5 photographs: navigation, hero, what the business offers, why choose it, how it works where that fits, a closing call to action, and a footer. For photographs, set src="{{photo:key}}" on <img> (or the same in a CSS background) and list each one in photos with a prompt for a real, art-directed photograph fitting this brand: no text or logos in it. Where the logo goes, write the literal token {{logo}} in an element with a set height.`,
    prompt: `Brief:\n${o.brief}\n\nThe identity:\n${JSON.stringify({ ...o.id, icon: undefined })}\n\nLanguage: ${language(o.lang)}.`,
    tool: SITE_TOOL({ photos: { type: "array", items: { type: "object", properties: { key: { type: "string" }, prompt: { type: "string" }, wide: { type: "boolean" } }, required: ["key", "prompt", "wide"] } } }), schema: Out, check: (v) => htmlOk(v.html),
  });
  if (!r.value) throw new AiError("ai_failed", r.problem);
  return { html: cleanHtml(r.value.html), photos: r.value.photos };
}
/** the page with its tokens filled: the logo as an image tag, each photo by the given address */
export const fillPage = (html: string, logo: string, photos: Record<string, string>) => html.replace(/\{\{logo\}\}/g, `<img src="${logo}" alt="" style="height:100%;max-height:48px;width:auto;display:block">`).replace(/\{\{photo:([a-z0-9-]+)\}\}/g, (_, k: string) => photos[k] ?? "");
