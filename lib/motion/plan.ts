import "server-only";
// Director + script in ONE call (Sonnet, low effort, prompt-cached system): concept, motion language,
// shots with their on-screen lines, music mood and the energy map. ~1k output tokens. The novelty
// check runs on the English summary; if it's too close to recent work, only the concept is redone.
import { z } from "zod";
import { callTool, SONNET } from "@/lib/ai/claude";
import { AiError } from "@/lib/ai/usage";
import type { EnergyMap, ScriptBeat } from "@motiongx/primitives";
import { BEHAVIOR_NAMES } from "@/remotion/behaviors";
import { DISPLAY_FONTS } from "@/remotion/asset-names";
import { cosine, embed } from "./embed";
import { ILLUSTRATION_STYLES, STYLE_GUIDE, type IllustrationAsset, type IllustrationStyle } from "./illustration-core";
import { ARABIC_CREATOR_WEIGHTS, selectRefs, type MotionRef, type MotionStore, type TreatmentRecord } from "./store";
import type { MotionBrief } from "./types";

export const PACE_BPM = { calm: 90, medium: 110, fast: 128 } as const;
/** cosine of English treatment summaries above this = "already done" (same idea ≈ 0.86, different ≈ 0.2) */
export const NOVELTY_THRESHOLD = 0.7;

const sectionKind = z.enum(["intro", "build", "drop", "breakdown", "outro"]);
const hitKind = z.enum(["drop", "impact", "reveal", "logo", "cta"]);
const MOODS = ["energetic", "warm", "corporate", "luxury"] as const;

export const planSchema = z.object({
  title: z.string().trim().min(2).max(60).optional(),
  concept: z.string().min(10).transform((x) => x.trim().slice(0, 300)),
  summary_en: z.string().min(10).transform((x) => x.trim().slice(0, 300)),
  motion_language: z.string().min(3).transform((x) => x.trim().slice(0, 60)),
  music_mood: z.enum(MOODS),
  /** expressive Arabic display face for headlines (Arabic videos), or "none" to keep the brand font */
  display_font: z.enum([...DISPLAY_FONTS, "none"]).optional(),
  /** the visual metaphor broken down for the spec writer */
  metaphor: z
    .object({
      object: z.string().min(2).transform((x) => x.trim().slice(0, 160)),
      stands_for: z.string().min(2).transform((x) => x.trim().slice(0, 160)),
      transformation: z.string().min(2).transform((x) => x.trim().slice(0, 240)),
    })
    .optional(),
  /** ONE illustration style for every hero illustration in this video, chosen to fit the brand */
  illustration_style: z.enum(ILLUSTRATION_STYLES),
  /** the 3–6 hero illustrations the story needs (drawn for it, or reused from the library in this style) */
  illustrations: z
    .array(
      z.object({
        name: z.string().transform((x) => x.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40)).pipe(z.string().min(2)),
        shows: z.string().min(3).transform((x) => x.trim().slice(0, 200)),
        parts: z.array(z.object({ name: z.string().transform((x) => x.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 24)).pipe(z.string().min(1)), does: z.string().min(2).transform((x) => x.trim().slice(0, 120)) })).min(1).max(3),
        directional: z.boolean(),
      }),
    )
    .min(3)
    .max(6)
    .transform((list) => list.filter((x, i) => list.findIndex((y) => y.name === x.name) === i)),
  shots: z
    .array(
      z.object({
        id: z.string(),
        start_s: z.number().min(0),
        end_s: z.number().positive(),
        visual: z.string().min(3).max(160),
        /** what the metaphor object concretely does in this shot */
        hero: z.string().max(200).optional(),
        lines: z.array(z.string().trim().min(1).max(48)).min(1).max(3),
      }),
    )
    .min(3)
    .max(10),
  energy: z.object({
    sections: z.array(z.object({ kind: sectionKind, start_s: z.number().min(0), end_s: z.number().positive(), energy: z.number().min(0).max(1) })).min(3).max(10),
    // optional: derived from the sections when omitted (cheaper than a retry)
    hits: z.array(z.object({ t: z.number().min(0), kind: hitKind, understand: z.string().max(200).optional() })).max(16).optional(),
  }),
});
export type PlanRaw = z.infer<typeof planSchema>;
export type Plan = Omit<PlanRaw, "energy" | "title"> & {
  title: string;
  energy: EnergyMap;
  beats: ScriptBeat[];
  /** the illustrations this video actually shows (after library lookup + drawing; set by generateVideo) */
  illustration_assets?: IllustrationAsset[];
};

