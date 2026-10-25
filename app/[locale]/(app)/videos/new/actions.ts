"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { getAppContext } from "@/lib/context";
import { placeCreated } from "@/lib/data/schedule";
import { saveCreateRefs } from "@/lib/data/refs";
import { redirect } from "@/i18n/navigation";
import { runGeneration } from "@/lib/motion/app";
import { liveEngineEnabled } from "@/lib/live-engine/config";
import { assertWithinRateLimit, toAiErrorCode, type AiErrorCode } from "@/lib/ai/usage";
import { holdFor, holdPiece, releaseHold } from "@/lib/billing";
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
  const live = liveEngineEnabled();
  // the live engine is music-only for now (decision Q4): voiceover is never set, so never charged
  const voiceover = !live && formData.get("voiceover") === "on";
  const voiceId = voiceover ? String(formData.get("voice_id") ?? "") || null : null;
  if (!goal || !format || !length || !pace || !dialect || !companyId || (voiceover && !voiceId)) return { error: "generic" };

  try {
    await assertWithinRateLimit(workspace.id);
  } catch (err) {
    return { aiError: toAiErrorCode(err) };
  }

  // the estimate is held before anything is made (an empty wallet stops here)
  const firstLine = brief.split("\n")[0];
  const hold = live ? await holdPiece(workspace.id, { kind: "video", lengthS: length, mode: "new" }, {}, firstLine.slice(0, 120)) : ({ ok: true, holdId: null } as const);
  if (!hold.ok) return { aiError: hold.error };
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
      generation: { stage: "queued", mode: "new", ...(live ? { engine: "live" } : {}), updated_at: new Date().toISOString() },
    })
    .select("id")
    .single();
  if (error || !video) {
    console.error("[createVideo] insert video failed", { code: error?.code, message: error?.message });
    if (hold.holdId) await releaseHold(hold.holdId);
    return { error: "generic" };
  }
  if (hold.holdId) await holdFor(hold.holdId, { videoId: video.id });

  await placeCreated(supabase, "videos", video.id, formData);
  await saveCreateRefs(ctx, "videos", video.id, companyId, formData);
  after(() => runGeneration(video.id, { kind: "new" }));
  revalidatePath("/", "layout");
  redirect({ href: `/videos/${video.id}`, locale });
  return {};
}
