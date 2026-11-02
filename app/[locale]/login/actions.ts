"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

export type AuthError = "invalidEmail" | "shortPassword" | "wrongLogin" | "unconfirmed" | "taken" | "generic";
export type AuthState = { status: "idle" | "confirm" | "resetSent" | "error"; email?: string; error?: AuthError };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/, MIN_PASSWORD = 8;
const read = (formData: FormData) => {
  const input = String(formData.get("locale") ?? "");
  return { email: String(formData.get("email") ?? "").trim().toLowerCase(), password: String(formData.get("password") ?? ""), locale: (routing.locales.includes(input as Locale) ? input : routing.defaultLocale) as Locale };
};
async function origin() {
  const h = await headers();
  return h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password, locale } = read(formData);
  if (!EMAIL.test(email)) return { status: "error", email, error: "invalidEmail" };
  const { error } = await (await createClient()).auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") return { status: "error", email, error: "unconfirmed" };
    if (error.code === "invalid_credentials") return { status: "error", email, error: "wrongLogin" };
    console.error("signInWithPassword", error.message);
    return { status: "error", email, error: "generic" };
  }
  redirect({ href: "/", locale });
  return { status: "idle" };
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password, locale } = read(formData);
  if (!EMAIL.test(email)) return { status: "error", email, error: "invalidEmail" };
  if (password.length < MIN_PASSWORD) return { status: "error", email, error: "shortPassword" };
  const { data, error } = await (await createClient()).auth.signUp({ email, password, options: { emailRedirectTo: `${await origin()}/auth/callback?locale=${locale}` } });
  if (error) {
    if (error.code === "user_already_exists") return { status: "error", email, error: "taken" };
    if (error.code === "weak_password") return { status: "error", email, error: "shortPassword" };
    console.error("signUp", error.message);
    return { status: "error", email, error: "generic" };
  }
  // when the project asks to confirm the email there's no session yet
  if (!data.session) return { status: "confirm", email };
  redirect({ href: "/", locale });
  return { status: "idle" };
}

/** forgot password: an email with a link to the page that sets a new one */
export async function sendPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, locale } = read(formData);
  if (!EMAIL.test(email)) return { status: "error", email, error: "invalidEmail" };
  const { error } = await (await createClient()).auth.resetPasswordForEmail(email, { redirectTo: `${await origin()}/auth/callback?locale=${locale}&next=reset-password` });
  if (error) console.error("resetPasswordForEmail", error.message);
  // the same answer whether or not the account exists
  return { status: "resetSent", email };
}

export async function setNewPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { password, locale } = read(formData);
  if (password.length < MIN_PASSWORD) return { status: "error", error: "shortPassword" };
  const { error } = await (await createClient()).auth.updateUser({ password });
  if (error) {
    console.error("updateUser", error.message);
    return { status: "error", error: error.code === "weak_password" ? "shortPassword" : "generic" };
  }
  redirect({ href: "/", locale });
  return { status: "idle" };
}
