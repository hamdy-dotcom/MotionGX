// Scene kit, part 1 — generalized from motion-kit `scenes.tsx` (Hook, Transform, LogoReveal, features…).
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { KitSceneOf, SceneType } from "../../lib/video/kit";
import { rgba } from "../../lib/video/tokens";
import { AnimatedNumber } from "../AnimatedNumber";
import { beatFrame, useVideo } from "../context";
import { Cross, Icon } from "../icons";
import { beatPulse, clampI, lerp, progress, punch, snap } from "../motion";
import { BrandArt, Card, Center, Glow, Lines, Logo, Pop, Rise, Scene, Slide, Wipe } from "../parts";

export type SceneProps<T extends SceneType> = {
  scene: KitSceneOf<T>;
  dur: number;
  index: number;
  last: boolean;
};

export const Flash: React.FC<{ at: number; strength?: number }> = ({ at, strength = 0.28 }) => {
  const f = useCurrentFrame();
  const { T } = useVideo();
  const o = f < at ? 0 : clampI(f, at, at + 10, strength, 0);
  return <AbsoluteFill style={{ background: rgba(T.gradA, o), pointerEvents: "none" }} />;
};

const lastEm = (lines: string[]) => (lines.length > 1 ? lines.length - 1 : undefined);

/* ═══ hook — big kinetic headline; the emphasis line lands on beat 1 ═══ */
export const HookScene: React.FC<SceneProps<"hook">> = ({ scene, dur }) => {
  const f = useCurrentFrame();
  const { H, W, u, fpb, T, CW } = useVideo();
  const b = (k: number) => beatFrame(fpb, k);
  const em = Math.min(scene.props.emphasis_line ?? scene.lines.length - 1, scene.lines.length - 1);
  const ring = progress(f, b(1), Math.round(fpb * 1.5));
  return (
    <Scene dur={dur}>
      <Glow size={1200} opacity={0.75} style={{ top: H * 0.25, left: -260 * u }} />
      <Flash at={b(1)} />
      {/* expanding ring on the hit — tension */}
      <div
        style={{
          position: "absolute",
          top: H / 2 - 320 * u,
          left: W / 2 - 320 * u,
          width: 640 * u,
          height: 640 * u,
          borderRadius: "50%",
          border: `${3 * u}px solid ${T.gradB}`,
          opacity: f > b(1) ? (1 - ring) * 0.5 : 0,
          transform: `scale(${lerp(ring, 0.4, 1.7)})`,
        }}
      />
      <Center gap={40}>
        <Lines lines={scene.lines} at={2} max={scene.lines.length > 2 ? 118 : 140} emphasis={em} emphasisMode="pop" emphasisAt={b(1)} gap={4} />
        <Wipe at={b(1.5)}>
          <div style={{ width: CW * 0.42, height: 14 * u, borderRadius: 14 * u, background: T.gradient }} />
        </Wipe>
      </Center>
    </Scene>
  );
};

/* ═══ problem — pains slide in on the beat, then get struck through ═══ */
export const ProblemScene: React.FC<SceneProps<"problem">> = ({ scene, dur }) => {
  const f = useCurrentFrame();
  const { u, fpb, T } = useVideo();
  const b = (k: number) => beatFrame(fpb, k);
  return (
    <Scene dur={dur}>
      <Center>
        <Lines lines={scene.lines} at={0} max={104} mode="wipe" emphasis={lastEm(scene.lines)} />
        <div style={{ display: "flex", flexDirection: "column", gap: 30 * u }}>
          {scene.props.pains.map((pain, i) => {
            const at = b(1 + i);
            const strike = progress(f, at + Math.round(fpb * 0.6), 12);
            return (
              <Slide key={i} at={at}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 30 * u,
                    padding: `${38 * u}px ${42 * u}px`,
                    borderRadius: 34 * u,
                    background: T.surface,
                    border: `${2 * u}px solid ${strike > 0.5 ? T.border : rgba(T.text, 0.16)}`,
                    fontSize: 56 * u,
                    fontWeight: 700,
                    color: strike > 0.5 ? T.textMuted : T.text,
                    whiteSpace: "nowrap",
                  }}
                >
                  <span style={{ display: "flex", transform: `scale(${lerp(strike, 0.6, 1)}) rotate(${lerp(strike, -90, 0)}deg)`, opacity: 0.35 + strike * 0.65 }}>
                    <Cross size={58 * u} color={T.gradB} />
                  </span>
                  <span style={{ position: "relative" }}>
                    {pain}
                    <span style={{ position: "absolute", top: "54%", insetInlineStart: 0, height: 6 * u, width: `${strike * 100}%`, borderRadius: 4 * u, background: T.gradB }} />
                  </span>
                </div>
              </Slide>
            );
          })}
        </div>
      </Center>
    </Scene>
  );
};

