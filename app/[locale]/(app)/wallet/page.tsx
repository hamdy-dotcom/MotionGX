import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAppContext } from "@/lib/context";
import { getFxRate, getPrices, minutesLeft, toLocal } from "@/lib/pricing";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import type { LedgerKind, LedgerRow } from "@/lib/types";
import { TOP_UP_AMOUNTS_USD } from "@/lib/wallet";
import { TopUp } from "./top-up";
import { getPostPriceUsd } from "@/lib/posts/price";

// the docked composer starts jobs from this route
export const maxDuration = 800;

const KIND_KEY: Record<LedgerKind, "kindTopup" | "kindExport" | "kindRefund" | "kindAdjustment"> = {
  topup: "kindTopup",
  export: "kindExport",
  refund: "kindRefund",
  adjustment: "kindAdjustment",
};

export default async function WalletPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { supabase, workspace } = await getAppContext();
  const t = await getTranslations("wallet");

  const [prices, fx, postUsd, ledgerRes] = await Promise.all([
    getPrices(supabase),
    getFxRate(supabase, workspace.currency_code),
    getPostPriceUsd(supabase),
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

  const cur = formatMoney(0, workspace.currency_code, locale).replace(/[\d.,\s-]/g, "") || workspace.currency_code;
  const n = (usd: number) => formatNumber(toLocal(usd, fx), locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const posts = postUsd > 0 ? Math.floor(balanceUsd / postUsd) : 0;

  return (
    <section className="s-screen">
      <div className="s-slate-line"><span>BUDGET</span><i /><span>{t("freeNote")}</span></div>
      <h1 className="s-big"><span className="w">{t("studioTitle")}</span></h1>
      <div className="s-grid2">
        <div className="s-panel" style={{ minWidth: 0 }}>
          <p className="s-label">{t.markup("transactions", { b: (c) => c })}</p>
          {ledger.length === 0 ? (
            <p style={{ color: "var(--s-muted)" }}>{t("noTransactions")}</p>
          ) : (
            <div className="s-tablewrap">
              <table className="s-table" data-testid="transactions">
                <thead><tr><th>DATE</th><th>{t("colKind")}</th><th>{t("colNote")}</th><th>{t("colLocal")}</th></tr></thead>
                <tbody>
                  {ledger.map((row) => {
                    const usd = Number(row.amount_usd), positive = usd > 0;
                    return (
                      <tr key={row.id}>
                        <td className="s-num">{formatDate(row.created_at, locale, { day: "2-digit", month: "2-digit" })}</td>
                        <td>{t(KIND_KEY[row.kind])}</td>
                        <td dir="auto">{noteLabel(row.note, t)}</td>
                        <td className="s-num" style={{ color: positive ? "var(--s-ok)" : "var(--s-ink)" }} dir="ltr">
                          {positive ? "+" : ""}{row.amount_local != null && row.currency_code ? formatNumber(Number(row.amount_local), locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : n(usd)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="s-stack">
          <div className="s-panel">
            <p className="s-label">{t("balanceIn", { currency: cur })}</p>
            <div className="s-bal" data-testid="wallet-balance">{n(balanceUsd)}</div>
            <p style={{ color: "var(--s-ink-2)", margin: "8px 0 0" }}>{t("estimate", { posts: formatNumber(posts, locale), minutes: formatNumber(left.withoutVoice, locale) })}</p>
            <TopUp amounts={TOP_UP_AMOUNTS_USD} fxRate={fx} currency={workspace.currency_code} />
          </div>
          <div className="s-panel">
            <p className="s-label">{t("pricesIn", { currency: cur })}</p>
            <div className="s-count"><span>{t("pricePost")}</span><b style={{ fontSize: 20 }}>{n(postUsd)}</b></div>
            <div className="s-count"><span>{t("priceVideoMin")}</span><b style={{ fontSize: 20 }}>{n(prices.videoMinUsd)}</b></div>
            <div className="s-count"><span>{t("priceVoiceMin")}</span><b style={{ fontSize: 20 }}>+{n(prices.voiceoverMinUsd)}</b></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function noteLabel(note: string | null, t: (key: "methodVodafone" | "methodInstapay" | "methodFawry" | "methodCard") => string) {
  if (!note) return "—";
  const mock = note.match(/^mock:(vodafone|instapay|fawry|card)$/);
  if (!mock) return note;
  const key = { vodafone: "methodVodafone", instapay: "methodInstapay", fawry: "methodFawry", card: "methodCard" } as const;
  return t(key[mock[1] as keyof typeof key]);
}
