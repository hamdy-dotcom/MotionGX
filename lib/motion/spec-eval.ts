// Evaluates a MotionSpec at any time t: element boxes + behavior state, camera, cuts. Pure TS, used by
// the renderer every frame and by the validator at sample times — so what we validate is what renders.
import { stagger as motionStagger } from "motion";
import { BEHAVIORS, combine, EASE, hash, IDENTITY, noise1, strSeed, type BCtx, type BState, type EaseName } from "@/remotion/behaviors";
import { pathPoint } from "@/remotion/behaviors/path-lib";
import { toSeconds, type MotionSpec, type SpecElement, type SpecTime } from "./spec";

export type EvalEnv = {
  width: number;
  height: number;
  fps: number;
  bpm: number;
  duration: number;
  hits: { t: number; kind: string }[];
  /** measured text size in px (validator: fontkit; renderer: DOM) — optional */
  measure?: (el: Extract<SpecElement, { type: "text" | "counter" }>, text: string) => { w: number; h: number };
  /** resolved line text for "b2:0" refs */
  lineText: (ref: string) => string | null;
  arabic: (text: string) => boolean;
  /** shot anchors for "s3" / "s3e" times */
  shots?: Map<string, { start: number; end: number }>;
};

export type Resolved = {
  el: SpecElement;
  /** centre in px, after keyframes, behaviors and parent transforms (before camera) */
  cx: number;
  cy: number;
  /** position before this element's own behavior offsets (children rotate/scale around it) */
  baseCx: number;
  baseCy: number;
  /** unscaled box in px */
  w: number;
  h: number;
  state: BState;
  /** effective scale (incl. parents) */
  scale: number;
  rot: number;
  opacity: number;
  z: number;
  visible: boolean;
  text?: string;
  depth: number;
};

export const sec = (t: SpecTime | undefined, env: EvalEnv, fallback = 0) => toSeconds(t, env.bpm, fallback, env.shots);

/** text an element shows (literal or script line) */
export function elementText(el: SpecElement, env: EvalEnv): string | undefined {
  if (el.type === "text") return el.line ? env.lineText(el.line) ?? el.text ?? "" : el.text ?? "";
  if (el.type === "counter") return `${el.prefix ?? ""}${el.to.toFixed(el.decimals)}${el.suffix ?? ""}`;
  return undefined;
}

function boxOf(el: SpecElement, env: EvalEnv, text?: string): { w: number; h: number } {
  const W = env.width;
  if ((el.type === "text" || el.type === "counter") && text !== undefined) {
    const m = env.measure?.(el, text);
    const fs = (el.size / 100) * W;
    if (m) return m;
    // rough estimate when no measurer: 0.55em per char
    return { w: Math.min(W * 0.9, text.length * fs * 0.55), h: fs * 1.3 };
  }
  if (el.type === "route") return { w: env.width, h: env.height };
  const w = ((el.w ?? 20) / 100) * W;
  const h = el.h !== undefined ? (el.h / 100) * W : el.type === "image" ? w * 0.5 : w;
  return { w, h };
}

function keyValue(el: SpecElement, env: EvalEnv, t: number, prop: "x" | "y" | "scale" | "rot" | "opacity", base: number) {
  const keys = (el.keys ?? []).filter((k) => k[prop] !== undefined).map((k) => ({ t: sec(k.t, env), v: k[prop] as number, ease: k.ease }));
  if (!keys.length) return base;
  keys.sort((a, b) => a.t - b.t);
  if (t <= keys[0].t) return keys[0].v;
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i].t) {
      const a = keys[i - 1];
      const b = keys[i];
      const p = (t - a.t) / Math.max(1e-6, b.t - a.t);
      return a.v + (b.v - a.v) * EASE[(b.ease ?? "inOut") as EaseName](p);
    }
  }
  return keys[keys.length - 1].v;
}

