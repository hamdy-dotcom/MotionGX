// Posts switches (env):
//   POSTS_VISUAL          image (default: one GPT Image call per slide, from the brand's logo + screenshots) | html (designed in HTML)
//   POSTS_MODEL           the writer (and, in html mode, the designer) — default claude-sonnet-5-5; the image check is Haiku
//   POSTS_MAX_USD         the cost cap per post job (default 2)
//   POSTS_IMAGE_MODEL     OpenAI GPT Image model for AI scenes (default gpt-image-2.5-flare)
//   POSTS_IMAGE_QUALITY   low | medium | high (default medium)
//   OPENAI_API_KEY        needed for AI images; without it, AI-image slides fall back to type only
export const postsSettings = () => ({
  visual: (process.env.POSTS_VISUAL === "html" ? "html" : "image") as "image" | "html",
  model: process.env.POSTS_MODEL || "claude-sonnet-5-5",
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
  tiktok: { canvas: "9:16", maxChars: 4000 },
  linkedin: { canvas: "4:5", maxChars: 3000 },
  x: { canvas: "16:9", maxChars: 280 },
};
export const CANVAS_SIZE: Record<string, [number, number]> = { "4:5": [1080, 1350], "9:16": [1080, 1920], "16:9": [1600, 900], "1:1": [1080, 1080], "fb-cover": [1640, 624], "li-cover": [1584, 396], "x-cover": [1500, 500] };
/** where a design goes (posts.placement, migration 0014) and the platforms each one is for */
export const PLACEMENTS = ["feed", "story", "cover"] as const;
export type Placement = (typeof PLACEMENTS)[number];
export const PLACEMENT_PLATFORMS: Record<Placement, readonly string[]> = { feed: POST_PLATFORMS, story: ["instagram", "facebook", "tiktok"], cover: ["facebook", "linkedin", "x"] };
