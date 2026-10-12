// MotionSpec: the language the AI writes instead of code. A spec places any element anywhere, combines
// any behaviors and invents its own layout; the engine (remotion/SpecVideo + remotion/behaviors)
// renders it. Coordinates: x/y are % of canvas width/height (element centre); w/h/size are % of canvas
// WIDTH (so w = h is square in every format). Times are seconds, "b<n>" for beat n (0-based), or a shot
// anchor: "s<n>" = start of shot n, "s<n>e" = its end.
import { z } from "zod";
import { EASE, type EaseName } from "@/remotion/behaviors/core";
import { COUNTRIES, DOODLES, EMOJI, PEEP_BODIES, PEEP_FACES, PEEP_HEADS, TEXTURES } from "@/remotion/asset-names";

export const COLOR_ROLES = ["bg", "bg2", "surface", "surface2", "border", "text", "textMuted", "primary", "onPrimary", "accent", "gradA", "gradB", "glowA", "glowB", "white", "black"] as const;
export type ColorRole = (typeof COLOR_ROLES)[number];
const role = z.enum(COLOR_ROLES);

/** seconds; "b12" = beat 12; "s3" = start of shot 3, "s3e" = end of shot 3 */
export const time = z.union([z.number().min(0), z.string().regex(/^(b\d+(\.\d+)?|s\d+e?)$/)]);
export type SpecTime = z.infer<typeof time>;

const ease = z.enum(Object.keys(EASE) as [EaseName, ...EaseName[]]);

export const behaviorRef = z
  .object({
    /** behavior name from the catalogue */
    fx: z.string(),
    at: time.optional(),
    dur: z.number().positive().max(30).optional(),
    /** for groups: delay between children */
    stagger: z.number().min(0).max(2).optional(),
    /** stagger order across children (Motion stagger maths): start | center | end | edges | random */
    order: z.enum(["start", "center", "end", "edges", "random"]).optional(),
  })
  .catchall(z.unknown());
export type BehaviorRef = z.infer<typeof behaviorRef>;

const keyframe = z.object({
  t: time,
  x: z.number().optional(),
  y: z.number().optional(),
  scale: z.number().optional(),
  rot: z.number().optional(),
  opacity: z.number().min(0).max(1).optional(),
  ease: ease.optional(),
});

const base = {
  id: z.string().min(1).max(40),
  parent: z.string().optional(),
  z: z.number().int().min(-50).max(100).optional(),
  // default centre: routes (points) and full-frame particles don't need a position
  x: z.number().min(-50).max(150).default(50),
  y: z.number().min(-50).max(150).default(50),
  w: z.number().min(0).max(300).optional(),
  h: z.number().min(0).max(300).optional(),
  rot: z.number().optional(),
  opacity: z.number().min(0).max(1).optional(),
  /** when the element exists (default: whole video) */
  in: time.optional(),
  out: time.optional(),
  /** parallax depth for camera moves: 0 = fixed, 1 = moves with camera, >1 = foreground */
  depth: z.number().min(0).max(3).optional(),
  fx: z.array(behaviorRef).max(12).optional(),
  keys: z.array(keyframe).max(24).optional(),
  /** stop-motion: this element's motion is sampled at `steps` frames per second (e.g. 8 or 12 = "on twos") */
  steps: z.number().int().min(2).max(24).optional(),
};

const textEl = z.object({
  ...base,
  type: z.literal("text"),
  /** literal text … */
  text: z.string().max(120).optional(),
  /** … or a script line: "<beatId>:<lineIndex>", e.g. "b2:0" (preferred: edits to the script flow through) */
  line: z.string().regex(/^[\w-]+:\d+$/).optional(),
  /** display = the director's expressive Arabic display face (headlines only) */
  font: z.enum(["head", "body", "latin", "display"]).default("head"),
  weight: z.number().int().min(100).max(900).default(700),
  /** font size, % of canvas width */
  size: z.number().min(1).max(40),
  color: role.default("text"),
  /** gradient fill using gradA→gradB */
  gradient: z.boolean().optional(),
  align: z.enum(["center", "start", "end"]).default("center"),
  /** stroke outline only */
  outline: role.optional(),
  /** highlight the n-th word (0-based) in this role */
  highlight: z.object({ word: z.number().int().min(0), color: role }).optional(),
});

const shapeEl = z.object({
  ...base,
  type: z.literal("shape"),
  shape: z.enum(["rect", "circle", "polygon", "star", "blob", "ring", "pill", "triangle", "line", "cursor"]),
  fill: role.optional(),
  /** linear gradient fill gradA→gradB */
  gradient: z.boolean().optional(),
  stroke: role.optional(),
  strokeW: z.number().min(0).max(10).optional(),
  /** corner radius (rect), % of the shape's smaller side */
  radius: z.number().min(0).max(50).optional(),
  sides: z.number().int().min(3).max(12).optional(),
  points: z.number().int().min(4).max(16).optional(),
  alpha: z.number().min(0).max(1).optional(),
  glow: role.optional(),
  /** morph target for the "morph" behavior */
  to: z.enum(["rect", "circle", "polygon", "star", "blob", "triangle", "cursor"]).optional(),
  /** hand-drawn look (Rough.js): sketchy outline + hachure fill */
  sketch: z.boolean().optional(),
});

