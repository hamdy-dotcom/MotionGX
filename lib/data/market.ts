import "server-only";
import type { AppContext } from "@/lib/context";
import { cleanCountries } from "@/lib/market/countries";
import { isIndustry } from "@/lib/market/industries";

// A brand's market: its industry, the countries it operates in and its social pages (migration 0014). Read and written
// on their own, so the rest of the app keeps working where the migration hasn't been applied yet.

export const SOCIALS = ["instagram", "facebook", "tiktok", "linkedin", "x", "youtube", "snapchat"] as const;
export type Social = (typeof SOCIALS)[number];
export type Market = { industry: string | null; countries: string[]; socials: Partial<Record<Social, string>> & { use?: boolean } };
export const EMPTY_MARKET: Market = { industry: null, countries: [], socials: {} };

const HOSTS: Record<Social, RegExp> = {
  instagram: /(^|\.)instagram\.com$/, facebook: /(^|\.)(facebook|fb)\.com$/, tiktok: /(^|\.)tiktok\.com$/, linkedin: /(^|\.)linkedin\.com$/,
  x: /(^|\.)(x|twitter)\.com$/, youtube: /(^|\.)(youtube\.com|youtu\.be)$/, snapchat: /(^|\.)snapchat\.com$/,
};

/** a profile link on its own platform (a bare @handle becomes the platform's URL) — anything else is dropped */
export function cleanSocial(p: Social, v: unknown): string | null {
  let s = typeof v === "string" ? v.trim().slice(0, 300) : "";
  if (!s) return null;
  if (/^@?[\w.-]{2,60}$/.test(s)) {
    const h = s.replace(/^@/, "");
    const base: Record<Social, string> = { instagram: "https://instagram.com/", facebook: "https://facebook.com/", tiktok: "https://tiktok.com/@", linkedin: "https://linkedin.com/company/", x: "https://x.com/", youtube: "https://youtube.com/@", snapchat: "https://snapchat.com/add/" };
    s = base[p] + h;
  }
  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    return u.protocol === "https:" && HOSTS[p].test(u.hostname.replace(/^www\.|^m\./, "")) ? u.toString().replace(/\/$/, "") : null;
  } catch {
    return null;
  }
}

export function cleanMarket(v: unknown): Market {
  const m = (v && typeof v === "object" ? v : {}) as Partial<Market>;
  const socials: Market["socials"] = {};
  for (const p of SOCIALS) { const s = cleanSocial(p, (m.socials as Record<string, unknown> | undefined)?.[p]); if (s) socials[p] = s; }
  if ((m.socials as { use?: unknown } | undefined)?.use === true) socials.use = true;
  return { industry: isIndustry(m.industry) ? m.industry : null, countries: cleanCountries(m.countries), socials };
}

/** the @handle shown on end cards and in captions */
export const socialHandle = (url: string) => { try { const parts = new URL(url).pathname.split("/").filter(Boolean); return parts.length ? `@${parts.at(-1)!.replace(/^@/, "")}` : ""; } catch { return ""; } };

export async function companyMarket(ctx: AppContext, companyId: string): Promise<Market> {
  const { data, error } = await ctx.supabase.from("companies").select("industry, countries, socials").eq("id", companyId).maybeSingle();
  if (error || !data) return EMPTY_MARKET;
  return cleanMarket(data);
}

export async function companyMarkets(ctx: AppContext): Promise<Map<string, Market>> {
  const { data, error } = await ctx.supabase.from("companies").select("id, industry, countries, socials").eq("workspace_id", ctx.workspace.id);
  if (error) return new Map();
  return new Map((data ?? []).map((r) => [r.id as string, cleanMarket(r)]));
}

export async function saveCompanyMarket(ctx: AppContext, companyId: string, market: Market) {
  const { error } = await ctx.supabase.from("companies").update({ industry: market.industry, countries: market.countries, socials: market.socials }).eq("id", companyId).eq("workspace_id", ctx.workspace.id);
  if (error) console.error("[company] market not saved (is migration 0014 applied?)", { code: error.code, message: error.message });
  return !error;
}
