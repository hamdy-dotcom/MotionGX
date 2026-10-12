import "server-only";
// The spec writer (Haiku first, Sonnet fallback) + repair: deterministic fixes from the validator,
// then at most 2 JSON-Patch rounds (Haiku) that only see the failing elements.
import { z } from "zod";
import { callTool, HAIKU, SONNET } from "@/lib/ai/claude";
import { AiError } from "@/lib/ai/usage";
import { buildTokens, contrast } from "@/packages/primitives/src/palette";
import { catalogueText } from "./catalogue";
import { EXAMPLE_PLAN, EXAMPLE_SPEC } from "./spec-example";
import { loadFont, measureLine } from "./fonts-node";
import { applyPatch, type PatchOp } from "./patch";
import type { Plan } from "./plan";
import { specSchema, type MotionSpec } from "./spec";
import type { MotionBrief } from "./types";
import { validateSpec, type SpecIssue, type ValidateCtx } from "./validate";

export const MAX_PATCH_ROUNDS = 2;

const SPEC_DOC = `MotionSpec — the JSON language for one video. The engine renders it; you never write code.

COORDINATES: x, y = element CENTRE in % of canvas width / height (50,50 = centre). w, h, size = % of canvas WIDTH (so w = h is square in every format). Safe area: keep every text box inside 5–95% on both axes.
TIME: seconds; "b12" = beat 12 (0-based); "s3" = start of shot 3, "s3e" = end of shot 3 (shot anchors — the easiest way to time things). Elements exist from "in" to "out" (default: whole video). z = layer (higher on top).
COLORS: roles only — bg, bg2, surface, surface2, border, text, textMuted, primary, onPrimary, accent, gradA, gradB, glowA, glowB, white, black. Never hex.
FONTS: font = head | body | latin.

{
 "version": 1,
 "canvas": { "bg": [ { "kind": "solid|gradient|radial|grid|dots|noise|stripes|stars|pattern", "colors": [role…], "angle"?, "alpha"?, "drift"?, "scale"?, "in"?, "out"? } ] },
 "camera"?: { "keys"?: [ { "t", "zoom"?, "x"?, "y"?, "rot"?, "ease"? } ], "shake"?: 0–1 (on hits), "drift"?: 0–1 },
 "cuts"?: [ { "t", "kind": "hard|flash|whip|wipe|zoom|glitch|iris", "dir"?: "left|right|up|down", "color"?: role } ],
 "elements": [ … ]
}

ELEMENT (common): { "id", "type", "x", "y", "w"?, "h"?, "rot"?, "opacity"?, "z"?, "in"?, "out"?, "parent"?: groupId, "depth"?: 0–3 (parallax), "fx"?: [behavior…], "keys"?: [ { "t", "x"?, "y"?, "scale"?, "rot"?, "opacity"?, "ease"? } ] }
TYPES:
- text: { "line": "s3:0" (shot 3, line 0 — ALWAYS use this for script copy) | "text": "literal" (brand name / URL only), "size", "font", "weight", "color": role, "gradient"?: bool, "outline"?: role, "align"?: center|start|end, "highlight"?: { "word": n, "color": role }, "w"?: max width }
  One line per text element (never \\n). Never exceed the max size given for that line.
- shape: { "shape": rect|circle|pill|ring|star|polygon|triangle|blob|line, "w", "h"?, "fill"?: role, "gradient"?: bool, "stroke"?: role, "strokeW"?, "radius"?, "sides"?, "points"?, "alpha"?, "glow"?: role, "to"?: shape (morph target; needs the "morph" behavior) }
- svgPath: { "d": SVG path in a 0–100 box, "w", "h", "stroke": role, "strokeW", "fill"? } — draw-on with "stroke-draw"
- route: { "points": [[x,y],…] in canvas %, "stroke": role, "strokeW", "nodes"?: role (station dots), "dashed"?, "smooth"? } — draw with "stroke-draw"; others ride it with "route-follow" (route: id)
- image: { "src": "logo" | "image:0", "w", "fit"?, "frame"?: phone|browser|laptop|tablet, "radius"? }
- particles: { "kind": dots|squares|sparks|confetti|rain|bubbles|stars|dust, "count", "colors": [role…], "w", "h", "speed"?, "dir"?, "size"? }
- group: { "w", "h", "clip"?: rect|circle|pill (mask), "fill"?: role, "radius"?, "stroke"?, "shadow"? } — children set "parent"; children use canvas coordinates
- counter: { "from", "to", "decimals"?, "prefix"?, "suffix"?, "size", "font", "weight", "color" } — animate with "count-up"
- custom (rare escape hatch): { "tsx": a ≤150-line TSX file default-exporting a React component ({ t, frame, width, height, palette, fonts }) importing only react/remotion/@motiongx/primitives, "note": what it does, "w", "h" } — ONLY for an effect no behavior combination can express. Prefer behaviors.
BEHAVIOR: { "fx": name, "at"?: time (default: element "in"; exits default to just before "out"), "dur"?: seconds, …params }
${catalogueText()}

LAYOUT RULES (the validator enforces these; violations are sent back to you):
- Text never overlaps other text, never leaves the safe area, and is never covered by a shape drawn above it (labels go ABOVE their buttons/cards: higher z).
- Text size: headlines ≈ 0.7–0.9 × the max size of their line, secondary lines ≈ 0.5–0.65 ×. A line at size s is about (s ÷ its max size) × 86 % of the canvas width wide.
- A label on a plate (bubble, pill, card) sits FULLY inside it: the plate must be wider than its text (use pills/cards for long lines; small round bubbles only fit 1–2 short words).
- Routes/lines never run through text. Text contrast ≥ 4.5:1 (≥ 3:1 for size ≥ 4.5) — use the contrast table.
- Something moves at every moment: give long-lived elements a loop (float, breathe, noise-drift, pulse, orbit, spin) and keep ≤ 0.6 s of stillness.
- Use EVERY script line exactly once ("line": "sN:i"), during its shot (e.g. "in": "s3", "out": "s3e"). The logo (image src=logo) appears on the logo hit; the CTA shot's lines are on screen at the cta hit.
- Arabic text: never per-letter / scatter by letter (per-word is fine). Let entrances land on hits.
- Make it look custom-made for the brand: layered depth, a consistent motion language, purposeful transitions. Avoid plain "title on gradient" shots.

DESIGN DIRECTION (taste — what separates a promo from a slideshow):
- BUILD THE METAPHOR LITERALLY. If the concept is a balance scale, draw the scale (beam = line/rect, pans = shapes, pivot = triangle) and animate it tilting and settling; a tower → stacked blocks; a journey → a route with stations. The metaphor is the HERO of most shots (3–8 elements each), not a small icon.
- Every shot = hero visual + headline (+ support line). Vary composition from shot to shot (left/right, top/bottom, scale, framing); never repeat the same backdrop shape in every shot.
- Depth: 3 layers (background texture/glow, mid hero, foreground text/particles) and gentle parallax/camera moves.
- Anything that looks like a button (a filled pill/card) carries a label on top of it. Never blink or flicker real copy.
- The logo reveal is a moment: build-up → hit → logo with a ring/ripple/burst; the CTA sits on the final drop, big and clear.

QUALITY REFERENCE — a complete spec for an unrelated fictional brand. It shows the bar (literal metaphor, 3 layers, varied composition per shot, labelled plates, a route, a staged logo reveal, a labelled CTA). NEVER copy its layout, shapes or concept: invent your own from the treatment.
${EXAMPLE_PLAN}
${EXAMPLE_SPEC}

Respond only by calling save_spec with the full spec.`;

