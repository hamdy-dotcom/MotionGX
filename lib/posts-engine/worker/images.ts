// Step 2 — AI images (OpenAI GPT Image): a scene, photo-style background or illustration for the slides that asked for
// one. Never with text in it: the design lays the exact words, the logo and the real screens on top.
import fs from "node:fs";
import path from "node:path";
import type { PostJob } from "../../live-engine/protocol";
import type { Ledger } from "../../live-engine/worker/claude";
import type { Slide } from "./write";

// OpenAI's GPT Image price per 1M tokens (developers.openai.com/api/docs/pricing, gpt-image-2.5 / gpt-image-2)
const PRICE: Record<string, [number, number]> = { default: [5, 30], "gpt-image-1.5": [5, 32], "gpt-image-1": [5, 40], "gpt-image-1-mini": [2, 8] };
const MAX_IMAGES = 4;

/** the generation size for a post's canvases: portrait unless the post is landscape only */
const sizeFor = (canvases: string[]) => (canvases.every((c) => c === "16:9") ? "1536x1024" : "1024x1536");

export async function makeImages(opts: { post: PostJob; slides: Slide[]; canvases: string[]; brand: { palette?: Record<string, string>; look?: string }; runDir: string; ledger: Ledger; prev?: Slide[] | null; log: (l: string) => void }) {
  const { post, slides, canvases, brand, runDir, ledger, log } = opts;
  const want = slides.filter((s) => s.visual.kind === "ai_image" && s.visual.prompt);
  if (!want.length) return;
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    log("! images: OPENAI_API_KEY is not set — the AI-image slides use type only");
    for (const s of want) s.visual = { kind: "none" };
    return;
  }
  fs.mkdirSync(path.join(runDir, "ai"), { recursive: true });
  let n = 0;
  for (const [i, s] of slides.entries()) {
    if (s.visual.kind !== "ai_image" || !s.visual.prompt) continue;
    // "Request a change": an image whose prompt didn't change is kept (downloaded with the previous version)
    const old = opts.prev?.find((p) => p.visual?.prompt === s.visual.prompt && p.ai_file);
    if (old?.ai_file && fs.existsSync(path.join(runDir, "prev", old.ai_file))) {
      fs.copyFileSync(path.join(runDir, "prev", old.ai_file), path.join(runDir, old.ai_file));
      s.ai_file = old.ai_file;
      log(`↺ images: slide ${i + 1} keeps its image (same scene)`);
      continue;
    }
    if (n >= MAX_IMAGES) { s.visual = { kind: "none" }; continue; }
    if (ledger.total() >= post.maxUsd) throw new Error(`cost cap reached ($${ledger.total().toFixed(2)} of $${post.maxUsd})`);
    const colors = brand.palette ? Object.entries(brand.palette).filter(([, v]) => typeof v === "string" && /^#/.test(v)).map(([k, v]) => `${k} ${v}`).join(", ") : "";
    const prompt = `${s.visual.prompt}\n\nArt direction: ${brand.look ?? "clean, modern, premium"}${colors ? `; harmonise with the brand colours (${colors})` : ""}. Leave calm, uncluttered areas where a headline can sit.\nAbsolutely no text, letters, words, numbers, logos, watermarks, signs or user interfaces anywhere in the image.`;
    const t0 = Date.now();
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: post.image.model, prompt, size: sizeFor(canvases), quality: post.image.quality, output_format: "jpeg", output_compression: 90, n: 1 }),
    });
    const body = (await res.json().catch(() => null)) as { data?: { b64_json?: string }[]; usage?: { input_tokens?: number; output_tokens?: number }; error?: { message?: string } } | null;
    if (!res.ok || !body?.data?.[0]?.b64_json) {
      log(`! images: slide ${i + 1} — OpenAI ${res.status}: ${body?.error?.message?.slice(0, 200) ?? "no image"} — type only`);
      s.visual = { kind: "none" };
      continue;
    }
    const file = `ai/slide-${i + 1}.jpg`;
    fs.writeFileSync(path.join(runDir, file), Buffer.from(body.data[0].b64_json, "base64"));
    s.ai_file = file;
    n++;
    const [pin, pout] = PRICE[post.image.model] ?? PRICE.default;
    const tin = body.usage?.input_tokens ?? 0, tout = body.usage?.output_tokens ?? 0;
    ledger.addPriced("post-image", post.image.model, { in: tin, out: tout }, (tin * pin + tout * pout) / 1e6, Date.now() - t0);
  }
  log(`✓ images: ${n} generated (${post.image.model}, ${post.image.quality})`);
}
