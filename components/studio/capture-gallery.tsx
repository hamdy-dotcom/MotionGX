"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { CaptureGallery as Gallery } from "@/lib/live-engine/server/capture-gallery";

type Initial = { id: string; label: string; thumb: string }[];
const STEP = 24;

/** Everything a capture saved — every screen (opens the full page), every UI part, every image — the profile's picks
 *  first and marked. Read from the capture's packs; the profile's own screens show at once while the rest load. */
export function CaptureGallery({ captureId, initial = [], onLoad, screens: withScreens = true }: { captureId: string; initial?: Initial; onLoad?: (g: Gallery) => void; screens?: boolean }) {
  const t = useTranslations("gallery");
  const [g, setG] = useState<Gallery | null>(null);
  const [failed, setFailed] = useState(false);
  const [more, setMore] = useState({ screens: STEP, parts: STEP, images: STEP });
  const [big, setBig] = useState<{ src: string; caption: string } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const loaded = useRef(onLoad);
  useEffect(() => { loaded.current = onLoad; }, [onLoad]);

  useEffect(() => {
    let live = true;
    fetch(`/api/brand/capture?id=${captureId}&all=1`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((x: Gallery) => { if (!live) return; setG(x); loaded.current?.(x); })
      .catch(() => live && setFailed(true));
    return () => { live = false; };
  }, [captureId]);
  useEffect(() => { if (big) dialog.current?.showModal(); }, [big]);

  const open = (src: string, caption: string) => setBig({ src, caption });
  const screens = g?.screens ?? initial.map((s) => ({ id: s.id, label: s.label, shows: "", group: "public" as const, thumb: s.thumb, full: s.thumb, picked: true, blank: false }));
  const pickedParts = g?.parts.filter((p) => p.picked).length ?? 0;
  const pickedImages = g?.images.filter((i) => i.picked).length ?? 0;
  const showMore = (k: keyof typeof more, total: number) => (total > more[k] ? <button type="button" className="s-btn ghost s-gal-more" onClick={() => setMore((m) => ({ ...m, [k]: m[k] + STEP * 4 }))}>{t("more", { n: total - more[k] })}</button> : null);

  return (
    <div className="s-gal">
      {withScreens && screens.length ? (
        <section>
          <p className="s-label">{t("screens", { n: screens.length })}{g ? ` · ${t("picked", { n: screens.filter((s) => s.picked).length })}` : ""}</p>
          <div className="s-lightbox">
            {screens.slice(0, more.screens).map((s, i) => (
              <button key={s.id} type="button" className={`s-gal-shot${s.picked ? "" : " off"}${s.blank ? " blank" : ""}`} onClick={() => open(s.full, s.label)} aria-label={t("open", { name: s.label })} style={{ ["--r" as string]: `${[-2, 1.5, -1, 2][i % 4]}deg` }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- capture file */}
                <img src={s.thumb} alt="" loading="lazy" />
                <span dir="auto">{s.label}{s.picked ? "" : ` · ${t("unused")}`}</span>
              </button>
            ))}
          </div>
          {showMore("screens", screens.length)}
        </section>
      ) : null}

      {!g && !failed ? <p className="s-gal-hint">{t("loading")}</p> : null}
      {failed ? <p className="s-gal-hint">{t("failed")}</p> : null}

      {g?.parts.length ? (
        <section>
          <p className="s-label">{t("parts", { n: g.parts.length })} · {t("picked", { n: pickedParts })}</p>
          <div className="s-gal-grid">
            {g.parts.slice(0, more.parts).map((p) => (
              <button key={p.id} type="button" className={`s-gal-tile${p.picked ? " on" : ""}`} onClick={() => open(p.url, p.label)} aria-label={t("open", { name: p.label })}>
                {/* eslint-disable-next-line @next/next/no-img-element -- capture file */}
                <img src={p.url} alt="" loading="lazy" />
                <span dir="auto">{p.picked ? "★ " : ""}{p.label}</span>
              </button>
            ))}
          </div>
          {showMore("parts", g.parts.length)}
        </section>
      ) : null}

      {g?.images.length ? (
        <section>
          <p className="s-label">{t("images", { n: g.images.length })} · {t("picked", { n: pickedImages })}</p>
          <div className="s-gal-grid small">
            {g.images.slice(0, more.images).map((i, n) => (
              <button key={`${i.url}-${n}`} type="button" className={`s-gal-tile${i.picked ? " on" : ""}${i.demo ? " demo" : ""}`} onClick={() => open(i.url, i.note || t(`kind.${KIND(i.kind)}`))} aria-label={t("open", { name: i.note || i.kind })}>
                {/* eslint-disable-next-line @next/next/no-img-element -- capture file */}
                <img src={i.url} alt={i.note} loading="lazy" />
                <span>{i.picked ? "★ " : ""}{t(`kind.${KIND(i.kind)}`)}{i.demo ? ` · ${t("demo")}` : ""}</span>
              </button>
            ))}
          </div>
          {showMore("images", g.images.length)}
        </section>
      ) : null}

      {g ? <p className="s-gal-hint">{t("legend")}</p> : null}

      <dialog ref={dialog} className="s-gal-big" onClose={() => setBig(null)} onClick={(e) => e.target === dialog.current && dialog.current?.close()}>
        {big ? (
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element -- capture file */}
            <img src={big.src} alt={big.caption} />
            <figcaption><span dir="auto">{big.caption}</span><button type="button" className="s-btn ghost" onClick={() => dialog.current?.close()}>{t("close")}</button></figcaption>
          </figure>
        ) : null}
      </dialog>
    </div>
  );
}

const KINDS = ["product", "lifestyle", "illustration", "icon", "people", "background", "partner-logo", "object-images", "site"] as const;
const KIND = (k: string) => (KINDS.includes(k as (typeof KINDS)[number]) ? k.replace("-", "_") : "other") as "product";
