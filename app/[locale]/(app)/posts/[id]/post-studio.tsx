"use client";

// The post page, as in the approved prototype: while the post is made, the live creation studio; then the results —
// one tab per platform, the post exactly as that platform shows it (phone / desktop), its text, and the actions.
import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { formatDate, formatMoney } from "@/lib/format";
import { toLocal } from "@/lib/pricing";
import { CANVAS_SIZE, POST_PLATFORM_INFO, type PostPlatformKey } from "@/lib/posts/config";
import { PLATFORM_ICON } from "@/lib/posts/mockups";
import type { PostContent } from "@/lib/posts/server/versions";
import { Heading } from "@/components/heading";
import { SpinnerIcon } from "@/components/icons";
import { cancelPost, downloadPost, requestPostChange, retryPost, savePostText, undoPost } from "./actions";
import { CreatingStudio } from "./creating-studio";
import { PlatformPreview, type PreviewBrand } from "./platform-preview";

type Post = { id: string; title: string; brief: string; type: string; platforms: string[]; status: "generating" | "ready" | "failed"; generation: Record<string, unknown>; createdAt: string; company: string };
type Version = { version: number; content: PostContent; parent: number | null; origin: string; request: string | null };

const Icon = ({ p, size = 16 }: { p: string; size?: number }) => <span aria-hidden="true" className="inline-flex" dangerouslySetInnerHTML={{ __html: PLATFORM_ICON(p, size) }} />;