// strict: the API enforces this structure, so a malformed plan (and its costly retry) can't happen
const obj = (properties: Record<string, unknown>) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
const tool = {
  name: "save_plan",
  description: "Save the creative plan: treatment, shots with on-screen copy, music mood and energy map.",
  input_schema: {
    ...obj({
      title: { type: "string", description: "2–6 word video title in the video language" },
      concept: { type: "string", description: "The big idea in ONE sentence" },
      summary_en: { type: "string", description: "ONE English sentence: the concept + how it moves (used to keep every video different)" },
      motion_language: { type: "string", description: "2–5 English words, e.g. 'kinetic grid', 'liquid morphs'" },
      music_mood: { type: "string", enum: [...MOODS] },
      display_font: { type: "string", enum: [...DISPLAY_FONTS, "none"], description: "Arabic videos: ONE expressive Google display face for headlines that matches the tone (Lalezar/Rakkas/Blaka bold & loud, Reem Kufi/El Messiri elegant, Aref Ruqaa/Amiri calligraphic, Marhey/Lemonada playful, Changa/Alexandria/Cairo/Tajawal/Almarai clean); body copy keeps the brand font. English videos: \"none\"" },
      illustration_style: { type: "string", enum: [...ILLUSTRATION_STYLES], description: "ONE illustration style for every hero illustration in this video, chosen to fit the brand's tone and audience" },
      illustrations: {
        type: "array",
        description: "3–6 hero illustrations the story needs (drawn bespoke as animated SVG, in illustration_style)",
        items: obj({
          name: { type: "string", description: "snake_case English noun phrase, e.g. warehouse_shelves, phone_sales_chart, parcel_box, delivery_truck, support_headset" },
          shows: { type: "string", description: "≤ 20 words: exactly what it depicts (no text inside it)" },
          parts: { type: "array", description: "1–3 animatable parts", items: obj({ name: { type: "string", description: "snake_case prop, e.g. doors, bars, lid" }, does: { type: "string", description: "what moving 0 → 1 does: doors open, bars grow, lid closes" } }) },
          directional: { type: "boolean", description: "true if it faces a direction (vehicle, arrow, hand)" },
        }),
      },
      metaphor: obj({
        object: { type: "string", description: "the ONE concrete object that stands for the idea — usually one of your hero illustrations (e.g. 'a parcel box', 'a delivery route with 4 stations', 'a phone with a sales chart')" },
        stands_for: { type: "string", description: "what that object means for this brand, in plain words" },
        transformation: { type: "string", description: "how the object changes from the first shot to the logo (its arc)" },
      }),
      shots: {
        type: "array",
        description: "6–9 contiguous shots from 0 to the video length",
        items: obj({
          id: { type: "string", description: "s1, s2, …" },
          start_s: { type: "number" },
          end_s: { type: "number" },
          visual: { type: "string", description: "≤ 10 words: what is on screen and how it moves" },
          hero: { type: "string", description: "≤ 20 words: which illustration is the hero of this shot and which part moves on its hit" },
          lines: { type: "array", items: { type: "string" }, description: "1–3 on-screen lines, ≤ 7 words each, in the video language" },
        }),
      },
      energy: obj({
        sections: { type: "array", description: "3–8 contiguous sections", items: obj({ kind: { type: "string", enum: sectionKind.options }, start_s: { type: "number" }, end_s: { type: "number" }, energy: { type: "number" } }) },
        hits: { type: "array", items: obj({ t: { type: "number" }, kind: { type: "string", enum: hitKind.options }, understand: { type: "string", description: "≤ 12 words: what the viewer understands at this hit" } }) },
      }),
    }),
  } as { type: "object"; properties: Record<string, unknown>; required: string[]; additionalProperties: false },
};

