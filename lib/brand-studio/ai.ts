import "server-only";
// The brand creator's AI: the next question, what uploaded files already decide, the previews, the final identity.
import { inflateRawSync } from "node:zlib";
import type Anthropic from "@anthropic-ai/sdk";
import { callTool, OPUS, SONNET } from "@/lib/ai/claude";
import { AiError } from "@/lib/ai/usage";
import { BRAND_LANGUAGES, cleanIcon, contrast, DirectionSchema, FileBriefSchema, IdentitySchema, NextQuestionSchema, type BrandLanguage, type Direction, type FileBrief, type Identity, type Turn } from "./types";
import { DIALECTS } from "@/lib/types";
import { z } from "zod";

export const MAX_QUESTIONS = 8;
const languageRule = (l: BrandLanguage) => (l === "ar" ? "The brand speaks Arabic: the name may be Arabic or Latin; headline, tagline and CTA in Arabic, in the dialect of the market the talk describes." : l === "en" ? "The brand speaks English: name, tagline, headline and CTA in English; name_ar stays empty." : "The brand speaks Arabic and English: give the name in both scripts (name and name_ar); the tagline and headline in the language of the market the talk describes.");

export async function nextQuestion(o: { workspaceId: string; locale: string; language: BrandLanguage; business: string; turns: Turn[]; fileBrief?: FileBrief | null }) {
  const asked = o.turns.length;
  const r = await callTool({
    workspaceId: o.workspaceId, kind: "brand_facts", strict: false, model: SONNET, effort: "low", maxTokens: 1500,
    system: `You are a senior brand strategist interviewing a founder who has no established brand yet, the way a good agency runs a discovery call. Ask ONE question at a time, and make each one come from what THIS business just told you: a bakery and a fintech never get the same question. Find out what you still lack to design the identity: what it really sells and to whom, why people would choose it over the alternatives, the feeling it should leave, its market, where the brand will mostly be seen, names or colours already in mind or to avoid. Never ask what the description or files already answered. Short, plain and warm, no jargon, one sentence. Give 3–5 short suggested answers specific to this business (the user can also type freely); multiple=true when several can be true at once. Write the question and suggestions in the language and dialect the founder writes in (if unclear, ${o.locale === "ar" ? "Arabic" : "English"}). Set done=true (empty question, no suggestions) once you could brief a designer well, usually after 4–6 questions and never later than ${MAX_QUESTIONS}. Always return brief: everything learned so far as a designer's brief in English.`,
    prompt: `Business, in the founder's words:\n${o.business}\n${o.fileBrief ? `\nFrom their files:\n${JSON.stringify(o.fileBrief)}\n` : ""}\nAsked so far (${asked}):\n${o.turns.map((t, i) => `${i + 1}. Q: ${t.q}\n   A: ${t.a}`).join("\n") || "(none)"}`,
    tool: { name: "next_question", description: "The next question, or done.", input_schema: { type: "object", properties: { done: { type: "boolean" }, question: { type: "string" }, suggestions: { type: "array", items: { type: "string" } }, multiple: { type: "boolean" }, brief: { type: "string" } }, required: ["done", "question", "suggestions", "multiple", "brief"] } },
    schema: NextQuestionSchema, check: (v) => (!v.done && !v.question.trim() ? "question is empty while done is false" : null),
  });
  if (!r.value) throw new AiError("ai_failed", r.problem);
  return asked >= MAX_QUESTIONS ? { ...r.value, done: true, question: "", suggestions: [] } : r.value;
}

