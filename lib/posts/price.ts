import type { SupabaseClient } from "@supabase/supabase-js";

/** the current price of one post (charged once, on its first download) — the same rule as export_post() */
export async function getPostPriceUsd(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase.from("prices").select("usd, active_from").eq("key", "post").lte("active_from", new Date().toISOString()).order("active_from", { ascending: false }).limit(1).maybeSingle();
  return Number(data?.usd ?? 0);
}