const DIALECT_GUIDE: Record<string, string> = {
  eg: "Egyptian Arabic (عامية مصرية) in Arabic script — the way a Cairo brand talks on TikTok: دلوقتي، عايز، إزاي، كده. Not MSA.",
  sa: "Saudi Arabic (لهجة سعودية بيضاء) in Arabic script: الحين، وش، أبغى، مرة، زين، كذا. Not MSA, not Egyptian.",
  gulf: "Gulf/Emirati Arabic in Arabic script: الحين، شو، أبا، وايد، زين. Not MSA, not Egyptian.",
  lev: "Levantine Arabic in Arabic script: هلق، شو، بدك، كتير، منيح. Not MSA, not Egyptian.",
  msa: "Modern Standard Arabic (فصحى) — contemporary and punchy, never stiff.",
  en: "English — natural, punchy marketing copy.",
};

// Stable and long (≥ 1024 tokens) so it's prompt-cached across videos.
const SYSTEM = `You are an award-winning motion-design creative director AND a native copywriter for Arab-market and global brands. In one pass you design a bespoke motion-graphics promo for one brand and write its on-screen copy. Never templates: every film has its own concept, motion language, typographic idea and rhythm, so no two look alike.

WHAT THE ENGINE CAN BUILD (design only from these; there is no stock footage or 3D modelling):
- Elements: kinetic text (Arabic/English, brand fonts), shapes (rect, circle, pill, ring, star, polygon, triangle, organic blob, line, mouse cursor) that can morph into each other, hand-drawn SVG paths that draw on and morph into other paths, routes/journeys with station dots that draw and that elements can travel along, the brand logo (on a plate when needed), brand images from the site (a long page can scroll inside a device frame), device frames (phone, browser, laptop, tablet), particle fields (dots, squares, sparks, confetti, rain, bubbles, stars, dust), groups that act as masks or 3D carousels, live counters, liquid-filling vessels, line icons (lucide/phosphor), emoji, illustrated people (Open Peeps, incl. hijab/turban) and doodles, maps of the Arab world with routes between countries, flags, bar/line/donut charts, hand-drawn sketch shapes (Rough.js), Arabic vector text (calligraphy stroke reveal, text↔particles, continuous kashida, word-to-word morph), backgrounds (solid, gradient, radial glow, grid, dots, stripes, noise, stars, geometric star pattern, paper/plaster texture, dunes, waves).
- Motion vocabulary (behaviors): ${BEHAVIOR_NAMES.join(", ")}.
- Real 3D: cards flip/swing/tilt with perspective, extruded type, 3D carousels, a camera that tilts/orbits (rx/ry). Shutter motion blur, echo trails, RGB split, wave distortion, stop-motion stepping.
- Camera: push/pull zoom, pans, rotation, 3D tilt/orbit, drift, shake on hits, parallax depth. Cuts between shots: hard, flash, whip, wipe, zoom punch, glitch, iris, blinds, pixels, layered colour wipe, diagonal, slices.

MOTION PATTERN VOCABULARY (name the pattern in each shot's visual; these are what the engine does best):
1 shared-element morph — one object travels + resizes into the next layout (shared-morph)
2 clip / masked reveal, wipe — (mask-wipe, editorial-wipe, masked-rise, clip-morph, iris-in, scan-reveal)
3 pinned sequence — a hero stays fixed while content changes around it
4 parallax depth — layers at different depths under camera moves (depth, camera keys)
5 staggered / cascading entrance — (group stagger with order center/edges/random, panel-stack, depth-assemble)
6 morph — shape or SVG path into another, incl. symbol → brand mark (morph, path-morph)
7 overshoot / spring — (spring-pop, spring-in, spring-move, liquid-move)
8 spring follow / cursor — a pointer moves, presses and drags UI (cursor shape, cursor-move, press)
9 split text — per-word (Arabic) / per-letter (Latin) staggers (split-stagger, per-word, blur-words, slam-words, roll-text, tracking-in)
10 text scramble / decode — (scramble)
11 marquee / ticker — a looping strip of words or logos (move-to on a long group, echo)
12 page wipe / curtain / blinds / iris — cut kinds layers, blinds, pixels, iris, diagonal
13 lightbox zoom — a thumbnail grows into the full frame (shared-morph, clip-morph, camera push)
14 layout / reorder (FLIP) — items slide to new slots (spring-move on each)
15 tilt card / perspective — (tilt-3d, flip-3d, swing-in, carousel, extrude)
16 blur / depth transition — (blur-words, focus-rack, puff-in, blur-out, motion blur)

HERO ILLUSTRATIONS (the heart of the film — this is what makes it look hand-made):
- Pick ONE illustration_style for the whole video that fits the brand (never the default out of habit — a playful snack brand ≠ a bank ≠ a dev tool): ${ILLUSTRATION_STYLES.map((s) => `${s} (${STYLE_GUIDE[s as IllustrationStyle].split(":")[0]})`).join("; ")}.
- List the 3–6 concrete objects/scenes the story needs as illustrations (a warehouse, a phone with a sales chart, a parcel, a delivery truck, a support headset…), each with 1–3 animatable parts (doors open, bars grow, lid closes, needle turns, route draws). No text inside them — on-screen copy stays in the shots.
- Tell the story THROUGH them: a continuous visual thread from shot to shot, one idea per shot, and the hero object changes state on each hit (the box closes on the drop, the truck leaves on the impact, the chart grows on the reveal).

CREATIVE RULES
- Make it unmistakably about THIS brand: its product, audience and tone. A viewer should feel it was hand-made for them.
- Pick ONE strong visual metaphor and ONE motion language and commit to them across every shot.
- Make the metaphor buildable and legible: name the ONE object (metaphor.object, usually a hero illustration), what it stands for, and its arc; give every shot a concrete HERO action (which illustration, which part moves), and say what the viewer understands at each hit. A viewer must be able to state the idea in one sentence.
- Use only the brand palette (by role) and brand fonts. The logo is used as-is, never redrawn.
- Music: sections intro / build / drop / breakdown / outro, and hits (drop, impact, reveal, logo, cta). A build leads into every drop; a breakdown comes right before the logo reveal; the CTA lands on the final, biggest drop; the video ends cleanly on its last frame.
- Shots are contiguous from 0 to the video length; sections too. Hits sit on whole beats, after 0 and at least 2 beats before the end. Include exactly one "logo" hit and one "cta" hit (CTA after the logo, in the last third).
- Nothing on screen is static for more than 0.6 s.

COPY RULES
- Keep brand and product names EXACTLY as written on the site; never transliterate part of a word.
- Write naturally in the requested dialect, like a native copywriter — never a literal translation.
- The first shot creates tension or curiosity within 2 seconds.
- One idea per shot; 1–3 lines per shot, each ≤ 7 words (Arabic lines short). Short shots get fewer words.
- Only numbers from the brand facts — never invent stats, prices, customers or offers.
- End with a clear CTA that uses the real URL. No emoji. Don't mix Arabic and Latin letters inside a word.

Be concise — every field is short (6–9 shots; shot visuals ≤ 10 words; concept one sentence); no prose outside the tool call. Respond only by calling save_plan.`;