const specTool = {
  name: "save_spec",
  description: "Save the MotionSpec for this video.",
  input_schema: { type: "object" as const, properties: { spec: { type: "object", description: "The full MotionSpec JSON" } }, required: ["spec"] },
};
const patchTool = {
  name: "save_patch",
  description: "Save a JSON Patch (RFC 6902) that fixes the listed problems.",
  input_schema: {
    type: "object" as const,
    properties: {
      ops: {
        type: "array",
        items: { type: "object", properties: { op: { type: "string", enum: ["add", "remove", "replace", "move", "copy"] }, path: { type: "string" }, from: { type: "string" }, value: {} }, required: ["op", "path"] },
      },
    },
    required: ["ops"],
  },
};
const patchSchema = z.object({ ops: z.array(z.object({ op: z.enum(["add", "remove", "replace", "move", "copy"]), path: z.string(), from: z.string().optional(), value: z.unknown().optional() })).min(1).max(60) });

/** Facts the writer would otherwise guess: per-line max font size (real metrics) + role contrast table. */
async function layoutFacts(b: MotionBrief, plan: Plan) {
  const T = { ...buildTokens(b.brand.colors), white: "#FFFFFF", black: "#0A0A0A" } as unknown as Record<string, string>;
  const fam = b.dialect === "en" ? b.brand.fonts.latin ?? "Readex Pro" : b.brand.fonts.arabic ?? "Readex Pro";
  const font = (await loadFont(fam, 800)) ?? (await loadFont("Readex Pro", 800));
  const maxSizes = plan.beats.flatMap((beat) =>
    beat.lines.map((l, i) => {
      const w = font ? measureLine(font, l, (10 / 100) * b.width).w : l.length * 0.55 * (10 / 100) * b.width;
      const max = Math.min(18, (10 * b.width * 0.86) / Math.max(1, w));
      return `${beat.id}:${i} "${l}" → max size ${max.toFixed(1)}`;
    }),
  );
  const fgs = ["text", "textMuted", "primary", "accent", "onPrimary", "white", "black"];
  const bgs = ["bg", "bg2", "surface", "primary", "accent", "white"];
  const table = bgs.map((bg) => `on ${bg}: ${fgs.filter((f) => f !== bg).map((f) => `${f} ${contrast(T[f], T[bg]).toFixed(1)}`).join(", ")}`);
  return { maxSizes, table, dark: buildTokens(b.brand.colors).dark };
}

