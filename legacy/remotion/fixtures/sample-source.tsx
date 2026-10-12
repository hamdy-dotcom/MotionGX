// Hand-written example composition (dev default for Remotion Studio and the compile/render smoke test).
// Generated compositions follow the same contract: default-export a component that renders from MotionInput.
import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import {
  BrandLogo,
  Camera,
  Particles,
  StrokeDraw,
  Text,
  clip,
  ease,
  lerp,
  progress,
  useBeat,
  useEnergy,
  useHit,
  useMotion,
  useUnit,
  type MotionInput,
} from "@motiongx/primitives";

const Ring: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const { palette } = useMotion();
  const u = useUnit();
  const t = progress(frame, delay, 40, ease.expoOut);
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 900 * u,
        height: 900 * u,
        marginLeft: -450 * u,
        marginTop: -450 * u,
        borderRadius: "50%",
        border: `${6 * u}px solid ${palette.gradB}`,
        transform: `scale(${lerp(t, 0.2, 1.4)})`,
        opacity: 1 - t,
      }}
    />
  );
};

const BeatView: React.FC<{ lines: string[] }> = ({ lines }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { width } = useMotion();
  const u = useUnit();
  const out = progress(frame, durationInFrames - 8, 8, ease.inOut);
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: 90 * u, gap: 10 * u, opacity: 1 - out, clipPath: clip.wipe(progress(frame, 0, 14), "bottom") }}>
      {lines.map((line, i) => (
        <Text key={i} text={line} size={130 * u} width={width - 180 * u} gradient={i === lines.length - 1} reveal={{ start: 2 + i * 6, mode: "word", stagger: 3 }} />
      ))}
    </AbsoluteFill>
  );
};

export default function Composition(props: MotionInput) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = useUnit();
  const { pulse } = useBeat();
  const { level } = useEnergy();
  const hit = useHit();
  const { palette, script } = props;
  const zoom = 1 + 0.03 * pulse * level + 0.05 * hit.pulse;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% ${40 + 10 * Math.sin(frame / 50)}%, ${palette.bg2}, ${palette.bg} 70%)` }}>
      <Particles count={40} colors={[palette.gradA, palette.text]} speed={1 + level} />
      <Camera zoom={zoom} shakeOnHits={0.6}>
        <StrokeDraw
          d="M 40 520 C 240 120, 520 900, 760 400 S 1000 200, 1040 520"
          progress={progress(frame, 0, fps * 2)}
          stroke={palette.gradA}
          strokeWidth={10}
          viewBox="0 0 1080 1080"
          width="100%"
          height="100%"
          style={{ position: "absolute", inset: 0, opacity: 0.35 }}
        />
        {hit.hitFrames.map((f) => (
          <Sequence key={f} from={f} durationInFrames={40}>
            <Ring delay={0} />
          </Sequence>
        ))}
        {script.beats.map((b) => (
          <Sequence key={b.id} from={Math.round(b.start_s * fps)} durationInFrames={Math.max(1, Math.round((b.end_s - b.start_s) * fps))}>
            {b.role === "logo" ? (
              <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
                <BrandLogo width={520 * u} />
              </AbsoluteFill>
            ) : (
              <BeatView lines={b.lines} />
            )}
          </Sequence>
        ))}
      </Camera>
    </AbsoluteFill>
  );
}
