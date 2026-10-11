"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { savePreferredLocale } from "@/lib/actions/account";

/** عربي / EN pill. Keeps the current page (and its query string). */
export function LanguageSwitch({ persist = true }: { persist?: boolean }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next = locale === "ar" ? "en" : "ar";

  function onClick() {
    startTransition(async () => {
      if (persist) await savePreferredLocale(next);
      const search = window.location.search;
      router.replace(`${pathname}${search}`, { locale: next });
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      lang={next}
      aria-label={t("switchLanguageLabel")}
      className="inline-flex min-h-pill items-center rounded-full bg-primary-light px-4 text-sm font-semibold text-primary-dark transition-colors hover:bg-primary-lavender disabled:opacity-60"
    >
      {t("switchLanguage")}
    </button>
  );
}
