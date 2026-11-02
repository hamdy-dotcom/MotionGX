import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { getAppContext } from "@/lib/context";
import { listCompanies } from "@/lib/data/companies";
import { activeCompany } from "@/lib/data/active-company";
import { brandDetails } from "@/lib/data/works";
import { companyCaptureId } from "@/lib/live-engine/server/jobs";
import { brandFiles } from "@/lib/live-engine/server/brand-files";
import { Rise, escapeMarkup } from "@/components/studio/rise";
import { StudioMark } from "@/components/studio/mark";
import { CaptureGallery } from "@/components/studio/capture-gallery";
import { CreatedBrandFiles } from "@/components/studio/created-brand";
import { createdBrand } from "@/lib/brand-studio/stored";

const host = (url?: string | null) => { try { return url ? new URL(url).host.replace(/^www\./, "") : ""; } catch { return url ?? ""; } };
const ROLES = ["primary", "accent", "background", "surface", "ink", "muted"];

/** The brand's lookbook: palette, logo, font, voice, audience, what sets it apart, features and the captured screens. */
export default async function BrandPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await getAppContext();
  const t = await getTranslations("lookbook");
  const brand = await activeCompany(await listCompanies(ctx));
  if (!brand) redirect({ href: "/companies/new", locale });
  const b = brand!;
  const [details, captureId, profile] = await Promise.all([brandDetails(ctx, b.id), companyCaptureId(b.id), ctx.supabase.from("brand_profiles").select("raw").eq("company_id", b.id).maybeSingle()]);
  const raw = profile.data?.raw as { source?: string; pack?: string } | null;
  const created = raw?.source === "created" && raw.pack ? await createdBrand(ctx.workspace.id, raw.pack).catch(() => null) : null;
  const files = captureId ? await brandFiles(ctx.workspace.id, captureId).catch(() => null) : null;
  const colors = (b.brand_profiles?.colors ?? []).filter((c) => /^#[0-9a-f]{6}$/i.test(c.hex));
  const font = b.brand_profiles?.fonts?.arabic || b.brand_profiles?.fonts?.latin || "Readex Pro";
  const site = host(b.website_url);
  const facts = details.facts;
  const sets = facts.offers?.length ? facts.offers : facts.numbers?.length ? facts.numbers.map((n) => `${n.value} ${n.label}`) : details.sellingPoints;
  // the profile's screens show at once; the gallery then loads everything the capture saved (all screens, parts, images)
  const screens = (files?.screens ?? []).filter((s) => s.thumb).map((s) => ({ id: s.id, label: s.label, thumb: s.thumb! }));
  // the font shown in the brand's own words: its tagline when it's short, else its name
  const tagline = (details.tagline || "").trim();
  const specimen = tagline && tagline.split(/\s+/).length <= 5 ? tagline : b.name;
  const role = (r?: string) => (r && ROLES.includes(r) ? t(`roles.${r as "primary"}`) : "");

  return (
    <section className="s-screen">
      <div className="s-slate-line"><span>LOOKBOOK</span><i /><span dir="ltr">{site.toUpperCase()}</span></div>
      <div className="s-row" style={{ alignItems: "flex-end", marginBottom: 22 }}>
        <Rise markup={t.markup("title", { b: (c) => `<b>${c}</b>`, name: escapeMarkup(b.name) })} style={{ margin: 0 }} />
        <div className="s-chips"><Link href={`/companies/${b.id}`} className="s-btn ghost">{t("reread")}</Link><Link href={`/companies/${b.id}`} className="s-btn ghost">{t("edit")}</Link></div>
      </div>
      <div className="s-look">
        <div className="s-panel span4"><p className="s-label">{t("palette")}</p><div className="s-chart">{colors.map((c, i) => <div key={`${c.hex}-${i}`} style={{ background: c.hex }}><span dir="ltr">{role(c.role)} {c.hex}</span></div>)}</div></div>
        <div className="s-panel span2" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <StudioMark company={b} size={96} />
          <b style={{ font: "800 26px var(--s-brandfont)" }}>{b.name}</b>
          <span className="s-mono" style={{ fontSize: 11, color: "var(--s-muted)" }} dir="ltr">{site}</span>
        </div>
        <div className="s-panel span3"><p className="s-label">{t("font", { font })}</p><div className="s-specimen" dir="auto">{specimen}</div><p style={{ fontFamily: "var(--s-brandfont)", color: "var(--s-ink-2)", margin: 0 }} dir="auto">{specimen === tagline ? (sets[0] || details.facts.what_it_does || "") : (tagline || sets[0] || "")}</p></div>
        <div className="s-panel span3"><p className="s-label">{t("voice")}</p><p style={{ margin: "0 0 14px", fontSize: 15, lineHeight: 1.8 }} dir="auto">{details.tone || t("none")}</p><p className="s-label">{t("audience")}</p><p style={{ margin: 0, color: "var(--s-ink-2)" }} dir="auto">{facts.audience || t("none")}</p></div>
        <div className="s-panel span3"><p className="s-label">{t("sets")}</p>{sets.length ? <ul className="s-list">{sets.map((s, i) => <li key={i} dir="auto">{s}</li>)}</ul> : <p>{t("none")}</p>}</div>
        <div className="s-panel span3"><p className="s-label">{t("features")}</p>{facts.key_features?.length ? <ul className="s-list">{facts.key_features.map((s, i) => <li key={i} dir="auto">{s}</li>)}</ul> : <p>{t("none")}</p>}</div>
        {created ? <div className="s-panel full"><CreatedBrandFiles brand={created} /></div> : null}
        {captureId ? (
          <div className="s-panel full"><CaptureGallery captureId={captureId} initial={screens} /></div>
        ) : null}
      </div>
    </section>
  );
}
