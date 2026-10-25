import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getAppContext } from "@/lib/context";
import { listCompanies } from "@/lib/data/companies";
import { activeCompany } from "@/lib/data/active-company";
import { listWorks } from "@/lib/data/works";
import { paletteHexes } from "@/lib/brand/light";
import { addDays, todayKey } from "@/lib/dates";
import { IDEA_COLUMNS, type Plan, type PlanIdea } from "@/lib/plans/types";
import { StudioMark } from "@/components/studio/mark";
import { PlansView } from "./plans-view";
import { estimate } from "@/lib/billing";
import { getFxRate, toLocal } from "@/lib/pricing";
import { formatMoney } from "@/lib/format";

// "make" on an idea starts a video or post job from this route
export const maxDuration = 800;

const host = (url?: string | null) => { try { return url ? new URL(url).host.replace(/^www\./, "") : ""; } catch { return url ?? ""; } };

export default async function PlansPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await getAppContext();
  const t = await getTranslations("plans");
  const brand = await activeCompany(await listCompanies(ctx));
  if (!brand) redirect({ href: "/companies/new", locale });
  const b = brand!;
  const today = todayKey();

  const { data: planRow, error } = await ctx.supabase.from("content_plans").select("id, company_id, starts_on, ends_on, per_week, goals, mix, platforms, notes").eq("company_id", b.id).eq("workspace_id", ctx.workspace.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error?.code === "42P01" || error?.code === "PGRST205") return <section className="s-screen"><p className="s-lead">{t("migrate")}</p></section>;
  const plan = planRow as Plan | null;
  const [ideasRes, works] = await Promise.all([
    plan ? ctx.supabase.from("plan_ideas").select(IDEA_COLUMNS).eq("plan_id", plan.id).order("position") : Promise.resolve({ data: [] }),
    listWorks(ctx, b.id, { limit: 200, from: today, to: addDays(today, 100) }),
  ]);

  return (
    <section className="s-screen">
      <PlansView
        brand={{ id: b.id, name: b.name, latin: (host(b.website_url) || b.name).toUpperCase(), dialect: b.default_dialect, palette: paletteHexes(b.brand_profiles?.colors), mark: <StudioMark company={b} size={42} /> }}
        today={today}
        plan={plan}
        ideas={(ideasRes.data ?? []) as PlanIdea[]}
        works={works}
        ideasCost={formatMoney(toLocal((await estimate(ctx.workspace.id, { kind: "plan" })).usd, await getFxRate(ctx.supabase, ctx.workspace.currency_code)), ctx.workspace.currency_code, ctx.locale)}
      />
    </section>
  );
}
