import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { SONNET } from "@/lib/ai/claude";
import { logUsage } from "@/lib/ai/usage";
import { countryName } from "@/lib/market/countries";
import { industryLabel } from "@/lib/market/industries";
import { todayKey } from "@/lib/dates";

// The day's trending topics in an industry, in the markets a brand works in: found once a day per industry + region
// with Claude's web search, kept in industry_trends and shared by every brand with the same industry and countries.

export type Trend = { id: string; title: { ar: string; en: string }; why: { ar: string; en: string }; angle: { ar: string; en: string }; sources: { title: string; url: string }[] };

const schema = z.object({
  trends: z.array(z.object({
    title_ar: z.string().min(3).max(120), title_en: z.string().min(3).max(120),
    why_ar: z.string().min(3).max(240), why_en: z.string().min(3).max(240),
    angle_ar: z.string().min(3).max(240), angle_en: z.string().min(3).max(240),
    sources: z.array(z.object({ title: z.string().max(160), url: z.string().url() })).min(1).max(4),
  })).max(5),
});

const tool = {
  name: "save_trends",
  description: "Save today's trends for this industry and region.",
  strict: true,
  input_schema: {
    type: "object" as const,
    additionalProperties: false,
    required: ["trends"],
    properties: {
      trends: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title_ar", "title_en", "why_ar", "why_en", "angle_ar", "angle_en", "sources"],
          properties: {
            title_ar: { type: "string", description: "the trend, a short Arabic headline" },
            title_en: { type: "string" },
            why_ar: { type: "string", description: "why it matters to brands in this industry right now (Arabic, one sentence)" },
            why_en: { type: "string" },
            angle_ar: { type: "string", description: "a content angle a brand could post today (Arabic, one sentence)" },
            angle_en: { type: "string" },
            sources: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "url"], properties: { title: { type: "string" }, url: { type: "string" } } } },
          },
        },
      },
    },
  },
};

const regionKey = (countries: string[]) => [...countries].sort().join(",") || "GCC,EG";

/** today's trends for an industry + region: the stored row, or null while (or if) none exists yet */
export async function trendsFor(industry: string, countries: string[]): Promise<Trend[] | null> {
  const { data } = await createAdminClient().from("industry_trends").select("items, status").eq("industry", industry).eq("region", regionKey(countries)).eq("day", todayKey()).maybeSingle();
  return data?.status === "ready" ? ((data.items ?? []) as Trend[]) : null;
}

/** find today's trends once (the first brand to ask starts it; a row marks it taken). Call in after(). */
export async function ensureTrends(workspaceId: string, industry: string, countries: string[]) {
  const db = createAdminClient();
  const region = regionKey(countries), day = todayKey();
  const { error: claim } = await db.from("industry_trends").insert({ industry, region, day, status: "pending" });
  if (claim) return; // another request has it (or it's done) — or the 0014 migration isn't applied
  try {
    const items = await searchTrends(workspaceId, industry, countries);
    await db.from("industry_trends").update({ items, status: "ready" }).eq("industry", industry).eq("region", region).eq("day", day);
  } catch (err) {
    console.error("[trends] search failed", { industry, region, err });
    await db.from("industry_trends").update({ status: "failed" }).eq("industry", industry).eq("region", region).eq("day", day);
  }
}

async function searchTrends(workspaceId: string, industry: string, countries: string[]): Promise<Trend[]> {
  const client = new Anthropic();
  const markets = (countries.length ? countries : ["SA", "AE", "EG"]).map((c) => countryName(c, "en")).join(", ");
  const sector = industryLabel(industry, "en") || industry;
  const day = todayKey();
  const system = "You find what is trending today for small and medium brands' social media in the Arab world. You search the web, keep only real, recent, verifiable items, and never invent a trend, a number or a source.";
  const prompt = `Today is ${day}. Industry: ${sector}. Markets: ${markets}.
Search the web for what is trending in this industry in these markets in the last 3 days: news, launches, viral formats and sounds, hashtags, consumer conversations on Arabic social media, regulation changes, big events.
Keep 3–5 items a brand in this industry could post about today. Skip politics, wars, tragedies, religious controversy, celebrity gossip and anything a brand should not ride.
Each item needs 1–2 source URLs from your search results. Then call save_trends once. If nothing fits, call it with an empty list.`;
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: prompt }];
  const tools = [
    { type: "web_search_20260209", name: "web_search", max_uses: 6, user_location: { type: "approximate", country: countries[0] ?? "SA" } },
    tool,
  ] as unknown as Anthropic.Beta.BetaToolUnion[];

  for (let turn = 0; turn < 4; turn++) {
    const started = Date.now();
    const res = await client.beta.messages.create({
      model: SONNET,
      max_tokens: 8000,
      system,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      tools,
      tool_choice: { type: "auto" },
      messages,
    } as Anthropic.Beta.MessageCreateParamsNonStreaming);
    await logUsage(workspaceId, "trends", res.model ?? SONNET, res.usage, Date.now() - started);
    if (res.stop_reason === "refusal") throw new Error("refusal");
    const call = res.content.find((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use" && b.name === tool.name);
    if (call) {
      const parsed = schema.safeParse(call.input);
      if (!parsed.success) throw new Error(`invalid trends: ${parsed.error.issues[0]?.message}`);
      return parsed.data.trends.map((x, i) => ({ id: `${day}-${i}`, title: { ar: x.title_ar, en: x.title_en }, why: { ar: x.why_ar, en: x.why_en }, angle: { ar: x.angle_ar, en: x.angle_en }, sources: x.sources.filter((s) => /^https:\/\//.test(s.url)) }));
    }
    // a long search pauses the turn: continue it; otherwise ask once more for the tool call
    messages.push({ role: "assistant", content: res.content as Anthropic.Beta.BetaContentBlockParam[] });
    if (res.stop_reason !== "pause_turn") messages.push({ role: "user", content: "Call save_trends now with what you found." });
  }
  throw new Error("no save_trends call");
}