function specPrompt(b: MotionBrief, plan: Plan, facts: Awaited<ReturnType<typeof layoutFacts>>) {
  return `Canvas ${b.width}×${b.height} (${b.format}), ${b.lengthS}s @30fps, ${plan.energy.bpm} BPM (beat = ${(60 / plan.energy.bpm).toFixed(3)}s), language ${b.dialect === "en" ? "English (LTR)" : "Arabic (RTL)"}, palette is ${facts.dark ? "dark" : "light"}. Brand: ${b.brand.name} (${b.brand.url}); logo ${b.brand.hasLogo ? "yes" : "no — the logo element renders a wordmark"}; brand images: ${b.brand.imageCount}.
TREATMENT: ${plan.concept} | motion language: ${plan.motion_language} | music: ${plan.music_mood}
SHOTS (use every line once, during its shot):
${plan.shots.map((s) => `- ${s.id} ${s.start_s}–${s.end_s}s: ${s.visual} | lines: ${s.lines.map((l, i) => `${s.id}:${i} "${l}"`).join(", ")}`).join("\n")}
ENERGY: sections ${plan.energy.sections.map((s) => `${s.kind} ${s.start_s}–${s.end_s}`).join(", ")} | hits ${plan.energy.hits.map((h) => `${h.kind}@${h.t}`).join(", ")}
MAX TEXT SIZE PER LINE (one line, fits the safe width): ${facts.maxSizes.join(" | ")}
CONTRAST (≥ 4.5 needed for body text, ≥ 3 for size ≥ 4.5): ${facts.table.join(" | ")}`;
}

