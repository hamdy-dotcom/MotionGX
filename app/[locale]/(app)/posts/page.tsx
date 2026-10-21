import { redirect } from "@/i18n/navigation";

/** Posts and videos now live together in the library. */
export default async function PostsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: "/library", locale });
}
