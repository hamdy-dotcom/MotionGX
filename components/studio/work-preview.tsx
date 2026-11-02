"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { PlatformIcon } from "@/components/studio/platform-icon";
import { dayMono } from "@/lib/dates";
import type { Work } from "@/lib/data/works";

const tall = (w: Work) => (w.kind === "video" && w.type === "9:16") || w.type === "story";
const tagOf = (w: Work) => (w.kind === "video" ? "VIDEO" : w.type === "story" ? "STORY" : w.type === "cover" ? "COVER" : "POST");

/** a piece in the middle of the screen, from what the page already has, so it opens at once; the full page is one button away */
export function WorkPreview({ work: w, onClose }: { work: Work; onClose: () => void }) {
  const t = useTranslations("library"), ts = useTranslations("status"), rtl = useLocale() === "ar", router = useRouter();
  const box = useRef<HTMLDialogElement>(null);
  const [slide, setSlide] = useState(0);
  const slides = w.slides?.length ? w.slides : w.thumb ? [w.thumb] : [];
  useEffect(() => { const d = box.current; if (d && !d.open) d.showModal(); router.prefetch(w.href); }, [router, w.href]);
  const status = ["draft", "ready", "review", "exporting", "failed", "generating", "needs_direction"].includes(w.status) ? ts(w.status as "ready") : w.status;
  const go = (d: number) => setSlide((s) => (s + d + slides.length) % slides.length);
  return (
    <dialog ref={box} className="s-wp" aria-label={w.title} onClose={onClose} onClick={(e) => { e.stopPropagation(); if (e.target === box.current) box.current?.close(); }} onKeyDown={(e) => { if (slides.length > 1 && (e.key === "ArrowRight" || e.key === "ArrowLeft")) go((e.key === "ArrowRight") !== rtl ? 1 : -1); }}>
      <div className="s-wp-card">
        <div className={`s-wp-media${tall(w) ? " v" : w.type === "cover" ? " wide" : ""}`}>
          {w.video ? (
            <video src={w.video} poster={w.thumb ?? undefined} controls autoPlay playsInline />
          ) : slides.length ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={slides[slide]} alt={w.title} />
          ) : <p dir="auto">{w.title}</p>}
          {slides.length > 1 && !w.video ? (
            <>
              <button type="button" className="s-wp-nav prev" aria-label={t("previous")} onClick={() => go(-1)}>‹</button>
              <button type="button" className="s-wp-nav next" aria-label={t("next")} onClick={() => go(1)}>›</button>
              <span className="s-wp-count" dir="ltr">{slide + 1} / {slides.length}</span>
            </>
          ) : null}
        </div>
        <div className="s-wp-side">
          <div className="s-wp-top">
            <span className={`s-tag${w.kind === "video" ? " v" : ""}`} style={{ position: "static" }}>{tagOf(w)}</span>
            <button type="button" className="s-wp-x" aria-label={t("close")} onClick={() => box.current?.close()}>×</button>
          </div>
          <h2 dir="auto">{w.title}</h2>
          <dl>
            <div><dt>{t("statusLabel")}</dt><dd>{status}</dd></div>
            <div><dt>{t("dayLabel")}</dt><dd dir="ltr">{dayMono(w.day)}</dd></div>
            <div><dt>{t("typeLabel")}</dt><dd>{w.kind === "post" ? t(`types.${w.type as "single"}`) : <span dir="ltr">{w.type}</span>}</dd></div>
            {w.platforms.length ? <div><dt>{t("platformsLabel")}</dt><dd className="icons">{w.platforms.map((p) => <PlatformIcon key={p} p={p} />)}</dd></div> : null}
          </dl>
          <div className="s-wp-actions">
            <Link href={w.href} className="s-btn lit">{t("openFull")}</Link>
            <Link href="/calendar" className="s-btn ghost">{t("schedule")}</Link>
          </div>
        </div>
      </div>
    </dialog>
  );
}

/** a piece that opens in the popup; a plain link when there's nothing to preview yet (still being made), or with cmd / ctrl */
export function WorkLink({ work, className, style, label, dir, children }: { work: Work; className?: string; style?: CSSProperties; label?: string; dir?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Link href={work.href} prefetch={false} className={className} style={style} aria-label={label} dir={dir} onClick={(e) => { e.stopPropagation(); if (work.status === "generating" || !(work.thumb || work.video) || e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); setOpen(true); }}>{children}</Link>
      {open ? <WorkPreview work={work} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
