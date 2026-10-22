import type { VideoFormat } from "@/lib/types";

/** Message key under `formats.*` for an aspect ratio. */
export function formatKey(format: VideoFormat): "vertical" | "feed" | "square" | "landscape" {
  return format === "9:16" ? "vertical" : format === "4:5" ? "feed" : format === "1:1" ? "square" : "landscape";
}

export const ASPECT: Record<VideoFormat, string> = {
  "9:16": "aspect-[9/16]",
  "4:5": "aspect-[4/5]",
  "1:1": "aspect-square",
  "16:9": "aspect-video",
};
