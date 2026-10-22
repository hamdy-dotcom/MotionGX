import "server-only";
import { z } from "zod";
import { callTool, SONNET } from "@/lib/ai/claude";
import { AiError } from "@/lib/ai/usage";
import { addDays, daysBetween, weekday } from "@/lib/dates";
import { PLAN_KINDS, PLAN_PLATFORMS, type PlanGoal, type PlanKind } from "./types";
import { seasonsBetween } from "@/lib/market/seasons";
import { industryLabel } from "@/lib/market/industries";
import { countryName } from "@/lib/market/countries";

export type IdeaDraft = { kind: PlanKind; angle: string; title: string; why: string; hook: string; platforms: string[]; occasion: string | null; suggested_on: string | null };

export type IdeaBrief = {
  workspaceId: string;
  brand: { name: string; site: string; tone: string; tagline: string; audience: string; whatItDoes: string; features: string[]; offers: string[]; numbers: string[]; dialect: string; industry?: string | null; countries?: string[] };
  startsOn: string;
  endsOn: string;
  goals: PlanGoal[];
  mix: PlanKind[];
  platforms: string[];
  notes: string;
  count: number;
  /** titles already in the plan — never repeat them */
  avoid: string[];
};

const DIALECT: Record<string, string> = {
  eg: "Egyptian colloquial Arabic (عامية مصرية) — the way the brand talks to Egyptians",
  sa: "Saudi colloquial Arabic", gulf: "Gulf colloquial Arabic", lev: "Levantine colloquial Arabic", msa: "clear Modern Standard Arabic", en: "English",
};
const GOAL: Record<PlanGoal, string> = { sales: "more sales / sign-ups", awareness: "people knowing the brand", launch: "launching or spotlighting a feature", community: "engagement — comments, shares, saves", season: "occasions and seasons in the period" };

const ideaSchema = z.object({
  ideas: z.array(z.object({
    kind: z.enum(PLAN_KINDS),
    angle: z.string().min(1).max(40),
    title: z.string().min(4).max(110),
    why: z.string().min(4).max(160),
    hook: z.string().min(4).max(200),
    platforms: z.array(z.enum(PLAN_PLATFORMS)).min(1).max(5),
    occasion: z.string().max(60).nullable(),
    suggested_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  })).min(1),
});

const tool = {
  name: "save_ideas",
  description: "Save the content ideas for the plan.",
  input_schema: {
    type: "object" as const,
    properties: {
      ideas: {
        type: "array",
        items: {
          type: "object",
          properties: {
            kind: { type: "string", enum: [...PLAN_KINDS], description: "image = one designed image + text; carousel = 3–8 slides telling one idea; video = a 15–60s reel on the brand's real interface; text = a text-only post" },
            angle: { type: "string", description: "the creative angle in 1–3 words in the brand's language (e.g. سؤال، قبل وبعد، خرافة وحقيقة، عرض حي، قصة عميل، الرقم الكبير، خطوة بخطوة، مناسبة)" },
            title: { type: "string", description: "the post's headline/hook as the audience would read it — specific, in the brand's dialect, max ~12 words" },
            why: { type: "string", description: "one short line: why this works for this audience/goal" },
            hook: { type: "string", description: "how the caption opens (first line or two), in the brand's dialect" },
            platforms: { type: "array", items: { type: "string", enum: [...PLAN_PLATFORMS] } },
            occasion: { type: ["string", "null"], description: "the occasion's name when the idea is tied to one, else null" },
            suggested_on: { type: ["string", "null"], description: "YYYY-MM-DD inside the period when the idea belongs to a specific day (an occasion), else null" },
          },
          required: ["kind", "angle", "title", "why", "hook", "platforms", "occasion", "suggested_on"],
          additionalProperties: false,
        },
      },
    },
    required: ["ideas"],
    additionalProperties: false,
  },
};

