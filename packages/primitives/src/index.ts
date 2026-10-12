// @motiongx/primitives — low-level building blocks for generated compositions.
// Tools only: no scenes, no layouts. Every video invents its own shapes, compositions and transitions.
export * from "./types";
export { MotionProvider, useMotion, useUnit } from "./context";
export {
  allowedColors,
  buildTokens as buildPalette,
  contrast,
  ensureContrast,
  gradient,
  gradientText,
  hexToRgb,
  luminance,
  mix,
  pickTextColor,
  rgba,
  rotateHue,
  shade,
  type BrandColorInput,
  type BrandTokens as Palette,
} from "./palette";
export { ease, clamp, lerp, remap, progress, springs, springAt, stagger, useSeconds, useBeat, useEnergy, useHit, onHit } from "./timing";
export { Text, CountUp, isArabic, dirOf, splitWords, fitFontSize, formatNumber, type Reveal, type TextProps } from "./text";
export {
  noise2D,
  noise3D,
  noise01,
  random,
  particle,
  Particles,
  morphPath,
  StrokeDraw,
  pathLength,
  clip,
  blurIn,
  Camera,
  ParallaxScene,
  ParallaxLayer,
  useCanvas,
} from "./generative";
export { BrandLogo, BrandImage, DeviceFrame } from "./media";
export { ThreeStage } from "./three";
export { CameraMotionBlur, Trail } from "@remotion/motion-blur";
