// Money display: USD amounts in the workspace's currency. What things cost is lib/billing (usage billing, 0017).
import type { SupabaseClient } from "@supabase/supabase-js";

export function toLocal(usd: number, fxRate: number): number {
  return Math.round(usd * fxRate * 100) / 100;
}

/** Local units per 1 USD, using the latest rate on or before today. */
export async function getFxRate(supabase: SupabaseClient, currency: string): Promise<number> {
  if (currency === "USD") return 1;
  const { data, error } = await supabase
    .from("fx_rates")
    .select("usd_rate")
    .eq("currency_code", currency)
    .lte("rate_date", new Date().toISOString().slice(0, 10))
    .order("rate_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Missing FX rate: ${currency}`);
  return Number(data.usd_rate);
}