/* ═══ logo_reveal — flash, logo blurs in at 1.35×, halo breathes, tagline staggers ═══ */
export const LogoRevealScene: React.FC<SceneProps<"logo_reveal">> = ({ scene, dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { H, W, u, fpb, landscape } = useVideo();
  const s = snap(f, fps, 0);
  const halo = 0.75 + 0.25 * Math.sin(f / 9);
  return (
    <Scene dur={dur}>
      <Flash at={0} strength={0.45} />
      <Glow size={1000} opacity={halo * s} style={{ top: H * 0.42 - 500 * u, left: W / 2 - 500 * u }} />
      <Center align="center" gap={90}>
        <div style={{ opacity: s, transform: `scale(${lerp(s, 1.35, 1)})`, filter: `blur(${lerp(s, 16, 0)}px)` }}>
          <Logo size={landscape ? 380 : 600} />
        </div>
        <div style={{ alignSelf: "stretch" }}>
          <Lines lines={scene.lines} at={Math.round(fpb * 1.5)} max={84} align="center" emphasis={scene.lines.length - 1} mode="stagger" />
        </div>
      </Center>
    </Scene>
  );
};

/* ═══ feature_list — up to 4 items with icons, one per beat ═══ */
export const FeatureListScene: React.FC<SceneProps<"feature_list">> = ({ scene, dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, fpb, T, landscape } = useVideo();
  const b = (k: number) => beatFrame(fpb, k);
  return (
    <Scene dur={dur}>
      <Center>
        <Lines lines={scene.lines} at={0} max={100} mode="wipe" emphasis={lastEm(scene.lines)} />
        <div style={{ display: landscape ? "grid" : "flex", gridTemplateColumns: "1fr 1fr", flexDirection: "column", gap: 28 * u }}>
          {scene.props.items.map((item, i) => {
            const at = b(1 + i * 0.75);
            const tick = punch(f, fps, at + 6);
            const lit = beatPulse(Math.max(0, f - at), fpb, 5);
            return (
              <Slide key={i} at={at}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 34 * u,
                    padding: `${28 * u}px ${32 * u}px`,
                    borderRadius: 36 * u,
                    background: T.surface,
                    border: `${2 * u}px solid ${rgba(T.gradA, 0.18 + 0.3 * lit)}`,
                  }}
                >
                  <div
                    style={{
                      width: 124 * u,
                      height: 124 * u,
                      borderRadius: 34 * u,
                      background: T.gradient,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transform: `scale(${lerp(tick, 0.6, 1)}) rotate(${lerp(tick, -14, 0)}deg)`,
                      boxShadow: `0 0 ${50 * u}px ${rgba(T.gradA, 0.35)}`,
                    }}
                  >
                    <Icon name={item.icon} size={66 * u} color={T.onPrimary} />
                  </div>
                  <span style={{ fontSize: (landscape ? 46 : 56) * u, fontWeight: 700, whiteSpace: "nowrap" }}>{item.text}</span>
                </div>
              </Slide>
            );
          })}
        </div>
      </Center>
    </Scene>
  );
};

