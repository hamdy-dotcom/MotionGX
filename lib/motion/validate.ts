// Deterministic spec validation — no rendering, milliseconds. Layout bugs (overflow, overlap, covered
// labels, contrast, Arabic, stillness, timing) are geometry and maths, so they're computed here instead
// of asked of a vision model. Each issue names the element so the repair step can patch just that.
import { BEHAVIORS } from "@/remotion/behaviors";
import { buildTokens, contrast, type BrandColorInput } from "@/packages/primitives/src/palette";
import type { EnergyMap, ScriptBeat } from "@motiongx/primitives";
import { staticCheck } from "./compile";
import { loadFont, measureLine } from "./fonts-node";
import { cameraAt, elementText, fxWindow, resolveAt, screenBox, sec, type EvalEnv, type Resolved } from "./spec-eval";
import { specSchema, type MotionSpec, type SpecElement } from "./spec";

/** A deterministic repair the validator can compute itself (applied without AI by autoFix). */
export type SpecFix = { size?: number; w?: number; h?: number; x?: number; y?: number; color?: string; gradient?: false; z?: number; addFx?: Record<string, unknown>; removeFx?: string; in?: number; out?: number | null };
/** box in canvas % (x of width, y of height) */
export type PctBox = { x0: number; y0: number; x1: number; y1: number };
export type SpecIssue = { id: string | null; code: string; t?: number; msg: string; fix?: SpecFix; box?: PctBox };

export type ValidateCtx = {
  /** numbers the video may show (brand facts, brief, script) — anything else is invented */
  allowedNumbers?: number[];
  width: number;
  height: number;
  fps: number;
  duration: number;
  energy: EnergyMap;
  beats: ScriptBeat[];
  colors: BrandColorInput[];
  fonts: { arabic: string | null; latin: string | null };
  lang: "ar" | "en";
  hasLogo: boolean;
};

const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿ]/;
const SAFE = 0.05;

type Box = { x0: number; y0: number; x1: number; y1: number };
const area = (b: Box) => Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0);
const inter = (a: Box, b: Box) => area({ x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) });

let pctW = 1080;
let pctH = 1920;
/** a box in canvas % (x of width, y of height) — the units the spec is written in */
const pct = (b: Box) => `x ${((b.x0 / pctW) * 100).toFixed(0)}–${((b.x1 / pctW) * 100).toFixed(0)}%, y ${((b.y0 / pctH) * 100).toFixed(0)}–${((b.y1 / pctH) * 100).toFixed(0)}%`;
const shrink = (b: Box, k: number): Box => {
  const dx = (b.x1 - b.x0) * k;
  const dy = (b.y1 - b.y0) * k;
  return { x0: b.x0 + dx, y0: b.y0 + dy, x1: b.x1 - dx, y1: b.y1 - dy };
};
const routePts = (el: Extract<SpecElement, { type: "route" }>, env: EvalEnv) => el.points.map(([x, y]) => [(x / 100) * env.width, (y / 100) * env.height] as [number, number]);
const pathLen = (pts: [number, number][]) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0) || 1;
/** segment–rectangle intersection (Liang–Barsky) */
function segHitsBox(a: [number, number], b: [number, number], r: Box) {
  let t0 = 0;
  let t1 = 1;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const clip = (p: number, q: number) => {
    if (p === 0) return q >= 0;
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
    return true;
  };
  return clip(-dx, a[0] - r.x0) && clip(dx, r.x1 - a[0]) && clip(-dy, a[1] - r.y0) && clip(dy, r.y1 - a[1]);
}

/** Pre-loads fonts and returns a sync measurer. */
async function measurer(ctx: ValidateCtx, spec: MotionSpec) {
  const fallback = "Readex Pro";
  const weights = new Set<number>([700]);
  for (const e of spec.elements) if (e.type === "text" || e.type === "counter") weights.add(e.weight);
  const families = [...new Set([ctx.fonts.arabic, ctx.fonts.latin, fallback].filter((f): f is string => !!f))];
  const fonts = new Map<string, Awaited<ReturnType<typeof loadFont>>>();
  await Promise.all(families.flatMap((f) => [...weights].map(async (w) => fonts.set(`${f}:${w}`, await loadFont(f, w)))));
  // the same stacks as useBrandFonts: head/body = arabic font first for Arabic videos
  const stackFor = (role: "head" | "body" | "latin") => (role === "latin" ? [ctx.fonts.latin, fallback] : ctx.lang === "ar" ? [ctx.fonts.arabic, fallback, ctx.fonts.latin] : [ctx.fonts.latin, fallback]).filter((f): f is string => !!f);
  return (el: Extract<SpecElement, { type: "text" | "counter" }>, text: string, kashida = 0) => {
    const size = (el.size / 100) * ctx.width;
    for (const fam of stackFor(el.font)) {
      const font = fonts.get(`${fam}:${el.weight}`) ?? fonts.get(`${fam}:700`);
      if (!font) continue;
      const m = measureLine(font, text, size);
      if (m.missing) continue; // glyphs absent → the browser falls through the stack too
      const tatweel = kashida ? measureLine(font, "ـ".repeat(kashida), size).w * text.split(/\s+/).length : 0;
      return { w: m.w + tatweel, h: m.h };
    }
    return { w: text.length * size * 0.55, h: size * 1.3 };
  };
}

