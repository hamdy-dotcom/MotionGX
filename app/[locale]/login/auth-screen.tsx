import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LanguageSwitch } from "@/components/nav/language-switch";
import { SITE } from "@/lib/site";
import { Drift, Phone, ThemeCycle } from "@/components/site/demos";
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
      <main className="form">
        <header><Link href="/" className="s-site-name" dir="ltr">{SITE.name}</Link><LanguageSwitch persist={false} /></header>
        <div className="body">
          <AuthForm mode={mode} linkError={linkError} />
          {mode === "reset" ? null : <p className="other">{t(`${mode}Other`)} <Link href={mode === "login" ? "/signup" : "/login"}>{t(`${mode}OtherLink`)}</Link></p>}
        </div>
        <p className="fine">{t.rich("agree", { terms: (c) => <Link href="/terms">{c}</Link>, privacy: (c) => <Link href="/privacy">{c}</Link> })} · <Link href="/pricing">{t("pricing")}</Link></p>
      </main>
      <aside aria-hidden="true">
        <ThemeCycle className="s-auth-stage">
          <i className="glow" />
          <Drift>
            <div className="fl-o o1"><div className="o-post"><i /><b /><b className="s" /></div></div>
            <div className="fl-o o3"><div className="o-swatch"><i /><i /><i /><i /></div></div>
            <div className="fl-o o2"><div className="o-play">▶</div></div>
            <div className="phones one"><div className="p mid"><Phone>{mode === "login" ? <LivePost t={live} price={price} /> : <LiveBrand t={live} price={price} />}</Phone></div></div>
          </Drift>
        </ThemeCycle>
      </aside>
    </div>
  );
}
