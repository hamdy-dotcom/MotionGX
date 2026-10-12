"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { getAppContext } from "@/lib/context";
import { redirect } from "@/i18n/navigation";
import { runGeneration } from "@/lib/motion/app";
import { assertWithinRateLimit, toAiErrorCode, type AiErrorCode } from "@/lib/ai/usage";
import { DIALECTS, FORMATS, GOALS, LENGTHS, PACES, type Dialect, type Goal, type Pace, type VideoFormat, type VideoLength } from "@/lib/types";

export type CreateVideoState = { error?: "briefRequired" | "generic"; aiError?: AiErrorCode };

function pick<T extends string | number>(value: unknown, allowed: readonly T[]): T | null {
  return allowed.find((a) => String(a) === String(value)) ?? null;
}

/**
 * Creates the video and starts generation in the background (creative director → script →
 * bespoke composition + QA → music). The studio shows progress until the first version lands.
 */
export async function createVideo(_prev: CreateVideoState, formData: FormData): Promise<CreateVideoState> {
  const ctx = await getAppContext();
  const { supabase, workspace, locale } = ctx;

  const brief = String(formData.get("brief") ?? "").trim();
  if (!brief) return { error: "briefRequired" };
  const goal = pick<Goal>(formData.get("goal"), GOALS);
  const format = pick<VideoFormat>(formData.get("format"), FORMATS);
  const length = pick<VideoLength>(Number(formData.get("length_s")), LENGTHS);
  const pace = pick<Pace>(formData.get("pace"), PACES);
  const dialect = pick<Dialect>(formData.get("dialect"), DIALECTS);
  const companyId = String(formData.get("company_id") ?? "");
  const voiceover = formData.get("voiceover") === "on";
  const voiceId = voiceover ? String(formData.get("voice_id") ?? "") || null : null;
  if (!goal || !format || !length || !pace || !dialect || !companyId || (voiceover && !voiceId)) return { error: "generic" };

  try {
    await assertWithinRateLimit(workspace.id);
  } catch (err) {
    return { aiError: toAiErrorCode(err) };
  }

  const firstLine = brief.split("\n")[0];
  const { data: video, error } = await supabase
    .from("videos")
    .insert({
      workspace_id: workspace.id,
      company_id: companyId,
      title: firstLine.length > 60 ? `${firstLine.slice(0, 57)}…` : firstLine,
      brief,
      goal,
      format,
      length_s: length,
      pace,
      dialect,
      voiceover,
      voice_id: voiceId,
      status: "generating",
      generation: { stage: "queued", mode: "new", updated_at: new Date().toISOString() },
    })
    .select("id")
    .single();
  if (error || !video) {
    console.error("[createVideo] insert video failed", { code: error?.code, message: error?.message });
    return { error: "generic" };
  }

  after(() => runGeneration(video.id, { kind: "new" }));
  revalidatePath("/", "layout");
  redirect({ href: `/videos/${video.id}`, locale });
  return {};
}