/** Deterministic repairs the validator computed (no AI). Returns the patched spec + how many applied. */
export function autoFix(spec: MotionSpec, issues: SpecIssue[]): { spec: MotionSpec; applied: number } {
  const out = structuredClone(spec);
  let applied = 0;
  for (const i of issues) {
    if (!i.fix || !i.id) continue;
    const el = out.elements.find((e) => e.id === i.id) as Record<string, unknown> | undefined;
    if (!el) continue;
    const f = i.fix;
    if (f.size !== undefined && "size" in el) el.size = f.size;
    if (f.w !== undefined) el.w = f.w;
    if (f.h !== undefined) el.h = f.h;
    if (f.x !== undefined) el.x = f.x;
    if (f.y !== undefined) el.y = f.y;
    if (f.color !== undefined && "color" in el) el.color = f.color;
    if (f.gradient === false && "gradient" in el) el.gradient = false;
    if (f.z !== undefined) el.z = f.z;
    if (f.addFx) el.fx = [...((el.fx as unknown[]) ?? []), f.addFx];
    if (f.removeFx) el.fx = ((el.fx as { fx: string }[]) ?? []).filter((x) => x.fx !== f.removeFx);
    if (f.in !== undefined) el.in = f.in;
    if (f.out !== undefined) el.out = f.out === null ? undefined : f.out;
    if (Object.values(f).some((v) => v !== undefined)) applied++;
  }
  return { spec: specSchema.parse(out), applied };
}

const SCRIM_CODES = new Set(["low_contrast", "text_spills_plate", "line_through_text", "covered"]);

/**
 * Deterministic finisher after the patch rounds: whatever is still wrong with a label gets the standard
 * designer's fix, so every video ends with a clean layout —
 *   contrast / spill / line-through / covered → a scrim (translucent bg-coloured pill behind the text,
 *   animating with it); offscreen / overlap without room → shrink; missing logo → insert on its hit.
 */
