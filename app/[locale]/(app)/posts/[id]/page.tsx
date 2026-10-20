import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getAppContext } from "@/lib/context";
import { getFxRate } from "@/lib/pricing";
import { listCompanies } from "@/lib/data/companies";
import { getPostPriceUsd } from "@/lib/posts/price";
import { LIVE_BUCKET } from "@/lib/live-engine/protocol";
import type { PostContent } from "@/lib/posts/server/versions";
import { PostStudio } from "./post-studio";

// "Request a change" / "Try again" start the worker job in `after()` of this route's actions.
export const maxDuration = 300;

export default async function PostPage({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: Promise<{ v?: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { v } = await searchParams;
  const ctx = await getAppContext();
  const { supabase, workspace } = ctx;

  const [postRes, versionsRes, priceUsd, fx, chargedRes] = await Promise.all([
    supabase.from("posts").select("*, companies(name)").eq("id", id).maybeSingle(),
    supabase.from("post_versions").select("version, content, origin, parent_version, request, created_at").eq("post_id", id).order("version", { ascending: false }).limit(30),
    getPostPriceUsd(supabase),
    getFxRate(supabase, workspace.currency_code),
    supabase.from("wallet_ledger").select("id", { count: "exact", head: true }).eq("ref_post_id", id).eq("kind", "export"),
  ]);
  const post = postRes.data as { id: string; company_id: string; title: string; brief: string; type: string; platforms: string[]; status: "generating" | "ready" | "failed"; generation: Record<string, unknown> | null; created_at: string; companies: { name: string } | null } | null;
  if (!post) notFound();
  type Row = { version: number; content: PostContent; origin: string; parent_version: number | null; request: string | null; created_at: string };
  const versions = (versionsRes.data ?? []) as Row[];
  const shown = versions.find((x) => String(x.version) === v) ?? versions[0] ?? null;

  // the slides as signed preview links (members read their workspace's files)
  const images: Record<string, string[]> = {};
  for (const [canvas, paths] of Object.entries(shown?.content.renders ?? {})) {
    const { data } = paths.length ? await supabase.storage.from(LIVE_BUCKET).createSignedUrls(paths, 6 * 3600) : { data: [] };
    images[canvas] = (data ?? []).map((d) => d.signedUrl ?? "").filter(Boolean);
  }

  const company = (await listCompanies(ctx)).find((c) => c.id === post.company_id);
  const brand = { name: company?.name ?? post.companies?.name ?? "", logoUrl: company?.logo_url ?? null, logoOnDark: company?.logo_on_dark ?? null, colors: company?.brand_profiles?.colors ?? [], tagline: company?.brand_profiles?.tagline ?? null };

  // while the post is being made: its newest image, the moment the worker uploads it (the studio shows it forming)
  let liveImage: string | null = null;
  const g = (post.generation ?? {}) as { job_id?: string; progress?: { image?: { path: string }[] } };
  const latest = g.progress?.image?.at(-1)?.path;
  if (post.status === "generating" && g.job_id && latest) liveImage = (await supabase.storage.from(LIVE_BUCKET).createSignedUrl(`${workspace.id}/posts/${post.id}/${g.job_id}/${latest}`, 3600)).data?.signedUrl ?? null;
  return (
    <PostStudio
      brand={brand}
      key={`${post.id}-${shown?.version ?? 0}-${post.status}`}
      post={{ id: post.id, title: post.title, brief: post.brief, type: post.type, platforms: post.platforms, status: post.status, generation: post.generation ?? {}, createdAt: post.created_at, company: post.companies?.name ?? "" }}
      version={shown ? { version: shown.version, content: shown.content, parent: shown.parent_version, origin: shown.origin, request: shown.request } : null}
      versions={versions.map((x) => x.version)}
      images={images}
      liveImage={liveImage}
      priceUsd={priceUsd}
      charged={(chargedRes.count ?? 0) > 0}
      fxRate={fx}
      currency={workspace.currency_code}
      locale={locale}
    />
  );
}