const EMOJI = /\p{Extended_Pictographic}/u;
const AR = /[؀-ۿ]/;
const LA = /[A-Za-z]/;
const latinDigits = (s: string) => s.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

function snapPlan(raw: PlanRaw, lengthS: number, bpm: number): Plan {
  const beat = 60 / bpm;
  const r2 = (n: number) => Math.round(n * 1000) / 1000;
  const snap = (t: number) => r2(Math.min(lengthS, Math.max(0, Math.round(t / beat) * beat)));
  const shots = [...raw.shots].sort((a, b) => a.start_s - b.start_s);
  // shot ids are s1, s2… ("b<n>" means a beat in spec times)
  const fixedShots = shots.map((s, i) => ({ ...s, id: `s${i + 1}`, start_s: i === 0 ? 0 : snap(s.start_s), end_s: i === shots.length - 1 ? lengthS : snap(shots[i + 1].start_s) }));
  const secs = [...raw.energy.sections].sort((a, b) => a.start_s - b.start_s);
  const fixedSecs = secs.map((s, i) => ({ name: s.kind, ...s, start_s: i === 0 ? 0 : snap(s.start_s), end_s: i === secs.length - 1 ? lengthS : snap(secs[i + 1].start_s) }));
  const PRIORITY: Record<string, number> = { cta: 5, logo: 4, drop: 3, impact: 2, reveal: 1 };
  const latest = snap(lengthS - 2 * beat);
  // omitted hits → derive: impact on each drop, logo at the end of the last breakdown (or 70 %), CTA on the final drop
  const derived = (): { t: number; kind: (typeof hitKind.options)[number] }[] => {
    const drops = fixedSecs.filter((s) => s.kind === "drop");
    const lastDrop = drops.at(-1);
    const bd = fixedSecs.filter((s) => s.kind === "breakdown").at(-1);
    const logoT = bd ? bd.end_s : snap(lengthS * 0.7);
    const ctaT = lastDrop && lastDrop.start_s > logoT ? lastDrop.start_s : snap(Math.min(lengthS - 2 * beat, logoT + 4 * beat));
    return [...drops.filter((d) => d !== lastDrop).map((d) => ({ t: d.start_s, kind: "drop" as const })), { t: logoT, kind: "logo" as const }, { t: ctaT, kind: "cta" as const }];
  };
  const hits = (raw.energy.hits?.length ? raw.energy.hits : derived())
    .map((h) => ({ ...h, t: Math.min(latest, snap(h.t)) }))
    .filter((h) => h.t > 0)
    .sort((a, b) => a.t - b.t || PRIORITY[b.kind] - PRIORITY[a.kind])
    .reduce<{ t: number; kind: (typeof hitKind.options)[number] }[]>((acc, h) => {
      const prev = acc[acc.length - 1];
      if (prev && h.t - prev.t <= beat * 0.9) {
        if (PRIORITY[h.kind] > PRIORITY[prev.kind]) acc[acc.length - 1] = h;
        return acc;
      }
      acc.push(h);
      return acc;
    }, []);
  const beats: ScriptBeat[] = fixedShots.map((s) => ({ id: s.id, role: s.visual.slice(0, 60), start_s: s.start_s, end_s: s.end_s, lines: s.lines, voiceover_line: null }));
  const title = raw.title?.trim() || fixedShots[0]?.lines[0] || "Video";
  return { ...raw, title, shots: fixedShots, beats, energy: { bpm, length_s: lengthS, sections: fixedSecs, hits } };
}

