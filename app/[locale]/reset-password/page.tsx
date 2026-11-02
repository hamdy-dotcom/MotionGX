import { AuthScreen } from "../login/auth-screen";

export default async function ResetPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <AuthScreen mode="reset" locale={locale} />;
}
