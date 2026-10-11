"use server";

import { revalidatePath } from "next/cache";
import { getAppContext } from "@/lib/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFxRate, toLocal } from "@/lib/pricing";
import { TOP_UP_AMOUNTS_USD } from "@/lib/wallet";

const METHODS = ["vodafone", "instapay", "fawry", "card"] as const;

export type TopUpResult = { ok: true; amountUsd: number } | { ok: false; error: "disabled" | "generic" };

/**
 * PHASE 4: replace with a real payment provider (Paymob / Fawry) + webhook that writes the ledger row.
 * Mock: credits the wallet directly, outside production only.
 */
export async function mockTopUp(amountUsd: number, method: string): Promise<TopUpResult> {
  if (process.env.NODE_ENV === "production") return { ok: false, error: "disabled" };
  if (!TOP_UP_AMOUNTS_USD.includes(amountUsd as (typeof TOP_UP_AMOUNTS_USD)[number])) return { ok: false, error: "generic" };
  if (!METHODS.includes(method as (typeof METHODS)[number])) return { ok: false, error: "generic" };

  const { supabase, workspace, role } = await getAppContext();
  if (role !== "owner" && role !== "admin") return { ok: false, error: "generic" };

  // Lock the USD amount at today's rate.
  const fx = await getFxRate(supabase, workspace.currency_code);
  const admin = createAdminClient();
  const { error } = await admin.from("wallet_ledger").insert({
    workspace_id: workspace.id,
    kind: "topup",
    amount_usd: amountUsd,
    amount_local: toLocal(amountUsd, fx),
    currency_code: workspace.currency_code,
    fx_rate: fx,
    note: `mock:${method}`,
  });
  if (error) {
    console.error("mockTopUp", error.message);
    return { ok: false, error: "generic" };
  }

  revalidatePath("/", "layout");
  return { ok: true, amountUsd };
}
