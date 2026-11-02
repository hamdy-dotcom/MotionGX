import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LanguageSwitch } from "@/components/nav/language-switch";
import { SITE } from "@/lib/site";
import { AuthForm } from "./auth-form";
import "../../studio.css";

const PHOTOS = ["bakery-storefront", "bakery-card", "post", "bakery-booth"];

/** sign in, sign up and setting a new password */
export async function AuthScreen({ mode, locale, linkError = false }: { mode: "login" | "signup" | "reset"; locale: string; linkError?: boolean }) {
  setRequestLocale(locale);
  const t = await getTranslations("auth");
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div className="wall">{PHOTOS.map((p) => <img key={p} src={`/landing/${p}.webp`} alt="" />)}</div>
      </aside>
    </div>
  );
}
