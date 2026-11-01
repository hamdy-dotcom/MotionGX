// The ad's script, written the way the MotionGX ads were (MotionGX-ads/videos/scripts.mjs): one scene = one voiceover
// line + one on-screen title, the scene's type from the library (assets/scenes.js), its purpose driving the music
// (problem = breakdown, hook = build, feature/how/proof = groove, reveal/offer/cta = drop). The ads' scripts were
// written by hand; here the model writes a STORY for the client's brand (a person, a moment, the product solving it),
// where every scene shows something. Then a dialect pass rewrites every line the way it is spoken — the ads' fix for a
// voice that drifts to standard Arabic (one take + truly colloquial wording, spelled the way it is said).
/* eslint-disable @typescript-eslint/no-explicit-any */
import { callTool, type Ledger } from "../../live-engine/worker/claude";

export type Scene = { type: string; purpose: string; vo: string; title: string; sub?: string; data?: any };
export type Script = { idea: string; mood: string; hook_art: "blank" | "app" | "words"; scenes: Scene[]; share_copy: string };

// the first MotionGX ad (eg-1-blank-page): the style, rhythm and dialect of the lines
const EXAMPLE_ADS = [
  "كل يوم نفس السؤال... هو إحنا هننزّل إيه النهارده؟",
  "البيزنس لازم يفضل ظاهر على السوشيال ميديا... بس الديزاينر غالي، والوقت مش مكفّي، والأفكار خِلصت!",
  "اتعرّف على موشن جي إكس... استوديو محتوى كامل، شغّال عشان البراند بتاعك.",
  "حُط لينك الموقع بتاعك، وهو هيقرا البراند كله: اللوجو، والألوان، والخطوط، وحتى طريقة كلامك.",
  "تشوفه زي ما هيظهر للناس بالظبط... ولو عايز تغيّر حاجة، قولها بكلمة واحدة.",
  "والتجربة ببلاش... إنت بتدفع بس على اللي هتنزّله.",
  "سجّل دلوقتي في الوصول المبكر... واللينك في البايو.",
];
// a story built from the scene types (a made-up delivery app), for the structure only
const EXAMPLE_STORY = [
  { type: "notify", purpose: "problem", vo: "الساعة عشرة بالليل... ومريم لسه راجعة من الشغل، والتلاجة فاضية خالص.", title: "التلاجة فاضية…", data: { time: "10:02", date: "الخميس", items: [{ app: "ماما", title: "أكلتي؟", body: "متناميش من غير عشا", word: "راجعة" }] } },
  { type: "chat", purpose: "hook", vo: "تبعت لصاحبتها: أعمل إيه؟ ترد عليها: اطلبي من لقمة، بيوصل في ربع ساعة!", title: "اطلبي من لقمة", data: { with: "سلمى", messages: [{ from: "me", text: "جعانة ومفيش حاجة 😩", word: "تبعت" }, { from: "them", text: "اطلبي من لقمة، بيوصل بسرعة", word: "ترد" }], reaction: "ربع ساعة!", reactionWord: "ساعة" } },
  { type: "reveal", purpose: "reveal", vo: "لقمة... أكل البيت، على باب بيتك.", title: "Lo2ma" },
  { type: "screen", purpose: "how-it-works", vo: "تفتح الأبلكيشن، تختار الطبق، وتدوس اطلب.", title: "تلات دوسات", data: { screen: "(id)", device: "phone", shows: "the menu", actions: [{ target: "the first dish", do: "tap", word: "تختار" }, { target: "the order button", do: "tap", word: "اطلب" }] } },
  { type: "deal", purpose: "offer", vo: "وأول طلب ليكي عليه خصم خمسين في المية.", title: "أول طلب بنص التمن", data: { item: "مكرونة بشاميل", price: "180", currency: "ج.م", parts: [{ amount: "90", label: "بعد الخصم" }], splitWord: "خصم", badge: "-50%", badgeWord: "خمسين" } },
  { type: "cta", purpose: "cta", vo: "نزّلي لقمة دلوقتي... واللينك في البايو.", title: "نزّلي لقمة", sub: "اللينك في البايو", data: { button: "اطلبي دلوقتي" } },
];

