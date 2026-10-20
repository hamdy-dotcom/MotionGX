// Posts switches (env):
//   POSTS_VISUAL          image (default: one GPT Image call per slide, from the brand's logo + screenshots) | html (designed in HTML)
//   POSTS_MODEL           the writer (and, in html mode, the designer) — default claude-haiku-5-5 (image mode), claude-sonnet-5-5 (html)
//   POSTS_MAX_USD         the cost cap per post job (default 2)
//   POSTS_IMAGE_MODEL     OpenAI GPT Image model for AI scenes (default gpt-image-2.5-flare)
//   POSTS_IMAGE_QUALITY   low | medium | high (default medium)
//   OPENAI_API_KEY        needed for AI images; without it, AI-image slides fall back to type only
export const postsSettings = () => ({
  visual: (process.env.POSTS_VISUAL === "html" ? "html" : "image") as "image" | "html",
  model: process.env.POSTS_MODEL || (process.env.POSTS_VISUAL === "html" ? "claude-sonnet-5-5" : "claude-haiku-5-5"),
  maxUsd: Number(process.env.POSTS_MAX_USD) > 0 ? Number(process.env.POSTS_MAX_USD) : 2,
  image: { model: process.env.POSTS_IMAGE_MODEL || "gpt-image-2.5-flare", quality: ["low", "medium", "high"].includes(process.env.POSTS_IMAGE_QUALITY ?? "") ? process.env.POSTS_IMAGE_QUALITY! : "medium" },
});

export const POST_PLATFORMS = ["instagram", "facebook", "tiktok", "linkedin", "x"] as const;
export const POST_TYPES = ["single", "carousel", "text"] as const;
export const POST_AI_IMAGE = ["auto", "yes", "no"] as const;

export type PostPlatformKey = (typeof POST_PLATFORMS)[number];
/** the image each platform gets (one design per canvas) and its text limit — the worker's platforms.ts has the same */
export const POST_PLATFORM_INFO: Record<PostPlatformKey, { canvas: "4:5" | "9:16" | "16:9"; maxChars: number }> = {
  instagram: { canvas: "4:5", maxChars: 2200 },
  facebook: { canvas: "4:5", maxChars: 2000 },
  tiktok: { canvas: "9:16", maxChars: 2200 },
  linkedin: { canvas: "4:5", maxChars: 3000 },
  x: { canvas: "16:9", maxChars: 280 },
};
export const CANVAS_SIZE: Record<string, [number, number]> = { "4:5": [1080, 1350], "9:16": [1080, 1920], "16:9": [1600, 900] };
