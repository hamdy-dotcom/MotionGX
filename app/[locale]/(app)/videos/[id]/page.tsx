import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getAppContext } from "@/lib/context";
import { exportCostUsd, getFxRate, getPrices } from "@/lib/pricing";
import { buildVideoProps, type VideoRow } from "@/lib/video/props";
import { Studio, type RenderInfo } from "./studio";

// Exports render in `after()` of the export action on this route.
export const maxDuration = 300;

export default async function StudioPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { supabase, workspace } = await getAppContext();
  const [videoRes, versionRes, renderRes, prices, fx] = await Promise.all([
    supabase.from("videos").select("*, companies(name)").eq("id", id).maybeSingle(),
    supabase.from("video_versions").select("version, scenes").eq("video_id", id).order("version", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("renders").select("id, status, progress, output_path, error, created_at").eq("video_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    getPrices(supabase),
    getFxRate(supabase, workspace.currency_code),
  ]);

  const video = videoRes.data as (VideoRow & { companies: { name: string } | null }) | null;
  if (!video) notFound();
  const built = await buildVideoProps(supabase, video, versionRes.data?.scenes ?? []);
  if (!built) notFound();

  const r = renderRes.data;
  let downloadUrl: string | null = null;
  if (r?.status === "done" && r.output_path) {
    downloadUrl = (await supabase.storage.from("renders").createSignedUrl(r.output_path, 60 * 60, { download: true })).data?.signedUrl ?? null;
  }
  const render: RenderInfo | null = r ? { id: r.id, status: r.status, progress: Number(r.progress ?? 0), downloadUrl } : null;

  return (
    <Studio
      key={video.id}
      video={video}
      companyName={video.companies?.name ?? ""}
      version={versionRes.data?.version ?? 0}
      initialProps={built.props}
      musicMood={built.track?.mood ?? null}
      costUsd={exportCostUsd(video.length_s, video.voiceover, prices)}
      fxRate={fx}
      currency={workspace.currency_code}
      initialRender={render}
    />
  );
}
