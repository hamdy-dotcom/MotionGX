// Ticking ruler dial (MengTo's dither-background / framed-grid-layout time bar): a dark pill (the look's ink, full radius,
// the look's shadow) holds a canvas ruler — ticks every 6 px (at a 72 px pill; scaled to the pill's height), minor 6 px,
// every 5th 10 px, every 10th 14 px, drawn upward from h − 10; stroke the look's ground over its ink pill (the source's grey vanishes at video size) at alpha·(major ? .8 : .4),
// alpha 1 inside the central 40 % and falling linearly to 0 at the edges. The ruler slides under a fixed centre overlay:
// the value on top (semibold) and a 2 × 16 px accent needle, rounded, at the bottom. Seekable: offset = −speed·t.
// dial_to_value: the ruler travels to its value on power3.inOut over 1.2 s while the label rolls its digits up to it,
// then idles at `speed` (mode scrub-to-value travels without rolling the label; idle with no dial only drifts). On a number target the pill takes the number's
// place (its value becomes the label); without one it sits in the picture region with `value`.
// Source: MengTo/Skills web-design/dither-background + framed-grid-layout demos (canvas tick bar, MIT).
ML.define({
  id: "ui.ruler-dial-scroll",
  category: "ui",
  name: "Ticking ruler dial",
  does: "A dark pill holds a ruler of ticks that slides sideways under a fixed accent needle and value, fading at both ends.",
  says: ["time", "precision", "change"],
  energy: 2,
  targets: ["number", "screen", "shape", "chart", "label", "card"],
  duration: [1.6, 4],
  params: {
    speed: { type: "number", range: [5, 30], default: 10, unit: "px/s" },
    dial_to_value: { type: "bool", default: true },
    mode: { type: "choice", options: ["idle", "scrub-to-value"], default: "idle" },
    spacing: { type: "number", range: [4, 10], default: 6, unit: "px" },
    value: { type: "text", default: "07:15" },
  },
  pairs: ["data.count-up", "text-in.punchline"],
  avoid: ["playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "MengTo/Skills:web-design/dither-background", license: "MIT", note: "demo/index.html tick canvas; same bar in framed-grid-layout and mesh-gradient-dark-blue-clean" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const tgt = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    // Arabic digits count like any others: worked in Latin digits, shown in the ones they came in
    const raw = (tgt && /[\d٠-٩]/.test(tgt.textContent) ? tgt.textContent.trim() : "") || p.value || "07:15";
    const east = /[٠-٩]/.test(raw), EAST = "٠١٢٣٤٥٦٧٨٩";
    const value = raw.replace(/[٠-٩]/g, (c) => EAST.indexOf(c));
    const show = (x) => (east ? x.replace(/\d/g, (c) => EAST[c]) : x);

    // the pill: in place of the target (over its box), else in the picture region
    let pill, H, Wp;
    if (tgt) {
      if (getComputedStyle(tgt).position === "static") tgt.style.position = "relative";
      const bw = tgt.clientWidth, bh = tgt.clientHeight;
      H = Math.max(72 * k, Math.min(bh, 180 * k)); Wp = Math.min(bw, H * 6.5);
      pill = mk("div", `position:absolute;left:${((bw - Wp) / 2).toFixed(1)}px;top:${((bh - H) / 2).toFixed(1)}px;`, tgt);
      tgt._mlColor = tgt.style.color;
    } else {
      const R = f.pic; H = 150 * k; Wp = Math.min(R.w * 0.86, H * 6.5);
      pill = mk("div", `position:absolute;left:${(R.x + (R.w - Wp) / 2).toFixed(1)}px;top:${(R.y + (R.h - H) / 2).toFixed(1)}px;`, ctx.scene || ctx.stage);
    }
    pill.style.cssText += `width:${Wp.toFixed(1)}px;height:${H.toFixed(1)}px;border-radius:999px;background:var(--x-ink);box-shadow:var(--x-shadow);overflow:hidden;z-index:6;pointer-events:none;direction:ltr;`;
    const s = H / 72; // the source bar is 72 px tall
    const canvas = mk("canvas", "position:absolute;inset:0;width:100%;height:100%;", pill);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(Wp * dpr); canvas.height = Math.round(H * dpr);
    const g = canvas.getContext("2d");
    // the look's colour, resolved for the canvas (any CSS colour form)
    const probe = mk("i", "color:var(--x-ground);display:none;", pill);
    const dim = getComputedStyle(probe).color;
    probe.remove();
    const label = mk("div", `position:absolute;left:0;right:0;top:${(H * 0.14).toFixed(1)}px;text-align:center;font:600 ${(H * (tgt ? 0.3 : 0.24)).toFixed(1)}px/1 var(--x-body-font);font-variant-numeric:tabular-nums;color:var(--x-ground);white-space:nowrap;unicode-bidi:plaintext;`, pill, show(value));
    mk("div", `position:absolute;left:50%;bottom:${(10 * s).toFixed(1)}px;width:${(2 * s).toFixed(1)}px;height:${(16 * s).toFixed(1)}px;margin-left:${(-1 * s).toFixed(1)}px;border-radius:999px;background:var(--x-accent);`, pill);

    // the value rolling its digits: the template keeps its separators, the digits count up together
    const slots = Array.from(value).filter((c) => /\d/.test(c)).length;
    const target = parseInt(Array.from(value).filter((c) => /\d/.test(c)).join("") || "0", 10);
    const timeLike = /:/.test(value);
    // a clock-like value ("07:15") counts in base 60 per group; anything else counts its digits as one number
    const groups = timeLike ? value.split(":").map((x) => (x.match(/\d+/) || ["0"])[0]) : null;
    const total = timeLike ? groups.reduce((a, x) => a * 60 + parseInt(x, 10), 0) : target;
    const fmt = (v) => {
      if (timeLike) {
        let r = Math.round(v); const parts = groups.map(() => 0);
        for (let i = groups.length - 1; i >= 0; i--) { parts[i] = i === 0 ? r : r % 60; r = Math.floor(r / 60); }
        let j = 0; return value.replace(/\d+/g, (m) => String(parts[j++]).padStart(m.length, "0"));
      }
      const ds = String(Math.round(v)).padStart(slots, "0");
      let j = 0; const out = Array.from(value).map((c) => (/\d/.test(c) ? ds[j++] : c)).join("");
      return out.replace(/^[0,.\s٬]+(?=\d)/, "");
    };

    // timing
    const t0 = at + 0.3, t1 = Math.min(t0 + 1.2, Math.max(t0 + 0.5, end - 0.4));
    const scrub = p.mode === "scrub-to-value" || p.dial_to_value, sp = p.spacing * s, travel = sp * 10 * (8 + (target % 7));
    ctx.sfx(at, "blip", 0.2);
    if (scrub) ctx.sfx(t1, "blip", 0.35);
    const p3 = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const dir = rtl ? 1 : -1;
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        const u = ML.out(t, at, at + 0.35);
        pill.style.opacity = (t < at ? 0 : u * (1 - leave)).toFixed(4);
        pill.style.translate = `0 ${((1 - u) * 16 * k).toFixed(2)}px`;
        if (tgt) tgt.style.color = t < at ? tgt._mlColor : "transparent";
        // the ruler's offset: idle drift (+ the travel to the value)
        const e = p3(ML.lin(t, t0, t1));
        const offset = dir * (p.speed * s * Math.max(0, t - at) + (scrub ? travel * e : 0));
        const w = Wp, h = H;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, w, h);
        g.lineWidth = Math.max(1, s * 0.75);
        g.strokeStyle = dim;
        const base = h - 10 * s, fadeStart = w * 0.2, n0 = Math.floor(-offset / sp) - 1, n1 = n0 + Math.ceil(w / sp) + 2;
        for (let n = n0; n <= n1; n++) {
          const x = n * sp + offset;
          if (x < -1 || x > w + 1) continue;
          const d = Math.abs(x - w / 2), alpha = d <= fadeStart ? 1 : Math.max(0, 1 - (d - fadeStart) / (w / 2 - fadeStart));
          if (alpha <= 0) continue;
          const major = n % 10 === 0, mid = n % 5 === 0;
          const th = (major ? 14 : mid ? 10 : 6) * s;
          g.globalAlpha = alpha * (major ? 0.8 : 0.4);
          g.beginPath(); g.moveTo(x, base); g.lineTo(x, base - th); g.stroke(); // on its true sub-pixel place: rounding shimmers at slow speeds
        }
        label.textContent = show(p.dial_to_value && e < 1 ? fmt(total * e) : value);
      },
    };
  },
});