const pathEl = z.object({
  ...base,
  type: z.literal("svgPath"),
  /** SVG path in a 0–100 × 0–100 box mapped onto the element's w × h */
  d: z.string().min(3).max(2000),
  stroke: role.default("primary"),
  strokeW: z.number().min(0.1).max(10).default(1),
  fill: role.optional(),
  cap: z.enum(["round", "butt", "square"]).optional(),
  /** morph target path (same 0–100 box) for path-morph */
  to: z.string().min(3).max(2000).optional(),
});

const routeEl = z.object({
  ...base,
  type: z.literal("route"),
  /** polyline points in canvas % (x of width, y of height); drawn smooth */
  points: z.array(z.tuple([z.number(), z.number()])).min(2).max(40),
  stroke: role.default("primary"),
  strokeW: z.number().min(0.1).max(10).default(1),
  dashed: z.boolean().optional(),
  smooth: z.boolean().optional(),
  /** dots at each station */
  nodes: role.optional(),
});

const imageEl = z.object({
  ...base,
  type: z.literal("image"),
  /** "logo" or "image:<n>" (brand images from the site) */
  src: z.string().regex(/^(logo|image:\d+)$/),
  fit: z.enum(["contain", "cover"]).default("contain"),
  /** wrap in a device */
  frame: z.enum(["phone", "browser", "laptop", "tablet"]).optional(),
  radius: z.number().min(0).max(50).optional(),
});

const particlesEl = z.object({
  ...base,
  type: z.literal("particles"),
  kind: z.enum(["dots", "squares", "sparks", "confetti", "rain", "bubbles", "stars", "dust"]),
  count: z.number().int().min(1).max(160),
  colors: z.array(role).min(1).max(4),
  speed: z.number().min(0).max(5).optional(),
  /** degrees; 90 = falling */
  dir: z.number().optional(),
  size: z.number().min(0.1).max(6).optional(),
});

const groupEl = z.object({
  ...base,
  type: z.literal("group"),
  /** clip children to this shape (a mask) */
  clip: z.enum(["rect", "circle", "pill"]).optional(),
  fill: role.optional(),
  radius: z.number().min(0).max(50).optional(),
  stroke: role.optional(),
  shadow: z.boolean().optional(),
});

const counterEl = z.object({
  ...base,
  type: z.literal("counter"),
  from: z.number().default(0),
  to: z.number(),
  decimals: z.number().int().min(0).max(3).default(0),
  prefix: z.string().max(12).optional(),
  suffix: z.string().max(16).optional(),
  font: z.enum(["head", "body", "latin"]).default("latin"),
  weight: z.number().int().min(100).max(900).default(800),
  size: z.number().min(1).max(40),
  color: role.default("text"),
});

const customEl = z.object({
  ...base,
  type: z.literal("custom"),
  /** escape hatch: a TSX component (≤150 lines) for an effect the catalogue can't express … */
  tsx: z.string().max(12000).optional(),
  /** … or a promoted effect from the library, by name */
  use: z.string().max(80).optional(),
  note: z.string().max(200).optional(),
});

const iconEl = z.object({
  ...base,
  type: z.literal("icon"),
  /** lucide (stroke) or phosphor (filled weights) icon name, e.g. "rocket", "shield-check" */
  set: z.enum(["lucide", "phosphor"]).default("lucide"),
  name: z.string().min(1).max(60),
  color: role.default("text"),
});

const emojiEl = z.object({ ...base, type: z.literal("emoji"), name: z.enum(EMOJI) });

const characterEl = z.object({
  ...base,
  type: z.literal("character"),
  /** an Open Doodles scene … */
  doodle: z.enum(DOODLES).optional(),
  /** … or an Open Peeps person, mixed and matched */
  peep: z.object({ body: z.enum(PEEP_BODIES), head: z.enum(PEEP_HEADS), face: z.enum(PEEP_FACES) }).optional(),
  color: role.default("text"),
  accent: role.optional(),
});

const mapEl = z.object({
  ...base,
  type: z.literal("map"),
  /** ISO 3166-1 alpha-3 codes of Arab countries to draw (fitted to the box) */
  countries: z.array(z.enum(COUNTRIES)).min(1).max(22),
  highlight: z.array(z.enum(COUNTRIES)).max(22).optional(),
  fill: role.default("surface2"),
  highlightFill: role.default("primary"),
  stroke: role.default("border"),
  /** a route drawn between country centroids, in order (draw with stroke-draw / path-draw) */
  route: z.array(z.enum(COUNTRIES)).max(12).optional(),
});

