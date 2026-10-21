"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { mockTopUp } from "./actions";
import { toLocal } from "@/lib/pricing";
import { formatMoney } from "@/lib/format";
import { CheckIcon, SpinnerIcon } from "@/components/icons";

const METHODS = [
  { id: "vodafone", key: "methodVodafone" },
  { id: "instapay", key: "methodInstapay" },
  { id: "fawry", key: "methodFawry" },
  { id: "card", key: "methodCard" },
] as const;

export function TopUp({ amounts, fxRate, currency }: { amounts: readonly number[]; fxRate: number; currency: string }) {
  const t = useTranslations("wallet");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [amount, setAmount] = useState<number>(amounts[1] ?? amounts[0]);
  const [method, setMethod] = useState<(typeof METHODS)[number]["id"]>("vodafone");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const local = (usd: number) => formatMoney(toLocal(usd, fxRate), currency, locale);

  function pay() {
    setMessage(null);
    startTransition(async () => {
      const res = await mockTopUp(amount, method);
      if (res.ok) setMessage({ ok: true, text: t("topUpDone", { amount: local(res.amountUsd) }) });
      else setMessage({ ok: false, text: res.error === "disabled" ? t("paymentsSoon") : tc("error") });
    });
  }

  return (
    <>
      <p className="s-label" style={{ marginTop: 20 }}>{t.markup("topUp", { b: (c) => c })}</p>
      <div className="s-chips" role="radiogroup" aria-label={t.markup("topUp", { b: (c) => c })}>
        {amounts.map((usd) => (
          <button key={usd} type="button" role="radio" aria-checked={amount === usd} onClick={() => setAmount(usd)} className="s-chip s-num" title={formatMoney(usd, "USD", locale)}>
            {local(usd)}
          </button>
        ))}
      </div>
      <p className="s-label" style={{ marginTop: 18 }}>{t("methods")}</p>
      <div className="s-chips" role="radiogroup" aria-label={t("methods")}>
        {METHODS.map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={method === m.id} onClick={() => setMethod(m.id)} className="s-chip">{t(m.key)}</button>
        ))}
      </div>
      <p style={{ fontSize: 12, color: "var(--s-muted)", margin: "12px 0 0" }}>{t("topUpHint")}</p>
      <button type="button" onClick={pay} disabled={pending} className="s-btn lit" style={{ width: "100%", marginTop: 18 }}>
        {pending ? <SpinnerIcon className="size-4" /> : null}
        {pending ? t("paying") : t("pay", { amount: local(amount) })}
      </button>
      {message ? (
        <p role={message.ok ? "status" : "alert"} style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: message.ok ? "var(--s-ok)" : "var(--s-gold)" }}>
          {message.ok ? <CheckIcon className="size-4" /> : null}
          {message.text}
        </p>
      ) : null}
    </>
  );
}
