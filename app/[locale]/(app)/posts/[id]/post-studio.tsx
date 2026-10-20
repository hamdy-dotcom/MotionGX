"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { formatDate, formatMoney } from "@/lib/format";
import { toLocal } from "@/lib/pricing";
import { POST_PLATFORM_INFO, type PostPlatformKey } from "@/lib/posts/config";
import type { PostContent } from "@/lib/posts/server/versions";
import { Heading } from "@/components/heading";
import { ArrowIcon, CheckIcon, ChevronIcon, DownloadIcon, SendIcon, SpinnerIcon } from "@/components/icons";
import { downloadPost, requestPostChange, retryPost, savePostText, undoPost } from "./actions";

type Post = { id: string; title: string; brief: string; type: string; platforms: string[]; status: "generating" | "ready" | "failed"; generation: Record<string, unknown>; createdAt: string; company: string };
type Version = { version: number; content: PostContent; parent: number | null; origin: string; request: string | null };

const STATUS_STYLE = { generating: "bg-primary-lavender text-primary-dark", ready: "bg-success-bg text-success-ink", failed: "bg-danger-bg text-danger-ink" };

export function PostStudio({ post, version, versions, images, priceUsd, charged, fxRate, currency, locale }: { post: Post; version: Version | null; versions: number[]; images: Record<string, string[]>; priceUsd: number; charged: boolean; fxRate: number; currency: string; locale: string }) {
  const t = useTranslations("posts");
  const tc = useTranslations("common");
  const te = useTranslations("aiErrors");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<{ tone: "error" | "info" | "ok"; text: string } | null>(null);
  const platforms = (version ? Object.keys(version.content.platforms ?? {}) : post.platforms) as PostPlatformKey[];
  const [tab, setTab] = useState<PostPlatformKey>(platforms[0]);
  const [request, setRequest] = useState("");
  const generating = post.status === "generating";
  const stage = String(post.generation.stage ?? "queued");
  const money = (usd: number) => formatMoney(toLocal(usd, fxRate), currency, locale);

  // progress: the page re-reads the post every 3 s while its job runs
  useEffect(() => {
    if (!generating) return;
    const poll = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(poll);
  }, [generating, router]);

  const run = (fn: () => Promise<{ ok: boolean; error?: string; aiError?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) setNotice({ tone: "error", text: r.aiError ? te(r.aiError as Parameters<typeof te>[0]) : r.error === "insufficient" ? t("insufficient") : tc("error") });
      else { setNotice(null); after?.(); router.refresh(); }
    });

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <Link href="/posts" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-primary-dark">
          <ChevronIcon className="size-4 rotate-180" />
          {t("allPosts")}
        </Link>
        <Heading as="h1" className="mt-2 text-2xl sm:text-3xl">
          {post.title}
        </Heading>
        <p className="mt-1 text-sm text-ink-muted">
          {post.company} · {t(`types.${post.type as "single"}`)} · {t("createdAt", { date: formatDate(post.createdAt, locale) })}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLE[post.status]}`}>
          <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
          {t(`status.${post.status}`)}
        </span>
        {versions.length > 1 && version ? (
          <label className="flex items-center gap-2 text-sm">
            <span className="sr-only">{t("version", { n: version.version })}</span>
            <select value={version.version} onChange={(e) => router.push(`/posts/${post.id}?v=${e.target.value}`)} className="rounded-full bg-white px-3 py-1.5 text-sm">
              {versions.map((n) => (
                <option key={n} value={n}>
                  {t("version", { n })}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {version?.parent && !generating ? (
          <button type="button" disabled={pending} onClick={() => run(() => undoPost(post.id, version.version))} className="btn btn-white">
            {t("undo")}
          </button>
        ) : null}
      </div>
    </div>
  );

  const progress = generating ? (
    <div className="panel flex items-center gap-3" role="status" aria-live="polite">
      <SpinnerIcon className="size-5 text-primary" />
      <div>
        <p className="font-semibold">{t(`stage.${(["queued", "write", "images", "design", "slides"].includes(stage) ? stage : "queued") as "queued"}`)}</p>
        <p className="text-sm text-ink-muted">{t("working")}</p>
      </div>
    </div>
  ) : null;

  const errorNote = !generating && stage === "error" ? (
    <p role="alert" className="rounded-2xl bg-danger-bg px-4 py-3 text-sm text-danger-ink">
      {post.generation.error === "no_capture" ? t("noCapture") : version ? t("changeFailed") : t("failed")}
    </p>
  ) : null;

  if (!version) {
    return (
      <div className="space-y-6">
        {header}
        {progress}
        {errorNote}
        {post.status === "failed" && post.generation.error !== "no_capture" ? (
          <button type="button" disabled={pending} onClick={() => run(() => retryPost(post.id))} className="btn btn-primary">
            {pending ? <SpinnerIcon className="size-4" /> : null}
            {t("create")}
          </button>
        ) : null}
        {notice ? <Notice {...notice} /> : null}
      </div>
    );
  }

  const content = version.content;
  const current = content.platforms[tab] ?? { text: "", hashtags: [], canvas: null };
  const slides = current.canvas ? (images[current.canvas] ?? []) : [];

  return (
    <div className="space-y-6">
      {header}
      {progress}
      {errorNote}
      {notice ? <Notice {...notice} /> : null}

      <div role="tablist" aria-label={t("platforms")} className="flex flex-wrap gap-2">
        {platforms.map((p) => (
          <button key={p} type="button" role="tab" aria-selected={tab === p} onClick={() => setTab(p)} className="chip chip-white" dir="ltr">
            {t(`platform.${p}`)}
          </button>
        ))}
      </div>

      <div role="tabpanel" className={`grid gap-6 ${slides.length ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : ""} lg:items-start`}>
        {slides.length ? (
          <SlideViewer
            key={`${tab}-${version.version}`}
            urls={slides}
            canvas={current.canvas!}
            alt={content.alt_text}
            onDownload={() =>
              run(async () => {
                const r = await downloadPost(post.id, version.version, current.canvas);
                if (r.ok) await saveFiles(r.files);
                return r;
              })
            }
            pending={pending}
            label={slides.length > 1 ? t("downloadAll") : t("download")}
            priceNote={charged ? t("chargedNote") : `${t("price")}: ${money(priceUsd)} — ${t("priceNote")}`}
          />
        ) : null}
        <TextPanel key={`${tab}-${version.version}`} platform={tab} text={current.text} hashtags={current.hashtags} disabled={generating || pending} onSave={(text, tags) => run(() => savePostText(post.id, version.version, tab, text, tags))} />
      </div>

      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          if (!request.trim()) return;
          run(() => requestPostChange(post.id, version.version, request), () => setRequest(""));
        }}
      >
        <label htmlFor="request" className="label mb-3 block">
          {t("requestChange")}
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <textarea id="request" value={request} onChange={(e) => setRequest(e.target.value)} rows={2} maxLength={1000} disabled={generating} placeholder={t("requestPlaceholder")} className="min-h-12 w-full resize-y rounded-[22px] bg-white p-3 text-sm text-navy outline-none placeholder:text-ink-muted/70 focus:shadow-[inset_0_0_0_1.5px_var(--primary)]" />
          <button type="submit" disabled={generating || pending || !request.trim()} className="btn btn-primary shrink-0">
            {pending ? <SpinnerIcon className="size-4" /> : <SendIcon className="size-4" />}
            {t("send")}
          </button>
        </div>
      </form>
    </div>
  );
}

function Notice({ tone, text }: { tone: "error" | "info" | "ok"; text: string }) {
  const style = tone === "error" ? "bg-danger-bg text-danger-ink" : tone === "ok" ? "bg-success-bg text-success-ink" : "bg-primary-light text-primary-dark";
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-2xl px-4 py-3 text-sm ${style}`}>
      {text}
    </p>
  );
}