/* ═══ stat — odometer count that ends on a downbeat ═══ */
export const StatScene: React.FC<SceneProps<"stat">> = ({ scene, dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { H, W, u, fpb, T, F, landscape, CW } = useVideo();
  const b = (k: number) => beatFrame(fpb, k);
  const beats = dur / fpb;
  const endBeat = Math.max(2, Math.min(3, Math.floor(beats) - 1));
  const start = b(0.5);
  const end = b(endBeat);
  const hit = punch(f, fps, end);
  const { value, prefix, suffix, caption } = scene.props;
  const chars = String(Math.round(value)).length * 1.15 + (prefix?.length ?? 0) * 0.5;
  const size = Math.min(landscape ? 320 : 400 * u, (CW * 0.95) / Math.max(2.4, chars * 0.62));
  const grad: React.CSSProperties = { backgroundImage: T.gradient, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" };
  return (
    <Scene dur={dur}>
      <Glow size={1100} opacity={0.55 + 0.35 * hit} style={{ top: H * 0.45 - 550 * u, left: W / 2 - 550 * u }} />
      <Flash at={end} strength={0.18} />
      <Center align="center" gap={50}>
        <div style={{ alignSelf: "stretch" }}>
          <Lines lines={scene.lines} at={0} max={92} align="center" mode="rise" />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "baseline",
            gap: 14 * u,
            direction: "ltr",
            fontFamily: F.latin,
            fontWeight: 800,
            fontSize: size,
            letterSpacing: "-0.04em",
            transform: `scale(${f >= end ? lerp(hit, 1.14, 1) : 1})`,
          }}
        >
          {prefix ? <span style={{ ...grad, fontSize: size * 0.55 }}>{prefix}</span> : null}
          <AnimatedNumber value={value} delay={start} duration={end - start} digitStyle={grad} />
          {suffix ? <span style={{ ...grad, fontSize: size * (suffix.length > 2 ? 0.3 : 0.55), opacity: snap(f, fps, end), fontFamily: F.head }}>{suffix}</span> : null}
        </div>
        {caption ? (
          <Rise at={end + 4}>
            <div style={{ textAlign: "center", fontSize: 52 * u, color: T.textMuted, fontWeight: 600 }}>{caption}</div>
          </Rise>
        ) : null}
      </Center>
    </Scene>
  );
};

/* ═══ steps — 1-2-3 flow with a connector that draws between them ═══ */
export const StepsScene: React.FC<SceneProps<"steps">> = ({ scene, dur }) => {
  const f = useCurrentFrame();
  const { u, fpb, T, F, landscape, CW } = useVideo();
  const b = (k: number) => beatFrame(fpb, k);
  const grow = progress(f, b(1), b(3) - b(1));
  const circle = 150 * u;
  return (
    <Scene dur={dur}>
      <Center gap={90}>
        <Lines lines={scene.lines} at={0} max={100} emphasis={lastEm(scene.lines)} mode="stagger" />
        <div style={{ position: "relative", display: "flex", flexDirection: landscape ? "row" : "column", gap: (landscape ? 40 : 70) * u }}>
          <div
            style={{
              position: "absolute",
              background: T.gradient,
              borderRadius: 8 * u,
              ...(landscape
                ? { top: circle / 2 - 4 * u, height: 8 * u, insetInlineStart: circle / 2, width: (CW - circle) * grow }
                : { insetInlineStart: circle / 2 - 4 * u, top: circle / 2, width: 8 * u, height: `calc(${grow * 100}% - ${grow * circle}px)` }),
            }}
          />
          {scene.props.steps.map((step, i) => (
            <Pop key={i} at={b(1 + i)} from={0.5} style={{ flex: 1 }}>
              <div style={{ display: "flex", flexDirection: landscape ? "column" : "row", alignItems: landscape ? "flex-start" : "center", gap: 40 * u }}>
                <div
                  style={{
                    width: circle,
                    height: circle,
                    borderRadius: "50%",
                    background: T.gradient,
                    color: T.onPrimary,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: F.latin,
                    fontWeight: 800,
                    fontSize: 72 * u,
                    flexShrink: 0,
                    boxShadow: `0 0 ${60 * u}px ${rgba(T.gradA, 0.45)}, 0 0 0 ${10 * u}px ${T.bg}`,
                    transform: `scale(${1 + 0.06 * beatPulse(Math.max(0, f - b(1 + i)), fpb)})`,
                  }}
                >
                  {i + 1}
                </div>
                <span style={{ fontSize: 60 * u, fontWeight: 800, whiteSpace: "nowrap" }}>{step}</span>
              </div>
            </Pop>
          ))}
        </div>
      </Center>
    </Scene>
  );
};

