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
    <div className="space-y-4">
      <div role="radiogroup" aria-label={t.markup("topUp", { b: (c) => c })} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {amounts.map((usd) => (
          <button
            key={usd}
            type="button"
            role="radio"
            aria-checked={amount === usd}
            onClick={() => setAmount(usd)}
            className="chip chip-solid h-auto flex-col gap-0 rounded-[22px] chip-white py-3"
          >
            <span className="text-base font-bold">{local(usd)}</span>
            <span className="text-xs opacity-75">{formatMoney(usd, "USD", locale)}</span>
          </button>
        ))}
      </div>

      <div>
        <p className="label mb-2">{t("methods")}</p>
        <div role="radiogroup" aria-label={t("methods")} className="flex flex-wrap gap-2">
          {METHODS.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={method === m.id} onClick={() => setMethod(m.id)} className="chip chip-white">
              {t(m.key)}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-ink-muted">{t("topUpHint")}</p>

      <button type="button" onClick={pay} disabled={pending} className="btn btn-primary w-full">
        {pending ? <SpinnerIcon className="size-4" /> : null}
        {pending ? t("paying") : t("pay", { amount: local(amount) })}
      </button>

      {message ? (
        <p
          role={message.ok ? "status" : "alert"}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm ${message.ok ? "bg-success-bg text-success-ink" : "bg-warning-bg text-warning-ink"}`}
        >
          {message.ok ? <CheckIcon className="size-4" /> : null}
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
