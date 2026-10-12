// Brand-parameterized building blocks, ported and generalized from motion-kit `parts.tsx`.
import React from "react";
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from "remotion";
import { fitText } from "@remotion/layout-utils";
import { rgba } from "../lib/video/tokens";
import { useVideo } from "./context";
import { beatPulse, clampI, lerp, progress, snap } from "./motion";

/** Fades/lifts a whole scene in and out (cuts never pop) and keeps it drifting so nothing sits still. */
export const Scene: React.FC<{ dur: number; noExit?: boolean; children: React.ReactNode }> = ({ dur, noExit, children }) => {
  const f = useCurrentFrame();
  const { dir, F, T } = useVideo();
  const tin = progress(f, 0, 10);
  const tout = noExit ? 0 : progress(f, dur - 10, 10);
  const drift = 1 + 0.035 * (f / Math.max(1, dur));
  return (
    <AbsoluteFill
      style={{
        opacity: tin * (1 - tout),
        transform: `translateY(${lerp(tin, 50, 0) + lerp(tout, 0, -70)}px) scale(${drift * lerp(tout, 1, 0.98)})`,
        direction: dir,
        fontFamily: F.body,
        color: T.text,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Rise + fade. */
export const Rise: React.FC<{ at: number; distance?: number; dur?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({
  at,
  distance = 40,
  dur = 20,
  style,
  children,
}) => {
  const f = useCurrentFrame();
  const { u } = useVideo();
  const t = progress(f, at, dur);
  return <div style={{ opacity: t, transform: `translateY(${lerp(t, distance * u, 0)}px)`, ...style }}>{children}</div>;
};

/** Spring pop (scale + fade). */
export const Pop: React.FC<{ at: number; from?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ at, from = 0.85, style, children }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = snap(f, fps, at);
  return <div style={{ opacity: Math.min(1, s * 1.4), transform: `scale(${lerp(s, from, 1)})`, ...style }}>{children}</div>;
};

/** Slides in from the inline-start side (right in RTL, left in LTR). */
export const Slide: React.FC<{ at: number; distance?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ at, distance = 120, style, children }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { dir, u } = useVideo();
  const s = snap(f, fps, at);
  const sign = dir === "rtl" ? 1 : -1;
  return <div style={{ opacity: s, transform: `translateX(${lerp(s, sign * distance * u, 0)}px)`, ...style }}>{children}</div>;
};

/** Mask wipe: revealed by a clip that sweeps from the inline-start side. */
export const Wipe: React.FC<{ at: number; dur?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ at, dur = 18, style, children }) => {
  const f = useCurrentFrame();
  const { dir } = useVideo();
  const t = progress(f, at, dur);
  const hidden = (1 - t) * 100;
  const clip = dir === "rtl" ? `inset(-20% 0 -20% ${hidden}%)` : `inset(-20% ${hidden}% -20% 0)`;
  return <div style={{ clipPath: clip, WebkitClipPath: clip, ...style }}>{children}</div>;
};

export type LineMode = "stagger" | "wipe" | "rise" | "pop";

/**
 * One on-screen line: never wraps (Arabic words are never broken), auto-fits to the content width,
 * and enters with the chosen style. Arabic staggers per word (per-letter splitting breaks joining),
 * Latin staggers per character.
 */
export const KLine: React.FC<{
  text: string;
  at: number;
  max: number;
  mode?: LineMode;
  grad?: boolean;
  color?: string;
  width?: number;
  weight?: number;
  align?: "start" | "center";
  font?: string;
  stagger?: number;
}> = ({ text, at, max, mode = "stagger", grad, color, width, weight = 800, align = "start", font, stagger }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { T, F, u, CW, lang } = useVideo();
  const family = font ?? F.head;
  const within = width ?? CW;
  let size = max * u;
  try {
    size = Math.min(size, fitText({ text, withinWidth: within * 0.98, fontFamily: family, fontWeight: weight }).fontSize);
  } catch {
    // measuring needs a DOM; keep the max size
  }
  const gradStyle: React.CSSProperties = grad
    ? { backgroundImage: T.gradient, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }
    : {};
  const arabic = /[؀-ۿ]/.test(text);
  const base: React.CSSProperties = {
    fontFamily: family,
    fontWeight: weight,
    fontSize: size,
    lineHeight: arabic || lang === "ar" ? 1.45 : 1.08,
    color: color ?? T.text,
    whiteSpace: "nowrap",
    display: "flex",
    justifyContent: align === "center" ? "center" : "flex-start",
    letterSpacing: arabic ? 0 : "-0.02em",
  };

  if (mode === "stagger") {
    const units = arabic ? text.split(" ") : Array.from(text);
    const step = stagger ?? (arabic ? 4 : 1.2);
    return (
      <div style={base}>
        {units.map((unit, i) => {
          const t = progress(f, at + i * step, 22);
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                overflow: "hidden",
                paddingTop: arabic ? "0.14em" : 0,
                paddingBottom: arabic ? "0.24em" : "0.1em",
                marginInlineEnd: arabic ? "0.24em" : 0,
              }}
            >
              <span style={{ display: "inline-block", whiteSpace: "pre", transform: `translateY(${lerp(t, 110, 0)}%) skewY(${lerp(t, 8, 0)}deg)`, ...gradStyle }}>
                {unit}
              </span>
            </span>
          );
        })}
      </div>
    );
  }

  const inner = <span style={{ display: "inline-block", ...gradStyle, paddingBottom: arabic ? "0.12em" : 0 }}>{text}</span>;
  if (mode === "wipe") return <Wipe at={at} style={base}>{inner}</Wipe>;
  if (mode === "pop") {
    const s = snap(f, fps, at);
    return <div style={{ ...base, opacity: Math.min(1, s * 1.4), transform: `scale(${lerp(s, 1.25, 1)})`, transformOrigin: "center" }}>{inner}</div>;
  }
  return (
    <Rise at={at} style={base}>
      {inner}
    </Rise>
  );
};

