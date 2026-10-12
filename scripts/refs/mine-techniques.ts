// Phase 3D: mine concrete motion techniques from all 233 prompt-motion.com prompts + the 4 linked skill
// repos (MIT/Apache), canonicalise them, and rank by how many prompts use each.
//   npx tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/refs/mine-techniques.ts <skilldocs.txt>
// → data/techniques.json. All AI is logged to ai_usage (system job) under a $10 library cap.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { callTool, HAIKU, SONNET } from "../../lib/ai/claude";
import { costOf, withRun, type RunContext } from "../../lib/ai/usage";

const CACHE = path.resolve("scripts/refs/cache/mining");
const SEED = [
  "pure-function-of-time rendering", "closed-form springs", "spring superposition for retargeting", "dual-spring leading/trailing edge stretch (liquid)",
  "single-shape continuous morph with blur-swapped content", "cursor direct manipulation computed from time", "sub-frame motion blur", "seamless loop (last frame = first)",
  "per-beat still check", "beat-synced cuts", "kinetic typography", "per-word/character stagger", "masked/clip reveal", "camera push/pull", "parallax depth",
  "shared-element morph", "UI capture in device/browser frames", "count-up numbers", "SVG path draw", "particle field", "3D extrude/perspective tilt",
];

const tagSchema = z.object({ items: z.array(z.object({ id: z.string(), techniques: z.array(z.string().min(2).max(70)).max(14) })) });
const tagTool = {
  name: "save_tags",
  description: "Save the concrete motion techniques each prompt asks for.",
  input_schema: {
    type: "object" as const,
    properties: { items: { type: "array", items: { type: "object", properties: { id: { type: "string" }, techniques: { type: "array", items: { type: "string" } } }, required: ["id", "techniques"], additionalProperties: false } } },
    required: ["items"],
    additionalProperties: false,
  },
};
const docSchema = z.object({ techniques: z.array(z.object({ name: z.string().min(2).max(70), how: z.string().max(260) })).max(60) });
const docTool = {
  name: "save_techniques",
  description: "Save every concrete, renderable motion technique described in this document.",
  input_schema: {
    type: "object" as const,
    properties: { techniques: { type: "array", items: { type: "object", properties: { name: { type: "string" }, how: { type: "string", description: "one sentence: how it is computed/rendered" } }, required: ["name", "how"], additionalProperties: false } } },
    required: ["techniques"],
    additionalProperties: false,
  },
};

const cached = async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
  const f = path.join(CACHE, `${key}.json`);
  if (existsSync(f)) return JSON.parse(readFileSync(f, "utf8"));
  const v = await fn();
  writeFileSync(f, JSON.stringify(v));
  return v;
};

