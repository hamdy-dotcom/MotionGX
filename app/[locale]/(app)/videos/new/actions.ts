"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getAppContext } from "@/lib/context";
import { redirect } from "@/i18n/navigation";
import { generateScript } from "@/lib/script/generate";
import { toAiErrorCode, type AiErrorCode } from "@/lib/ai/usage";
import {
  DIALECTS,
  FORMATS,
  GOALS,
  LENGTHS,
  PACES,
  type BrandProfile,
  type Dialect,
  type Goal,
  type Pace,
  type VideoFormat,
  type VideoLength,
} from "@/lib/types";

export type CreateVideoState = { error?: "briefRequired" | "generic"; aiError?: AiErrorCode };

function pick<T extends string | number>(value: unknown, allowed: readonly T[]): T | null {
  return allowed.find((a) => String(a) === String(value)) ?? null;
}

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

  const { data: company } = await supabase
    .from("companies")
    .select("name, brand_profiles(colors, fonts, tone, tagline)")
    .eq("id", companyId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();
  if (!company) return { error: "generic" };
  const profileRaw = (company as unknown as { brand_profiles: BrandProfile | BrandProfile[] | null }).brand_profiles;
  const profile = Array.isArray(profileRaw) ? (profileRaw[0] ?? null) : profileRaw;

  // Write the script first so a failed AI call doesn't leave an empty video behind.
  let generated: Awaited<ReturnType<typeof generateScript>>;
  try {
    generated = await generateScript({
      workspaceId: workspace.id,
      brief,
      goal,
      format,
      lengthS: length,
      pace,
      dialect,
      voiceover,
      brand: { name: company.name, profile },
    });
  } catch (err) {
    console.error("[createVideo] script generation failed", { err });
    return { aiError: toAiErrorCode(err) };
  }

  const t = await getTranslations("videos");
  const tg = await getTranslations("goals");
  const firstLine = brief.split("\n")[0];
  const title = firstLine.length > 60 ? `${firstLine.slice(0, 57)}…` : firstLine || t("untitled", { goal: tg(goal) });

  const { data: video, error } = await supabase
    .from("videos")
    .insert({
      workspace_id: workspace.id,
      company_id: companyId,
      title,
      brief,
      goal,
      format,
      length_s: length,
      pace,
      dialect,
      voiceover,
      voice_id: voiceId,
      status: "draft",
    })
    .select("id")
    .single();
  if (error || !video) {
    console.error("[createVideo] insert video failed", { code: error?.code, message: error?.message });
    return { error: "generic" };
  }

  const { error: versionError } = await supabase
    .from("video_versions")
    .insert({ video_id: video.id, version: 1, scenes: generated.scenes, script: generated.script });
  if (versionError) {
    console.error("[createVideo] insert version failed", { code: versionError.code, message: versionError.message });
    return { error: "generic" };
  }

  revalidatePath("/", "layout");
  redirect({ href: `/videos/${video.id}`, locale });
  return {};
}