export function planProblems(p: Plan, b: MotionBrief): string[] {
  const out: string[] = [];
  const kinds = p.energy.hits.map((h) => h.kind);
  if (!kinds.includes("logo")) out.push('energy.hits needs one "logo" hit');
  if (!kinds.includes("cta")) out.push('energy.hits needs one "cta" hit');
  const logo = p.energy.hits.find((h) => h.kind === "logo");
  const cta = p.energy.hits.find((h) => h.kind === "cta");
  if (logo && cta && cta.t <= logo.t) out.push("the cta hit must come after the logo hit");
  if (cta && cta.t < b.lengthS * 0.6) out.push("the cta hit must be in the last third");
  if (!p.energy.sections.some((s) => s.kind === "drop")) out.push("add at least one drop section");
  if (p.shots.some((s) => s.end_s - s.start_s < 0.8)) out.push("every shot needs ≥ 0.8 s");
  const allowed = new Set([...b.facts.numbers.map((n) => String(Math.round(n.value))), ...(latinDigits(b.brief).match(/\d+/g) ?? [])]);
  let ar = 0;
  let la = 0;
  for (const s of p.shots) {
    for (const line of s.lines) {
      if (EMOJI.test(line)) out.push(`${s.id}: no emoji ("${line}")`);
      if (line.split(/\s+/).length > 8) out.push(`${s.id}: "${line}" is longer than 7 words`);
      for (const w of line.split(/[\s/·,،.!؟?]+/)) if (AR.test(w) && LA.test(w)) out.push(`${s.id}: "${w}" mixes Arabic and Latin letters`);
      for (const n of latinDigits(line).match(/\d+/g) ?? []) if (n.length > 1 && !allowed.has(n)) out.push(`${s.id}: the number ${n} is not in the brand facts`);
      ar += (line.match(/[؀-ۿ]/g) ?? []).length;
      la += (line.match(/[A-Za-z]/g) ?? []).length;
    }
  }
  if (b.dialect === "en" && ar > 0) out.push("the video is in English — no Arabic text");
  if (b.dialect !== "en" && ar < la) out.push("the video is in Arabic — write the copy in Arabic (brand names / URLs may stay Latin)");
  return [...new Set(out)];
}

