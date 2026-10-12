// Technique cards for prompt-motion.com entries: one Haiku call each (logged to ai_usage as a system
// job, kind "ref_card"), cached in scripts/refs/cache/cards/ so re-runs don't pay again.
// Cards are our own English description of the technique — never the creator's prompt.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { callTool, HAIKU } from "../../lib/ai/claude";
import { CostCapError, costOf, withRun, type RunContext } from "../../lib/ai/usage";
import { GOALS } from "../../lib/types";
import { LICENSE, type RawEntry } from "./prompt-motion";

const CARD_DIR = path.resolve("scripts/refs/cache/cards");
const OUT = path.resolve("scripts/refs/prompt-motion.json");
const CAP_USD = 5;
const CONCURRENCY = 4;

export const cardSchema = z.object({
  summary: z.string().min(10).max(200),
  motion_language: z.string().min(3).max(60),
  techniques: z.array(z.string().min(3).max(80)).min(2).max(8),
  pacing: z.string().min(3).max(160),
  palette_usage: z.string().min(3).max(200),
  best_for_industries: z.array(z.string().min(2).max(40)).min(1).max(6),
  best_for_goals: z.array(z.enum(GOALS)).min(1).max(4),
  difficulty: z.enum(["easy", "medium", "hard"]),
});
export type TechniqueCard = z.infer<typeof cardSchema>;

const tool = {
  name: "save_card",
  description: "Save the technique card for this motion-design reference.",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: { type: "string", description: "One line, ≤ 200 chars: what the video is and what makes its motion distinctive." },
      motion_language: { type: "string", description: "2–5 word label for the motion style, e.g. 'kinetic grid', 'liquid morphs'." },
      techniques: { type: "array", items: { type: "string" }, description: "2–8 concrete techniques, e.g. 'per-letter stagger', 'SVG stroke draw', 'particle field', '3D extrude', 'mask wipe', 'data count-up'." },
      pacing: { type: "string", description: "Rhythm and cut speed, e.g. 'fast cuts on the beat, slow hold on the logo'." },
      palette_usage: { type: "string", description: "How color is used (not specific brand hexes)." },
      best_for_industries: { type: "array", items: { type: "string" } },
      best_for_goals: { type: "array", items: { type: "string", enum: [...GOALS] }, description: "sell = product ad, launch, offer = promo/discount, about = brand story, hiring, occasion = seasonal/holiday" },
      difficulty: { type: "string", enum: ["easy", "medium", "hard"], description: "How hard to build in code (Remotion/React)." },
    },
    required: ["summary", "motion_language", "techniques", "pacing", "palette_usage", "best_for_industries", "best_for_goals", "difficulty"],
  },
};

const SYSTEM = `You catalogue motion-design references for an internal inspiration index used by a creative director.
Describe the TECHNIQUE in your own words, in English, abstractly enough to reuse for a different brand.
Never copy the creator's prompt: no sentence or phrase longer than 5 words from it, no product names from it, no quotes.`;

/** Any run of ≥ 8 consecutive words shared with the source prompt counts as copying. */
function copiedPhrase(card: TechniqueCard, prompt: string): string | null {
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const src = norm(prompt);
  const grams = new Set<string>();
  for (let i = 0; i + 8 <= src.length; i++) grams.add(src.slice(i, i + 8).join(" "));
  const text = norm([card.summary, card.pacing, card.palette_usage, ...card.techniques].join(" . "));
  for (let i = 0; i + 8 <= text.length; i++) {
    const g = text.slice(i, i + 8).join(" ");
    if (grams.has(g)) return g;
  }
  return null;
}

async function cardFor(e: RawEntry): Promise<TechniqueCard | null> {
  const file = path.join(CARD_DIR, `${e.slug}.json`);
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  const res = await callTool({
    workspaceId: null,
    kind: "ref_card",
    model: HAIKU,
    system: SYSTEM,
    prompt: `Reference "${e.title}" (${e.type}; tags: ${e.tags.join(", ") || "none"}; ${e.width && e.height ? `${e.width}×${e.height}` : "size unknown"}).
The creator's ${e.type === "Skill" ? "skill description" : "prompt"} (source material — describe it, do not copy it):
"""
${e.prompt.slice(0, 6000)}
"""`,
    tool,
    schema: cardSchema,
    check: (c) => {
      const copied = copiedPhrase(c, e.prompt);
      return copied ? `This phrase is copied from the prompt: "${copied}". Rewrite everything in your own words.` : null;
    },
    maxTokens: 1200,
  });
  if (!res.value) {
    console.warn(`  card failed for ${e.slug}: ${res.problem}`);
    return null;
  }
  writeFileSync(file, JSON.stringify(res.value, null, 1));
  return res.value;
}

/** Readable text the director sees for this reference (our card, never the prompt). */
export const cardText = (c: TechniqueCard) =>
  `${c.summary} Motion language: ${c.motion_language}. Techniques: ${c.techniques.join("; ")}. Pacing: ${c.pacing}. Color: ${c.palette_usage}. Best for: ${c.best_for_industries.join(", ")} (${c.best_for_goals.join(", ")}). Difficulty: ${c.difficulty}.`;

export async function writeCards(entries: RawEntry[]) {
  mkdirSync(CARD_DIR, { recursive: true });
  const ctx: RunContext = { usage: [], printCost: true, capUsd: CAP_USD };
  const cards = new Map<string, TechniqueCard>();
  let failed = 0;
  try {
    await withRun(ctx, async () => {
      const queue = [...entries];
      const worker = async () => {
        for (let e = queue.shift(); e; e = queue.shift()) {
          const card = await cardFor(e);
          if (card) cards.set(e.slug, card);
          else failed++;
        }
      };
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    });
  } catch (err) {
    if (err instanceof CostCapError) {
      console.error(`STOPPED: ${err.message} (cards written so far are cached)`);
      process.exitCode = 1;
      return;
    }
    throw err;
  }

  const out = entries
    .filter((e) => cards.has(e.slug))
    .map((e) => {
      const card = cards.get(e.slug)!;
      return {
        id: `pm-${e.slug}`,
        title: e.title,
        source_url: e.source_url ?? e.url,
        creator: e.creator_handle || e.creator_name,
        category: e.tags[0] ?? "General",
        tags: e.tags,
        prompt_text: cardText(card),
        code_snippet: null,
        license_note: LICENSE,
        card: { ...card, type: e.type, model: e.model, effort: e.effort, posted: e.posted, entry_url: e.url, skill_links: e.skill_links },
        embed_text: `${card.summary} ${card.techniques.join(", ")}. ${e.tags.join(", ")}`,
      };
    });
  writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
  const cost = costOf(ctx.usage);
  console.log(`\ncards: ${out.length} written, ${failed} failed, ${ctx.usage.length} AI calls this run, $${cost.usd.toFixed(4)} → ${path.relative(process.cwd(), OUT)}`);
}
