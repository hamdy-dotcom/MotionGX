"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getAppContext } from "@/lib/context";
import { ACTIVE_COMPANY_COOKIE } from "@/lib/data/active-company";

/** Switch the brand the studio is lit by and works on. */
export async function setActiveCompany(companyId: string) {
  const { supabase, workspace } = await getAppContext();
  const { data } = await supabase.from("companies").select("id").eq("id", companyId).eq("workspace_id", workspace.id).maybeSingle();
  if (!data) return { ok: false as const };
  (await cookies()).set(ACTIVE_COMPANY_COOKIE, companyId, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true });
  revalidatePath("/", "layout");
  return { ok: true as const };
}