const SYSTEM = `You write ~{LEN}-second video ads for a brand, the way MotionGX's own launch ads were written — and every ad
TELLS A STORY and SHOWS it. One scene = ONE voiceover line (spoken) + ONE short on-screen title (+ an optional sub) +
a visual that shows what the line says. Never a scene that is only words on the screen.

SHOW WHAT IS SAID: when a line mentions a thing (an item, a price, a message, a place, a number, a person's moment),
its scene shows exactly that thing as a component — e.g. «عاجبك حاجة ومش معاك فلوسها» shows the wanted item with its
price and a tag «مش معاك فلوسها»; «بعتت لصاحبتها» shows the chat. A title alone is never the visual.

THE STORY: one real person from the brand's audience (a name, a moment of their day, a want or a problem the audience
knows), the brand entering their story, the product doing its job on screen (its real screens), the result in their
life, the call to action. Concrete and specific — a real item, a real place, a real time of day — never slogans.

The voice is read in ONE take by a native voice actor: the lines follow one another naturally, in the requested
dialect, conversational, no stage directions, no tags, no emojis. Ellipses (...) mark a breath.

SCENE TYPES (use only these; vary them — no type more than twice, except screen):
- notify: a phone lock screen, notifications slide in. data: { time: "10:02", date: "a day", items: [ { app: "brand"
  for the brand's own notification, or a person / app name, title, body (short), word } ] (1–2) }.
- chat: a messaging chat between the person and someone. data: { with: "name", messages: [ { from: "me" | "them",
  text (≤ 8 words, may hold one emoji), word, image?: a file from IMAGES } ] (2–4), reaction?: "≤ 3 words",
  reactionWord? }.
- screen: one of the brand's REAL screens (from SCREENS), rebuilt as a clean component and acted on with the voice.
  data: { screen: "<id from SCREENS>", device: "phone" | "desktop", shows: "what part matters", actions: [ { target:
  "the element, described plainly", do: "tap" | "type" | "pop" | "focus" | "scroll", text?: "for type: the exact
  text typed", word } ] (1–4), callout?: "≤ 3 words confirming the result", calloutWord? }. Use 2–3 screen scenes.
- items: the THINGS a line talks about, shown: 1–3 product cards with price tags. data: { items: [ { name (≤ 4
  words), price?, currency?, image?: a file from IMAGES when one shows it, emoji?: one emoji when no image fits, word }
  ] (1–3), tag?: "≤ 4 words that land on the cards (a want, a problem)", tagWord?, tagTone?: "bad" | "good" }.
  Prices: from the facts, or a clearly typical price of such an item in the market.
- deal: an item and its price, then the price splits into parts (instalments, a discount, a bundle). data: { item,
  store?, price, currency, image?: a file from IMAGES, parts: [ { amount, label } ] (1–5), splitWord, badge?: "≤ 2
  words", badgeWord? }. Only with prices / offers the facts or the brief give, or an example price clearly an example.
- gallery: the brand's REAL photos (products, stores, partners, people) landing on the beat. data: { images: [ {
  file: from IMAGES, label?: "≤ 2 words" } ] (3–6), words?: [the word each image lands on] }.
- stat: one big number that counts up. data: { value: number, suffix?: "%" | "+" | "x", label: "≤ 5 words", word }.
  Only a number the facts give.
- compare: before vs after. data: { before: { title, points: [≤ 3, ≤ 4 words each] }, after: { title, points },
  afterWord }.
- chaos: the problem as 6 floating chips. data: { chips: [6 very short pains, ≤ 3 words each] }.
- hook: words flashing big (only when the line has nothing to show — prefer items / notify / chat / chaos). data: { words: [2–3 words from the FIRST HALF of this vo, never
  its last word] }.
- reveal: the brand appears (its logo shown big; the title is the brand's name). Exactly one, once the story's need is set.
- cta: the last scene. data: { button: "≤ 3 words" }; sub: where to go (the site, the link in bio, the app store).

PURPOSE per scene (drives the music): hook | problem | reveal | feature | proof | how-it-works | offer | cta.
MOOD (the music): driving | uplifting | tense-then-release | chill.

RULES
- {N} scenes, each vo line 5–14 words; the whole vo is ~{WORDS}.
- Facts only from the brand's facts and the brief — never invent the brand's numbers, prices, discounts or claims.
- Every "word" field is a word that appears in that same scene's vo, written exactly as in the vo.
- Titles are short (≤ 5 words), sub ≤ 6 words, in the same dialect. A title never repeats its vo word for word.
- Files (image fields) only from IMAGES, exactly as listed.
- share_copy: 1–3 sentences to post with the video, in the same language.`;

