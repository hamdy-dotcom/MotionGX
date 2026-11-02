import { getTranslations, setRequestLocale } from "next-intl/server";
import { Heading, boldTag } from "@/components/heading";
import { HeroIllustration } from "@/components/illustrations";
import { LanguageSwitch } from "@/components/nav/language-switch";
import { LoginForm } from "./login-form";
import { Link } from "@/i18n/navigation";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { error } = await searchParams;
  const t = await getTranslations("login");
  const tl = await getTranslations("legalLinks");
  const tn = await getTranslations("nav");
  const ta = await getTranslations("art");

  return (
    <div className="flex min-h-dvh items-center px-2.5 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-app rounded-card bg-white p-5 shadow-card sm:p-10">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex min-h-pill items-center rounded-full bg-primary px-5 text-base font-bold text-white" dir="ltr">
            {tn.rich("logo", { l: (c) => <span className="font-extralight">{c}</span> })}
          </span>
          <LanguageSwitch persist={false} />
        </div>

        <div className="mt-8 grid items-center gap-10 lg:grid-cols-2">
          <div className="max-w-xl">
            <Heading as="h1" className="text-4xl sm:text-5xl">
              {t.rich("title", boldTag)}
            </Heading>
            <p className="mt-4 text-base leading-relaxed text-ink-muted">{t("subtitle")}</p>
            <div className="divider my-7" />
            <LoginForm linkError={Boolean(error)} />
            <p className="mt-4 text-center text-xs leading-relaxed text-ink-muted">
              {tl.rich("agree", { terms: (c) => <Link href="/terms" className="underline">{c}</Link>, privacy: (c) => <Link href="/privacy" className="underline">{c}</Link> })}
              {" · "}<Link href="/pricing" className="underline">{tl("pricing")}</Link>
            </p>
          </div>
          <div className="rounded-panel bg-field p-6 sm:p-10">
            <HeroIllustration label={ta("hero")} className="mx-auto w-full max-w-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
