// Clients connect to a central gateway card. A dark violet product card (ink mixed with the accent, radius 10 at web
// scale) holds the logo, the product name and four feature chips; a column of `nodes` client chips with icons
// (Humans, Agents, Machines, …) fades in, stagger 0.1 s; 1 px connectors draw from each node to the card in 0.4 s and
// light up as a packet runs along each; one chip inside the card highlights in the accent; an output node appears on
// the far side with its own connector. Wide frames flow across (clients → card → output, mirrored in Arabic); tall
// frames flow down (clients on top). Connectors are SVG paths measured from the laid-out chips, drawn by dash offset.
// Rebuilt as our own code from a prompt-motion reference (reference only: no pixels or code copied).
ML.define({
  id: "ui.hub-nodes-gateway",
  category: "ui",
  name: "Clients connect to a central gateway card",
  does: "A product gateway card sits centre with client nodes ('Humans', 'Agents', 'Machines') on one side and connectors lighting up into it.",
  says: ["connection", "simplicity", "tech"],
  energy: 3,
  targets: ["card", "shape"],
  duration: [1.2, 3],
  params: {
    nodes: { type: "number", range: [2, 5], default: 3 },
    output_node: { type: "bool", default: true },
    product: { type: "text", default: "Gateway" },
    highlight: { type: "number", range: [0, 3], default: 1 },
  },
  pairs: ["ui.workflow-node-chain", "camera.push-in"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:misbahsy-opus-5-5-is-incredible", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080;
    const own = ctx.el && ctx.el !== ctx.stage && ctx.el.offsetWidth > 400 * k && ctx.el.offsetHeight > 300 * k ? ctx.el : null;
    const R = own ? ctx.box(own) : f.pic;
    const down = R.h > R.w * 1.05; // tall: flow downwards
    const N = Math.round(ML.clamp(p.nodes, 2, 5));
    const ICON = {
      human: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c0-3.3 3.1-6 7-6s7 2.7 7 6",
      agent: "M7 8h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Zm5-4v4M9.5 13h.01M14.5 13h.01",
      machine: "M4 6h16v5H4zM4 13h16v5H4zM7 8.5h.01M7 15.5h.01",
      app: "M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z",
      device: "M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm4 15h.01",
      out: "M4 12h14M13 6l6 6-6 6",
    };
    const names = rtl ? [["human", "البشر"], ["agent", "الوكلاء"], ["machine", "الخوادم"], ["app", "التطبيقات"], ["device", "الأجهزة"]] : [["human", "Humans"], ["agent", "Agents"], ["machine", "Machines"], ["app", "Apps"], ["device", "Devices"]];
    const feats = rtl ? ["الدخول", "التوجيه", "الحدود", "السجلات"] : ["Auth", "Routing", "Rate limits", "Logs"];

    const wrap = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;display:flex;flex-direction:${down ? "column" : "row"};align-items:center;justify-content:center;gap:${(down ? 90 : 120) * k}px;z-index:6;pointer-events:none;font-family:var(--x-body-font);`, host);
    // connectors are painted on a canvas every frame (cleared whole, so nothing of a past frame survives); a hidden SVG
    // only measures the curves
    const cv = mk("canvas", "position:absolute;left:0;top:0;", wrap);
    cv.width = Math.ceil(R.w); cv.height = Math.ceil(R.h); cv.style.width = `${cv.width}px`; cv.style.height = `${cv.height}px`;
    const g2 = cv.getContext("2d");
    const svg = sv("svg", { width: 1, height: 1, style: "position:absolute;left:0;top:0;visibility:hidden;" }, wrap);
    const probe = mk("span", "position:absolute;visibility:hidden;", wrap);
    const colour = (v) => { probe.style.color = v; return getComputedStyle(probe).color; };
    const fs = 26 * k;
    const chipCss = `display:flex;align-items:center;gap:${(12 * k).toFixed(1)}px;padding:${(14 * k).toFixed(1)}px ${(22 * k).toFixed(1)}px;border-radius:calc(var(--x-radius) * 0.45);background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);color:var(--x-ink);font:600 ${fs.toFixed(1)}px var(--x-body-font);white-space:nowrap;position:relative;`;
    const icon = (parent, d, col) => { const g = sv("svg", { viewBox: "0 0 24 24", width: (fs * 1.2).toFixed(1), height: (fs * 1.2).toFixed(1), style: "flex:none;" }, parent); sv("path", { d, fill: "none", stroke: col, "stroke-width": 1.8, "stroke-linecap": "round", "stroke-linejoin": "round" }, g); return g; };

    // clients
    const col = mk("div", `display:flex;flex-direction:${down ? "row" : "column"};flex-wrap:${down ? "wrap" : "nowrap"};justify-content:center;gap:${(down ? 16 : 22) * k}px;max-width:${down ? R.w : R.w * 0.3}px;position:relative;`, wrap);
    const nodes = names.slice(0, N).map(([ic, label]) => { const c = mk("div", chipCss, col); icon(c, ICON[ic], "var(--x-accent)"); c.append(label); return c; });
    // the gateway card
    const cardW = Math.min(down ? R.w * 0.8 : R.w * 0.36, 520 * k);
    const card = mk("div", `position:relative;width:${cardW.toFixed(1)}px;box-sizing:border-box;padding:${(30 * k).toFixed(1)}px;border-radius:${(20 * k).toFixed(1)}px;background:linear-gradient(160deg, color-mix(in srgb, var(--x-accent) 34%, var(--x-ink)), color-mix(in srgb, var(--x-accent) 16%, var(--x-ink)));color:var(--x-accent-ink);box-shadow:var(--x-shadow), inset 0 0 0 ${(1.5 * k).toFixed(2)}px color-mix(in srgb, var(--x-accent-ink) 12%, transparent);flex:none;`, wrap);
    const head = mk("div", `display:flex;align-items:center;gap:${(14 * k).toFixed(1)}px;margin-bottom:${(22 * k).toFixed(1)}px;`, card);
    const logo = mk("div", `width:${(46 * k).toFixed(1)}px;height:${(46 * k).toFixed(1)}px;border-radius:${(12 * k).toFixed(1)}px;background:linear-gradient(135deg, var(--x-accent-2), var(--x-accent));display:grid;place-items:center;flex:none;`, head);
    icon(logo, "M12 3l8 4.5v9L12 21l-8-4.5v-9z", "var(--x-accent-ink)");
    const ht = mk("div", "", head);
    mk("div", `font:var(--x-head-weight) ${(34 * k).toFixed(1)}px/1.1 var(--x-head-font);`, ht, p.product || "Gateway");
    mk("div", `font:var(--x-label-weight) ${(16 * k).toFixed(1)}px var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:var(--x-label-case);opacity:.6;margin-top:${(4 * k).toFixed(1)}px;`, ht, rtl ? "بوابة واحدة" : "One entry point");
    const grid = mk("div", `display:grid;grid-template-columns:1fr 1fr;gap:${(12 * k).toFixed(1)}px;`, card);
    const chips = feats.map((x) => mk("div", `padding:${(12 * k).toFixed(1)}px ${(14 * k).toFixed(1)}px;border-radius:${(10 * k).toFixed(1)}px;font:600 ${(22 * k).toFixed(1)}px var(--x-body-font);background:color-mix(in srgb, var(--x-accent-ink) 8%, transparent);border:${(1.5 * k).toFixed(2)}px solid color-mix(in srgb, var(--x-accent-ink) 12%, transparent);`, grid, x));
    // output
    let outN = null;
    if (p.output_node) { outN = mk("div", chipCss, wrap); icon(outN, ICON.out, "var(--x-good)"); outN.style.flex = "none"; outN.append(rtl ? "واجهتك" : "Your API"); if (rtl && !down) outN.querySelector("svg").style.transform = "scaleX(-1)"; }

    // connectors, measured from the layout (wrap-relative px)
    const wb = ctx.box(wrap);
    const rel = (e) => { const b = ctx.box(e); return { x: b.x - wb.x, y: b.y - wb.y, w: b.w, h: b.h }; };
    const cb = rel(card);
    const fwd = rtl ? -1 : 1; // across: clients sit on the inline-start side
    const portIn = (i, n) => down ? { x: cb.x + cb.w * (0.25 + (0.5 * (i + 0.5)) / n), y: cb.y } : { x: rtl ? cb.x + cb.w : cb.x, y: cb.y + cb.h * (0.3 + (0.4 * (i + 0.5)) / n) };
    const curveD = (a, b) => down ? `M${a.x} ${a.y} C${a.x} ${(a.y + b.y) / 2} ${b.x} ${(a.y + b.y) / 2} ${b.x} ${b.y}` : `M${a.x} ${a.y} C${(a.x + b.x) / 2} ${a.y} ${(a.x + b.x) / 2} ${b.y} ${b.x} ${b.y}`;
    const hair = Math.max(1, 2 * k);
    const INK = colour("var(--x-ink)"), ACC = colour("var(--x-accent)");
    const mkLine = (d) => {
      const m = sv("path", { d }, svg);
      return { path: new Path2D(d), m, len: m.getTotalLength() };
    };
    const links = nodes.map((n, i) => { const b = rel(n); const a = down ? { x: b.x + b.w / 2, y: b.y + b.h } : { x: rtl ? b.x : b.x + b.w, y: b.y + b.h / 2 }; return mkLine(curveD(a, portIn(i, N))); });
    let outLink = null;
    if (outN) { const b = rel(outN); const a = down ? { x: cb.x + cb.w / 2, y: cb.y + cb.h } : { x: rtl ? cb.x : cb.x + cb.w, y: cb.y + cb.h / 2 }; const z = down ? { x: b.x + b.w / 2, y: b.y } : { x: rtl ? b.x + b.w : b.x, y: b.y + b.h / 2 }; outLink = mkLine(curveD(a, z)); }

    // timing (compressed into the room given)
    const sc = Math.min(1, Math.max(0.5, (end - at - 0.35) / 2.4));
    const tCard = at + 0.05, tNodes = at + 0.25 * sc, tLines = tNodes + (0.1 * N + 0.15) * sc, lineD = 0.4 * sc;
    const tChip = tLines + lineD + 0.1 * sc, tOut = tChip + 0.2 * sc;
    ctx.sfx(tLines + lineD, "blip", 0.3); ctx.sfx(tChip, "tap", 0.2); if (outN) ctx.sfx(tOut + 0.3 * sc, "blip", 0.22);
    const hl = Math.round(ML.clamp(p.highlight, 0, 3));
    const appear = (el, t, a, dist) => { const e = ML.out(t, a, a + 0.35); el.style.opacity = e.toFixed(4); el.style.translate = down ? `0 ${((1 - e) * dist).toFixed(2)}px` : `${((1 - e) * -dist * fwd).toFixed(2)}px 0`; };
    const drawLine = (L, t, a, i) => {
      const u = ML.out(t, a, a + lineD);
      if (u <= 0) return;
      g2.save();
      g2.lineCap = "round";
      g2.setLineDash(u < 1 ? [L.len * u, L.len] : []);
      g2.globalAlpha = 0.18; g2.strokeStyle = INK; g2.lineWidth = hair; g2.stroke(L.path);
      const lu = ML.out(t, a + lineD, a + lineD + 0.3);
      g2.globalAlpha = 0.15 + 0.85 * lu; g2.strokeStyle = ACC; g2.lineWidth = hair * 1.3; g2.stroke(L.path);
      g2.restore();
      // a packet runs the line once it is drawn, then every 1.2 s
      const ph = t - (a + lineD) - i * 0.15;
      if (ph < 0) return;
      const q = (ph % 1.2) / 0.8;
      if (q >= 1) return;
      const pt = L.m.getPointAtLength(q * L.len);
      g2.save(); g2.globalAlpha = Math.sin(Math.PI * q) * 0.95; g2.fillStyle = ACC;
      g2.beginPath(); g2.arc(pt.x, pt.y, 5 * k, 0, Math.PI * 2); g2.fill(); g2.restore();
    };

    return {
      draw(t) {
        const ce = ML.out(t, tCard, tCard + 0.4);
        card.style.opacity = ce.toFixed(4);
        card.style.scale = (0.94 + 0.06 * ce).toFixed(4);
        nodes.forEach((n, i) => appear(n, t, tNodes + i * 0.1 * sc, 24 * k));
        g2.clearRect(0, 0, cv.width, cv.height);
        links.forEach((L, i) => drawLine(L, t, tLines + i * 0.05 * sc, i));
        chips.forEach((c, i) => {
          const on = i === hl ? ML.out(t, tChip, tChip + 0.25) : 0;
          c.style.background = `color-mix(in srgb, var(--x-accent) ${(on * 100).toFixed(1)}%, color-mix(in srgb, var(--x-accent-ink) 8%, transparent))`;
          c.style.borderColor = `color-mix(in srgb, var(--x-accent-2) ${(on * 80).toFixed(1)}%, color-mix(in srgb, var(--x-accent-ink) 12%, transparent))`;
        });
        if (outN) { appear(outN, t, tOut + 0.3 * sc, -24 * k); drawLine(outLink, t, tOut, links.length); }
        const l = ML.clamp((t - (end - 0.25)) / 0.22);
        wrap.style.opacity = (t < at ? 0 : 1 - l).toFixed(4);
      },
    };
  },
});
