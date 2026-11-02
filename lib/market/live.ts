import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { webResearch } from "@/lib/ai/web";
import { addDays, todayKey } from "@/lib/dates";
import { countryName } from "./countries";
import { INDUSTRIES, type Industry } from "./industries";
import { BASE_SEASONS, type Season } from "./seasons";

// The live seasons calendar: the researched list (seasons.ts) with what a daily web search found for each country
// overlaid — a date confirmed (approx → exact), moved or cancelled, with its source; and seasons it added (a festival
// that announced its dates, an official holiday, a national campaign). One check per country per day, shared by every
// brand that works there (season_checks / season_updates, migration 0015).

const WINDOW = 75; // days ahead the check looks at
const KINDS = ["national", "religious", "shopping", "festival", "school", "awareness", "global"] as const;

type Row = { season_key: string; country: string; action: "confirm" | "move" | "cancel" | "add"; from_day: string | null; to_day: string | null; data: Record<string, unknown>; source_url: string | null; source_title: string | null };

/** the calendar for a brand's countries: base seasons with their updates applied, plus the added ones */
export async function liveSeasons(countries: string[]): Promise<Season[]> {
  const markets = countries;
  if (!markets.length) return BASE_SEASONS;
  const { data, error } = await createAdminClient().from("season_updates").select("season_key, country, action, from_day, to_day, data, source_url, source_title").in("country", markets);
  if (error || !data?.length) return BASE_SEASONS;
  const rows = data as Row[];
  // a season checked for several of the brand's countries: the first country's finding wins
  const pick = new Map<string, Row>();
  for (const c of markets) for (const r of rows) if (r.country === c && !pick.has(r.season_key)) pick.set(r.season_key, r);
  const src = (r: Row) => (r.source_url ? { url: r.source_url, title: r.source_title ?? "" } : undefined);
  const out: Season[] = BASE_SEASONS.map((s) => {
    const r = pick.get(s.id);
    if (!r || r.action === "add") return s;
    if (r.action === "cancel") return { ...s, status: "cancelled", source: src(r) };
    return { ...s, from: r.from_day ?? s.from, to: r.to_day ?? s.to, approx: false, status: r.action === "move" ? "moved" : "confirmed", source: src(r) };
  });
  for (const r of pick.values()) {
    if (r.action !== "add" || !r.from_day) continue;
    const d = r.data as { name?: { ar: string; en: string }; kind?: Season["kind"]; industries?: Industry[]; angle?: { ar: string; en: string } };
    if (!d.name) continue;
    out.push({ id: r.season_key, kind: d.kind ?? "festival", name: d.name, from: r.from_day, ...(r.to_day && r.to_day !== r.from_day ? { to: r.to_day } : {}), countries: [r.country], ...(d.industries?.length ? { industries: d.industries } : {}), lead: 21, angle: d.angle ?? d.name, status: "added", source: src(r) });
  }
  return out;
}

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const source = z.object({ url: z.string().url(), title: z.string().max(200) });
const schema = z.object({
  checked: z.array(z.object({ id: z.string().max(80), verdict: z.enum(["confirmed", "moved", "cancelled", "unknown"]), from: day.nullable(), to: day.nullable(), source: source.nullable(), note: z.string().max(240) })).max(40),
  added: z.array(z.object({
    name_ar: z.string().min(2).max(90), name_en: z.string().min(2).max(90), from: day, to: day.nullable(), kind: z.enum(KINDS),
    industries: z.array(z.enum(INDUSTRIES)).max(12), angle_ar: z.string().min(3).max(200), angle_en: z.string().min(3).max(200), source,
  })).max(8),
});

const tool = {
  name: "save_season_check",
  description: "Save what you verified about the listed seasons and the new ones you found.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["checked", "added"],
    properties: {
      checked: {
        type: "array",
        description: "one entry per listed season you could check",
        items: {
          type: "object", additionalProperties: false, required: ["id", "verdict", "from", "to", "source", "note"],
          properties: {
            id: { type: "string", description: "the season id from the list" },
            verdict: { type: "string", enum: ["confirmed", "moved", "cancelled", "unknown"], description: "confirmed = an official / reliable source gives the listed date; moved = it gives another date; cancelled = it won't happen this year; unknown = not announced yet" },
            from: { type: ["string", "null"], description: "YYYY-MM-DD as announced (confirmed / moved)" },
            to: { type: ["string", "null"], description: "YYYY-MM-DD last day, when it spans days" },
            source: { type: ["object", "null"], additionalProperties: false, required: ["url", "title"], properties: { url: { type: "string" }, title: { type: "string" } } },
            note: { type: "string", description: "one short line (e.g. 'public holiday moved to Thursday by royal decree')" },
          },
        },
      },
      added: {
        type: "array",
        description: "seasons brands in this country plan content around, missing from the list, with an announced date in the window",
        items: {
          type: "object", additionalProperties: false, required: ["name_ar", "name_en", "from", "to", "kind", "industries", "angle_ar", "angle_en", "source"],
          properties: {
            name_ar: { type: "string" }, name_en: { type: "string" }, from: { type: "string" }, to: { type: ["string", "null"] },
            kind: { type: "string", enum: [...KINDS] },
            industries: { type: "array", items: { type: "string", enum: [...INDUSTRIES] }, description: "the industries it matters to (empty = every industry)" },
            angle_ar: { type: "string", description: "a content angle for brands (Arabic, one line)" }, angle_en: { type: "string" },
            source: { type: "object", additionalProperties: false, required: ["url", "title"], properties: { url: { type: "string" }, title: { type: "string" } } },
          },
        },
      },
    },
  },
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

