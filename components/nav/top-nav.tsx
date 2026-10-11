import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getAppContext } from "@/lib/context";
import { getFxRate, toLocal } from "@/lib/pricing";
import { formatMoney } from "@/lib/format";
import { WalletIcon } from "@/components/icons";
import { NavLinks } from "./nav-links";
import { LanguageSwitch } from "./language-switch";
import { AccountMenu } from "./account-menu";

export async function TopNav() {
  const t = await getTranslations("nav");
  const { supabase, workspace, locale, fullName, email } = await getAppContext();
  const fx = await getFxRate(supabase, workspace.currency_code);
  const balance = formatMoney(toLocal(workspace.wallet_balance_usd, fx), workspace.currency_code, locale);

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <Link
        href="/"
        className="inline-flex min-h-pill items-center rounded-full bg-primary px-5 text-base font-bold tracking-tight text-white"
        dir="ltr"
      >
        {t.rich("logo", { l: (c) => <span className="font-extralight">{c}</span> })}
      </Link>

      <nav aria-label={t("main")} className="order-last w-full md:order-none md:w-auto md:flex-1">
        <NavLinks />
      </nav>

      <div className="ms-auto flex items-center gap-2">
        <Link
          href="/wallet"
          aria-label={t("balance")}
          className="inline-flex min-h-pill items-center gap-2 rounded-full bg-success-bg px-4 text-sm font-semibold text-success-ink"
        >
          <WalletIcon className="size-4" />
          <span data-testid="balance-pill">{balance}</span>
        </Link>
        <LanguageSwitch />
        <AccountMenu name={fullName} email={email} />
      </div>
    </header>
  );
}
