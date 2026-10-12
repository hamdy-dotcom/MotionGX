// Scene kit contract shared by the app (AI output, studio) and the Remotion engine.
// Internal building blocks the AI composes — never shown to users as templates.
// Relative imports only: this file is also bundled by Remotion.
import { z } from "zod";

export const SCENE_TYPES = [
  "hook",
  "problem",
  "logo_reveal",
  "feature_list",
  "stat",
  "steps",
  "phone_mock",
  "before_after",
  "offer",
  "quote",
  "comparison",
  "chips_cloud",
  "split_image",
  "cta",
  "outro_logo",
] as const;
export type SceneType = (typeof SCENE_TYPES)[number];

export const ICONS = [
  "bolt", "truck", "chart", "shield", "globe", "cart", "star", "clock", "wallet", "sparkle",
  "phone", "users", "box", "check", "store", "megaphone", "heart", "gift", "lock", "target",
] as const;
export type IconName = (typeof ICONS)[number];

export const MUSIC_MOODS = ["energetic", "warm", "corporate", "luxury"] as const;
export type MusicMood = (typeof MUSIC_MOODS)[number];

export const PACE_BPM = { calm: 90, medium: 110, fast: 128 } as const;

const line = z.string().trim().min(1).max(48);
const short = (max: number) => z.string().trim().min(1).max(max);

export const PROPS_SCHEMAS = {
  hook: z.object({ emphasis_line: z.number().int().min(0).max(2).optional() }),
  problem: z.object({ pains: z.array(short(40)).min(2).max(3) }),
  logo_reveal: z.object({}),
  feature_list: z.object({ items: z.array(z.object({ text: short(40), icon: z.enum(ICONS) })).min(2).max(4) }),
  stat: z.object({
    value: z.number().finite().nonnegative(),
    prefix: z.string().max(6).optional(),
    suffix: z.string().max(14).optional(),
    caption: z.string().max(60).optional(),
  }),
  steps: z.object({ steps: z.array(short(34)).length(3) }),
  phone_mock: z.object({ screen_title: short(30), items: z.array(short(32)).min(2).max(4), button: short(26) }),
  before_after: z.object({
    before_label: short(18),
    before: z.array(short(34)).min(1).max(3),
    after_label: short(18),
    after: z.array(short(34)).min(1).max(3),
  }),
  offer: z.object({ value: short(14), badge: z.string().max(28).optional() }),
  quote: z.object({ author: z.string().max(40).optional() }),
  comparison: z.object({ us_label: short(22), them_label: short(22), rows: z.array(short(32)).min(2).max(4) }),
  chips_cloud: z.object({ chips: z.array(short(22)).min(4).max(8) }),
  split_image: z.object({ caption: z.string().max(48).optional() }),
  cta: z.object({ url: short(60), button: short(26) }),
  outro_logo: z.object({ url: z.string().max(60).optional() }),
} satisfies Record<SceneType, z.ZodType>;

const sceneBase = {
  id: z.string(),
  title: z.string().trim().min(1).max(60),
  duration_beats: z.number().int().min(2).max(40),
  lines: z.array(line).min(1).max(3),
  voiceover_line: z.string().trim().max(400).nullable(),
};

export const kitSceneSchema = z.discriminatedUnion("type", [
  z.object({ ...sceneBase, type: z.literal("hook"), props: PROPS_SCHEMAS.hook }),
  z.object({ ...sceneBase, type: z.literal("problem"), props: PROPS_SCHEMAS.problem }),
  z.object({ ...sceneBase, type: z.literal("logo_reveal"), props: PROPS_SCHEMAS.logo_reveal }),
  z.object({ ...sceneBase, type: z.literal("feature_list"), props: PROPS_SCHEMAS.feature_list }),
  z.object({ ...sceneBase, type: z.literal("stat"), props: PROPS_SCHEMAS.stat }),
  z.object({ ...sceneBase, type: z.literal("steps"), props: PROPS_SCHEMAS.steps }),
  z.object({ ...sceneBase, type: z.literal("phone_mock"), props: PROPS_SCHEMAS.phone_mock }),
  z.object({ ...sceneBase, type: z.literal("before_after"), props: PROPS_SCHEMAS.before_after }),
  z.object({ ...sceneBase, type: z.literal("offer"), props: PROPS_SCHEMAS.offer }),
  z.object({ ...sceneBase, type: z.literal("quote"), props: PROPS_SCHEMAS.quote }),
  z.object({ ...sceneBase, type: z.literal("comparison"), props: PROPS_SCHEMAS.comparison }),
  z.object({ ...sceneBase, type: z.literal("chips_cloud"), props: PROPS_SCHEMAS.chips_cloud }),
  z.object({ ...sceneBase, type: z.literal("split_image"), props: PROPS_SCHEMAS.split_image }),
  z.object({ ...sceneBase, type: z.literal("cta"), props: PROPS_SCHEMAS.cta }),
  z.object({ ...sceneBase, type: z.literal("outro_logo"), props: PROPS_SCHEMAS.outro_logo }),
]);
export type KitScene = z.infer<typeof kitSceneSchema>;
export type KitSceneOf<T extends SceneType> = Extract<KitScene, { type: T }>;

export type VideoFormat = "9:16" | "1:1" | "16:9";

export type BrandColorInput = { hex: string; role?: string };

export type VideoBrand = {
  name: string;
  logoUrl: string | null;
  /** Put the logo on a light plate (dark logo on a dark canvas). */
  logoPlate: boolean;
  colors: BrandColorInput[];
  fonts: { arabic?: string | null; latin?: string | null };
  /** Uploaded font files (brand_assets kind=font), used when the family isn't on Google Fonts. */
  fontFiles?: { family: string; url: string }[];
  url?: string | null;
  imageUrl?: string | null;
};

export type BrandVideoProps = {
  brand: VideoBrand;
  scenes: KitScene[];
  format: VideoFormat;
  fps: number;
  lengthS: number;
  lang: "ar" | "en";
  music: { url: string; bpm: number } | null;
  /** Used for the beat grid when music is off. */
  bpm: number;
  voiceover?: { url: string } | null;
};

export function dimensionsFor(format: VideoFormat) {
  // 1080 px on the short side.
  if (format === "9:16") return { width: 1080, height: 1920 };
  if (format === "1:1") return { width: 1080, height: 1080 };
  return { width: 1920, height: 1080 };
}
