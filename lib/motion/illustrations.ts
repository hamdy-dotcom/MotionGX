import "server-only";
// Hero illustrations (Phase 3F): library first, then one Sonnet call per missing illustration, all in
// parallel. Each drawing is checked in the isolated worker (compile → 3 stills → deterministic checks)
// with at most one fix round, sent as a patch. Illustrations that ship in a downloaded video are promoted
// into the `illustrations` library, so costs fall as it grows.
//
// Reuse never makes videos look alike: a library illustration is only reused in the video's own style,
// never twice in one video, and never in a workspace that used it in one of its last 5 videos.
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { callTool, SONNET } from "@/lib/ai/claude";
import { CostCapError } from "@/lib/ai/usage";
import type { IllustrationJob, IllustrationResult } from "@/scripts/motion/illustration-worker";
import { cosine, embed } from "./embed";
import { illustrationText, STYLE_GUIDE, STYLE_STROKE, type IllustrationNeed, type IllustrationStyle, type ReadyIllustration } from "./illustration-core";
import { projectPath } from "./paths";

/** cosine of "name. what it shows" above this = the library already has it */
export const REUSE_SIMILARITY = 0.85;
/** a workspace never sees the same illustration again within this many of its videos */
export const REUSE_COOLDOWN_VIDEOS = 5;

export type LibraryIllustration = {
  id: string;
  name: string;
  style: IllustrationStyle;
  shows: string;
  tags: string[];
  parts: { name: string; does: string }[];
  directional: boolean;
  embedding: number[];
  tsx: string;
  js: string;
  hash: string;
  uses: number;
  avg_taste: number | null;
  taste_n: number;
};
type UseRow = { workspace_id: string; video_ref: string; illustration_hash: string; created_at: string };

export const hashTsx = (tsx: string) => createHash("sha1").update(tsx).digest("hex").slice(0, 16);
const parseVector = (v: unknown): number[] => (Array.isArray(v) ? (v as number[]) : typeof v === "string" ? JSON.parse(v) : []);

/**
 * The `illustrations` library (+ `illustration_uses`). Supabase after 0006_illustrations.sql; until that
 * migration runs (or with no client) a local JSON file, which scripts/motion/illustrations-sync.ts
 * uploads once the tables exist.
 */
export class IllustrationLibrary {
  private fileMode: boolean;
  constructor(
    private admin: SupabaseClient | null,
    private file = projectPath("data/illustrations/library.json"),
  ) {
    this.fileMode = !admin;
  }
  private load(): { illustrations: LibraryIllustration[]; uses: UseRow[] } {
    return existsSync(this.file) ? JSON.parse(readFileSync(this.file, "utf8")) : { illustrations: [], uses: [] };
  }
  private save(d: { illustrations: LibraryIllustration[]; uses: UseRow[] }) {
    mkdirSync(path.dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify(d, null, 1));
  }
  /** a missing table (migration not run yet) switches to the local file for the rest of the process */
  private missing(error: { code?: string; message?: string } | null) {
    if (error && (error.code === "PGRST205" || error.code === "42P01" || /does not exist|schema cache/.test(error.message ?? ""))) {
      if (!this.fileMode) console.warn("[illustrations] tables missing (run 0006_illustrations.sql) — using data/illustrations/library.json");
      this.fileMode = true;
      return true;
    }
    if (error) throw new Error(`illustrations: ${error.message}`);
    return false;
  }

  async inStyle(style: IllustrationStyle): Promise<LibraryIllustration[]> {
    if (!this.fileMode) {
      const { data, error } = await this.admin!.from("illustrations").select("*").eq("style", style);
      if (!this.missing(error)) return (data ?? []).map((r) => ({ ...r, embedding: parseVector(r.embedding) })) as LibraryIllustration[];
    }
    return this.load().illustrations.filter((x) => x.style === style);
  }

  async all(): Promise<LibraryIllustration[]> {
    if (!this.fileMode) {
      const { data, error } = await this.admin!.from("illustrations").select("*");
      if (!this.missing(error)) return (data ?? []).map((r) => ({ ...r, embedding: parseVector(r.embedding) })) as LibraryIllustration[];
    }
    return this.load().illustrations;
  }

