import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { DevStudio } from "./dev-studio";

// Development only: the Posts studio with sample data (the creation run simulated), to check it against the prototype.
export default async function DevPostsStudio({ params }: { params: Promise<{ locale: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="mx-auto max-w-[1240px] p-6">
      <DevStudio />
    </div>
  );
}
