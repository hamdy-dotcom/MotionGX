// Timing: easings, springs, stagger, and hooks driven by the video's energy map.
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useMotion } from "./context";
import type { EnergyMap, HitKind } from "./types";

export const ease = {
  /** fast start, long settle — editorial */
  expoOut: Easing.bezier(0.16, 1, 0.3, 1),
  expoIn: Easing.bezier(0.7, 0, 0.84, 0),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  backOut: Easing.bezier(0.34, 1.56, 0.64, 1),
  linear: (t: number) => t,
};

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (t: number, a: number, b: number) => a + (b - a) * t;
/** Map v from [a,b] to [c,d], clamped. */
export const remap = (v: number, a: number, b: number, c: number, d: number) =>
  interpolate(v, [a, b], [c, d], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** 0→1 between two frames, eased and clamped. */
export const progress = (frame: number, start: number, duration: number, easing: (t: number) => number = ease.expoOut) =>
  interpolate(frame, [start, start + Math.max(1, duration)], [0, 1], { easing, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

export const springs = {
  /** tight, no overshoot */
  snap: { damping: 200, stiffness: 120, mass: 0.6 },
  /** punchy with overshoot — for hits */
  punch: { damping: 11, stiffness: 160, mass: 0.7 },
  /** soft and floaty */
  soft: { damping: 26, stiffness: 60, mass: 1 },
  /** elastic bounce */
  bouncy: { damping: 7, stiffness: 120, mass: 0.8 },
};

/** Spring value from `delay` frames, 0→1 (may overshoot with punch/bouncy). */
export function springAt(frame: number, fps: number, delay = 0, config: Partial<typeof springs.snap> = springs.snap) {
  return spring({ frame: frame - delay, fps, config });
}

/** Start frame for item i of a staggered group. */
export const stagger = (i: number, step: number, start = 0) => start + i * step;

/** Seconds → frames at the video's fps. */
export function useSeconds() {
  const { fps } = useVideoConfig();
  return (s: number) => Math.round(s * fps);
}

/** The musical grid at the current frame. `pulse` is 1 on each beat and decays before the next. */
export function useBeat() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { energy } = useMotion();
  const fpb = (fps * 60) / energy.bpm;
  const beat = frame / fpb;
  const phase = beat - Math.floor(beat);
  return {
    framesPerBeat: fpb,
    beat,
    beatIndex: Math.floor(beat),
    bar: Math.floor(beat / 4),
    phase,
    pulse: Math.exp(-phase * 6),
    /** frame of beat k */
    frameOf: (k: number) => Math.round(k * fpb),
  };
}

function sectionAt(map: EnergyMap, t: number) {
  return map.sections.find((s) => t >= s.start_s && t < s.end_s) ?? map.sections[map.sections.length - 1];
}

/** Current section of the energy map and a smoothed 0..1 energy level. */
export function useEnergy() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { energy } = useMotion();
  const t = frame / fps;
  const section = sectionAt(energy, t);
  const i = energy.sections.indexOf(section);
  const next = energy.sections[i + 1];
  // Ease toward the next section's energy over the last 0.5 s.
  const blend = next ? clamp((t - (section.end_s - 0.5)) / 0.5) : 0;
  const level = lerp(blend, section?.energy ?? 0.5, next?.energy ?? section?.energy ?? 0.5);
  return { t, section, level, kind: section?.kind ?? "intro", progressInSection: section ? clamp((t - section.start_s) / Math.max(0.01, section.end_s - section.start_s)) : 0 };
}

/**
 * The most recent hit (optionally of one kind) and a 0..1 `pulse` that is 1 on the hit frame and
 * decays over `decay` seconds — drive scale bumps, flashes and camera kicks from this.
 */
export function useHit(kind?: HitKind, decay = 0.35) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { energy } = useMotion();
  const t = frame / fps;
  const hits = energy.hits.filter((h) => !kind || h.kind === kind);
  const last = [...hits].reverse().find((h) => h.t <= t + 1e-6) ?? null;
  const next = hits.find((h) => h.t > t + 1e-6) ?? null;
  const since = last ? t - last.t : Infinity;
  return {
    last,
    next,
    secondsSince: since,
    framesUntilNext: next ? Math.round((next.t - t) * fps) : Infinity,
    pulse: last ? Math.exp(-since / Math.max(0.05, decay)) : 0,
    hitFrames: hits.map((h) => Math.round(h.t * fps)),
  };
}

/** Alias of useHit (a hook — call it at the top level of a component). */
export const onHit = useHit;
