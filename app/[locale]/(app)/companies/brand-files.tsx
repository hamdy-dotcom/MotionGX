"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { BrandFiles as Files } from "@/lib/live-engine/server/brand-files";
import { Heading, boldTag } from "@/components/heading";
import { SpinnerIcon } from "@/components/icons";

const KINDS = ["product", "lifestyle", "illustration", "icon", "people", "background", "partner-logo"] as const;

/** "ملفات البراند": what the live engine's capture + profile produced — the sandbox's brand profile panel. */
export function BrandFiles({ captureId }: { captureId: string }) {
  const t = useTranslations("companies");
  const [files, setFiles] = useState<Files | null>(null);
  const [failed, setFailed] = useState(false);
  const [big, setBig] = useState<{ src: string; caption: string } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/brand/capture?id=${captureId}&files=1`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((f: Files) => live && setFiles(f))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [captureId]);

  useEffect(() => {
    if (big) dialog.current?.showModal();
  }, [big]);

  if (failed) return null;
  if (!files)
    return (
      <section className="panel flex items-center gap-2 text-sm text-ink-muted">
        <SpinnerIcon className="size-4" />
        {t("filesTitlePlain")}
      </section>
    );

  const groups = (["customer", "app", "public"] as const).map((g) => ({ g, items: files.screens.filter((s) => s.group === g) })).filter((x) => x.items.length);
  // brand photos by kind; the capture agent's test data (sample products, test orders) in its own group
  const kinds = KINDS.map((k) => ({ k, items: files.images.filter((i) => i.kind === k && i.url && !i.demo) })).filter((x) => x.items.length);
  const demo = files.images.filter((i) => i.demo && i.url);
  const open = (src: string | null, caption: string) => src && setBig({ src, caption });

  return (
    <section className="panel space-y-6">
      <Heading as="h2" className="text-xl">
        {t.rich("filesTitle", boldTag)}
      </Heading>

      {files.logo ? (
        <div>
          <p className="label mb-2">{t("logo")}</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
          <img src={files.logo.url} alt={t("logo")} className={`h-16 max-w-48 rounded-2xl object-contain p-2 ${files.logo.onDark ? "bg-navy" : "bg-white"}`} />
        </div>
      ) : null}

      {groups.map(({ g, items }) => (
        <div key={g}>
          <p className="label mb-2">
            {t(`files_${g}` as "files_customer")} ({items.length})
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((s) => (
              <figure key={s.id} className="overflow-hidden rounded-2xl bg-white">
                <button type="button" onClick={() => open(s.full, s.label)} className="block w-full" aria-label={t("filesOpen", { name: s.label })}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
                  {s.thumb ? <img src={s.thumb} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover object-top" /> : <span className="block aspect-[4/3] bg-primary-lavender" />}
                </button>
                <figcaption className="space-y-1 p-3 text-xs">
                  <p className="font-semibold" dir="auto">
                    {s.label}
                  </p>
                  <p className="text-ink-muted" dir="auto">
                    {s.shows}
                  </p>
                  {s.features.length ? (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {s.features.map((f) => (
                        <span key={f} className="chip chip-white min-h-0 px-2 py-0.5 text-[11px]" dir="auto">
                          {f}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      ))}

      {files.parts.some((p) => p.url) ? (
        <div>
          <p className="label mb-2">
            {t("filesParts")} ({files.parts.filter((p) => p.url).length})
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {files.parts
              .filter((p) => p.url)
              .map((p) => (
                <figure key={p.id} className="overflow-hidden rounded-2xl bg-white">
                  <button type="button" onClick={() => open(p.url, p.shows)} className="block w-full" aria-label={t("filesOpen", { name: p.shows })}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
                    <img src={p.url!} alt="" loading="lazy" className="aspect-square w-full bg-field object-contain" />
                  </button>
                  <figcaption className="p-2 text-[11px] text-ink-muted" dir="auto">
                    {p.shows}
                  </figcaption>
                </figure>
              ))}
          </div>
        </div>
      ) : null}

      {kinds.length ? (
        <div>
          <p className="label mb-2">{t("filesImages")}</p>
          <div className="space-y-3">
            {kinds.map(({ k, items }) => (
              <div key={k}>
                <p className="mb-1 text-xs font-semibold text-ink-muted">{t(`kind_${k.replace("-", "_")}` as "kind_product")}</p>
                <div className="flex flex-wrap gap-2">
                  {items.map((i, n) => (
                    <button key={n} type="button" onClick={() => open(i.url, i.note)} aria-label={t("filesOpen", { name: i.note || k })}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
                      <img src={i.url!} alt={i.note} loading="lazy" className="size-24 rounded-2xl bg-white object-contain p-1" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {demo.length ? (
        <div>
          <p className="label mb-1">{t("filesDemo")}</p>
          <p className="mb-2 text-xs text-ink-muted">{t("filesDemoHint")}</p>
          <div className="flex flex-wrap gap-2">
            {demo.map((i, n) => (
              <button key={n} type="button" onClick={() => open(i.url, i.note)} aria-label={t("filesOpen", { name: i.note || i.kind })}>
                {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
                <img src={i.url!} alt={i.note} loading="lazy" className="size-20 rounded-2xl bg-white object-contain p-1 opacity-80" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {files.trace.length ? (
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold text-primary-dark">
            {t("filesTrace")} ({files.trace.length})
          </summary>
          <ol className="mt-3 space-y-2">
            {files.trace.map((s) => (
              <li key={s.step} className="flex gap-3 rounded-2xl bg-white p-2">
                {s.shot ? (
                  <button type="button" onClick={() => open(s.shot, `${s.step} · ${s.action}`)} className="shrink-0" aria-label={t("filesOpen", { name: String(s.step) })}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
                    <img src={s.shot} alt="" loading="lazy" className="h-16 w-24 rounded-xl object-cover object-top" />
                  </button>
                ) : null}
                <div className="min-w-0 flex-1 text-xs" dir="ltr">
                  <p className="font-semibold">
                    {s.step}. {s.action} <span className="font-normal text-ink-muted">{s.url.replace(/^https?:\/\//, "")}</span>
                  </p>
                  {s.detail ? <p className="truncate text-ink-muted">{s.detail}</p> : null}
                  {s.result ? <p className="line-clamp-2 text-ink-muted">→ {s.result}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </details>
      ) : null}

      <dialog ref={dialog} onClose={() => setBig(null)} onClick={(e) => e.target === dialog.current && dialog.current?.close()} className="m-auto max-h-[92vh] max-w-[92vw] rounded-panel bg-white p-3 backdrop:bg-navy/70">
        {big ? (
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
            <img src={big.src} alt={big.caption} className="max-h-[80vh] w-auto" />
            <figcaption className="mt-2 flex items-center justify-between gap-3 text-sm">
              <span dir="auto">{big.caption}</span>
              <button type="button" onClick={() => dialog.current?.close()} className="btn btn-white min-h-9 px-4">
                {t("filesClose")}
              </button>
            </figcaption>
          </figure>
        ) : null}
      </dialog>
    </section>
  );
}