/** behavior window for an fx on an element */
export function fxWindow(fx: NonNullable<SpecElement["fx"]>[number], el: SpecElement, env: EvalEnv, offset = 0) {
  const b = BEHAVIORS[fx.fx];
  const inT = sec(el.in, env, 0);
  const outT = sec(el.out, env, env.duration);
  const dur = fx.dur ?? (Number.isFinite(b?.dur) ? b!.dur : Math.max(0.01, outT - inT));
  const start = fx.at !== undefined ? sec(fx.at, env) : b?.kind === "exit" ? outT - dur : inT;
  return { start: start + offset, dur };
}

function applyFx(el: SpecElement, fxs: SpecElement["fx"], env: EvalEnv, t: number, box: { w: number; h: number }, arabic: boolean, idx = 0, n = 1, offsetOf: (fx: NonNullable<SpecElement["fx"]>[number]) => number = () => 0): BState {
  let s = IDENTITY;
  for (const fx of fxs ?? []) {
    const b = BEHAVIORS[fx.fx];
    if (!b) continue;
    const { start, dur } = fxWindow(fx, el, env, offsetOf(fx));
    const local = t - start;
    if (b.kind === "loop" && (local < 0 || local > dur)) continue;
    const params = Object.fromEntries(Object.entries(fx).filter(([k]) => !["fx", "at", "dur", "stagger"].includes(k)));
    const parsed = b.params.safeParse(params);
    const ctx: BCtx = {
      t,
      start,
      dur,
      p: Math.min(1, Math.max(0, local / dur)),
      local,
      w: env.width,
      h: env.height,
      bw: box.w,
      bh: box.h,
      beat: 60 / env.bpm,
      hits: env.hits,
      seed: strSeed(el.id + fx.fx) + idx,
      params: parsed.success ? (parsed.data as Record<string, unknown>) : params,
      i: idx,
      n,
      arabic,
    };
    s = combine(s, b.apply(ctx));
  }
  return s;
}

type StaggerOrder = "start" | "center" | "end" | "edges" | "random";
/** stagger slot of child i of n (Motion's stagger distribution for start/center/end; edges/random ours) */
export function staggerSlot(i: number, n: number, order: StaggerOrder = "start", seed = 1) {
  if (n <= 1) return 0;
  if (order === "start" || order === "center" || order === "end") return motionStagger(1, { from: order === "start" ? "first" : order === "end" ? "last" : "center" })(i, n);
  const mid = (n - 1) / 2;
  if (order === "edges") return mid - Math.abs(i - mid);
  const ranks = Array.from({ length: n }, (_, k) => k).sort((a, b) => hash(seed * 31 + a) - hash(seed * 31 + b));
  return ranks.indexOf(i);
}

/** points of a route in px */
export const routePoints = (el: Extract<SpecElement, { type: "route" }>, env: EvalEnv) => el.points.map(([x, y]) => [(x / 100) * env.width, (y / 100) * env.height] as [number, number]);

export function pointAlong(pts: [number, number][], p: number): [number, number] {
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    seg.push(d);
    total += d;
  }
  let target = Math.min(1, Math.max(0, p)) * total;
  for (let i = 0; i < seg.length; i++) {
    if (target <= seg[i]) {
      const k = seg[i] ? target / seg[i] : 0;
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
    }
    target -= seg[i];
  }
  return pts[pts.length - 1];
}

/**
 * Every element's resolved state at time t (parents before children). `compose` (validator) folds
 * parent transforms into children; the renderer passes false and nests the DOM instead.
 */
