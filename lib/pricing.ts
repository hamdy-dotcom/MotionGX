// Single source of truth for pricing in the app.
// Rates are read from the `prices` table; the same rule is enforced in SQL by charge_export().
import type { SupabaseClient } from "@supabase/supabase-js";

export type Prices = { videoMinUsd: number; voiceoverMinUsd: number };

/** Billed per second, rounded up to the next 5 s. */
export const BILLING_STEP_S = 5;

export function billedSeconds(lengthS: number): number {
  return Math.ceil(lengthS / BILLING_STEP_S) * BILLING_STEP_S;
}

export function perMinuteUsd(prices: Prices, voiceover: boolean): number {
  return prices.videoMinUsd + (voiceover ? prices.voiceoverMinUsd : 0);
}

/** Export cost in USD, rounded to 4 decimals exactly like charge_export(). */
export function exportCostUsd(lengthS: number, voiceover: boolean, prices: Prices): number {
  const cost = (billedSeconds(lengthS) / 60) * perMinuteUsd(prices, voiceover);
  return Math.round(cost * 10_000) / 10_000;
}

export function toLocal(usd: number, fxRate: number): number {
  return Math.round(usd * fxRate * 100) / 100;
}

/** Whole minutes the balance can buy, with and without voiceover. */
export function minutesLeft(balanceUsd: number, prices: Prices) {
  return {
    withoutVoice: Math.floor(balanceUsd / perMinuteUsd(prices, false)),
    withVoice: Math.floor(balanceUsd / perMinuteUsd(prices, true)),
  };
}

export async function getPrices(supabase: SupabaseClient): Promise<Prices> {
  const { data, error } = await supabase
    .from("prices")
    .select("key, usd, active_from")
    .lte("active_from", new Date().toISOString())
    .order("active_from", { ascending: false });
  if (error) throw error;

  const latest = (key: string) => {
    const row = data?.find((p) => p.key === key);
    if (!row) throw new Error(`Missing price: ${key}`);
    return Number(row.usd);
  };
  return { videoMinUsd: latest("video_min"), voiceoverMinUsd: latest("voiceover_min") };
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