export function PostStudio({ post, brand, version, versions, images, liveImage, priceUsd, charged, fxRate, currency, locale }: { post: Post; brand: PreviewBrand; version: Version | null; versions: number[]; images: Record<string, string[]>; liveImage: string | null; priceUsd: number; charged: boolean; fxRate: number; currency: string; locale: string }) {
  const t = useTranslations("posts");
  const ts = useTranslations("posts.studio");
  const tc = useTranslations("common");
  const te = useTranslations("aiErrors");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<{ tone: "error" | "info" | "ok"; text: string } | null>(null);
  const platforms = (version ? Object.keys(version.content.platforms ?? {}) : post.platforms) as PostPlatformKey[];
  const [tab, setTab] = useState<PostPlatformKey>(platforms[0]);
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [slide, setSlide] = useState(0);
  const [request, setRequest] = useState("");
  const generating = post.status === "generating";
  const stage = String(post.generation.stage ?? "queued");
  const money = (usd: number) => formatMoney(toLocal(usd, fxRate), currency, locale);

  // progress: the page re-reads the post every 2 s while its job runs
  useEffect(() => {
    if (!generating) return;
    const poll = setInterval(() => router.refresh(), 2000);
    return () => clearInterval(poll);
  }, [generating, router]);

  const run = (fn: () => Promise<{ ok: boolean; error?: string; aiError?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) setNotice({ tone: "error", text: r.aiError ? te(r.aiError as Parameters<typeof te>[0]) : r.error === "insufficient" ? t("insufficient") : tc("error") });
      else { setNotice(null); after?.(); router.refresh(); }
    });

  const back = (
    <Link href="/posts" className="text-sm text-ink-muted hover:text-primary-dark">
      ← {t("allPosts")}
    </Link>
  );

  // ── while it is being made: the live studio ──
  if (generating)
    return (
      <div>
        {back}
        <CreatingStudio
          generation={post.generation}
          imageUrl={liveImage}
          brand={brand}
          platforms={post.platforms as PostPlatformKey[]}
          change={post.generation.mode === "edit"}
          cancelling={pending}
          onCancel={() => run(() => cancelPost(post.id), () => setNotice({ tone: "info", text: ts("cancelled") }))}
        />
        {notice ? <Notice {...notice} /> : null}
      </div>
    );

  const errorNote =
    stage === "error" || stage === "cancelled" ? (
      <p role="alert" className="mt-4 rounded-2xl bg-danger-bg px-4 py-3 text-sm text-danger-ink">
        {stage === "cancelled" ? ts("cancelled") : post.generation.error === "no_capture" ? t("noCapture") : version ? t("changeFailed") : t("failed")}
      </p>
    ) : null;

  if (!version)
    return (
      <div>
        {back}
        <Heading as="h1" className="mt-2 text-3xl">{post.title}</Heading>
        {errorNote}
        {post.status === "failed" && post.generation.error !== "no_capture" ? (
          <button type="button" disabled={pending} onClick={() => run(() => retryPost(post.id))} className="btn btn-primary mt-4">
            {pending ? <SpinnerIcon className="size-4" /> : null}
            {t("create")}
          </button>
        ) : null}
        {notice ? <Notice {...notice} /> : null}
      </div>
    );

  // ── the results ──
  const content = version.content;
  const current = content.platforms[tab] ?? { text: "", hashtags: [], canvas: null };
  const slides = current.canvas ? (images[current.canvas] ?? []) : [];
  const shown = Math.min(slide, Math.max(0, slides.length - 1));
  const size = current.canvas ? CANVAS_SIZE[current.canvas] : null;

  return (
    <div>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          {back}
          <Heading as="h1" className="mt-2 text-3xl sm:text-4xl">{post.title}</Heading>
          <p className="mt-1.5 text-ink-2">
            {post.company} · {t(`types.${post.type as "single"}`)} · {formatDate(post.createdAt, locale)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-success-bg px-3 py-1.5 text-xs font-semibold text-success-ink">● {ts("readyChip")}</span>
          {versions.length > 1 ? (
            <select value={version.version} onChange={(e) => router.push(`/posts/${post.id}?v=${e.target.value}`)} className="chip chip-white" aria-label={t("version", { n: version.version })}>
              {versions.map((n) => (
                <option key={n} value={n}>{t("version", { n })}</option>
              ))}
            </select>
          ) : (
            <span className="chip chip-white">{t("version", { n: version.version })}</span>
          )}
          {version.parent ? (
            <button type="button" disabled={pending} onClick={() => run(() => undoPost(post.id, version.version))} className="chip chip-white">{t("undo")}</button>
          ) : null}
        </div>
      </div>
      {errorNote}
      {notice ? <Notice {...notice} /> : null}

      <div role="tablist" aria-label={t("platforms")} className="my-5 flex flex-wrap gap-2">
        {platforms.map((p) => (
          <button key={p} type="button" role="tab" aria-selected={tab === p} onClick={() => { setTab(p); setSlide(0); }} className="chip chip-white">
            <Icon p={p} />
            {t(`platform.${p}`)}
          </button>
        ))}
      </div>

      <div className={`grid items-start gap-6 ${device === "desktop" ? "" : "lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]"}`}>
        <section className="panel">
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
            <p className="label">{ts("previewTitle")}</p>
            <div role="radiogroup" aria-label={ts("previewTitle")} className="flex gap-2">
              {(["mobile", "desktop"] as const).map((d) => (
                <button key={d} type="button" role="radio" aria-checked={device === d} onClick={() => setDevice(d)} className="chip chip-white">
                  {t(`preview.${d}`)}
                </button>
              ))}
            </div>
          </div>
          <PlatformPreview key={`${tab}-${version.version}-${device}-${shown}`} platform={tab} device={device} image={slides[shown] ?? null} text={current.text} hashtags={current.hashtags} brand={brand} />
          {slides.length > 1 ? (
            <div className="mt-3 flex items-center justify-center gap-3">
              <button type="button" onClick={() => setSlide(Math.max(0, shown - 1))} disabled={shown === 0} className="chip chip-white" aria-label="›">→</button>
              <span className="text-sm text-ink-muted">{ts("slide", { n: shown + 1, total: slides.length })}</span>
              <button type="button" onClick={() => setSlide(Math.min(slides.length - 1, shown + 1))} disabled={shown === slides.length - 1} className="chip chip-white" aria-label="‹">←</button>
            </div>
          ) : null}
          {slides.length ? (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  run(async () => {
                    const r = await downloadPost(post.id, version.version, current.canvas);
                    if (r.ok) await saveFiles(r.files);
                    return r;
                  })
                }
                className="btn btn-primary mt-4 w-full justify-center"
              >
                {pending ? <SpinnerIcon className="size-4" /> : "⬇"} {slides.length > 1 ? t("downloadAll") : t("download")}
                {size ? <span dir="ltr">· {size.join("×")}</span> : null}
              </button>
              <p className="mt-2 text-center text-xs text-ink-muted">{charged ? t("chargedNote") : `${money(priceUsd)} — ${t("priceNote")}`}</p>
            </>
          ) : null}
        </section>

        <TextPanel
          key={`${tab}-${version.version}`}
          platform={tab}
          text={current.text}
          hashtags={current.hashtags}
          disabled={pending}
          onSave={(text, tags) => run(() => savePostText(post.id, version.version, tab, text, tags))}
          request={request}
          setRequest={setRequest}
          onRequest={() => run(() => requestPostChange(post.id, version.version, request), () => setRequest(""))}
        />
      </div>
    </div>
  );
}

