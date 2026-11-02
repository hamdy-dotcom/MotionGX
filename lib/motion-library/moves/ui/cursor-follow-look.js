// Cursor follow / look-at: a pointer wanders a smooth path (pathAt: Catmull-Rom in time) and a follower tracks it with
// lag. product-film's followKeys: every `sample` s the cursor's direction from the follower's centre is written as
// nx = clamp(-1..1)((x − cx) / reach_x), ny likewise over reach_y; those keys feed sprung tracks (ML.track), so the
// follower lags and settles. nx, ny turn an arrow, slide a spotlight, shift a highlight card ±20 px or move a mascot's
// pupils. Given a shape or logo, the follower is that element (turned, shifted, lit or given eyes).
// Source: Rieranthony/product-film-skill templates/kit/cursor-path.ts (pathAt, followKeys) (MIT).
ML.define({
  id: "ui.cursor-follow-look",
  category: "ui",
  name: "Element looks at / follows the cursor",
  does: "Something on screen (an arrow, a spotlight, a highlight, a mascot's eyes) turns or shifts to track the cursor as it moves.",
  says: ["connection", "playful", "focus"],
  energy: 2,
  targets: ["shape", "logo", "cursor"],
  duration: [1, 4],
  params: {
    follower: { type: "choice", options: ["arrow", "spotlight", "highlight", "eyes"], default: "arrow" },
    reach_x: { type: "number", range: [200, 900], default: 600, unit: "px" },
    sample: { type: "number", range: [0.05, 0.2], default: 0.1, unit: "s" },
    stops: { type: "number", range: [3, 8], default: 5 },
    stiffness: { type: "number", range: [60, 260], default: 120 },
    seed: { type: "number", range: [1, 99], default: 5 },
  },
  pairs: ["ui.cursor-free-path", "character.blink"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "product-film-skill:templates/kit/cursor-path.ts", license: "MIT" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent) => { const e = doc.createElement(tag); e.style.cssText = css; parent.append(e); return e; };
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const layer = mk("div", "position:absolute;inset:0;pointer-events:none;z-index:7;", host);
    const given = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const R = f.pic;
    const gb = given ? ctx.box(given) : null;
    const C = given ? { x: gb.x + gb.w / 2, y: gb.y + gb.h / 2 } : { x: R.x + R.w / 2, y: R.y + R.h / 2 };
    const rx = p.reach_x * k, ry = rx * (400 / 600);
    const size = given ? Math.max(gb.w, gb.h) : Math.min(R.w, R.h) * 0.34;

    // the follower
    let draw;
    const kind = p.follower;
    if (kind === "arrow") {
      if (given) {
        given.style.transformOrigin = "50% 50%";
        draw = (nx, ny, ang) => { given.style.rotate = `${ang.toFixed(2)}deg`; };
      } else {
        const disc = mk("div", `position:absolute;left:${(C.x - size / 2).toFixed(1)}px;top:${(C.y - size / 2).toFixed(1)}px;width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;border-radius:50%;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);display:grid;place-items:center;`, layer);
        const s = sv("svg", { viewBox: "0 0 100 100", width: (size * 0.62).toFixed(1), height: (size * 0.62).toFixed(1) }, disc);
        const g = sv("g", {}, s);
        sv("path", { d: "M14 50 H72 M52 28 L76 50 L52 72", fill: "none", stroke: "var(--x-accent)", "stroke-width": 11, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        s.style.overflow = "visible";
        draw = (nx, ny, ang) => g.setAttribute("transform", `rotate(${ang.toFixed(2)} 50 50)`);
      }
    } else if (kind === "spotlight") {
      const r = Math.max(size * 1.1, 260 * k);
      const glow = mk("div", `position:absolute;left:0;top:0;width:${(r * 2).toFixed(1)}px;height:${(r * 2).toFixed(1)}px;border-radius:50%;background:radial-gradient(closest-side, color-mix(in srgb, var(--x-accent) 34%, transparent), color-mix(in srgb, var(--x-accent) 10%, transparent) 62%, transparent);mix-blend-mode:multiply;`, layer);
      const ringE = mk("div", `position:absolute;left:0;top:0;width:${(r * 0.9).toFixed(1)}px;height:${(r * 0.9).toFixed(1)}px;border-radius:50%;box-sizing:border-box;border:${(3 * k).toFixed(1)}px solid color-mix(in srgb, var(--x-accent) 55%, transparent);`, layer);
      draw = (nx, ny) => { const x = C.x + nx * rx * 0.85, y = C.y + ny * ry * 0.85; glow.style.transform = `translate(${(x - r).toFixed(2)}px, ${(y - r).toFixed(2)}px)`; ringE.style.transform = `translate(${(x - r * 0.45).toFixed(2)}px, ${(y - r * 0.45).toFixed(2)}px)`; };
    } else if (kind === "highlight") {
      const shift = 20 * k * 1.6;
      if (given) draw = (nx, ny) => { given.style.translate = `${(nx * shift).toFixed(2)}px ${(ny * shift).toFixed(2)}px`; given.style.rotate = `${(nx * 2.5).toFixed(2)}deg`; };
      else {
        const w = Math.min(R.w * 0.6, 640 * k), h = w * 0.6;
        const card = mk("div", `position:absolute;left:${(C.x - w / 2).toFixed(1)}px;top:${(C.y - h / 2).toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;box-sizing:border-box;border-radius:var(--x-radius);background:var(--x-panel);border:${(3 * k).toFixed(1)}px solid var(--x-accent);box-shadow:var(--x-shadow);padding:${(36 * k).toFixed(1)}px;display:flex;flex-direction:column;gap:${(20 * k).toFixed(1)}px;`, layer);
        mk("div", `width:${(64 * k).toFixed(1)}px;height:${(64 * k).toFixed(1)}px;border-radius:50%;background:var(--x-accent);`, card);
        ["70%", "90%", "52%"].forEach((ww, i) => mk("div", `width:${ww};height:${((i ? 14 : 22) * k).toFixed(1)}px;border-radius:999px;background:${i ? "var(--x-line)" : "var(--x-ink)"};`, card));
        const glow = mk("div", `position:absolute;inset:${(-14 * k).toFixed(1)}px;border-radius:calc(var(--x-radius) + ${(14 * k).toFixed(1)}px);background:color-mix(in srgb, var(--x-accent) 14%, transparent);z-index:-1;`, card);
        layer.insertBefore(card, layer.firstChild);
        draw = (nx, ny) => { card.style.translate = `${(nx * shift).toFixed(2)}px ${(ny * shift).toFixed(2)}px`; card.style.rotate = `${(nx * 2).toFixed(2)}deg`; glow.style.translate = `${(nx * shift * 0.6).toFixed(2)}px ${(ny * shift * 0.6).toFixed(2)}px`; };
      }
    } else {
      // eyes: a mascot face (or two eyes on the given element)
      const face = given ? null : mk("div", `position:absolute;left:${(C.x - size / 2).toFixed(1)}px;top:${(C.y - size / 2).toFixed(1)}px;width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;border-radius:50%;background:var(--x-accent);box-shadow:var(--x-shadow);`, layer);
      const eyeR = (given ? Math.min(gb.w, gb.h) * 0.16 : size * 0.15), sep = eyeR * 1.35;
      const cy = given ? C.y - gb.h * 0.08 : C.y - size * 0.08;
      const eyes = [-1, 1].map((s) => {
        const e = mk("div", `position:absolute;left:${(C.x + s * sep - eyeR).toFixed(1)}px;top:${(cy - eyeR).toFixed(1)}px;width:${(eyeR * 2).toFixed(1)}px;height:${(eyeR * 2).toFixed(1)}px;border-radius:50%;background:var(--x-panel);box-shadow:0 0 0 ${(3 * k).toFixed(1)}px var(--x-ink);overflow:hidden;`, layer);
        const pu = mk("div", `position:absolute;left:${(eyeR * 0.5).toFixed(1)}px;top:${(eyeR * 0.5).toFixed(1)}px;width:${eyeR.toFixed(1)}px;height:${eyeR.toFixed(1)}px;border-radius:50%;background:var(--x-ink);`, e);
        return { e, pu };
      });
      if (face) mk("div", `position:absolute;left:${(C.x - size * 0.14).toFixed(1)}px;top:${(C.y + size * 0.2).toFixed(1)}px;width:${(size * 0.28).toFixed(1)}px;height:${(size * 0.1).toFixed(1)}px;border-radius:0 0 999px 999px;background:var(--x-ink);`, layer);
      draw = (nx, ny) => { const m = eyeR * 0.45; eyes.forEach(({ pu }) => (pu.style.translate = `${(nx * m).toFixed(2)}px ${(ny * m).toFixed(2)}px`)); };
    }

    // the cursor's wander: seeded stops around the follower, inside the frame; first stop on the reading side
    const S = p.seed, n = Math.round(ML.clamp(p.stops, 3, 8)), safe = f.safe;
    const t0 = at + 0.15, t1 = Math.max(t0 + 0.6, end - 0.35);
    const stops = [];
    for (let i = 0; i < n; i++) {
      let ang = (i / n) * Math.PI * 2 + ML.rnd(i, S) * 1.2 + Math.PI;
      const dist = 0.55 + 0.4 * ML.rnd(i, S + 1);
      let x = C.x + Math.cos(ang) * rx * dist * (rtl ? -1 : 1), y = C.y + Math.sin(ang) * ry * dist * 1.4;
      x = ML.clamp(x, safe.x + 40 * k, safe.x + safe.w - 60 * k); y = ML.clamp(y, safe.y + 40 * k, safe.y + safe.h - 60 * k);
      stops.push({ t: t0 + ((t1 - t0) * i) / (n - 1), x, y });
    }
    // followKeys: direction from the centre, -1..1 over the reach, every `sample` s → sprung tracks
    const kx = [], ky = [];
    for (let tt = t0; tt <= t1 + 1e-9; tt += p.sample) {
      const q = ML.pathAt(stops, tt);
      kx.push([tt, ML.clamp((q.x - C.x) / rx, -1, 1)]); ky.push([tt, ML.clamp((q.y - C.y) / ry, -1, 1)]);
    }
    const cfg = { stiffness: p.stiffness, damping: 2 * 0.8 * Math.sqrt(p.stiffness) };
    kx.unshift([at - 1, kx[0][1]]); ky.unshift([at - 1, ky[0][1]]);

    // the pointer (macOS arrow, anchored at its tip)
    const cs = 58 * k;
    const cur = mk("div", "position:absolute;left:0;top:0;", layer);
    const cv = sv("svg", { viewBox: "0 0 24 24", width: cs.toFixed(1), height: cs.toFixed(1), style: `position:absolute;left:${(-5 / 24 * cs).toFixed(1)}px;top:${(-2 / 24 * cs).toFixed(1)}px;overflow:visible;filter:drop-shadow(0 ${(4 * k).toFixed(1)}px ${(6 * k).toFixed(1)}px color-mix(in srgb, var(--x-ink) 30%, transparent));` }, cur);
    sv("path", { d: "M5 2 L5 19 L9.5 15.5 L12.5 22 L15.5 20.5 L12.5 14 L18.5 14 Z", fill: "var(--x-pointer)", stroke: "var(--x-pointer-edge)", "stroke-width": 1.4, "stroke-linejoin": "round" }, cv);
    ctx.sfx(t0, "whoosh.soft", 0.2);
    let lastAng = Math.atan2(ky[1][1] * ry, kx[1][1] * rx) * 180 / Math.PI;
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25), on = t >= at ? ML.clamp((t - at) / 0.25) : 0;
        layer.style.opacity = (on * (1 - leave)).toFixed(4);
        const q = ML.pathAt(stops, t);
        cur.style.transform = `translate(${q.x.toFixed(2)}px, ${q.y.toFixed(2)}px)`;
        const nx = ML.track(t, kx, cfg), ny = ML.track(t, ky, cfg);
        // the angle from the tracked direction (unwrapped against the first key so it never spins the long way)
        let ang = Math.atan2(ny * ry, nx * rx) * 180 / Math.PI;
        while (ang - lastAng > 180) ang -= 360; while (ang - lastAng < -180) ang += 360;
        draw(nx, ny, ang);
        if (given && kind !== "eyes") given.style.opacity = String(1 - leave);
      },
    };
  },
});
