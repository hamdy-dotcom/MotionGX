"use server";

import { after } from "next/server";
import { z } from "zod";
import { getAppContext } from "@/lib/context";
import { buildNotices, type Notice } from "@/lib/notices/build";
import { companyMarket } from "@/lib/data/market";
import { brandDetails } from "@/lib/data/works";
import { ensureTrends } from "@/lib/trends/daily";
import { ensureSeasonCheck } from "@/lib/market/live";
import { callTool, HAIKU } from "@/lib/ai/claude";
import { toAiErrorCode } from "@/lib/ai/usage";
import { industryLabel } from "@/lib/market/industries";
import { countryName } from "@/lib/market/countries";
import { addDays, todayKey } from "@/lib/dates";

/** the pop-ups for a brand; the day's trends are looked up in the background the first time they're asked for */
export async function getNotices(companyId: string): Promise<Notice[]> {
  const ctx = await getAppContext();
  const { data: company } = await ctx.supabase.from("companies").select("id").eq("id", companyId).maybeSingle(); // RLS
  if (!company) return [];
  const market = await companyMarket(ctx, companyId);
  const { notices, trendsPending } = await buildNotices(ctx, companyId, market, ctx.locale);
  if (trendsPending && market.industry && ctx.role !== "viewer") after(() => ensureTrends(ctx.workspace.id, market.industry!, market.countries));
  // the seasons calendar of each of the brand's countries is checked once a day (dates confirmed / moved, new seasons)
  if (market.countries.length && ctx.role !== "viewer") after(async () => { for (const c of market.countries.slice(0, 4)) await ensureSeasonCheck(ctx.workspace.id, c); });
  return notices;
}

/** «لاحقاً» (hidden for a day), «مش لينا» (never again), or done (acted on) */
export async function answerNotice(companyId: string, key: string, status: "later" | "dismissed" | "acted"): Promise<boolean> {
  const ctx = await getAppContext();
  if (!/^[\w:.-]{3,120}$/.test(key)) return false;
  const until = status === "later" ? new Date(Date.now() + 864e5).toISOString() : null;
  const { error } = await ctx.supabase.from("notice_states").upsert({ user_id: ctx.userId, workspace_id: ctx.workspace.id, company_id: companyId, key, status, until, updated_at: new Date().toISOString() }, { onConflict: "user_id,company_id,key" });
  return !error;
}

const KINDS = ["image", "carousel", "video", "text"] as const;
const draftSchema = z.object({ kind: z.enum(KINDS), title: z.string().min(3).max(110), brief: z.string().min(20).max(1200), day_offset: z.number().int().min(0).max(45) });
const draftTool = {
  name: "save_idea",
  description: "Save the content idea for the brand.",
  input_schema: {
    type: "object" as const,
    additionalProperties: false,
    required: ["kind", "title", "brief", "day_offset"],
    properties: {
      kind: { type: "string", enum: [...KINDS], description: "the best format for this moment: image post, carousel, motion video, or text post" },
      title: { type: "string", description: "a short title for the idea" },
      brief: { type: "string", description: "the brief for the studio: what the piece says and shows, its hook, and its call to action — in the brand's dialect" },
      day_offset: { type: "integer", description: "days from today it should go out (0 = today)" },
    },
  },
};

/** «اكتب فكرة»: a brief for this brand, grounded in its facts, for the season or trend — opens in Create */
export async function draftFromNotice(companyId: string, notice: Notice): Promise<{ ok: true; href: string } | { ok: false; error: string }> {
  const ctx = await getAppContext();
  if (ctx.role === "viewer") return { ok: false, error: "forbidden" };
  const { data: company } = await ctx.supabase.from("companies").select("id, name, website_url, default_dialect").eq("id", companyId).maybeSingle();
  if (!company) return { ok: false, error: "not_found" };
  const [details, market] = await Promise.all([brandDetails(ctx, companyId), companyMarket(ctx, companyId)]);
  const moment = notice.kind === "season"
    ? `A dated moment: ${notice.season.name} (${notice.season.from}${notice.season.to ? ` → ${notice.season.to}` : ""}${notice.season.approx ? ", expected date" : notice.season.status ? ", date confirmed" : ""}), ${notice.season.daysAway} days from today. A fitting angle: ${notice.season.angle}.`
    : notice.kind === "trend"
      ? `A trend in the brand's industry today: ${notice.trend.title}. Why it matters: ${notice.trend.why}. A possible angle: ${notice.trend.angle}.`
      : "";
  if (!moment) return { ok: false, error: "bad_request" };
  const dialect = { eg: "Egyptian colloquial Arabic", sa: "Saudi colloquial Arabic", gulf: "Gulf colloquial Arabic", lev: "Levantine colloquial Arabic", msa: "Modern Standard Arabic", en: "English" }[company.default_dialect as string] ?? "Arabic";
  try {
    const res = await callTool({
      workspaceId: ctx.workspace.id,
      kind: "notice_draft",
      model: HAIKU,
      system: "You are the social media lead of a small brand. You turn a moment (a season or a trend) into one content idea that is about THIS brand — its real product, features and offers — never generic, never a claim the brand's facts don't support. Sensitive moments (religious, national, remembrance) get respectful, low-key ideas without hard selling.",
      prompt: `Brand: ${company.name} (${company.website_url ?? ""})
Industry: ${industryLabel(market.industry, "en") || "unknown"} · Markets: ${market.countries.map((c) => countryName(c, "en")).join(", ") || "unknown"}
What it does: ${details.facts.what_it_does ?? ""}
Audience: ${details.facts.audience ?? ""}
Features: ${(details.facts.key_features ?? []).slice(0, 12).join(" | ")}
Offers / selling points: ${[...(details.facts.offers ?? []), ...details.sellingPoints].slice(0, 8).join(" | ")}
Voice: ${details.tone}
Write in: ${dialect}

${moment}

Write ONE idea for this brand. The brief is 2–5 sentences the studio will make the piece from.`,
      tool: draftTool,
      schema: draftSchema,
    });
    if (!res.value) return { ok: false, error: "ai_failed" };
    await answerNotice(companyId, notice.key, "acted");
    const day = notice.kind === "season" ? (res.value.day_offset <= notice.season.daysAway ? addDays(todayKey(), res.value.day_offset) : notice.season.from) : addDays(todayKey(), Math.min(res.value.day_offset, 3));
    const q = new URLSearchParams({ kind: res.value.kind, brief: `${res.value.title}\n\n${res.value.brief}`, day, company: companyId });
    return { ok: true, href: `/create?${q.toString()}` };
  } catch (err) {
    return { ok: false, error: toAiErrorCode(err) };
  }
}
