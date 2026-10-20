// What each platform wants: the text rules the writer follows and the image size each platform gets.
// One design per canvas shape: Facebook, Instagram and LinkedIn share the 4:5 feed canvas, TikTok gets 9:16, X 16:9.
import type { PostPlatform } from "../../live-engine/protocol";

export type Canvas = "4:5" | "9:16" | "16:9";
export const CANVAS: Record<Canvas, [number, number]> = { "4:5": [1080, 1350], "9:16": [1080, 1920], "16:9": [1600, 900] };

export const PLATFORM: Record<PostPlatform, { name: string; canvas: Canvas; maxChars: number; rules: string }> = {
  facebook: {
    name: "Facebook",
    canvas: "4:5",
    maxChars: 2000,
    rules: "conversational, 1–3 short paragraphs; the first line carries the hook; one clear call to action (the site link is welcome); 0–3 hashtags",
  },
  instagram: {
    name: "Instagram",
    canvas: "4:5",
    maxChars: 2200,
    rules: "the first line is the hook (only ~125 characters show before 'more'); short lines with line breaks; emoji only where they fit the brand's voice; a call to action ('link in bio' — links are not clickable in captions); 5–12 relevant hashtags at the end",
  },
  tiktok: {
    name: "TikTok",
    canvas: "9:16",
    maxChars: 4000,
    rules: "a very short caption (ideally under 150 characters): a hook and one line of value; 3–6 relevant hashtags",
  },
  linkedin: {
    name: "LinkedIn",
    canvas: "4:5",
    maxChars: 3000,
    rules: "professional and human: a hook line, then 3–6 short paragraphs with a concrete insight or result from the product's real facts; a closing question or call to action; at most 3 hashtags",
  },
  x: {
    name: "X",
    canvas: "16:9",
    maxChars: 280,
    rules: "one punchy post — the text AND its hashtags together must fit in 280 characters (count them); 0–2 hashtags",
  },
};

/** the canvases a set of platforms needs, in a stable order */
export const canvasesFor = (platforms: PostPlatform[]) => (["4:5", "9:16", "16:9"] as Canvas[]).filter((c) => platforms.some((p) => PLATFORM[p].canvas === c));

/** the post's language, from the company's dialect */
export const LANGUAGE: Record<string, string> = {
  eg: "Egyptian Arabic (masri — natural, warm, not formal)",
  sa: "Saudi Arabic (natural Saudi dialect)",
  gulf: "Gulf Arabic (khaleeji)",
  lev: "Levantine Arabic (shami)",
  msa: "Modern Standard Arabic (فصحى)",
  en: "English",
};
