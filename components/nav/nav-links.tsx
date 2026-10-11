"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const LINKS = [
  { href: "/", key: "home", match: (p: string) => p === "/" },
  { href: "/companies/new", key: "companies", match: (p: string) => p.startsWith("/companies") },
  { href: "/videos/new", key: "videos", match: (p: string) => p.startsWith("/videos") },
  { href: "/wallet", key: "wallet", match: (p: string) => p.startsWith("/wallet") },
] as const;

export function NavLinks() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <ul className="flex flex-wrap items-center gap-1">
      {LINKS.map((link) => {
        const active = link.match(pathname);
        return (
          <li key={link.key}>
            <Link
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-pill items-center rounded-full px-4 text-sm transition-colors ${
                active ? "bg-primary-light font-semibold text-primary-dark" : "text-ink-2 hover:bg-field"
              }`}
            >
              {t(link.key)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
