// Sound events derived from the timeline — the AI never writes them.
import { BEHAVIORS } from "@/remotion/behaviors";
import { fxWindow, sec, type EvalEnv } from "./spec-eval";
import type { MotionSpec, SoundEvent } from "./spec";

const POP = new Set(["pop", "stamp", "spring-in", "gravity", "drop-in", "spin-in", "jelly", "punch"]);
const WHOOSH = new Set(["slide", "zoom-in", "mask-wipe", "split-reveal", "iris-in", "flip-in", "scatter-in", "ink-bloom", "slide-out", "scatter-out", "wipe-out"]);
const CLICK = new Set(["typewriter", "per-letter", "glitch-in", "count-up"]);

export function deriveEvents(spec: MotionSpec, env: EvalEnv): SoundEvent[] {
  const ev: SoundEvent[] = [];
  for (const c of spec.cuts ?? []) if (c.kind !== "hard") ev.push({ t: Math.max(0, sec(c.t, env) - 0.12), kind: "whoosh" });
  for (const el of spec.elements) {
    for (const fx of el.fx ?? []) {
      const b = BEHAVIORS[fx.fx];
      if (!b) continue;
      const { start } = fxWindow(fx, el, env);
      if (POP.has(fx.fx)) ev.push({ t: start, kind: "pop" });
      else if (WHOOSH.has(fx.fx)) ev.push({ t: Math.max(0, start - 0.05), kind: "whoosh" });
      else if (CLICK.has(fx.fx)) ev.push({ t: start, kind: "click" });
    }
  }
  for (const h of env.hits) {
    ev.push({ t: h.t, kind: "impact" });
    if (h.kind === "logo" || h.kind === "cta") ev.push({ t: h.t, kind: "subdrop" });
  }
  // thin out: one event per kind per 120 ms, max 3 events per 250 ms
  ev.sort((a, b) => a.t - b.t);
  const out: SoundEvent[] = [];
  for (const e of ev) {
    if (e.t > env.duration - 0.1) continue;
    if (out.some((o) => o.kind === e.kind && Math.abs(o.t - e.t) < 0.12)) continue;
    if (out.filter((o) => Math.abs(o.t - e.t) < 0.25).length >= 3) continue;
    out.push({ t: Number(e.t.toFixed(3)), kind: e.kind });
  }
  return out;
}
