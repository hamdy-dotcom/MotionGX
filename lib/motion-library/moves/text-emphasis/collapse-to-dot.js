// Collapse to dot: the word is swallowed into a single dot. An anchor is picked — the reading start of the first
// letter (left in LTR, right in RTL), the centre, or the word's own full stop. Letters, nearest first: x → the anchor,
// scaleX 1 → 0.1, opacity → 0, a horizontal-only blur 0 → 7 px (an SVG blur, x only), 0.32 s power3.in, staggered
// 0.035 s (or whole words at once). A dot (r ≈ 6 px at a 104 px title, the text's own colour) scales 0 → 1 at the
// anchor when the first letter arrives and pulses 1.2 → 1 as the last one does. Then it holds, vanishes, or travels:
// 0.35 s expo.inOut to the stage edge (reading end) or centre, stretched to scaleX 2.5 mid-flight with three trailing
// ghosts at .5 / .3 / .15 — the seed of the next scene. Arabic letters join, so in Arabic the units are whole words.
// Source: prompt-motion stephanlivera-opus-5-5-on-max, twoclipping-opus-5-5-is-the (reference) — our own code.
ML.define({
  id: "text-emphasis.collapse-to-dot",
  category: "text-emphasis",
  name: "Word is swallowed into a dot",
  does: "The word's letters shrink and smear into a single dot (or its own full stop), which stays or shoots off as the seed of the next shape.",
  says: ["transition", "simplicity", "change"],
  energy: 3,
  targets: ["headline", "word"],
  duration: [0.6, 1.5],
  params: {
    anchor: { type: "choice", options: ["left", "centre", "period"], default: "centre" },
    split: { type: "choice", options: ["letters", "word"], default: "letters" },
    then: { type: "choice", options: ["hold", "travel", "vanish"], default: "hold" },
    trail: { type: "bool", default: true },
    stagger: { type: "number", range: [0, 0.06], default: 0.035, unit: "s" },
    to: { type: "choice", options: ["edge", "centre"], default: "edge" },
    delay: { type: "number", range: [0, 1], default: 0.3, unit: "s" },
  },
  pairs: ["text-in.punchline", "transition.flash-cut"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "prompt-motion:stephanlivera-opus-5-5-on-max", license: "reference", note: "our own rebuild; also twoclipping-opus-5-5-is-the" },
  setup(ctx) {
    const { el, p, at, end, rtl, stage } = ctx;
    if (!el) return null;
    const NS = "http://www.w3.org/2000/svg";
    // units: letters (Arabic words stay whole) or words
    let units = (p.split === "word" ? ML.split(el, "words") : ML.split(el, "chars")).filter((u) => u.textContent.trim());
    if (!units.length) return null;
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    const fs = parseFloat(getComputedStyle(el).fontSize) || 104;
    const er = el.getBoundingClientRect(), k = er.width / (el.offsetWidth || 1) || 1;
    const local = (r) => ({ x: (r.left - er.left) / k - el.clientLeft, y: (r.top - er.top) / k - el.clientTop, w: r.width / k, h: r.height / k });
    const baseOf = (u) => { const pr = document.createElement("i"); Object.assign(pr.style, { display: "inline-block", width: "0", height: "0", verticalAlign: "baseline" }); u.append(pr); const y = local(pr.getBoundingClientRect()).y; pr.remove(); return y; };
    const R = Math.max(3, fs * 0.06);
    // the anchor (el px): the dot's centre
    let A, period = null;
    const last = units[units.length - 1];
    if (p.anchor === "period") {
      // the word's own full stop as a separate span (split in letters mode; carved off a word otherwise)
      if (/[.。]$/.test(last.textContent)) {
        if (last.textContent.length > 1) { const s = document.createElement("span"); s.style.display = "inline-block"; s.textContent = last.textContent.slice(-1); last.textContent = last.textContent.slice(0, -1); last.after(s); period = s; }
        else period = last;
        units = units.filter((u) => u !== period);
        const b = local(period.getBoundingClientRect()), base = baseOf(period);
        A = { x: b.x + b.w / 2, y: base - R };
      } else {
        const b = local(last.getBoundingClientRect()), base = baseOf(last);
        A = { x: rtl ? b.x - fs * 0.12 : b.x + b.w + fs * 0.12, y: base - R };
      }
    } else if (p.anchor === "left") {
      const b = local(units[0].getBoundingClientRect()), base = baseOf(units[0]);
      A = { x: rtl ? b.x + b.w : b.x, y: base - fs * 0.3 };
    } else {
      const bs = units.map((u) => local(u.getBoundingClientRect()));
      const x0 = Math.min(...bs.map((b) => b.x)), x1 = Math.max(...bs.map((b) => b.x + b.w));
      const y0 = Math.min(...bs.map((b) => b.y)), y1 = Math.max(...bs.map((b) => b.y + b.h));
      A = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 + fs * 0.05 };
    }
    // each unit: its centre's offset to the anchor; nearest goes first
    const info = units.map((u) => { const b = local(u.getBoundingClientRect()); const c = { x: b.x + b.w / 2, y: b.y + b.h / 2 }; return { u, dx: A.x - c.x, dy: A.y - c.y, d: Math.hypot(A.x - c.x, A.y - c.y) }; });
    const rank = info.map((_, i) => i).sort((a, b) => info[a].d - info[b].d || a - b);
    const D = 0.32, start = at + p.delay;
    const st = p.split === "word" ? Math.min(p.stagger, 0.02) : p.stagger;
    rank.forEach((ui, r) => { info[ui].t = start + r * st; });
    // horizontal-only blur: one SVG filter per unit
    const defs = document.createElementNS(NS, "svg");
    Object.assign(defs.style, { position: "absolute", width: "0", height: "0", overflow: "hidden" });
    const uid = "ml-ctd-" + Math.floor(ML.rnd(units.length, fs) * 1e6);
    info.forEach((it, i) => {
      const f = document.createElementNS(NS, "filter");
      f.setAttribute("id", `${uid}-${i}`); for (const [a, v] of [["x", "-60%"], ["y", "-10%"], ["width", "220%"], ["height", "120%"]]) f.setAttribute(a, v);
      const g = document.createElementNS(NS, "feGaussianBlur"); g.setAttribute("stdDeviation", "0 0"); f.append(g); defs.append(f);
      it.blur = g; it.fid = `${uid}-${i}`; it.u.style.transformOrigin = "50% 50%";
    });
    el.append(defs);
    // the dot (and three ghosts behind it), in the text's own colour
    const mk = () => { const d = document.createElement("i"); Object.assign(d.style, { position: "absolute", left: "0", top: "0", width: 2 * R + "px", height: 2 * R + "px", marginLeft: -R + "px", marginTop: -R + "px", borderRadius: "50%", background: "currentColor", pointerEvents: "none", opacity: "0" }); el.append(d); return d; };
    const ghosts = p.then === "travel" && p.trail ? [0.5, 0.3, 0.15].map((o) => ({ d: mk(), o })) : [];
    const dot = mk();
    const firstIn = start + D, lastIn = start + (units.length - 1) * st + D;
    ctx.sfx(firstIn, "pop.soft", 0.3);
    // travel: to the reading-end stage edge (just past it) or the stage centre (el px)
    const sb = local(stage.getBoundingClientRect());
    const G = p.to === "centre" ? { x: sb.x + sb.w / 2, y: sb.y + sb.h / 2 } : { x: rtl ? sb.x - R * 3 : sb.x + sb.w + R * 3, y: A.y };
    const tT = Math.max(lastIn + 0.25, Math.min(lastIn + 0.45, end - 0.4)), dT = 0.35;
    if (p.then === "travel") ctx.sfx(tT, "whoosh.soft", 0.25);
    const p3in = (x) => x * x * x;
    const expoIO = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2);
    const place = (d, x, y, sx, sy, o) => { d.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`; d.style.scale = `${sx.toFixed(4)} ${sy.toFixed(4)}`; d.style.opacity = o.toFixed(4); };
    return {
      draw(t) {
        info.forEach((it) => {
          const e = p3in(ML.lin(t, it.t, it.t + D));
          it.u.style.translate = e > 0 ? `${(it.dx * e).toFixed(2)}px ${(it.dy * e).toFixed(2)}px` : "none";
          it.u.style.scale = e > 0 ? `${(1 - 0.9 * e).toFixed(4)} ${(1 - 0.35 * e).toFixed(4)}` : "none";
          it.u.style.opacity = (1 - e).toFixed(4);
          it.blur.setAttribute("stdDeviation", `${(7 * Math.sin(Math.PI * Math.min(1, e * 1.2))).toFixed(2)} 0`);
          it.u.style.filter = e > 0 && e < 1 ? `url(#${it.fid})` : "none";
        });
        if (period) period.style.opacity = t >= firstIn ? "0" : "1";
        // the dot: appears with the first arrival, pulses as the last lands
        let s = 0;
        if (t >= firstIn) s = ML.out(t, firstIn, firstIn + 0.12) * (1 + 0.2 * Math.exp(-Math.max(0, t - lastIn) / 0.09) * (t >= lastIn - 0.04 ? 1 : 0));
        let x = A.x, y = A.y, sx = s, sy = s, o = s > 0 ? 1 : 0;
        if (p.then === "vanish") { const v = ML.ease(t, lastIn + 0.3, lastIn + 0.5); sx *= 1 - v; sy *= 1 - v; }
        if (p.then === "travel") {
          const u = expoIO(ML.lin(t, tT, tT + dT)), str = Math.sin(Math.PI * u);
          x = A.x + (G.x - A.x) * u; y = A.y + (G.y - A.y) * u; sx = s * (1 + 1.5 * str); sy = s * (1 - 0.25 * str);
          ghosts.forEach((g, i) => {
            const ug = expoIO(ML.lin(t, tT - 0.035 * (i + 1), tT + dT - 0.035 * (i + 1)));
            const vis = t >= tT && u < 1 ? g.o : 0;
            place(g.d, A.x + (G.x - A.x) * ug, A.y + (G.y - A.y) * ug, s * (1 + 1.2 * Math.sin(Math.PI * ug)), s, vis);
          });
          if (p.to === "edge" && u >= 1) o = 0;
        }
        place(dot, x, y, Math.max(0, sx), Math.max(0, sy), o);
      },
    };
  },
});
