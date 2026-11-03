// Light point splits into rules, monogram draws: a small glowing point sits on a short hairline (0–0.5 s, the line at
// .5); the hairline doubles and the two rules part to ±90 while they grow 140 → 260 wide (0.5–0.9 s, power3.inOut);
// between them the monogram draws in outline (dash offset, a 1.5 px dim stroke, glyph by glyph, 0.9–2.0 s), then its
// fill fades in and the outline fades away (2.0–2.4 s). Under the bottom rule a mono label scrambles through seeded
// strings and resolves, left to right, into `label` (the domain: pass it — one is never made up; without it the Latin
// name is used, an Arabic label stays whole, unscrambled and unspaced). All times scale with `duration`; sizes are the web
// sizes relative to the frame. The monogram: `letters`, else the logo's initials (an Arabic name stays one joined word,
// fitted between the rules). `backing`: as in the source it is a full-frame sting, the ground across the frame and the
// mark at its centre; off, it draws straight on the scene at the logo's place. A logo with no name and no `letters`
// (a bare picture) is left alone: no letter is guessed.
// Source: prompt-motion "andginja-i-gave-claude-opus" (reference only — rebuilt as our own code).
ML.define({
  id: "element.monogram-rule-draw",
  category: "element",
  name: "Light point splits into rules, monogram draws",
  does: "A glowing point on a line splits into top and bottom rules and a monogram draws in outline between them before filling.",
  says: ["brand", "arrival", "luxury"],
  energy: 2,
  targets: ["logo"],
  duration: [2, 3.5],
  params: {
    fill: { type: "text", default: "ink" },
    scramble_label: { type: "bool", default: true },
    duration: { type: "number", range: [1.8, 3], default: 2.4, unit: "s" },
    letters: { type: "text", default: "" },
    label: { type: "text", default: "" },
    face: { type: "choice", options: ["serif", "head"], default: "serif" },
    backing: { type: "bool", default: true },
  },
  pairs: ["element.ring-stroke-logo-reveal", "text-in.punchline"],
  avoid: ["urgency", "playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "prompt-motion:andginja-i-gave-claude-opus", license: "reference", note: "technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, end, f } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const D = ML.clamp(p.duration, 1.8, 3) / 2.4, T = (x) => at + x * D;
    const k = (Math.min(f.W, f.H) / 1080) * 1.9;
    const FILL = { ink: "var(--x-ink)", accent: "var(--x-accent)", "accent-2": "var(--x-accent-2)", panel: "var(--x-panel)", ground: "var(--x-ground)", white: "var(--x-accent-ink)", good: "var(--x-good)" };
    const fill = FILL[String(p.fill || "ink").trim()] || FILL.ink;

    // the monogram's letters and the label
    const name = (own ? own.textContent || own.getAttribute("alt") || own.getAttribute("aria-label") || "" : "").trim();
    if (!name && !String(p.letters || "").trim()) return null;
    let letters = String(p.letters || "").trim();
    if (!letters) {
      const ws = name.split(/\s+/).filter(Boolean);
      letters = ML.ARABIC.test(ws[0]) ? ws[0] : ws.slice(0, 2).map((w) => Array.from(w)[0].toUpperCase()).join("");
    }
    const arabic = ML.ARABIC.test(letters);
    const glyphs = arabic ? [letters] : Array.from(letters);
    let label = String(p.label || "").trim();
    if (!label && name && !ML.ARABIC.test(name)) label = name.toLowerCase();
    const labelAr = ML.ARABIC.test(label);

    // the overlay: centred in the frame (the full-frame sting), or on the logo and kept in the frame
    const ruleW0 = 140 * k, ruleW = 260 * k, half = 90 * k;
    let fs = Math.min(half * 2 * 0.78, (ruleW * 0.95) / Math.max(1, glyphs.length * (arabic ? 1.2 : 0.72)));
    const labS = 13 * k;
    const W = ruleW * 1.15, H = half * 2 + labS * 5;
    const ob = own && !p.backing ? ctx.box(own) : { x: f.W / 2, y: f.H / 2, w: 0, h: 0 };
    const cx = ML.clamp(ob.x + ob.w / 2, W / 2 + 10, f.W - W / 2 - 10), cy = ML.clamp(ob.y + ob.h / 2, half + labS + 10, f.H - H + half + labS - 10);
    const svg = doc.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `${(-W / 2).toFixed(2)} ${(-half - labS).toFixed(2)} ${W.toFixed(2)} ${H.toFixed(2)}`);
    svg.style.cssText = `position:absolute;left:${Math.round(cx - W / 2)}px;top:${Math.round(cy - half - labS)}px;width:${W.toFixed(1)}px;height:${H.toFixed(1)}px;overflow:visible;z-index:6;pointer-events:none;visibility:hidden;will-change:transform;background-image:linear-gradient(transparent, transparent);`; // own layer
    host.append(svg);
    const el = (tag, attrs, parent = svg) => { const e = doc.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); parent.append(e); return e; };
    // the ground across the whole frame (the svg draws 1:1 in stage px, its 0,0 at cx,cy)
    const plate = p.backing ? el("rect", { x: (-cx - 2).toFixed(2), y: (-cy - 2).toFixed(2), width: f.W + 4, height: f.H + 4, fill: "var(--x-ground)" }) : null;
    const ruleA = el("line", { stroke: "var(--x-ink)", "stroke-width": Math.max(1, k * 0.8).toFixed(2), "stroke-linecap": "round" });
    const ruleB = el("line", { stroke: "var(--x-ink)", "stroke-width": Math.max(1, k * 0.8).toFixed(2), "stroke-linecap": "round" });
    const dot = el("circle", { r: (2.2 * k).toFixed(2), fill: "var(--x-accent)" });
    dot.style.filter = `drop-shadow(0 0 ${(6 * k).toFixed(1)}px var(--x-accent)) drop-shadow(0 0 ${(14 * k).toFixed(1)}px var(--x-accent))`;
    // monogram glyphs, each its own outline drawn by dash offset
    const g = el("g", {});
    const tmp = el("text", { "font-size": fs.toFixed(2), style: `font-family:var(${p.face === "head" ? "--x-head-font" : "--x-serif-font"});font-weight:${p.face === "head" ? "var(--x-head-weight)" : 400}` }, g);
    let widths = glyphs.map((c) => { tmp.textContent = c; try { return tmp.getComputedTextLength(); } catch (e) { return fs * 0.6; } });
    tmp.remove();
    // a long Arabic word (or many letters): fitted between the rules
    const over = widths.reduce((a, b) => a + b, 0) * 1.04 / (ruleW * 0.95);
    if (over > 1) { fs /= over; widths = widths.map((w) => w / over); }
    const track = fs * 0.04, totalW = widths.reduce((a, b) => a + b, 0) + track * (glyphs.length - 1);
    let x = -totalW / 2;
    const dashL = fs * (arabic ? 9 : 4.6);
    const gl = glyphs.map((c, i) => {
      const t = el("text", { x: (x + widths[i] / 2).toFixed(2), y: (fs * 0.34).toFixed(2), "text-anchor": "middle", "font-size": fs.toFixed(2), fill: fill, "fill-opacity": "0", stroke: "var(--x-dim)", "stroke-width": (1.5 * k * 0.7).toFixed(2), "stroke-dasharray": `${dashL.toFixed(1)} ${dashL.toFixed(1)}`, "stroke-dashoffset": dashL.toFixed(1), style: `font-family:var(${p.face === "head" ? "--x-head-font" : "--x-serif-font"});font-weight:${p.face === "head" ? "var(--x-head-weight)" : 400};direction:${arabic ? "rtl" : "ltr"}` }, g);
      t.textContent = c; x += widths[i] + track;
      return t;
    });
    const lab = label ? el("text", { x: 0, y: (half + labS * 2.6).toFixed(2), "text-anchor": "middle", "font-size": labS.toFixed(2), fill: "var(--x-dim)", style: `font-family:var(--x-mono-font);font-weight:500;letter-spacing:${labelAr ? 0 : "0.22em"};direction:${labelAr ? "rtl" : "ltr"}` }) : null;

    const drawA = T(0.9), drawB = T(2.0), n = gl.length, per = (drawB - drawA) / (n * 0.6 + 0.4);
    const gStart = gl.map((_, i) => drawA + i * per * 0.6);
    const done = T(2.4), leave = Math.max(done + 0.4, end - 0.3);
    const CH = "abcdefghijklmnopqrstuvwxyz0123456789./-";
    const p3 = (t, a, b) => { const u = ML.lin(t, a, b); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
    ctx.sfx(at, "blip", 0.18);
    ctx.sfx(T(0.5), "whoosh.soft", 0.18);
    ctx.sfx(drawA, "swell", 0.22);
    ctx.sfx(T(2.0), "bell", 0.22);

    return {
      draw(t) {
        svg.style.visibility = t < at - 1e-6 ? "hidden" : "visible";
        const q = ML.ease(t, leave, leave + 0.3);
        if (own) own.style.visibility = t < at - 1e-6 || (q >= 1 && end < ctx.to - 0.01) ? "" : "hidden"; // back when the move ends before its scene
        svg.style.opacity = (1 - q).toFixed(4);
        // repaint the whole mark every frame, so a frame rasters the same whatever frame came before
        svg.style.backgroundPosition = `${((t * 1000) % 7).toFixed(3)}px 0`;
        if (plate) plate.setAttribute("opacity", ML.ease(t, at, at + 0.2).toFixed(4));
        // the point on its hairline, then the split
        const a0 = ML.ease(t, at, T(0.25)), sp = p3(t, T(0.5), T(0.9));
        const w = ruleW0 + (ruleW - ruleW0) * sp, y = half * sp;
        const ro = (0.5 * a0).toFixed(4);
        [[ruleA, -y], [ruleB, y]].forEach(([r, yy]) => { r.setAttribute("x1", (-w / 2).toFixed(2)); r.setAttribute("x2", (w / 2).toFixed(2)); r.setAttribute("y1", yy.toFixed(2)); r.setAttribute("y2", yy.toFixed(2)); r.setAttribute("stroke-opacity", ro); });
        ruleB.style.opacity = sp > 0.001 ? "1" : "0";
        const glow = a0 * (1 - ML.ease(t, T(0.5), T(0.75))) * (0.85 + 0.15 * Math.sin((t - at) * 18));
        dot.setAttribute("opacity", Math.max(0, glow).toFixed(4));
        dot.setAttribute("r", (2.2 * k * (1 + 0.6 * sp)).toFixed(2));
        // the outline draws glyph by glyph, then the fill comes and the outline goes
        const fl = ML.ease(t, T(2.0), T(2.4));
        gl.forEach((e, i) => {
          const d = ML.ease(t, gStart[i], gStart[i] + per);
          e.setAttribute("stroke-dashoffset", (dashL * (1 - d)).toFixed(2));
          e.setAttribute("stroke-opacity", (d > 0 ? 1 - fl : 0).toFixed(4));
          e.setAttribute("fill-opacity", fl.toFixed(4));
        });
        // the label: scrambles, then resolves left to right
        if (lab) {
          const la = ML.ease(t, T(0.9), T(1.2));
          lab.setAttribute("opacity", la.toFixed(4));
          const chars = Array.from(label);
          if (!p.scramble_label || labelAr) lab.textContent = label;
          else {
            const r = ML.lin(t, T(1.3), T(2.2)), fixed = Math.floor(r * chars.length + 1e-6), tick = Math.floor((t - at) * 24);
            lab.textContent = chars.map((c, i) => (i < fixed || c === "." ? c : CH[Math.floor(ML.rnd(i + 1, tick + 7) * CH.length)])).join("");
          }
        }
      },
    };
  },
});
