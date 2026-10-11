import "server-only";
import { cache } from "react";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { bootstrapAccount } from "@/lib/actions/account";
import type { Locale } from "@/i18n/routing";
import type { Role, Workspace } from "@/lib/types";

export type AppContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  email: string;
  fullName: string;
  locale: Locale;
  role: Role;
  workspace: Workspace;
};

async function loadMembership(supabase: AppContext["supabase"], userId: string) {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, workspaces(id, name, country_code, currency_code, wallet_balance_usd, monthly_cap_usd)")
    .eq("user_id", userId)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[context] loadMembership failed", { userId, code: error.code, message: error.message, details: error.details, hint: error.hint });
    throw error;
  }
  const row = data as unknown as { role: Role; workspaces: Workspace | null } | null;
  if (row && !row.workspaces) {
    console.error("[context] membership found but workspace row not visible (RLS on workspaces?)", { userId });
    return null;
  }
  return row as { role: Role; workspaces: Workspace } | null;
}

/** Signed-in user + their workspace. Creates the workspace on first login. Cached per request. */
export const getAppContext = cache(async (): Promise<AppContext> => {
  const locale = (await getLocale()) as Locale;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect({ href: "/login", locale });

  let membership = await loadMembership(supabase, userId!);
  if (!membership) {
    const workspaceId = await bootstrapAccount(locale);
    membership = await loadMembership(supabase, userId!);
    if (!membership) {
      console.error("[context] bootstrap returned a workspace but membership is still not readable", { userId, workspaceId });
      throw new Error("Workspace bootstrap failed");
    }
  }

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", userId!).maybeSingle();
  const email = typeof data!.claims.email === "string" ? data!.claims.email : "";

  const ws = membership.workspaces;
  return {
    supabase,
    userId: userId!,
    email,
    fullName: profile?.full_name || email.split("@")[0] || "",
    locale,
    role: membership.role,
    workspace: {
      ...ws,
      wallet_balance_usd: Number(ws.wallet_balance_usd),
      monthly_cap_usd: ws.monthly_cap_usd == null ? null : Number(ws.monthly_cap_usd),
    },
  };
});

/** Route-handler variant: no locale, no bootstrap, no redirects. Null when signed out or without a workspace. */
export async function getApiContext(): Promise<Pick<AppContext, "supabase" | "userId" | "role" | "workspace"> | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const membership = await loadMembership(supabase, userId);
  if (!membership) return null;
  return { supabase, userId, role: membership.role, workspace: membership.workspaces };
}