const flagEl = z.object({ ...base, type: z.literal("flag"), code: z.string().regex(/^[a-z]{2}$/), radius: z.number().min(0).max(50).optional() });

const chartEl = z.object({
  ...base,
  type: z.literal("chart"),
  kind: z.enum(["bar", "line", "area", "donut"]),
  /** relative values (shapes only — never printed as numbers) */
  values: z.array(z.number().min(0)).min(2).max(12),
  colors: z.array(role).min(1).max(4).default(["primary"]),
});

/** a hero illustration (Phase 3F): drawn for this story or reused from the library, in the video's style */
const illustrationEl = z.object({
  ...base,
  type: z.literal("illustration"),
  /** the illustration's name from the plan, e.g. "warehouse_shelves" */
  name: z.string().regex(/^[a-z0-9_]{2,40}$/),
  /** starting value (0..1) of each part; default 0 */
  init: z.record(z.string(), z.number().min(0).max(1)).optional(),
  /** part animations: the part tweens from its current value to `to` over `dur` seconds from `at` */
  anim: z.array(z.object({ part: z.string(), at: time, dur: z.number().positive().max(10).default(0.6), to: z.number().min(0).max(1), ease: ease.optional() })).max(16).optional(),
});

export const elementSchema = z.discriminatedUnion("type", [textEl, shapeEl, pathEl, routeEl, imageEl, particlesEl, groupEl, counterEl, customEl, iconEl, emojiEl, characterEl, mapEl, flagEl, chartEl, illustrationEl]);
export type SpecElement = z.infer<typeof elementSchema>;
export type ElementOf<T extends SpecElement["type"]> = Extract<SpecElement, { type: T }>;

export const bgLayer = z.object({
  kind: z.enum(["solid", "gradient", "radial", "grid", "dots", "noise", "stripes", "stars", "pattern", "texture", "dunes", "waves"]),
  /** texture name for kind "texture" (paper / plaster / grain, CC0) */
  texture: z.enum(TEXTURES).optional(),
  colors: z.array(role).min(1).max(3),
  angle: z.number().optional(),
  alpha: z.number().min(0).max(1).optional(),
  /** drift speed for animated layers */
  drift: z.number().min(0).max(5).optional(),
  scale: z.number().min(0.2).max(5).optional(),
  in: time.optional(),
  out: time.optional(),
});

export const cutSchema = z.object({
  t: time,
  kind: z.enum(["hard", "flash", "whip", "wipe", "zoom", "glitch", "iris", "blinds", "pixels", "layers", "diagonal", "slice"]),
  dir: z.enum(["left", "right", "up", "down"]).optional(),
  color: role.optional(),
});

const cameraKey = z.object({ t: time, zoom: z.number().min(0.3).max(4).optional(), x: z.number().optional(), y: z.number().optional(), rot: z.number().optional(), rx: z.number().min(-40).max(40).optional(), ry: z.number().min(-40).max(40).optional(), ease: ease.optional() });

export const specSchema = z.object({
  version: z.literal(1).default(1),
  /** tone: the palette is derived for a light (editorial off-white) or dark canvas — set from the director's plan */
  canvas: z.object({ tone: z.enum(["light", "dark"]).optional(), bg: z.array(bgLayer).min(1).max(6) }),
  elements: z.array(elementSchema).min(3).max(140),
  camera: z
    .object({
      keys: z.array(cameraKey).max(30).optional(),
      /** shake on energy-map hits (0–1) */
      shake: z.number().min(0).max(1).optional(),
      /** gentle noise drift (0–1) */
      drift: z.number().min(0).max(1).optional(),
    })
    .optional(),
  cuts: z.array(cutSchema).max(30).optional(),
  /** shutter motion blur strength 0–1 (default 0.5): fast movers smear along their direction of travel */
  motionBlur: z.number().min(0).max(1).optional(),
  /** one stroke width for every icon in the video (lucide px at 24; phosphor weight is derived) */
  iconStroke: z.number().min(1).max(3).optional(),
  /** a seamless loop: the last frame must match the first (checked by the validator) */
  loop: z.boolean().optional(),
});
export type MotionSpec = z.infer<typeof specSchema>;
/** what the AI (or a person) writes: defaults may be omitted */
export type MotionSpecInput = z.input<typeof specSchema>;

export type SoundEvent = { t: number; kind: "whoosh" | "pop" | "click" | "riser" | "impact" | "subdrop" };

/** Resolves a spec time ("b12", "s3", "s3e" or seconds) to seconds. */
export function toSeconds(t: SpecTime | undefined, bpm: number, fallback = 0, shots?: Map<string, { start: number; end: number }>): number {
  if (t === undefined) return fallback;
  if (typeof t === "number") return t;
  if (t.startsWith("b")) return Number(t.slice(1)) * (60 / bpm);
  const end = t.endsWith("e");
  const shot = shots?.get(end ? t.slice(0, -1) : t);
  return shot ? (end ? shot.end : shot.start) : fallback;
}
