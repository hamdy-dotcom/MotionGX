// Scene kit, part 2.
import React from "react";
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from "remotion";
import { rgba } from "../../lib/video/tokens";
import { beatFrame, useVideo } from "../context";
import { Cross, Icon } from "../icons";
import { beatPulse, lerp, progress, punch, snap } from "../motion";
import { BrandArt, Card, Center, Chip, Glow, Label, Lines, Logo, Ltr, Pop, Rise, Scene, Wipe } from "../parts";
import { Flash, type SceneProps } from "./a";

const lastEm = (lines: string[]) => (lines.length > 1 ? lines.length - 1 : undefined);

/* ═══ offer — the value stamps in on beat 2 with a ray burst (the promo's «ببلاش») ═══ */
export const OfferScene: React.FC<SceneProps<"offer">> = ({ scene, dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { H, W, u, fpb, T, F, CW } = useVideo();
  const b = (k: number) => beatFrame(fpb, k);
  const at = b(2);
  const stamp = punch(f, fps, at);
  const burst = progress(f, at, 26);
  const value = scene.props.value;
  const arabic = /[؀-ۿ]/.test(value);
  const valueSize = Math.min(320 * u, (CW * 0.82) / Math.max(1.6, value.length * (arabic ? 0.52 : 0.6)));
  return (
    <Scene dur={dur}>
      <Glow size={1200} opacity={0.7} style={{ top: H * 0.5 - 600 * u, left: W / 2 - 600 * u }} />
      <Flash at={at} strength={0.38} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", top: H * 0.12 }}>
        {Array.from({ length: 16 }, (_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 7 * u,
              height: 240 * u,
              borderRadius: 7 * u,
              background: i % 2 ? T.gradA : T.gradB,
              opacity: f >= at ? (1 - burst) * 0.85 : 0,
              transform: `rotate(${(360 / 16) * i}deg) translateY(${-lerp(burst, 180, 620) * u}px)`,
            }}
          />
        ))}
      </AbsoluteFill>
      <Center align="center" gap={80}>
        {scene.props.badge ? <Label at={0}>{scene.props.badge}</Label> : null}
        <div style={{ alignSelf: "stretch" }}>
          <Lines lines={scene.lines} at={b(0.5)} max={104} align="center" mode="stagger" />
        </div>
        <div
          style={{
            fontFamily: arabic ? F.head : F.latin,
            fontWeight: 800,
            fontSize: valueSize,
            lineHeight: arabic ? 1.45 : 1.15,
            padding: `0 ${70 * u}px`,
            borderRadius: 44 * u,
            background: T.gradient,
            color: T.onPrimary,
            whiteSpace: "nowrap",
            opacity: Math.min(1, stamp * 1.5),
            transform: `rotate(-4deg) scale(${lerp(stamp, 1.9, 1) * (1 + 0.03 * beatPulse(Math.max(0, f - at), fpb))})`,
            boxShadow: `0 ${30 * u}px ${110 * u}px ${rgba(T.gradA, 0.5)}`,
          }}
        >
          {value}
        </div>
      </Center>
    </Scene>
  );
};

/* ═══ quote — big gradient quote mark, words stagger in ═══ */
export const QuoteScene: React.FC<SceneProps<"quote">> = ({ scene, dur }) => {
  const f = useCurrentFrame();
  const { H, W, u, fpb, T, F } = useVideo();
  const b = (k: number) => beatFrame(fpb, k);
  return (
    <Scene dur={dur}>
      <Glow size={1000} opacity={0.5} style={{ top: H * 0.2, left: W * 0.4 }} />
      <Center gap={40}>
        <Pop at={0} from={0.4}>
          <div
            style={{
              fontFamily: F.latin,
              fontWeight: 800,
              fontSize: 340 * u,
              lineHeight: 0.8,
              height: 200 * u,
              backgroundImage: T.gradient,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              transform: `rotate(${Math.sin(f / 30) * 3}deg)`,
            }}
          >
            “
          </div>
        </Pop>
        <Lines lines={scene.lines} at={6} max={88} mode="stagger" gap={6} emphasis={lastEm(scene.lines)} />
        {scene.props.author ? (
          <Rise at={b(2)}>
            <div style={{ display: "flex", alignItems: "center", gap: 24 * u, marginTop: 20 * u }}>
              <div style={{ width: 90 * u, height: 6 * u, borderRadius: 6 * u, background: T.gradient }} />
              <span style={{ fontSize: 46 * u, color: T.textMuted, fontWeight: 700 }}>{scene.props.author}</span>
            </div>
          </Rise>
        ) : null}
      </Center>
    </Scene>
  );
};

