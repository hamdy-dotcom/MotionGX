// Shared types + helpers for behavior definitions (index.ts = original library, presets.ts = Phase 3D).
import { z } from "zod";
import { EASE, type BState, type EaseName } from "./core";

export type BehaviorKind = "enter" | "exit" | "loop" | "emphasis" | "morph" | "physics" | "generative" | "data" | "camera";

export type BCtx = {
  t: number;
  start: number;
  dur: number;
  /** clamp01((t - start) / dur) */
  p: number;
  /** seconds since start (may be negative) */
  local: number;
  w: number;
  h: number;
  /** element box in px */
  bw: number;
  bh: number;
  /** seconds per beat */
  beat: number;
  hits: { t: number; kind: string }[];
  seed: number;
  params: Record<string, unknown>;
  /** child index / count when a group staggers its children */
  i: number;
  n: number;
  /** element is Arabic text */
  arabic: boolean;
};

export type Behavior = {
  kind: BehaviorKind;
  desc: string;
  /** default duration in seconds (loops: Infinity = until the element leaves) */
  dur: number;
  params: z.ZodObject<z.ZodRawShape>;
  /** text only (splits into letters/words) */
  textOnly?: boolean;
  /** splits by letter — forbidden for Arabic (breaks letter joins) */
  perLetter?: boolean;
  apply: (c: BCtx) => Partial<BState>;
  /** hidden alias of another behavior (kept for old specs; not offered to the AI) */
  alias?: string;
};

export const easeParam = z.enum(Object.keys(EASE) as [EaseName, ...EaseName[]]);
export const DIRS = ["left", "right", "up", "down", "upLeft", "upRight", "downLeft", "downRight"] as const;
export const dir8 = z.enum(DIRS);
export type Dir = (typeof DIRS)[number];
export const P = <T extends z.ZodRawShape>(shape: T) => z.object(shape);
export const none = P({});

export const ev = (c: BCtx, name: EaseName = "expoOut") => EASE[name](c.p);
export const g = <T>(c: BCtx, k: string, d: T): T => (c.params[k] ?? d) as T;

/** unit vector for a direction ("from" side) */
export const vec = (d: Dir): [number, number] =>
  ({ left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1], upLeft: [-0.7, -0.7], upRight: [0.7, -0.7], downLeft: [-0.7, 0.7], downRight: [0.7, 0.7] })[d] as [number, number];

/** clip-path that reveals toward `d` as p goes 0→1 */
export function wipeClip(d: Dir, p: number) {
  const r = (1 - p) * 100;
  switch (d) {
    case "right":
      return `inset(0 ${r}% 0 0)`;
    case "left":
      return `inset(0 0 0 ${r}%)`;
    case "down":
      return `inset(0 0 ${r}% 0)`;
    case "up":
      return `inset(${r}% 0 0 0)`;
    case "downRight":
      return `polygon(0 0, ${p * 200}% 0, 0 ${p * 200}%)`;
    case "downLeft":
      return `polygon(100% 0, ${100 - p * 200}% 0, 100% ${p * 200}%)`;
    case "upRight":
      return `polygon(0 100%, ${p * 200}% 100%, 0 ${100 - p * 200}%)`;
    case "upLeft":
      return `polygon(100% 100%, ${100 - p * 200}% 100%, 100% ${100 - p * 200}%)`;
  }
}

/** hit pulse: 1 at a hit, decaying over `decay` s */
export function hitPulse(c: BCtx, decay = 0.35, kind?: string) {
  let v = 0;
  for (const h of c.hits) {
    if (kind && h.kind !== kind) continue;
    const d = c.t - h.t;
    if (d >= 0 && d < decay) v = Math.max(v, 1 - d / decay);
  }
  return v;
}
export const beatPhase = (c: BCtx) => ((c.t / c.beat) % 1 + 1) % 1;

export const ENTER_DUR = 0.6;

