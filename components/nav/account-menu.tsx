"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { signOut } from "@/lib/actions/account";
import { LogoutIcon } from "@/components/icons";

export function AccountMenu({ name, email }: { name: string; email: string }) {
  const t = useTranslations("nav");
  const router = useRouter();
  const initials = (name || email).trim().slice(0, 2).toUpperCase();

  return (
    <details className="relative">
      <summary
        aria-label={t("account")}
        className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full bg-navy text-sm font-semibold text-white [&::-webkit-details-marker]:hidden"
      >
        {initials}
      </summary>
      <div className="absolute end-0 top-full z-20 mt-2 w-60 rounded-panel bg-white p-2 shadow-card">
        <div className="px-3 py-2">
          <p className="truncate text-sm font-semibold text-navy">{name}</p>
          <p className="truncate text-xs text-ink-muted" dir="ltr">
            {email}
          </p>
        </div>
        <div className="divider my-1" />
        <button
          type="button"
          onClick={async () => {
            await signOut();
            router.replace("/login");
          }}
          className="flex min-h-pill w-full items-center gap-2 rounded-full px-3 text-sm text-ink-2 hover:bg-field"
        >
          <LogoutIcon className="size-4" />
          {t("signOut")}
        </button>
      </div>
    </details>
  );
}
