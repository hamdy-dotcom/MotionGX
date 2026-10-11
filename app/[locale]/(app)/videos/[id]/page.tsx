import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getAppContext } from "@/lib/context";
import { exportCostUsd, getFxRate, getPrices } from "@/lib/pricing";
import type { BrandProfile, Scene, Video } from "@/lib/types";
import { Studio } from "./studio";

export default async function StudioPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { supabase, workspace } = await getAppContext();
  const [videoRes, versionRes, prices, fx] = await Promise.all([
    supabase
      .from("videos")
      .select("*, companies(name, brand_profiles(colors, fonts, tone, tagline)), voices(display_name)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("video_versions")
      .select("version, scenes")
      .eq("video_id", id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getPrices(supabase),
    getFxRate(supabase, workspace.currency_code),
  ]);

  const video = videoRes.data as
    | (Video & {
        companies: { name: string; brand_profiles: BrandProfile | BrandProfile[] | null } | null;
        voices: { display_name: string } | null;
      })
    | null;
  if (!video) notFound();

  const brandRaw = video.companies?.brand_profiles;
  const brand = Array.isArray(brandRaw) ? brandRaw[0] : brandRaw;

  return (
    <Studio
      key={video.id}
      video={video}
      companyName={video.companies?.name ?? ""}
      brand={brand ?? null}
      voiceName={video.voices?.display_name ?? null}
      version={versionRes.data?.version ?? 0}
      initialScenes={(versionRes.data?.scenes ?? []) as Scene[]}
      costUsd={exportCostUsd(video.length_s, video.voiceover, prices)}
      fxRate={fx}
      currency={workspace.currency_code}
    />
  );
}
