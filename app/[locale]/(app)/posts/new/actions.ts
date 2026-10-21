"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { getAppContext } from "@/lib/context";
import { placeCreated } from "@/lib/data/schedule";
import { redirect } from "@/i18n/navigation";
import { assertPostRateLimit, toAiErrorCode, type AiErrorCode } from "@/lib/ai/usage";
import { startPostGeneration } from "@/lib/live-engine/server/jobs";
import { POST_AI_IMAGE, POST_PLATFORMS, POST_TYPES } from "@/lib/posts/config";
import { DIALECTS, type Dialect } from "@/lib/types";

export type CreatePostState = { error?: "briefRequired" | "platformsRequired" | "generic"; aiError?: AiErrorCode };

const pick = <T extends string>(value: unknown, allowed: readonly T[]): T | null => allowed.find((a) => a === String(value)) ?? null;

/** Creates the post and starts its worker job (write → images → design → slides); the post page shows progress. */
export async function createPost(_prev: CreatePostState, formData: FormData): Promise<CreatePostState> {
  const { supabase, workspace, locale } = await getAppContext();
  const brief = String(formData.get("brief") ?? "").trim().slice(0, 2000);
  if (!brief) return { error: "briefRequired" };
  const platforms = [...new Set(formData.getAll("platforms").map(String))].filter((p) => (POST_PLATFORMS as readonly string[]).includes(p));
  if (!platforms.length) return { error: "platformsRequired" };
  const type = pick(formData.get("type"), POST_TYPES);
  const aiImage = pick(formData.get("ai_image"), POST_AI_IMAGE) ?? "auto";
  const dialect = pick<Dialect>(formData.get("dialect"), DIALECTS);
  const companyId = String(formData.get("company_id") ?? "");
  const slidesRaw = Number(formData.get("slides"));
  const slides = type === "carousel" && slidesRaw >= 2 && slidesRaw <= 10 ? Math.round(slidesRaw) : null;
  if (!type || !dialect || !companyId) return { error: "generic" };

  try {
    await assertPostRateLimit(workspace.id);
  } catch (err) {
    return { aiError: toAiErrorCode(err) };
  }

  const firstLine = brief.split("\n")[0];
  const { data: post, error } = await supabase
    .from("posts")
    .insert({ workspace_id: workspace.id, company_id: companyId, title: firstLine.length > 60 ? `${firstLine.slice(0, 57)}…` : firstLine, brief, type, platforms, dialect, ai_image: type === "text" ? "no" : aiImage, slides, status: "generating", generation: { stage: "queued", mode: "new", updated_at: new Date().toISOString() } })
    .select("id")
    .single();
  if (error || !post) {
    console.error("[createPost] insert failed", { code: error?.code, message: error?.message });
    return { error: "generic" };
  }
  await placeCreated(supabase, "posts", post.id, formData);
  after(() => startPostGeneration(post.id));
  revalidatePath("/posts");
  redirect({ href: `/posts/${post.id}`, locale });
  return {};
}