// ── uploaded files ─────────────────────────────────────────────
const IMAGE = /^image\/(png|jpeg|webp|gif)$/;
const TEXT = /\.(txt|md|csv|json|html?|xml|svg)$/i;
/** the text of a .docx / .pptx: its XML parts read straight from the zip */
function officeText(bytes: Buffer) {
  const parts: string[] = [];
  let eocd = bytes.length - 22;
  while (eocd >= 0 && bytes.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) return "";
  let at = bytes.readUInt32LE(eocd + 16);
  for (let n = bytes.readUInt16LE(eocd + 10); n > 0 && at + 46 <= bytes.length; n--) {
    const method = bytes.readUInt16LE(at + 10), size = bytes.readUInt32LE(at + 20), nameLen = bytes.readUInt16LE(at + 28), extra = bytes.readUInt16LE(at + 30), comment = bytes.readUInt16LE(at + 32), local = bytes.readUInt32LE(at + 42);
    const name = bytes.toString("utf8", at + 46, at + 46 + nameLen);
    if (/^(word\/document|ppt\/slides\/slide\d+)\.xml$/.test(name)) {
      const start = local + 30 + bytes.readUInt16LE(local + 26) + bytes.readUInt16LE(local + 28), raw = bytes.subarray(start, start + size);
      const xml = (method === 8 ? inflateRawSync(raw) : raw).toString("utf8");
      parts.push(xml.replace(/<\/(w:p|a:p)>/g, "\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
    }
    at += 46 + nameLen + extra + comment;
  }
  return parts.join("\n");
}

export type UploadedFile = { name: string; type: string; bytes: Buffer };
export const MAX_FILES = 6, MAX_FILE_BYTES = 20 * 1024 * 1024;
export async function readFiles(o: { workspaceId: string; files: UploadedFile[] }): Promise<FileBrief> {
  const blocks: Anthropic.ContentBlockParam[] = [];
  for (const f of o.files) {
    if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) blocks.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: f.bytes.toString("base64") } });
    else if (IMAGE.test(f.type)) blocks.push({ type: "image", source: { type: "base64", media_type: f.type as "image/png", data: f.bytes.toString("base64") } });
    else if (/\.(docx|pptx)$/i.test(f.name)) blocks.push({ type: "text", text: `File ${f.name}:\n${officeText(f.bytes).slice(0, 60_000)}` });
    else if (TEXT.test(f.name) || f.type.startsWith("text/")) blocks.push({ type: "text", text: `File ${f.name}:\n${f.bytes.toString("utf8").slice(0, 60_000)}` });
  }
  if (!blocks.length) throw new AiError("ai_failed", "no readable file");
  blocks.push({ type: "text", text: "Read everything above and say what it decides about this brand. Only what is really there: leave a field empty rather than guess. complete=true only when name, colours, fonts and voice are ALL clearly defined." });
  const r = await callTool({
    workspaceId: o.workspaceId, kind: "brand_facts", strict: false, model: SONNET, effort: "low", maxTokens: 2500,
    system: "You read a founder's brand and business documents for a brand designer. Colours as #RRGGBB only when written in the document or clearly visible in it.",
    prompt: blocks,
    tool: { name: "file_brief", description: "What the files decide.", input_schema: { type: "object", properties: { summary: { type: "string" }, name: { type: "string" }, palette: { type: "array", items: { type: "string" } }, fonts: { type: "array", items: { type: "string" } }, voice: { type: "string" }, complete: { type: "boolean" } }, required: ["summary", "name", "palette", "fonts", "voice", "complete"] } },
    schema: FileBriefSchema,
  });
  if (!r.value) throw new AiError("ai_failed", r.problem);
  return r.value;
}

// ── previews ───────────────────────────────────────────────────
const ICON_RULES = `icon: original SVG markup for a 100×100 viewBox (no <svg> tag). Only path, circle, rect, ellipse, polygon, line, g, with fill / stroke set to exactly P (primary), A (accent), I (ink) or none. Attribute values in double quotes; every shape stays inside 0–100 and connected into one mark. A real mark drawn for THIS business from one specific, clever idea, the kind a good logo designer would be proud of: confident curves drawn as path data rather than stacked rectangles, deliberate negative space, optically balanced, readable at 32 px, at most 2 colours, filling about 80 of the 100 units. Never a stock symbol (no generic leaf, globe, swoosh, or a lone initial in a circle), and never another company's mark.`;
const FONT_RULE = "Fonts: any real Google Fonts family, by its exact name, chosen for this brand's character; a family that covers Arabic for the Arabic ones.";
const inChoice = (d: { fonts: Direction["fonts"] }, language: BrandLanguage) => {
  if (language !== "ar" && !(d.fonts.display && d.fonts.body)) return "fonts.display and fonts.body are needed";
  if (language !== "en" && !(d.fonts.arabic_display && d.fonts.arabic_body)) return "fonts.arabic_display and fonts.arabic_body are needed";
  return null;
};
const inkReads = (p: Direction["palette"]) => (contrast(p.ink, p.background) < 4.5 ? "palette.ink on palette.background must reach 4.5:1 contrast" : contrast(p.muted, p.background) < 3 ? "palette.muted on palette.background must reach 3:1 contrast" : null);
const paletteProps = { type: "object", properties: { primary: { type: "string" }, accent: { type: "string" }, ink: { type: "string" }, muted: { type: "string" }, background: { type: "string" }, surface: { type: "string" } }, required: ["primary", "accent", "ink", "muted", "background", "surface"] };
const fontProps = { type: "object", properties: { display: { type: "string" }, body: { type: "string" }, arabic_display: { type: "string" }, arabic_body: { type: "string" } }, required: ["display", "body", "arabic_display", "arabic_body"] };