export function finish(spec: MotionSpec, issues: SpecIssue[], ctx: ValidateCtx): { spec: MotionSpec; applied: string[] } {
  const out = structuredClone(spec) as MotionSpec;
  // the most legible text role on the scrim (bg)
  const T = { ...buildTokens(ctx.colors), white: "#FFFFFF", black: "#0A0A0A" } as unknown as Record<string, string>;
  const onScrim = (["text", "white", "black", "onPrimary", "primary", "accent"] as const).map((role) => ({ role, c: contrast(T[role], T.bg) })).sort((a, b) => b.c - a.c)[0].role;
  const applied: string[] = [];
  const scrimmed = new Set<string>();
  for (const i of issues) {
    const el = i.id ? out.elements.find((e) => e.id === i.id) : undefined;
    if (el && (el.type === "text" || el.type === "counter") && SCRIM_CODES.has(i.code) && !scrimmed.has(el.id) && i.box) {
      scrimmed.add(el.id);
      // already has a scrim (an earlier pass): make it more opaque / a little bigger instead of adding another
      const existing = out.elements.find((e) => e.id === `${el.id}_scrim`);
      if (existing && existing.type === "shape") {
        existing.alpha = 0.95;
        existing.w = Math.min(96, (existing.w ?? 20) + 4);
        existing.h = (existing.h ?? 8) * 1.15;
        existing.z = Math.min(98, Math.max(existing.z ?? 0, ...out.elements.filter((e) => !e.id.endsWith("_scrim") && e.id !== el.id).map((e) => (e.z ?? 0) + 1)));
        el.z = (existing.z ?? 0) + 1;
        if (el.type === "text") {
          el.color = onScrim;
          el.gradient = false;
        }
        applied.push(`scrim+:${el.id}`);
        continue;
      }
      const wPct = i.box.x1 - i.box.x0;
      const hPx = ((i.box.y1 - i.box.y0) / 100) * ctx.height;
      // scrimmed labels go to the top layer (above whatever crossed or covered them), scrim just beneath
      const top = Math.max(...out.elements.filter((e) => !e.id.endsWith("_scrim")).map((e) => e.z ?? 0));
      const z = Math.min(98, Math.max(el.z ?? 0, top + 1));
      const enterExit = (el.fx ?? []).filter((f) => ["fade", "rise", "pop", "zoom-in", "blur-in", "slide", "fade-out", "rise-out", "blur-out", "slide-out", "shrink-out", "stamp", "spring-in", "drop-in"].includes(f.fx));
      out.elements.push({
        id: `${el.id}_scrim`,
        type: "shape",
        shape: "pill",
        fill: "bg",
        alpha: 0.92,
        x: (i.box.x0 + i.box.x1) / 2,
        y: (i.box.y0 + i.box.y1) / 2,
        w: Math.min(96, wPct + 7),
        h: ((hPx * 1.35) / ctx.width) * 100,
        z,
        in: el.in,
        out: el.out,
        fx: enterExit.length ? enterExit : [{ fx: "fade" }],
      } as MotionSpec["elements"][number]);
      el.z = z + 1;
      if (el.type === "text") {
        el.color = onScrim;
        el.gradient = false;
      }
      applied.push(`scrim:${el.id}`);
      continue;
    }
    // lines from different shots colliding: the earlier one ends when the later shot begins
    if (el && el.type === "text" && i.code === "text_overlap" && !i.fix) {
      const otherId = i.msg.match(/overlaps text "([^"]+)"/)?.[1];
      const other = out.elements.find((e) => e.id === otherId);
      const shotOf = (e: MotionSpec["elements"][number] | undefined) => (e && e.type === "text" && e.line ? Number(e.line.split(":")[0].slice(1)) : null);
      const [a, bShot] = [shotOf(el), shotOf(other)];
      if (other && a !== null && bShot !== null && a !== bShot) {
        const earlier = a < bShot ? el : other;
        earlier.out = `s${Math.max(a, bShot)}`;
        applied.push(`end:${earlier.id}`);
        continue;
      }
    }
    // the CTA shot's lines stay on screen from the cta hit to the end
    if (i.code === "cta_missing") {
      const hit = ctx.energy.hits.find((h) => h.kind === "cta");
      const beat = hit ? ctx.beats.find((x) => hit.t >= x.start_s - 0.01 && hit.t < x.end_s) ?? ctx.beats.at(-1) : undefined;
      const ctaTexts = out.elements.filter((e) => e.type === "text" && beat && e.line?.startsWith(`${beat.id}:`));
      for (const e of ctaTexts) {
        e.out = undefined;
        if (hit && typeof e.in === "number" && e.in > hit.t) e.in = hit.t;
        e.fx = (e.fx ?? []).filter((f) => !["fade-out", "rise-out", "blur-out", "slide-out", "shrink-out", "wipe-out", "scatter-out", "drop-out"].includes(f.fx));
      }
      if (ctaTexts.length) {
        applied.push(`cta:${ctaTexts.map((e) => e.id).join(",")}`);
        continue;
      }
    }
    if (el && (el.type === "text" || el.type === "counter") && (i.code === "offscreen" || i.code === "text_overlap" || i.code === "text_overflow") && !i.fix) {
      el.size = Number((el.size * 0.82).toFixed(2));
      if (i.box && i.code === "offscreen") el.x = 50;
      applied.push(`shrink:${el.id}`);
      continue;
    }
    // in ≥ out (usually "out": "s4" where "s4e" was meant): end at the end of the shot it starts in
    if (i.code === "bad_time" && el && /must be after in/.test(i.msg)) {
      const inT = Number(i.msg.match(/in \(([\d.]+)s\)/)?.[1] ?? 0);
      const shot = ctx.beats.find((x) => inT >= x.start_s - 0.01 && inT < x.end_s - 0.05);
      el.out = shot && shot.end_s - inT >= 0.6 ? shot.end_s : Math.min(ctx.duration, inT + 1.5);
      applied.push(`out:${el.id}`);
      continue;
    }
    if (i.code === "empty_button" && el) {
      out.elements = out.elements.filter((e) => e.id !== el.id);
      applied.push(`remove:${el.id}`);
      continue;
    }
    if (i.code === "no_logo" || (i.code === "logo_missing_at_hit" && !el)) {
      const hit = ctx.energy.hits.find((h) => h.kind === "logo");
      out.elements.push({ id: "logo_auto", type: "image", src: "logo", fit: "contain", x: 50, y: 40, w: 38, z: 20, in: hit?.t ?? ctx.duration * 0.72, fx: [{ fx: "pop" }, { fx: "float", amp: 0.6 }] } as MotionSpec["elements"][number]);
      applied.push("logo:inserted");
    }
  }
  return { spec: specSchema.parse(out), applied };
}