export function resolveAt(spec: MotionSpec, env: EvalEnv, tIn: number, opts: { compose?: boolean } = {}): Resolved[] {
  const compose = opts.compose ?? true;
  const byId = new Map(spec.elements.map((e) => [e.id, e]));
  const out = new Map<string, Resolved>();
  const order: SpecElement[] = [];
  const visit = (e: SpecElement, seen: Set<string>) => {
    if (out.has(e.id) || seen.has(e.id)) return;
    seen.add(e.id);
    const parent = e.parent ? byId.get(e.parent) : undefined;
    if (parent) visit(parent, seen);
    order.push(e);
    out.set(e.id, null as unknown as Resolved);
  };
  for (const e of spec.elements) visit(e, new Set());
  out.clear();

  for (const el of order) {
    const text = elementText(el, env);
    const arabic = text ? env.arabic(text) : false;
    let box = boxOf(el, env, text);
    // stop-motion: sample this element's motion at `steps` fps
    const t = el.steps ? Math.floor(tIn * el.steps + 1e-6) / el.steps : tIn;
    const parent = el.parent ? out.get(el.parent) : undefined;
    // staggered group fx land on children
    const pEl = el.parent ? byId.get(el.parent) : undefined;
    const siblings = pEl ? spec.elements.filter((x) => x.parent === pEl.id) : [];
    const idx = siblings.indexOf(el);
    const inherited = (pEl?.fx ?? []).filter((f) => f.stagger !== undefined);
    let state = applyFx(el, el.fx, env, t, box, arabic);
    if (inherited.length) state = combine(state, applyFx(pEl!, inherited, env, t, box, arabic, idx, siblings.length, (f) => staggerSlot(idx, siblings.length, f.order, strSeed(pEl!.id)) * (f.stagger ?? 0)));
    // group's own (non-staggered) fx only on the group
    const own = el.type === "group" ? applyFx(el, (el.fx ?? []).filter((f) => f.stagger === undefined), env, t, box, arabic) : null;
    if (own) state = own;

    let cx = (keyValue(el, env, t, "x", el.x) / 100) * env.width + state.dx;
    let cy = (keyValue(el, env, t, "y", el.y) / 100) * env.height + state.dy;
    let followRot = 0;
    if (state.follow) {
      const r = byId.get(state.follow.route);
      if (r?.type === "route") [cx, cy] = pointAlong(routePoints(r, env), state.follow.p);
      else if (r?.type === "svgPath") {
        // path-follow (svg-path-properties) on the path's 0–100 box mapped onto its element box
        const pw = ((r.w ?? 20) / 100) * env.width;
        const ph = r.h !== undefined ? (r.h / 100) * env.width : pw;
        const pt = pathPoint(r.d, state.follow.p);
        cx = (r.x / 100) * env.width - pw / 2 + (pt.x / 100) * pw;
        cy = (r.y / 100) * env.height - ph / 2 + (pt.y / 100) * ph;
        if (state.follow.align) {
          const a = (pt.angle * Math.PI) / 180;
          followRot = (Math.atan2(Math.sin(a) * ph, Math.cos(a) * pw) * 180) / Math.PI;
        }
      }
    }
    if (state.toward) {
      // shared-element morph: glide + resize into the target element's (base) box
      const target = byId.get(state.toward.id);
      if (target && target.id !== el.id) {
        const tb = boxOf(target, env, elementText(target, env));
        const k = state.toward.p;
        cx += ((target.x / 100) * env.width - cx) * k;
        cy += ((target.y / 100) * env.height - cy) * k;
        box = { w: Math.max(1, box.w + (tb.w - box.w) * k), h: Math.max(1, box.h + (tb.h - box.h) * k) };
      }
    }
    let scale = keyValue(el, env, t, "scale", 1) * state.scale;
    let rot = keyValue(el, env, t, "rot", el.rot ?? 0) + state.rot + followRot;
    let opacity = keyValue(el, env, t, "opacity", el.opacity ?? 1) * state.opacity;
    const inT = sec(el.in, env, 0);
    const outT = sec(el.out, env, env.duration);
    let visible = tIn >= inT && tIn <= outT;

    const baseCx = cx;
    const baseCy = cy;
    if (parent && compose) {
      // children live in canvas coordinates; they follow the parent's movement away from its base
      // position and rotate/scale around the parent's centre
      const mx = parent.cx - parent.baseCx;
      const my = parent.cy - parent.baseCy;
      const pr = ((parent.rot - (parent.el.rot ?? 0)) * Math.PI) / 180;
      const rx = (cx - parent.baseCx) * Math.cos(pr) - (cy - parent.baseCy) * Math.sin(pr);
      const ry = (cx - parent.baseCx) * Math.sin(pr) + (cy - parent.baseCy) * Math.cos(pr);
      cx = parent.baseCx + mx + rx * parent.scale;
      cy = parent.baseCy + my + ry * parent.scale;
      scale *= parent.scale;
      rot += parent.rot - (parent.el.rot ?? 0);
      opacity *= parent.opacity;
      visible = visible && parent.visible;
    }
    out.set(el.id, { el, cx, cy, baseCx: parent ? baseCx : cx - state.dx, baseCy: parent ? baseCy : cy - state.dy, w: box.w, h: box.h, state, scale, rot, opacity, z: el.z ?? parent?.z ?? 0, visible: visible && opacity > 0.01, text, depth: el.depth ?? parent?.depth ?? 1 });
  }
  return [...out.values()];
}

