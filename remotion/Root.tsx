import React from "react";
import { Composition } from "remotion";
import { MotionVideo, type MotionVideoProps } from "./MotionVideo";
import { sampleProps } from "./fixtures/sample";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="MotionVideo"
    component={MotionVideo}
    fps={30}
    width={1080}
    height={1920}
    durationInFrames={300}
    defaultProps={sampleProps as MotionVideoProps}
    calculateMetadata={({ props }) => ({
      width: props.input.width,
      height: props.input.height,
      fps: props.input.fps,
      durationInFrames: props.input.durationInFrames,
    })}
  />
);