/** Writes `count` distinct, brand-true ideas for a period. */
export async function writeIdeas(b: IdeaBrief): Promise<IdeaDraft[]> {
  const n = daysBetween(b.startsOn, b.endsOn) + 1;
  const days = Array.from({ length: n }, (_, i) => addDays(b.startsOn, i));
  const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  // the moments in the brand's own countries and industry (lib/market/seasons.ts)
  const occasions = seasonsBetween({ from: b.startsOn, to: b.endsOn, countries: b.brand.countries ?? [], industry: b.brand.industry }).map((o) => ({ on: o.from < b.startsOn ? b.startsOn : o.from, name: `${o.name.ar}${o.to && o.to !== o.from ? ` (until ${o.to})` : ""}${o.approx ? " — expected date" : ""} — angle: ${o.angle.en}` }));
  const industry = industryLabel(b.brand.industry, "en");
  const markets = (b.brand.countries ?? []).map((c) => countryName(c, "en")).join(", ");
  const list = (xs: string[]) => (xs.length ? xs.map((x) => `- ${x}`).join("\n") : "- (none)");

  const prompt = `Brand: ${b.brand.name} (${b.brand.site})
What it does: ${b.brand.whatItDoes || b.brand.tagline}
Tagline: ${b.brand.tagline}
Industry: ${industry || "—"}
Markets: ${markets || "—"}
Voice: ${b.brand.tone || "—"}
Audience: ${b.brand.audience || "—"}
Features:
${list(b.brand.features)}
Offers / selling points:
${list(b.brand.offers)}
Numbers:
${list(b.brand.numbers)}

Plan period: ${b.startsOn} → ${b.endsOn} (${n} days: ${days.map((d) => `${d} ${WD[weekday(d)]}`).join(", ")})
Goals: ${b.goals.map((g) => GOAL[g]).join("; ") || "a healthy mix"}
Types to use (only these): ${b.mix.join(", ")}
Platforms the brand posts on: ${b.platforms.join(", ")} (videos go to instagram/tiktok; text-only to x/linkedin)
Occasions inside the period (for the brand's countries and industry): ${occasions.length ? occasions.map((o) => `${o.on} ${o.name}`).join("; ") : "none"}
The client's notes for this period: ${b.notes.trim() || "none"}
${b.avoid.length ? `Already in the plan — do NOT repeat or rephrase these:\n${list(b.avoid.slice(0, 80))}` : ""}

Write exactly ${b.count} content ideas. Rules:
- Language: ${DIALECT[b.brand.dialect] ?? DIALECT.msa}. Titles and hooks sound like this brand, not like an agency.
- Every idea belongs to this brand's industry${industry ? ` (${industry})` : ""} and speaks to its markets — what people in this industry actually post about, ask about and buy.
- Every idea is built on a real fact above (a feature, an offer, a number, the audience's real problem) — never invent features, prices or numbers.
- Vary the angle: no two neighbouring ideas share an angle; at most 3 ideas per angle in the whole set.
- Spread the types across the allowed ones; videos only if "video" is allowed.
- When the notes mention an offer, launch or date, include ideas for it (and date them if a day is given).
- Use the occasions above when they fit the goals; give those ideas the occasion's day as suggested_on.
- No generic greetings ("happy Friday") unless tied to the brand's value.
Call save_ideas.`;

  const result = await callTool({
    workspaceId: b.workspaceId,
    kind: "content_plan",
    model: SONNET,
    system: "You are the content strategist of an Arabic-first social media studio. You plan posts that are specific to one brand, true to its facts and voice, and varied in angle and format.",
    prompt,
    tool,
    schema: ideaSchema,
    check: (v) => (v.ideas.length < Math.ceil(b.count * 0.8) ? `Only ${v.ideas.length} ideas; write ${b.count}.` : null),
    maxTokens: Math.min(16000, 1200 + b.count * 380),
  });
  if (!result.value) throw new AiError("ai_invalid", result.problem);
  const avoid = new Set(b.avoid.map((x) => x.trim()));
  return result.value.ideas
    .filter((i) => !avoid.has(i.title.trim()))
    .slice(0, b.count)
    .map((i) => ({
      ...i,
      kind: b.mix.includes(i.kind) ? i.kind : b.mix[0],
      platforms: i.kind === "video" ? i.platforms.filter((p) => p === "instagram" || p === "tiktok").concat(i.platforms.some((p) => p === "instagram" || p === "tiktok") ? [] : ["instagram"]) : i.platforms,
      suggested_on: i.suggested_on && i.suggested_on >= b.startsOn && i.suggested_on <= b.endsOn ? i.suggested_on : null,
    }));
}
