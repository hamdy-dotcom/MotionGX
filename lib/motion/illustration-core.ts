// Hero illustrations (Phase 3F): small TSX components Sonnet draws for a story (a warehouse, a phone
// with a chart, a parcel), reused from the `illustrations` library when one exists in the video's style.
// Pure module: shared by the renderer (SpecVideo), the isolated check worker and the server pipeline.
//
// CONTRACT — a default-exported function component, ≤ 150 lines, SVG only, drawn in a 200 × 200 box:
//   export default function ParcelBox({ p, c, sw, uid }: { p: Record<string, number>; c: Record<string, string>; sw: number; uid: string }) { … return <g>…</g>; }
//   p   = animatable parts, each 0..1 (p.lid ?? 0) — the ONLY source of motion: no hooks, timers or clocks
//   c   = colour roles (c.primary, c.surface, …) — never hex
//   sw  = the one stroke width every outline uses
//   uid = prefix for <defs> ids (gradients / filters), so two instances never collide
// No text inside (labels live in the spec). Direction-dependent drawings (a truck facing forward) are
// flagged `directional` and mirrored by the renderer in RTL videos.
import { EASE, type EaseName } from "@/remotion/behaviors/core";

export const ILLUSTRATION_STYLES = ["line", "flat", "isometric", "paper-cut", "clay-3d", "hand-drawn", "neon-outline", "duotone"] as const;
export type IllustrationStyle = (typeof ILLUSTRATION_STYLES)[number];

/** how each style is drawn in plain SVG (sent to the illustrator; also the director's menu) */
export const STYLE_GUIDE: Record<IllustrationStyle, string> = {
  line: "clean monoline line art: outlines only (stroke c.primary or c.text, width sw, round caps/joins), at most one accent fill (c.accent) on the key detail; generous negative space",
  flat: "flat vector: solid filled shapes (c.primary, c.accent, c.surface, c.surface2), no outlines or gradients, simple geometric forms, one subtle darker shadow shape using opacity",
  isometric: "isometric 30° projection: every box has a top, left and right face in three tones of the same role (fill + fillOpacity 1 / 0.75 / 0.5), thin sw outlines in c.border, crisp edges",
  "paper-cut": "layered paper-cut: 2–4 stacked flat layers, each offset by a soft shadow copy (c.black, opacity 0.18, shifted 3px down-right), rounded organic edges, no outlines",
  "clay-3d": "soft 3D clay: rounded chunky forms, each filled with a radialGradient from a light highlight (c.white mixed via stop-opacity) to the role colour, a soft contact shadow ellipse (c.black, opacity 0.15) underneath",
  "hand-drawn": "hand-drawn ink: slightly wobbly paths (no perfect circles or straight rules — add small curve deviations), stroke sw in c.text, loose hatch strokes for shading, one c.accent highlight",
  "neon-outline": "neon tubes: outlines only in c.accent / c.primary with a glow (a <filter> with feGaussianBlur stdDeviation 3 merged under the sharp stroke), no fills, rounded caps, dark-background friendly",
  duotone: "duotone: exactly two roles (c.primary and c.accent) plus c.surface for negative space, bold silhouettes, halftone-free, one overlapping shape in the second tone",
};

/** default stroke width per style (200 × 200 box) */
export const STYLE_STROKE: Record<IllustrationStyle, number> = { line: 3.5, flat: 2.5, isometric: 2, "paper-cut": 2.5, "clay-3d": 2.5, "hand-drawn": 3.5, "neon-outline": 4, duotone: 3 };

/** what the plan asks for: one hero illustration and its animatable parts */
export type IllustrationNeed = {
  /** snake_case, e.g. "warehouse_shelves" */
  name: string;
  /** what it must show, concretely */
  shows: string;
  /** 1–3 animatable parts: prop name + what moving 0 → 1 does */
  parts: { name: string; does: string }[];
  /** faces a direction (vehicles, arrows, hands): mirrored in RTL videos */
  directional: boolean;
};

/** a compiled illustration ready to render */
export type ReadyIllustration = IllustrationNeed & {
  style: IllustrationStyle;
  tsx: string;
  js: string;
  hash: string;
  /** "library" = reused at zero AI cost; "fresh" = drawn for this video */
  source: "library" | "fresh";
  libraryId?: string | null;
};

/** what a saved plan keeps per illustration (the compiled js lives in the version's custom_js as "illo:<name>") */
export type IllustrationAsset = Omit<ReadyIllustration, "js">;

/** what the renderer needs per illustration (RuntimeInput.illustrations) */
export type IllustrationMeta = { directional: boolean; parts: string[]; sw: number };

/** an illustration element's part animation */
export type PartAnim = { part: string; at: number; dur: number; to: number; ease?: EaseName };

/** part values at time t: each part starts at init (default 0) and tweens through its anims in time order */
export function partValues(parts: string[], init: Record<string, number> | undefined, anims: PartAnim[], t: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const name of parts) {
    let v = Math.min(1, Math.max(0, init?.[name] ?? 0));
    for (const a of anims.filter((x) => x.part === name).sort((x, y) => x.at - y.at)) {
      if (t <= a.at) break;
      const k = Math.min(1, (t - a.at) / Math.max(0.01, a.dur));
      const e = EASE[a.ease ?? "out"] ?? EASE.out;
      v = v + (Math.min(1, Math.max(0, a.to)) - v) * e(k);
    }
    out[name] = v;
  }
  return out;
}

/** snake_case → readable words (embedding text) */
export const illustrationText = (n: Pick<IllustrationNeed, "name" | "shows">) => `${n.name.replace(/_/g, " ")}. ${n.shows}`;
