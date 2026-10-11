import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAppContext } from "@/lib/context";
import { getFxRate, getPrices, minutesLeft, toLocal } from "@/lib/pricing";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import type { LedgerKind, LedgerRow } from "@/lib/types";
import { Heading, boldTag } from "@/components/heading";
import { FilmStrip } from "@/components/film-strip";
import { TOP_UP_AMOUNTS_USD } from "@/lib/wallet";
import { TopUp } from "./top-up";

const KIND_KEY: Record<LedgerKind, "kindTopup" | "kindExport" | "kindRefund" | "kindAdjustment"> = {
  topup: "kindTopup",
  export: "kindExport",
  refund: "kindRefund",
  adjustment: "kindAdjustment",
};

const KIND_STYLE: Record<LedgerKind, string> = {
  topup: "bg-success-bg text-success-ink",
  refund: "bg-success-bg text-success-ink",
  export: "bg-primary-light text-primary-dark",
  adjustment: "bg-warning-bg text-warning-ink",
};

export default async function WalletPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { supabase, workspace } = await getAppContext();
  const t = await getTranslations("wallet");
  const tc = await getTranslations("common");

  const [prices, fx, ledgerRes] = await Promise.all([
    getPrices(supabase),
    getFxRate(supabase, workspace.currency_code),
    supabase
      .from("wallet_ledger")
      .select("id, kind, amount_usd, amount_local, currency_code, fx_rate, note, created_at")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const ledger = (ledgerRes.data ?? []) as LedgerRow[];
  const balanceUsd = workspace.wallet_balance_usd;
  const left = minutesLeft(balanceUsd, prices);
  const local = (usd: number) => formatMoney(toLocal(usd, fx), workspace.currency_code, locale);
  const minutes = (count: number) => tc("minutes", { count, n: formatNumber(count, locale) });

  return (
    <div className="space-y-6">
      <Heading as="h1" className="text-3xl sm:text-4xl">
        {t.rich("title", boldTag)}
      </Heading>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          {/* Balance */}
          <FilmStrip>
            <div className="p-6 sm:p-8">
              <p className="label">{t("balance")}</p>
              <p className="mt-2 text-5xl font-bold tracking-tight sm:text-6xl" data-testid="wallet-balance">
                {local(balanceUsd)}
              </p>
              <p className="mt-2 text-ink-muted">{tc("approxUsd", { usd: formatMoney(balanceUsd, "USD", locale) })}</p>
            </div>
          </FilmStrip>

          {/* Minutes left */}
          <section className="panel">
            <Heading as="h2" className="text-xl">
              {t.rich("minutesLeft", boldTag)}
            </Heading>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] bg-white p-4">
                <p className="label">{t("withoutVoice")}</p>
                <p className="mt-1 text-2xl font-bold">{minutes(left.withoutVoice)}</p>
              </div>
              <div className="rounded-[22px] bg-white p-4">
                <p className="label">{t("withVoice")}</p>
                <p className="mt-1 text-2xl font-bold">{minutes(left.withVoice)}</p>
              </div>
            </div>
          </section>

          {/* Price list */}
          <section className="panel">
            <Heading as="h2" className="text-xl">
              {t.rich("priceList", boldTag)}
            </Heading>
            <dl className="mt-4 divide-y divide-dashed divide-dash rounded-[22px] bg-white px-4">
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-ink-2">{t("priceVideo")}</dt>
                <dd className="text-end font-semibold">
                  {tc("perMinute", { price: local(prices.videoMinUsd) })}
                  <span className="block text-xs font-normal text-ink-muted">{tc("perMinute", { price: formatMoney(prices.videoMinUsd, "USD", locale) })}</span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-ink-2">{t("priceVoice")}</dt>
                <dd className="text-end font-semibold">
                  {t("priceVoiceValue", { price: local(prices.voiceoverMinUsd) })}
                  <span className="block text-xs font-normal text-ink-muted">
                    {t("priceVoiceValue", { price: formatMoney(prices.voiceoverMinUsd, "USD", locale) })}
                  </span>
                </dd>
              </div>
            </dl>
            <ul className="mt-4 space-y-1.5 text-sm text-ink-muted">
              <li>{t("priceRounding")}</li>
              <li>{t("priceDrafts")}</li>
              <li>{t("priceRefund")}</li>
            </ul>
          </section>
        </div>

        {/* Top up */}
        <section className="panel h-fit">
          <Heading as="h2" className="mb-4 text-xl">
            {t.rich("topUp", boldTag)}
          </Heading>
          <TopUp amounts={TOP_UP_AMOUNTS_USD} fxRate={fx} currency={workspace.currency_code} />
        </section>
      </div>

      {/* Transactions */}
      <section className="panel">
        <Heading as="h2" className="text-xl">
          {t.rich("transactions", boldTag)}
        </Heading>
        {ledger.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">{t("noTransactions")}</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl bg-white">
            <table className="w-full min-w-[640px] text-sm" data-testid="transactions">
              <thead>
                <tr className="text-xs text-ink-muted">
                  <th className="px-4 py-3 text-start font-medium">{t("colDate")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("colKind")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("colNote")}</th>
                  <th className="px-4 py-3 text-end font-medium">{t("colLocal")}</th>
                  <th className="px-4 py-3 text-end font-medium">{t("colUsd")}</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((row) => {
                  const usd = Number(row.amount_usd);
                  const positive = usd > 0;
                  return (
                    <tr key={row.id} className="border-t border-dashed border-dash">
                      <td className="px-4 py-3 whitespace-nowrap text-ink-2">
                        {formatDate(row.created_at, locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${KIND_STYLE[row.kind]}`}>{t(KIND_KEY[row.kind])}</span>
                      </td>
                      <td className="max-w-[260px] truncate px-4 py-3 text-ink-2">{noteLabel(row.note, t)}</td>
                      <td className={`px-4 py-3 text-end font-semibold whitespace-nowrap ${positive ? "text-success-ink" : "text-navy"}`}>
                        {positive ? "+" : ""}
                        {row.amount_local != null && row.currency_code
                          ? formatMoney(Number(row.amount_local), row.currency_code, locale)
                          : local(usd)}
                      </td>
                      <td className="px-4 py-3 text-end whitespace-nowrap text-ink-muted">
                        {positive ? "+" : ""}
                        {formatMoney(usd, "USD", locale)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function noteLabel(note: string | null, t: (key: "methodVodafone" | "methodInstapay" | "methodFawry" | "methodCard") => string) {
  if (!note) return "—";
  const mock = note.match(/^mock:(vodafone|instapay|fawry|card)$/);
  if (!mock) return note;
  const key = { vodafone: "methodVodafone", instapay: "methodInstapay", fawry: "methodFawry", card: "methodCard" } as const;
  return t(key[mock[1] as keyof typeof key]);
}
