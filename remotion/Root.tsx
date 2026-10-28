import React from "react";
import { Composition } from "remotion";
import { SpecVideo, type SpecVideoProps } from "./SpecVideo";

const meta = ({ props }: { props: SpecVideoProps }) => ({
  width: props.input.width,
  height: props.input.height,
  fps: props.input.fps,
  durationInFrames: props.input.durationInFrames,
});

// Studio-only defaults (real props always come from a generated spec)
const defaults: SpecVideoProps = {
  spec: { version: 1, canvas: { bg: [{ kind: "solid", colors: ["bg"] }] }, elements: [] },
  input: {
    brand: { name: "MotionGX", url: "motiongx.app", logoUrl: null, logoPlate: false, imageUrls: [], colors: [{ hex: "#5558E3", role: "primary" }, { hex: "#0B0D12", role: "background" }] },
    fontFamilies: { arabic: null, latin: null },
    lang: "en",
    dir: "ltr",
    width: 1080,
    height: 1920,
    fps: 30,
    durationInFrames: 300,
    energy: { bpm: 110, length_s: 10, sections: [], hits: [] },
    script: { title: "", beats: [] },
  },
  audio: { music: null, sfx: null, voiceover: null },
};

/** Phase 3C: every video is a MotionSpec rendered by the interpreter. */
export const RemotionRoot: React.FC = () => <Composition id="SpecVideo" component={SpecVideo} fps={30} width={1080} height={1920} durationInFrames={300} defaultProps={defaults} calculateMetadata={meta} />;
