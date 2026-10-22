import type { CSSProperties, ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getAppContext } from "@/lib/context";
import { listCompanies } from "@/lib/data/companies";
import { activeCompany } from "@/lib/data/active-company";
import { brandFontHref, brandLight, paletteHexes } from "@/lib/brand/light";
import { getFxRate, getPrices, toLocal } from "@/lib/pricing";
import { getPostPriceUsd } from "@/lib/posts/price";
import { brandDetails } from "@/lib/data/works";
import { addDays, dayLabel, todayKey } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import { dirFor } from "@/i18n/routing";
import { StudioMark } from "./mark";
import { BrandSwitch } from "./brand-switch";
import { Ambient, SideNav, TabBar } from "./nav";
import { AccountBox } from "./account";
import { Composer } from "./composer";
import { Notices } from "./notices";

const host = (url?: string | null) => { try { return url ? new URL(url).host.replace(/^www\./, "") : ""; } catch { return url ?? ""; } };

/** The studio: a brand-lit stage, the rail (brand switcher, Create, navigation, budget, account) and the phone tab bar. */
export async function StudioShell({ children }: { children: ReactNode }) {
  const t = await getTranslations("shell");
  const tc = await getTranslations("compose");
  const ctx = await getAppContext();
  const [companies, fx, prices, postUsd] = await Promise.all([listCompanies(ctx), getFxRate(ctx.supabase, ctx.workspace.currency_code), getPrices(ctx.supabase), getPostPriceUsd(ctx.supabase)]);
  const active = await activeCompany(companies);
  const details = active ? await brandDetails(ctx, active.id) : null;
  const money = (usd: number) => formatNumber(toLocal(usd, fx), ctx.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const today = todayKey();
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i)).map((k, i) => ({ key: k, label: i ? dayLabel(k, ctx.locale, { weekday: "long", day: "numeric" }) : tc("todayOpt", { d: +k.slice(8) }) }));
  const example = details?.facts.offers?.[0] ?? details?.facts.key_features?.[0] ?? details?.tagline ?? "";
  const light = brandLight(active?.brand_profiles?.colors);
  const fontName = active?.brand_profiles?.fonts?.arabic;
  const fontHref = brandFontHref(fontName);
  const balance = formatNumber(toLocal(ctx.workspace.wallet_balance_usd, fx), ctx.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const brands = companies.map((c) => ({ id: c.id, name: c.name, site: host(c.website_url), mark: <StudioMark company={c} size={30} /> }));
  const switcher = <BrandSwitch brands={brands.map((b) => (b.id === active?.id ? { ...b, mark: <StudioMark company={active} /> } : b))} activeId={active?.id ?? null} />;
  const style = { "--s-brand": light.brand, "--s-brand-2": light.brand2, ...(fontName ? { "--s-brandfont": `"${fontName}", var(--s-display)` } : {}) } as CSSProperties;

  return (
    <div className="s-app" dir={dirFor(ctx.locale)} style={style}>
      {fontHref ? <link rel="stylesheet" href={fontHref} precedence="default" /> : null}
      <div className="s-aurora" aria-hidden="true"><i /><i /><i /></div>
      <div className="s-spot" aria-hidden="true" />
      <div className="s-grain" aria-hidden="true" />
      <Ambient />
      <aside className="s-side" aria-label={t("menu")}>
        <Link href="/" className="s-logo" dir="ltr" style={{ color: "inherit", textDecoration: "none" }}><b>Motion<span>GX</span></b><small>CREATIVE STUDIO</small></Link>
        {switcher}
        <Link href="/create" className="s-action"><span className="s-dot" style={{ background: "#fff" }} />{t("create")}</Link>
        <SideNav />
        <div className="foot">
          <Link href="/wallet" className="s-ticket"><span><small>BUDGET</small><br />{t("wallet")}</span><b className="s-num">{balance}</b></Link>
          <AccountBox name={ctx.fullName} email={ctx.email} />
        </div>
      </aside>
      <main className="s-main">
        <div className="s-mtop">{switcher}</div>
        {children}
      </main>
      <TabBar />
      <Notices key={active?.id ?? "none"} companyId={active?.id ?? null} />
      <Composer
        brand={active ? { id: active.id, name: active.name, dialect: active.default_dialect, palette: paletteHexes(active.brand_profiles?.colors), example: example.split(/\s[—-]\s/)[0] } : null}
        days={days}
        prices={{ post: money(postUsd), video: money(prices.videoMinUsd * 0.5) }}
      />
    </div>
  );
}
