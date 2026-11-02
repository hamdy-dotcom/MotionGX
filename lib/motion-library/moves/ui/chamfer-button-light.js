// Chamfered button light-up: MengTo's corner-lasers "Initialize" button — px 20 / py 8, 12 px mono uppercase with the
// widest tracking, clipped by polygon(10px 0, 100% 0, 100% calc(100% − 10px), calc(100% − 10px) 100%, 0 100%, 0 10px)
// (two corners, or all four), a surface fill with a hairline edge (drawn as an SVG outline so it runs along the chamfers
// too), an overlay gradient(to right, accent / 20 %, transparent) at opacity 0, the label + an arrow. Activate: the overlay
// goes 0 → 1 over 0.5 s, the arrow nudges +3 px, an optional press 0.97 → 1 (0.15 s). RTL mirrors corners, wash and arrow.
// Source: MengTo/Skills web-design/corner-lasers demo (MIT).
ML.define({
  id: "ui.chamfer-button-light",
  category: "ui",
  name: "Chamfered button light-up",
  does: "A small angular button with two clipped corners lights up from its leading edge with an accent wash as if pressed.",
  says: ["tech", "precision", "choice"],
  energy: 2,
  targets: ["card", "label"],
  duration: [0.8, 1.6],
  params: {
    chamfer: { type: "number", range: [6, 30], default: 10, unit: "px" },
    corners: { type: "choice", options: ["2", "4"], default: "2" },
    wash_colour: { type: "text", default: "accent" },
    press: { type: "bool", default: true },
    label: { type: "text" },
  },
  pairs: ["ui.cursor-glide-click"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "click",
  source: { from: "MengTo/Skills:web-design/corner-lasers", license: "MIT", note: "the clipped diagonal button" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080, s = 3 * k; // reference px → stage px (a 12 px web button read on a 1080 frame)
    // on a target it stands where the target stands and says what the target says; alone, centred in the picture region
    const tEl = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const R = tEl ? ctx.box(tEl) : f.pic;
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;display:grid;place-items:center;pointer-events:none;z-index:6;`, host);
    const label = p.label || (tEl && (tEl.firstElementChild || tEl).textContent.trim()) || (rtl ? "ابدأ الآن" : "Initialize");
    const btn = mk("div", `position:relative;padding:${8 * s}px ${20 * s}px;color:var(--x-ink);font:var(--x-label-weight) ${(12 * s).toFixed(1)}px ${rtl ? "var(--x-body-font)" : "var(--x-mono-font)"};letter-spacing:${rtl ? 0 : 0.1}em;text-transform:uppercase;white-space:nowrap;`, layer);
    btn.setAttribute("dir", rtl ? "rtl" : "ltr");
    const surface = mk("div", "position:absolute;inset:0;background:var(--x-panel);", btn);
    const VARS = ["accent", "accent-2", "good", "bad", "ink", "dim", "ring"];
    const wv = String(p.wash_colour || "accent").replace(/^--x-|^var\(--x-|\)$/g, "").trim();
    const wash = `var(--x-${VARS.includes(wv) ? wv : "accent"})`;
    const over = mk("div", `position:absolute;inset:0;background:linear-gradient(to ${rtl ? "left" : "right"}, color-mix(in srgb, ${wash} 28%, transparent), transparent);opacity:0;`, btn);
    const row = mk("span", `position:relative;display:flex;align-items:center;gap:${8 * s}px;`, btn);
    mk("span", "", row, label);
    const A = 14 * s;
    const arrow = mk("span", `display:inline-block;width:${A}px;height:${A}px;flex:none;`, row);
    arrow.innerHTML = `<svg viewBox="0 0 24 24" width="${A}" height="${A}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="display:block;${rtl ? "transform:scaleX(-1)" : ""}"><path d="M4 12h16M14 6l6 6-6 6"/></svg>`;

    // chamfer: measured box → clip polygon + matching outline
    const W = btn.offsetWidth, H = btn.offsetHeight, c = Math.min(p.chamfer * s * 0.6, H * 0.45);
    let pts = p.corners === "4"
      ? [[c, 0], [W - c, 0], [W, c], [W, H - c], [W - c, H], [c, H], [0, H - c], [0, c]]
      : [[c, 0], [W, 0], [W, H - c], [W - c, H], [0, H], [0, c]];
    if (rtl) pts = pts.map(([x, y]) => [W - x, y]);
    btn.style.clipPath = `polygon(${pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(", ")})`;
    const edge = doc.createElementNS(NS, "svg");
    edge.setAttribute("width", W); edge.setAttribute("height", H);
    edge.style.cssText = "position:absolute;inset:0;overflow:visible;";
    const poly = doc.createElementNS(NS, "polygon");
    poly.setAttribute("points", pts.map((q) => q.join(",")).join(" "));
    poly.setAttribute("fill", "none"); poly.setAttribute("stroke", "color-mix(in srgb, var(--x-ink) 14%, transparent)"); poly.setAttribute("stroke-width", String(Math.max(2, 2 * k)));
    edge.append(poly);
    btn.insertBefore(edge, row);

    // timing: arrive on the look's motion, light up on the press
    const D = end - at, tOn = at + Math.min(0.3, Math.max(0.1, D * 0.25)), litDur = Math.min(0.5, D * 0.45);
    ctx.sfx(tOn, "click", 0.4);
    return {
      draw(t) {
        ML.show(layer, t, at, end - 0.22, { dur: Math.min(0.3, ctx.look.dur, D * 0.25) });
        if (tEl) tEl.style.visibility = t >= at && t < end ? "hidden" : "";
        const lit = ML.ease(t, tOn, tOn + litDur);
        over.style.opacity = lit.toFixed(4);
        poly.setAttribute("stroke", `color-mix(in srgb, ${wash} ${(lit * 55).toFixed(1)}%, color-mix(in srgb, var(--x-ink) 14%, transparent))`);
        arrow.style.translate = `${((rtl ? -1 : 1) * 3 * s * ML.out(t, tOn, tOn + 0.35)).toFixed(2)}px 0`;
        const pr = p.press ? ML.lin(t, tOn, tOn + 0.05) * (1 - ML.out(t, tOn + 0.05, tOn + 0.2)) : 0;
        btn.style.scale = pr > 0 ? (1 - 0.03 * pr).toFixed(4) : "none";
      },
    };
  },
});