const tool = { name: "write_ad", description: "The ad's script.", input_schema: { type: "object", required: ["idea", "mood", "hook_art", "scenes", "share_copy"], properties: {
  idea: { type: "string", description: "the story in one line" },
  mood: { type: "string", enum: ["driving", "uplifting", "tense-then-release", "chill"] },
  hook_art: { type: "string", enum: ["blank", "app", "words"] },
  scenes: { type: "array", items: { type: "object", required: ["type", "purpose", "vo", "title"], properties: { type: { type: "string", enum: ["notify", "chat", "screen", "items", "deal", "gallery", "stat", "compare", "chaos", "hook", "reveal", "cta"] }, purpose: { type: "string", enum: ["hook", "problem", "reveal", "feature", "proof", "how-it-works", "offer", "cta"] }, vo: { type: "string" }, title: { type: "string" }, sub: { type: "string" }, data: { type: "object" } } } },
  share_copy: { type: "string" },
} } };

const DIALECT_RULES: Record<string, string> = {
  eg: `Egyptian Arabic as Cairenes speak it in a casual Instagram video. Never a standard-Arabic form: «اتعرّف على» not «قابل», «عايز» not «أريد», «دلوقتي» not «الآن», «مش» not «ليس / لا», «إزاي» not «كيف», «فلوس» not «مال», «بتاعك» where natural, future with «هـ», present with «بـ». Numbers as Egyptians say them: «تلات / أربع / خمس دفعات», «ميت جنيه», «ربع ساعة». Vowel marks: AT MOST ONE word per line, only where the standard reading would change the word (حُط، خِلصت); a shadda where a doubled letter matters (هتنزّله، تغيّر). Never vowel the whole line — a fully vowelled text is read like a formal text, robotic. Foreign brand / product names written in Arabic letters the way Egyptians pronounce them (كلاركس، مانجو، جاب، أبلكيشن).`,
  sa: `Saudi Arabic as people in Riyadh / Jeddah speak it in a casual video: «وش» «تبي» «واجد» «الحين» «على طول» «زين», never standard-Arabic forms. Numbers as Saudis say them. Vowel marks on at most one word per line; never vowel the whole line. Foreign names in Arabic letters the way Saudis pronounce them.`,
};

// Fathy reads ~12 characters a second in one take (447 characters → 36 s); the lines must fit the video's length
export const CHARS_PER_S = 12;
/** the voice's room in a video of `length` seconds with `n` scenes (the ads' lead-in, a short tail, the CTA's hold) */
export const speechBudget = (length: number, n: number) => Math.max(8, length - n * (0.4 + 0.6) - 1.2);
const HARAKAT = /[\u064B-\u0650\u0652]/g;
/** a line with vowel marks on more than one word is read like a formal text: keep only its shaddas */
function tame(vo: string) {
  const marked = vo.split(/\s+/).filter((w) => /[\u064B-\u0650\u0652]/.test(w)).length;
  return marked > 1 ? vo.replace(HARAKAT, "") : vo;
}