/**
 * A reference as the AI sees it: its full prompt (internal only — never shown in the UI), trimmed to
 * ~1,500 chars, plus the MotionGX behaviors that implement its techniques.
 */
export function refBrief(r: MotionRef, i: number, max = 1500) {
  const card = (r.card ?? {}) as { motion_language?: string; techniques?: string[]; behaviors?: string[] };
  const text = r.prompt_text.length > max ? `${r.prompt_text.slice(0, max - 1)}…` : r.prompt_text;
  const how = card.behaviors?.length ? ` [engine: ${card.behaviors.join(", ")}]` : card.techniques?.length ? ` [techniques: ${card.techniques.join(", ")}]` : "";
  return `(${i + 1}) ${card.motion_language ?? r.title}: ${text}${how}`;
}

function userPrompt(b: MotionBrief, bpm: number, refs: MotionRef[], avoid: string[]) {
  return `Brand: ${b.brand.name} (${b.brand.url}) · tone: ${b.brand.tone || "—"} · tagline: ${b.brand.tagline || "—"}
Palette roles available: bg, bg2, surface, text, textMuted, primary, accent, gradient (brand colors ${b.brand.colors.map((c) => c.hex).join(", ")}) · logo: ${b.brand.hasLogo ? "yes" : "no (wordmark)"} · brand images: ${b.brand.imageCount}
Facts (the ONLY facts you may state): what it does: ${b.facts.what_it_does} | audience: ${b.facts.audience} | features: ${b.facts.key_features.join(" | ") || "—"} | numbers: ${b.facts.numbers.map((n) => `${n.prefix}${n.value}${n.suffix} ${n.label}`).join(" | ") || "none"} | offers: ${b.facts.offers.join(" | ") || "none"} | CTA URL: ${b.facts.cta_url || b.brand.url}
Video: goal ${b.goal}; ${b.lengthS}s; ${b.format} (${b.width}×${b.height}); ${bpm} BPM (beat = ${(60 / bpm).toFixed(3)}s); copy language: ${DIALECT_GUIDE[b.dialect]}
Brief: """${b.brief}"""
Inspiration (borrow techniques, never copy):
${refs.map((r, i) => refBrief(r, i)).join("\n")}
Recent concepts — do NOT repeat these ideas or motion languages: ${avoid.length ? avoid.slice(0, 20).join(" | ") : "none"}`;
}

// lengths are clamped rather than rejected: a retry for an over-long sentence costs a whole Sonnet call
const clampStr = (min: number, max: number) => z.string().min(min).transform((s) => s.trim().slice(0, max));
const conceptSchema = z.object({ concept: clampStr(10, 300), summary_en: clampStr(10, 300), motion_language: clampStr(3, 60), illustration_style: z.enum(ILLUSTRATION_STYLES) });
const conceptTool = {
  name: "save_concept",
  description: "Save a new concept for the same plan.",
  input_schema: { type: "object" as const, properties: { concept: { type: "string", description: "ONE sentence (≤ 300 chars)" }, summary_en: { type: "string", description: "English, ≤ 300 chars" }, motion_language: { type: "string", description: "2–6 words (≤ 60 chars)" }, illustration_style: { type: "string", enum: [...ILLUSTRATION_STYLES] } }, required: ["concept", "summary_en", "motion_language", "illustration_style"] },
};

/** what the novelty check embeds: the illustration style is part of the look, so it's part of the idea */
export const noveltyText = (p: Pick<Plan, "motion_language" | "summary_en" | "illustration_style">) => `${p.illustration_style} illustrations. ${p.motion_language}. ${p.summary_en}`;
/** motion language as saved in the treatment history (with the style, so the avoid list shows it) */
export const treatmentLanguage = (p: Pick<Plan, "motion_language" | "illustration_style">) => `${p.motion_language.trim()} · ${p.illustration_style}`;