/** A stack of explicit lines (the script pre-splits them). `emphasis` gets the gradient. */
export const Lines: React.FC<{
  lines: string[];
  at: number;
  max: number;
  mode?: LineMode;
  emphasis?: number;
  align?: "start" | "center";
  gap?: number;
  width?: number;
  emphasisMode?: LineMode;
  emphasisAt?: number;
}> = ({ lines, at, max, mode = "stagger", emphasis, align = "start", gap = 0, width, emphasisMode, emphasisAt }) => {
  const { u } = useVideo();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: gap * u, alignItems: align === "center" ? "center" : "flex-start" }}>
      {lines.map((text, i) => {
        const isEm = emphasis === i;
        return (
          <KLine
            key={i}
            text={text}
            at={isEm && emphasisAt !== undefined ? emphasisAt : at + i * 8}
            max={max}
            mode={isEm && emphasisMode ? emphasisMode : mode}
            grad={isEm}
            align={align}
            width={width}
          />
        );
      })}
    </div>
  );
};

/** Pill label. */
export const Label: React.FC<{ at: number; children: React.ReactNode; num?: string }> = ({ at, children, num }) => {
  const { T, u, F } = useVideo();
  return (
    <Rise at={at} distance={20}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 14 * u,
          padding: `${14 * u}px ${34 * u}px`,
          borderRadius: 999,
          background: rgba(T.gradA, 0.14),
          border: `${2 * u}px solid ${rgba(T.gradA, 0.5)}`,
          color: T.text,
          fontSize: 42 * u,
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        {num ? <span style={{ fontFamily: F.latin, color: T.gradA, fontWeight: 700, direction: "ltr" }}>{num}</span> : null}
        <span>{children}</span>
      </div>
    </Rise>
  );
};

