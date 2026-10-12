// Local sentence embeddings (all-MiniLM-L6-v2, 384-d) for treatment similarity and reference retrieval.
// Runs in Node via @huggingface/transformers + onnxruntime; no external embedding API needed.
import type { FeatureExtractionPipeline } from "@huggingface/transformers";

export const EMBED_MODEL = "Xenova/all-MiniLM-L6-v2";
export const EMBED_DIM = 384;

const g = globalThis as unknown as { __mgxEmbedder?: Promise<FeatureExtractionPipeline> };

async function embedder() {
  g.__mgxEmbedder ??= import("@huggingface/transformers").then(({ pipeline, env }) => {
    env.allowLocalModels = false;
    return pipeline("feature-extraction", EMBED_MODEL, { dtype: "q8" }) as Promise<FeatureExtractionPipeline>;
  });
  return g.__mgxEmbedder;
}

/** L2-normalized embedding (cosine similarity = dot product). */
export async function embed(text: string): Promise<number[]> {
  const fx = await embedder();
  const out = await fx(text.slice(0, 4000), { pooling: "mean", normalize: true });
  return Array.from(out.data as Float32Array);
}

export function cosine(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) s += a[i] * b[i];
  return s;
}
