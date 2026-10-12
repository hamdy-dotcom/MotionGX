// Slideshow risk (0–100, our own scoring; the idea of measuring "slideshow-ness" comes from OpenMontage,
// which is AGPL — no code was copied). High = the video plays like a deck of static slides.
//   25  share of time large elements sit still
//   15  text-heavy shots without any other motion
//   15  shot changes that are only fades / plain cuts
//   15  fewer than 3 distinct motion families
//   15  no camera motion
//   15  energy-map hits with nothing happening on them
// Plus the delivery promise: if the treatment promises morphs / particles / camera / 3D / a route /
// a cursor / counters and the spec doesn't deliver, that's a validation failure.
import { BEHAVIORS } from "@/remotion/behaviors";
import { cameraAt, fxWindow, resolveAt, screenBox, sec, type EvalEnv } from "./spec-eval";
import type { MotionSpec } from "./spec";
import type { SpecIssue } from "./validate";

export type RiskFactor = { key: string; points: number; max: number; detail: string; fix: string };
export type SlideshowRisk = { score: number; factors: RiskFactor[] };

const STEP = 0.1;

export function slideshowRisk(spec: MotionSpec, env: EvalEnv): SlideshowRisk {
  const factors: RiskFactor[] = [];
  const W = env.width;
  const H = env.height;
  const canvas = W * H;
  const times: number[] = [];
  for (let t = 0; t < env.duration - STEP; t += STEP) times.push(Number(t.toFixed(3)));

  // 1. large static elements: moved less than 0.6% of the width / 1.5% size / 0.03 opacity / 0.6° over 0.4 s
  let largeTime = 0;
  let staticTime = 0;
  const WIN = 0.4;
  const snap = (t: number) => {
    const cam = cameraAt(spec, env, t);
    const m = new Map<string, { cx: number; cy: number; w: number; h: number; o: number; rot: number; ang: number }>();
    for (const r of resolveAt(spec, env, t)) {
      // visuals only: copy holding still to be read is expected (text-heavy stills are factor 2)
      if (!r.visible || r.el.type === "particles" || r.el.type === "route" || r.el.type === "text" || r.el.type === "counter") continue;
      const b = screenBox(r, cam, env);
      m.set(r.el.id, { cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2, w: b.x1 - b.x0, h: b.y1 - b.y0, o: r.opacity, rot: r.rot, ang: (r.state.rx ?? 0) + (r.state.ry ?? 0) });
    }
    return m;
  };
  const cache = new Map<number, ReturnType<typeof snap>>();
  const at = (t: number) => {
    const k = Math.round(t * 10);
    if (!cache.has(k)) cache.set(k, snap(k / 10));
    return cache.get(k)!;
  };
  for (const t of times) {
    if (t < WIN) continue;
    const now = at(t);
    const before = at(t - WIN);
    for (const [id, x] of now) {
      if (x.w * x.h < canvas * 0.06) continue;
      const p = before.get(id);
      if (!p) continue;
      largeTime += STEP;
      const moved = Math.hypot(p.cx - x.cx, p.cy - x.cy) > W * 0.006 || Math.abs(p.w - x.w) > x.w * 0.015 || Math.abs(p.o - x.o) > 0.03 || Math.abs(p.rot - x.rot) > 0.6 || Math.abs(p.ang - x.ang) > 0.6;
      if (!moved) staticTime += STEP;
    }
  }
  const staticShare = largeTime ? staticTime / largeTime : 0;
  factors.push({ key: "static_large", points: Math.round(25 * Math.min(1, Math.max(0, (staticShare - 0.15) / 0.6))), max: 25, detail: `large visuals are still ${(staticShare * 100).toFixed(0)}% of the time`, fix: "give hero shapes/images/plates a loop (float, breathe, tilt-3d, noise-drift, ken-burns) or a camera move" });

  // 2. text-heavy shots without other motion
  const shots = [...(env.shots?.entries() ?? [])].map(([id, s]) => ({ id, ...s }));
  let heavyStill = 0;
  const heavyIds: string[] = [];
  for (const s of shots) {
    const mid = (s.start + s.end) / 2;
    const rs = resolveAt(spec, env, mid).filter((r) => r.visible);
    const words = rs.filter((r) => r.el.type === "text").reduce((n, r) => n + (r.text?.split(/\s+/).filter(Boolean).length ?? 0), 0);
    if (words < 4) continue;
    const others = rs.filter((r) => r.el.type !== "text" && r.el.type !== "group");
    const animated = others.some((r) => (r.el.fx ?? []).some((f) => {
      const b = BEHAVIORS[f.fx];
      if (!b) return false;
      const w = fxWindow(f, r.el, env);
      return w.start < s.end && w.start + w.dur > s.start;
    }) || r.el.type === "particles");
    if (!animated) {
      heavyStill++;
      heavyIds.push(s.id);
    }
  }
  factors.push({ key: "text_heavy_still", points: shots.length ? Math.round((15 * heavyStill) / shots.length) : 0, max: 15, detail: heavyStill ? `text-only shots with no other motion: ${heavyIds.join(", ")}` : "every text shot has a moving visual", fix: "add a moving hero visual (shape metaphor, morph, route, particles, device frame) to those shots" });

  // 3. transitions that are only fades or plain cuts
  const boundaries = shots.slice(1).map((s) => s.start);
  let plain = 0;
  for (const at of boundaries) {
    const cut = (spec.cuts ?? []).find((c) => Math.abs(sec(c.t, env) - at) < 0.35);
    if (cut && cut.kind !== "hard" && cut.kind !== "flash") continue;
    // an entrance at the boundary that isn't a plain fade also counts as a designed transition
    const designed = spec.elements.some((e) => (e.fx ?? []).some((f) => {
      const b = BEHAVIORS[f.fx];
      if (!b || (b.kind !== "enter" && b.kind !== "morph" && b.kind !== "exit") || f.fx === "fade" || f.fx === "fade-out") return false;
      const w = fxWindow(f, e, env);
      return Math.abs(w.start - at) < 0.35 || Math.abs(w.start + w.dur - at) < 0.35;
    }));
    if (!designed) plain++;
  }
  factors.push({ key: "plain_transitions", points: boundaries.length ? Math.round((15 * plain) / boundaries.length) : 0, max: 15, detail: `${plain}/${boundaries.length} shot changes are only fades / plain cuts`, fix: "use designed transitions: cuts (whip, zoom, layers, blinds, pixels, iris, diagonal) or a shared-morph / mask / clip-morph across the boundary" });

  // 4. distinct motion families
  const fam = new Set<string>();
  for (const e of spec.elements) for (const f of e.fx ?? []) {
    const b = BEHAVIORS[f.fx];
    if (b) fam.add(b.kind === "loop" ? "loop" : b.kind);
  }
  if ((spec.camera?.keys ?? []).length > 1) fam.add("camera");
  if (spec.elements.some((e) => (e.fx ?? []).some((f) => ["flip-3d", "swing-in", "tilt-3d", "card-flip", "carousel", "slit-in", "tilt-in", "flip-out", "swing-out", "slit-out"].includes(f.fx)))) fam.add("3d");
  const n = fam.size;
  factors.push({ key: "few_motion_types", points: n < 3 ? 15 : n < 5 ? 6 : 0, max: 15, detail: `${n} motion families (${[...fam].join(", ")})`, fix: "mix families: entrances + loops + a morph/physics/data behavior + camera + a 3D move" });

  // 5. camera motion
  const zs: number[] = [];
  const xs: number[] = [];
  for (const t of times.filter((_, i) => i % 5 === 0)) {
    const c = cameraAt(spec, env, t);
    zs.push(c.zoom);
    xs.push(Math.abs(c.x) + Math.abs(c.y) + Math.abs(c.rx) + Math.abs(c.ry));
  }
  const camRange = Math.max(...zs) - Math.min(...zs) + (Math.max(...xs) - Math.min(...xs)) / 20;
  factors.push({ key: "no_camera", points: camRange < 0.02 ? 15 : camRange < 0.05 ? 7 : 0, max: 15, detail: `camera range ${camRange.toFixed(3)}`, fix: "add camera keys: a push-in on the hook, a pull-out reveal, a tilt (rx/ry) or pan between shots" });

  // 6. hits with nothing on them
  const hits = env.hits;
  let dead = 0;
  for (const h of hits) {
    const near = (spec.cuts ?? []).some((c) => Math.abs(sec(c.t, env) - h.t) < 0.15) || spec.elements.some((e) => (e.fx ?? []).some((f) => {
      const b = BEHAVIORS[f.fx];
      if (!b || b.kind === "loop") return f.fx === "hit-pulse" || f.fx === "shake-hit";
      return Math.abs(fxWindow(f, e, env).start - h.t) < 0.15;
    }) || Math.abs(sec(e.in, env, -9) - h.t) < 0.15);
    if (!near) dead++;
  }
  factors.push({ key: "dead_hits", points: hits.length ? Math.round((15 * dead) / hits.length) : 15, max: 15, detail: `${dead}/${hits.length} hits have nothing landing on them`, fix: "land an entrance, emphasis (punch, slam, rgb-split, press) or a cut exactly on each hit time" });

  return { score: Math.min(100, factors.reduce((s, f) => s + f.points, 0)), factors };
}