/* ═══ phone_mock — a brand UI card inside a phone frame (like the promo's link→store) ═══ */
export const PhoneMockScene: React.FC<SceneProps<"phone_mock">> = ({ scene, dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { H, W, u, fpb, T, F, landscape, M } = useVideo();
  const b = (k: number) => beatFrame(fpb, k);
  const phoneIn = snap(f, fps, 4);
  const items = scene.props.items;
  const btnAt = b(1.5 + items.length * 0.5);
  const btn = punch(f, fps, btnAt);
  const beat = Math.round(fpb);
  const ring = ((f - btnAt) % beat) / beat;
  const pw = (landscape ? 440 : 640) * u;
  const ph = Math.min((landscape ? 900 : 1180) * u, H * (landscape ? 0.86 : 0.64));
  const phone = (
    <div
      style={{
        width: pw,
        height: ph,
        borderRadius: 76 * u,
        background: T.bg,
        border: `${12 * u}px solid ${T.surface2}`,
        boxShadow: `0 ${60 * u}px ${160 * u}px rgba(0,0,0,0.55), 0 0 ${140 * u}px ${rgba(T.gradA, 0.2)}`,
        padding: 34 * u,
        opacity: phoneIn,
        transform: `translateY(${lerp(phoneIn, 260 * u, 0)}px) rotate(${lerp(phoneIn, 5, 0)}deg)`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: 22 * u,
      }}
    >
      <Rise at={b(0.5)} distance={20}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18 * u }}>
          <div style={{ fontFamily: F.head, fontWeight: 800, fontSize: 40 * u, whiteSpace: "nowrap" }}>{scene.props.screen_title}</div>
          <Logo size={110} />
        </div>
      </Rise>
      <Wipe at={b(0.75)}>
        <BrandArt seed={3} style={{ height: ph * 0.26, borderRadius: 28 * u }} />
      </Wipe>
      {items.map((item, i) => {
        const at = b(1 + i * 0.5);
        const on = progress(f, at + 6, 10);
        return (
          <Slide key={i} at={at} distance={70}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16 * u,
                padding: `${24 * u}px ${26 * u}px`,
                borderRadius: 24 * u,
                background: T.surface,
                border: `${2 * u}px solid ${on > 0.5 ? rgba(T.gradA, 0.55) : T.border}`,
                fontSize: 36 * u,
                fontWeight: 700,
              }}
            >
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item}</span>
              <span style={{ width: 50 * u, height: 50 * u, borderRadius: 25 * u, background: on > 0.5 ? T.gradient : rgba(T.text, 0.1), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transform: `scale(${lerp(on, 0.6, 1)})` }}>
                {on > 0.5 ? <Icon name="check" size={30 * u} color={T.onPrimary} strokeWidth={3} /> : null}
              </span>
            </div>
          </Slide>
        );
      })}
      <div style={{ flex: 1 }} />
      <div style={{ position: "relative", opacity: Math.min(1, btn * 1.3), transform: `scale(${lerp(btn, 0.6, 1)})` }}>
        {f > btnAt ? <div style={{ position: "absolute", inset: 0, borderRadius: 26 * u, border: `${3 * u}px solid ${T.gradA}`, transform: `scale(${1 + ring * 0.16})`, opacity: 1 - ring }} /> : null}
        <div style={{ background: T.gradient, color: T.onPrimary, borderRadius: 26 * u, padding: `${28 * u}px 0`, textAlign: "center", fontSize: 40 * u, fontWeight: 800, fontFamily: F.head }}>{scene.props.button}</div>
      </div>
    </div>
  );

  if (landscape) {
    return (
      <Scene dur={dur}>
        <Center width={W * 0.46} top={H * 0.12} bottom={H * 0.12}>
          <div style={{ marginInlineStart: -(W - W * 0.46) / 2 + M }}>
            <Lines lines={scene.lines} at={0} max={88} mode="wipe" emphasis={lastEm(scene.lines)} width={W * 0.44} />
          </div>
        </Center>
        <div style={{ position: "absolute", top: (H - ph) / 2, insetInlineEnd: M * 1.2 }}>{phone}</div>
      </Scene>
    );
  }
  return (
    <Scene dur={dur}>
      <Center align="center" gap={60}>
        <div style={{ alignSelf: "stretch" }}>
          <Lines lines={scene.lines} at={0} max={92} align="center" mode="wipe" emphasis={lastEm(scene.lines)} />
        </div>
        {phone}
      </Center>
    </Scene>
  );
};

