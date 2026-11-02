// Stack of tilted squares spins in: 2–5 paper squares (180 px of a 1080 frame by default) at different rotations
// (−15°, 5°, 20°, then −6°, 12°) and small offsets, like scattered paper. Each enters scale 0 → 1 and rotate final + 90° →
// final over 0.5 s on back.out, 0.05 s apart (2D only, so the overshoot never softens anything); a few short confetti
// dashes pop inside the top square 0.1 s after it lands. The colours are look roles listed in `colours`
// ("panel/accent-2/accent" — panel, panel-2, accent, accent-2, ink, good, bad, dim, ground; the source's white / yellow /
// orange read as panel / accent-2 / accent). The spin turns the other way in Arabic. A target card sits on top.
// Source: prompt-motion 3xtihor-made-with-claude-opus (reference only: our own rebuild).
ML.define({
  id: "element.stacked-paper-cards-spin",
  category: "element",
  name: "Stack of tilted squares spins in",
  does: "A stack of 3-4 coloured squares at different rotations spins in and settles, like scattered paper.",
  says: ["playful", "celebration"],
  energy: 3,
  targets: ["shape", "card"],
  duration: [0.5, 1.5],
  params: {
    count: { type: "number", range: [2, 5], default: 3 },
    colours: { type: "text", default: "panel/accent-2/accent" },
    size: { type: "number", range: [0.12, 0.5], default: 0.3 },
    confetti: { type: "bool", default: true },
    stagger: { type: "number", range: [0.03, 0.12], default: 0.05, unit: "s" },
  },
  pairs: ["text-in.punchline", "element.pop-in"],
  avoid: ["luxury", "problem", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "prompt-motion:3xtihor-made-with-claude-opus", license: "reference", note: "the tilted paper-square stack spin rebuilt as our own DOM, every frame from t" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const ob = own ? ctx.box(own) : null;
    const n = Math.round(ML.clamp(p.count, 2, 5));
    const S = ob ? Math.max(ob.w, ob.h) * 0.9 : Math.min(f.pic.w, f.pic.h, Math.min(f.W, f.H) * p.size);
    const cx = ob ? ob.x + ob.w / 2 : f.pic.x + f.pic.w / 2, cy = ob ? ob.y + ob.h / 2 : f.pic.y + f.pic.h / 2;
    const ROLES = ["panel", "panel-2", "accent", "accent-2", "ink", "good", "bad", "dim", "ground"];
    const ALIAS = { white: "panel", cream: "panel-2", yellow: "accent-2", orange: "accent", red: "bad", green: "good", black: "ink", grey: "dim", gray: "dim" };
    const roles = String(p.colours || "").split(/[\/,\s]+/).filter(Boolean).map((x) => (ROLES.includes(x) ? x : ALIAS[x.toLowerCase()] || "accent"));
    if (!roles.length) roles.push("panel", "accent-2", "accent");
    const ROT = [-15, 5, 20, -6, 12], sgn = rtl ? -1 : 1;
    const layer = mk("div", `position:absolute;left:${cx}px;top:${cy}px;width:0;height:0;pointer-events:none;z-index:6;`, host);
    const cards = Array.from({ length: n }, (_, i) => {
      const role = roles[i % roles.length];
      const dx = (ML.rnd(i, 1) - 0.5) * S * 0.16, dy = (ML.rnd(i, 2) - 0.5) * S * 0.12;
      const c = mk("div", `position:absolute;left:${(-S / 2 + dx).toFixed(1)}px;top:${(-S / 2 + dy).toFixed(1)}px;width:${S}px;height:${S}px;background:var(--x-${role});border-radius:calc(var(--x-radius) * 0.22);box-shadow:var(--x-shadow);${role === "panel" || role === "ground" || role === "panel-2" ? "border:var(--x-edge) solid var(--x-edge-color);" : ""}`, layer);
      return { c, rot: ROT[i % ROT.length] * sgn, role };
    });
    // confetti dashes inside the top square, in the ink of the square beneath for contrast
    const top = cards[n - 1];
    const dashes = p.confetti ? Array.from({ length: 6 }, (_, j) => {
      const d = mk("div", `position:absolute;left:${(18 + ML.rnd(j, 3) * 64).toFixed(1)}%;top:${(18 + ML.rnd(j, 4) * 64).toFixed(1)}%;width:${S * 0.11}px;height:${S * 0.028}px;border-radius:999px;background:${top.role === "ink" ? "var(--x-panel)" : j % 2 ? "var(--x-ink)" : top.role === "accent" ? "var(--x-panel)" : "var(--x-accent)"};transform:rotate(${(ML.rnd(j, 5) * 180).toFixed(0)}deg);`, top.c);
      return d;
    }) : [];

    const times = cards.map((_, i) => at + i * p.stagger);
    const lastIn = times[n - 1] + 0.5;
    ctx.sfx(at, "pop.soft", 0.35);
    ctx.sfx(lastIn - 0.15, "pop.soft", 0.25);
    const leave = Math.max(lastIn + 0.4, end - 0.25);

    return {
      draw(t) {
        layer.style.visibility = t < at - 1e-6 ? "hidden" : "visible";
        const q = ML.ease(t, leave, leave + 0.22);
        layer.style.opacity = (1 - q).toFixed(4);
        cards.forEach((C, i) => {
          const u = ML.back(t, times[i], times[i] + 0.5, 1.4);
          const sc = Math.max(0, u);
          C.c.style.transform = `rotate(${(C.rot + (1 - u) * 90 * sgn).toFixed(2)}deg) scale(${sc.toFixed(4)})`;
          C.c.style.opacity = t < times[i] ? "0" : "1";
        });
        dashes.forEach((d, j) => {
          const s = ML.back(t, lastIn - 0.4 + 0.1 + j * 0.03, lastIn - 0.4 + 0.4 + j * 0.03, 2);
          d.style.scale = Math.max(0, s).toFixed(4);
        });
      },
    };
  },
});
