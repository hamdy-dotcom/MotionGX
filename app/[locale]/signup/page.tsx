import { AuthScreen } from "../login/auth-screen";

export default async function SignupPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <AuthScreen mode="signup" locale={locale} />;
}
