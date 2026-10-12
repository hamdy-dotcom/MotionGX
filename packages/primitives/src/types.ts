// The contract between the runtime and a generated composition. A generated file exports
// `default function Composition(props: MotionInput)` and renders everything from these props.
import type { BrandColorInput, BrandTokens } from "./palette";

export type EnergySectionKind = "intro" | "build" | "drop" | "breakdown" | "outro";
export type HitKind = "drop" | "impact" | "reveal" | "logo" | "cta";

export type EnergyMap = {
  bpm: number;
  length_s: number;
  sections: { name: string; kind: EnergySectionKind; start_s: number; end_s: number; energy: number }[];
  hits: { t: number; kind: HitKind; label?: string }[];
};

export type ScriptBeat = {
  id: string;
  /** what this beat is for in the treatment, e.g. "the tension", "logo reveal" */
  role: string;
  start_s: number;
  end_s: number;
  /** pre-split on-screen lines, in the video language */
  lines: string[];
  voiceover_line: string | null;
};

export type FontStacks = { head: string; body: string; latin: string; arabic: string; display?: string };

export type MotionInput = {
  brand: {
    name: string;
    url: string;
    logoUrl: string | null;
    /** dark logo on a dark canvas → show it on a light plate */
    logoPlate: boolean;
    imageUrls: string[];
    colors: BrandColorInput[];
  };
  palette: BrandTokens;
  fonts: FontStacks;
  lang: "ar" | "en";
  dir: "rtl" | "ltr";
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  energy: EnergyMap;
  script: { title: string; beats: ScriptBeat[] };
};
