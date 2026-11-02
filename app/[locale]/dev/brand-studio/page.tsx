import { notFound } from "next/navigation";
import { BrandStudio } from "@/app/[locale]/(app)/companies/create/brand-studio";

/** dev only: the brand creator without a session; seed its step through localStorage (key mgx-brand-studio) */
export default function DevBrandStudio() {
  if (process.env.NODE_ENV === "production") notFound();
  return <div className="mx-auto max-w-5xl p-6"><BrandStudio price="EGP 60" /></div>;
}
