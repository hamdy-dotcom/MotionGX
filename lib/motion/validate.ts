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

export type SpecIssue = { id: string | null; code: string; t?: number; msg: string };

export type ValidateCtx = {
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
  };
  const add = (id: string | null, code: string, msg: string, t?: number) => {
    if (!issues.some((i) => i.id === id && i.code === code)) issues.push({ id, code, msg, t: t !== undefined ? Number(t.toFixed(2)) : undefined });
  };

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
    if (el.type === "shape" && el.to && !(el.fx ?? []).some((f) => f.fx === "morph")) add(el.id, "unused_morph", "`to` is set but no morph behavior");
    if (el.type === "image" && el.src === "logo" && !ctx.hasLogo) {
      /* fine: the wordmark fallback renders */
    }
    if (el.type === "custom") {
      const n = el.tsx.split("\n").length;
      if (n > 150) add(el.id, "custom_too_long", `custom element is ${n} lines (max 150)`);
      for (const e of staticCheck(el.tsx)) add(el.id, "custom_code", e);
    }
  }
  if (spec.elements.length > 0 && !spec.elements.some((e) => e.type === "image" && e.src === "logo")) add(null, "no_logo", "add the brand logo (image src=logo) around the logo hit");

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
    if (r.state.units || (r.state.typed !== undefined && r.state.typed < 1)) return false;
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
      const textNow = r.text ?? "";
      if (!textNow.trim()) continue;
      const el = r.el as Extract<SpecElement, { type: "text" | "counter" }>;
      // width vs the allowed box (renderer shrinks; > 12 % over = a layout problem)
      const maxW = el.w !== undefined ? (el.w / 100) * W : W * (1 - 2 * SAFE);
      const kash = Math.max(0, ...(el.fx ?? []).filter((f) => f.fx === "kashida-stretch").map((f) => Number((f as Record<string, unknown>).max ?? 4)));
      const m = measure(el, textNow, kash);
      if (m.w > maxW * 1.12) add(el.id, "text_overflow", `"${textNow}" is ${Math.round(m.w)}px wide at size ${el.size} but only ${Math.round(maxW)}px fit — lower size to ≤ ${((el.size * maxW) / m.w).toFixed(1)} or widen w`, t);
      if (!settled(r, t)) continue;
      if (b.x0 < W * SAFE - 2 || b.x1 > W * (1 - SAFE) + 2 || b.y0 < H * SAFE - 2 || b.y1 > H * (1 - SAFE) + 2) add(el.id, "offscreen", `"${textNow}" leaves the safe area (${Math.round(b.x0)},${Math.round(b.y0)})–(${Math.round(b.x1)},${Math.round(b.y1)}) in a ${W}×${H} frame with 5% margins`, t);
      // text on text
      for (const o of vis.filter(isText)) {
        if (o === r || o.el.id < r.el.id || !settled(o, t) || !(o.text ?? "").trim()) continue;
        const ob = boxes.get(o.el.id)!;
        const ov = inter(b, ob);
        if (ov > 0.08 * Math.min(area(b), area(ob))) add(r.el.id, "text_overlap", `overlaps text "${o.el.id}" ("${o.text}") — move one of them`, t);
      }
      // shapes over the label
      const myZ = zOf(r, all);
      for (const o of vis) {
        if (o === r || isText(o) || o.el.type === "particles" || o.el.type === "route") continue;
        if (zOf(o, all) <= myZ || o.opacity < 0.5) continue;
        if (r.el.parent === o.el.id) continue;
        const ov = inter(b, boxes.get(o.el.id)!);
        if (ov > 0.15 * area(b) && (solidBehind(o) || o.el.type === "svgPath")) add(r.el.id, "covered", `"${o.el.id}" (${o.el.type}) is drawn on top of this text — give the text a higher z or move it`, t);
      }
      // a route/line stroke crossing the label (even underneath) makes it hard to read
      for (const o of vis) {
        if (o.el.type !== "route" || o.opacity < 0.4) continue;
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
            add(r.el.id, "line_through_text", `route "${o.el.id}" runs through this text — move the text or bend the route around it`, t);
            break;
          }
          acc += seg;
        }
      }
      // contrast against what's behind its centre
      const cx = (b.x0 + b.x1) / 2;
      const cy = (b.y0 + b.y1) / 2;
      const behind = vis
        .filter((o) => o !== r && zOf(o, all) < myZ && solidBehind(o) && o.opacity >= 0.6)
        .filter((o) => {
          const ob = boxes.get(o.el.id)!;
          return cx > ob.x0 && cx < ob.x1 && cy > ob.y0 && cy < ob.y1 && area(ob) >= area(b) * 0.6;
        })
        .sort((a, c) => zOf(c, all) - zOf(a, all))[0];
      const bgs = behind ? fillOf(behind) : bgColors();
      const large = el.size >= 4.5;
      const need = large ? 3 : 4.5;
      let worst = 99;
      for (const fg of textColors(el)) for (const bg of bgs) worst = Math.min(worst, contrast(fg, bg));
      if (worst < need) add(el.id, "low_contrast", `contrast ${worst.toFixed(2)}:1 on ${behind ? `"${behind.el.id}"` : "the background"} (needs ${need}:1) — change color role`, t);
    }

    // stillness: something besides the camera drift must move
    const sig = vis
      .filter((r) => r.el.type !== "particles")
      .map((r) => `${r.el.id}:${r.cx.toFixed(0)},${r.cy.toFixed(0)},${r.scale.toFixed(3)},${r.rot.toFixed(1)},${r.opacity.toFixed(2)},${(r.state.draw ?? 1).toFixed(2)},${(r.state.count ?? 1).toFixed(2)},${r.state.clip ?? ""}`)
      .join("|");
    const moving = sig !== prevSig || vis.some((r) => r.el.type === "particles");
    if (moving) lastMotion = t;
    else if (t - lastMotion > 0.6) add(null, "static", `nothing moves from ${lastMotion.toFixed(1)}s to ${t.toFixed(1)}s — add a loop behavior (float, breathe, noise-drift…) or particles`, lastMotion);
    prevSig = sig;
  }

  // brand moments
  const logoHit = ctx.energy.hits.find((h) => h.kind === "logo");
  if (logoHit) {
    const at = resolveAt(spec, env, Math.min(ctx.duration - 0.05, logoHit.t + 0.8)).find((r) => r.el.type === "image" && r.el.src === "logo" && r.visible);
    if (!at) add(null, "logo_missing_at_hit", `the logo isn't on screen 0.8s after the logo hit (${logoHit.t}s)`);
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
