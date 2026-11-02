// Free-form cursor path: the pointer drifts through timed stops like someone exploring the screen — product-film's
// pathAt, a cubic Hermite between stops with Catmull-Rom velocities in time ((p[i+1] − p[i−1]) / (t[i+1] − t[i−1])),
// clamped before the first and after the last stop. Stops that click get zero velocity and a second, held stop a beat
// later, so the cursor rests exactly on the click (a squash and a small ring) and the beat after it.
// Click points are the scene's slots when it has them, else seeded spots across the safe area.
// Source: Rieranthony/product-film-skill templates/kit/cursor-path.ts (pathAt) + cursor.tsx (squash) (MIT).
ML.define({
  id: "ui.cursor-free-path",
  category: "ui",
  name: "Free-form wandering cursor path",
  does: "The cursor drifts smoothly through several points like someone exploring the screen, pausing exactly where it clicks.",
  says: ["flow", "story", "ambient"],
  energy: 2,
  targets: ["cursor"],
  duration: [2, 6],
  params: {
    stops: { type: "number", range: [3, 10], default: 5 },
    hold_on_clicks: { type: "bool", default: true },
    rest: { type: "number", range: [0.15, 0.6], default: 0.35, unit: "s" },
    trail: { type: "bool", default: false },
    seed: { type: "number", range: [1, 99], default: 3 },
  },
  pairs: ["ui.cursor-glide-click", "ui.cursor-follow-look"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "click",
  source: { from: "product-film-skill:templates/kit/cursor-path.ts", license: "MIT" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent) => { const e = doc.createElement(tag); e.style.cssText = css; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const layer = mk("div", "position:absolute;inset:0;pointer-events:none;z-index:8;", host);
    const n = Math.round(ML.clamp(p.stops, 3, 10)), S = p.seed, safe = f.safe;

    // where it goes: the scene's slots (clicked), seeded wander points between; first stop on the reading side
    const slots = [...host.querySelectorAll("[data-slot]")].filter((e) => e !== ctx.stage && !layer.contains(e)).map((e) => ctx.box(e));
    const pts = [];
    for (let i = 0; i < n; i++) {
      const click = i > 0 && i % 2 === 0 && i < n;
      const sl = click && slots.length ? slots[(i / 2 - 1) % slots.length] : null;
      let x, y;
      if (sl) { x = sl.x + sl.w * 0.5; y = sl.y + sl.h * 0.55; }
      else {
        const u = (i + 0.5) / n, side = rtl ? 1 - u : u;
        x = safe.x + safe.w * (0.12 + 0.76 * (0.5 * side + 0.5 * ML.rnd(i, S)));
        y = safe.y + safe.h * (0.18 + 0.66 * ML.rnd(i, S + 7));
      }
      pts.push({ x, y, click });
    }
    if (n >= 3 && !pts.some((q) => q.click)) pts[n - 1].click = true;
    const t0 = at + 0.2, t1 = Math.max(t0 + 1, end - 0.35);
    const clicks = pts.filter((q) => q.click).length;
    const rest = p.hold_on_clicks ? Math.min(p.rest, (t1 - t0) / (n + clicks) * 0.9) : 0;
    const gap = (t1 - t0 - rest * clicks) / Math.max(1, n - 1);
    const stops = [], hold = [], clickAt = [];
    let tt = t0;
    pts.forEach((q, i) => {
      stops.push({ t: tt, x: q.x, y: q.y });
      if (q.click) { clickAt.push(tt); if (p.hold_on_clicks) { hold.push(tt); tt += rest; stops.push({ t: tt, x: q.x, y: q.y }); hold.push(tt); } }
      tt += gap;
    });
    clickAt.forEach((c) => ctx.sfx(c - 0.011, "click", 0.45));

    // the pointer: macOS arrow anchored at its tip, squashing on each click; a ring opens where it clicks
    const cs = 58 * k;
    const trail = p.trail ? Array.from({ length: 10 }, (_, i) => mk("div", `position:absolute;left:0;top:0;width:${(10 * k).toFixed(1)}px;height:${(10 * k).toFixed(1)}px;margin:${(-5 * k).toFixed(1)}px 0 0 ${(-5 * k).toFixed(1)}px;border-radius:50%;background:var(--x-accent);`, layer)) : [];
    const rings = clickAt.map(() => mk("div", `position:absolute;left:0;top:0;width:${(88 * k).toFixed(1)}px;height:${(88 * k).toFixed(1)}px;margin:${(-44 * k).toFixed(1)}px 0 0 ${(-44 * k).toFixed(1)}px;border-radius:50%;box-sizing:border-box;border:${(4 * k).toFixed(1)}px solid var(--x-accent);`, layer));
    const cur = mk("div", "position:absolute;left:0;top:0;", layer);
    const svg = doc.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("width", cs.toFixed(1)); svg.setAttribute("height", cs.toFixed(1));
    svg.style.cssText = `position:absolute;left:${(-5 / 24 * cs).toFixed(1)}px;top:${(-2 / 24 * cs).toFixed(1)}px;overflow:visible;transform-origin:${(5 / 24 * cs).toFixed(1)}px ${(2 / 24 * cs).toFixed(1)}px;filter:drop-shadow(0 ${(4 * k).toFixed(1)}px ${(6 * k).toFixed(1)}px color-mix(in srgb, var(--x-ink) 30%, transparent));`;
    const path = doc.createElementNS(NS, "path");
    path.setAttribute("d", "M5 2 L5 19 L9.5 15.5 L12.5 22 L15.5 20.5 L12.5 14 L18.5 14 Z");
    path.setAttribute("fill", "var(--x-pointer)"); path.setAttribute("stroke", "var(--x-pointer-edge)"); path.setAttribute("stroke-width", "1.4"); path.setAttribute("stroke-linejoin", "round");
    svg.append(path); cur.append(svg);
    const P = (t) => ML.pathAt(stops, t, hold);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25), on = t >= at ? ML.clamp((t - at) / 0.2) : 0;
        layer.style.opacity = (on * (1 - leave)).toFixed(4);
        const q = P(t);
        cur.style.transform = `translate(${q.x.toFixed(2)}px, ${q.y.toFixed(2)}px)`;
        let squash = 1;
        for (const c of clickAt) if (t >= c && t - c < 0.16) squash = Math.min(squash, 1 - 0.2 * Math.sin((Math.PI * (t - c)) / 0.16));
        svg.style.transform = squash === 1 ? "none" : `scale(${squash.toFixed(4)})`;
        rings.forEach((r, i) => {
          const c = clickAt[i], u = ML.out(t, c, c + 0.5), live = t >= c && t < c + 0.5;
          const s = stops.find((x) => x.t === c);
          r.style.opacity = live ? (0.9 * (1 - u)).toFixed(4) : "0";
          r.style.transform = `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px) scale(${(0.3 + 0.7 * u).toFixed(4)})`;
        });
        trail.forEach((d, i) => {
          const back = (i + 1) * 0.035, b = P(Math.max(t0, t - back)), sp = Math.hypot(b.x - q.x, b.y - q.y);
          d.style.transform = `translate(${b.x.toFixed(2)}px, ${b.y.toFixed(2)}px) scale(${(1 - i / 12).toFixed(3)})`;
          d.style.opacity = (ML.clamp(sp / (40 * k)) * 0.5 * (1 - i / 10)).toFixed(3);
        });
      },
    };
  },
});
