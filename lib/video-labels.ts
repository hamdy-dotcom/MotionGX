import type { VideoFormat } from "@/lib/types";

/** Message key under `formats.*` for an aspect ratio. */
export function formatKey(format: VideoFormat): "vertical" | "square" | "landscape" {
  return format === "9:16" ? "vertical" : format === "1:1" ? "square" : "landscape";
}

export const ASPECT: Record<VideoFormat, string> = {
  "9:16": "aspect-[9/16]",
  "1:1": "aspect-square",
  "16:9": "aspect-video",
};
