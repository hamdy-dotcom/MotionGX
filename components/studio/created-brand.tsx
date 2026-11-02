"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { CreatedBrand as Brand } from "@/lib/brand-studio/stored";

/** a designed page in a sandboxed frame (no script can run in it), scaled to fit: `width` is the page's real width */
export function SiteFrame({ html, width = 1280, height = 800, full = false }: { html: string; width?: number; height?: number; full?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / width));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div ref={box} className={`relative w-full bg-white ${full ? "overflow-y-auto" : "overflow-hidden"}`} style={{ height: full ? 720 : height * scale }}>
      <iframe title="website" sandbox="allow-same-origin" srcDoc={html} scrolling={full ? "yes" : "no"} className="absolute start-0 top-0 origin-top-left border-0 rtl:origin-top-right" style={{ width, height: full ? 720 / scale : height, transform: `scale(${scale})` }} />
    </div>
  );
}

/** the pack's download, with what is in it */
export function PackButton({ url }: { url: string }) {
  const t = useTranslations("companies.studio");
  return (
    <div className="flex flex-wrap items-center gap-3">
      <a href={url} className="btn btn-primary">{t("download")}</a>
      <span className="max-w-xl text-sm text-ink-muted">{t("packHint")}</span>
    </div>
  );
}

/** what a brand created here shows wherever the brand is shown: the pack, the website, the photos, the documents */
export function CreatedBrandFiles({ brand }: { brand: Brand }) {
  const t = useTranslations("companies.studio");
  return (
    <div className="space-y-6">
      <section className="panel space-y-3"><h2 className="text-xl font-semibold text-navy">{t("packTitle")}</h2>{brand.packUrl ? <PackButton url={brand.packUrl} /> : null}</section>
      {brand.siteHtml ? <section><h2 className="mb-3 text-xl font-semibold text-navy">{t("siteTitle")}</h2><div className="overflow-hidden rounded-2xl ring-1 ring-black/5"><SiteFrame html={brand.siteHtml} width={1440} full /></div></section> : null}
      {brand.world.length ? (
        <section>
          <h2 className="mb-3 text-xl font-semibold text-navy">{t("worldTitle")}</h2>
          <div className="grid items-start gap-4 md:grid-cols-2">
            {brand.world.map((w) => (
              <figure key={w.kind} className="m-0 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={w.url} alt={w.label} className="w-full" loading="lazy" />
                <figcaption className="px-3 py-2 text-xs text-ink-muted" dir="auto">{w.label}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}
      <section className="panel grid gap-5 md:grid-cols-2">
        <div><h2 className="mb-2 font-semibold text-navy">{t("docsTitle")}</h2><ul className="space-y-1 text-sm" dir="ltr">{brand.docs.map((d) => <li key={d.path}><a href={d.url} className="text-primary underline">{d.path}</a></li>)}</ul></div>
        <div><h2 className="mb-2 font-semibold text-navy">{t("logosTitle")}</h2><ul className="space-y-1 text-sm" dir="ltr">{brand.logos.map((d) => <li key={d.path}><a href={d.url} className="text-primary underline">{d.path}</a></li>)}</ul></div>
      </section>
    </div>
  );
}
