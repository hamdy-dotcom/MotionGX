import { createContext, useContext } from "react";
import type { BrandTokens } from "../lib/video/tokens";
import type { VideoBrand } from "../lib/video/kit";
import type { FontStacks } from "./fonts";

export type VideoCtx = {
  T: BrandTokens;
  F: FontStacks;
  brand: VideoBrand;
  lang: "ar" | "en";
  dir: "rtl" | "ltr";
  /** 1 unit = 1px on a 1080 short side. */
  u: number;
  W: number;
  H: number;
  /** horizontal margin */
  M: number;
  /** content width */
  CW: number;
  landscape: boolean;
  square: boolean;
  /** frames per beat */
  fpb: number;
};

export const VideoContext = createContext<VideoCtx | null>(null);

export function useVideo() {
  const ctx = useContext(VideoContext);
  if (!ctx) throw new Error("useVideo outside BrandVideo");
  return ctx;
}

/** Scene-local beat helper: frame of beat k (fractional allowed). */
export const beatFrame = (fpb: number, k: number) => Math.round(k * fpb);
