import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getAppContext } from "@/lib/context";
import { exportCostUsd, getFxRate, getPrices } from "@/lib/pricing";
import { briefFor } from "@/lib/motion/app";
import { runtimeInput } from "@/lib/motion/pipeline";
import type { Treatment } from "@/lib/motion/director";
import type { QaReport } from "@/lib/motion/qa";
import type { Video } from "@/lib/types";
import type { ScriptBeat } from "@motiongx/primitives";
import { Studio, type RenderInfo, type StudioVersion } from "./studio";

// Generation ("another direction", change requests) and exports run in `after()` of this route's actions.
export const maxDuration = 800;

export default async function StudioPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { supabase, workspace } = await getAppContext();
  const [videoRes, versionRes, renderRes, prices, fx] = await Promise.all([
    supabase.from("videos").select("*, companies(name, brand_profiles(colors))").eq("id", id).maybeSingle(),
    supabase.from("video_versions").select("*").eq("video_id", id).order("version", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("renders").select("id, status, progress, output_path, error, created_at").eq("video_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    getPrices(supabase),
    getFxRate(supabase, workspace.currency_code),
  ]);

  type Row = Video & { generation?: Record<string, unknown> | null; companies: { name: string; brand_profiles: { colors: { hex: string }[] } | null } | null };
  const video = videoRes.data as Row | null;
  if (!video) notFound();

  // Only versions with a generated composition can be previewed (scene-kit versions from Phase 3 cannot).
  let current: StudioVersion | null = null;
  const v = versionRes.data;
  if (v?.composition_js && v.treatment) {
    const brief = await briefFor(video);
    const treatment = v.treatment as Treatment;
    const script = { title: (v.script as { title?: string } | null)?.title ?? video.title, beats: (v.scenes ?? []) as ScriptBeat[] };
    const audio = (v.audio ?? {}) as { mix?: string; sfx?: string; hits?: number[] };
    const publicUrl = (p?: string) => (p ? supabase.storage.from("music").getPublicUrl(p).data.publicUrl : null);
    if (brief) {
      current = {
        version: v.version,
        js: v.composition_js as string,
        input: runtimeInput(brief, treatment.energy, script),
        treatment,
        beats: script.beats,
        qa: (v.qa ?? []) as QaReport[],
        mixUrl: publicUrl(audio.mix),
        sfxUrl: publicUrl(audio.sfx),
      };
    }
  }

  const r = renderRes.data;
  let downloadUrl: string | null = null;
  if (r?.status === "done" && r.output_path) {
    downloadUrl = (await supabase.storage.from("renders").createSignedUrl(r.output_path, 60 * 60, { download: true })).data?.signedUrl ?? null;
  }
  const render: RenderInfo | null = r ? { id: r.id, status: r.status, progress: Number(r.progress ?? 0), downloadUrl } : null;

  return (
    <Studio
      key={`${video.id}-${current?.version ?? 0}`}
      video={video}
      generation={video.generation ?? null}
      companyName={video.companies?.name ?? ""}
      companyColors={video.companies?.brand_profiles?.colors ?? []}
      current={current}
      costUsd={exportCostUsd(video.length_s, video.voiceover, prices)}
      fxRate={fx}
      currency={workspace.currency_code}
      initialRender={render}
    />
  );
}
