// The one composition. Rendered entirely from props: brand, scenes, format, fps, music, voiceover.
import React, { useMemo } from "react";
import { AbsoluteFill, Html5Audio, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import type { BrandVideoProps, KitScene } from "../lib/video/kit";
import { computeTimeline, framesPerBeat } from "../lib/video/timeline";
import { buildTokens } from "../lib/video/tokens";
import { Background } from "./Background";
import { VideoContext, type VideoCtx } from "./context";
import { useBrandFonts } from "./fonts";
import { displayUrl, Logo, Ltr } from "./parts";
import {
  BeforeAfterScene,
  FeatureListScene,
  HookScene,
  LogoRevealScene,
  PhoneMockScene,
  ProblemScene,
  StatScene,
  StepsScene,
  type SceneProps,
} from "./scenes/a";
import { ChipsCloudScene, ComparisonScene, CtaScene, OfferScene, OutroLogoScene, QuoteScene, SplitImageScene } from "./scenes/b";

const SCENES: { [K in KitScene["type"]]: React.FC<SceneProps<K>> } = {
  hook: HookScene,
  problem: ProblemScene,
  logo_reveal: LogoRevealScene,
  feature_list: FeatureListScene,
  stat: StatScene,
  steps: StepsScene,
  phone_mock: PhoneMockScene,
  before_after: BeforeAfterScene,
  offer: OfferScene,
  quote: QuoteScene,
  comparison: ComparisonScene,
  chips_cloud: ChipsCloudScene,
  split_image: SplitImageScene,
  cta: CtaScene,
  outro_logo: OutroLogoScene,
};

/** Scenes where the logo is already the hero — hide the top chrome. */
const LOGO_SCENES = new Set<KitScene["type"]>(["logo_reveal", "cta", "outro_logo"]);

export const BrandVideo: React.FC<BrandVideoProps> = ({ brand, scenes, lengthS, lang, music, bpm, voiceover }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H, fps, durationInFrames } = useVideoConfig();
  const T = useMemo(() => buildTokens(brand.colors), [brand.colors]);
  const { ready, stacks } = useBrandFonts(brand.fonts, brand.fontFiles, lang);

  const beatBpm = music?.bpm ?? bpm;
  const fpb = framesPerBeat(fps, beatBpm);
  const timeline = useMemo(
    () => computeTimeline(scenes.map((s) => s.duration_beats), { fps, bpm: beatBpm, lengthS }),
    [scenes, fps, beatBpm, lengthS],
  );

  const short = Math.min(W, H);
  const landscape = W > H * 1.2;
  const square = !landscape && H < W * 1.2;
  // Compact formats get slightly smaller UI so stacks fit the shorter canvas.
  const u = (short / 1080) * (square ? 0.78 : landscape ? 0.88 : 1);
  const M = (landscape ? 120 : 88) * u;
  const CW = landscape ? Math.min(W - 2 * M, 1500 * u) : W - 2 * M;

  const ctx: VideoCtx = { T, F: stacks, brand, lang, dir: lang === "ar" ? "rtl" : "ltr", u, W, H, M, CW, landscape, square, fpb };

  const current = timeline.find((t) => frame >= t.startFrame && frame < t.startFrame + t.durationFrames) ?? timeline[timeline.length - 1];
  const chromeHidden = !current || LOGO_SCENES.has(scenes[current.index]?.type);
  const host = displayUrl(brand.url ?? "");

  // Music: quick fade-in, 1 s fade-out to the exact end; ducked to 30% under a voiceover.
  const musicBase = voiceover ? 0.3 : 0.9;
  const musicVolume = (f: number) =>
    musicBase *
    interpolate(f, [0, 6, durationInFrames - fps, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <VideoContext.Provider value={ctx}>
      <AbsoluteFill style={{ backgroundColor: T.bg, color: T.text, fontFamily: stacks.body }}>
        <Background />

        {music ? <Html5Audio src={music.url} volume={musicVolume} /> : null}
        {voiceover ? <Html5Audio src={voiceover.url} volume={1} /> : null}

        {ready
          ? timeline.map((t) => {
              const scene = scenes[t.index];
              const C = SCENES[scene.type] as React.FC<SceneProps<typeof scene.type>>;
              return (
                <Sequence key={`${scene.id}-${t.index}`} from={t.startFrame} durationInFrames={t.durationFrames} premountFor={Math.round(fpb * 2)}>
                  <C scene={scene} dur={t.durationFrames} index={t.index} last={t.index === timeline.length - 1} />
                </Sequence>
              );
            })
          : null}

        {/* progress bar, from the inline-start edge */}
        <div
          style={{
            position: "absolute",
            top: 0,
            [lang === "ar" ? "right" : "left"]: 0,
            height: 8 * u,
            width: `${(frame / Math.max(1, durationInFrames - 1)) * 100}%`,
            background: T.gradient,
          }}
        />

        {/* top chrome — URL + small logo; hidden while the logo is the hero */}
        {ready ? (
          <div
            style={{
              position: "absolute",
              top: (landscape ? 50 : 84) * u,
              left: M,
              right: M,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              direction: "ltr",
              opacity: chromeHidden ? 0 : 0.9,
            }}
          >
            <Ltr style={{ fontWeight: 500, fontSize: 30 * u, color: T.textMuted }}>{host}</Ltr>
            <Logo size={96} />
          </div>
        ) : null}
      </AbsoluteFill>
    </VideoContext.Provider>
  );
};