export type SpecRun = {
  spec: MotionSpec;
  issues: SpecIssue[];
  rounds: { stage: string; model?: string; issues: number; autoFixed?: number; ms: number }[];
  model: string;
};

/** Spec call → validate → auto-fix → ≤ 2 JSON-Patch rounds. */
export async function writeSpec(b: MotionBrief, plan: Plan, vctx: ValidateCtx): Promise<SpecRun> {
  const rounds: SpecRun["rounds"] = [];
  const facts = await layoutFacts(b, plan);
  const system = SPEC_DOC;
  const prompt = specPrompt(b, plan, facts);
  const zodProblems = (raw: unknown) => {
    const r = specSchema.safeParse(raw);
    return r.success ? [] : r.error.issues.slice(0, 20).map((i) => ({ path: `/${i.path.join("/")}`, msg: i.message }));
  };
  let t0 = Date.now();
  let model: string = HAIKU;
  // one Haiku call; a schema slip is patched, never regenerated (a full re-write repeats the mistake and costs 10×)
  const first = await callTool({ workspaceId: b.workspaceId, kind: "motion_spec", model: HAIKU, strict: false, cache: true, system, prompt, tool: specTool, schema: z.object({ spec: z.record(z.string(), z.unknown()) }), maxTokens: 9000, retries: 1 });
  let raw: unknown = first.value?.spec ?? null;
  rounds.push({ stage: "spec", model: HAIKU, issues: raw ? zodProblems(raw).length : 1, ms: Date.now() - t0 });
  for (let k = 1; raw && k <= 2 && zodProblems(raw).length; k++) {
    t0 = Date.now();
    const probs = zodProblems(raw);
    const fix = await callTool({
      workspaceId: b.workspaceId,
      kind: "spec_patch",
      model: HAIKU,
      strict: false,
      cache: true,
      system,
      prompt: `${prompt}\n\nThis spec fails the schema:\n${probs.map((p) => `- ${p.path}: ${p.msg}`).join("\n")}\n\nThe failing elements:\n${[...new Set(probs.map((p) => p.path.split("/")[2]).filter((x) => x !== undefined))].map((i) => `${i}: ${JSON.stringify((raw as { elements?: unknown[] }).elements?.[Number(i)])}`).join("\n")}\n\nReturn a JSON Patch (RFC 6902) that fixes every schema error. Respond only by calling save_patch.`,
      tool: patchTool,
      schema: patchSchema,
      check: (p) => {
        try {
          applyPatch(raw, p.ops as PatchOp[]);
          return null;
        } catch (err) {
          return `patch failed: ${err instanceof Error ? err.message : err}`;
        }
      },
      maxTokens: 2000,
      retries: 1,
    });
    if (fix.value) raw = applyPatch(raw, fix.value.ops as PatchOp[]);
    rounds.push({ stage: `schema-patch-${k}`, model: HAIKU, issues: zodProblems(raw).length, ms: Date.now() - t0 });
  }
  if (!raw || zodProblems(raw).length) {
    // last resort: no usable JSON from Haiku → Sonnet writes it
    t0 = Date.now();
    model = SONNET;
    const res = await callTool({ workspaceId: b.workspaceId, kind: "motion_spec", model: SONNET, strict: false, effort: "low", cache: true, system, prompt, tool: specTool, schema: z.object({ spec: z.record(z.string(), z.unknown()) }), check: (v) => (zodProblems(v.spec).length ? zodProblems(v.spec).map((p) => `${p.path}: ${p.msg}`).join("; ") : null), maxTokens: 9000, retries: 0 });
    rounds.push({ stage: "spec-fallback", model: SONNET, issues: res.value ? 0 : 1, ms: Date.now() - t0 });
    if (!res.value) throw new AiError("ai_invalid", `spec failed schema: ${res.problem}`);
    raw = res.value.spec;
  }
  const res = { value: { spec: raw } };

  const repaired = await repairSpec(b, system, prompt, res.value.spec, vctx, rounds);
  return { ...repaired, rounds, model };
}

