// Connector message delivery: a curved line draws from a card to a side panel (stroke-dashoffset on a path of length 1,
// 0.4 s), a small mono chip ("8:00 TRIGGER") rides along it at constant speed (arc-length sampled once in setup, eased
// in-out over 0.5 s), snaps into the panel's empty list slot (0.15 s), the slot's checkbox fills with a drawn check
// (0.15 s) and the panel's timeline dot fills. Wide shapes run card → panel left to right (right to left in Arabic);
// tall shapes drop the line from the card's foot into the panel's side.
// Source: prompt-motion 0xnfrith "opus 5.5 animation created" (reference only — our own rebuild).
ML.define({
  id: "ui.connector-message-delivery",
  category: "ui",
  name: "Connector line delivers a message",
  does: "A curved line draws from the card to a side panel and a small message chip rides along it, landing in the panel's list where a checkbox ticks.",
  says: ["connection", "flow", "step", "proof"],
  energy: 3,
  targets: ["card", "list", "screen"],
  duration: [1, 2],
  params: {
    curvature: { type: "number", range: [0.1, 0.6], default: 0.3 },
    chip_text: { type: "text", default: "8:00 TRIGGER" },
    rows: { type: "number", range: [1, 4], default: 2 },
  },
  pairs: ["ui.cursor-glide-click", "camera.push-in"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "click.confirm",
  source: { from: "prompt-motion:0xnfrith-opus-5-5-animation-created", license: "reference", note: "our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); parent.append(e); return e; };
    // where it lives: inside a card / screen the director gave, else the picture region of the scene
    const own = !ctx.el || ctx.el === ctx.stage;
    const host = ctx.scene || ctx.stage;
    const layer = mk("div", "position:absolute;inset:0;pointer-events:none;z-index:6;", host);
    const R = own ? f.pic : ctx.box(ctx.el);
    const tall = R.h > R.w * 0.9;
    const bar = (w, h, parent, c = "var(--x-line)") => mk("div", `width:${w};height:${(h * k).toFixed(1)}px;border-radius:999px;background:${c};flex:none;`, parent);
    const radius = "calc(var(--x-radius) * 0.55)";
    const surface = `position:absolute;box-sizing:border-box;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:${radius};box-shadow:var(--x-shadow);`;

    // the source card (the director's card when it gave one)
    let card;
    const cw = tall ? R.w * 0.62 : R.w * 0.36, pw = tall ? R.w * 0.64 : R.w * 0.4;
    if (own) {
      card = mk("div", `${surface}width:${cw.toFixed(1)}px;padding:${(30 * k).toFixed(1)}px;display:flex;flex-direction:column;gap:${(18 * k).toFixed(1)}px;`, layer);
      const head = mk("div", `display:flex;align-items:center;gap:${(14 * k).toFixed(1)}px;`, card);
      const ic = mk("div", `width:${(44 * k).toFixed(1)}px;height:${(44 * k).toFixed(1)}px;border-radius:50%;background:var(--x-accent);flex:none;display:grid;place-items:center;`, head);
      const clock = sv("svg", { viewBox: "0 0 24 24", width: (26 * k).toFixed(1), height: (26 * k).toFixed(1) }, ic);
      sv("circle", { cx: 12, cy: 12, r: 8, fill: "none", stroke: "var(--x-accent-ink)", "stroke-width": 2 }, clock);
      sv("path", { d: "M12 8 V12 L15 14", fill: "none", stroke: "var(--x-accent-ink)", "stroke-width": 2, "stroke-linecap": "round" }, clock);
      bar("46%", 16, head, "var(--x-ink)");
      bar("88%", 12, card); bar("64%", 12, card);
    } else card = ctx.el;

    // the side panel: a timeline column, done rows, and the empty slot the chip lands in
    const panel = mk("div", `${surface}width:${pw.toFixed(1)}px;padding:${(28 * k).toFixed(1)}px;display:flex;flex-direction:column;gap:${(20 * k).toFixed(1)}px;`, own ? layer : host);
    bar("38%", 14, panel, "var(--x-ink)");
    const rowCss = `display:flex;align-items:center;gap:${(16 * k).toFixed(1)}px;min-height:${(54 * k).toFixed(1)}px;position:relative;`;
    const dot = (parent, on) => mk("div", `width:${(14 * k).toFixed(1)}px;height:${(14 * k).toFixed(1)}px;border-radius:50%;box-sizing:border-box;border:${(2 * k).toFixed(1)}px solid var(--x-dim);background:${on ? "var(--x-dim)" : "transparent"};flex:none;`, parent);
    const box = (parent) => {
      const b = mk("div", `width:${(32 * k).toFixed(1)}px;height:${(32 * k).toFixed(1)}px;border-radius:${(7 * k).toFixed(1)}px;box-sizing:border-box;border:${(2 * k).toFixed(1)}px solid var(--x-line);flex:none;display:grid;place-items:center;`, parent);
      const s = sv("svg", { viewBox: "0 0 24 24", width: (22 * k).toFixed(1), height: (22 * k).toFixed(1) }, b);
      const c = sv("path", { d: "M5 12.5 L10 17 L19 7", fill: "none", stroke: "var(--x-accent-ink)", "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round", pathLength: 1, "stroke-dasharray": 1 }, s);
      return { b, c };
    };
    const rail = mk("div", `position:absolute;width:${(2 * k).toFixed(1)}px;background:var(--x-line);`, panel);
    const done = Math.round(p.rows);
    for (let i = 0; i < done; i++) {
      const r = mk("div", rowCss, panel); dot(r, true);
      const b = box(r); b.b.style.background = "var(--x-good)"; b.b.style.borderColor = "var(--x-good)"; b.c.setAttribute("stroke-dashoffset", "0");
      bar(`${(46 + 20 * ML.rnd(i, 3)).toFixed(0)}%`, 12, r);
    }
    const last = mk("div", rowCss, panel), slotDot = dot(last, false), slotBox = box(last);
    const slot = mk("div", `flex:none;border:${(2 * k).toFixed(1)}px dashed var(--x-line);border-radius:${(10 * k).toFixed(1)}px;box-sizing:border-box;`, last);

    // the chip that travels
    const chip = mk("div", `position:absolute;left:0;top:0;white-space:nowrap;unicode-bidi:plaintext;font:var(--x-label-weight) ${(22 * k).toFixed(1)}px ${ML.ARABIC.test(p.chip_text || "") ? "var(--x-body-font)" : "var(--x-mono-font)"};letter-spacing:${ML.ARABIC.test(p.chip_text || "") ? "0" : "0.06em"};color:var(--x-ink);background:var(--x-panel);border:${(2 * k).toFixed(1)}px solid var(--x-ink);border-radius:${(10 * k).toFixed(1)}px;padding:${(8 * k).toFixed(1)}px ${(14 * k).toFixed(1)}px;z-index:2;`, layer, p.chip_text || "8:00 TRIGGER");
    slot.style.width = (chip.offsetWidth + 8 * k).toFixed(1) + "px";
    slot.style.height = (chip.offsetHeight + 8 * k).toFixed(1) + "px";

    // place: card on the reading side, panel across; vertically centred in the region
    const ch = card.offsetHeight, ph = panel.offsetHeight;
    const place = (e, x, y, w) => { e.style.left = (rtl ? R.x + R.w - x - w : R.x + x).toFixed(1) + "px"; e.style.top = (R.y + y).toFixed(1) + "px"; };
    if (own) {
      if (tall) { const gap = Math.max(60 * k, (R.h - ch - ph) * 0.45), top = Math.max(0, (R.h - ch - ph - gap) / 2); place(card, 0, top, cw); place(panel, R.w - pw, top + ch + gap, pw); }
      else { place(card, 0, (R.h - ch) / 2 - R.h * 0.08, cw); place(panel, R.w - pw, (R.h - ph) / 2 + R.h * 0.04, pw); }
    } else {
      // beside the director's card, on the side with more room
      const cb = R, roomR = f.W - (cb.x + cb.w), roomL = cb.x, right = rtl ? roomL < roomR * 0.6 : roomR >= roomL;
      const x = right ? cb.x + cb.w + Math.max(60 * k, roomR * 0.2) : cb.x - Math.max(60 * k, roomL * 0.2) - pw;
      panel.style.left = Math.max(0, Math.min(f.W - pw, x)).toFixed(1) + "px"; panel.style.top = (cb.y + cb.h / 2 - ph / 2).toFixed(1) + "px";
    }
    const B = (e) => ctx.box(e);
    const cB = B(card), pB = B(panel), lB = B(last), sB = B(slot), fd = B(panel.querySelector("div:nth-child(3) > div") || slotDot), ld = B(slotDot);
    rail.style.left = (fd.x - pB.x + fd.w / 2 - k).toFixed(1) + "px"; rail.style.top = (fd.y - pB.y + fd.h / 2).toFixed(1) + "px";
    rail.style.height = Math.max(0, ld.y - fd.y).toFixed(1) + "px";
    const panelOnRight = pB.x + pB.w / 2 > cB.x + cB.w / 2;
    const sx = panelOnRight ? 1 : -1;
    let A, dA;
    if (own && tall) { A = { x: cB.x + cB.w * (rtl ? 0.36 : 0.64), y: cB.y + cB.h }; dA = { x: 0, y: 1 }; }
    else { A = { x: panelOnRight ? cB.x + cB.w : cB.x, y: cB.y + cB.h / 2 }; dA = { x: sx, y: 0 }; }
    const Bp = { x: panelOnRight ? pB.x : pB.x + pB.w, y: lB.y + lB.h / 2 }, dB = { x: sx, y: 0 };
    const L = Math.hypot(Bp.x - A.x, Bp.y - A.y), c = L * p.curvature * 1.6;
    const P1 = { x: A.x + dA.x * c, y: A.y + dA.y * c }, P2 = { x: Bp.x - dB.x * c, y: Bp.y - dB.y * c };
    const svg = sv("svg", { viewBox: `0 0 ${f.W} ${f.H}`, width: f.W, height: f.H, style: "position:absolute;left:0;top:0;overflow:visible;z-index:1;" }, layer);
    layer.insertBefore(svg, layer.firstChild);
    const line = sv("path", { d: `M${A.x.toFixed(1)} ${A.y.toFixed(1)} C${P1.x.toFixed(1)} ${P1.y.toFixed(1)} ${P2.x.toFixed(1)} ${P2.y.toFixed(1)} ${Bp.x.toFixed(1)} ${Bp.y.toFixed(1)}`, fill: "none", stroke: "var(--x-ink)", "stroke-width": (3 * k).toFixed(2), "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": 1 }, svg);
    const ends = [A, Bp].map((q) => sv("circle", { cx: q.x.toFixed(1), cy: q.y.toFixed(1), r: (6 * k).toFixed(1), fill: "var(--x-ink)" }, svg));
    // the bezier sampled by arc length once, so the chip rides at an even speed
    const N = 240, pts = [], lens = [0];
    for (let i = 0; i <= N; i++) { const u = i / N, v = 1 - u; pts.push({ x: v * v * v * A.x + 3 * v * v * u * P1.x + 3 * v * u * u * P2.x + u * u * u * Bp.x, y: v * v * v * A.y + 3 * v * v * u * P1.y + 3 * v * u * u * P2.y + u * u * u * Bp.y }); if (i) lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)); }
    const along = (s) => { const target = s * lens[N]; let i = 1; while (i < N && lens[i] < target) i++; const a = lens[i - 1], b = lens[i], q = b > a ? (target - a) / (b - a) : 0; return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * q, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * q }; };
    const cwid = chip.offsetWidth, chei = chip.offsetHeight, home = { x: sB.x + sB.w / 2, y: sB.y + sB.h / 2 };

    // beats
    const T = { show: at, draw: at + 0.3, ride: at + 0.7, snap: at + 1.2, tick: at + 1.35, dot: at + 1.5 };
    ctx.sfx(T.draw, "tap", 0.3);
    ctx.sfx(T.tick, "click.confirm", 0.55);
    const surfaces = own ? [card, panel] : [panel];
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        layer.style.opacity = String(1 - leave);
        if (!own) panel.style.opacity = String(1 - leave);
        surfaces.forEach((e, i) => { const u = ML.land(t, T.show + i * 0.08, T.show + i * 0.08 + 0.35); e.style.opacity = String(u * (1 - leave)); e.style.translate = `0 ${((1 - u) * 24 * k).toFixed(2)}px`; });
        const d = ML.ease(t, T.draw, T.draw + 0.4);
        line.setAttribute("stroke-dashoffset", (1 - d).toFixed(4));
        ends[0].setAttribute("opacity", ML.clamp((t - T.draw) / 0.08).toFixed(3));
        ends[1].setAttribute("opacity", (d >= 1 ? 1 : 0).toString());
        // chip: pops at the card's edge, rides the line, snaps into the slot
        const pop = ML.back(t, T.draw, T.draw + 0.25);
        let pos;
        if (t < T.snap) pos = along(ML.ease(t, T.ride, T.snap));
        else { const u = ML.out(t, T.snap, T.snap + 0.15); pos = { x: Bp.x + (home.x - Bp.x) * u, y: Bp.y + (home.y - Bp.y) * u }; }
        chip.style.opacity = (t < T.draw ? 0 : ML.clamp((t - T.draw) / 0.1)).toFixed(3);
        chip.style.transform = `translate(${(pos.x - cwid / 2).toFixed(2)}px, ${(pos.y - chei / 2).toFixed(2)}px) scale(${(0.7 + 0.3 * Math.min(1, pop)).toFixed(4)})`;
        slot.style.opacity = (1 - ML.lin(t, T.snap, T.snap + 0.15)).toFixed(3);
        // the checkbox fills and its check draws, then the timeline dot fills
        const tk = ML.lin(t, T.tick, T.tick + 0.15);
        slotBox.b.style.background = `color-mix(in srgb, var(--x-good) ${(tk * 100).toFixed(1)}%, transparent)`;
        slotBox.b.style.borderColor = tk > 0 ? "var(--x-good)" : "var(--x-line)";
        slotBox.c.setAttribute("stroke-dashoffset", (1 - ML.out(t, T.tick + 0.03, T.tick + 0.18)).toFixed(4));
        const dt = ML.lin(t, T.dot, T.dot + 0.15);
        slotDot.style.background = `color-mix(in srgb, var(--x-accent) ${(dt * 100).toFixed(1)}%, transparent)`;
        slotDot.style.borderColor = dt > 0 ? "var(--x-accent)" : "var(--x-dim)";
        slotDot.style.scale = (1 + 0.35 * Math.sin(Math.PI * dt)).toFixed(4);
      },
    };
  },
});
