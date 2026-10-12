// Ported from motion-kit/src/lib/motion.ts. Everything is a pure function of the frame.
import { Easing, interpolate, spring } from "remotion";

// Expo-out: fast start, long settle.
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

/** 0→1 progress between two frames, eased and clamped. */
export const progress = (frame: number, start: number, duration: number, easing = easeOut) =>
  interpolate(frame, [start, start + Math.max(1, duration)], [0, 1], {
    easing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/** Tight, no-overshoot spring for UI elements. */
export const snap = (frame: number, fps: number, delay = 0) =>
  spring({ frame: frame - delay, fps, config: { damping: 200, stiffness: 120, mass: 0.6 } });

/** Springy pop with a little overshoot — for "hits" on a downbeat. */
export const punch = (frame: number, fps: number, delay = 0) =>
  spring({ frame: frame - delay, fps, config: { damping: 11, stiffness: 160, mass: 0.7 } });

export const lerp = (t: number, a: number, b: number) => a + (b - a) * t;

export const clampI = (f: number, a: number, b: number, x: number, y: number) =>
  interpolate(f, [a, b], [x, y], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** 1 on each beat, decaying to 0 before the next — makes things breathe with the music. */
export const beatPulse = (frame: number, fpb: number, sharpness = 6) => Math.exp(-((frame % fpb) / fpb) * sharpness);
