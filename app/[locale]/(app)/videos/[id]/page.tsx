import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getAppContext } from "@/lib/context";
import { exportCostUsd, getFxRate, getPrices } from "@/lib/pricing";
import { briefFor, runtimeInputWithAssets } from "@/lib/motion/app";
import type { Plan } from "@/lib/motion/plan";
import type { MotionSpec } from "@/lib/motion/spec";
import { specRevision, type VersionHistory } from "@/lib/motion/revision";
import type { Video } from "@/lib/types";
import type { ScriptBeat } from "@motiongx/primitives";
import { dimensionsFor } from "@/lib/motion/types";
import { LIVE_BUCKET } from "@/lib/live-engine/protocol";
import { liveRevision } from "@/lib/live-engine/server/versions";
import { listCompanies } from "@/lib/data/companies";
import { companyCaptureId } from "@/lib/live-engine/server/jobs";
import { brandFiles } from "@/lib/live-engine/server/brand-files";
import { Studio, type RenderInfo, type StudioVersion } from "./studio";
import type { CreatingBrand } from "./creating-video";

// Generation ("another direction", change requests) and exports run in `after()` of this route's actions.
export const maxDuration = 800;

export default async function StudioPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const ctx = await getAppContext();
  const { supabase, workspace } = ctx;
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
  if (v?.engine === "live" && v.plan) {
    // live engine: the run's MP4 plays in the same preview box; lines and the plan panel come from its script
    const history = ((v.qa ?? {}) as { history?: { parent_version?: number | null } }).history;
    const mp4Url = v.mp4_path ? ((await supabase.storage.from(LIVE_BUCKET).createSignedUrl(v.mp4_path, 6 * 60 * 60)).data?.signedUrl ?? null) : null;
    current = {
      engine: "live",
      version: v.version,
      revision: liveRevision(v),
      canUndo: Boolean(history?.parent_version),
      plan: { ...(v.plan as Plan), beats: (v.scenes ?? []) as ScriptBeat[] } as Plan,
      beats: (v.scenes ?? []) as ScriptBeat[],
      qa: {},
      mp4Url,
      ...dimensionsFor(video.format),
      fps: 30,
    };
  } else if (v?.spec && v.plan) {
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
        input: await runtimeInputWithAssets(brief, plan, v.spec as MotionSpec),
        plan,
        beats: plan.beats,
        qa: (v.qa ?? {}) as StudioVersion["qa"],
        mixUrl: publicUrl(audio.mix),
        sfxUrl: publicUrl(audio.sfx),
      };
    }
  }

  // the live creating screen shows the brand's logo and its real captured screens while the first version is made
  const company = (await listCompanies(ctx)).find((c) => c.id === video.company_id);
  let screens: string[] = [];
  if (video.status === "generating" && !current) {
    const captureId = await companyCaptureId(video.company_id).catch(() => null);
    const files = captureId ? await brandFiles(workspace.id, captureId).catch(() => null) : null;
    screens = (files?.screens ?? []).map((x) => x.thumb).filter((x): x is string => Boolean(x)).slice(0, 8);
  }
  const brand: CreatingBrand = { name: video.companies?.name ?? "", colors: video.companies?.brand_profiles?.colors ?? [], logoUrl: company?.logo_url ?? null, logoOnDark: company?.logo_on_dark ?? null, screens };

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
      brand={brand}
    />
  );
}