/** Brand card surface with a springy entrance. */
export const Card: React.FC<{ at: number; style?: React.CSSProperties; glow?: boolean; children: React.ReactNode }> = ({ at, style, glow, children }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { T, u } = useVideo();
  const s = snap(f, fps, at);
  return (
    <div
      style={{
        background: T.surface,
        border: `${1.5 * u}px solid ${glow ? rgba(T.gradA, 0.55) : T.border}`,
        borderRadius: 36 * u,
        padding: 40 * u,
        boxShadow: `0 ${40 * u}px ${120 * u}px rgba(0,0,0,0.35)${glow ? `, 0 0 ${80 * u}px ${rgba(T.gradA, 0.25)}` : ""}`,
        opacity: s,
        transform: `translateY(${lerp(s, 80 * u, 0)}px) scale(${lerp(s, 0.95, 1)})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Chip: React.FC<{ children: React.ReactNode; solid?: boolean; color?: string; style?: React.CSSProperties }> = ({ children, solid, color, style }) => {
  const { T, u } = useVideo();
  const c = color ?? T.primary;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10 * u,
        padding: `${10 * u}px ${24 * u}px`,
        borderRadius: 999,
        fontSize: 30 * u,
        fontWeight: 600,
        whiteSpace: "nowrap",
        color: solid ? T.onPrimary : T.text,
        background: solid ? c : rgba(c, 0.16),
        border: `${1.5 * u}px solid ${rgba(c, 0.5)}`,
        ...style,
      }}
    >
      {children}
    </span>
  );
};

/** Soft brand glow. Breathes on the beat. */
export const Glow: React.FC<{ size: number; opacity?: number; style?: React.CSSProperties }> = ({ size, opacity = 1, style }) => {
  const f = useCurrentFrame();
  const { T, u, fpb } = useVideo();
  const pulse = 0.85 + 0.15 * beatPulse(f, fpb, 4);
  return (
    <div
      style={{
        position: "absolute",
        width: size * u,
        height: size * u,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${rgba(T.gradA, 0.5)} 0%, ${rgba(T.gradB, 0.22)} 42%, transparent 70%)`,
        filter: `blur(${40 * u}px)`,
        opacity: opacity * pulse,
        pointerEvents: "none",
        ...style,
      }}
    />
  );
};

/** Company logo from Storage; dark logos sit on a light plate so they read on a dark canvas. */
export const Logo: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => {
  const { brand, T, u, F } = useVideo();
  const px = size * u;
  if (!brand.logoUrl) {
    return (
      <div
        style={{
          width: px,
          height: px,
          borderRadius: px * 0.26,
          background: T.gradient,
          color: T.onPrimary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: F.head,
          fontWeight: 800,
          fontSize: px * 0.5,
          ...style,
        }}
      >
        {brand.name.trim().charAt(0)}
      </div>
    );
  }
  const img = <Img src={brand.logoUrl} style={{ width: "100%", height: "100%", objectFit: "contain" }} />;
  if (!brand.logoPlate) return <div style={{ width: px, height: px, ...style }}>{img}</div>;
  return (
    <div
      style={{
        width: px,
        height: px * 0.62,
        padding: px * 0.08,
        borderRadius: px * 0.12,
        background: "#FFFFFF",
        boxShadow: `0 ${20 * u}px ${60 * u}px rgba(0,0,0,0.35)`,
        ...style,
      }}
    >
      {img}
    </div>
  );
};

/** Latin island inside an RTL layout (URLs, numbers). */
export const Ltr: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => {
  const { F } = useVideo();
  return <span style={{ direction: "ltr", unicodeBidi: "isolate", fontFamily: F.latin, ...style }}>{children}</span>;
};

/** Abstract brand art for image slots — gradient blobs, no fake photos. */
export const BrandArt: React.FC<{ style?: React.CSSProperties; seed?: number }> = ({ style, seed = 0 }) => {
  const f = useCurrentFrame();
  const { T } = useVideo();
  const a = f / 60 + seed;
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background: `radial-gradient(circle at ${35 + Math.sin(a) * 8}% ${30 + Math.cos(a) * 8}%, ${rgba(T.gradA, 0.7)}, transparent 55%), radial-gradient(circle at ${70 + Math.cos(a * 0.8) * 8}% ${72 + Math.sin(a * 0.9) * 8}%, ${rgba(T.gradB, 0.6)}, transparent 55%), ${T.surface2}`,
        ...style,
      }}
    />
  );
};

/**
 * Vertically centered content stack inside the safe area (below the top chrome).
 * Every scene lays out through this so the frame is balanced at 9:16, 1:1 and 16:9.
 */
export const Center: React.FC<{ children: React.ReactNode; gap?: number; align?: "start" | "center"; top?: number; bottom?: number; width?: number }> = ({
  children,
  gap = 70,
  align = "start",
  top,
  bottom,
  width,
}) => {
  const { H, W, CW, u, landscape } = useVideo();
  const w = width ?? CW;
  return (
    <div
      style={{
        position: "absolute",
        top: top ?? H * (landscape ? 0.13 : 0.11),
        bottom: bottom ?? H * (landscape ? 0.07 : 0.07),
        left: (W - w) / 2,
        width: w,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: align === "center" ? "center" : "stretch",
        gap: gap * u,
      }}
    >
      {children}
    </div>
  );
};

/** Typewriter helper. */
export const typed = (text: string, f: number, from: number, frames: number) => text.slice(0, Math.floor(clampI(f, from, from + frames, 0, text.length)));
