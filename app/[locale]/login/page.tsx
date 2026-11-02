import { AuthScreen } from "./auth-screen";

export default async function LoginPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ error?: string }> }) {
  const { locale } = await params;
  const { error } = await searchParams;
  return <AuthScreen mode="login" locale={locale} linkError={Boolean(error)} />;
}
