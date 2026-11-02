// Status glows with callouts: along one edge of the target (a list, a label, a screen), soft radial glows light up one
// by one (~0.5 s apart), each coloured by its status (good / warning / bad, or the look's two accents). Each glow
// bursts a ring of seeded sparks as it appears (0.4 s), then a thin leader line draws from it to a callout (0.25 s):
// a small chip with a status dot, the item's name in mono and a value line in the status colour ("Balance ¥86.40",
// "Weekly credits 70%"). Callouts alternate between two rows so neighbours never collide. Glows breathe softly after.
// Items read in the language's direction (right to left in Arabic).
// Source: prompt-motion "jazzen-chen-someone-on-reddit-asked" (reference only: rebuilt as our own code).
ML.define({
  id: "data.status-glow-callouts",
  category: "data",
  name: "Status glows with callouts",
  does: "Coloured glows light up one by one along an edge, each with a spark burst and a labelled callout on a thin leader line.",
  says: ["list", "proof", "tech"],
  energy: 3,
  targets: ["list", "label", "screen"],
  duration: [1.5, 4],
  params: {
    count: { type: "number", range: [2, 6], default: 3 },
    colours: { type: "choice", options: ["status", "accent"], default: "status" },
    sparks: { type: "bool", default: true },
    stagger: { type: "number", range: [0.25, 0.8], default: 0.5, unit: "s" },
    names: { type: "text", default: "" },
    values: { type: "text", default: "" },
  },
  pairs: ["device.phone-screen", "data.spec-rows"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:jazzen-chen-someone-on-reddit-asked", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const mk = (tag, css, parent, text) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const NS = "http://www.w3.org/2000/svg";
    const scene = ctx.scene || ctx.stage, hb = ctx.box(scene);
    const u = Math.min(f.W, f.H) / 1080;
    const kidEls = el && el.getAttribute("data-slot") === "list" ? [...el.children].filter((c) => c.getBoundingClientRect().width > 0) : [];
    const n = kidEls.length >= 2 ? Math.min(6, kidEls.length) : Math.round(ML.clamp(p.count, 2, 6));
    const split = (s) => String(s || "").split("|").map((x) => x.trim()).filter(Boolean);
    let names = split(p.names), values = split(p.values);
    if (!names.length) names = rtl ? ["الرصيد", "رصيد الأسبوع", "الجلسة", "الحدّ", "الطلبات", "الذاكرة"] : ["Balance", "Weekly credits", "Session", "Limit", "Requests", "Memory"];
    if (!values.length) values = rtl ? ["٨٦٫٤٠ ج.م", "٧٠٪", "متوقفة", "٩٠٪", "١٢ / ث", "٤٢٪"] : ["¥86.40", "70%", "Paused", "90%", "12 / s", "42%"];
    // the edge: the target's bottom edge (or its top when there is no room below), else a band across the picture
    const b = el ? ctx.box(el) : { x: f.pic.x + f.pic.w * 0.08, y: f.pic.y + f.pic.h * 0.42, w: f.pic.w * 0.84, h: 4 };
    const below = f.H - (b.y + b.h) > b.y || !el;
    const edgeY = below ? b.y + b.h : b.y, dirY = below ? 1 : -1;
    const room = below ? f.safe.y + f.safe.h - edgeY : edgeY - f.safe.y;
    const row1 = Math.max(70 * u, Math.min(room * 0.25, 120 * u)), row2 = row1 + Math.max(110 * u, Math.min(room * 0.42, 210 * u));
    const statusOf = (i) => (p.colours === "accent" ? ["var(--x-accent)", "var(--x-accent-2)"][i % 2] : ["var(--x-good)", "color-mix(in oklch, var(--x-good) 50%, var(--x-bad))", "var(--x-bad)"][i % 3]);
    const layer = mk("div", `position:absolute;inset:0;z-index:16;pointer-events:none;overflow:visible;will-change:transform`, scene);
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", String(f.W)); svg.setAttribute("height", String(f.H));
    svg.style.cssText = `position:absolute;left:${(-hb.x).toFixed(1)}px;top:${(-hb.y).toFixed(1)}px;overflow:visible`;
    layer.append(svg);
    const items = Array.from({ length: n }, (_, i) => {
      const k = rtl ? n - 1 - i : i;
      // on a list each glow sits under its own item; otherwise evenly along the edge, in reading order
      const kb = kidEls[i] ? ctx.box(kidEls[i]) : null;
      const x = kb ? kb.x + kb.w / 2 : b.x + b.w * ((k + 0.5) / n), c = statusOf(i);
      const gr = Math.max(60 * u, Math.min(b.w / n * 0.55, 150 * u));
      const glow = mk("div", `position:absolute;left:${(x - gr - hb.x).toFixed(1)}px;top:${(edgeY - gr - hb.y).toFixed(1)}px;width:${(gr * 2).toFixed(1)}px;height:${(gr * 2).toFixed(1)}px;border-radius:50%;background:radial-gradient(closest-side, color-mix(in srgb, ${c} 75%, transparent), color-mix(in srgb, ${c} 28%, transparent) 45%, transparent);mix-blend-mode:normal`, layer);
      const core = mk("div", `position:absolute;left:${(x - 7 * u - hb.x).toFixed(1)}px;top:${(edgeY - 7 * u - hb.y).toFixed(1)}px;width:${(14 * u).toFixed(1)}px;height:${(14 * u).toFixed(1)}px;border-radius:50%;background:${c};box-shadow:0 0 ${(18 * u).toFixed(1)}px ${c}`, layer);
      const sparks = p.sparks ? Array.from({ length: 9 }, (_, j) => {
        const s = document.createElementNS(NS, "line");
        s.setAttribute("stroke", c); s.setAttribute("stroke-width", (3 * u).toFixed(2)); s.setAttribute("stroke-linecap", "round");
        svg.append(s);
        const a = (j / 9) * Math.PI * 2 + ML.rnd(i + 1, j + 3) * 0.6, d = (50 + 70 * ML.rnd(i + 7, j + 11)) * u;
        return { s, a, d };
      }) : [];
      const row = i % 2 ? row2 : row1, ly = edgeY + dirY * row;
      const lead = document.createElementNS(NS, "line");
      lead.setAttribute("x1", x.toFixed(1)); lead.setAttribute("y1", (edgeY + dirY * 12 * u).toFixed(1)); lead.setAttribute("x2", x.toFixed(1)); lead.setAttribute("y2", ly.toFixed(1));
      lead.setAttribute("stroke", "var(--x-dim)"); lead.setAttribute("stroke-width", Math.max(1.5, 2 * u).toFixed(2));
      const len = Math.abs(ly - edgeY);
      lead.setAttribute("stroke-dasharray", `${len.toFixed(1)} ${len.toFixed(1)}`);
      svg.append(lead);
      const chip = mk("div", `position:absolute;left:${(x - hb.x).toFixed(1)}px;top:${(ly - hb.y).toFixed(1)}px;translate:-50% ${below ? "0" : "-100%"};display:grid;gap:${(4 * u).toFixed(1)}px;padding:${(12 * u).toFixed(1)}px ${(18 * u).toFixed(1)}px;border-radius:calc(var(--x-radius) * 0.5);background:var(--x-ink);box-shadow:var(--x-shadow);white-space:nowrap;direction:${rtl ? "rtl" : "ltr"}`, layer);
      const top = mk("div", `display:flex;align-items:center;gap:${(10 * u).toFixed(1)}px;font:600 ${(22 * u).toFixed(1)}px/1.2 var(--x-mono-font);color:var(--x-ground);letter-spacing:${rtl ? 0 : "0.04em"}`, chip);
      mk("i", `display:block;width:${(12 * u).toFixed(1)}px;height:${(12 * u).toFixed(1)}px;border-radius:50%;background:${c};flex:none`, top);
      mk("span", "", top, names[i % names.length]);
      mk("div", `font:600 ${(26 * u).toFixed(1)}px/1.2 var(--x-mono-font);color:color-mix(in srgb, ${c} 75%, var(--x-ground));direction:${rtl ? "rtl" : "ltr"}`, chip, values[i % values.length]);
      return { x, glow, core, sparks, lead, len, chip, c };
    });
    // keep every chip inside the frame
    const sc = ctx.stage.getBoundingClientRect().width / (ctx.stage.offsetWidth || 1) || 1;
    for (const it of items) {
      const r = it.chip.getBoundingClientRect(), s0 = ctx.stage.getBoundingClientRect();
      const l = (r.left - s0.left) / sc, rr = (r.right - s0.left) / sc;
      if (l < f.m * 0.5) it.chip.style.marginLeft = `${(f.m * 0.5 - l).toFixed(1)}px`;
      else if (rr > f.W - f.m * 0.5) it.chip.style.marginLeft = `${(f.W - f.m * 0.5 - rr).toFixed(1)}px`;
    }
    const times = items.map((_, i) => at + 0.1 + i * p.stagger);
    times.forEach((s) => ctx.sfx(s, "blip", 0.3));
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        layer.style.opacity = (1 - leave).toFixed(4);
        items.forEach((it, i) => {
          const s = times[i], g = ML.out(t, s, s + 0.35);
          const breathe = t > s + 0.35 ? 0.88 + 0.12 * Math.cos((t - s - 0.35) * Math.PI * 1.4 + i) : 1;
          it.glow.style.opacity = (g * breathe).toFixed(4);
          it.glow.style.scale = (0.4 + 0.6 * g).toFixed(4);
          it.core.style.opacity = g.toFixed(4);
          for (const sp of it.sparks) {
            const q = ML.lin(t, s, s + 0.4), r0 = sp.d * ML.out(t, s, s + 0.4), r1 = r0 * 0.55;
            const on = t >= s && q < 1;
            sp.s.setAttribute("x1", (it.x + Math.cos(sp.a) * r1).toFixed(1)); sp.s.setAttribute("y1", (edgeY + Math.sin(sp.a) * r1).toFixed(1));
            sp.s.setAttribute("x2", (it.x + Math.cos(sp.a) * r0).toFixed(1)); sp.s.setAttribute("y2", (edgeY + Math.sin(sp.a) * r0).toFixed(1));
            sp.s.style.opacity = on ? (1 - q).toFixed(3) : "0";
          }
          const d = ML.ease(t, s + 0.25, s + 0.5);
          it.lead.setAttribute("stroke-dashoffset", (it.len * (1 - d)).toFixed(1));
          it.lead.style.opacity = t >= s + 0.25 ? "1" : "0";
          const c = ML.out(t, s + 0.45, s + 0.7);
          it.chip.style.opacity = c.toFixed(4);
          it.chip.style.scale = (0.9 + 0.1 * c).toFixed(4);
        });
      },
    };
  },
});