/** the dialect pass: every line rewritten as it is spoken (and spelled so the voice says it right) */
async function dialectPass(scenes: Scene[], o: { country: string; language: string; ledger: Ledger; model: string; log: (l: string) => void }) {
  const key = /^(SA|AE|KW|QA|BH|OM)$/.test(o.country) ? "sa" : /^EG$/.test(o.country) ? "eg" : null;
  if (!key) return;
  // every word an animation fires on, per scene: they must stay findable in the new line
  const refs = (s: Scene): string[] => {
    const d = s.data ?? {}, out: string[] = [];
    const take = (v: any) => { if (typeof v === "string" && v.trim()) out.push(v); };
    for (const k of ["word", "calloutWord", "stampWord", "splitWord", "badgeWord", "afterWord", "reactionWord"]) take(d[k]);
    for (const w of d.words ?? []) take(w);
    for (const a of [...(d.actions ?? []), ...(d.messages ?? []), ...(d.items ?? [])]) take(a?.word);
    return [...new Set(out)];
  };
  const input = scenes.map((s, i) => ({ i, vo: s.vo, keep: refs(s) }));
  const t = { name: "spoken_lines", description: "The lines as they are spoken.", input_schema: { type: "object", required: ["lines"], properties: { lines: { type: "array", items: { type: "object", required: ["i", "vo", "words"], properties: { i: { type: "number" }, vo: { type: "string" }, words: { type: "object", description: "each keep word → how it is written in the new vo (itself when unchanged)" } } } } } } };
  const r = await callTool({ ledger: o.ledger, step: "director", model: o.model, system: `You are a native ${key === "eg" ? "Egyptian" : "Saudi"} voice director. A voice model reads these lines in one take and drifts to standard Arabic on any word that looks standard. Rewrite each line exactly the way a native speaker says it — same meaning, same length, same order of ideas, same names — so every word sounds ${key === "eg" ? "Egyptian" : "Saudi"}.\n${DIALECT_RULES[key]}\nKeep ellipses (...) for breaths, no tags, no emojis. Every keep word must still appear in its line (it may be respelled — say how in words).`, content: `${o.language}\nTHE LINES:\n${JSON.stringify(input)}`, tool: t, maxTokens: 6000 });
  const unwrap = (v: any) => { if (typeof v !== "string") return v; try { return JSON.parse(v); } catch { return v; } };
  let changed = 0;
  for (const l of (unwrap(r.lines) ?? []) as { i: number; vo: string; words: Record<string, string> }[]) {
    const s = scenes[l.i];
    if (!s || !l.vo?.trim()) continue;
    const words = unwrap(l.words) ?? {};
    const map = (w: any) => (typeof w === "string" && words[w] && l.vo.includes(words[w]) ? words[w] : w);
    const d = s.data ?? {};
    for (const k of ["word", "calloutWord", "stampWord", "splitWord", "badgeWord", "afterWord", "reactionWord"]) if (d[k]) d[k] = map(d[k]);
    if (Array.isArray(d.words)) d.words = d.words.map(map);
    for (const a of [...(d.actions ?? []), ...(d.messages ?? []), ...(d.items ?? [])]) if (a?.word) a.word = map(a.word);
    const vo = tame(l.vo);
    if (s.vo !== vo) changed++;
    s.vo = vo;
  }
  o.log(`✓ dialect: ${changed} of ${scenes.length} lines respelled as spoken (${key === "eg" ? "Egyptian" : "Saudi"})`);
}