  /** hashes this workspace used in its last n videos */
  async recentHashes(workspaceId: string, n = REUSE_COOLDOWN_VIDEOS): Promise<Set<string>> {
    let rows: UseRow[] | null = null;
    if (!this.fileMode) {
      const { data, error } = await this.admin!.from("illustration_uses").select("workspace_id, video_ref, illustration_hash, created_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(300);
      if (!this.missing(error)) rows = (data ?? []) as UseRow[];
    }
    rows ??= this.load()
      .uses.filter((u) => u.workspace_id === workspaceId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const videos: string[] = [];
    for (const r of rows) if (!videos.includes(r.video_ref)) videos.push(r.video_ref);
    const keep = new Set(videos.slice(0, n));
    return new Set(rows.filter((r) => keep.has(r.video_ref)).map((r) => r.illustration_hash));
  }

  /** every illustration a generated video shows counts toward the workspace's cooldown */
  async recordUses(workspaceId: string, videoRef: string, hashes: string[]) {
    const rows = [...new Set(hashes)].map((h) => ({ workspace_id: workspaceId, video_ref: videoRef, illustration_hash: h, created_at: new Date().toISOString() }));
    if (!rows.length) return;
    if (!this.fileMode) {
      const { error } = await this.admin!.from("illustration_uses").insert(rows.map(({ created_at: _c, ...r }) => (void _c, r)));
      if (!this.missing(error)) return;
    }
    const d = this.load();
    d.uses.push(...rows);
    this.save(d);
  }

  /** add (or count another use of) an illustration that shipped in a downloaded video */
  async promote(ill: ReadyIllustration, opts: { taste?: number | null; tags?: string[] } = {}): Promise<"inserted" | "counted"> {
    const taste = opts.taste ?? null;
    const row = { name: ill.name, style: ill.style, shows: ill.shows, tags: opts.tags ?? ill.name.split("_"), parts: ill.parts, directional: ill.directional, tsx: ill.tsx, js: ill.js, hash: ill.hash };
    if (!this.fileMode) {
      const { data: found, error } = await this.admin!.from("illustrations").select("id, uses, avg_taste, taste_n").eq("hash", ill.hash).maybeSingle();
      if (!this.missing(error)) {
        if (found) {
          const n = found.taste_n + (taste === null ? 0 : 1);
          const avg = taste === null ? found.avg_taste : ((found.avg_taste ?? 0) * found.taste_n + taste) / n;
          const { error: e2 } = await this.admin!.from("illustrations").update({ uses: found.uses + 1, avg_taste: avg, taste_n: n }).eq("id", found.id);
          if (e2) throw new Error(`illustrations update: ${e2.message}`);
          return "counted";
        }
        const embedding = await embed(illustrationText(ill));
        const { error: e3 } = await this.admin!.from("illustrations").insert({ ...row, embedding: JSON.stringify(embedding), uses: 1, avg_taste: taste, taste_n: taste === null ? 0 : 1 });
        if (e3) throw new Error(`illustrations insert: ${e3.message}`);
        return "inserted";
      }
    }
    // embed before loading: no await between load and save (parallel promotions would lose writes)
    const embedding = await embed(illustrationText(ill));
    const d = this.load();
    const found = d.illustrations.find((x) => x.hash === ill.hash);
    if (found) {
      found.uses++;
      if (taste !== null) {
        found.avg_taste = ((found.avg_taste ?? 0) * found.taste_n + taste) / (found.taste_n + 1);
        found.taste_n++;
      }
      this.save(d);
      return "counted";
    }
    d.illustrations.push({ id: `local-${ill.hash}`, ...row, embedding, uses: 1, avg_taste: taste, taste_n: taste === null ? 0 : 1 });
    this.save(d);
    return "inserted";
  }
}

// ---------------------------------------------------------------------------------------------------
// isolated check worker

export async function runIllustrationJob(job: IllustrationJob, timeoutMs = 90_000): Promise<IllustrationResult> {
  const dir = mkdtempSync(path.join(os.tmpdir(), "mgx-ill-"));
  const jobFile = path.join(dir, "job.json");
  const resultFile = path.join(dir, "result.json");
  writeFileSync(jobFile, JSON.stringify(job));
  try {
    await promisify(execFile)(process.execPath, [projectPath("node_modules", "tsx", "dist", "cli.mjs"), "--tsconfig", projectPath("tsconfig.scripts.json"), projectPath("scripts", "motion", "illustration-worker.ts"), jobFile, resultFile], { cwd: projectPath(), timeout: timeoutMs, maxBuffer: 1 << 24 });
    return JSON.parse(readFileSync(resultFile, "utf8")) as IllustrationResult;
  } catch (err) {
    return { ok: false, errors: [err instanceof Error ? err.message.slice(0, 1500) : String(err)] };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------------------------------
// drawing (Sonnet)

const EXAMPLE = `export default function ParcelBox({ p, c, sw, uid }: { p: Record<string, number>; c: Record<string, string>; sw: number; uid: string }) {
  const lid = p.lid ?? 0; // 0 = open, 1 = closed
  const tape = p.tape ?? 0; // 0 = no tape, 1 = taped across
  const flap = (1 - lid) * 70; // flaps swing up as the lid opens (stays inside the box)
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx={100} cy={172} rx={66} ry={8} fill={c.black} opacity={0.12} />
      <path d="M38 78 L162 78 L162 166 L38 166 Z" fill={c.surface} stroke={c.primary} strokeWidth={sw} />
      <g transform={\`rotate(\${-flap} 38 78)\`}>
        <path d="M38 78 L100 78 L100 66 L44 66 Z" fill={c.surface2} stroke={c.primary} strokeWidth={sw} />
      </g>
      <g transform={\`rotate(\${flap} 162 78)\`}>
        <path d="M100 78 L162 78 L156 66 L100 66 Z" fill={c.surface2} stroke={c.primary} strokeWidth={sw} />
      </g>
      <path d={\`M100 70 L100 \${70 + 96 * tape}\`} stroke={c.accent} strokeWidth={sw} opacity={tape > 0.02 ? 1 : 0} />
      <path d="M56 140 L84 140 M56 150 L74 150" stroke={c.primary} strokeWidth={sw} />
    </g>
  );
}`;

const SYSTEM = `You are an illustrator who draws small, beautiful hero illustrations for motion-graphics promos as React SVG components. Each one is a single object or scene that tells a story beat (a warehouse, a phone with a sales chart, a parcel, a delivery truck, a support headset) and has 1–3 animatable parts.

THE CONTRACT (the code is compiled and checked by a machine — follow it exactly):
- One TSX file, ≤ 120 lines, that \`export default function <PascalName>({ p, c, sw, uid }: { p: Record<string, number>; c: Record<string, string>; sw: number; uid: string })\` and returns a single <g>…</g>.
- Draw inside a 200 × 200 box (0..200 on both axes). The object fills most of the box (roughly 20..180) and EVERY part stays inside 0..200 at every progress value.
- Motion: each animatable part is a prop p.<part> in 0..1 (read it as \`p.part ?? 0\`). The drawing is a pure function of p: NO hooks, timers, Date, Math.random, remotion or any import. p.<part> 0 → 1 must visibly change the drawing (doors open, bars grow, lid closes, needle turns, route draws, light switches on). At every value the object stays recognisable — parts change state, the object never vanishes.
- Colours: ONLY the colour roles c.bg, c.bg2, c.surface, c.surface2, c.border, c.text, c.textMuted, c.primary, c.onPrimary, c.accent, c.gradA, c.gradB, c.glowA, c.glowB, c.white, c.black. Never a hex, rgb() or colour name. Use opacity for tints.
- Strokes: every outline uses strokeWidth={sw} — one width for the whole drawing. Round caps and joins.
- <defs> ids (gradients, filters, clipPaths) must start with uid, e.g. id={\`\${uid}-g1\`} and fill={\`url(#\${uid}-g1)\`}.
- No text of any kind (no <text>, no letters or digits drawn as glyphs) — labels live elsewhere. Suggest UI text with short rounded lines.
- Only SVG primitives: g, path, rect, circle, ellipse, line, polyline, polygon, defs, linearGradient, radialGradient, stop, clipPath, mask, filter + fe* primitives.
- Mirroring is handled for you: draw directional objects facing RIGHT.

CRAFT: clear silhouette readable at thumbnail size; 3–5 well-chosen details, not clutter; consistent perspective; the animated part is the focal point. Match the requested STYLE exactly — it is shared by every illustration in the video.

EXAMPLE (style "line", parts lid + tape):
${EXAMPLE}

Respond only by calling save_illustration.`;

const drawTool = {
  name: "save_illustration",
  description: "Save the illustration component.",
  input_schema: { type: "object" as const, properties: { tsx: { type: "string", description: "the full TSX file" } }, required: ["tsx"] },
};
const fixTool = {
  name: "save_fix",
  description: "Save find/replace edits that fix the problems.",
  input_schema: {
    type: "object" as const,
    properties: { edits: { type: "array", items: { type: "object", properties: { find: { type: "string", description: "exact text currently in the file (unique)" }, replace: { type: "string" } }, required: ["find", "replace"] } } },
    required: ["edits"],
  },
};
const fixSchema = z.object({ edits: z.array(z.object({ find: z.string().min(1), replace: z.string() })).min(1).max(20) });

const applyEdits = (tsx: string, edits: { find: string; replace: string }[]) => {
  let out = tsx;
  for (const e of edits) {
    if (!out.includes(e.find)) throw new Error(`find text not in the file: "${e.find.slice(0, 60)}"`);
    out = out.replace(e.find, e.replace);
  }
  return out;
};

const pascal = (s: string) => s.replace(/(^|_)([a-z0-9])/g, (_, __, ch: string) => ch.toUpperCase()).replace(/^[0-9]/, "I$&");

function drawPrompt(need: IllustrationNeed, style: IllustrationStyle, context: string) {
  return `Draw "${need.name}" (component name ${pascal(need.name)}) — ${need.shows}
STYLE "${style}": ${STYLE_GUIDE[style]}
Animatable parts (exactly these props): ${need.parts.map((p) => `p.${p.name} — 0 → 1: ${p.does}`).join("; ")}
${need.directional ? "Directional: draw it facing right (the renderer mirrors it for right-to-left videos)." : "Not directional."}
Context (for flavour only, never as text): ${context}`;
}

export type DrawOutcome = { need: IllustrationNeed; ready: ReadyIllustration | null; problems: string[]; rounds: number; ms: number; tsx?: string };

/** one illustration: Sonnet draws → worker checks → ≤ 1 fix round (find/replace patch) → worker checks */
export async function drawIllustration(workspaceId: string | null, need: IllustrationNeed, style: IllustrationStyle, context: string, stills?: { dir: string; palette: Record<string, string> }): Promise<DrawOutcome> {
  const t0 = Date.now();
  const sw = STYLE_STROKE[style];
  const check = async (tsx: string) => {
    const r = await runIllustrationJob({ items: [{ key: need.name, tsx, parts: need.parts.map((p) => p.name), sw, stills: stills ? { dir: stills.dir, palette: stills.palette } : undefined }] });
    return r.ok ? r.results[0] : { key: need.name, ok: false, js: null, problems: r.errors };
  };
  const res = await callTool({ workspaceId, kind: "illustration", model: SONNET, strict: false, effort: "low", cache: true, system: SYSTEM, prompt: drawPrompt(need, style, context), tool: drawTool, schema: z.object({ tsx: z.string().min(50).max(14000) }), maxTokens: 5000, retries: 0 });
  if (!res.value) return { need, ready: null, problems: [res.problem], rounds: 1, ms: Date.now() - t0 };
  let tsx = res.value.tsx.replace(/^```\w*\n?|```\s*$/g, "");
  let r = await check(tsx);
  let rounds = 1;
  if (!r.ok) {
    rounds = 2;
    const fix = await callTool({
      workspaceId,
      kind: "illustration",
      model: SONNET,
      strict: false,
      effort: "low",
      cache: true,
      system: SYSTEM,
      prompt: `${drawPrompt(need, style, context)}\n\nYour file:\n\`\`\`tsx\n${tsx}\n\`\`\`\n\nThe checker found:\n${r.problems.map((p) => `- ${p}`).join("\n")}\n\nFix every problem with the smallest find/replace edits (each "find" is exact, unique text from the file). Respond only by calling save_fix.`,
      tool: fixTool,
      schema: fixSchema,
      check: (v) => {
        try {
          applyEdits(tsx, v.edits);
          return null;
        } catch (err) {
          return err instanceof Error ? err.message : String(err);
        }
      },
      maxTokens: 2500,
      retries: 1,
    }).catch((err) => {
      if (err instanceof CostCapError) throw err;
      return { value: null, problem: String(err) } as const;
    });
    if (fix.value) {
      tsx = applyEdits(tsx, fix.value.edits);
      r = await check(tsx);
    }
  }
  if (!r.ok || !r.js) return { need, ready: null, problems: r.problems, rounds, ms: Date.now() - t0, tsx };
  return { need, ready: { ...need, style, tsx, js: r.js, hash: hashTsx(tsx), source: "fresh", libraryId: null }, problems: [], rounds, ms: Date.now() - t0 };
}

export type Resolution = {
  /** library hits, ready now (zero AI cost) */
  reused: ReadyIllustration[];
  /** the needs to draw; their parts are the prop schema the spec writer uses */
  fresh: IllustrationNeed[];
  /** per need: the nearest library match and why it was or wasn't reused */
  log: { name: string; match: string | null; similarity: number; reused: boolean; reason?: string }[];
};

/**
 * Library lookup: the nearest illustration in the video's style (cosine ≥ 0.85 on "name. what it shows"),
 * skipping ones this workspace used in its last 5 videos and never picking one twice for a video.
 * A reused illustration keeps its own parts (the spec writer gets its real prop schema).
 */
export async function resolveIllustrations(lib: IllustrationLibrary, needs: IllustrationNeed[], style: IllustrationStyle, workspaceId: string): Promise<Resolution> {
  const [pool, recent] = await Promise.all([lib.inStyle(style), lib.recentHashes(workspaceId)]);
  const taken = new Set<string>();
  const out: Resolution = { reused: [], fresh: [], log: [] };
  for (const need of needs) {
    const q = await embed(illustrationText(need));
    const ranked = pool.map((x) => ({ x, sim: cosine(q, x.embedding) })).sort((a, b) => b.sim - a.sim);
    const best = ranked.find(({ x }) => !taken.has(x.hash) && !recent.has(x.hash));
    const nearest = ranked[0];
    if (best && best.sim >= REUSE_SIMILARITY) {
      taken.add(best.x.hash);
      out.reused.push({ name: need.name, shows: best.x.shows, parts: best.x.parts, directional: best.x.directional, style, tsx: best.x.tsx, js: best.x.js, hash: best.x.hash, source: "library", libraryId: best.x.id });
      out.log.push({ name: need.name, match: best.x.name, similarity: Number(best.sim.toFixed(3)), reused: true });
    } else {
      out.fresh.push(need);
      const reason = !nearest ? `no ${style} illustrations in the library` : nearest.sim >= REUSE_SIMILARITY && recent.has(nearest.x.hash) ? "used in this workspace's last 5 videos" : nearest.sim >= REUSE_SIMILARITY ? "already used in this video" : "no close match";
      out.log.push({ name: need.name, match: nearest?.x.name ?? null, similarity: Number((nearest?.sim ?? 0).toFixed(3)), reused: false, reason });
    }
  }
  return out;
}

/** draw every missing illustration in parallel; failures come back as null (the spec drops them) */
export async function drawAll(workspaceId: string | null, needs: IllustrationNeed[], style: IllustrationStyle, context: string): Promise<DrawOutcome[]> {
  return Promise.all(
    needs.map((n) =>
      drawIllustration(workspaceId, n, style, context).catch((err) => {
        if (err instanceof CostCapError) throw err;
        return { need: n, ready: null, problems: [err instanceof Error ? err.message : String(err)], rounds: 0, ms: 0 };
      }),
    ),
  );
}
