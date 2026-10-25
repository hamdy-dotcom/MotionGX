import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getAppContext } from "@/lib/context";
import { getFxRate } from "@/lib/pricing";
import { listCompanies } from "@/lib/data/companies";
import { billed, estimate } from "@/lib/billing";
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

  const [postRes, versionsRes, fx, holdsRes] = await Promise.all([
    supabase.from("posts").select("*, companies(name)").eq("id", id).maybeSingle(),
    supabase.from("post_versions").select("version, content, origin, parent_version, request, created_at").eq("post_id", id).order("version", { ascending: false }).limit(30),
    getFxRate(supabase, workspace.currency_code),
    supabase.from("wallet_holds").select("charged_usd").eq("post_id", id).eq("status", "charged"),
  ]);
  const post = postRes.data as { id: string; company_id: string; title: string; brief: string; type: string; platforms: string[]; status: "generating" | "ready" | "failed"; generation: Record<string, unknown> | null; created_at: string; placement?: string | null; slides?: number | null; companies: { name: string } | null } | null;
  if (!post) notFound();
  // what it cost so far, what a change would cost, and the live cost of the job running now — all as billed
  const paidUsd = (holdsRes.data ?? []).reduce((a, h) => a + Number(h.charged_usd ?? 0), 0);
  const change = await estimate(workspace.id, { kind: "post", type: post.type as "single", placement: post.placement, slides: post.slides, change: true });
  const generation = { ...(post.generation ?? {}), cost_usd: await billed(workspace.id, "post", Number((post.generation ?? {}).cost_usd ?? 0)) };
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
  const brand = { name: company?.name ?? post.companies?.name ?? "", logoUrl: company?.logo_url ?? null, logoOnDark: company?.logo_on_dark ?? null, colors: company?.brand_profiles?.colors ?? [], tagline: company?.brand_profiles?.tagline ?? null, site: company?.website_url ?? null };

  // while the post is being made: its newest image, the moment the worker uploads it (the studio shows it forming)
  let liveImage: string | null = null;
  const g = (post.generation ?? {}) as { job_id?: string; progress?: { image?: { path: string }[] } };
  const latest = g.progress?.image?.at(-1)?.path;
  if (post.status === "generating" && g.job_id && latest) liveImage = (await supabase.storage.from(LIVE_BUCKET).createSignedUrl(`${workspace.id}/posts/${post.id}/${g.job_id}/${latest}`, 3600)).data?.signedUrl ?? null;
  return (
    <PostStudio
      brand={brand}
      key={`${post.id}-${shown?.version ?? 0}-${post.status}`}
      post={{ id: post.id, title: post.title, brief: post.brief, type: post.type, platforms: post.platforms, status: post.status, generation, createdAt: post.created_at, company: post.companies?.name ?? "", placement: (post as { placement?: string }).placement === "story" || (post as { placement?: string }).placement === "cover" ? ((post as { placement?: string }).placement as "story" | "cover") : "feed" }}
      version={shown ? { version: shown.version, content: shown.content, parent: shown.parent_version, origin: shown.origin, request: shown.request } : null}
      versions={versions.map((x) => x.version)}
      images={images}
      liveImage={liveImage}
      changeUsd={change.usd}
      paidUsd={paidUsd}
      fxRate={fx}
      currency={workspace.currency_code}
      locale={locale}
    />
  );
}