/** validate → deterministic fixes → ≤ 2 JSON-Patch rounds → deterministic finisher */
export async function repairSpec(b: MotionBrief, system: string, prompt: string, startSpec: unknown, vctx: ValidateCtx, rounds: SpecRun["rounds"]): Promise<{ spec: MotionSpec; issues: SpecIssue[] }> {
  let t0 = Date.now();
  let v = await validateSpec(startSpec, vctx);
  if (!v.spec) throw new AiError("ai_invalid", v.issues.map((i) => i.msg).join("; "));
  let spec = v.spec;
  // deterministic fixes first (cheap, instant); re-validate until stable (max 3 passes)
  const sig = (is: SpecIssue[]) => is.map((i) => `${i.code}:${i.id}`).sort().join("|");
  for (let pass = 0; pass < 3 && v.issues.some((i) => i.fix); pass++) {
    const fx = autoFix(spec, v.issues);
    if (!fx.applied) break;
    const before = sig(v.issues);
    spec = fx.spec;
    v = await validateSpec(spec, vctx);
    if (sig(v.issues) === before) {
      spec = v.spec ?? spec;
      rounds.push({ stage: `autofix-${pass + 1}`, issues: v.issues.length, autoFixed: fx.applied, ms: Date.now() - t0 });
      break; // fixes aren't resolving these — leave them to the patch step
    }
    spec = v.spec ?? spec;
    rounds.push({ stage: `autofix-${pass + 1}`, issues: v.issues.length, autoFixed: fx.applied, ms: Date.now() - t0 });
    t0 = Date.now();
  }
  if (!rounds.some((r) => r.stage.startsWith("autofix"))) rounds.push({ stage: "validate", issues: v.issues.length, ms: Date.now() - t0 });

  for (let round = 1; round <= MAX_PATCH_ROUNDS && v.issues.length; round++) {
    t0 = Date.now();
    const ids = new Set(v.issues.map((i) => i.id).filter((x): x is string => !!x));
    const index = Object.fromEntries(spec.elements.map((e, i) => [e.id, i]));
    const involved = spec.elements.map((e, i) => ({ i, e })).filter(({ e }) => ids.has(e.id));
    const neighbours = spec.elements.map((e, i) => `${i}:${e.id}(${e.type} x${Math.round(e.x)} y${Math.round(e.y)}${"size" in e ? ` s${e.size}` : ""} z${e.z ?? 0} ${e.in ?? 0}–${e.out ?? "end"})`).join(" ");
    const patch = await callTool({
      workspaceId: b.workspaceId,
      kind: "spec_patch",
      model: HAIKU,
      strict: false,
      cache: true,
      system,
      prompt: `${prompt}\n\nThe spec has these problems:\n${v.issues.map((i) => `- [${i.code}] ${i.id ?? "spec"}${i.t !== undefined ? ` @${i.t}s` : ""}: ${i.msg}`).join("\n")}\n\nElements involved (index: JSON):\n${involved.map(({ i, e }) => `${i}: ${JSON.stringify(e)}`).join("\n") || "(none — add elements as needed)"}\n\nAll elements (index:id summary): ${neighbours}\n\nReturn a JSON Patch (RFC 6902) against the spec that fixes EVERY problem with the smallest change. Paths use element indices, e.g. /elements/${involved[0]?.i ?? 0}/y, or "/elements/-" to append. Element index map: ${JSON.stringify(index)}. Respond only by calling save_patch.`,
      tool: patchTool,
      schema: patchSchema,
      check: (p) => {
        try {
          const next = applyPatch(spec, p.ops as PatchOp[]);
          const r = specSchema.safeParse(next);
          return r.success ? null : `patched spec is invalid: ${r.error.issues.slice(0, 6).map((x) => `${x.path.join(".")}: ${x.message}`).join("; ")}`;
        } catch (err) {
          return `patch failed: ${err instanceof Error ? err.message : err}`;
        }
      },
      maxTokens: 3000,
      retries: 1,
    });
    if (!patch.value) {
      rounds.push({ stage: `patch-${round}`, model: HAIKU, issues: v.issues.length, ms: Date.now() - t0 });
      continue;
    }
    if (process.env.MOTIONGX_DEBUG_PATCH) console.log(`  [patch-${round}] ${JSON.stringify(patch.value.ops).slice(0, 1500)}`);
    spec = specSchema.parse(applyPatch(spec, patch.value.ops as PatchOp[]));
    v = await validateSpec(spec, vctx);
    spec = v.spec ?? spec;
    for (let pass = 0; pass < 2 && v.issues.some((i) => i.fix); pass++) {
      const fx = autoFix(spec, v.issues);
      if (!fx.applied) break;
      spec = fx.spec;
      v = await validateSpec(spec, vctx);
      spec = v.spec ?? spec;
    }
    rounds.push({ stage: `patch-${round}`, model: HAIKU, issues: v.issues.length, ms: Date.now() - t0 });
  }
  // deterministic finisher: guarantees a clean layout for what the patches didn't solve
  for (let pass = 0; pass < 3 && v.issues.length; pass++) {
    t0 = Date.now();
    const fin = finish(spec, v.issues, vctx);
    const fx = fin.applied.length ? null : autoFix(spec, v.issues);
    if (!fin.applied.length && !fx?.applied) break;
    spec = fin.applied.length ? fin.spec : fx!.spec;
    v = await validateSpec(spec, vctx);
    spec = v.spec ?? spec;
    rounds.push({ stage: `finish-${pass + 1}`, issues: v.issues.length, autoFixed: fin.applied.length || fx?.applied || 0, ms: Date.now() - t0 });
  }
  return { spec, issues: v.issues };
}

