"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const ITEMS = [
  { href: "/", key: "today", match: (p: string) => p === "/", icon: '<path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z"/>' },
  { href: "/plans", key: "plans", match: (p: string) => p.startsWith("/plans"), icon: '<path d="M4 6h9M4 12h6M4 18h9"/><path d="m18 3 1.2 2.8L22 7l-2.8 1.2L18 11l-1.2-2.8L14 7l2.8-1.2z"/>' },
  { href: "/library", key: "library", match: (p: string) => p.startsWith("/library") || p.startsWith("/videos") || p.startsWith("/posts"), icon: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>' },
  { href: "/calendar", key: "calendar", match: (p: string) => p.startsWith("/calendar"), icon: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>' },
  { href: "/brand", key: "brand", match: (p: string) => p.startsWith("/brand") || p.startsWith("/companies"), icon: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 0 0 17M3.5 12h17"/>' },
] as const;
const Icon = ({ d }: { d: string }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: d }} />;

export function SideNav() {
  const t = useTranslations("shell");
  const p = usePathname();
  return (
    <nav className="s-nav" aria-label={t("menu")}>
      {ITEMS.map((it, i) => (
        <Link key={it.key} href={it.href} aria-current={it.match(p) ? "page" : undefined}>
          <span className="n">{String(i + 1).padStart(2, "0")}</span>
          {t(it.key)}
        </Link>
      ))}
    </nav>
  );
}

/** Phone: today, plans, create, calendar, brand. */
export function TabBar() {
  const t = useTranslations("shell");
  const p = usePathname();
  const tab = (it: (typeof ITEMS)[number], label?: string) => (
    <Link key={it.key} href={it.href} aria-current={it.match(p) ? "page" : undefined}>
      <Icon d={it.icon} />
      {label ?? t(it.key)}
    </Link>
  );
  return (
    <nav className="s-tabbar" aria-label={t("menu")}>
      {tab(ITEMS[0])}
      {tab(ITEMS[1], t("plansShort"))}
      <Link href="/create" aria-label={t("create")}><span className="plus"><Icon d='<path d="M12 5v14M5 12h14"/>' /></span></Link>
      {tab(ITEMS[3], t("calendarShort"))}
      {tab(ITEMS[4], t("brandShort"))}
    </nav>
  );
}

/** The soft light that follows the cursor, and Arabic text kept out of the letter-spaced mono labels. */
export function Ambient() {
  useEffect(() => {
    const root = document.documentElement;
    const move = (e: PointerEvent) => { root.style.setProperty("--mx", `${e.clientX}px`); root.style.setProperty("--my", `${e.clientY}px`); };
    const SPACED = ".s-slate-line span, .s-label, .s-scene small, .s-tday b, .s-mono, .s-clip, .s-note, .s-ticket small, .s-idea .ang, .s-dayrow .dn, .s-pstat span, .s-shot .m span, .s-sum .tags span, .s-table th, .s-cal .h";
    const fix = () => document.querySelectorAll<HTMLElement>(SPACED).forEach((el) => el.classList.toggle("s-ar", /[؀-ۿ]/.test(el.textContent ?? "")));
    fix();
    const mo = new MutationObserver(fix);
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener("pointermove", move);
    return () => { mo.disconnect(); window.removeEventListener("pointermove", move); };
  }, []);
  return null;
}
