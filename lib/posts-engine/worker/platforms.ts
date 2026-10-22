// What each platform wants: the text rules the writer follows and the image size each platform gets.
// One design per canvas shape: Facebook, Instagram and LinkedIn share the 4:5 feed canvas, TikTok gets 9:16, X 16:9.
import type { PostPlatform } from "../../live-engine/protocol";

// Placements: a feed post (per platform, above), a story (one 9:16 frame: Instagram / Facebook / TikTok Stories,
// WhatsApp Status) or a profile cover (each platform's banner size).
export type Canvas = "4:5" | "9:16" | "16:9" | "1:1" | "fb-cover" | "li-cover" | "x-cover";
export const CANVAS: Record<Canvas, [number, number]> = { "4:5": [1080, 1350], "9:16": [1080, 1920], "16:9": [1600, 900], "1:1": [1080, 1080], "fb-cover": [1640, 624], "li-cover": [1584, 396], "x-cover": [1500, 500] };
export type Placement = "feed" | "story" | "cover";
const COVER: Partial<Record<PostPlatform, Canvas>> = { facebook: "fb-cover", linkedin: "li-cover", x: "x-cover" };
export const isCover = (c: Canvas) => c.endsWith("-cover");

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

/** the canvas a platform gets for a placement (null: that platform has no such placement, e.g. an Instagram cover) */
export const canvasFor = (p: PostPlatform, placement: Placement = "feed"): Canvas | null => (placement === "story" ? "9:16" : placement === "cover" ? (COVER[p] ?? null) : PLATFORM[p].canvas);

/** the canvases a set of platforms needs, in a stable order */
export const canvasesFor = (platforms: PostPlatform[], placement: Placement = "feed") => (Object.keys(CANVAS) as Canvas[]).filter((c) => platforms.some((p) => canvasFor(p, placement) === c));

/** what the writer and the image model must respect for a story or a cover */
export const PLACEMENT_RULES: Record<Placement, string> = {
  feed: "",
  story: "a STORY: one vertical full-screen frame (Instagram / Facebook / TikTok Stories, WhatsApp Status), built on one smart, creative visual idea that stops the thumb. The words on the image are all most viewers read: a very short headline, at most one short second line, and one clear action (e.g. 'اسحب لفوق' / 'link in bio' / 'تواصل واتساب'). Keep the top 14% and the bottom 20% free of text (the app's own buttons sit there). The platform text is one short line.",
  cover: "a PROFILE COVER — the brand's key visual at the top of its page: a DESIGNED banner full of the brand's life, the way Noon, Careem, Talabat, Spotify or Airbnb do theirs. NOT a stock photo, NOT a post. RULES: (1) It is unmistakably THIS brand at a glance: its own colours dominate the whole banner, and its graphic language (its shapes, its logo mark's forms used big as graphic elements, its patterns, its type feel) runs through it. (2) The brand's files are STYLE REFERENCES ONLY: take their colours, shapes, light and mood, and create everything new — do NOT reproduce its screens, pages, products or photos, and show NO phone, laptop, tablet, screen or interface at all. (3) Alive: depth, layers, movement and energy — a composed scene built on one idea from the brand's world (its audience in a real moment, the feeling it brings, its graphic system at large scale, a place of its world), one clear focal point, balanced. (4) The logo is not the centrepiece (the profile picture under the cover already shows it): its mark may appear big and cropped as a graphic shape, or not at all. (5) No words: no headline, sentence, list, button, price or date (a ≤ 4-word tagline only when the client asked for words). (6) Never: generic stock still-lifes, empty moody rooms, neon light trails, lens flares, glowing glass icons, galaxy or circuit backgrounds, clip-art, a row of service icons, check-mark badges. (7) Crops: the focal point sits in the centre 50% of the width; both bottom corners stay free of key content (the profile picture sits bottom-left, or bottom-right in Arabic). The platform text is a matching one-line bio (≤ 150 characters).",
};

/** the post's language, from the company's dialect */
export const LANGUAGE: Record<string, string> = {
  eg: "Egyptian Arabic (masri — natural, warm, not formal)",
  sa: "Saudi Arabic (natural Saudi dialect)",
  gulf: "Gulf Arabic (khaleeji)",
  lev: "Levantine Arabic (shami)",
  msa: "Modern Standard Arabic (فصحى)",
  en: "English",
};
