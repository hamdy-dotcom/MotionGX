"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { routing, type Locale } from "@/i18n/routing";

export type LoginState = { status: "idle" | "sent" | "error"; email?: string; error?: "invalidEmail" | "generic" };

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const localeInput = String(formData.get("locale") ?? "");
  const locale: Locale = routing.locales.includes(localeInput as Locale) ? (localeInput as Locale) : routing.defaultLocale;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { status: "error", email, error: "invalidEmail" };

  const h = await headers();
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?locale=${locale}` },
  });
  if (error) {
    console.error("signInWithOtp", error.message);
    return { status: "error", email, error: "generic" };
  }
  return { status: "sent", email };
}
