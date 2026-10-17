"use client";

import { useEffect, useRef, useState } from "react";
import type { BrandCardData } from "@/lib/live-engine/server/brand-card";
import type { BrandColor } from "@/lib/types";
import { logoSurface } from "@/components/company-mark";

const HERO_PX = 900; // the top of the homepage that counts as its hero

/**
 * "هوية الشركة": the brand's own homepage hero (its live UI clone, scaled to the card width, their fonts.css),
 * else a card built from the brand's tokens only. Same component on Add company and the company page.
 */
export function BrandCard({
  captureId,
  name,
  tagline,
  websiteUrl,
  colors,
  fontArabic,
  logoUrl,
  logoOnDark,
}: {
  captureId?: string | null;
  name: string;
  tagline: string;
  websiteUrl: string;
  colors: BrandColor[];
  fontArabic: string;
  logoUrl: string | null;
  logoOnDark?: boolean | null;
}) {
  const [card, setCard] = useState<BrandCardData | null>(null);
  const [width, setWidth] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!captureId) return;
    let live = true;
    fetch(`/api/brand/capture?id=${captureId}&card=1`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<BrandCardData>) : null))
      .then((c) => live && setCard(c))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [captureId]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hero = captureId ? card?.hero : null;
  if (hero) {
    const top = Math.min(HERO_PX, hero.h);
    const s = width ? width / hero.w : 0;
    const doc = `<!doctype html><html><head><meta charset="utf-8"><style>${hero.fontsCss}</style><style>html,body{margin:0;width:${hero.w}px;height:${top}px;overflow:hidden}.ui-clone *{animation:none!important;transition:none!important}img{max-width:none}</style></head><body><div class="ui-clone" dir="${hero.dir}" style="position:relative;width:${hero.w}px;height:${hero.h}px;text-align:start">${hero.html}</div></body></html>`;
    return (
      <div ref={box} className="relative overflow-hidden rounded-panel" style={{ height: s ? top * s : 320 }}>
        {s ? (
          <iframe
            title={name}
            srcDoc={doc}
            sandbox=""
            tabIndex={-1}
            className="pointer-events-none absolute top-0 border-0"
            // scaled from its top-left corner in both directions (the clone has its own dir)
            style={{ left: 0, width: hero.w, height: top, transform: `scale(${s})`, transformOrigin: "0 0" }}
          />
        ) : null}
      </div>
    );
  }

  // fallback: the brand's tokens (brand.json when there is a capture, else the editor's colours / fonts)
  const tk = captureId ? card?.tokens : null;
  const byRole = (role: string) => colors.find((c) => c.role === role)?.hex;
  const background = tk?.background ?? byRole("background") ?? byRole("ink") ?? colors[1]?.hex ?? "#10184A";
  const primary = tk?.primary ?? byRole("primary") ?? colors[0]?.hex ?? "#5558E3";
  const gradient = tk?.gradient ?? null;
  const ink = tk?.ink ?? "#FFFFFF";
  const display = tk?.display || fontArabic || undefined;
  const logo = tk?.logo ?? (logoUrl ? { url: logoUrl, onDark: logoOnDark ?? null } : null);
  const surface = logo ? logoSurface(logo.onDark, [...colors, { hex: background }]) : undefined;
  return (
    <div ref={box} className="overflow-hidden rounded-panel p-6 sm:p-8" style={{ background, color: ink, fontFamily: tk?.body || undefined }}>
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
        {logo ? <img src={logo.url} alt="" className="size-14 shrink-0 rounded-2xl object-contain p-1.5" style={{ backgroundColor: surface }} /> : null}
        <div className="min-w-0">
          <p className="truncate text-xl font-bold" style={{ fontFamily: display }}>
            {name}
          </p>
          <p className="truncate text-sm opacity-70" dir="ltr">
            {websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </p>
        </div>
      </div>
      <p
        className="mt-8 text-3xl leading-snug font-bold sm:text-4xl"
        style={{ fontFamily: display, ...(gradient ? { backgroundImage: gradient, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" } : { color: primary }) }}
      >
        {tagline}
      </p>
      <span className="mt-6 inline-flex min-h-11 items-center px-5 text-sm font-semibold" style={{ background: gradient ?? primary, color: "#FFFFFF", borderRadius: tk?.buttonRadius ?? 999 }} dir="ltr">
        {websiteUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
      </span>
    </div>
  );
}
