// Drifting brand glows + faint moving grid + floating particles (from MantoogPromo's Background,
// generalized to brand tokens). Always moving, so no frame is ever static.
import React from "react";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import { rgba } from "../lib/video/tokens";
import { useVideo } from "./context";
import { beatPulse } from "./motion";

const PARTICLES = Array.from({ length: 26 }, (_, i) => ({
  x: random(`px-${i}`),
  y: random(`py-${i}`),
  s: 2 + random(`ps-${i}`) * 5,
  v: 0.4 + random(`pv-${i}`) * 1.2,
  o: 0.15 + random(`po-${i}`) * 0.35,
}));

export const Background: React.FC = () => {
  const f = useCurrentFrame();
  const { T, W, H, u, fpb } = useVideo();
  const a = f / 90;
  const big = Math.max(W, H) * 1.3;
  const pulse = 1 + 0.06 * beatPulse(f, fpb, 5);
  return (
    <AbsoluteFill style={{ backgroundColor: T.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `linear-gradient(160deg, ${T.bg2} 0%, ${T.bg} 55%)` }} />
      <div
        style={{
          position: "absolute",
          width: big,
          height: big,
          left: -big * 0.38 + Math.sin(a) * 120 * u,
          top: -big * 0.3 + Math.cos(a * 0.8) * 120 * u,
          background: `radial-gradient(circle, ${T.glowA}, transparent 60%)`,
          transform: `scale(${pulse})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: big,
          height: big,
          right: -big * 0.45 + Math.cos(a * 0.7) * 140 * u,
          bottom: -big * 0.38 + Math.sin(a * 0.9) * 140 * u,
          background: `radial-gradient(circle, ${T.glowB}, transparent 60%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${rgba(T.text, 0.035)} 1px, transparent 1px), linear-gradient(90deg, ${rgba(T.text, 0.035)} 1px, transparent 1px)`,
          backgroundSize: `${90 * u}px ${90 * u}px`,
          backgroundPosition: `0 ${(f * 0.6 * u) % (90 * u)}px`,
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }}
      />
      {PARTICLES.map((p, i) => {
        const y = ((p.y * H - f * p.v * u) % H + H) % H;
        const x = p.x * W + Math.sin(f / 40 + i) * 14 * u;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: p.s * u,
              height: p.s * u,
              borderRadius: "50%",
              background: i % 3 === 0 ? T.gradB : T.text,
              opacity: p.o,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