/* ═══ comparison — us vs them, ticks land row by row ═══ */
export const ComparisonScene: React.FC<SceneProps<"comparison">> = ({ scene, dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, fpb, T } = useVideo();
  const b = (k: number) => beatFrame(fpb, k);
  const col = 200 * u;
  return (
    <Scene dur={dur}>
      <Center gap={60}>
        <Lines lines={scene.lines} at={0} max={100} mode="wipe" emphasis={lastEm(scene.lines)} />
        <Card at={b(0.5)} style={{ padding: `${24 * u}px ${44 * u}px` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 * u, padding: `${22 * u}px 0` }}>
            <div style={{ flex: 1 }} />
            <div style={{ width: col, display: "flex", justifyContent: "center" }}>
              <Chip solid color={T.gradA} style={{ fontSize: 34 * u, padding: `${10 * u}px ${24 * u}px`, fontWeight: 800 }}>
                {scene.props.us_label}
              </Chip>
            </div>
            <div style={{ width: col, textAlign: "center", fontSize: 34 * u, color: T.textMuted, fontWeight: 700, whiteSpace: "nowrap" }}>{scene.props.them_label}</div>
          </div>
          {scene.props.rows.map((row, i) => {
            const at = b(1 + i * 0.5);
            const tick = punch(f, fps, at + 4);
            return (
              <Rise key={i} at={at} distance={24}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 * u, padding: `${32 * u}px 0`, borderTop: `${2 * u}px solid ${T.border}` }}>
                  <div style={{ flex: 1, fontSize: 50 * u, fontWeight: 700, whiteSpace: "nowrap" }}>{row}</div>
                  <div style={{ width: col, display: "flex", justifyContent: "center", transform: `scale(${lerp(tick, 0.3, 1)})` }}>
                    <div style={{ width: 80 * u, height: 80 * u, borderRadius: "50%", background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 ${36 * u}px ${rgba(T.gradA, 0.4)}` }}>
                      <Icon name="check" size={46 * u} color={T.onPrimary} strokeWidth={3} />
                    </div>
                  </div>
                  <div style={{ width: col, display: "flex", justifyContent: "center", opacity: 0.5 }}>
                    <Cross size={52 * u} color={T.textDim} />
                  </div>
                </div>
              </Rise>
            );
          })}
        </Card>
      </Center>
    </Scene>
  );
};

/* ═══ chips_cloud — chips pop on the beat and keep floating; one is lit per beat ═══ */
export const ChipsCloudScene: React.FC<SceneProps<"chips_cloud">> = ({ scene, dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, fpb, T } = useVideo();
  const b = (k: number) => beatFrame(fpb, k);
  const chips = scene.props.chips;
  const half = Math.round(fpb / 2);
  const lit = Math.floor(f / fpb) % chips.length;
  const allIn = b(1) + chips.length * half;
  return (
    <Scene dur={dur}>
      <Center align="center" gap={90}>
        <div style={{ alignSelf: "stretch" }}>
          <Lines lines={scene.lines} at={0} max={104} align="center" mode="stagger" emphasis={lastEm(scene.lines)} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 30 * u }}>
          {chips.map((chip, i) => {
            const s = punch(f, fps, b(1) + i * half);
            const float = Math.sin(f / 18 + i * 1.7) * 12 * u;
            const on = f > allIn && i === lit;
            return (
              <div key={i} style={{ opacity: Math.min(1, s * 1.4), transform: `translateY(${float}px) scale(${lerp(s, 0.3, 1) * (on ? 1.08 : 1)}) rotate(${lerp(s, (i % 2 ? 1 : -1) * 16, 0)}deg)` }}>
                <Chip solid={on} color={T.gradA} style={{ fontSize: 50 * u, padding: `${22 * u}px ${40 * u}px`, fontWeight: 700 }}>
                  {chip}
                </Chip>
              </div>
            );
          })}
        </div>
      </Center>
    </Scene>
  );
};

/* ═══ split_image — brand image (or brand art + logo) wipes in with a slow push ═══ */
export const SplitImageScene: React.FC<SceneProps<"split_image">> = ({ scene, dur }) => {
  const f = useCurrentFrame();
  const { H, W, u, T, brand, landscape, M, CW } = useVideo();
  const zoom = 1.12 - 0.12 * progress(f, 0, dur);
  const panel = (w: number, h: number) => (
    <Wipe at={0} dur={22}>
      <div style={{ width: w, height: h, borderRadius: 48 * u, overflow: "hidden", position: "relative", boxShadow: `0 ${40 * u}px ${120 * u}px rgba(0,0,0,0.4)`, border: `${2 * u}px solid ${T.border}` }}>
        {brand.imageUrl ? (
          <Img src={brand.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }} />
        ) : (
          <BrandArt style={{ position: "absolute", inset: 0, transform: `scale(${zoom})` }} />
        )}
        {!brand.imageUrl ? (
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
            <Pop at={8}>
              <Logo size={landscape ? 260 : 360} />
            </Pop>
          </AbsoluteFill>
        ) : null}
      </div>
    </Wipe>
  );
  const text = (
    <>
      <Lines lines={scene.lines} at={8} max={96} mode="stagger" emphasis={lastEm(scene.lines)} width={landscape ? W * 0.4 : undefined} />
      {scene.props.caption ? (
        <Rise at={24}>
          <div style={{ fontSize: 46 * u, color: T.textMuted, fontWeight: 600, marginTop: 10 * u }}>{scene.props.caption}</div>
        </Rise>
      ) : null}
    </>
  );
  if (landscape) {
    return (
      <Scene dur={dur}>
        <div style={{ position: "absolute", top: H * 0.13, insetInlineStart: M }}>{panel(W * 0.42, H * 0.76)}</div>
        <div style={{ position: "absolute", top: H * 0.3, insetInlineEnd: M, width: W * 0.42, display: "flex", flexDirection: "column", gap: 30 * u }}>{text}</div>
      </Scene>
    );
  }
  return (
    <Scene dur={dur}>
      <Center gap={60}>
        {panel(CW, H * 0.42)}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 * u }}>{text}</div>
      </Center>
    </Scene>
  );
};

/* ═══ cta — button hits on beat 1 and pulses every beat; the real URL ═══ */
export const CtaScene: React.FC<SceneProps<"cta">> = ({ scene, dur, last }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { H, W, u, fpb, T, F } = useVideo();
  const b = (k: number) => beatFrame(fpb, k);
  const btnAt = b(1);
  const btn = punch(f, fps, btnAt);
  const beat = Math.round(fpb);
  const ring = ((f - btnAt) % beat) / beat;
  const pulse = 1 + 0.035 * beatPulse(Math.max(0, f - btnAt), fpb);
  return (
    <Scene dur={dur} noExit={last}>
      <Glow size={1100} opacity={0.8} style={{ top: H * 0.45 - 550 * u, left: W / 2 - 550 * u }} />
      <Center align="center" gap={70} top={H * 0.08}>
        <Pop at={0} from={0.7}>
          <Logo size={300} />
        </Pop>
        <div style={{ alignSelf: "stretch" }}>
          <Lines lines={scene.lines} at={4} max={110} align="center" mode="stagger" emphasis={lastEm(scene.lines)} />
        </div>
        <div style={{ position: "relative", opacity: Math.min(1, btn * 1.4), transform: `scale(${lerp(btn, 0.6, 1) * pulse})` }}>
          {f > btnAt ? <div style={{ position: "absolute", inset: 0, borderRadius: 40 * u, border: `${4 * u}px solid ${T.gradA}`, transform: `scale(${1 + ring * 0.25})`, opacity: 1 - ring }} /> : null}
          <div
            style={{
              background: T.gradient,
              color: T.onPrimary,
              borderRadius: 40 * u,
              padding: `${34 * u}px ${80 * u}px`,
              fontFamily: F.head,
              fontWeight: 800,
              fontSize: 72 * u,
              lineHeight: 1.4,
              whiteSpace: "nowrap",
              boxShadow: `0 ${20 * u}px ${90 * u}px ${rgba(T.gradA, 0.55)}`,
            }}
          >
            {scene.props.button}
          </div>
        </div>
        <Rise at={b(2)}>
          <Ltr style={{ fontWeight: 700, fontSize: 70 * u, backgroundImage: T.gradient, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{scene.props.url}</Ltr>
        </Rise>
      </Center>
    </Scene>
  );
};

/* ═══ outro_logo — the logo is the hero; tagline + URL ═══ */
export const OutroLogoScene: React.FC<SceneProps<"outro_logo">> = ({ scene, dur, last }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { H, W, u, fpb, T, landscape } = useVideo();
  const b = (k: number) => beatFrame(fpb, k);
  const s = snap(f, fps, 0);
  return (
    <Scene dur={dur} noExit={last}>
      <Glow size={1100} opacity={0.75 + 0.2 * Math.sin(f / 10)} style={{ top: H * 0.4 - 550 * u, left: W / 2 - 550 * u }} />
      <Center align="center" gap={90}>
        <div style={{ opacity: s, transform: `scale(${lerp(s, 0.75, 1)})` }}>
          <Logo size={landscape ? 360 : 560} />
        </div>
        <div style={{ alignSelf: "stretch" }}>
          <Lines lines={scene.lines} at={b(1)} max={80} align="center" mode="rise" />
          {scene.props.url ? (
            <Rise at={b(2)}>
              <div style={{ textAlign: "center", marginTop: 34 * u }}>
                <Ltr style={{ fontWeight: 600, fontSize: 54 * u, color: T.textMuted }}>{scene.props.url}</Ltr>
              </div>
            </Rise>
          ) : null}
        </div>
      </Center>
    </Scene>
  );
};
