// Arabic + English text engine. Never splits inside a word (Arabic letters must stay joined),
// never wraps a line, auto-fits to the available width, sets direction from the text itself.
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { fitText } from "@remotion/layout-utils";
import { useMotion } from "./context";
import { gradientText } from "./palette";
import { ease, lerp, progress, springAt, springs } from "./timing";

const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

export const isArabic = (text: string) => ARABIC.test(text);
export const dirOf = (text: string): "rtl" | "ltr" => (isArabic(text) ? "rtl" : "ltr");

/** Words, split on whitespace only — never inside a word. */
export const splitWords = (text: string) => text.trim().split(/\s+/).filter(Boolean);

/** Largest font size (≤ max px) at which `text` fits on one line in `width` px. */
export function fitFontSize(text: string, max: number, width: number, family: string, weight: number | string = 700) {
  try {
    return Math.min(max, fitText({ text, withinWidth: Math.max(10, width), fontFamily: family, fontWeight: weight }).fontSize);
  } catch {
    return max;
  }
}

/** Latin digits in both languages, grouped. */
export function formatNumber(n: number, lang: "ar" | "en" = "en", opts: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat(lang === "ar" ? "ar-EG-u-nu-latn" : "en-US", opts).format(n);
}

export type Reveal = {
  /** frame the reveal starts */
  start: number;
  /** "word": per-word masked rise; "line": whole line; "fade"; "scale" (pop); "none" */
  mode?: "word" | "line" | "fade" | "scale" | "none";
  /** frames between words */
  stagger?: number;
  /** frames each unit takes */
  duration?: number;
  /** where units come from */
  from?: "below" | "above" | "start" | "end";
};

export type TextProps = {
  text: string;
  /** max font size in px (auto-fit shrinks it to `width`) */
  size: number;
  /** available width in px (defaults to 86% of the canvas width) */
  width?: number;
  /** "head" | "body" | "latin" | "arabic" or a CSS font-family */
  font?: string;
  weight?: number;
  color?: string;
  /** fill with the brand gradient */
  gradient?: boolean;
  align?: "start" | "center" | "end";
  reveal?: Reveal;
  lineHeight?: number;
  letterSpacing?: string;
  style?: React.CSSProperties;
  /** style applied to each moving word (e.g. a per-word color) */
  wordStyle?: (index: number, word: string) => React.CSSProperties | undefined;
};

/** One line of on-screen text. Use one <Text> per script line. */
export const Text: React.FC<TextProps> = ({
  text,
  size,
  width,
  font = "head",
  weight = 800,
  color,
  gradient,
  align = "start",
  reveal,
  lineHeight,
  letterSpacing,
  style,
  wordStyle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { fonts, palette, width: W, dir: videoDir } = useMotion();
  const family = (font in fonts ? fonts[font as keyof typeof fonts] : font) ?? fonts.head;
  const arabic = isArabic(text);
  const lineDir = arabic ? "rtl" : /[A-Za-z0-9]/.test(text) ? "ltr" : videoDir;
  const fontSize = fitFontSize(text, size, width ?? W * 0.86, family, weight);
  const justify = align === "center" ? "center" : (align === "start") === (lineDir === videoDir) ? "flex-start" : "flex-end";
  const fill: React.CSSProperties = gradient ? gradientText(palette) : { color: color ?? palette.text };
  const base: React.CSSProperties = {
    display: "flex",
    direction: lineDir,
    justifyContent: justify,
    whiteSpace: "nowrap",
    fontFamily: family,
    fontWeight: weight,
    fontSize,
    lineHeight: lineHeight ?? (arabic ? 1.45 : 1.1),
    letterSpacing: letterSpacing ?? (arabic ? 0 : "-0.02em"),
    ...style,
  };

  const mode = reveal?.mode ?? (reveal ? "word" : "none");
  if (!reveal || mode === "none") return <div style={{ ...base, ...fill }}>{text}</div>;

  const dur = reveal.duration ?? 20;
  if (mode === "word") {
    const words = splitWords(text);
    const step = reveal.stagger ?? 4;
    const from = reveal.from ?? "below";
    return (
      <div style={base}>
        {words.map((w, i) => {
          const t = progress(frame, reveal.start + i * step, dur, ease.expoOut);
          const off = lerp(t, 110, 0);
          const transform =
            from === "below" ? `translateY(${off}%)` : from === "above" ? `translateY(${-off}%)` : `translateX(${(from === "start") === (lineDir === "ltr") ? -off : off}%)`;
          return (
            <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingTop: arabic ? "0.14em" : 0, paddingBottom: arabic ? "0.24em" : "0.1em", marginInlineEnd: "0.24em" }}>
              <span style={{ display: "inline-block", transform, ...fill, ...wordStyle?.(i, w) }}>{w}</span>
            </span>
          );
        })}
      </div>
    );
  }

  const t = progress(frame, reveal.start, dur, ease.expoOut);
  if (mode === "scale") {
    const s = springAt(frame, fps, reveal.start, springs.punch);
    return <div style={{ ...base, ...fill, opacity: Math.min(1, s * 1.4), transform: `scale(${lerp(s, 1.3, 1)})` }}>{text}</div>;
  }
  if (mode === "fade") return <div style={{ ...base, ...fill, opacity: t }}>{text}</div>;
  return <div style={{ ...base, ...fill, opacity: t, transform: `translateY(${lerp(t, 0.5 * fontSize, 0)}px)` }}>{text}</div>;
};

/** Number that counts up from `from` to `value` between `start` and `start + duration` frames. */
export const CountUp: React.FC<{
  value: number;
  start: number;
  duration: number;
  from?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  style?: React.CSSProperties;
}> = ({ value, start, duration, from = 0, decimals = 0, prefix = "", suffix = "", style }) => {
  const frame = useCurrentFrame();
  const { lang } = useMotion();
  const v = lerp(progress(frame, start, duration, ease.expoOut), from, value);
  return (
    <span style={{ direction: "ltr", unicodeBidi: "isolate", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", ...style }}>
      {prefix}
      {formatNumber(Number(v.toFixed(decimals)), lang, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
};