export type PlanResult = { plan: Plan; refs: MotionRef[]; embedding: number[]; similarity: number; conceptRedos: number };

/** One Sonnet call → plan; novelty on the English summary; concept-only redo when it's a repeat. */
export async function makePlan(b: MotionBrief, store: MotionStore, opts: { avoid?: string[] } = {}): Promise<PlanResult> {
  const bpm = PACE_BPM[b.pace];
  const [allRefs, recentWs, recentGlobal] = await Promise.all([store.refs(), store.recentTreatments(b.workspaceId, 10), store.recentGlobal(50)]);
  const usedRefs = new Set(recentWs.slice(0, 5).flatMap((t) => t.ref_ids));
  const query = await embed(`${b.brand.name}. ${b.brand.tone}. ${b.facts.what_it_does}. ${b.goal}. ${b.brief}`);
  const refs = selectRefs(allRefs, query, 4, usedRefs, 0.65, { goal: b.goal, creatorWeights: b.dialect === "en" ? undefined : ARABIC_CREATOR_WEIGHTS });
  const history: TreatmentRecord[] = [...recentWs, ...recentGlobal.filter((g) => !recentWs.some((w) => w.created_at === g.created_at && w.concept === g.concept))];
  const avoid = [...new Set([...history.map((h) => `${h.motion_language}: ${h.concept.slice(0, 90)}`), ...(opts.avoid ?? [])])];

  const res = await callTool({
    workspaceId: b.workspaceId,
    kind: "director",
    model: SONNET,
    strict: true,
    effort: "low",
    cache: true,
    system: SYSTEM,
    prompt: userPrompt(b, bpm, refs, avoid),
    tool,
    schema: planSchema,
    check: (raw) => {
      const p = planProblems(snapPlan(raw, b.lengthS, bpm), b);
      return p.length ? p.join("; ") : null;
    },
    maxTokens: 3500,
    retries: 1,
  });
  if (!res.value) throw new AiError("ai_invalid", res.problem);
  let plan = snapPlan(res.value, b.lengthS, bpm);

  const novelty = async (p: Plan) => {
    const e = await embed(noveltyText(p));
    const top = history.map((h) => ({ h, sim: cosine(e, h.embedding) })).sort((x, y) => y.sim - x.sim)[0];
    const same = history.find((h) => h.motion_language.trim().toLowerCase() === treatmentLanguage(p).toLowerCase());
    return { e, sim: top?.sim ?? 0, repeat: (top ? top.sim >= NOVELTY_THRESHOLD : false) || !!same, near: same ?? top?.h };
  };
  let n = await novelty(plan);
  let redos = 0;
  const why = (x: typeof n) => `"${plan.motion_language}" sim ${x.sim.toFixed(2)} vs "${x.near?.motion_language}: ${x.near?.concept.slice(0, 80)}"`;
  if (n.repeat) console.warn(`[novelty] repeat: ${why(n)}`);
  while (n.repeat && redos < 3) {
    redos++;
    const c = await callTool({
      workspaceId: b.workspaceId,
      kind: "director",
      model: SONNET,
      strict: false,
      effort: "low",
      cache: true,
      system: SYSTEM,
      prompt: `${userPrompt(b, bpm, refs, avoid)}\n\nYour plan "${plan.motion_language}: ${plan.summary_en}" is too close to an existing video ("${n.near?.motion_language}"). Keep the shots, copy, illustrations and energy map, but give a clearly different concept, motion language and (if the style is what repeats) illustration style. Respond only by calling save_concept.`,
      tool: conceptTool,
      schema: conceptSchema,
      maxTokens: 800,
      retries: 1,
    });
    if (!c.value) break;
    plan = { ...plan, ...c.value };
    avoid.push(`${plan.motion_language}: ${plan.concept.slice(0, 90)}`);
    n = await novelty(plan);
    if (n.repeat) console.warn(`[novelty] redo ${redos} still a repeat: ${why(n)}`);
  }
  if (n.repeat) throw new AiError("ai_invalid", "could not find a novel concept");
  return { plan, refs, embedding: n.e, similarity: n.sim, conceptRedos: redos };
}
