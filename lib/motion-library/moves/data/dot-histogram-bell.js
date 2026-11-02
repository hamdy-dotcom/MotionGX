// Dot plot builds into a bell curve: samples rain into ~40 columns as small dots (each falling ~30 px in 0.15 s onto
// its column's stack) at an accelerating rate (power2.in, 0 → all over ~1.5 s) while a tabular counter ticks
// "000 / 500 SHUFFLES"; then the dots merge into thin bars, a smooth Gaussian fitted to the samples draws across in
// 0.5 s, a 5th–95th percentile band fades in, and a vertical marker with a dot rises at the observed value with its
// label ("1.8× median"). A headline sits on top with its second word in the accent. Samples are seeded (normal,
// skewed or uniform), so every frame is the same at the same t. The axis runs right to left on an RTL stage.
// Source: prompt-motion:marouanegazouzi-omg-the-15-second-motion (reference only — rebuilt as our own code).
ML.define({
  id: "data.dot-histogram-bell",
  category: "data",
  name: "Dot plot builds into a bell curve",
  does: "Dots rain into columns forming a histogram while a counter ticks up, then a bell curve overlays and a marker shows where the result lands.",
  says: ["proof", "precision", "result"],
  energy: 3,
  targets: ["chart", "number"],
  duration: [2.5, 5],
  params: {
    samples: { type: "number", range: [100, 1000], default: 500 },
    columns: { type: "number", range: [20, 60], default: 40 },
    distribution: { type: "choice", options: ["normal", "skewed", "uniform"], default: "normal" },
    marker: { type: "bool", default: true },
    band: { type: "bool", default: true },
    observed: { type: "number", range: [0, 1], default: 0.84 },
    marker_label: { type: "text", default: "" },
    headline: { type: "text", default: "" },
    unit: { type: "text", default: "" },
  },
  pairs: ["data.data-point-step-highlight", "data.digit-write"],
  avoid: ["playful", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:marouanegazouzi-omg-the-15-second-motion", license: "reference", note: "technique rebuilt as our own seeded canvas code" },
  setup(ctx) {
    const { el, p, at, end, rtl, stage, f } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const colourOf = (v, host) => { const s = mk("span", `color:${v}`, host); const c = getComputedStyle(s).color; s.remove(); return c; };
    const u = Math.min(f.W, f.H) / 1080;
    const N = Math.round(ML.clamp(+p.samples || 500, 20, 2000)), C = Math.round(ML.clamp(+p.columns || 40, 8, 120));

    // where it builds: inside a chart target, else a card of its own over the picture region; a number target counts
    const numberSlot = el && el.childElementCount === 0 && /\d/.test(el.textContent || "") && el.offsetHeight < 260 * u;
    const own = !el || numberSlot;
    const b = own ? f.pic : ctx.box(el);
    const host = mk("div", `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;box-sizing:border-box;display:flex;flex-direction:column;gap:${14 * u}px;z-index:20;${own ? `padding:${40 * u}px ${44 * u}px;` : ""}`, stage);
    if (own) host.className = "ml-panel";
    const words = String(p.headline || (rtl ? "أحسن من الصدفة" : "Beats chance.")).split(/\s+/);
    const head = mk("div", `font:var(--x-head-weight) ${Math.round(64 * u)}px/1.1 var(--x-head-font);letter-spacing:var(--x-head-track);color:var(--x-ink)`, host);
    words.forEach((w, i) => { if (i) head.append(" "); mk("span", i === 1 ? "color:var(--x-accent)" : "", head, w); });
    const digits = String(N).length, unit = p.unit || (rtl ? "تجربة" : "SHUFFLES");
    const counter = mk("div", `font-size:${Math.round(24 * u)}px;font-variant-numeric:tabular-nums;color:var(--x-ink)`, host);
    counter.className = "ml-label";
    const cnum = mk("span", "direction:ltr;unicode-bidi:isolate", counter, `${"0".repeat(digits)} / ${N}`);
    counter.append(" " + unit);
    const cv = mk("canvas", "display:block;flex:1 1 auto;min-height:0;width:100%", host);
    const W = Math.max(10, Math.round(cv.clientWidth)), H = Math.max(10, Math.round(cv.clientHeight));
    cv.width = W; cv.height = H;
    const g = cv.getContext("2d", { willReadFrequently: true }); // software canvas: no GPU promotion between frames
    const col = { ink: colourOf("var(--x-ink)", host), dim: colourOf("var(--x-dim)", host), accent: colourOf("var(--x-accent)", host), line: colourOf("var(--x-line)", host) };
    const probe = mk("span", "font-family:var(--x-mono-font)", host); const mono = getComputedStyle(probe).fontFamily; probe.remove();

    // the samples (seeded) and where each lands
    const vals = Array.from({ length: N }, (_, i) => {
      const r1 = Math.max(1e-6, ML.rnd(i, 1)), r2 = ML.rnd(i, 2), z = Math.sqrt(-2 * Math.log(r1)) * Math.cos(2 * Math.PI * r2);
      const v = p.distribution === "uniform" ? ML.rnd(i, 3) : p.distribution === "skewed" ? 0.3 + 0.12 * (z + 0.35 * z * z) : 0.5 + 0.16 * z;
      return ML.clamp(v, 0, 0.99999);
    });
    const counts = new Array(C).fill(0);
    const dots = vals.map((v) => { const c = Math.floor(v * C); return { c, k: counts[c]++ }; });
    const maxCount = Math.max(...counts);
    const mean = vals.reduce((a, b2) => a + b2, 0) / N, sd = Math.sqrt(vals.reduce((a, b2) => a + (b2 - mean) ** 2, 0) / N) || 0.1;
    const sorted = [...vals].sort((a, b2) => a - b2), p5 = sorted[Math.floor(N * 0.05)], p95 = sorted[Math.floor(N * 0.95)];
    const padTop = H * 0.16, base = H - 22 * u, colW = W / C;
    const step = Math.min(colW * 0.92, (base - padTop) / (maxCount * 1.08)), r = step * 0.42;
    const X = (v) => (rtl ? W - v * W : v * W);

    // timing inside the span: rain, merge, curve, band, marker
    const t0 = at + 0.35, D = Math.max(0.6, Math.min(1.5, (end - at) * 0.4));
    const arrive = dots.map((_, i) => t0 + D * Math.sqrt((i + 1) / N));
    const t1 = t0 + D + 0.15, t2 = t1 + 0.25, t3 = t2 + 0.5, t4 = Math.min(end - 0.7, t3 + 0.15);
    for (let q = 1; q <= 4; q++) ctx.sfx(t0 + D * Math.sqrt(q / 4) - 0.05, "tap", 0.12 + q * 0.02);
    ctx.sfx(t1, "whoosh.soft", 0.2);
    if (p.marker) ctx.sfx(t4 + 0.3, "pop", 0.35);
    const label = p.marker_label || (rtl ? "١٫٨× الوسيط" : "1.8× median");

    return {
      draw(t) {
        ML.show(host, t, at, end - 0.25);
        const arrived = t < t0 ? 0 : Math.min(N, Math.floor(N * Math.pow(ML.lin(t, t0, t0 + D), 2) + 1e-9));
        const s = `${String(arrived).padStart(digits, "0")} / ${N}`;
        if (cnum.textContent !== s) cnum.textContent = s;
        if (numberSlot) { const v = arrived.toLocaleString("en-US"); if (el.textContent !== v) el.textContent = v; } // the number slot counts the samples too

        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalAlpha = 1; g.lineCap = "butt"; g.lineJoin = "round"; g.setLineDash([]);
        g.clearRect(0, 0, W, H);
        // the axis
        g.strokeStyle = col.line; g.lineWidth = Math.max(1, 2 * u);
        g.beginPath(); g.moveTo(0, base + 1); g.lineTo(W, base + 1); g.stroke();
        const merge = ML.ease(t, t1, t1 + 0.3);
        // the band (5th–95th), behind everything
        if (p.band) {
          const a = ML.ease(t, t3 - 0.1, t3 + 0.3);
          if (a > 0) { g.globalAlpha = 0.1 * a; g.fillStyle = col.accent; const xa = X(p5), xb = X(p95); g.fillRect(Math.min(xa, xb), padTop * 0.6, Math.abs(xb - xa), base - padTop * 0.6); }
        }
        // the dots falling onto their stacks, fading into thin bars
        if (merge < 1) {
          g.fillStyle = col.ink;
          for (let i = 0; i < N; i++) {
            const ta = arrive[i];
            if (t < ta - 0.15) continue;
            const d = dots[i], fall = ML.out(t, ta - 0.15, ta);
            const x = X((d.c + 0.5) / C), y = base - (d.k + 0.5) * step - (1 - fall) * 30 * u;
            g.globalAlpha = (0.85 * Math.min(1, fall * 2)) * (1 - merge);
            g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
          }
        }
        if (merge > 0) {
          g.fillStyle = col.dim; g.globalAlpha = 0.55 * merge;
          const bw = colW * (0.92 - 0.5 * merge);
          for (let c = 0; c < C; c++) { const h = counts[c] * step; g.fillRect(X((c + 0.5) / C) - bw / 2, base - h, bw, h); }
        }
        // the fitted Gaussian, drawn across in 0.5 s
        const cp = ML.ease(t, t2, t2 + 0.5);
        if (cp > 0) {
          g.globalAlpha = 1; g.strokeStyle = col.accent; g.lineWidth = Math.max(2, 4 * u);
          g.beginPath();
          const M = 120;
          for (let j = 0; j <= M * cp; j++) {
            const v = j / M, pdf = Math.exp(-0.5 * ((v - mean) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));
            const y = base - (N / C) * pdf * step;
            if (j === 0) g.moveTo(X(v), y); else g.lineTo(X(v), y);
          }
          g.stroke();
        }
        // the marker: a line rising at the observed value, a dot on top, its label
        if (p.marker) {
          const mr = ML.out(t, t4, t4 + 0.35);
          if (mr > 0) {
            const x = X(ML.clamp(+p.observed, 0, 1)), top = padTop * 0.55, y = base - (base - top) * mr;
            g.globalAlpha = 1; g.strokeStyle = col.ink; g.lineWidth = Math.max(2, 3 * u);
            g.beginPath(); g.moveTo(x, base); g.lineTo(x, y); g.stroke();
            g.fillStyle = col.ink; g.beginPath(); g.arc(x, y, 7 * u, 0, Math.PI * 2); g.fill();
            const la = ML.ease(t, t4 + 0.25, t4 + 0.45);
            if (la > 0) {
              g.globalAlpha = la; g.font = `600 ${Math.round(24 * u)}px ${mono}`; g.textBaseline = "middle";
              const right = x < W * 0.7; // the label sits on the side with room
              g.textAlign = right ? "left" : "right"; g.direction = rtl ? "rtl" : "ltr";
              g.fillText(label, x + (right ? 1 : -1) * 16 * u, y);
            }
          }
        }
        g.globalAlpha = 1;
      },
    };
  },
});
