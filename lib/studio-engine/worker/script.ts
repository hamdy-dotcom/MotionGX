// The ad's script, written the way the MotionGX ads were (MotionGX-ads/videos/scripts.mjs): one scene = one voiceover
// line + one on-screen title, the scene's type from the library (assets/scenes.js), its purpose driving the music
// (problem = breakdown, hook = build, feature/how/proof = groove, reveal/offer/cta = drop). The ads' scripts were
// written by hand; here the model writes one for the client's brand, with the ads' first script as the example.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { callTool, type Ledger } from "../../live-engine/worker/claude";

export type Action = { target: string; do: "tap" | "type" | "pop" | "focus" | "scroll"; text?: string; word: string };
export type Scene = { type: string; purpose: string; vo: string; title: string; sub?: string; data?: any };
export type Script = { idea: string; mood: string; hook_art: "blank" | "app" | "words"; scenes: Scene[]; share_copy: string };

// the first MotionGX ad (eg-1-blank-page), as the model's example of the style, rhythm and dialect
const EXAMPLE = [
  { type: "hook", purpose: "problem", vo: "كل يوم نفس السؤال... هو إحنا هننزّل إيه النهارده؟", title: "النهارده هننزّل إيه؟" },
  { type: "chaos", purpose: "problem", vo: "البيزنس لازم يفضل ظاهر على السوشيال ميديا... بس الديزاينر غالي، والوقت مش مكفّي، والأفكار خِلصت!", title: "الوقت مش مكفّي…", sub: "والأفكار خلصت", data: { chips: ["ديزاينر؟", "فكرة النهارده؟", "فيديو؟", "مقاس الستوري؟", "كابشن؟", "إمتى ننزّل؟"] } },
  { type: "reveal", purpose: "reveal", vo: "اتعرّف على موشن جي إكس... استوديو محتوى كامل، شغّال عشان البراند بتاعك.", title: "MotionGX", sub: "استوديو محتوى بيعرف براندك" },
  { type: "screen", purpose: "how-it-works", vo: "حُط لينك الموقع بتاعك، وهو هيقرا البراند كله: اللوجو، والألوان، والخطوط، وحتى طريقة كلامك.", title: "حُط اللينك…", sub: "وهو يفهم البراند كله", data: { screen: "(a screen id)", device: "desktop", shows: "the brand page filling in", actions: [{ target: "the URL field", do: "type", text: "sekka-coffee.com", word: "لينك" }, { target: "the read-brand button", do: "tap", word: "هيقرا" }, { target: "the colour swatches", do: "pop", word: "الألوان" }] } },
  { type: "screen", purpose: "feature", vo: "تشوفه زي ما هيظهر للناس بالظبط... ولو عايز تغيّر حاجة، قولها بكلمة واحدة.", title: "شوفه قبل ما ينزل", data: { screen: "(a screen id)", device: "phone", shows: "the post preview and the change box", actions: [{ target: "the change box", do: "type", text: "خلّي الخلفية أفتح شوية", word: "تغيّر" }, { target: "the send button", do: "tap", word: "بكلمة" }], callout: "اتعدّل", calloutWord: "واحدة" } },
  { type: "price", purpose: "offer", vo: "والتجربة ببلاش... إنت بتدفع بس على اللي هتنزّله.", title: "التجربة ببلاش", sub: "وبتدفع بس على اللي تنزّله", data: { rows: [["المسودّات", "ببلاش"], ["التعديلات", "ببلاش"], ["طلبات التغيير", "ببلاش"]], total: ["بتدفع على", "اللي تنزّله بس"], stamp: "ببلاش", stampWord: "ببلاش" } },
  { type: "cta", purpose: "cta", vo: "سجّل دلوقتي في الوصول المبكر... واللينك في البايو.", title: "سجّل في الوصول المبكر", sub: "اللينك في البايو", data: { button: "الوصول المبكر" } },
];

