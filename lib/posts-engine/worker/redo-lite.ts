// EXPERIMENT — fewer redos (POSTS_REDO=serious). Off by default: without the switch every failed check is redone and the
// writer's scenes go to the image model as they are, as before. With it:
// - a slide is redone only for what breaks the brand — wrong words, a wrong or missing logo, or a drawn device where the
//   real phone / laptop must go; a smaller flaw (stray text the check is unsure of, an unwanted device, odd
//   perspective) is kept;
// - a slide with no real screen is told plainly to draw no device (the writer sometimes describes "a laptop showing the
//   product" without picking a screen, and the check then fails the image every time).
// To remove: delete this file and the `worthRedo` line in visual.ts and the `noDeviceScene` line in write.ts.

export type CheckFlags = { words: boolean; logo: boolean; extraText: boolean; ui: boolean; impossible: boolean };

export const redoLite = () => process.env.POSTS_REDO === "serious";

/** whether a failed check is worth another image call */
export function worthRedo(flags: CheckFlags, needsRealDevice: boolean) {
  if (!redoLite()) return true;
  return !flags.words || !flags.logo || (needsRealDevice && flags.ui);
}

/** a slide without a real screen: its scene must not ask for a device */
export function noDeviceScene(scene: string | undefined, refs: string[]) {
  if (!redoLite() || refs.length || !scene) return scene;
  return `${scene} No laptop, phone, tablet, monitor, screen or app interface anywhere in the image — show the idea without a device.`;
}
