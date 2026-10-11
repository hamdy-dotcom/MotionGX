import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { routing, type Locale } from "@/i18n/routing";

// Magic-link landing. Handles both the PKCE `code` flow and the `token_hash` email template flow.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const requested = url.searchParams.get("locale") as Locale | null;
  let locale: Locale = requested && routing.locales.includes(requested) ? requested : routing.defaultLocale;

  const supabase = await createClient();
  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  if (!ok) return NextResponse.redirect(new URL(`/${locale}/login?error=link`, url.origin));

  // Returning users land in the language saved on their profile.
  const { data: claims } = await supabase.auth.getClaims();
  if (claims?.claims?.sub) {
    const { data: profile } = await supabase.from("profiles").select("locale").eq("id", claims.claims.sub).maybeSingle();
    if (profile?.locale && routing.locales.includes(profile.locale)) locale = profile.locale as Locale;
  }

  const response = NextResponse.redirect(new URL(`/${locale}`, url.origin));
  response.cookies.set("NEXT_LOCALE", locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return response;
}
