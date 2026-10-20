import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getAppContext } from "@/lib/context";
import { formatDate } from "@/lib/format";
import { LIVE_BUCKET } from "@/lib/live-engine/protocol";
import type { PostContent } from "@/lib/posts/server/versions";
import { Heading, boldTag } from "@/components/heading";
import { ArrowIcon, PlusIcon } from "@/components/icons";

const STATUS_STYLE = { generating: "bg-primary-lavender text-primary-dark", ready: "bg-success-bg text-success-ink", failed: "bg-danger-bg text-danger-ink" } as const;

export default async function PostsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { supabase, workspace } = await getAppContext();
  const t = await getTranslations("posts");
  const { data } = await supabase.from("posts").select("id, title, type, platforms, status, created_at, companies(name), post_versions(version, content)").eq("workspace_id", workspace.id).order("created_at", { ascending: false }).limit(48);
  type Row = { id: string; title: string; type: string; platforms: string[]; status: keyof typeof STATUS_STYLE; created_at: string; companies: { name: string } | null; post_versions: { version: number; content: PostContent }[] };
  const posts = (data ?? []) as unknown as Row[];
  // the first slide of each post's newest version, as a thumbnail
  const thumbPath = (p: Row) => { const v = [...(p.post_versions ?? [])].sort((a, b) => b.version - a.version)[0]; const r = v?.content?.renders ?? {}; return r["4:5"]?.[0] ?? r["9:16"]?.[0] ?? r["16:9"]?.[0] ?? null; };
  const paths = posts.map(thumbPath).filter((x): x is string => Boolean(x));
  const { data: signed } = paths.length ? await supabase.storage.from(LIVE_BUCKET).createSignedUrls(paths, 3600) : { data: [] };
  const urlOf = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Heading as="h1" className="text-3xl sm:text-4xl">
            {t.rich("title", boldTag)}
          </Heading>
          <p className="mt-3 max-w-2xl leading-relaxed text-ink-muted">{t("subtitle")}</p>
        </div>
        <Link href="/posts/new" className="btn btn-primary">
          <PlusIcon className="size-4" />
          {t("newPost")}
        </Link>
      </div>
      {posts.length === 0 ? (
        <div className="panel mt-6 flex flex-col items-center gap-4 py-10 text-center">
          <p className="text-ink-muted">{t("empty")}</p>
          <Link href="/posts/new" className="btn btn-primary">
            {t("newPost")}
            <ArrowIcon className="size-4" />
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => {
            const path = thumbPath(p), url = path ? urlOf.get(path) : null;
            return (
              <li key={p.id}>
                <Link href={`/posts/${p.id}`} className="panel block h-full transition-shadow hover:shadow-[inset_0_0_0_1.5px_var(--primary)]">
                  <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-field">
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
                      <img src={url} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center p-6 text-center text-sm text-ink-muted">{p.type === "text" ? t("noImage") : t(`status.${p.status}`)}</div>
                    )}
                  </div>
                  <p className="mt-3 line-clamp-2 font-semibold">{p.title}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {p.companies?.name} · {t(`types.${p.type as "single"}`)} · {formatDate(p.created_at, locale)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[p.status]}`}>{t(`status.${p.status}`)}</span>
                    {p.platforms.map((x) => (
                      <span key={x} className="rounded-full bg-field px-2.5 py-0.5 text-xs text-ink-2" dir="ltr">
                        {t(`platform.${x as "x"}`)}
                      </span>
                    ))}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
