// The motion library's cards: what the director reads to choose a move, a look, a scene pattern or a structure.
// Every item in the library has one (moves/<category>/<id>.js calls ML.define with these fields). See
// docs/motion-library/MAP.md and PLAN.md.
import { z } from "zod";

export const CATEGORIES = [
  "text-in", // 1 text entrances
  "text-emphasis", // 2 text emphasis & exits
  "kinetic", // 3 kinetic typography layouts
  "element", // 4 element entrances / exits
  "transition", // 5 scene transitions
  "camera", // 6 camera
  "ui", // 7 UI interactions
  "device", // 8 devices & screens
  "data", // 9 numbers & data
  "accent", // 10 shapes & graphic accents
  "background", // 11 backgrounds & atmosphere
  "mask", // 12 masks & reveals
  "photo", // 13 image & photo moves
  "character", // 14 characters & icons
  "rhythm", // 15 rhythm & beat
] as const;
export type Category = (typeof CATEGORIES)[number];

/** what a move can be applied to */
export const TARGETS = ["headline", "line", "word", "number", "label", "image", "logo", "screen", "card", "list", "chart", "shape", "scene", "stage", "cursor"] as const;

/** what a move communicates — the director searches by these */
export const SAYS = [
  "reveal", "arrival", "proof", "speed", "calm", "luxury", "urgency", "playful", "tech", "precision", "growth", "money",
  "simplicity", "choice", "change", "before-after", "connection", "flow", "focus", "celebration", "problem", "relief",
  "trust", "energy", "story", "time", "scale", "list", "step", "result", "brand", "transition", "ambient",
] as const;

const range = z.tuple([z.number(), z.number()]);
/** one setting of a move: a number range, a choice, a flag or a free text */
export const Param = z.union([
  z.object({ type: z.literal("number"), range, default: z.number(), unit: z.string().optional() }),
  z.object({ type: z.literal("choice"), options: z.array(z.string()).min(2), default: z.string() }),
  z.object({ type: z.literal("bool"), default: z.boolean() }),
  z.object({ type: z.literal("text"), default: z.string().optional() }),
]);

export const Source = z.object({
  from: z.string(), // "own" | "MengTo/Skills:<skill>" | "product-film-skill:<file>" | "prompt-motion:<slug>" (reference only)
  license: z.enum(["own", "MIT", "Apache-2.0", "BSD", "ISC", "CC0", "reference"]),
  note: z.string().optional(),
});

export const MoveCard = z.object({
  id: z.string().regex(/^[a-z0-9-]+\.[a-z0-9-]+$/), // "<category>.<name>"
  category: z.enum(CATEGORIES),
  name: z.string(),
  does: z.string(), // one sentence: what the viewer sees
  says: z.array(z.enum(SAYS)).min(1),
  energy: z.number().int().min(1).max(5),
  targets: z.array(z.enum(TARGETS)).min(1),
  duration: range, // seconds it needs on screen [min, max]
  params: z.record(z.string(), Param).default({}),
  pairs: z.array(z.string()).default([]), // move ids it combines well with
  avoid: z.array(z.enum(SAYS)).default([]), // tones it does not fit
  rtl: z.boolean(), // safe with Arabic (joined letters never split)
  shapes: z.array(z.enum(["9:16", "16:9", "1:1", "4:5"])).min(1),
  sfx: z.string().optional(), // the sound cue it usually lands with (sound/kit.json)
  source: Source,
});
export type MoveCard = z.infer<typeof MoveCard>;

export const LookCard = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  feel: z.string(), // one sentence
  mode: z.enum(["light", "dark"]),
  fits: z.array(z.string()), // industries / brand kinds it suits
  composition: z.enum(["top", "side", "bottom", "center", "full-bleed", "split"]),
  motion: z.enum(["rise", "fade", "snap", "wipe", "blur", "spring", "slide", "scale"]),
  energy: z.number().int().min(1).max(5),
  source: Source,
});
export type LookCard = z.infer<typeof LookCard>;

export const PatternCard = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  when: z.string(), // what a scene says when it uses this
  slots: z.array(z.string()), // the named places moves fill (headline, pic, list, screen…)
  shapes: z.array(z.enum(["9:16", "16:9", "1:1", "4:5"])).min(1),
  source: Source,
});
export type PatternCard = z.infer<typeof PatternCard>;

export const StructureCard = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  goals: z.array(z.enum(["acquire", "launch", "offer", "awareness", "recruit", "announce", "product_update", "explainer"])),
  parts: z.array(z.object({ part: z.string(), share: range, job: z.string() })), // share of the length, [min, max]
  source: Source,
});
export type StructureCard = z.infer<typeof StructureCard>;

/** The director's composition: per scene, a pattern, a look override if any, and named moves on words. */
export const Composition = z.object({
  look: z.string(),
  structure: z.string(),
  scenes: z.array(
    z.object({
      pattern: z.string(),
      look: z.string().optional(),
      moves: z.array(
        z.object({
          move: z.string(),
          target: z.string(), // a slot of the pattern, or "stage"
          at: z.string(), // "start" | "end" | "word:<spoken word>" | "<seconds into the scene>"
          params: z.record(z.string(), z.unknown()).default({}),
        }),
      ),
    }),
  ),
});
export type Composition = z.infer<typeof Composition>;
