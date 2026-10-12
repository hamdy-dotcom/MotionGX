import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getAppContext } from "@/lib/context";
import { exportCostUsd, getFxRate, getPrices } from "@/lib/pricing";
import { briefFor, runtimeInputFor } from "@/lib/motion/app";
import type { Plan } from "@/lib/motion/plan";
import type { MotionSpec } from "@/lib/motion/spec";
import { specRevision, type VersionHistory } from "@/lib/motion/revision";
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

  // Phase 3C versions carry a MotionSpec; older (3B code-based) versions can't be previewed — the studio
  // offers "another direction" for those.
  let current: StudioVersion | null = null;
  const v = versionRes.data;
  if (v?.spec && v.plan) {
    const brief = await briefFor(video);
    const plan = { ...(v.plan as Plan), beats: (v.scenes ?? []) as ScriptBeat[] } as Plan;
    const audio = (v.audio ?? {}) as { mix?: string; sfx?: string };
    const publicUrl = (p?: string) => (p ? supabase.storage.from("music").getPublicUrl(p).data.publicUrl : null);
    if (brief) {
      const history = ((v.qa ?? {}) as { history?: VersionHistory }).history;
      current = {
        version: v.version,
        revision: specRevision(v.spec),
        canUndo: Boolean(history?.parent_version && history.inverse_patch),
        spec: v.spec as MotionSpec,
        custom: (v.custom_js ?? {}) as Record<string, string>,
        input: runtimeInputFor(brief, plan),
        plan,
        beats: plan.beats,
        qa: (v.qa ?? {}) as StudioVersion["qa"],
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
