import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SITE } from "@/lib/site";
import { LangSwitch } from "./lang-switch";
import "../../studio.css";

const T = { ar: { pricing: "الأسعار", terms: "الشروط", privacy: "الخصوصية", refunds: "الاسترداد", login: "دخول", other: "English" }, en: { pricing: "Pricing", terms: "Terms", privacy: "Privacy", refunds: "Refunds", login: "Log in", other: "العربية" } };

/** the public pages: pricing and the policies, open without an account */
export default async function SiteLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = T[locale === "ar" ? "ar" : "en"], other = locale === "ar" ? "en" : "ar";
  const nav = (["pricing", "terms", "privacy", "refunds"] as const).map((k) => <Link key={k} href={`/${k}`}>{t[k]}</Link>);
  return (
    <div className="s-site">
      <header className="s-site-top">
        <Link href="/" className="s-site-name">{SITE.name}</Link>
        <nav>{nav}</nav>
        <div className="s-site-end"><LangSwitch label={t.other} locale={other} /><Link href="/login" className="s-btn small">{t.login}</Link></div>
      </header>
      <main>{children}</main>
      <footer className="s-site-foot"><span>© {SITE.updated.slice(0, 4)} {SITE.name}</span><nav>{nav}</nav></footer>
    </div>
  );
}