(async () => {
  mkdirSync(CACHE, { recursive: true });
  const ctx: RunContext = { usage: [], printCost: true, capUsd: 10 };
  await withRun(ctx, async () => {
    const entries = JSON.parse(readFileSync("scripts/refs/cache/entries.json", "utf8")) as { slug: string; title: string; tags: string[]; prompt: string }[];
    // 1. tag every prompt
    const tags = new Map<string, string[]>();
    for (let i = 0; i < entries.length; i += 30) {
      const batch = entries.slice(i, i + 30);
      const res = await cached(`prompts2-${i}`, async () => {
        const r = await callTool({
          workspaceId: null,
          kind: "ref_card",
          model: HAIKU,
          system: `You catalogue motion-design techniques at a FINE grain. For each prompt, list every concrete, renderable motion technique it asks for or clearly implies — be specific about the mechanism (e.g. "letters fall in with gravity bounce", "logo assembles from particles", "card flips in 3D", "liquid blob merge", "iris/circle wipe transition", "number ticker roll", "cursor drags slider", "ink bleed reveal", "glitch RGB split", "dolly zoom", "orbiting elements", "elastic overshoot scale"). 3–10 per prompt, 2–6 words each. Examples of the grain we care about (use only when exact): ${SEED.join("; ")}. Never list vague qualities ("premium", "dynamic", "kinetic typography" alone).`,
          prompt: batch.map((e) => `[${e.slug}] ${e.title} (tags: ${e.tags.join(", ") || "none"}): ${e.prompt}`).join("\n\n"),
          tool: tagTool,
          schema: tagSchema,
          maxTokens: 4000,
        });
        return r.value?.items ?? [];
      });
      for (const it of res) tags.set(it.id.replace(/^\[|\]$/g, ""), it.techniques);
    }
    // 2. skill docs
    const docList = process.argv[2] ? readFileSync(process.argv[2], "utf8").split("\n").filter(Boolean) : [];
    const docTech: { name: string; how: string; source: string }[] = [];
    const root = path.dirname(process.argv[2] ?? ".");
    for (const rel of docList) {
      const file = path.isAbsolute(rel) ? rel : path.join(root, "src", rel);
      if (!existsSync(file)) continue;
      const text = readFileSync(file, "utf8");
      if (text.length < 400) continue;
      for (let k = 0; k * 24000 < Math.min(text.length, 120000); k++) {
        const chunk = text.slice(k * 24000, (k + 1) * 24000);
        if (!/spring|eas|stagger|morph|motion|camera|blur|beat|frame|animat/i.test(chunk)) continue;
        const key = `doc-${rel.replace(/[^\w]+/g, "_").slice(-80)}-${k}`;
        const r = await cached(key, async () => {
          const out = await callTool({ workspaceId: null, kind: "ref_card", model: HAIKU, system: "You extract concrete, renderable motion-design techniques from documentation for a code-driven video engine. Name each technique (2–6 words) and say in one sentence how it is computed or rendered. Skip setup, tooling and process advice.", prompt: `Document ${rel} (part ${k + 1}):\n"""\n${chunk}\n"""`, tool: docTool, schema: docSchema, maxTokens: 4000 });
          return out.value?.techniques ?? [];
        });
        for (const t of r) docTech.push({ ...t, source: rel });
      }
    }
    // 3. canonicalise
    const rawCounts = new Map<string, number>();
    for (const list of tags.values()) for (const t of new Set(list.map((x) => x.toLowerCase().trim()))) rawCounts.set(t, (rawCounts.get(t) ?? 0) + 1);
    const docNames = [...new Set(docTech.map((d) => d.name.toLowerCase().trim()))];
    // 3a. Sonnet proposes a fine-grained taxonomy; 3b. Haiku maps every raw name onto it (batches).
    const taxSchema = z.object({ canonical: z.array(z.object({ name: z.string(), description: z.string().max(300) })).min(40).max(140) });
    const taxTool = { name: "save_taxonomy", description: "Save the canonical technique taxonomy.", input_schema: { type: "object" as const, properties: { canonical: { type: "array", items: { type: "object", properties: { name: { type: "string" }, description: { type: "string", description: "one sentence: how it is rendered" } }, required: ["name", "description"] } } }, required: ["canonical"] } };
    const topPrompt = [...rawCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 320);
    const tax = await cached("taxonomy", async () => {
      const r = await callTool({
        workspaceId: null, kind: "ref_card", model: SONNET, strict: false, effort: "low",
        system: "You design a FINE-GRAINED canonical taxonomy of motion-design techniques for a code-driven 9:16 ad video engine. 80–120 entries. Merge only true synonyms; keep different mechanisms separate (iris wipe ≠ linear wipe ≠ blinds; spring overshoot ≠ bounce ≠ elastic; per-letter ≠ per-word ≠ per-line; camera push ≠ dolly zoom ≠ orbit). No qualities, tooling or process.",
        prompt: `Raw names from 233 prompts (count):\n${topPrompt.map(([k, v]) => `${k} (${v})`).join("\n")}\n\nRaw names from skill docs (sample):\n${docNames.filter((_, i) => i % 3 === 0).join("\n")}\n\nCall save_taxonomy with 80–120 canonical techniques.`,
        tool: taxTool, schema: taxSchema, maxTokens: 12000,
      });
      return r.value?.canonical ?? [];
    });
    const mapSchema = z.object({ map: z.array(z.object({ raw: z.string(), canonical: z.string() })) });
    const mapTool = { name: "save_map", description: "Map each raw name to one canonical name (or \"none\").", input_schema: { type: "object" as const, properties: { map: { type: "array", items: { type: "object", properties: { raw: { type: "string" }, canonical: { type: "string" } }, required: ["raw", "canonical"], additionalProperties: false } } }, required: ["map"], additionalProperties: false } };
    const allRaw = [...new Set([...rawCounts.keys(), ...docNames])];
    const aliasOf = new Map<string, string>();
    for (let i = 0; i < allRaw.length; i += 150) {
      const part = allRaw.slice(i, i + 150);
      const m = await cached(`map-${i}`, async () => {
        const r = await callTool({ workspaceId: null, kind: "ref_card", model: HAIKU, system: `Map each raw motion-technique name to exactly one canonical name from this list, or "none" if it is not a renderable technique or fits nothing. Canonical names:\n${tax.map((t) => t.name).join("\n")}`, prompt: part.join("\n"), tool: mapTool, schema: mapSchema, maxTokens: 8000 });
        return r.value?.map ?? [];
      });
      for (const x of m) if (x.canonical !== "none") aliasOf.set(x.raw.toLowerCase().trim(), x.canonical);
    }
    const canon = tax.map((t) => ({ ...t, aliases: [] as string[] }));
    for (const c of canon) aliasOf.set(c.name.toLowerCase().trim(), c.name);
    // 4. rank
    const ranked = canon
      .map((c) => {
        const prompts = [...tags.entries()].filter(([, list]) => list.some((t) => aliasOf.get(t.toLowerCase().trim()) === c.name)).map(([id]) => id);
        const docs = [...new Set(docTech.filter((d) => aliasOf.get(d.name.toLowerCase().trim()) === c.name).map((d) => d.source))];
        return { name: c.name, description: c.description, prompts: prompts.length, docs: docs.length, examples: prompts.slice(0, 5), doc_sources: docs, how: docTech.find((d) => aliasOf.get(d.name.toLowerCase().trim()) === c.name)?.how ?? null };
      })
      .sort((a, b) => b.prompts - a.prompts || b.docs - a.docs);
    mkdirSync("data", { recursive: true });
    writeFileSync("data/techniques.json", JSON.stringify({ generated: new Date().toISOString(), prompts: entries.length, docs: docList.length, techniques: ranked }, null, 1));
    console.log(`\n${ranked.length} canonical techniques from ${tags.size} prompts + ${docTech.length} doc techniques · AI $${costOf(ctx.usage).usd.toFixed(4)}`);
    for (const r of ranked.slice(0, 70)) console.log(`${String(r.prompts).padStart(4)} prompts ${String(r.docs).padStart(2)} docs  ${r.name}`);
  });
})();
