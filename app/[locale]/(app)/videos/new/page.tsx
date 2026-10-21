import { redirect } from "@/i18n/navigation";

/** Creating now happens on the studio's create screen; old links keep working. */
export default async function NewPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ company?: string }> }) {
  const { locale } = await params;
  const { company } = await searchParams;
  redirect({ href: `/create?kind=video${company ? `&company=${company}` : ""}`, locale });
}
