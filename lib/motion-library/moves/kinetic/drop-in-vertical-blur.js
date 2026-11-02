// Heavy drop with vertical smear: a giant heavy word plunges in from above (y −2.7 em → 0 in 0.3 s power4.in, so it
// is fastest as it hits), smeared by a vertical-only motion blur (an SVG feGaussianBlur with stdDeviation "0 s", s
// following the speed), then slams onto its baseline with a 2-frame squash (scaleY 0.92) and back. Letters stagger
// 0–0.05 s so it lands like a wave (Arabic drops whole words with no stagger: its letters join). Faint fixed
// horizontal guide lines across the frame mark its cap line and baseline. "side" slides in from the reading start
// with a horizontal smear instead.
// Source: prompt-motion:web3wesley-this-took-opus-5-5 (reference only — our own rebuild).
ML.define({
  id: "kinetic.drop-in-vertical-blur",
  category: "kinetic",
  name: "Heavy drop with vertical smear",
  does: "A giant word plunges in from above, smeared by motion blur, and slams onto its baseline.",
  says: ["energy", "arrival"],
  energy: 5,
  targets: ["word", "headline"],
  duration: [0.6, 2],
  params: {
    from: { type: "choice", options: ["top", "bottom", "side"], default: "top" },
    stagger: { type: "number", range: [0, 0.05], default: 0.03, unit: "s" },
    squash: { type: "bool", default: true },
    guides: { type: "bool", default: true },
  },
  pairs: ["camera.impact-shake", "text-in.slam"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "prompt-motion:web3wesley-this-took-opus-5-5", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, stage, rtl } = ctx;
    if (!el) return null;
    const host = ctx.scene || stage;
    // giant heavy caps: as big as the stage allows, then fitted to the target's own width
    const room = (el.parentElement ? el.parentElement.clientWidth : ctx.f.W * 0.9) * 0.96;
    Object.assign(el.style, { fontFamily: "var(--x-head-font)", fontWeight: "max(var(--x-head-weight), 800)", textTransform: "uppercase", whiteSpace: "nowrap", lineHeight: "0.9", letterSpacing: ML.ARABIC.test(el.textContent || "") ? "0" : "var(--x-head-track)", color: "var(--x-ink)" });
    el.style.fontSize = Math.round(Math.min(ctx.f.W * 0.24, ctx.f.H * 0.2)) + "px";
    ML.fit(el, room);
    const units = ML.split(el, "chars");
    if (!units.length) return null;
    const arabic = ML.ARABIC.test(el.textContent || "");
    const stag = arabic ? 0 : p.stagger;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    const side = p.from === "side";
    const sign = p.from === "bottom" ? 1 : side ? (rtl ? 1 : -1) : -1;
    const dist = side ? ctx.f.W * 0.6 : Math.max(fs * 2.7, ctx.f.H * 0.3);
    const DROP = 0.3, SQ = 2 / 30;
    // a fixed ladder of directional blur filters (stdDeviation 0–32 in steps of 2); a unit picks its rung each frame
    // from its speed — switching the filter reference repaints reliably, rewriting a filter's attributes may not
    const svgNS = "http://www.w3.org/2000/svg";
    const defs = document.createElementNS(svgNS, "svg");
    Object.assign(defs.style, { position: "absolute", width: "0", height: "0", overflow: "hidden" });
    defs.setAttribute("aria-hidden", "true");
    const uid = "mlvb" + Math.round(ML.rnd(at * 13.7 + units.length, 3) * 1e8);
    const RUNGS = 17;
    for (let r = 1; r < RUNGS; r++) {
      const fl = document.createElementNS(svgNS, "filter");
      fl.id = `${uid}-${r}`;
      const reg = side ? { x: "-200%", y: "-20%", width: "500%", height: "140%" } : { x: "-20%", y: "-200%", width: "140%", height: "500%" };
      for (const key of Object.keys(reg)) fl.setAttribute(key, reg[key]);
      const g = document.createElementNS(svgNS, "feGaussianBlur");
      g.setAttribute("stdDeviation", side ? `${r * 2} 0` : `0 ${r * 2}`);
      fl.append(g);
      defs.append(fl);
    }
    const items = units.map((u, i) => {
      u.style.transformOrigin = "50% 100%";
      return { u, t0: at + i * stag };
    });
    host.append(defs);
    // guide lines at the cap line and the baseline, across the whole frame
    const guides = [];
    if (p.guides) {
      const b = ctx.box(el);
      for (const y of [b.y + b.h * 0.12, b.y + b.h * 0.86]) {
        const g = document.createElement("div");
        Object.assign(g.style, { position: "absolute", left: "0", width: "100%", top: y.toFixed(1) + "px", height: Math.max(1, Math.round(ctx.f.W / 1080)) + "px", background: "var(--x-line)", pointerEvents: "none" });
        host.insertBefore(g, host.firstChild);
        guides.push(g);
      }
    }
    ctx.sfx(items[0].t0 + DROP, "hit", 0.5);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        el.style.opacity = (1 - leave).toFixed(4);
        const ga = ML.lin(t, at, at + 0.2) * (1 - leave);
        for (const g of guides) g.style.opacity = ga.toFixed(4);
        for (const it of items) {
          const u = ML.lin(t, it.t0, it.t0 + DROP), e = Math.pow(u, 4); // power4.in
          const off = sign * dist * (1 - e);
          const falling = t >= it.t0 && u < 1;
          it.u.style.opacity = t >= it.t0 ? "1" : "0";
          it.u.style.translate = side ? `${off.toFixed(2)}px 0` : `0 ${off.toFixed(2)}px`;
          const s = falling ? Math.min(30, 30 * 4 * Math.pow(u, 3) * (fs / 260)) + 2 : 0; // ∝ speed
          const rung = Math.min(RUNGS - 1, Math.round(s / 2));
          it.u.style.filter = rung > 0 ? `url(#${uid}-${rung})` : "none";
          const sq = p.squash && t >= it.t0 + DROP && t < it.t0 + DROP + SQ;
          it.u.style.scale = sq ? (side ? "0.92 1" : "1 0.92") : "none";
        }
      },
    };
  },
});
