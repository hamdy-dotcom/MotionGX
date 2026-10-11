"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { routing, type Locale } from "@/i18n/routing";

/**
 * First login: create the profile, then a workspace + owner membership.
 * Idempotent — safe to call on every visit until a membership exists.
 */
export async function bootstrapAccount(locale: Locale): Promise<string> {
  const supabase = await createClient();
  const { data, error: claimsError } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) {
    console.error("[bootstrap] no session on server client", { message: claimsError?.message });
    throw new Error("Not signed in");
  }

  const email = typeof data.claims.email === "string" ? data.claims.email : "";
  const fullName = email.split("@")[0] ?? "";

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: userId, full_name: fullName, locale }, { onConflict: "id", ignoreDuplicates: true });
  if (profileError) {
    console.error("[bootstrap] profile upsert failed", { userId, code: profileError.code, message: profileError.message, details: profileError.details, hint: profileError.hint });
    throw profileError;
  }

  const { data: workspaceId, error } = await supabase.rpc("bootstrap_workspace", {
    p_name: fullName || "Workspace",
    p_country_code: "EG",
    p_currency_code: "EGP",
  });
  if (error) {
    console.error("[bootstrap] bootstrap_workspace failed", { userId, code: error.code, message: error.message, details: error.details, hint: error.hint });
    throw error;
  }
  return workspaceId as string;
}

/** Remember the UI language on the profile (the NEXT_LOCALE cookie covers anonymous visits). */
export async function savePreferredLocale(locale: string) {
  if (!routing.locales.includes(locale as Locale)) return;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return;
  await supabase.from("profiles").update({ locale }).eq("id", userId);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}
