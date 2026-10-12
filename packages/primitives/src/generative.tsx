// Generative helpers: noise, particles, path morph, stroke draw, masks, blur, camera, parallax.
// Low-level tools — every composition invents its own shapes and layouts with them.
import React from "react";
import { random, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D, noise3D } from "@remotion/noise";
import { evolvePath, getLength, interpolatePath } from "@remotion/paths";
import { useMotion } from "./context";
import { useHit } from "./timing";

export { noise2D, noise3D, random };

/** Smooth 0..1 noise at (x, y, t). */
export const noise01 = (seed: string, x: number, y: number, t = 0) => (noise3D(seed, x, y, t) + 1) / 2;

/** Deterministic particles: position/size/alpha of particle i at a frame. */
export function particle(i: number, frame: number, opts: { seed?: string; width: number; height: number; speed?: number; drift?: number } ) {
  const seed = opts.seed ?? "p";
  const x0 = random(`${seed}-x-${i}`) * opts.width;
  const y0 = random(`${seed}-y-${i}`) * opts.height;
  const speed = (0.3 + random(`${seed}-v-${i}`)) * (opts.speed ?? 1);
  const drift = opts.drift ?? 20;
  return {
    x: x0 + Math.sin(frame / 40 + i) * drift,
    y: (((y0 - frame * speed) % opts.height) + opts.height) % opts.height,
    size: 2 + random(`${seed}-s-${i}`) * 6,
    alpha: 0.15 + random(`${seed}-a-${i}`) * 0.5,
  };
}

/** A layer of drifting particles (count, colors and motion are up to the composition). */
export const Particles: React.FC<{ count: number; colors: string[]; seed?: string; speed?: number; drift?: number; style?: React.CSSProperties }> = ({
  count,
  colors,
  seed = "p",
  speed,
  drift,
  style,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", ...style }}>
      {Array.from({ length: count }, (_, i) => {
        const p = particle(i, frame, { seed, width, height, speed, drift });
        return <div key={i} style={{ position: "absolute", left: p.x, top: p.y, width: p.size, height: p.size, borderRadius: "50%", background: colors[i % colors.length], opacity: p.alpha }} />;
      })}
    </div>
  );
};

/** Morph between two SVG path strings (same command structure works best). */
export const morphPath = (from: string, to: string, t: number) => interpolatePath(Math.min(1, Math.max(0, t)), from, to);

/** An SVG path that draws itself as `progress` goes 0→1. */
export const StrokeDraw: React.FC<{
  d: string;
  progress: number;
  stroke: string;
  strokeWidth: number;
  viewBox: string;
  width: number | string;
  height: number | string;
  linecap?: "round" | "butt" | "square";
  style?: React.CSSProperties;
}> = ({ d, progress: p, stroke, strokeWidth, viewBox, width, height, linecap = "round", style }) => {
  const evolved = evolvePath(Math.min(1, Math.max(0, p)), d);
  return (
    <svg viewBox={viewBox} width={width} height={height} style={{ overflow: "visible", ...style }}>
      <path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={linecap} strokeDasharray={evolved.strokeDasharray} strokeDashoffset={evolved.strokeDashoffset} />
    </svg>
  );
};

export const pathLength = getLength;

/** clip-path helpers (progress 0 = hidden, 1 = fully visible). */
export const clip = {
  circle: (p: number, cx = "50%", cy = "50%") => `circle(${Math.max(0, p) * 150}% at ${cx} ${cy})`,
  /** wipe from an edge: "left" | "right" | "top" | "bottom" */
  wipe: (p: number, from: "left" | "right" | "top" | "bottom" = "left") => {
    const h = (1 - Math.min(1, Math.max(0, p))) * 100;
    return from === "left" ? `inset(0 ${h}% 0 0)` : from === "right" ? `inset(0 0 0 ${h}%)` : from === "top" ? `inset(0 0 ${h}% 0)` : `inset(${h}% 0 0 0)`;
  },
  /** diagonal slice wipe */
  diagonal: (p: number) => {
    const x = Math.min(1, Math.max(0, p)) * 200;
    return `polygon(0 0, ${x}% 0, ${x - 100}% 100%, 0 100%)`;
  },
  polygon: (points: [number, number][]) => `polygon(${points.map(([x, y]) => `${x}% ${y}%`).join(", ")})`,
};

/** Blur that clears as t goes 0→1 (for focus pulls / reveals). */
export const blurIn = (t: number, max = 24) => `blur(${(1 - Math.min(1, Math.max(0, t))) * max}px)`;

/**
 * Camera: zoom/pan/rotate the whole frame, with optional shake that kicks on energy-map hits.
 * Wrap a scene in it; animate `zoom`/`x`/`y` from your own timing.
 */
export const Camera: React.FC<{ zoom?: number; x?: number; y?: number; rotate?: number; shakeOnHits?: number; children: React.ReactNode }> = ({
  zoom = 1,
  x = 0,
  y = 0,
  rotate = 0,
  shakeOnHits = 0,
  children,
}) => {
  const frame = useCurrentFrame();
  const hit = useHit(undefined, 0.25);
  const k = shakeOnHits * hit.pulse;
  const sx = k * noise2D("cam-x", frame / 2, 0) * 30;
  const sy = k * noise2D("cam-y", 0, frame / 2) * 30;
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translate(${x + sx}px, ${y + sy}px) scale(${zoom}) rotate(${rotate + k * noise2D("cam-r", frame, 1) * 1.5}deg)`, transformOrigin: "50% 50%" }}>
      {children}
    </div>
  );
};

const ParallaxCtx = React.createContext<{ x: number; y: number }>({ x: 0, y: 0 });

/** 2.5D parallax: layers move by camera × depth (0 = fixed background, 1 = moves with the camera). */
export const ParallaxScene: React.FC<{ cameraX: number; cameraY: number; children: React.ReactNode }> = ({ cameraX, cameraY, children }) => (
  <ParallaxCtx.Provider value={{ x: cameraX, y: cameraY }}>
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>{children}</div>
  </ParallaxCtx.Provider>
);

export const ParallaxLayer: React.FC<{ depth: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ depth, style, children }) => {
  const cam = React.useContext(ParallaxCtx);
  return <div style={{ position: "absolute", inset: 0, transform: `translate(${-cam.x * depth}px, ${-cam.y * depth}px) scale(${1 + depth * 0.04})`, ...style }}>{children}</div>;
};

/** Canvas helpers. */
export function useCanvas() {
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const { dir } = useMotion();
  return { width, height, fps, durationInFrames, cx: width / 2, cy: height / 2, dir };
}