/** treatment words → what the spec must contain to deliver them */
const PROMISES: { key: string; words: RegExp; delivered: (s: MotionSpec) => boolean }[] = [
  { key: "morph", words: /\bmorph|\btransform(s|ing)? into|\bbecomes? (a|the)\b|تتحول|يتحول/i, delivered: (s) => s.elements.some((e) => (e.fx ?? []).some((f) => ["morph", "gsap-morph", "shared-morph", "liquid-move"].includes(f.fx))) },
  { key: "particles", words: /particle|confetti|sparks?\b|dust|bubbles|جزيئات|شرار/i, delivered: (s) => s.elements.some((e) => e.type === "particles" || (e.fx ?? []).some((f) => ["confetti-burst", "spark-burst", "dot-burst", "dissolve", "assemble"].includes(f.fx))) },
  { key: "camera", words: /\bcamera|push[- ]in|pull[- ]out|\bzoom|dolly|\borbit|\bpan\b|كاميرا|زووم/i, delivered: (s) => (s.camera?.keys ?? []).length >= 2 },
  { key: "3d", words: /\b3d\b|three-dimensional|perspective|flip|تلت أبعاد|ثلاثي/i, delivered: (s) => (s.camera?.keys ?? []).some((k) => k.rx || k.ry) || s.elements.some((e) => (e.fx ?? []).some((f) => ["flip-3d", "swing-in", "tilt-3d", "card-flip", "carousel", "extrude", "slit-in", "tilt-in", "flip-out", "swing-out", "flip-in"].includes(f.fx))) },
  { key: "route", words: /\broute|journey|\bpath\b|\btrack(ing)?\b|map\b|رحلة|مسار|طريق/i, delivered: (s) => s.elements.some((e) => e.type === "route" || e.type === "svgPath" || (e.fx ?? []).some((f) => ["route-follow", "gsap-path"].includes(f.fx))) },
  { key: "cursor", words: /cursor|\bclick|\btap\b|\bdrag|pointer|ماوس|يضغط|سحب/i, delivered: (s) => s.elements.some((e) => (e.type === "shape" && e.shape === "cursor") || (e.fx ?? []).some((f) => ["press", "cursor-move"].includes(f.fx))) },
  { key: "counter", words: /count(s|ing)? up|counter|ticker|tally|عداد/i, delivered: (s) => s.elements.some((e) => e.type === "counter") },
];

/** Promised-but-missing motion as validation issues (the treatment text = concept + metaphor + shot visuals). */
export function promiseIssues(spec: MotionSpec, treatment: string): SpecIssue[] {
  return PROMISES.filter((p) => p.words.test(treatment) && !p.delivered(spec)).map((p) => ({ id: null, code: "promise_unmet", msg: `the treatment promises ${p.key === "3d" ? "3D motion" : p.key} but the spec never delivers it — add it (see the catalogue) where the treatment describes it` }));
}
