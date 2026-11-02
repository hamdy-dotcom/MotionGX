// Card carousel / track slide: a flex track of tall cards (35% of the width on 16:9, 85% on 9:16) glides in — each card
// x 40 px → 0 with opacity, 0.8 s ease-out-quart, 0.12 s stagger — then advances card by card as if the next arrow was
// tapped: the round skeuomorphic arrow presses (y −2 px → 0, 0.15 s), the track moves one card + gap over 0.75 s
// power3.inOut and holds; the active card is full strength, the rest sit back a little. Frames: MengTo's white frame
// (8 px pad, 32 px radius, white → off-white gradient, inset highlight, soft shadow, inner picture at radius 24 px, caption
// + muted sub), the 1 px gradient border, or plain. Edges fade through an alpha mask. RTL pans the other way.
// Sources: MengTo/Skills web-design/dither-laser-dark-mode + css-border-gradient demos (MIT) — framed card, 1 px
// gradient border, skeuomorphic round buttons.
ML.define({
  id: "ui.card-carousel",
  category: "ui",
  name: "Card carousel / track slide",
  does: "A row of tall cards glides in with a stagger, then the track advances card by card as if someone tapped the next arrow.",
  says: ["list", "choice", "luxury", "flow"],
  energy: 2,
  targets: ["card", "list", "image"],
  duration: [1.5, 6],
  params: {
    cards: { type: "number", range: [2, 6], default: 4 },
    direction: { type: "choice", options: ["ltr", "rtl"], default: "ltr" },
    frame: { type: "choice", options: ["gradient-border", "framed-white", "plain"], default: "framed-white" },
    hold: { type: "number", range: [0.7, 2], default: 1.5, unit: "s" },
    arrow_press: { type: "bool", default: true },
    edge_fade: { type: "bool", default: true },
  },
  pairs: ["ui.cursor-glide-click", "camera.push-in"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:web-design/dither-laser-dark-mode", license: "MIT", note: "framed card + skeuomorphic buttons; 1 px gradient border from web-design/css-border-gradient" },
  setup(ctx) {
    const { p, at, end, f } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const rtl = ctx.rtl || p.direction === "rtl";
    const dir = rtl ? -1 : 1;
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080;
    const n = Math.round(ML.clamp(p.cards, 2, 6));
    // the track runs the full width of the stage (it bleeds past the edges), in the picture band
    const band = { x: 0, y: f.pic.y, w: f.W, h: f.pic.h };
    const layer = mk("div", `position:absolute;left:0;top:${band.y}px;width:${band.w}px;height:${band.h}px;pointer-events:none;z-index:6;overflow:hidden;`, host);
    layer.setAttribute("dir", rtl ? "rtl" : "ltr");
    if (p.edge_fade) { const m = `linear-gradient(to right, transparent 0, #000 ${f.m}px, #000 calc(100% - ${f.m}px), transparent 100%)`; layer.style.maskImage = m; layer.style.webkitMaskImage = m; }

    const btnS = 48 * 2 * k, top = p.arrow_press ? btnS + 28 * k : 0;
    const cw0 = f.wide ? band.w * 0.35 : f.tall ? band.w * 0.85 - f.m : band.w * 0.6;
    const availH = band.h - top - 8 * k;
    const capH = 96 * k;
    const cw = Math.min(cw0, (availH - capH) / 1.1), ch = Math.min(availH, cw * 1.1 + capH);
    const gap = 24 * 1.6 * k;
    const track = mk("div", `position:absolute;top:${top}px;inset-inline-start:${f.m}px;display:flex;gap:${gap}px;height:${ch}px;`, layer);

    const EN = ["Morning", "Studio", "Field notes", "Evening", "Harbor", "Atlas"], AR = ["الصباح", "الاستوديو", "ملاحظات", "المساء", "الميناء", "الأطلس"];
    const pad = p.frame === "framed-white" ? 8 * 2 * k : p.frame === "gradient-border" ? Math.max(1, k * 1.5) : 0;
    const cards = [];
    for (let i = 0; i < n; i++) {
      let outer, inner;
      if (p.frame === "framed-white") {
        outer = mk("div", `flex:none;width:${cw}px;height:${ch}px;box-sizing:border-box;padding:${pad}px;border-radius:var(--x-radius);background:linear-gradient(180deg, var(--x-panel) 0%, var(--x-panel-2) 100%);box-shadow:inset 0 2px 4px color-mix(in srgb, var(--x-panel) 90%, transparent), inset 0 -1px 2px color-mix(in srgb, var(--x-ink) 4%, transparent), var(--x-shadow);display:flex;flex-direction:column;position:relative;`, track);
        mk("div", "position:absolute;top:0;left:10%;right:10%;height:1px;background:linear-gradient(90deg, transparent, var(--x-panel), transparent);opacity:.8;", outer);
        inner = outer;
      } else if (p.frame === "gradient-border") {
        outer = mk("div", `flex:none;width:${cw}px;height:${ch}px;box-sizing:border-box;padding:${pad}px;border-radius:var(--x-radius);background:linear-gradient(145deg, color-mix(in srgb, var(--x-ink) 22%, transparent) 0%, color-mix(in srgb, var(--x-ink) 3%, transparent) 100%);`, track);
        inner = mk("div", `width:100%;height:100%;box-sizing:border-box;padding:${12 * k}px;border-radius:calc(var(--x-radius) - ${pad}px);background:var(--x-panel);display:flex;flex-direction:column;`, outer);
      } else {
        outer = mk("div", `flex:none;width:${cw}px;height:${ch}px;display:flex;flex-direction:column;`, track);
        inner = outer;
      }
      // the picture: a painted gradient tile (no photos), its own hue mix per card
      const a = Math.round(25 + ML.rnd(i, 3) * 60), b = Math.round(ML.rnd(i, 7) * 100);
      const pic = mk("div", `flex:1;min-height:0;border-radius:calc(var(--x-radius) * 0.75);position:relative;overflow:hidden;background:linear-gradient(${Math.round(120 + ML.rnd(i, 1) * 90)}deg, color-mix(in srgb, var(--x-accent) ${100 - a}%, var(--x-ink)) 0%, color-mix(in srgb, var(--x-accent-2) ${b}%, var(--x-panel-2)) 100%);`, inner);
      const r = cw * (0.25 + ML.rnd(i, 5) * 0.2);
      mk("div", `position:absolute;width:${r * 2}px;height:${r * 2}px;border-radius:50%;left:${(ML.rnd(i, 9) * 60).toFixed(1)}%;top:${(10 + ML.rnd(i, 11) * 40).toFixed(1)}%;background:color-mix(in srgb, var(--x-panel) 45%, transparent);`, pic);
      const cap = mk("div", `flex:none;padding:${14 * k}px ${8 * k}px ${4 * k}px;`, inner);
      mk("div", `font:600 ${(16 * 2 * k).toFixed(1)}px/1.25 var(--x-body-font);color:var(--x-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`, cap, (rtl ? AR : EN)[i]);
      mk("div", `font:${(12 * 2 * k).toFixed(1)}px/1.3 var(--x-label-font);letter-spacing:var(--x-label-track);color:var(--x-dim);`, cap, `0${i + 1} / 0${n}`);
      // the resting cards sit back under a veil of the ground (the card itself stays opaque)
      const veil = mk("div", "position:absolute;inset:0;border-radius:var(--x-radius);background:var(--x-ground);pointer-events:none;", outer);
      if (getComputedStyle(outer).position === "static") outer.style.position = "relative";
      cards.push({ outer, veil });
    }

    // arrows (top end corner): prev and next, round skeuomorphic
    let next = null;
    if (p.arrow_press) {
      const row = mk("div", `position:absolute;top:0;inset-inline-end:${f.m}px;display:flex;gap:${12 * k}px;`, layer);
      const arrowBtn = (pts) => {
        const b = mk("div", `width:${btnS}px;height:${btnS}px;border-radius:50%;display:grid;place-items:center;color:var(--x-ink);background:linear-gradient(180deg, var(--x-panel) 0%, var(--x-panel-2) 100%);box-shadow:inset 0 1px 1px color-mix(in srgb, var(--x-panel) 90%, transparent), 0 ${4 * k}px ${10 * k}px color-mix(in srgb, var(--x-ink) 8%, transparent);border:1px solid var(--x-line);`, row);
        b.innerHTML = `<svg viewBox="0 0 24 24" width="${btnS * 0.42}" height="${btnS * 0.42}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${pts}"/></svg>`;
        return b;
      };
      // in RTL "next" points left; the row itself is mirrored by dir
      arrowBtn(rtl ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6").style.opacity = "0.55";
      next = arrowBtn(rtl ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6");
    }

    // timing: entrance, then one advance per (move + hold) while there is room
    const qOut = ML.bezier(0.25, 1, 0.5, 1);
    const ent = at + 0.8 + 0.12 * (n - 1);
    const MOVE = 0.75;
    const first = ent + Math.min(0.5, p.hold * 0.4);
    const steps = [];
    for (let s = 0; s < n - 1; s++) { const ts = first + s * (MOVE + p.hold); if (ts + MOVE > end - 0.35) break; steps.push(ts); }
    const pitch = cw + gap;
    const p3 = (t, a, b) => { const x = ML.lin(t, a, b); return x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2; };
    const p4 = (t, a, b) => { const x = ML.lin(t, a, b); return x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2; };
    ctx.sfx(at, "whoosh.soft", 0.3);
    steps.forEach((ts) => { if (p.arrow_press) ctx.sfx(ts - 0.15, "click", 0.3); ctx.sfx(ts + 0.05, "whoosh.soft", 0.35); });

    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.3, end);
        layer.style.visibility = t < at - 0.01 ? "hidden" : "visible";
        layer.style.opacity = (1 - leave).toFixed(4);
        let pos = 0;
        steps.forEach((ts) => { pos += p4(t, ts, ts + MOVE); });
        track.style.translate = `${(-dir * pos * pitch).toFixed(2)}px 0`;
        cards.forEach(({ outer: c, veil }, i) => {
          const u = qOut(ML.lin(t, at + i * 0.12, at + i * 0.12 + 0.8));
          const act = Math.max(0, 1 - Math.abs(i - pos));
          c.style.opacity = u.toFixed(4);
          veil.style.opacity = ((1 - act) * 0.38).toFixed(4);
          c.style.translate = `${((1 - u) * 40 * 1.6 * k * dir).toFixed(2)}px 0`;
          c.style.scale = (0.965 + 0.035 * act).toFixed(4);
        });
        if (next) {
          let dy = 0;
          steps.forEach((ts) => { const a = ts - 0.18; dy += -2 * 2 * k * (ML.lin(t, a, a + 0.06) - p3(t, a + 0.06, a + 0.18)); });
          next.style.translate = `0 ${dy.toFixed(2)}px`;
          next.parentElement.style.opacity = ML.lin(t, at + 0.2, at + 0.6).toFixed(4);
        }
      },
    };
  },
});
