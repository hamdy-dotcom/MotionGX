// Easing race: rows of named easings (or options, or speeds) each send a racer along its own lane from A to B at the
// same moment, so the eye sees how each one arrives. A serif italic header ("Six ways to get from A to B."); 3–8 rows:
// mono index, mono label, a small curve glyph of the ease drawn on in 0.3 s, a hairline lane with A / B marks, and a
// racer (a dot, alternating ink / accent / bad, or a bar growing from A). Rows enter staggered (fade + rise); then all
// racers leave A together and travel to B over the run, each with its own ease (none, power2.inOut, expo.out,
// back.out(1.7), elastic.out(1, 0.4), bounce.out, power4.in, sine.inOut): x(t) = lane × ease_i(t / T). "options" takes
// its labels from the target list's items; "speeds" races the same ease at 1×…5× (faster rows arrive sooner). Lanes run
// right to left in Arabic, or anywhere when `direction` is rtl. Rows and type fit the region (larger on a tall frame).
// Source: prompt-motion "stephanlivera-opus-5-5-on-max" + "roundtablespace-opus-5-5-on-max" (reference only: rebuilt).
ML.define({
  id: "data.easing-race",
  category: "data",
  name: "Easing race rows",
  does: "Rows of named easings (or options) each send a dot along its own lane from A to B at the same time, so you see how each one arrives.",
  says: ["choice", "precision", "speed", "list"],
  energy: 3,
  targets: ["list", "chart"],
  duration: [1.8, 4],
  params: {
    rows: { type: "number", range: [3, 8], default: 6 },
    duration: { type: "number", range: [1, 2], default: 1.4, unit: "s" },
    direction: { type: "choice", options: ["ltr", "rtl"], default: "ltr" },
    racer: { type: "choice", options: ["dots", "bars"], default: "dots" },
    compare: { type: "choice", options: ["easings", "options", "speeds"], default: "easings" },
    row_stagger: { type: "number", range: [0.03, 0.1], default: 0.06, unit: "s" },
    title: { type: "text", default: "" },
  },
  pairs: ["data.ball-on-easing-graph", "data.bezier-curve-plot"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:stephanlivera-opus-5-5-on-max", license: "reference", note: "our own rebuild (with roundtablespace-opus-5-5-on-max): closed-form eases per lane" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const u = Math.min(f.W, f.H) / 1080;

    // the eases (GSAP's, closed form)
    const EASES = [
      ["linear", (x) => x],
      ["ease-in-out", (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2)],
      ["expo-out", (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x))],
      ["back-out", (x) => { const c = 1.7, y = x - 1; return 1 + (c + 1) * y * y * y + c * y * y; }],
      ["elastic", (x) => { if (x <= 0) return 0; if (x >= 1) return 1; const per = 0.4, s = per / 4; return Math.pow(2, -10 * x) * Math.sin(((x - s) * 2 * Math.PI) / per) + 1; }],
      ["bounce", (x) => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; }],
      ["power4-in", (x) => x * x * x * x],
      ["sine-in-out", (x) => -(Math.cos(Math.PI * x) - 1) / 2],
    ];
    const SPEEDS = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5];
    const items = el ? [...el.children].map((c) => (c.textContent || "").trim()).filter(Boolean) : [];
    let n = Math.round(ML.clamp(p.rows, 3, 8));
    if (p.compare === "options" && items.length >= 2) n = Math.min(8, Math.max(items.length, 3));
    const labels = Array.from({ length: n }, (_, i) => {
      if (p.compare === "speeds") return `${SPEEDS[i]}×`;
      if (p.compare === "options") return items[i] || (rtl ? `الخيار ${"أبجدهوزح"[i]}` : `Option ${"ABCDEFGH"[i]}`);
      return EASES[i][0];
    });
    const WORDS_EN = ["Three", "Four", "Five", "Six", "Seven", "Eight"], WORDS_AR = ["ثلاث", "أربع", "خمس", "ست", "سبع", "ثماني"];
    const title = p.title || (p.compare === "options" ? (rtl ? "مين يوصل الأول؟" : "Which one gets there first?") : p.compare === "speeds" ? (rtl ? "نفس الطريق، بسرعات مختلفة." : "Same road, different speeds.") : rtl ? `${WORDS_AR[n - 3]} طرق توصّلك من أ لـ ب.` : `${WORDS_EN[n - 3]} ways to get from A to B.`);

    // where it is built: inside the target when it has the room, else a card over the picture region
    const K = f.tall ? 1.3 : 1;
    const per = Math.min(82 * u * K, (f.pic.h - 80 * u - 76 * u * K) / n); // a row and its gap, fitted to the region
    const rh = per * 0.8, rowGap = per * 0.2, need = n * per + 120 * u;
    const ob = el ? ctx.box(el) : null;
    let host, cw, overlay = false;
    if (el && ob.h >= need) { el.textContent = ""; Object.assign(el.style, { display: "block", position: "relative" }); host = el; cw = el.clientWidth; }
    else {
      overlay = true;
      cw = Math.min(f.pic.w, 1400 * u);
      host = mk("div", `position:absolute;left:${f.pic.x + (f.pic.w - cw) / 2}px;top:${f.pic.y + f.pic.h / 2}px;translate:0 -50%;width:${cw}px;z-index:20;will-change:transform`, ctx.scene || stage);
      host.className = "ml-panel";
      Object.assign(host.style, { padding: `${40 * u}px`, boxSizing: "border-box" });
      cw -= 80 * u;
    }
    const wrap = mk("div", `direction:${rtl ? "rtl" : "ltr"};display:flex;flex-direction:column;gap:${rowGap.toFixed(2)}px`, host);
    const head = mk("div", `font:italic 400 ${Math.min(52 * u * K, cw * 0.06)}px/1.15 var(--x-serif-font);color:var(--x-ink);margin-bottom:${8 * u}px`, wrap, title);
    const physRtl = !!rtl || p.direction === "rtl"; // lanes run right → left
    const COLS = ["var(--x-ink)", "var(--x-accent)", "var(--x-bad)"];
    const g = Math.min(46 * u * K, rh * 0.9), idxW = 44 * u * K, labW = Math.min(cw * 0.26, 260 * u * K), gap = 16 * u;
    const laneW = cw - idxW - labW - g - gap * 3, L = laneW * 0.8; // room past B for back / elastic overshoot
    const rows = labels.map((lab, i) => {
      const row = mk("div", `display:grid;grid-template-columns:${idxW}px ${labW}px ${g}px ${laneW}px;column-gap:${gap}px;align-items:center;height:${rh}px`, wrap);
      mk("span", `font:500 ${20 * u * K}px var(--x-mono-font);color:var(--x-dim);direction:ltr;text-align:start`, row, String(i + 1).padStart(2, "0"));
      const lb = mk("span", `font:500 ${Math.min(26 * u * K, labW / Math.max(6, lab.length) * 1.6)}px var(--x-mono-font);color:var(--x-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis`, row, lab);
      if (/^[\x00-\x7F×]+$/.test(lab)) { lb.style.direction = "ltr"; lb.style.textAlign = rtl ? "right" : "left"; }
      // the ease's curve glyph
      const fn = p.compare === "speeds" ? EASES[1][1] : EASES[i % EASES.length][1];
      const svg = doc.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", "-4 -14 48 58"); svg.setAttribute("width", g); svg.setAttribute("height", g);
      if (physRtl) svg.style.transform = "scaleX(-1)";
      let d = "";
      for (let s = 0; s <= 48; s++) { const x = s / 48; d += `${s ? "L" : "M"}${(x * 40).toFixed(2)},${(40 - fn(x) * 30).toFixed(2)}`; }
      const base = doc.createElementNS(NS, "path"); base.setAttribute("d", "M0,40 H40"); base.setAttribute("fill", "none"); base.style.stroke = "var(--x-line)"; base.style.strokeWidth = "1.5"; svg.append(base);
      const curve = doc.createElementNS(NS, "path"); curve.setAttribute("d", d); curve.setAttribute("fill", "none"); curve.setAttribute("pathLength", "1");
      curve.style.cssText = "stroke:var(--x-dim);stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1 1";
      svg.append(curve); row.append(svg);
      // the lane
      const col0 = mk("div", `position:relative;height:${rh}px`, row);
      const lane = mk("div", `position:absolute;top:0;${physRtl ? "right" : "left"}:0;width:${L}px;height:${rh}px`, col0);
      mk("i", `position:absolute;left:0;right:0;top:50%;height:${Math.max(1, 1.5 * u)}px;background:color-mix(in srgb, var(--x-ink) 18%, transparent)`, lane);
      const mark = (txt, side) => mk("b", `position:absolute;${side}:0;top:${rh / 2 + 8 * u}px;translate:${side === "left" ? "-50%" : "50%"} 0;font:500 ${16 * u * K}px var(--x-mono-font);color:var(--x-dim)`, lane, txt);
      const A = rtl ? "أ" : "A", B = rtl ? "ب" : "B";
      if (i === n - 1) { mark(A, physRtl ? "right" : "left"); mark(B, physRtl ? "left" : "right"); }
      for (const side of ["left", "right"]) mk("i", `position:absolute;${side}:0;top:${rh / 2 - 7 * u}px;width:${Math.max(1, 1.5 * u)}px;height:${14 * u}px;background:color-mix(in srgb, var(--x-ink) 30%, transparent)`, lane);
      const r = Math.min(10 * u * K, rh * 0.2), col = COLS[i % 3];
      const racer = p.racer === "bars"
        ? mk("i", `position:absolute;top:${rh / 2 - 6 * u}px;height:${12 * u}px;width:0;border-radius:${6 * u}px;background:${col};${physRtl ? "right" : "left"}:0`, lane)
        : mk("i", `position:absolute;top:${rh / 2 - r}px;left:0;width:${2 * r}px;height:${2 * r}px;border-radius:50%;background:${col}`, lane);
      return { row, curve, racer, fn, r, lab };
    });

    // timing: rows in, then everybody leaves A together
    const st = ML.clamp(p.row_stagger, 0.03, 0.1);
    const ts = at + n * st + 0.45;
    const T = Math.max(0.8, Math.min(p.duration, end - ts - 0.45));
    const durOf = (i) => (p.compare === "speeds" ? T / SPEEDS[i] : T);
    ctx.sfx(at, "tap", 0.2);
    ctx.sfx(ts, "whoosh.soft", 0.4);
    ctx.sfx(ts + Math.min(...rows.map((_, i) => durOf(i))), "pop.soft", 0.3);
    const hostIn = overlay ? host : wrap;
    const ownOpacity = el && overlay ? el.style.opacity : null;

    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        const enter = ML.out(t, at - 0.05, at + 0.3);
        hostIn.style.opacity = (enter * (1 - leave)).toFixed(4);
        if (el && overlay) el.style.opacity = t >= at && t < end ? "0" : ownOpacity || "";
        head.style.translate = `0 ${((1 - enter) * 12 * u).toFixed(2)}px`;
        rows.forEach((R, i) => {
          const a = at + 0.1 + i * st, e = ML.out(t, a, a + 0.3);
          R.row.style.opacity = e.toFixed(4);
          R.row.style.translate = `0 ${((1 - e) * 24 * u).toFixed(2)}px`;
          R.curve.style.strokeDashoffset = (1 - ML.out(t, a + 0.1, a + 0.4)).toFixed(4);
          const x = ML.clamp((t - ts) / durOf(i)), v = R.fn(x);
          if (p.racer === "bars") R.racer.style.width = (Math.max(0, v) * L).toFixed(2) + "px";
          else {
            const px = v * L;
            R.racer.style.translate = `${(physRtl ? L - px - R.r : px - R.r).toFixed(2)}px 0`;
          }
        });
      },
    };
  },
});
