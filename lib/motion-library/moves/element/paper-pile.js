// Pile of papers settles around a hero page: a large hero document (A4 ratio, panel white, small radius, a red tag,
// grey line placeholders, a deep shadow — or the target card / picture itself) enters from the top-trailing corner
// (y −120, rotate 8° → 4°, 0.6 s power3.out). Then 10–25 smaller sheets (0.4–0.7 of the hero, seeded −25…25° turns,
// light shadow) slide in from the frame's edges, 0.03 s apart on power2.out in 0.5 s, and cluster around its lower
// trailing corner. The whole pile drifts up 10 px over the hold. Exit: scatter — every sheet flies outward on a seeded
// direction and spin (0.5 s power2.in) while the stage darkens; fall — they drop out of the bottom; none — it holds.
// With a target the target is the hero unless hero: "document" asks for the built page. The stagger tightens on a short
// scene so the exit always finishes inside the run.
// Mirrored in Arabic (enters from the top-left, clusters bottom-left).
// Source: prompt-motion "sudo-kiran-built-a-product-demo" (reference only — rebuilt as our own code).
ML.define({
  id: "element.paper-pile",
  category: "element",
  name: "Pile of papers settles around a hero page",
  does: "Many paper sheets slide in and settle at random angles around a large hero document that floats with a slight tilt, then scatter away.",
  says: ["problem", "scale", "story"],
  energy: 3,
  targets: ["card", "image", "stage"],
  duration: [2, 5],
  params: {
    density: { type: "number", range: [10, 25], default: 18 },
    exit: { type: "choice", options: ["scatter", "fall", "none"], default: "scatter" },
    hero: { type: "choice", options: ["auto", "document", "target"], default: "auto" },
    darken: { type: "number", range: [0, 0.7], default: 0.45 },
  },
  pairs: ["element.pile-exit", "element.document-swarm", "text-in.punchline"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "card",
  source: { from: "prompt-motion:sudo-kiran-built-a-product-demo", license: "reference", note: "hero page + settling paper pile + scatter exit rebuilt as our own code" },
  setup(ctx) {
    const { el, p, at, end, f, rtl, stage } = ctx;
    const doc = document;
    const host = ctx.scene || stage;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const k = Math.min(f.W, f.H) / 1080;
    const own = el && el !== stage ? el : null;
    const R = f.pic;
    const lead = rtl ? -1 : 1; // the trailing side is +x in LTR
    const layer = mk("div", `position:absolute;inset:0;pointer-events:none;z-index:6;visibility:hidden;`, host);
    // the device colour: a dark in every look (a look's ink is light on a dark look, and would brighten the stage)
    const shade = mk("div", "position:absolute;inset:0;background:var(--x-device);opacity:0;", layer);
    const pileL = mk("div", "position:absolute;inset:0;", layer);

    // a paper sheet: panel white, small radius, a header tag, grey line placeholders
    const sheet = (w, h, i, heroish) => {
      const s = mk("div", `position:absolute;left:0;top:0;width:${w}px;height:${h}px;box-sizing:border-box;padding:${h * 0.08}px ${w * 0.1}px;display:flex;flex-direction:column;gap:${h * 0.035}px;align-items:flex-start;direction:${rtl ? "rtl" : "ltr"};background:var(--x-panel);border-radius:calc(min(var(--x-radius), ${Math.max(2, (heroish ? 6 : 4) * k * 1.4)}px));box-shadow:${heroish ? "var(--x-shadow)" : `0 ${4 * k}px ${12 * k}px color-mix(in srgb, var(--x-device) 14%, transparent)`};border:var(--x-edge) solid var(--x-edge-color);`, pileL);
      mk("div", `width:${w * (heroish ? 0.28 : 0.22)}px;height:${h * 0.045}px;border-radius:${h * 0.02}px;background:${heroish || i % 4 === 0 ? "var(--x-bad)" : "var(--x-accent)"};margin-bottom:${h * 0.03}px;`, s);
      const lines = heroish ? 9 : 6;
      for (let j = 0; j < lines; j++) mk("div", `height:${Math.max(2, h * 0.022)}px;border-radius:${h * 0.01}px;background:var(--x-line);width:${40 + ML.rnd(i * 13 + j, 5) * 55}%;`, s);
      return s;
    };

    // the hero
    let hero, hw, hh, hx, hy;
    const useTarget = own && p.hero !== "document";
    if (useTarget) {
      hero = own; const b = ctx.box(own); hw = b.w; hh = b.h; hx = b.x; hy = b.y;
    } else {
      hh = Math.min(R.h * 0.78, (R.w * 0.55) * 1.414); hw = hh / 1.414;
      hx = R.x + R.w / 2 - hw / 2 - lead * R.w * 0.06; hy = R.y + R.h / 2 - hh / 2;
      hero = sheet(hw, hh, 99, true);
      hero.style.left = hx + "px"; hero.style.top = hy + "px"; hero.style.zIndex = "1";
    }
    // the cluster: around the hero's lower trailing corner
    const n = Math.round(ML.clamp(p.density, 10, 25));
    const room = end - at - (p.exit === "none" ? 0.35 : 0.65) - 0.45 - 0.5 - 0.1; // what the sheets have once hero, landing and exit are counted
    const stag = ML.clamp(room / n, 0.008, 0.03);
    const sw = Math.min(hw, hh / 1.414) * 1;
    const cornerX = hx + (rtl ? 0 : hw), cornerY = hy + hh;
    const sheets = Array.from({ length: n }, (_, i) => {
      const sc = 0.4 + ML.rnd(i, 1) * 0.3, w = sw * sc, h = w * 1.414;
      const s = sheet(w, h, i, false);
      s.style.zIndex = String(i % 3 === 0 ? 0 : 2 + i); // a few tuck under the hero
      // rest: a seeded spot around the corner, kept inside the frame
      const ang = ML.rnd(i, 2) * Math.PI * 2;
      const dist = (0.15 + ML.rnd(i, 3) * 0.55) * Math.min(R.w, R.h) * 0.42;
      let x = cornerX - lead * w * 0.4 + Math.cos(ang) * dist - w / 2, y = cornerY - h * 0.7 + Math.sin(ang) * dist * 0.6 - h / 2;
      x = ML.clamp(x, f.m * 0.4, f.W - f.m * 0.4 - w); y = ML.clamp(y, R.y, Math.max(R.y, f.safe.y + f.safe.h - h));
      // it comes in from the nearest frame edge
      const edges = [[-1, 0], [1, 0], [0, 1], [lead, 1]];
      const [ex, ey] = edges[Math.floor(ML.rnd(i, 4) * edges.length)];
      const fx = ex ? (ex < 0 ? -x - w * 1.3 : f.W - x + w * 0.3) : (ML.rnd(i, 6) - 0.5) * w;
      const fy = ey ? f.H - y + h * 0.3 : (ML.rnd(i, 7) - 0.5) * h;
      const rot = (ML.rnd(i, 5) - 0.5) * 50;
      const out = ML.rnd(i, 8) * Math.PI * 2;
      return { s, w, h, x, y, fx, fy, rot, ox: Math.cos(out) * f.W * (0.6 + ML.rnd(i, 9) * 0.5), oy: Math.sin(out) * f.H * 0.5, or: (ML.rnd(i, 10) - 0.5) * 220, t0: at + 0.45 + i * stag };
    });
    sheets.forEach((q) => { q.s.style.left = q.x + "px"; q.s.style.top = q.y + "px"; });
    const exitA = p.exit === "none" ? Infinity : Math.max(at + 0.45 + n * stag + 0.5, end - 0.65);
    const fadeA = p.exit === "none" ? Math.max(at + 1.2, end - 0.35) : Infinity;
    ctx.sfx(at, "card", 0.35);
    ctx.sfx(at + 0.45, "card.fan", 0.35);
    if (p.exit !== "none") ctx.sfx(exitA, "whoosh.heavy", 0.4);
    const p3o = (x) => 1 - Math.pow(1 - x, 3), p2o = (x) => 1 - Math.pow(1 - x, 2), p2i = (x) => x * x;
    return {
      draw(t) {
        const vis = t >= at - 1e-6;
        layer.style.visibility = vis ? "visible" : "hidden";
        const fade = 1 - ML.ease(t, fadeA, fadeA + 0.3);
        pileL.style.opacity = fade.toFixed(4);
        // the hold: the whole pile drifts up 10 px
        const drift = -10 * k * 1.4 * ML.ease(t, at + 0.6, Math.min(exitA, end));
        pileL.style.translate = `0 ${drift.toFixed(2)}px`;
        const ex = ML.lin(t, exitA, exitA + 0.5), exE = p2i(ex);
        shade.style.opacity = (ML.clamp(p.darken, 0, 0.7) * ML.ease(t, exitA, exitA + 0.5) * fade).toFixed(4);
        // hero: from the top-trailing corner, y −120, rot 8° → 4°
        const u = p3o(ML.lin(t, at, at + 0.6));
        const hdx = lead * 80 * k * (1 - u), hdy = -120 * k * 1.4 * (1 - u);
        let hr = lead * (8 - 4 * u);
        let hox = 0, hoy = 0;
        if (p.exit === "scatter") { hoy = -f.H * 0.25 * exE; hr += lead * 14 * exE; }
        else if (p.exit === "fall") { hoy = f.H * 0.9 * exE; hr += lead * 10 * exE; }
        const ho = Math.min(1, ML.lin(t, at, at + 0.2)) * (1 - ML.clamp(ex * 1.5));
        if (hero === own) {
          hero.style.translate = `${(hdx + hox).toFixed(2)}px ${(hdy + hoy + drift).toFixed(2)}px`;
          hero.style.rotate = `${hr.toFixed(3)}deg`;
          hero.style.opacity = (vis ? ho * fade : 0).toFixed(4);
        } else {
          hero.style.translate = `${(hdx + hox).toFixed(2)}px ${(hdy + hoy).toFixed(2)}px`;
          hero.style.rotate = `${hr.toFixed(3)}deg`;
          hero.style.opacity = ho.toFixed(4);
        }
        for (const q of sheets) {
          const v = p2o(ML.lin(t, q.t0, q.t0 + 0.5));
          let x = q.fx * (1 - v), y = q.fy * (1 - v), r = q.rot * (0.4 + 0.6 * v);
          if (p.exit === "scatter") { x += q.ox * exE; y += q.oy * exE; r += q.or * exE; }
          else if (p.exit === "fall") { y += f.H * (0.8 + ML.rnd(q.w, 3) * 0.3) * exE; r += q.or * 0.3 * exE; }
          q.s.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
          q.s.style.rotate = `${r.toFixed(3)}deg`;
          q.s.style.opacity = (ML.lin(t, q.t0, q.t0 + 0.12) * (1 - ML.clamp(ex * 1.6))).toFixed(4);
        }
      },
    };
  },
});
