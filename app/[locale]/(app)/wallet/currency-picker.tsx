"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { setWorkspaceCurrency } from "./actions";

/** the workspace's currency: every price, estimate and live cost in the studio is shown in it */
export function CurrencyPicker({ current, options, canEdit }: { current: string; options: string[]; canEdit: boolean }) {
  const t = useTranslations("wallet");
  const locale = useLocale();
  const [value, setValue] = useState(current);
  const [pending, start] = useTransition();
  const name = (c: string) => { try { return new Intl.DisplayNames([locale], { type: "currency" }).of(c) ?? c; } catch { return c; } };
  return (
    <label className="s-opt" style={{ display: "grid", gap: 6, marginTop: 14 }}>
      <span className="s-label">{t("currency")}</span>
      <select
        className="s-input"
        value={value}
        disabled={!canEdit || pending}
        onChange={(e) => { const c = e.target.value; setValue(c); start(async () => { const r = await setWorkspaceCurrency(c); if (!r.ok) setValue(current); }); }}
      >
        {options.map((c) => <option key={c} value={c}>{name(c)} · {c}</option>)}
      </select>
      {!canEdit ? <span style={{ fontSize: 12, color: "var(--s-muted)" }}>{t("currencyOwners")}</span> : null}
    </label>
  );
}
