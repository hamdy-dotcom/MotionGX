// Bite taken out with a crumb burst: an object (the target itself, or a drawn cookie / apple) pops in 0 → 1.1 → 1 over
// 0.4 s back.out; then a bite appears instantly at its top corner (the reading end: top-right, top-left in Arabic) as a
// scalloped cut — a mask of three overlapping circles — with a 0.08 s squash (scale 0.95 → 1). From the bite, 4–12
// crumbs (dots and little rects in the object's two colours) fly outward and up on seeded velocities under gravity and
// fade over 0.5 s. Up to three bites, 0.35 s apart, each with its own snap and crumbs.
// Source: prompt-motion "thilina-a-i-also-tried-it" (reference only — rebuilt as our own code).
ML.define({
  id: "element.bite-crumb-burst",
  category: "element",
  name: "Bite taken out with crumb burst",
  does: "An object icon pops in, then a bite chunk vanishes from its edge with crumbs flying off.",
  says: ["playful", "brand"],
  energy: 3,
  targets: ["logo", "shape"],
  duration: [0.8, 1.6],
  params: {
    object: { type: "choice", options: ["cookie", "apple", "any"], default: "any" },
    crumbs: { type: "number", range: [4, 12], default: 8 },
    bites: { type: "number", range: [1, 3], default: 1 },
  },
  pairs: ["element.pop-in", "text-in.punchline"],
  avoid: ["luxury", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "snap",
  source: { from: "prompt-motion:thilina-a-i-also-tried-it", license: "reference", note: "rebuilt as our own code: CSS mask of circles for the bite, closed-form ballistic crumbs from t" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent) => { const e = doc.createElement(tag); e.style.cssText = css; parent.append(e); return e; };
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); parent.append(e); return e; };
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const layer = mk("div", "position:absolute;inset:0;pointer-events:none;z-index:7;", host);

    // the object: the target as it is ("any"), or a drawn cookie / apple in the picture region
    let obj, B, cols;
    if (p.object === "any" && own) {
      obj = own;
      B = ctx.box(own);
      cols = ["var(--x-accent)", "var(--x-ink)"];
    } else {
      const S = Math.min(f.pic.w, f.pic.h) * 0.46;
      B = { x: f.pic.x + (f.pic.w - S) / 2, y: f.pic.y + (f.pic.h - S) / 2, w: S, h: S };
      obj = sv("svg", { viewBox: "0 0 100 100", width: S, height: S }, layer);
      obj.style.cssText = `position:absolute;left:${B.x}px;top:${B.y}px;overflow:visible;`;
      if (p.object === "apple") {
        const body = "color-mix(in srgb, var(--x-bad) 88%, var(--x-ink))";
        sv("path", { d: "M50 28 C38 18 14 20 12 46 C10 72 30 96 50 90 C70 96 90 72 88 46 C86 20 62 18 50 28 Z", style: `fill:${body}` }, obj);
        sv("ellipse", { cx: 32, cy: 44, rx: 7, ry: 12, style: "fill:var(--x-panel);opacity:.28" }, obj);
        sv("path", { d: "M50 28 C50 20 52 12 56 6", style: "fill:none;stroke:var(--x-ink);stroke-width:3.5;stroke-linecap:round" }, obj);
        sv("path", { d: "M54 16 C62 4 76 6 80 10 C72 20 62 20 54 16 Z", style: "fill:var(--x-good)" }, obj);
        cols = [body, "color-mix(in srgb, var(--x-panel-2) 70%, var(--x-good))"];
      } else {
        // cookie (also the drawn object for "any" when there is no target): a flat disc with chips
        const dough = "color-mix(in srgb, color-mix(in srgb, var(--x-bad) 34%, var(--x-panel-2)) 78%, var(--x-ink))";
        const chip = "color-mix(in srgb, var(--x-ink) 82%, var(--x-bad))";
        sv("circle", { cx: 50, cy: 50, r: 46, style: `fill:${dough}` }, obj);
        sv("circle", { cx: 50, cy: 50, r: 46, style: "fill:none;stroke:var(--x-ink);stroke-opacity:.12;stroke-width:2" }, obj);
        [[30, 34, 6], [58, 26, 5], [70, 52, 6.5], [42, 60, 5.5], [26, 66, 4.5], [60, 74, 5], [48, 42, 4]].forEach(([x, y, r]) => sv("circle", { cx: x, cy: y, r, style: `fill:${chip}` }, obj));
        cols = [dough, chip];
      }
    }
    obj.style.transformOrigin = "50% 50%";

    // bites: three overlapping circles each, at the top reading-end corner, walking down the edge for the next ones
    const n = Math.round(ML.clamp(p.bites, 1, 3));
    const m = Math.min(B.w, B.h), R = m * (B.w > B.h * 1.6 ? 0.32 : 0.2);
    const endX = (u) => (rtl ? u : 1 - u); // share of the width from the reading end
    const spots = [[0.1, 0.12], [0.02, 0.48], [0.38, 0.0]].slice(0, n).map(([u, v]) => ({ x: B.w * endX(u), y: B.h * v }));
    const bites = spots.map((s, i) => ({
      t: at + 0.5 + i * 0.35,
      c: [[0, 0, 1], [-0.9, 0.55, 0.78], [0.55, 0.9, 0.78]].map(([dx, dy, r]) => ({ x: s.x + dx * R * (rtl ? -1 : 1), y: s.y + dy * R, r: r * R })),
      cx: s.x, cy: s.y,
    }));
    bites.forEach((b) => ctx.sfx(b.t, "snap", 0.45));
    const maskAt = (t) => {
      const on = bites.filter((b) => t >= b.t).flatMap((b) => b.c);
      if (!on.length) return "none";
      return on.map((c) => `radial-gradient(circle ${c.r.toFixed(2)}px at ${c.x.toFixed(2)}px ${c.y.toFixed(2)}px, transparent 98%, #000 100%)`).join(", ");
    };

    // crumbs: seeded launch speed / angle around the outward direction (up and away from the object), gravity down
    const nc = Math.round(ML.clamp(p.crumbs, 4, 12));
    const g = 2200 * k;
    const crumbs = bites.flatMap((b, bi) => Array.from({ length: nc }, (_, i) => {
      const seed = bi * 31 + i;
      const ang = (-60 + (ML.rnd(seed, 3) - 0.5) * 110) * (Math.PI / 180); // around up-and-out
      const sp = (380 + ML.rnd(seed, 5) * 520) * k;
      const sz = (6 + ML.rnd(seed, 7) * 10) * k * Math.max(0.6, m / (180 * k));
      const rect = ML.rnd(seed, 9) < 0.45;
      const e = mk("div", `position:absolute;left:0;top:0;width:${sz.toFixed(1)}px;height:${(rect ? sz * 0.7 : sz).toFixed(1)}px;border-radius:${rect ? "22%" : "50%"};background:${cols[i % 2]};opacity:0;`, layer);
      return { e, t0: b.t, x0: B.x + b.cx - sz / 2, y0: B.y + b.cy - sz / 2, vx: Math.cos(ang) * sp * (rtl ? -1 : 1), vy: Math.sin(ang) * sp, spin: (ML.rnd(seed, 11) - 0.5) * 900 };
    }));
    const lastBite = bites[bites.length - 1].t;
    const goA = Math.max(lastBite + 0.6, end - 0.25);

    return {
      draw(t) {
        const leave = ML.clamp((t - goA) / 0.22);
        if (t < at - 1e-6) { obj.style.opacity = "0"; obj.style.scale = "0"; }
        else {
          // pop 0 → 1.1 → 1 (back.out), then a short squash after each bite
          let s = Math.max(0, ML.back(t, at, at + 0.4, 1.7));
          for (const b of bites) if (t >= b.t) s *= 1 - 0.05 * (1 - ML.out(t, b.t, b.t + 0.08));
          obj.style.opacity = (ML.lin(t, at, at + 0.08) * (1 - leave)).toFixed(4);
          obj.style.scale = Math.abs(s - 1) < 1e-4 ? "none" : s.toFixed(4);
        }
        const mask = maskAt(t);
        obj.style.maskImage = mask; obj.style.webkitMaskImage = mask;
        obj.style.maskComposite = "intersect"; obj.style.webkitMaskComposite = "source-in";
        obj.style.maskRepeat = "no-repeat"; obj.style.webkitMaskRepeat = "no-repeat";
        for (const c of crumbs) {
          const d = t - c.t0;
          if (d < 0 || d > 0.6) { c.e.style.opacity = "0"; continue; }
          const x = c.x0 + c.vx * d, y = c.y0 + c.vy * d + 0.5 * g * d * d;
          c.e.style.opacity = (1 - ML.lin(d, 0.1, 0.5)).toFixed(4);
          c.e.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${(c.spin * d).toFixed(1)}deg)`;
        }
      },
    };
  },
});
