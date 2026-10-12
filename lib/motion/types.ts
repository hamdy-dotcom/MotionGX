import type { BrandFacts } from "@/lib/brand/types";
import type { Dialect, Goal, Pace, VideoFormat } from "@/lib/types";
import type { BrandColorInput } from "@motiongx/primitives";

/** Everything the generative pipeline needs to make one video. */
export type MotionBrief = {
  workspaceId: string;
  videoId?: string;
  brief: string;
  goal: Goal;
  format: VideoFormat;
  width: number;
  height: number;
  lengthS: number;
  pace: Pace;
  dialect: Dialect;
  voiceover: boolean;
  brand: {
    name: string;
    url: string;
    tone: string;
    tagline: string;
    colors: BrandColorInput[];
    fonts: { arabic: string | null; latin: string | null };
    hasLogo: boolean;
    logoUrl: string | null;
    logoPlate: boolean;
    imageUrls: string[];
    imageCount: number;
  };
  facts: BrandFacts;
};

export function dimensionsFor(format: VideoFormat) {
  if (format === "9:16") return { width: 1080, height: 1920 };
  if (format === "1:1") return { width: 1080, height: 1080 };
  return { width: 1920, height: 1080 };
}
