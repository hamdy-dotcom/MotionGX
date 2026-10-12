// The runtime composition. It evaluates one video's generated composition (compiled to CommonJS)
// with a `require` that only resolves whitelisted modules, wraps it in the MotionGX context
// (palette, fonts, energy map, script) and mixes the per-video music + SFX.
// This code runs inside the renderer's headless browser or the sandboxed preview iframe —
// never inside the app server.
import React, { useMemo } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import * as Remotion from "remotion";
import { AbsoluteFill, Html5Audio, getRemotionEnvironment, interpolate, useVideoConfig } from "remotion";
import * as Primitives from "@motiongx/primitives";
import * as Shapes from "@remotion/shapes";
import * as Paths from "@remotion/paths";
import * as Noise from "@remotion/noise";
import * as Transitions from "@remotion/transitions";
import * as TransFade from "@remotion/transitions/fade";
import * as TransSlide from "@remotion/transitions/slide";
import * as TransWipe from "@remotion/transitions/wipe";
import * as TransFlip from "@remotion/transitions/flip";
import * as TransClock from "@remotion/transitions/clock-wipe";
import * as TransIris from "@remotion/transitions/iris";
import * as TransDissolve from "@remotion/transitions/dissolve";
import * as TransPushCut from "@remotion/transitions/push-cut";
import * as TransZoomBlur from "@remotion/transitions/zoom-blur";
import * as TransBlurSlide from "@remotion/transitions/blur-slide";
import * as TransSwap from "@remotion/transitions/swap";
import * as TransZoomInOut from "@remotion/transitions/zoom-in-out";
import * as Three from "@remotion/three";
import * as Lottie from "@remotion/lottie";
import * as LayoutUtils from "@remotion/layout-utils";
import * as MotionBlur from "@remotion/motion-blur";
import * as MediaUtils from "@remotion/media-utils";
import { buildTokens } from "../packages/primitives/src/palette";
import { useBrandFonts } from "../packages/primitives/src/fonts";
import type { MotionInput } from "@motiongx/primitives";

/** Modules a generated composition may import. Anything else throws. */
export const ALLOWED_MODULES: Record<string, unknown> = {
  react: React,
  "react/jsx-runtime": jsxRuntime,
  remotion: Remotion,
  "@motiongx/primitives": Primitives,
  "@remotion/shapes": Shapes,
  "@remotion/paths": Paths,
  "@remotion/noise": Noise,
  "@remotion/transitions": Transitions,
  "@remotion/transitions/fade": TransFade,
  "@remotion/transitions/slide": TransSlide,
  "@remotion/transitions/wipe": TransWipe,
  "@remotion/transitions/flip": TransFlip,
  "@remotion/transitions/clock-wipe": TransClock,
  "@remotion/transitions/iris": TransIris,
  "@remotion/transitions/dissolve": TransDissolve,
  "@remotion/transitions/push-cut": TransPushCut,
  "@remotion/transitions/zoom-blur": TransZoomBlur,
  "@remotion/transitions/blur-slide": TransBlurSlide,
  "@remotion/transitions/swap": TransSwap,
  "@remotion/transitions/zoom-in-out": TransZoomInOut,
  "@remotion/three": Three,
  "@remotion/lottie": Lottie,
  "@remotion/layout-utils": LayoutUtils,
  "@remotion/motion-blur": MotionBlur,
  "@remotion/media-utils": MediaUtils,
};

export type RuntimeInput = Omit<MotionInput, "palette" | "fonts"> & { fontFamilies: { arabic: string | null; latin: string | null } };

export type MotionVideoProps = {
  /** generated composition, compiled to CommonJS */
  code: string;
  input: RuntimeInput;
  audio: { music: string | null; sfx: string | null; voiceover: string | null };
};

function loadComposition(code: string): React.ComponentType<MotionInput> {
  const mod = { exports: {} as Record<string, unknown> };
  const req = (name: string) => {
    if (name in ALLOWED_MODULES) return ALLOWED_MODULES[name];
    throw new Error(`Import not allowed in a generated composition: ${name}`);
  };
  // Generated code runs only in the renderer's headless Chrome or the sandboxed preview iframe.
  new Function("require", "module", "exports", code)(req, mod, mod.exports);
  const C = (mod.exports.default ?? mod.exports.Composition) as React.ComponentType<MotionInput> | undefined;
  if (typeof C !== "function") throw new Error("Generated composition has no default export");
  return C;
}

class Boundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      // In a render, fail loudly so the self-heal loop gets the message.
      if (getRemotionEnvironment().isRendering) throw this.state.error;
      return (
        <AbsoluteFill style={{ background: "#2A0F14", color: "#FFD7DC", padding: 60, fontFamily: "monospace", fontSize: 28, whiteSpace: "pre-wrap" }}>
          {String(this.state.error.stack ?? this.state.error.message)}
        </AbsoluteFill>
      );
    }
    return this.props.children;
  }
}

export const MotionVideo: React.FC<MotionVideoProps> = ({ code, input, audio }) => {
  const { durationInFrames, fps } = useVideoConfig();
  const palette = useMemo(() => buildTokens(input.brand.colors), [input.brand.colors]);
  const { ready, stacks } = useBrandFonts(input.fontFamilies, [], input.lang);
  const Composition = useMemo(() => loadComposition(code), [code]);
  const full: MotionInput = { ...input, palette, fonts: stacks };

  // Music ducks to 30% under a voiceover; 1 s fade-out to the last frame.
  const base = audio.voiceover ? 0.3 : 1;
  const musicVolume = (f: number) =>
    base * interpolate(f, [0, 3, durationInFrames - fps, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: palette.bg, direction: input.dir, fontFamily: stacks.body, color: palette.text }}>
      {audio.music ? <Html5Audio src={audio.music} volume={musicVolume} /> : null}
      {audio.sfx ? <Html5Audio src={audio.sfx} volume={0.9} /> : null}
      {audio.voiceover ? <Html5Audio src={audio.voiceover} /> : null}
      {ready ? (
        <Boundary>
          <Primitives.MotionProvider value={full}>
            {/* The component comes from generated code, loaded once per `code` (memoized above). */}
            {React.createElement(Composition, full)}
          </Primitives.MotionProvider>
        </Boundary>
      ) : null}
    </AbsoluteFill>
  );
};
