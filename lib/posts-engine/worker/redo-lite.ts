// EXPERIMENT — fewer redos (POSTS_REDO=serious). Off by default: without the switch every failed check is redone, as
// before. With it, a slide is redone only for what breaks the brand — wrong words, a wrong or missing logo, or a drawn
// device where the real phone / laptop must go; a smaller flaw (stray text the check is unsure of, a made-up interface,
// odd perspective) is kept.
// To remove: delete this file and the `worthRedo` line in visual.ts.

export type CheckFlags = { words: boolean; logo: boolean; extraText: boolean; ui: boolean; impossible: boolean };

export const redoLite = () => process.env.POSTS_REDO === "serious";

/** whether a failed check is worth another image call */
export function worthRedo(flags: CheckFlags, needsRealDevice: boolean) {
  if (!redoLite()) return true;
  return !flags.words || !flags.logo || (needsRealDevice && flags.ui);
}