/** run today's check for a country once (the first request claims it). Call in after(). */
export async function ensureSeasonCheck(workspaceId: string, country: string) {
  const db = createAdminClient();
  const today = todayKey();
  const { error: claim } = await db.from("season_checks").insert({ country, day: today, status: "pending" });
  if (claim) return; // already checked today (or running), or migration 0015 isn't applied
  try {
    const summary = await checkCountry(workspaceId, country, today);
    await db.from("season_checks").update({ status: "ready", summary }).eq("country", country).eq("day", today);
  } catch (err) {
    console.error("[seasons] check failed", { country, err });
    await db.from("season_checks").update({ status: "failed" }).eq("country", country).eq("day", today);
  }
}

async function checkCountry(workspaceId: string, country: string, today: string) {
  const end = addDays(today, WINDOW);
  // this country's own seasons, and the shopping seasons every market shares (their dates can differ by country)
  const current = (await liveSeasons([country]))
    .filter((s) => s.kind !== "payday" && s.kind !== "awareness" && s.status !== "cancelled")
    .filter((s) => (s.countries === "all" ? s.kind === "shopping" : s.countries.includes(country)))
    .filter((s) => (s.to ?? s.from) >= today && s.from <= end);
  const list = current.map((s) => ({ id: s.id, name: s.name.en, from: s.from, to: s.to ?? null, expected: Boolean(s.approx), already: s.status ?? null }));
  const name = countryName(country, "en");
  const out = await webResearch({
    workspaceId,
    kind: "season_check",
    country,
    maxSearches: 8,
    system: "You keep a marketing calendar of national, religious, shopping and festival dates accurate for one country. You trust official and major sources (government press agencies, ministries, the moon-sighting authority, the event's own site, major national media). You never guess a date: when something isn't announced yet, it stays 'unknown'.",
    prompt: `Today is ${today}. Country: ${name} (${country}). Window: ${today} → ${end}.

The calendar's seasons for this country in the window:
${JSON.stringify(list)}

1) Check the dates. Prioritise the "expected" ones (moon-sighted Hijri dates, festivals whose dates weren't announced) and official holidays that may be shifted. For each one you can verify, give the verdict, the announced date(s) and the source.
2) Find what's missing: seasons in ${name} in the window that brands plan social content around — festivals and seasons with announced dates, official holidays and their dates, big national campaigns or shopping events. Only with a source; at most 8; nothing political, no tragedies.
Then call save_season_check once.`,
    tool,
    schema,
  });

  const db = createAdminClient();
  const known = new Set(current.map((s) => s.id));
  const inWindow = (d: string | null) => !d || (d >= addDays(today, -1) && d <= addDays(today, 150));
  const rows: Record<string, unknown>[] = [];
  for (const c of out.checked) {
    if (!known.has(c.id) || c.verdict === "unknown" || !c.source || !/^https:\/\//.test(c.source.url) || !inWindow(c.from) || !inWindow(c.to)) continue;
    if (c.verdict !== "cancelled" && !c.from) continue;
    rows.push({ season_key: c.id, country, action: c.verdict === "confirmed" ? "confirm" : c.verdict === "moved" ? "move" : "cancel", from_day: c.from, to_day: c.to, data: { note: c.note }, source_url: c.source.url, source_title: c.source.title, checked_on: today });
  }
  const names = new Set(current.map((s) => s.name.en.toLowerCase()));
  for (const a of out.added) {
    if (!/^https:\/\//.test(a.source.url) || !inWindow(a.from) || !inWindow(a.to) || names.has(a.name_en.toLowerCase())) continue;
    rows.push({ season_key: `live:${country}:${slug(a.name_en)}-${a.from.slice(0, 4)}`, country, action: "add", from_day: a.from, to_day: a.to && a.to >= a.from ? a.to : null, data: { name: { ar: a.name_ar, en: a.name_en }, kind: a.kind, industries: a.industries, angle: { ar: a.angle_ar, en: a.angle_en } }, source_url: a.source.url, source_title: a.source.title, checked_on: today });
  }
  if (rows.length) {
    const { error } = await db.from("season_updates").upsert(rows, { onConflict: "season_key,country" });
    if (error) throw new Error(`season_updates: ${error.message}`);
  }
  const count = (a: string) => rows.filter((r) => r.action === a).length;
  return { confirmed: count("confirm"), moved: count("move"), cancelled: count("cancel"), added: count("add") };
}
