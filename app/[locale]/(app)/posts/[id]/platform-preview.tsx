"use client";

// How the post will look on each platform: the approved prototype's feed layouts (lib/posts/mockups.ts) inside a
// phone (390×844) or a desktop browser (1280×800), at their real size, scaled to fit the panel.
import { useCallback, useEffect, useRef } from "react";
import { Grand_Hotel, Inter } from "next/font/google";
import { mockupHtml, type MockBrand } from "@/lib/posts/mockups";
import type { PostPlatformKey } from "@/lib/posts/config";
import styles from "../posts.module.css";

const inter = Inter({ subsets: ["latin"], variable: "--ui", display: "swap" });
const grand = Grand_Hotel({ subsets: ["latin"], weight: "400", variable: "--grand", display: "swap" });

export type PreviewBrand = { name: string; logoUrl: string | null; logoOnDark?: boolean | null; colors: { hex: string }[]; tagline?: string | null; site?: string | null };

/** the account handle: the site's name (mantoog.com → mantoog), else the brand's Latin name */
const handleOf = (name: string, site?: string | null) => {
  const host = (site ?? "").replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/:?#]/)[0].split(".")[0].toLowerCase();
  return host || name.toLowerCase().replace(/[^a-z0-9.]+/g, "").replace(/^\.+|\.+$/g, "") || "brand";
};

export function PlatformPreview({ platform, device, image, text, hashtags, brand }: { platform: PostPlatformKey; device: "mobile" | "desktop"; image: string | null; text: string; hashtags: string[]; brand: PreviewBrand }) {
  const stage = useRef<HTMLDivElement>(null), scaler = useRef<HTMLDivElement>(null);
  const b: MockBrand = { name: brand.name, handle: handleOf(brand.name, brand.site), logo: brand.logoUrl, dark: brand.logoOnDark === true, tagline: brand.tagline ?? null, palette: { primary: brand.colors[0]?.hex } };
  const html = mockupHtml(platform, device, { text, tags: hashtags, image }, b);

  const fit = useCallback(() => {
    const st = stage.current, sc = scaler.current, el = sc?.firstElementChild as HTMLElement | null;
    if (!st || !sc || !el) return;
    const w = el.offsetWidth, h = el.offsetHeight, avail = st.clientWidth;
    const s = Math.min(1, avail / w, device === "mobile" ? 760 / h : 1);
    sc.style.transform = `scale(${s})`;
    sc.style.left = `${(avail - w * s) / 2}px`;
    st.style.height = `${h * s}px`;
  }, [device]);

  useEffect(() => {
    fit();
    const ro = new ResizeObserver(fit);
    if (stage.current) ro.observe(stage.current);
    return () => ro.disconnect();
  }, [fit, html]);

  // "more" / "See more": the caption opens as the platform opens it
  const onClick = (e: React.MouseEvent) => {
    const more = (e.target as HTMLElement).closest("[data-more]");
    if (!more) return;
    const box = more.closest("[data-capbox]");
    (box?.querySelector("[data-short]") as HTMLElement | null)?.setAttribute("hidden", "");
    (box?.querySelector("[data-full]") as HTMLElement | null)?.removeAttribute("hidden");
    fit();
  };

  return (
    <div ref={stage} className={`${styles.stage} mgx-mock ${inter.variable} ${grand.variable}`} onClick={onClick} dir="ltr">
      {/* the mockup is built from escaped strings (lib/posts/mockups.ts) */}
      <div ref={scaler} className={styles.scaler} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
