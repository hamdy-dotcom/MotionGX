// Fibonacci dot globe: a sphere of accent dots spins in place on a 2D canvas, near dots bright and large, far dots
// faint, circled by a thin tilted orbit ring, with a big live number beneath. Ported from the source's painter:
// 360 points, phi = acos(1 − 2(i + .5)/n), theta = π(1 + √5)·i + time; x = sin φ cos θ, y = cos φ, z = sin φ sin θ;
// radius min(W, H)·.29 at (.5W, .47H); depth scale (z + 1.7)/2.7 → alpha .16 + .74·s, dot max(.7, 2.2·s) (scaled to
// the canvas); the ring an ellipse at cy + .18R, 1.34R × .34R, turning time·.4, alpha .16. Here time = speed·(t − from)
// instead of a frame counter, so the frame at t is always the same. The readout below (grid 1fr auto 1fr): two muted
// uppercase labels and a large number counted up for video. On a number target the slot is the live number and the
// globe sits above it; on a chart / the stage the globe and its readout fill the target (or the picture region).
// Source: MengTo/Skills web-design/globe-gl/demo/index.html (MIT: the "globe" canvas painter and the vizMeta readout).
ML.define({
  id: "data.dot-globe",
  category: "data",
  name: "Fibonacci dot globe",
  does: "A sphere of hundreds of accent dots spins in place, near dots bright and large, far dots faint, circled by a tilted thin ring, with a big live number beneath.",
  says: ["scale", "connection", "tech", "ambient"],
  energy: 2,
  targets: ["chart", "stage", "number"],
  duration: [2, 10],
  params: {
    dots: { type: "number", range: [200, 800], default: 360 },
    speed: { type: "number", range: [0.2, 1], default: 0.48 },
    ring: { type: "bool", default: true },
    readout: { type: "bool", default: true },
    value: { type: "text", default: "72.4" },
    labels: { type: "text", default: "" },
  },
  pairs: ["data.counter-with-particle-swarm", "data.digit-write"],
  avoid: ["playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "MengTo/Skills:web-design/globe-gl", license: "MIT", note: "demo/index.html globe painter + readout, driven by t" },
  setup(ctx) {
    const { el, p, at, end, rtl, stage, f } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const u = Math.min(f.W, f.H) / 1080;

    // the live number: the target slot, or one built in the readout
    const numberSlot = el && el !== stage && el.childElementCount === 0 && /\d/.test(el.textContent || "");
    let host, numEl = null, box;
    if (numberSlot) {
      const b = ctx.box(el), side = Math.min(f.W - 2 * f.m, Math.max(200 * u, b.y - f.safe.y - 20 * u) * 1.15, 760 * u);
      box = { x: b.x + b.w / 2 - side / 2, y: Math.max(f.safe.y, b.y - side * 0.92), w: side, h: side };
      if (rtl) box.x = Math.min(f.W - f.m - side, box.x);
      box.x = ML.clamp(box.x, f.m, f.W - f.m - side);
      host = mk("div", `position:absolute;left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px;pointer-events:none;z-index:20`, stage);
      numEl = el;
    } else {
      const own = !el || el === stage, b = own ? f.pic : ctx.box(el);
      box = { x: b.x, y: b.y, w: b.w, h: b.h };
      // on the stage it gets a showcase card of its own (the source's panel); in a chart target it fills the chart
      host = mk("div", `position:absolute;left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px;pointer-events:none;z-index:20;display:grid;grid-template-rows:minmax(0,1fr) auto;box-sizing:border-box;${own ? `padding:${36 * u}px ${40 * u}px ${32 * u}px;` : ""}`, stage);
      if (own) host.className = "ml-panel";
    }
    const cv = mk("canvas", "display:block;width:100%;height:100%;min-height:0", host);
    let readout = null;
    if (!numberSlot && p.readout) {
      const [l1, l2] = String(p.labels || (rtl ? "حقل مباشر|مدار تلقائي" : "LIVE FIELD|AUTO ORBIT")).split("|");
      readout = mk("div", `display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:${24 * u}px;padding:${18 * u}px ${12 * u}px 0;border-top:var(--x-edge) solid var(--x-line)`, host);
      const a = mk("span", `font-size:${Math.round(22 * u)}px`, readout, l1 || ""); a.className = "ml-label";
      numEl = mk("strong", `font:var(--x-head-weight) ${Math.round(120 * u)}px/1 var(--x-head-font);letter-spacing:-0.06em;color:var(--x-ink);font-variant-numeric:tabular-nums;direction:ltr`, readout, String(p.value || "72.4"));
      const b2 = mk("span", `font-size:${Math.round(22 * u)}px;text-align:end`, readout, l2 || ""); b2.className = "ml-label";
    }
    const W = Math.max(10, Math.round(cv.clientWidth)), H = Math.max(10, Math.round(cv.clientHeight));
    cv.width = W; cv.height = H;
    const g = cv.getContext("2d", { willReadFrequently: true }); // software canvas: no GPU promotion between frames
    const probe = mk("span", "color:var(--x-accent)", host); const accent = getComputedStyle(probe).color; probe.remove();

    // the live number counts up (its own format kept: decimals, separators, prefix / suffix)
    let count = null;
    if (numEl) {
      const text = (numEl.textContent || "").trim(), m = text.match(/^(.*?)(\d[\d,]*(?:\.\d+)?)(.*)$/);
      if (m) {
        const dec = (m[2].split(".")[1] || "").length, val = parseFloat(m[2].replace(/,/g, "")), comma = m[2].includes(",");
        count = (x) => { let s = (val * x).toFixed(dec); if (comma) { const [i, d] = s.split("."); s = i.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (d ? "." + d : ""); } return m[1] + s + m[3]; };
        numEl.style.fontVariantNumeric = "tabular-nums";
      }
    }
    const n = Math.round(ML.clamp(+p.dots || 360, 50, 1200)), speed = ML.clamp(+p.speed || 0.48, 0.05, 2);
    // the source's dot sizes were for a ~470 px showcase; keep that look at the canvas size
    const k = Math.min(W, H) / 470;
    ctx.sfx(at, "swell", 0.3);

    return {
      draw(t) {
        const o = ML.ease(t, at, at + 0.5) * (1 - ML.ease(t, end - 0.4, end - 0.05));
        host.style.opacity = o.toFixed(4);
        host.style.visibility = o > 0.001 ? "visible" : "hidden";
        if (count) { const s = count(ML.out(t, at + 0.1, at + 1.6)); if (numEl.textContent !== s) numEl.textContent = s; }
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalAlpha = 1;
        g.clearRect(0, 0, W, H);
        if (o <= 0.001) return;
        const time = speed * Math.max(0, t - ctx.from);
        const radius = Math.min(W, H) * (numberSlot ? 0.36 : 0.29) * (readout ? 1.15 : 1), cx = W * 0.5, cy = H * (numberSlot ? 0.5 : 0.47);
        g.fillStyle = accent;
        for (let i = 0; i < n; i++) {
          const phi = Math.acos(1 - (2 * (i + 0.5)) / n), theta = Math.PI * (1 + Math.sqrt(5)) * i + time;
          const x = Math.sin(phi) * Math.cos(theta) * (rtl ? -1 : 1), y = Math.cos(phi), z = Math.sin(phi) * Math.sin(theta);
          const scale = (z + 1.7) / 2.7;
          g.globalAlpha = 0.16 + 0.74 * scale;
          g.beginPath(); g.arc(cx + x * radius, cy + y * radius, Math.max(0.7, 2.2 * scale) * k, 0, Math.PI * 2); g.fill();
        }
        if (p.ring) {
          g.globalAlpha = 0.16; g.strokeStyle = accent; g.lineWidth = Math.max(1, k);
          g.beginPath(); g.ellipse(cx, cy + radius * 0.18, radius * 1.34, radius * 0.34, time * 0.4 * (rtl ? -1 : 1), 0, Math.PI * 2); g.stroke();
        }
        g.globalAlpha = 1;
      },
    };
  },
});