export const DIRECTIONS_PER_ROUND = 5, MAX_ROUNDS = 2;
export async function makeDirections(o: { workspaceId: string; language: BrandLanguage; brief: string; fileBrief?: FileBrief | null; seen?: string[] }) {
  const Out = z.object({ directions: z.array(DirectionSchema).length(DIRECTIONS_PER_ROUND) });
  const r = await callTool({
    workspaceId: o.workspaceId, kind: "brand_facts", strict: false, model: SONNET, effort: "medium", maxTokens: 9000, retries: 1,
    system: `You are the creative director of a top branding studio presenting ${DIRECTIONS_PER_ROUND} identity directions for one business. They must be truly different territories — different idea, name, colour world, type personality and shape language — not one look recoloured. Avoid clichés of the category and purple-on-white startup defaults. ${languageRule(o.language)} ${FONT_RULE} Each palette: #RRGGBB, ink readable on background, a primary with character. concept: the idea in one sentence, in the brand's language. headline: a line this brand would really say. scene: one photograph showing this direction living in the real world, carrying its logo on the things THIS business would really brand, in the place and market the brief describes. ${ICON_RULES} Names must be original and easy to say; the founder must still check them for trademarks. If the files fix a name, colours or fonts, keep them across all directions and vary the rest.`,
    prompt: `The brief:\n${o.brief}\n${o.fileBrief ? `\nFrom their files (keep what they decide):\n${JSON.stringify(o.fileBrief)}\n` : ""}${o.seen?.length ? `\nAlready shown and not chosen, go elsewhere: ${o.seen.join("; ")}\n` : ""}`,
    tool: { name: "directions", description: "The identity directions.", input_schema: { type: "object", properties: { directions: { type: "array", items: { type: "object", properties: { name: { type: "string" }, name_ar: { type: "string" }, tagline: { type: "string" }, concept: { type: "string" }, palette: paletteProps, fonts: fontProps, icon: { type: "string" }, headline: { type: "string" }, cta: { type: "string" }, radius: { type: "number" }, scene: { type: "string" } }, required: ["name", "name_ar", "tagline", "concept", "palette", "fonts", "icon", "headline", "cta", "radius", "scene"] } } }, required: ["directions"] } },
    schema: Out,
    check: (v) => { for (const [i, d] of v.directions.entries()) { const bad = (cleanIcon(d.icon) ? null : "icon must use only the allowed shapes") ?? inChoice(d, o.language) ?? inkReads(d.palette); if (bad) return `direction ${i + 1}: ${bad}`; } return null; },
  });
  if (!r.value) throw new AiError("ai_failed", r.problem);
  return r.value.directions.map((d) => ({ ...d, icon: cleanIcon(d.icon)! }));
}

// ── the final identity (paid) ──────────────────────────────────
export async function makeIdentity(o: { workspaceId: string; language: BrandLanguage; brief: string; chosen: Direction; notes: string; fileBrief?: FileBrief | null }): Promise<Identity> {
  const list = (props: object) => ({ type: "array", items: { type: "object", properties: props, required: Object.keys(props) } });
  const s = { type: "string" }, strings = { type: "array", items: s };
  const props = { world: list({ kind: s, label: s, scene: s }), dialect: { type: "string", enum: [...DIALECTS] }, name: s, name_ar: s, tagline: s, tagline_ar: s, headline: s, cta: s, summary: s, audience: s, positioning: s, story: s, values: list({ name: s, meaning: s }), voice: { type: "object", properties: { summary: s, traits: strings, do: strings, dont: strings, samples: list({ context: s, line: s }) }, required: ["summary", "traits", "do", "dont", "samples"] }, pillars: list({ name: s, message: s }), features: strings, palette: paletteProps, color_usage: { type: "object", properties: { primary: s, accent: s, background: s }, required: ["primary", "accent", "background"] }, fonts: fontProps, radius: { type: "number" }, icon: s, logo_idea: s, imagery: s, motion: s, dos: strings, donts: strings };
  const r = await callTool({
    workspaceId: o.workspaceId, kind: "brand_facts", strict: false, model: OPUS, effort: "high", maxTokens: 12000,
    system: `You are the design lead finishing a brand identity from the direction the founder chose. Keep the direction's idea, name, colours and fonts unless their notes change them. Refine the mark into a finished logo icon, cleaner and better resolved than the sketch, keeping its idea. ${languageRule(o.language)} ${FONT_RULE} ${ICON_RULES} Everything is specific to this business: never generic brand filler, never an invented statistic, customer or award. voice.samples are real lines in the brand's language(s). headline is the line for its home page and cta its main button, both in the brand's main language. The rest of the guide is in ${o.language === "ar" ? "Arabic" : "English"}. features: only what the brief really says it offers. dialect: how the brand speaks, from its language and market. world: the 5–8 real-world things where THIS business would really show its brand, and only those: what a bakery brands is not what a fintech brands, so choose from what it actually has and does (it may be packaging or a shop, or a phone, an ATM card, an event stand or a vehicle). For each: kind (a short slug), label (its name in ${o.language === "ar" ? "Arabic" : "English"}), scene (the photograph: what it shows, who is there, the real place and market from the brief). Its logo must be visible on it, and the scene asks for no written words besides the logo.`,
    prompt: `The brief:\n${o.brief}\n${o.fileBrief ? `\nFrom their files:\n${JSON.stringify(o.fileBrief)}\n` : ""}\nThe chosen direction:\n${JSON.stringify(o.chosen)}\n\nThe founder's notes on it: ${o.notes || "(none)"}`,
    tool: { name: "identity", description: "The finished identity.", input_schema: { type: "object", properties: props, required: Object.keys(props) } },
    schema: IdentitySchema,
    check: (v) => (cleanIcon(v.icon) ? null : "icon must use only the allowed shapes") ?? inChoice(v, o.language) ?? inkReads(v.palette),
  });
  if (!r.value) throw new AiError("ai_failed", r.problem);
  return { ...r.value, icon: cleanIcon(r.value.icon)! };
}
export const isLanguage = (v: unknown): v is BrandLanguage => BRAND_LANGUAGES.includes(v as BrandLanguage);