/* ═══ before_after — dim "before", glowing "after" that lands on beat 2 ═══ */
export const BeforeAfterScene: React.FC<SceneProps<"before_after">> = ({ scene, dur }) => {
  const f = useCurrentFrame();
  const { u, fpb, T, landscape } = useVideo();
  const b = (k: number) => beatFrame(fpb, k);
  const { before_label, before, after_label, after } = scene.props;
  const list = (items: string[], good: boolean, at: number) =>
    items.map((t, i) => (
      <Rise key={i} at={at + i * 4} distance={20}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 * u, fontSize: 50 * u, fontWeight: good ? 800 : 600, color: good ? T.text : T.textMuted, marginTop: 24 * u, whiteSpace: "nowrap" }}>
          {good ? <Icon name="check" size={52 * u} color={T.gradA} strokeWidth={3} /> : <Cross size={46 * u} color={T.textDim} />}
          <span style={{ textDecoration: good ? "none" : "line-through", textDecorationColor: T.textDim }}>{t}</span>
        </div>
      </Rise>
    ));
  const label = (text: string, good: boolean) => (
    <div style={{ display: "inline-flex", padding: `${10 * u}px ${28 * u}px`, borderRadius: 999, fontSize: 34 * u, fontWeight: 800, background: good ? T.gradient : rgba(T.text, 0.08), color: good ? T.onPrimary : T.textMuted }}>{text}</div>
  );
  return (
    <Scene dur={dur}>
      <Flash at={b(2)} strength={0.16} />
      <Center gap={60}>
        <Lines lines={scene.lines} at={0} max={100} mode="stagger" emphasis={lastEm(scene.lines)} />
        <div style={{ display: "flex", flexDirection: landscape ? "row" : "column", gap: 34 * u }}>
          <Card at={b(0.5)} style={{ flex: 1, padding: 48 * u }}>
            {label(before_label, false)}
            {list(before, false, b(0.5) + 6)}
          </Card>
          <Slide at={b(2)} style={{ flex: 1 }}>
            <Card at={b(2)} glow style={{ height: "100%", boxSizing: "border-box", padding: 48 * u }}>
              <div style={{ transform: `scale(${1 + 0.02 * beatPulse(Math.max(0, f - b(2)), fpb)})`, transformOrigin: "center" }}>
                {label(after_label, true)}
                {list(after, true, b(2) + 6)}
              </div>
            </Card>
          </Slide>
        </div>
      </Center>
    </Scene>
  );
};
