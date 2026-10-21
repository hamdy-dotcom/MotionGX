"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { setActiveCompany } from "@/lib/actions/studio";

export type SwitchBrand = { id: string; name: string; site: string; mark: ReactNode };

/** The brand switcher at the top of the rail (and the phone header): every screen works on the chosen brand. */
export function BrandSwitch({ brands, activeId }: { brands: SwitchBrand[]; activeId: string | null }) {
  const t = useTranslations("shell");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const active = brands.find((b) => b.id === activeId);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("click", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  if (!active) return <Link href="/companies/new" className="s-switch">{t("addFirst")}</Link>;
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" className="s-switch" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((v) => !v)} disabled={pending} aria-label={t("switchBrand")}>
        {active.mark}
        <span><b>{active.name}</b><small dir="ltr">{active.site}</small></span>
        <span className="chev" aria-hidden="true">⌄</span>
      </button>
      {open ? (
        <div className="s-menu" role="menu" style={{ top: "calc(100% + 6px)", insetInline: 0 }}>
          {brands.map((b) => (
            <button key={b.id} type="button" role="menuitem" onClick={() => { setOpen(false); if (b.id === activeId) return; start(async () => { await setActiveCompany(b.id); router.refresh(); }); }}>
              {b.mark}
              <span style={{ minWidth: 0 }}>{b.name}<small dir="ltr">{b.site}</small></span>
              {b.id === activeId ? <span style={{ marginInlineStart: "auto", color: "var(--s-brand)" }} aria-hidden="true">●</span> : null}
            </button>
          ))}
          <Link href="/companies/new" className="add" role="menuitem" onClick={() => setOpen(false)}>＋ {t("addCompany")}</Link>
        </div>
      ) : null}
    </div>
  );
}