export type CameraState = { zoom: number; x: number; y: number; rot: number; rx: number; ry: number };

/** camera at t: keyframes + drift noise + shake on hits */
export function cameraAt(spec: MotionSpec, env: EvalEnv, t: number): CameraState {
  const keys = (spec.camera?.keys ?? []).map((k) => ({ ...k, t: sec(k.t, env) })).sort((a, b) => a.t - b.t);
  const val = (prop: "zoom" | "x" | "y" | "rot" | "rx" | "ry", base: number) => {
    const ks = keys.filter((k) => k[prop] !== undefined);
    if (!ks.length) return base;
    if (t <= ks[0].t) return ks[0][prop]!;
    for (let i = 1; i < ks.length; i++) {
      if (t <= ks[i].t) {
        const p = (t - ks[i - 1].t) / Math.max(1e-6, ks[i].t - ks[i - 1].t);
        return ks[i - 1][prop]! + (ks[i][prop]! - ks[i - 1][prop]!) * EASE[(ks[i].ease ?? "inOut") as EaseName](p);
      }
    }
    return ks[ks.length - 1][prop]!;
  };
  const drift = spec.camera?.drift ?? 0.3;
  let x = val("x", 0) + noise1(11, t * 0.25) * drift * 1.2;
  let y = val("y", 0) + noise1(23, t * 0.25) * drift * 1.2;
  let rot = val("rot", 0);
  const shake = spec.camera?.shake ?? 0;
  if (shake) {
    let h = 0;
    for (const hit of env.hits) {
      const d = t - hit.t;
      if (d >= 0 && d < 0.3) h = Math.max(h, 1 - d / 0.3);
    }
    x += noise1(31, t * 40) * h * shake * 1.5;
    y += noise1(37, t * 40) * h * shake * 1.5;
    rot += noise1(41, t * 40) * h * shake * 1.2;
  }
  return { zoom: val("zoom", 1), x, y, rot, rx: val("rx", 0), ry: val("ry", 0) };
}

/** screen-space box (axis-aligned) of a resolved element under the camera */
export function screenBox(r: Resolved, cam: CameraState, env: EvalEnv) {
  const k = 1 + (cam.zoom - 1) * r.depth;
  const ox = env.width / 2;
  const oy = env.height / 2;
  const cx = ox + (r.cx - ox) * k - (cam.x / 100) * env.width * r.depth;
  const cy = oy + (r.cy - oy) * k - (cam.y / 100) * env.height * r.depth;
  const s = r.scale * k * Math.max(r.state.sx, 0);
  const sy = r.scale * k * Math.max(r.state.sy, 0);
  const a = Math.abs((r.rot * Math.PI) / 180);
  const w = r.w * s;
  const h = r.h * sy;
  const bw = Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a));
  const bh = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a));
  return { x0: cx - bw / 2, y0: cy - bh / 2, x1: cx + bw / 2, y1: cy + bh / 2 };
}
