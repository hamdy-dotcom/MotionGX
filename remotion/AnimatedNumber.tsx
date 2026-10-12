// Ported from motion-kit/src/components/AnimatedNumber.tsx — odometer counter.
import React from "react";
import { useCurrentFrame } from "remotion";
import { progress } from "./motion";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

export const AnimatedNumber: React.FC<{
  value: number;
  delay?: number;
  duration?: number;
  separator?: string;
  style?: React.CSSProperties;
  digitStyle?: React.CSSProperties;
}> = ({ value, delay = 0, duration = 60, separator = ",", style, digitStyle }) => {
  const frame = useCurrentFrame();
  const whole = Math.round(Math.abs(value));
  const v = whole * progress(frame, delay, duration);
  const n = Math.max(1, String(whole).length);
  const places = Array.from({ length: n }, (_, i) => n - 1 - i);

  const offsetFor = (p: number) => {
    const unit = Math.pow(10, p);
    const digit = Math.floor(v / unit) % 10;
    if (p === 0) return v % 10;
    const below = (v % unit) / unit;
    return digit + Math.max(0, below * 10 - 9);
  };

  return (
    <div style={{ display: "flex", alignItems: "flex-end", direction: "ltr", fontVariantNumeric: "tabular-nums", lineHeight: 1, ...style }}>
      {places.map((p) => {
        const showSep = separator && p > 0 && p % 3 === 0;
        return (
          <React.Fragment key={p}>
            <span style={{ display: "inline-block", height: "1em", overflow: "hidden", position: "relative" }}>
              <span style={{ display: "flex", flexDirection: "column", transform: `translateY(${-offsetFor(p)}em)` }}>
                {DIGITS.map((d, i) => (
                  <span key={i} style={{ height: "1em", ...digitStyle }}>
                    {d}
                  </span>
                ))}
              </span>
            </span>
            {showSep ? <span style={digitStyle}>{separator}</span> : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};
