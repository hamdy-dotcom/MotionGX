import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LanguageSwitch } from "@/components/nav/language-switch";
import { SITE } from "@/lib/site";
import { Phone } from "@/components/site/demos";
import { LiveBrand, LivePost } from "@/components/site/live-demos";
import { LIVE_TEXT } from "@/components/site/demo-text";
import { publicPrice } from "@/lib/billing";
import { AuthForm } from "./auth-form";
import "../../studio.css";

/** sign in, sign up and setting a new password */
export async function AuthScreen({ mode, locale, linkError = false }: { mode: "login" | "signup" | "reset"; locale: string; linkError?: boolean }) {
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const live = LIVE_TEXT[locale === "ar" ? "ar" : "en"];
  const price = await publicPrice(mode === "login" ? { kind: "post", type: "single" } : { kind: "brand" });
  return (
    <div className="s-auth">
      <header className="s-auth-top"><Link href="/" className="s-site-name" dir="ltr">{SITE.name}</Link><LanguageSwitch persist={false} /></header>
      <main className="s-auth-card">
        <div className="s-auth-form">
          {mode === "reset" ? null : (
            <nav className="s-auth-tabs">
              <Link href="/login" aria-current={mode === "login" ? "page" : undefined}>{t("loginTab")}</Link>
              <Link href="/signup" aria-current={mode === "signup" ? "page" : undefined}>{t("signupTab")}</Link>
            </nav>
          )}
          <AuthForm mode={mode} linkError={linkError} />
        </div>
        <aside className="s-auth-side" aria-hidden="true">
          <p>{t("pitch")}</p>
          <div className="s-auth-phone"><Phone>{mode === "login" ? <LivePost t={live} price={price} /> : <LiveBrand t={live} price={price} />}</Phone></div>
        </aside>
      </main>
      <p className="s-auth-fine"><span>{t.rich("agree", { terms: (c) => <Link href="/terms">{c}</Link>, privacy: (c) => <Link href="/privacy">{c}</Link> })} · <Link href="/pricing">{t("pricing")}</Link></span></p>
    </div>
  );
}
