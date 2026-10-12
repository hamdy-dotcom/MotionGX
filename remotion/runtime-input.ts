import type { MotionInput } from "@motiongx/primitives";
import type { GlyphRun } from "./vector-types";
import type { IllustrationMeta } from "../lib/motion/illustration-core";

/** What the runtime receives for one video (palette and font stacks are derived inside). */
export type RuntimeInput = Omit<MotionInput, "palette" | "fonts"> & {
  /** brand fonts + an optional expressive Arabic display face picked by the director (≤ 2 Arabic families) */
  fontFamilies: { arabic: string | null; latin: string | null; display?: string | null };
  /** text shaped into vector glyph paths in Node (HarfBuzz), keyed by runKey(family, weight, px, text) */
  glyphs?: Record<string, GlyphRun>;
  /** inlined assets the spec uses: "icon:lucide:rocket", "emoji:fire", "doodle:running", "flag:sa", "geo:SAU", "texture:clay_plaster" */
  assets?: Record<string, string>;
  /** hero illustrations by name (their compiled code is in props.custom under "illo:<name>") */
  illustrations?: Record<string, IllustrationMeta>;
};