const SYSTEM = `You write ~${"{LEN}"}-second launch ads for a brand, the way MotionGX's own launch ads were written.
The ad is a sequence of scenes. One scene = ONE voiceover line (spoken) + ONE short on-screen title (+ an optional sub).
The voice is read in ONE take by a native voice actor, so the lines must read naturally one after another, in the
requested dialect, conversational, no stage directions, no tags, no emojis. Ellipses (...) mark a breath.

SCENE TYPES (the library — use only these):
- hook: the first scene, the problem or question the audience lives with. data (optional): { words: [2–4 words from
  this scene's vo that flash big one after another] }. hook_art (for the whole ad): "blank" (an empty card with a
  blinking caret — use data.blank for its label, ≤ 3 words), "app" (an app icon on a phone, for app products), or
  "words" (only with data.words).
- chaos: the pain, as 6 floating chips. data: { chips: [6 very short questions / pains, ≤ 3 words each] }.
- reveal: the brand appears (its logo is shown big — the title is the brand's name). One reveal, after the problem.
- screen: one of the brand's REAL screens (from SCREENS), rebuilt as a clean, readable component and acted on in
  sync with the voice. data: { screen: "<id from SCREENS>", device: "phone" | "desktop", shows: "what part of the
  screen matters", actions: [ { target: "the element, described plainly", do: "tap" | "type" | "pop" | "focus" |
  "scroll", text?: "for type: the exact text typed", word: "a word of THIS scene's vo — the action fires when it is
  spoken" } ] (1–4 actions), callout?: "≤ 3 words confirming the result", calloutWord?: "a word of the vo" }.
  Use 2–4 screen scenes: they are the heart of the ad — show the product doing what the voice says.
  phone for app / mobile screens, desktop for website screens (a phone may also show a website page: it is reflowed).
- price: an offer as a receipt. data: { rows: [[label, value] × 2–4], total: [label, value], stamp: "≤ 2 words",
  stampWord: "a word of the vo" }. ONLY when the facts or the brief give a real offer / price; else leave it out.
- cta: the last scene. data: { button: "≤ 3 words" }; sub: where to go (the site, the link in bio, the app store).

PURPOSE per scene (drives the music): hook | problem | reveal | feature | proof | how-it-works | offer | cta.
MOOD (the music): driving | uplifting | tense-then-release | chill.

RULES
- ${"{N}"} scenes, each vo line 6–18 words (a 60 s ad has ~9). The whole vo is ~${"{WORDS}"} words.
- Facts only from the brand's facts and the brief — never invent numbers, prices, discounts or claims.
- Every action.word / stampWord / calloutWord / hook word is a word that appears in that same scene's vo.
- Titles are short (≤ 5 words), sub ≤ 6 words, in the same dialect. No title repeats its vo word for word.
- The brand's name in the vo is written as people say it in the dialect (e.g. "موشن جي إكس").
- share_copy: 1–3 sentences to post with the video, in the same language.`;

export async function writeScript(o: { brand: any; screens: any[]; brief: any; language: string; length: number; ledger: Ledger; model: string; log: (l: string) => void }): Promise<Script> {
  const n = Math.max(5, Math.min(10, Math.round(o.length / 6.5)));
  const system = SYSTEM.replace("{LEN}", String(o.length)).replace("{N}", `${n - 1}–${n + 1}`).replace("{WORDS}", String(Math.round(o.length * 2.1)));
  const b = o.brand;
  const facts = { name: b.name, name_ar: b.name_ar, site: b.site, tagline: b.tagline, summary: b.summary, audience: b.audience, voice: b.voice, selling_points: b.selling_points, features: (b.features ?? []).map((f: any) => ({ name: f.name, detail: f.detail, benefit: f.benefit })) };
  const tool = { name: "write_ad", description: "The ad's script.", input_schema: { type: "object", required: ["idea", "mood", "hook_art", "scenes", "share_copy"], properties: {
    idea: { type: "string", description: "the creative angle in one line" },
    mood: { type: "string", enum: ["driving", "uplifting", "tense-then-release", "chill"] },
    hook_art: { type: "string", enum: ["blank", "app", "words"] },
    scenes: { type: "array", items: { type: "object", required: ["type", "purpose", "vo", "title"], properties: { type: { type: "string", enum: ["hook", "chaos", "reveal", "screen", "price", "cta"] }, purpose: { type: "string", enum: ["hook", "problem", "reveal", "feature", "proof", "how-it-works", "offer", "cta"] }, vo: { type: "string" }, title: { type: "string" }, sub: { type: "string" }, data: { type: "object" } } } },
    share_copy: { type: "string" },
  } } };
  const content = [
    `THE BRAND'S FACTS\n${JSON.stringify(facts)}`,
    `SCREENS (the brand's real captured screens; use their ids in screen scenes)\n${JSON.stringify(o.screens)}`,
    `THE BRIEF\n- Goal: ${o.brief.objective}\n- What the client wants: ${o.brief.description || "(none)"}${o.brief.offer ? `\n- Offer / CTA: ${o.brief.offer}` : ""}\n- Language and dialect of the vo and all titles: ${o.language}\n- Length: ~${o.length} s`,
    `EXAMPLE — MotionGX's own first launch ad (Egyptian), for the style, rhythm and the way actions are tied to spoken words (its screen ids are placeholders):\n${JSON.stringify(EXAMPLE)}`,
  ].join("\n\n");
  const r = await callTool({ ledger: o.ledger, step: "director", model: o.model, system, content, tool, maxTokens: 12000 });
  const unwrap = (v: any) => { if (typeof v !== "string") return v; try { return JSON.parse(v); } catch { return v; } };
  const scenes = (unwrap(r.scenes) as Scene[]).filter((s) => s && s.vo?.trim() && s.title).map((s) => ({ ...s, data: unwrap(s.data) ?? undefined }));
  // a screen scene must name a real screen; one that doesn't becomes a plain title scene
  const ids = new Set(o.screens.map((s) => s.id));
  for (const s of scenes) if (s.type === "screen" && !ids.has(s.data?.screen)) { o.log(`! script: screen scene "${s.title}" names no captured screen (${s.data?.screen}) — shown as a title only`); s.type = "title"; }
  if (!scenes.length) throw new Error("the script came back empty");
  o.log(`✓ script: "${r.idea}" · ${r.mood} · ${scenes.length} scenes (${scenes.map((s) => s.type).join(" → ")})`);
  return { idea: String(r.idea ?? ""), mood: r.mood, hook_art: r.hook_art, scenes, share_copy: String(r.share_copy ?? "") };
}
