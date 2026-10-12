import React from "react";
import { Composition } from "remotion";
import { dimensionsFor, type BrandVideoProps } from "../lib/video/kit";
import { BrandVideo } from "./BrandVideo";
import { previewProps } from "./preview-props";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="BrandVideo"
    component={BrandVideo}
    fps={30}
    width={1080}
    height={1920}
    durationInFrames={900}
    defaultProps={previewProps as BrandVideoProps}
    calculateMetadata={({ props }) => {
      const { width, height } = dimensionsFor(props.format);
      return { width, height, fps: props.fps, durationInFrames: Math.round(props.lengthS * props.fps) };
    }}
  />
);