/** the lines over the voice's room in the video: one pass shortens them (same story, same words the animations use) */
async function fitLength(scenes: Scene[], o: { length: number; language: string; ledger: Ledger; model: string; log: (l: string) => void }) {
  const max = Math.round(speechBudget(o.length, scenes.length) * CHARS_PER_S), chars = scenes.reduce((a, s) => a + s.vo.length, 0);
  if (chars <= max * 1.05) return;
  const input = scenes.map((s, i) => ({ i, vo: s.vo, keep: JSON.stringify(s.data ?? {}).match(/"(?:word|calloutWord|stampWord|splitWord|badgeWord|afterWord|reactionWord)":"([^"]+)"/g)?.map((x) => x.split('":"')[1].slice(0, -1)) ?? [] }));
  const t = { name: "shorter_lines", description: "The shortened lines.", input_schema: { type: "object", required: ["lines"], properties: { lines: { type: "array", items: { type: "object", required: ["i", "vo"], properties: { i: { type: "number" }, vo: { type: "string" } } } } } } };
  const r = await callTool({ ledger: o.ledger, step: "director", model: o.model, system: `You tighten a video ad's voiceover so it fits its length. Keep the story, the dialect (${o.language}), the spelling style, the names and every keep word exactly as written; cut filler, merge, simplify. The whole voiceover must be at most ${max} characters (now ${chars}). Keep ellipses for breaths. No vowel marks beyond what is there.`, content: JSON.stringify(input), tool: t, maxTokens: 4000 });
  const lines = (typeof r.lines === "string" ? JSON.parse(r.lines) : r.lines) as { i: number; vo: string }[];
  for (const l of lines ?? []) if (scenes[l.i] && l.vo?.trim()) scenes[l.i].vo = tame(l.vo);
  o.log(`✓ length: the voiceover tightened from ${chars} to ${scenes.reduce((a, s) => a + s.vo.length, 0)} characters (room for ~${max} in ${o.length}s)`);
}

export async function writeScript(o: { brand: any; screens: any[]; images: { file: string; kind: string; note: string }[]; brief: any; language: string; length: number; ledger: Ledger; model: string; log: (l: string) => void }): Promise<Script> {
  const n = Math.max(4, Math.min(12, Math.round(o.length / 5)));
  const chars = Math.round(speechBudget(o.length, n) * CHARS_PER_S);
  const system = SYSTEM.replace("{LEN}", String(o.length)).replace("{N}", `${n - 1}–${n}`).replace("{WORDS}", `${Math.round(chars / 5.5)} words (at most ${chars} characters in all — the video is exactly ${o.length} s)`);
  const b = o.brand;
  const facts = { name: b.name, name_ar: b.name_ar, site: b.site, tagline: b.tagline, summary: b.summary, audience: b.audience, voice: b.voice, selling_points: b.selling_points, features: (b.features ?? []).map((f: any) => ({ name: f.name, detail: f.detail, benefit: f.benefit })) };
  const content = [
    `THE BRAND'S FACTS\n${JSON.stringify(facts)}`,
    `SCREENS (the brand's real captured screens; use their ids in screen scenes)\n${JSON.stringify(o.screens)}`,
    `IMAGES (the brand's real photos; use their file paths exactly)\n${JSON.stringify(o.images)}`,
    `THE BRIEF\n- Goal: ${o.brief.objective}\n- What the client wants: ${o.brief.description || "(none)"}${o.brief.offer ? `\n- Offer / CTA: ${o.brief.offer}` : ""}\n- Language and dialect of the vo and all titles: ${o.language}\n- Length: ~${o.length} s`,
    `THE VOICE — MotionGX's own launch ad (Egyptian): how the lines sound (rhythm, breaths, colloquial wording):\n${EXAMPLE_ADS.join("\n")}`,
    `A STORY — the structure only (a made-up brand; its screen id is a placeholder):\n${JSON.stringify(EXAMPLE_STORY)}`,
  ].join("\n\n");
  const r = await callTool({ ledger: o.ledger, step: "director", model: o.model, system, content, tool, maxTokens: 14000 });
  const unwrap = (v: any) => { if (typeof v !== "string") return v; try { return JSON.parse(v); } catch { return v; } };
  const scenes = (unwrap(r.scenes) as Scene[]).filter((s) => s && s.vo?.trim() && s.title).map((s) => ({ ...s, data: unwrap(s.data) ?? undefined }));
  if (!scenes.length) throw new Error("the script came back empty");
  // what a scene names must exist: a screen id, image files; else it falls back to what still works
  const ids = new Set(o.screens.map((s) => s.id)), files = new Set(o.images.map((i) => i.file));
  for (const s of scenes) {
    const d = s.data ?? {};
    if (s.type === "screen" && !ids.has(d.screen)) { o.log(`! script: screen scene "${s.title}" names no captured screen (${d.screen}) — shown as a title only`); s.type = "title"; }
    if (s.type === "gallery") { d.images = (d.images ?? []).filter((im: any) => files.has(im?.file)); if (d.images.length < 2) { o.log(`! script: gallery "${s.title}" has no real images — shown as a title only`); s.type = "title"; } }
    if (d.image && !files.has(d.image)) delete d.image;
    for (const m of [...(d.messages ?? []), ...(d.items ?? [])]) if (m?.image && !files.has(m.image)) delete m.image;
  }
  o.log(`✓ script: "${r.idea}" · ${r.mood} · ${scenes.length} scenes (${scenes.map((s) => s.type).join(" → ")})`);
  await dialectPass(scenes, { country: o.brief.country, language: o.language, ledger: o.ledger, model: o.model, log: o.log });
  await fitLength(scenes, { length: o.length, language: o.language, ledger: o.ledger, model: o.model, log: o.log });
  return { idea: String(r.idea ?? ""), mood: r.mood, hook_art: r.hook_art, scenes, share_copy: String(r.share_copy ?? "") };
}
