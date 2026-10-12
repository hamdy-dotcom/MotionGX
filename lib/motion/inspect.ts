// Timeline inspection (idea from genmotion's timeline evaluator, MIT; our code): evaluate a spec at any
// time t without rendering — which elements are on screen, where, which behaviors are active and how far
// along, the camera and any cut in progress. Also the two frame-level checks mined from the prompts:
// the seamless-loop seam (last frame = first) and the per-beat still check (every beat lands on a
// readable, settled frame).
import type { ScriptBeat, EnergyMap } from "@motiongx/primitives";
import { BEHAVIORS } from "@/remotion/behaviors";
import { cameraAt, fxWindow, resolveAt, screenBox, sec, type EvalEnv, type Resolved } from "./spec-eval";
import type { MotionSpec } from "./spec";

const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿ]/;

export function envFor(o: { width: number; height: number; fps: number; duration: number; energy: EnergyMap; beats: ScriptBeat[] }): EvalEnv {
  const lines = new Map<string, string>(o.beats.flatMap((b) => b.lines.map((l, i): [string, string] => [`${b.id}:${i}`, l])));
  return {
    width: o.width,
    height: o.height,
    fps: o.fps,
    bpm: o.energy.bpm,
    duration: o.duration,
    hits: o.energy.hits,
    lineText: (ref) => lines.get(ref) ?? null,
    arabic: (s) => ARABIC.test(s),
    shots: new Map(o.beats.map((b) => [b.id, { start: b.start_s, end: b.end_s }])),
  };
}

export type InspectedElement = {
  id: string;
  type: string;
  /** screen box in canvas % */
  box: { x0: number; y0: number; x1: number; y1: number };
  opacity: number;
  scale: number;
  rot: number;
  text?: string;
  active: { fx: string; kind: string; p: number }[];
};
export type Inspection = { t: number; camera: ReturnType<typeof cameraAt>; cut: { kind: string; at: number } | null; elements: InspectedElement[] };

/** Everything on screen at time t. */
export function inspectAt(spec: MotionSpec, env: EvalEnv, t: number): Inspection {
  const cam = cameraAt(spec, env, t);
  const elements = resolveAt(spec, env, t)
    .filter((r) => r.visible)
    .map((r): InspectedElement => {
      const b = screenBox(r, cam, env);
      const active = (r.el.fx ?? []).flatMap((f) => {
        const beh = BEHAVIORS[f.fx];
        if (!beh) return [];
        const w = fxWindow(f, r.el, env);
        const local = t - w.start;
        if (local < 0 || local > w.dur) return [];
        return [{ fx: f.fx, kind: beh.kind, p: Number((Number.isFinite(w.dur) ? local / w.dur : 0).toFixed(3)) }];
      });
      return { id: r.el.id, type: r.el.type, box: { x0: (b.x0 / env.width) * 100, y0: (b.y0 / env.height) * 100, x1: (b.x1 / env.width) * 100, y1: (b.y1 / env.height) * 100 }, opacity: Number(r.opacity.toFixed(3)), scale: Number(r.scale.toFixed(3)), rot: Number(r.rot.toFixed(2)), text: r.text, active };
    });
  const cut = (spec.cuts ?? []).map((c) => ({ kind: c.kind, at: sec(c.t, env) })).find((c) => t >= c.at - 0.3 && t <= c.at + 0.35) ?? null;
  return { t, camera: cam, cut, elements };
}

/** a compact signature of the visible frame (positions/opacity/scale), for frame-to-frame comparisons */
function signature(spec: MotionSpec, env: EvalEnv, t: number) {
  const cam = cameraAt(spec, env, t);
  const rs: Resolved[] = resolveAt(spec, env, t);
  return new Map(rs.filter((r) => r.visible).map((r) => [r.el.id, { b: screenBox(r, cam, env), o: r.opacity, s: r.scale * r.state.sx * r.state.sy, rot: r.rot }]));
}

/** Seamless loop: how far the last frame is from the first (0 = identical). */
export function loopSeam(spec: MotionSpec, env: EvalEnv): { ok: boolean; diff: number; elements: string[] } {
  const a = signature(spec, env, 0);
  const b = signature(spec, env, env.duration - 1 / env.fps);
  const ids = new Set([...a.keys(), ...b.keys()]);
  let diff = 0;
  const bad: string[] = [];
  for (const id of ids) {
    const x = a.get(id);
    const y = b.get(id);
    const d = !x || !y ? 1 : Math.abs(x.b.x0 - y.b.x0) / env.width + Math.abs(x.b.y0 - y.b.y0) / env.height + Math.abs(x.o - y.o) + Math.abs(x.s - y.s) + Math.abs(x.rot - y.rot) / 90;
    if (d > 0.02) bad.push(id);
    diff += d;
  }
  return { ok: bad.length === 0, diff: Number(diff.toFixed(3)), elements: bad };
}

/**
 * Per-beat still check: on every beat the frame should read — no copy caught mid-entrance or mid-exit.
 * Returns the beats where some text is still transitioning (p strictly between 0.15 and 0.85).
 */
export function beatStills(spec: MotionSpec, env: EvalEnv): { beats: number; unsettled: { t: number; ids: string[] }[] } {
  const beat = 60 / env.bpm;
  const out: { t: number; ids: string[] }[] = [];
  let n = 0;
  for (let t = beat; t < env.duration - beat / 2; t += beat) {
    n++;
    const ins = inspectAt(spec, env, t);
    const ids = ins.elements.filter((e) => e.type === "text" && e.active.some((a) => (a.kind === "enter" || a.kind === "exit") && a.p > 0.15 && a.p < 0.85)).map((e) => e.id);
    if (ids.length) out.push({ t: Number(t.toFixed(3)), ids });
  }
  return { beats: n, unsettled: out };
}
