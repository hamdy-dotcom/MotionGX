"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { signOut } from "@/lib/actions/account";
import { LanguageSwitch } from "@/components/nav/language-switch";

/** Bottom of the rail: who is signed in, sign out, and the language pill. */
export function AccountBox({ name, email }: { name: string; email: string }) {
  const t = useTranslations("nav");
  const ts = useTranslations("shell");
  const router = useRouter();
  const initials = (name || email).trim().slice(0, 2).toUpperCase();
  return (
    <div className="s-account">
      <details>
        <summary aria-label={t("account")}><span className="s-avatar">{initials}</span><span>{ts("account")}</span></summary>
        <div className="pop">
          <p>{name}<small dir="ltr">{email}</small></p>
          <button type="button" onClick={async () => { await signOut(); router.replace("/login"); }}>{t("signOut")}</button>
        </div>
      </details>
      <LanguageSwitch className="s-lang" />
    </div>
  );
}
