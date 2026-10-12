import type { MotionInput } from "@motiongx/primitives";

/** What the runtime receives for one video (palette and font stacks are derived inside). */
export type RuntimeInput = Omit<MotionInput, "palette" | "fonts"> & { fontFamilies: { arabic: string | null; latin: string | null } };