/**
 * «اطلب تعديلًا»: the client's instruction becomes a JSON Patch of the current spec (Haiku), then the
 * same validation + repair. Never a rewrite.
 */
export async function editSpec(b: MotionBrief, plan: Plan, current: MotionSpec, instruction: string, vctx: ValidateCtx): Promise<SpecRun> {
  const rounds: SpecRun["rounds"] = [];
  const facts = await layoutFacts(b, plan);
  const prompt = specPrompt(b, plan, facts);
  const t0 = Date.now();
  const res = await callTool({
    workspaceId: b.workspaceId,
    kind: "spec_patch",
    model: HAIKU,
    strict: false,
    cache: true,
    system: SPEC_DOC,
    prompt: `${prompt}\n\nCURRENT SPEC:\n${JSON.stringify(current)}\n\nThe client asks (any language): """${instruction.slice(0, 1000)}"""\nApply it as a JSON Patch (RFC 6902) against the current spec — change only what the request needs, keep everything else. Respond only by calling save_patch.`,
    tool: patchTool,
    schema: patchSchema,
    check: (p) => {
      try {
        const r = specSchema.safeParse(applyPatch(current, p.ops as PatchOp[]));
        return r.success ? null : `patched spec is invalid: ${r.error.issues.slice(0, 6).map((x) => `${x.path.join(".")}: ${x.message}`).join("; ")}`;
      } catch (err) {
        return `patch failed: ${err instanceof Error ? err.message : err}`;
      }
    },
    maxTokens: 4000,
    retries: 1,
  });
  rounds.push({ stage: "edit", model: HAIKU, issues: res.value ? 0 : 1, ms: Date.now() - t0 });
  if (!res.value) throw new AiError("ai_invalid", `edit failed: ${res.problem}`);
  const repaired = await repairSpec(b, SPEC_DOC, prompt, applyPatch(current, res.value.ops as PatchOp[]), vctx, rounds);
  return { ...repaired, rounds, model: HAIKU };
}