/** the slides of one canvas, one at a time, with the download button */
function SlideViewer({ urls, canvas, alt, onDownload, pending, label, priceNote }: { urls: string[]; canvas: string; alt: string; onDownload: () => void; pending: boolean; label: string; priceNote: string }) {
  const t = useTranslations("posts");
  const [i, setI] = useState(0);
  const ratio = canvas === "9:16" ? "aspect-[9/16]" : canvas === "16:9" ? "aspect-[16/9]" : "aspect-[4/5]";
  return (
    <section className="panel">
      <div className={`relative mx-auto w-full overflow-hidden rounded-2xl bg-navy ${ratio} ${canvas === "9:16" ? "max-w-sm" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URLs, shown as they are */}
        <img src={urls[i]} alt={alt} className="size-full object-contain" />
      </div>
      {urls.length > 1 ? (
        <div className="mt-3 flex items-center justify-center gap-3">
          <button type="button" onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0} className="btn btn-white px-3" aria-label="‹">
            <ChevronIcon className="size-4 rotate-180" />
          </button>
          <span className="text-sm text-ink-muted" aria-live="polite">
            {t("slideOf", { n: i + 1, total: urls.length })}
          </span>
          <button type="button" onClick={() => setI((n) => Math.min(urls.length - 1, n + 1))} disabled={i === urls.length - 1} className="btn btn-white px-3" aria-label="›">
            <ChevronIcon className="size-4" />
          </button>
        </div>
      ) : null}
      <button type="button" onClick={onDownload} disabled={pending} className="btn btn-primary mt-4 w-full">
        {pending ? <SpinnerIcon className="size-4" /> : <DownloadIcon className="size-4" />}
        {pending ? t("downloading") : label}
      </button>
      <p className="mt-2 text-center text-xs text-ink-muted">{priceNote}</p>
    </section>
  );
}

/** one platform's text: shown, copied, or edited (a new version) */
function TextPanel({ platform, text, hashtags, disabled, onSave }: { platform: PostPlatformKey; text: string; hashtags: string[]; disabled: boolean; onSave: (text: string, tags: string[]) => void }) {
  const t = useTranslations("posts");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const [tags, setTags] = useState(hashtags.join(" "));
  const [copied, setCopied] = useState(false);
  const full = `${text}${hashtags.length ? `\n\n${hashtags.map((h) => `#${h}`).join(" ")}` : ""}`;
  const max = POST_PLATFORM_INFO[platform]?.maxChars ?? 2200;
  const length = editing ? draft.length + tags.split(/\s+/).filter(Boolean).reduce((n, h) => n + h.length + 2, 0) : full.length;
  return (
    <section className="panel space-y-3">
      {editing ? (
        <>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={10} dir="auto" className="w-full resize-y rounded-[22px] bg-white p-4 text-sm leading-relaxed text-navy outline-none focus:shadow-[inset_0_0_0_1.5px_var(--primary)]" />
          <label className="block text-sm">
            <span className="label mb-1 block">{t("hashtags")}</span>
            <input value={tags} onChange={(e) => setTags(e.target.value)} dir="auto" className="w-full rounded-full bg-white px-4 py-2 text-sm text-navy outline-none focus:shadow-[inset_0_0_0_1.5px_var(--primary)]" />
            <span className="mt-1 block text-xs text-ink-muted">{t("hashtagsHint")}</span>
          </label>
        </>
      ) : (
        <p dir="auto" className="whitespace-pre-wrap leading-relaxed text-navy">
          {full}
        </p>
      )}
      <p className={`text-xs ${length > max ? "text-danger-ink" : "text-ink-muted"}`}>
        {t("characters", { n: length, max })}
        {length > max ? ` · ${t("tooLong")}` : ""}
      </p>
      <div className="flex flex-wrap gap-2">
        {editing ? (
          <>
            <button type="button" disabled={disabled} onClick={() => { onSave(draft, tags.split(/\s+/).filter(Boolean)); setEditing(false); }} className="btn btn-primary">
              <CheckIcon className="size-4" />
              {t("save")}
            </button>
            <button type="button" onClick={() => { setEditing(false); setDraft(text); setTags(hashtags.join(" ")); }} className="btn btn-white">
              {t("cancel")}
            </button>
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
              {copied ? <CheckIcon className="size-4" /> : <ArrowIcon className="size-4" />}
              {copied ? t("copied") : t("copy")}
            </button>
            <button type="button" disabled={disabled} onClick={() => setEditing(true)} className="btn btn-white">
              {t("editText")}
            </button>
          </>
        )}
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
