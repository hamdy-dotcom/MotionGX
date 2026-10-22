import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getAppContext } from "@/lib/context";
import { listCompanies } from "@/lib/data/companies";
import { activeCompany } from "@/lib/data/active-company";
import { exportCostUsd, getFxRate, getPrices, toLocal } from "@/lib/pricing";
import { getPostPriceUsd } from "@/lib/posts/price";
import { formatMoney, formatNumber } from "@/lib/format";
import { dayMono } from "@/lib/dates";
import { Rise, escapeMarkup } from "@/components/studio/rise";
import { StudioMark } from "@/components/studio/mark";
import { CreateForm } from "./create-form";
import { isContentType } from "@/lib/refs";

// the video or post job starts in `after()` of the create actions this screen calls
export const maxDuration = 800;

const KINDS = ["video", "image", "carousel", "story", "cover", "text"] as const;
const host = (url?: string | null) => { try { return url ? new URL(url).host.replace(/^www\./, "") : ""; } catch { return url ?? ""; } };

export default async function CreatePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ kind?: string; brief?: string; day?: string; idea?: string; company?: string; platforms?: string; type?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const q = await searchParams;
  const ctx = await getAppContext();
  const t = await getTranslations("create");
  const [companies, prices, postUsd, fx] = await Promise.all([listCompanies(ctx), getPrices(ctx.supabase), getPostPriceUsd(ctx.supabase), getFxRate(ctx.supabase, ctx.workspace.currency_code)]);
  const brand = await activeCompany(companies, q.company);
  if (!brand) {
    return (
      <section className="s-screen">
        <p className="s-lead">{t("noCompany")}</p>
        <Link href="/companies/new" className="s-btn lit">＋</Link>
      </section>
    );
  }
  const n = (usd: number) => formatNumber(toLocal(usd, fx), ctx.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const day = /^\d{4}-\d{2}-\d{2}$/.test(q.day ?? "") ? q.day! : null;
  const kind = (KINDS as readonly string[]).includes(q.kind ?? "") ? (q.kind as (typeof KINDS)[number]) : "image";
  const latin = (host(brand.website_url) || brand.name).toUpperCase();

  return (
    <section className="s-screen">
      <div className="s-slate-line"><span>NEW BRIEF</span><i /><span dir="ltr">{latin}{day ? ` · ${t("forDay", { day: dayMono(day) })}` : ""}</span></div>
      <Rise markup={t.markup("title", { b: (c) => `<b>${c}</b>`, name: escapeMarkup(brand.name) })} />
      <CreateForm
        brand={{ id: brand.id, name: brand.name, dialect: brand.default_dialect, mark: <StudioMark company={brand} size={42} /> }}
        initial={{ kind, brief: (q.brief ?? "").slice(0, 2000), day, ideaId: q.idea ?? null, platforms: (q.platforms ?? "").split(",").filter(Boolean), contentType: isContentType(q.type) ? q.type : "standard" }}
        prices={{ post: n(postUsd), video: { 15: n(exportCostUsd(15, false, prices)), 30: n(exportCostUsd(30, false, prices)), 60: n(exportCostUsd(60, false, prices)) }, currency: formatMoney(0, ctx.workspace.currency_code, ctx.locale).replace(/[\d.,\s-]/g, "") || ctx.workspace.currency_code }}
      />
    </section>
  );
}
