import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getAppContext } from "@/lib/context";
import { listCompanies } from "@/lib/data/companies";
import { activeCompany } from "@/lib/data/active-company";
import { listWorks } from "@/lib/data/works";
import { LibraryView } from "./library-view";

// the docked composer starts jobs from this route
export const maxDuration = 800;

const host = (url?: string | null) => { try { return url ? new URL(url).host.replace(/^www\./, "") : ""; } catch { return url ?? ""; } };

export default async function LibraryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await getAppContext();
  const brand = await activeCompany(await listCompanies(ctx));
  if (!brand) redirect({ href: "/companies/new", locale });
  const works = await listWorks(ctx, brand!.id, { limit: 120 });
  return (
    <section className="s-screen">
      <LibraryView works={works} latin={(host(brand!.website_url) || brand!.name).toUpperCase()} />
    </section>
  );
}