export async function validateSpec(raw: unknown, ctx: ValidateCtx): Promise<{ spec: MotionSpec | null; issues: SpecIssue[] }> {
  const issues: SpecIssue[] = [];
  const parsed = specSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      spec: null,
      issues: parsed.error.issues.slice(0, 20).map((i) => {
        const p = i.path;
        const elIdx = p[0] === "elements" && typeof p[1] === "number" ? p[1] : null;
        const id = elIdx !== null ? ((raw as { elements?: { id?: string }[] })?.elements?.[elIdx]?.id ?? `#${elIdx}`) : null;
        return { id, code: "schema", msg: `${p.join(".")}: ${i.message}` };
      }),
    };
  }
  const spec = parsed.data;
  const bpm = ctx.energy.bpm;
  pctW = ctx.width;
  pctH = ctx.height;
  const lines = new Map<string, string>(ctx.beats.flatMap((b) => b.lines.map((l, i): [string, string] => [`${b.id}:${i}`, l])));
  const measure = await measurer(ctx, spec);
  const env: EvalEnv = {
    width: ctx.width,
    height: ctx.height,
    fps: ctx.fps,
    bpm,
    duration: ctx.duration,
    hits: ctx.energy.hits,
    lineText: (ref) => lines.get(ref) ?? null,
    arabic: (s) => ARABIC.test(s),
    measure: (el, text) => measure(el, text),
    shots: new Map(ctx.beats.map((b) => [b.id, { start: b.start_s, end: b.end_s }])),
  };
  let curBox: PctBox | undefined;
  const add = (id: string | null, code: string, msg: string, t?: number, fix?: SpecFix) => {
    if (!issues.some((i) => i.id === id && i.code === code)) issues.push({ id, code, msg, t: t !== undefined ? Number(t.toFixed(2)) : undefined, fix, box: curBox && id === curId ? curBox : undefined });
  };
  let curId: string | null = null;

  // ── references & static rules ───────────────────────────────────────────
  const ids = new Set<string>();
  const byId = new Map(spec.elements.map((e) => [e.id, e]));
  for (const el of spec.elements) {
    if (ids.has(el.id)) add(el.id, "duplicate_id", `id "${el.id}" is used twice`);
    ids.add(el.id);
    if (el.parent && byId.get(el.parent)?.type !== "group") add(el.id, "bad_parent", `parent "${el.parent}" is not a group`);
    const inT = sec(el.in, env, 0);
    const outT = sec(el.out, env, ctx.duration);
    if (outT <= inT) add(el.id, "bad_time", `out (${outT.toFixed(2)}s) must be after in (${inT.toFixed(2)}s)`);
    if (inT > ctx.duration) add(el.id, "bad_time", `in (${inT.toFixed(2)}s) is after the video ends (${ctx.duration}s)`);
    if (el.type === "text") {
      if (!el.line && !el.text) add(el.id, "no_text", "text element needs `line` or `text`");
      if (el.line && !lines.has(el.line)) add(el.id, "bad_line", `line "${el.line}" doesn't exist (valid: ${[...lines.keys()].join(", ")})`);
    }
    const text = elementText(el, env) ?? "";
    for (const fx of el.fx ?? []) {
      const b = BEHAVIORS[fx.fx];
      if (!b) {
        add(el.id, "unknown_fx", `unknown behavior "${fx.fx}"`);
        continue;
      }
      const params = Object.fromEntries(Object.entries(fx).filter(([k]) => !["fx", "at", "dur", "stagger"].includes(k)));
      const pr = b.params.safeParse(params);
      if (!pr.success) add(el.id, "bad_fx_params", `${fx.fx}: ${pr.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
      if (b.textOnly && el.type !== "text" && el.type !== "counter" && fx.stagger === undefined) add(el.id, "fx_needs_text", `${fx.fx} only works on text`);
      if (b.perLetter && ARABIC.test(text)) add(el.id, "arabic_per_letter", `${fx.fx} splits letters, which breaks Arabic joins — use per-word`);
      if (fx.fx === "route-follow" && byId.get(String((fx as Record<string, unknown>).route))?.type !== "route") add(el.id, "bad_route", `route-follow needs route = the id of a route element`);
    }
    if (el.type === "text" && /\n/.test(text)) add(el.id, "multiline", "one line per text element — split into several elements");
    // copy must stay readable: no blinking / flickering on real text
    for (const f of el.fx ?? []) if ((el.type === "text" || el.type === "counter") && ["blink", "neon-flicker"].includes(f.fx) && text.trim().length > 2) add(el.id, "unreadable_fx", `${f.fx} makes "${text}" unreadable half the time — remove it`, undefined, { removeFx: f.fx });
    if (el.type === "shape" && el.to && !(el.fx ?? []).some((f) => f.fx === "morph")) add(el.id, "unused_morph", "`to` is set but no morph behavior");
    if (el.type === "image" && el.src === "logo" && !ctx.hasLogo) {
      /* fine: the wordmark fallback renders */
    }
    if (el.type === "custom") {
      if (!el.tsx && !el.use) add(el.id, "custom_empty", "custom element needs tsx or use");
      if (el.tsx) {
        const n = el.tsx.split("\n").length;
        if (n > 150) add(el.id, "custom_too_long", `custom element is ${n} lines (max 150)`);
        for (const e of staticCheck(el.tsx)) add(el.id, "custom_code", e);
      }
    }
  }
  if (spec.elements.length > 0 && !spec.elements.some((e) => e.type === "image" && e.src === "logo")) add(null, "no_logo", "add the brand logo (image src=logo) around the logo hit");

  // never invent numbers: counters and literal text may only show numbers from the facts/brief/script
  if (ctx.allowedNumbers) {
    const allowed = new Set(ctx.allowedNumbers.map((n) => Math.round(n * 100) / 100));
    for (const l of lines.values()) for (const n of l.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).match(/\d+(?:[.,]\d+)*/g) ?? []) allowed.add(Number(n.replace(/,/g, "")));
    const ok = (n: number) => n < 10 || allowed.has(Math.round(n * 100) / 100) || n === new Date().getFullYear();
    for (const el of spec.elements) {
      const nums: number[] = [];
      if (el.type === "counter") nums.push(el.to);
      if (el.type === "text" && el.text) for (const n of el.text.match(/\d+(?:[.,]\d+)*/g) ?? []) nums.push(Number(n.replace(/,/g, "")));
      const bad = nums.filter((n) => !ok(n));
      if (bad.length) add(el.id, "invented_number", `${bad.join(", ")} isn't in the brand facts — only show real numbers (or none)`);
    }
  }
  // the logo is used as-is: no glow/blur/hue/flicker/glitch filters on it (motion is fine)
  for (const el of spec.elements) {
    if (el.type !== "image" || el.src !== "logo") continue;
    for (const f of el.fx ?? []) if (["glow-pulse", "hue-cycle", "neon-flicker", "glitch-in", "blur-in", "blur-out", "color-flash", "dissolve", "assemble", "scatter-in"].includes(f.fx)) add(el.id, "logo_fx", `${f.fx} distorts the logo — use pop/scale/float/punch instead`, undefined, { removeFx: f.fx });
  }

  // script coverage: every line is on screen somewhere
  const used = new Set(spec.elements.flatMap((e) => (e.type === "text" ? [e.line ?? ""] : [])));
  const literal = new Set(spec.elements.flatMap((e) => (e.type === "text" && e.text ? [e.text.trim()] : [])));
  for (const [ref, l] of lines) if (!used.has(ref) && !literal.has(l.trim())) add(null, "missing_line", `script line ${ref} ("${l}") never appears — add a text element with line "${ref}"`);

  // hits on the beat grid
  const beat = 60 / bpm;
  for (const h of ctx.energy.hits) {
    const off = Math.abs(h.t / beat - Math.round(h.t / beat)) * beat;
    if (off > 0.02) add(null, "hit_off_beat", `hit ${h.kind} at ${h.t}s is ${(off * 1000).toFixed(0)} ms off the beat`);
  }
  if (issues.some((i) => ["duplicate_id", "bad_parent"].includes(i.code))) return { spec, issues };

  // ── geometry over time ──────────────────────────────────────────────────
  const P = { ...buildTokens(ctx.colors), white: "#FFFFFF", black: "#0A0A0A" } as unknown as Record<string, string>;
  const times = new Set<number>();
  for (let t = 0; t <= ctx.duration; t += 0.2) times.add(Number(t.toFixed(2)));
  for (const h of ctx.energy.hits) times.add(h.t);
  // settled moments: right after each element's entrance completes
  for (const el of spec.elements) {
    for (const fx of el.fx ?? []) {
      const b = BEHAVIORS[fx.fx];
      if (b && (b.kind === "enter" || b.kind === "physics")) {
        const w = fxWindow(fx, el, env);
        times.add(Number(Math.min(ctx.duration, w.start + w.dur + 0.05).toFixed(2)));
      }
    }
  }
  const sorted = [...times].sort((a, b) => a - b);

  const settled = (r: Resolved, t: number) => {
    if (!r.visible || r.opacity < 0.6 || r.state.clip) return false;
    // (per-word/letter behaviors keep a units function after they finish — the fx windows below decide)
    if (r.state.typed !== undefined && r.state.typed < 1) return false;
    for (const fx of r.el.fx ?? []) {
      const b = BEHAVIORS[fx.fx];
      if (!b || b.kind === "loop" || b.kind === "data" || b.kind === "generative") continue;
      const w = fxWindow(fx, r.el, env);
      if (t >= w.start - 0.01 && t <= w.start + w.dur + 0.02) return false;
    }
    return true;
  };

  const isText = (r: Resolved) => r.el.type === "text" || r.el.type === "counter";
  const solidBehind = (r: Resolved) => r.el.type === "group" ? !!r.el.fill : r.el.type === "shape" ? !["ring", "line"].includes(r.el.shape) && (r.el.fill || r.el.gradient) && (r.el.alpha ?? 1) >= 0.6 : r.el.type === "image";
  const fillOf = (r: Resolved): string[] => {
    if (r.el.type === "group" && r.el.fill) return [P[r.el.fill]];
    if (r.el.type === "shape") return r.el.gradient ? [P.gradA, P.gradB] : r.el.fill ? [P[r.el.fill]] : [P.primary];
    return ["#FFFFFF"]; // logo plates / images: assume light
  };
  const bgColors = () => {
    const layers = spec.canvas.bg.filter((b) => ["solid", "gradient", "radial"].includes(b.kind) && (b.alpha ?? 1) >= 0.6);
    const top = layers.filter((b) => b.kind !== "radial").at(-1) ?? layers.at(-1);
    return top ? top.colors.map((c) => P[c]) : [P.bg];
  };
  const textColors = (el: SpecElement) => (el.type === "text" && el.gradient ? [P.gradA, P.gradB] : el.type === "text" && el.outline ? [P[el.outline]] : el.type === "text" || el.type === "counter" ? [P[el.color]] : []);

  let lastMotion = 0;
  let prevSig = "";
  const zOf = (r: Resolved, list: Resolved[]) => (r.el.z ?? 0) * 1000 + list.indexOf(r);
  for (const t of sorted) {
    const all = resolveAt(spec, env, t);
    const cam = cameraAt(spec, env, t);
    const vis = all.filter((r) => r.visible);
    const boxes = new Map(vis.map((r) => [r.el.id, screenBox(r, cam, env)]));
    const W = ctx.width;
    const H = ctx.height;

    for (const r of vis.filter(isText)) {
      const b = boxes.get(r.el.id)!;
      curId = r.el.id;
      curBox = { x0: (b.x0 / W) * 100, y0: (b.y0 / H) * 100, x1: (b.x1 / W) * 100, y1: (b.y1 / H) * 100 };
      const textNow = r.text ?? "";
      // readability rules are for copy: a lone symbol (★, →, •) is decoration
      if (!textNow.trim() || !/[\p{L}\p{N}]/u.test(textNow)) continue;
      const el = r.el as Extract<SpecElement, { type: "text" | "counter" }>;
      // width vs the allowed box (renderer shrinks; > 12 % over = a layout problem)
      const maxW = el.w !== undefined ? (el.w / 100) * W : W * (1 - 2 * SAFE);
      const kash = Math.max(0, ...(el.fx ?? []).filter((f) => f.fx === "kashida-stretch").map((f) => Number((f as Record<string, unknown>).max ?? 4)));
      const m = measure(el, textNow, kash);
      if (m.w > maxW * 1.12) add(el.id, "text_overflow", `"${textNow}" is ${Math.round(m.w)}px wide at size ${el.size} but only ${Math.round(maxW)}px fit — lower size to ≤ ${((el.size * maxW) / m.w).toFixed(1)} or widen w`, t, { size: Number(((el.size * maxW * 0.97) / m.w).toFixed(2)) });
      if (!settled(r, t)) continue;
      const tol = W * 0.01;
      if (b.x0 < W * SAFE - tol || b.x1 > W * (1 - SAFE) + tol || b.y0 < H * SAFE - tol || b.y1 > H * (1 - SAFE) + tol) {
        const bw = b.x1 - b.x0;
        const bh = b.y1 - b.y0;
        const safeW = W * (1 - 2 * SAFE);
        const safeH = H * (1 - 2 * SAFE);
        let fix: SpecFix;
        if (bw > safeW || bh > safeH) fix = { size: Number((el.size * Math.min(safeW / bw, safeH / bh) * 0.96).toFixed(2)) };
        else {
          const dx = b.x0 < W * SAFE ? W * SAFE - b.x0 + 4 : b.x1 > W * (1 - SAFE) ? W * (1 - SAFE) - b.x1 - 4 : 0;
          const dy = b.y0 < H * SAFE ? H * SAFE - b.y0 + 4 : b.y1 > H * (1 - SAFE) ? H * (1 - SAFE) - b.y1 - 4 : 0;
          fix = { x: Number((el.x + (dx / W) * 100).toFixed(2)), y: Number((el.y + (dy / H) * 100).toFixed(2)) };
        }
        add(el.id, "offscreen", `"${textNow}" leaves the safe area: its box is ${pct(b)} (keep within 5–95%)`, t, fix);
      }
      // text on text
      for (const o of vis.filter(isText)) {
        if (o === r || o.el.id < r.el.id || !settled(o, t) || !(o.text ?? "").trim()) continue;
        const ob = boxes.get(o.el.id)!;
        const ov = inter(b, ob);
        if (ov > 0.08 * Math.min(area(b), area(ob))) {
          // push the lower line down by the overlap + a gap (or the upper one up if there's no room)
          const lower = (b.y0 + b.y1) / 2 >= (ob.y0 + ob.y1) / 2 ? r : o;
          const lb2 = lower === r ? b : ob;
          const ub = lower === r ? ob : b;
          const push = ub.y1 - lb2.y0 + H * 0.012;
          const le = lower.el as Extract<SpecElement, { type: "text" }>;
          const room = lb2.y1 + push < H * (1 - SAFE);
          add(lower.el.id, "text_overlap", `overlaps text "${(lower === r ? o : r).el.id}" — move one of them`, t, room ? { y: Number((le.y + (push / H) * 100).toFixed(2)) } : undefined);
        }
      }
      // shapes over the label
      const myZ = zOf(r, all);
      for (const o of vis) {
        if (o === r || isText(o) || o.el.type === "particles" || o.el.type === "route") continue;
        if (zOf(o, all) <= myZ || o.opacity < 0.5) continue;
        if (r.el.parent === o.el.id) continue;
        const ov = inter(b, boxes.get(o.el.id)!);
        if (ov > 0.15 * area(b) && (solidBehind(o) || o.el.type === "svgPath")) add(r.el.id, "covered", `"${o.el.id}" (${o.el.type}, box ${pct(boxes.get(o.el.id)!)}) is drawn on top of this text (box ${pct(b)}) — give the text a higher z or move it`, t, { z: Math.min(100, (o.el.z ?? 0) + 1) });
      }
      // a solid plate (scrim/card) fully under the label hides any stroke drawn below that plate
      const myZ0 = zOf(r, all);
      const fullPlates = vis.filter((o) => o !== r && zOf(o, all) < myZ0 && solidBehind(o) && o.opacity >= 0.6 && inter(b, boxes.get(o.el.id)!) >= 0.92 * area(b));
      const hidden = (o: Resolved) => fullPlates.some((p) => zOf(p, all) > zOf(o, all));
      // outline-only shapes (rings, stroked outlines, lines) crossing the label: the text must sit fully
      // inside the inner area or fully outside the shape
      for (const o of vis) {
        if (o.el.type !== "shape" || o.opacity < 0.4 || o === r || hidden(o)) continue;
        const se = o.el;
        const outline = se.shape === "ring" || se.shape === "line" || (!se.fill && !se.gradient && !!se.stroke);
        if (!outline) continue;
        const ob = boxes.get(o.el.id)!;
        if (!inter(b, ob)) continue;
        const sw = se.shape === "ring" || se.shape === "line" ? Math.max(((se.strokeW ?? 0) / 100) * Math.max(ob.x1 - ob.x0, ob.y1 - ob.y0) * 4, Math.min(ob.x1 - ob.x0, ob.y1 - ob.y0) * 0.06) : ((se.strokeW ?? 0) / 100) * Math.max(ob.x1 - ob.x0, ob.y1 - ob.y0) * 4;
        let inside: boolean;
        if (se.shape === "ring" || se.shape === "circle") {
          const cx = (ob.x0 + ob.x1) / 2;
          const cy = (ob.y0 + ob.y1) / 2;
          const rIn = Math.min(ob.x1 - ob.x0, ob.y1 - ob.y0) / 2 - sw;
          inside = [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]].every(([x, y]) => Math.hypot(x - cx, y - cy) < rIn);
        } else inside = b.x0 > ob.x0 + sw && b.x1 < ob.x1 - sw && b.y0 > ob.y0 + sw && b.y1 < ob.y1 - sw;
        if (!inside && se.shape !== "line") add(r.el.id, "line_through_text", `the outline of "${o.el.id}" (${se.shape}, box ${pct(ob)}) crosses this text (box ${pct(b)}) — put the text fully inside it or clear of it`, t);
        if (se.shape === "line" && inter(b, ob) > 0) add(r.el.id, "line_through_text", `line "${o.el.id}" (box ${pct(ob)}) crosses this text (box ${pct(b)}) — move one of them`, t);
      }
      // a route/line stroke crossing the label (even underneath) makes it hard to read
      for (const o of vis) {
        if (o.el.type !== "route" || o.opacity < 0.4 || hidden(o)) continue;
        const draw = o.state.draw ?? 1;
        const pts = routePts(o.el, env);
        const total = pathLen(pts);
        let acc = 0;
        for (let i = 1; i < pts.length && acc / total <= draw; i++) {
          const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
          const frac = Math.min(1, Math.max(0, (draw * total - acc) / Math.max(1e-6, seg)));
          const end: [number, number] = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * frac, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * frac];
          // the drawn route has thickness: stroke (and station dots) reach into the label
          const sw = (o.el.strokeW / 100) * env.width * 2;
          const reach = o.el.nodes ? sw * 1.6 : sw / 2;
          const tb = shrink(b, 0.08);
          if (segHitsBox(pts[i - 1], end, { x0: tb.x0 - reach, y0: tb.y0 - reach, x1: tb.x1 + reach, y1: tb.y1 + reach })) {
            add(r.el.id, "line_through_text", `route "${o.el.id}" runs through this text (box ${pct(b)}) — move the text or bend the route's points around it`, t);
            break;
          }
          acc += seg;
        }
      }
      // what's behind the label: solid shapes below it (by coverage) + the background where they don't reach
      const below = vis
        .filter((o) => o !== r && zOf(o, all) < myZ && solidBehind(o) && o.opacity >= 0.6 && r.el.parent !== o.el.id)
        .map((o) => ({ o, cov: inter(b, boxes.get(o.el.id)!) / Math.max(1, area(b)) }))
        .filter((x) => x.cov > 0.05)
        .sort((a, c) => zOf(c.o, all) - zOf(a.o, all));
      const plate = below[0];
      // a label on a plate (bubble/pill/card) must sit fully on it
      // a shape behind two or more labels is a backdrop, not a plate (no fitting; contrast still applies)
      const backdrop = plate ? vis.filter((o) => isText(o) && o !== r && (o.text ?? "").trim() && inter(boxes.get(o.el.id)!, boxes.get(plate.o.el.id)!) > 0.15 * area(boxes.get(o.el.id)!)).length >= 1 : false;
      if (plate && !backdrop && plate.cov > 0.15 && plate.cov < 0.88 && plate.o.el.type === "shape") {
        const pe = plate.o.el;
        const pb = boxes.get(pe.id)!;
        const tw = b.x1 - b.x0;
        const th = b.y1 - b.y0;
        const round = pe.shape === "circle" || pe.shape === "ring" || pe.shape === "blob" || pe.shape === "polygon" || pe.shape === "star";
        const needW = round ? Math.hypot(tw, th) * 1.08 : tw * 1.14;
        const shrink = round ? (pb.x1 - pb.x0) / Math.hypot(tw, th) / 1.1 : (pb.x1 - pb.x0) / tw / 1.12;
        // gentle fixes are automatic (shrink ≤ 20 %, or grow the plate ≤ 30 %); bigger mismatches are a
        // design decision (move the label off the bubble, use a pill…) left to the patch step
        const plateW = pb.x1 - pb.x0;
        const centreOn = (b.x0 + b.x1) / 2 > pb.x0 && (b.x0 + b.x1) / 2 < pb.x1 && (b.y0 + b.y1) / 2 > pb.y0 && (b.y0 + b.y1) / 2 < pb.y1;
        if (!centreOn) {
          add(el.id, "text_spills_plate", `"${textNow}" (box ${pct(b)}) half-overlaps shape "${pe.id}" (box ${pct(pb)}, in ${pe.in ?? 0}–${pe.out ?? "end"}) — move the text clear of it, or end the shape earlier (set its "out")`, t);
        } else if (!round && pe.w !== undefined && !pe.parent) {
          // cards / floors / pills: fit the plate around every label sitting on it (+ padding)
          // only labels whose centre sits on this plate belong to it
          const onPlate = (lbx: Box) => (lbx.x0 + lbx.x1) / 2 > pb.x0 && (lbx.x0 + lbx.x1) / 2 < pb.x1 && (lbx.y0 + lbx.y1) / 2 > pb.y0 && (lbx.y0 + lbx.y1) / 2 < pb.y1;
          const labels = vis.filter((o) => isText(o) && settled(o, t) && (o.text ?? "").trim()).map((o) => boxes.get(o.el.id)!).filter(onPlate);
          const u = labels.reduce((acc, lbx) => ({ x0: Math.min(acc.x0, lbx.x0), y0: Math.min(acc.y0, lbx.y0), x1: Math.max(acc.x1, lbx.x1), y1: Math.max(acc.y1, lbx.y1) }), b);
          const padX = (u.y1 - u.y0) * 0.35 + W * 0.02;
          const padY = H * 0.012 + (u.y1 - u.y0) * 0.12;
          const nx0 = Math.max(W * SAFE * 0.5, u.x0 - padX);
          const nx1 = Math.min(W * (1 - SAFE * 0.5), u.x1 + padX);
          const ny0 = u.y0 - padY;
          const ny1 = u.y1 + padY;
          add(pe.id, "text_spills_plate", `plate "${pe.id}" doesn't contain its label "${textNow}" — fit it around the text`, t, {
            x: Number((((nx0 + nx1) / 2 / W) * 100).toFixed(2)),
            y: Number((((ny0 + ny1) / 2 / H) * 100).toFixed(2)),
            // +8 %: room for the plate's own loops (breathe/pulse) so the label stays inside at every frame
            w: Number(((((nx1 - nx0) * 1.08) / W) * 100).toFixed(2)),
            h: Number(((((ny1 - ny0) * 1.08) / W) * 100).toFixed(2)),
          });
        } else if (needW <= plateW * 1.3 && pe.w !== undefined) add(pe.id, "text_spills_plate", `plate "${pe.id}" is a bit small for "${textNow}"`, t, {
            w: Number(((pe.w * needW * 1.1) / plateW).toFixed(1)),
            // and centred on its label (an off-centre plate never contains it, however big)
            x: Number((pe.x + (((b.x0 + b.x1) / 2 - (pb.x0 + pb.x1) / 2) / W) * 100).toFixed(2)),
            y: Number((pe.y + (((b.y0 + b.y1) / 2 - (pb.y0 + pb.y1) / 2) / H) * 100).toFixed(2)),
          });
        else if (shrink >= 0.6 && el.size * shrink >= 3.5) add(el.id, "text_spills_plate", `"${textNow}" spills over its plate "${pe.id}" (only ${(plate.cov * 100).toFixed(0)}% on it)`, t, { size: Number((el.size * Math.min(1, shrink)).toFixed(2)) });
        else add(el.id, "text_spills_plate", `"${textNow}" (${((tw / W) * 100).toFixed(0)}% of the width) doesn't fit its plate "${pe.id}" (${((plateW / W) * 100).toFixed(0)}% wide, only ${(plate.cov * 100).toFixed(0)}% of the text on it) — put the label beside/below the plate, use a wide pill/card instead, or shorten the line's size`, t);
      }
      // what actually shows behind the text: shapes from the top down, stopping at the first that covers it
      const visibleBelow: typeof below = [];
      for (const x of below) {
        visibleBelow.push(x);
        if (x.cov >= 0.92) break;
      }
      const bgs = [...new Set([...visibleBelow.flatMap((x) => fillOf(x.o)), ...(visibleBelow.some((x) => x.cov >= 0.92) ? [] : bgColors())])];
      const large = el.size >= 4.5;
      const need = large ? 3 : 4.5;
      let worst = 99;
      for (const fg of textColors(el)) for (const bg of bgs) worst = Math.min(worst, contrast(fg, bg));
      // text over the logo: never readable — move it clear of the logo (below, else above)
      const logo = vis.find((o) => o.el.type === "image" && o.el.src === "logo" && o !== r);
      const lb = logo ? boxes.get(logo.el.id)! : null;
      if (lb && inter(b, lb) > 0.05 * area(b)) {
        const th = b.y1 - b.y0;
        const below = lb.y1 + th / 2 + H * 0.02;
        const above = lb.y0 - th / 2 - H * 0.02;
        const ny = below + th / 2 < H * (1 - SAFE) ? below : above - th / 2 > H * SAFE ? above : null;
        add(el.id, "text_on_logo", `"${textNow}" overlaps the logo — move it clear of the logo`, t, ny !== null ? { y: Number(((el.y + ((ny - (b.y0 + b.y1) / 2) / H) * 100)).toFixed(2)) } : undefined);
      } else if (worst < need) {
        const ROLES = ["text", "onPrimary", "white", "black", "primary", "accent", "bg", "textMuted"];
        const best = ROLES.map((role) => ({ role, c: Math.min(...bgs.map((bg) => contrast(P[role], bg))) })).sort((x, y) => y.c - x.c)[0];
        // only auto-fix when a role actually passes; otherwise it's a layout problem (patch step)
        add(el.id, "low_contrast", `contrast ${worst.toFixed(2)}:1 behind it (${plate ? `"${plate.o.el.id}"${plate.cov < 0.92 ? " + background" : ""}` : "background"}; needs ${need}:1) — ${best.c >= need ? "change color role" : `no color works on this mixed background: move the text (box ${pct(b)}) fully onto one surface${plate ? ` (shape "${plate.o.el.id}" box ${pct(boxes.get(plate.o.el.id)!)})` : ""}`}`, t, best.c >= need ? { color: best.role, gradient: false } : undefined);
      }
    }

    // stillness: something besides the camera drift must move
    const sig = vis
      .filter((r) => r.el.type !== "particles")
      .map((r) => `${r.el.id}:${r.cx.toFixed(0)},${r.cy.toFixed(0)},${r.scale.toFixed(3)},${r.rot.toFixed(1)},${r.opacity.toFixed(2)},${(r.state.draw ?? 1).toFixed(2)},${(r.state.count ?? 1).toFixed(2)},${r.state.clip ?? ""}`)
      .join("|");
    const moving = sig !== prevSig || vis.some((r) => r.el.type === "particles");
    if (moving) lastMotion = t;
    else if (t - lastMotion > 0.6) {
      // the biggest element on screen through the still stretch gets a gentle loop
      const host = vis.filter((r) => r.el.type !== "route" && sec(r.el.in, env, 0) <= lastMotion).sort((a, b2) => b2.w * b2.h - a.w * a.h)[0];
      add(host?.el.id ?? null, "static", `nothing moves from ${lastMotion.toFixed(1)}s to ${t.toFixed(1)}s — add a loop behavior (float, breathe, noise-drift…) or particles`, lastMotion, host ? { addFx: { fx: host.el.type === "text" ? "breathe" : "noise-drift", ...(host.el.type === "text" ? { amount: 0.02 } : { amp: 0.8 }) } } : undefined);
      lastMotion = t;
    }
    prevSig = sig;
  }

  // a button-like pill (filled, wide) must carry a label
  for (const el of spec.elements) {
    if (el.type !== "shape" || el.shape !== "pill" || (!el.fill && !el.gradient) || (el.alpha ?? 1) < 0.6 || (el.w ?? 0) < 18) continue;
    const t = Math.min(ctx.duration - 0.05, sec(el.in, env, 0) + 1.0);
    const all = resolveAt(spec, env, t);
    const me = all.find((r) => r.el.id === el.id);
    if (!me?.visible) continue;
    const cam = cameraAt(spec, env, t);
    const pb = screenBox(me, cam, env);
    const labelled = all.some((r) => r.visible && (r.el.type === "text" || r.el.type === "counter") && (r.el.z ?? 0) >= (el.z ?? 0) && (() => {
      const b = screenBox(r, cam, env);
      const cx = (b.x0 + b.x1) / 2;
      const cy = (b.y0 + b.y1) / 2;
      return cx > pb.x0 && cx < pb.x1 && cy > pb.y0 && cy < pb.y1;
    })());
    if (!labelled) add(el.id, "empty_button", `pill "${el.id}" looks like a button but has no label on it — put a script line on it (higher z) or remove it`, t);
  }

  // brand moments
  const logoHit = ctx.energy.hits.find((h) => h.kind === "logo");
  if (logoHit) {
    const at = resolveAt(spec, env, Math.min(ctx.duration - 0.05, logoHit.t + 0.8)).find((r) => r.el.type === "image" && r.el.src === "logo" && r.visible);
    // the logo enters ON the hit and stays (fixable when a logo element exists)
    const logoEl = spec.elements.find((e) => e.type === "image" && e.src === "logo");
    if (!at) add(logoEl?.id ?? null, "logo_missing_at_hit", `the logo isn't on screen 0.8s after the logo hit (${logoHit.t}s)${logoEl ? ` — "${logoEl.id}" is in ${logoEl.in ?? 0}–${logoEl.out ?? "end"}` : ""}`, logoHit.t, logoEl ? { in: logoHit.t, out: null } : undefined);
  }
  const ctaHit = ctx.energy.hits.find((h) => h.kind === "cta");
  // the CTA beat = the script beat the cta hit falls in
  const ctaBeat = ctaHit ? ctx.beats.find((b) => ctaHit.t >= b.start_s - 0.01 && ctaHit.t < b.end_s) ?? ctx.beats.at(-1) : undefined;
  if (ctaHit && ctaBeat) {
    const t = Math.min(ctx.duration - 0.05, ctaHit.t + 0.8);
    const vis = resolveAt(spec, env, t).filter((r) => r.visible && r.el.type === "text");
    const ctaLines = new Set(ctaBeat.lines.map((l) => l.trim()));
    if (!vis.some((r) => (r.el as { line?: string }).line?.startsWith(`${ctaBeat.id}:`) || ctaLines.has((r.text ?? "").trim()))) add(null, "cta_missing", `no CTA line (${ctaBeat.id}:…) on screen at ${t.toFixed(1)}s`);
  }
  return { spec, issues };
}
