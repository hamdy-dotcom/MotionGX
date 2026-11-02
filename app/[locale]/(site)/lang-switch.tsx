"use client";

import { Link, usePathname } from "@/i18n/navigation";

/** the same page in the other language */
export function LangSwitch({ label, locale }: { label: string; locale: string }) {
  return <Link href={usePathname()} locale={locale} className="s-site-lang">{label}</Link>;
}
