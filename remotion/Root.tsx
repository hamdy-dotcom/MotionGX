import React from "react";
import { Composition } from "remotion";
import { SpecVideo, type SpecVideoProps } from "./SpecVideo";
import { MotionVideo, type MotionVideoProps } from "./MotionVideo";
import { sampleProps } from "./fixtures/sample";

const meta = ({ props }: { props: { input: { width: number; height: number; fps: number; durationInFrames: number } } }) => ({
  width: props.input.width,
  height: props.input.height,
  fps: props.input.fps,
  durationInFrames: props.input.durationInFrames,
});

export const RemotionRoot: React.FC = () => (
  <>
    {/* Phase 3C: every video is a MotionSpec rendered by the interpreter */}
    <Composition id="SpecVideo" component={SpecVideo} fps={30} width={1080} height={1920} durationInFrames={300} defaultProps={{ ...sampleProps, spec: { version: 1, canvas: { bg: [{ kind: "solid", colors: ["bg"] }] }, elements: [] } } as unknown as SpecVideoProps} calculateMetadata={meta} />
    {/* legacy (Phase 3B generated code) — removed once 3C passes */}
    <Composition id="MotionVideo" component={MotionVideo} fps={30} width={1080} height={1920} durationInFrames={300} defaultProps={sampleProps as MotionVideoProps} calculateMetadata={meta} />
  </>
);