function Notice({ tone, text }: { tone: "error" | "info" | "ok"; text: string }) {
  const style = tone === "error" ? "bg-danger-bg text-danger-ink" : tone === "ok" ? "bg-success-bg text-success-ink" : "bg-primary-light text-primary-dark";
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`mt-4 rounded-2xl px-4 py-3 text-sm ${style}`}>
      {text}
    </p>
  );
}

/** one platform's text: shown, copied or edited (a new version), and "Request a change" under it */
function TextPanel({ platform, text, hashtags, disabled, onSave, request, setRequest, onRequest }: { platform: PostPlatformKey; text: string; hashtags: string[]; disabled: boolean; onSave: (text: string, tags: string[]) => void; request: string; setRequest: (s: string) => void; onRequest: () => void }) {
  const t = useTranslations("posts");
  const ts = useTranslations("posts.studio");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const [tags, setTags] = useState(hashtags.join(" "));
  const [copied, setCopied] = useState(false);
  const full = `${text}${hashtags.length ? `\n\n${hashtags.map((h) => `#${h}`).join(" ")}` : ""}`;
  const max = POST_PLATFORM_INFO[platform]?.maxChars ?? 2200;
  const length = editing ? draft.length + tags.split(/\s+/).filter(Boolean).reduce((n, h) => n + h.length + 2, 0) : full.length;
  return (
    <section className="rounded-panel bg-field p-5">
      <p className="label mb-3">{ts("textOf", { platform: t(`platform.${platform}`) })}</p>
      {editing ? (
        <>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={10} dir="auto" className="w-full resize-y rounded-[20px] bg-white p-4 text-sm leading-relaxed text-navy outline-none focus:shadow-[inset_0_0_0_1.5px_var(--primary)]" />
          <label className="mt-3 block text-sm">
            <span className="label mb-1 block">{t("hashtags")}</span>
            <input value={tags} onChange={(e) => setTags(e.target.value)} dir="auto" className="w-full rounded-full bg-white px-4 py-2 text-sm text-navy outline-none focus:shadow-[inset_0_0_0_1.5px_var(--primary)]" />
          </label>
        </>
      ) : (
        <p dir="auto" className="whitespace-pre-wrap leading-[1.8] text-navy">{full}</p>
      )}
      <p className={`mt-3 text-xs ${length > max ? "text-danger-ink" : "text-ink-muted"}`}>
        {t("characters", { n: length, max })}
        {length > max ? ` · ${t("tooLong")}` : ""}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {editing ? (
          <>
            <button type="button" disabled={disabled} onClick={() => { onSave(draft, tags.split(/\s+/).filter(Boolean)); setEditing(false); }} className="btn btn-primary">{t("save")}</button>
            <button type="button" onClick={() => { setEditing(false); setDraft(text); setTags(hashtags.join(" ")); }} className="btn btn-white">{t("cancel")}</button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(full).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              }}
              className="btn btn-primary"
            >
              {copied ? t("copied") : t("copy")}
            </button>
            <button type="button" disabled={disabled} onClick={() => setEditing(true)} className="btn btn-white">{t("editText")}</button>
          </>
        )}
      </div>
      <div className="my-5 border-t border-dashed border-black/10" />
      <label htmlFor="request" className="label mb-2 block">{t("requestChange")}</label>
      <textarea id="request" value={request} onChange={(e) => setRequest(e.target.value)} rows={3} maxLength={1000} placeholder={t("requestPlaceholder")} className="w-full resize-y rounded-[20px] bg-white p-4 text-sm text-navy outline-none placeholder:text-ink-muted/70 focus:shadow-[inset_0_0_0_1.5px_var(--primary)]" />
      <div className="mt-3">
        <button type="button" disabled={disabled || !request.trim()} onClick={onRequest} className="btn btn-primary">{t("send")}</button>
      </div>
    </section>
  );
}

/** signed download links, one after another (the browser saves each file) */
async function saveFiles(files: { url: string; name: string }[]) {
  for (const f of files) {
    const a = document.createElement("a");
    a.href = f.url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    await new Promise((ok) => setTimeout(ok, 400));
  }
}
