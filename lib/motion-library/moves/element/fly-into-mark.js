// Fly into or out of the mark — one brand element across the film. Out of: items (cards, icons, files, logos) shoot out
// of the brand mark to their places in the scene as magic-move travellers between the mark's rect and each item's rect
// on the glide spring (stiffness 150, damping 20), scaling up from 0.3 and fading in, staggered by ~0.08 s (eighths of
// the move). Into: the mark (or a 56 px-proportioned rounded gradient icon) pops in among scattered items on
// back.out(2.2) 0 → 1.15 → 1 in 0.4 s, then each item travels to its centre on power3.in over 0.5 s, scaling 1 → 0.4
// and fading, staggered 0.08 s; the mark squashes to 1.08 as each one arrives.
// Source: Rieranthony/product-film-skill templates/kit/move.ts (MIT: the magic move on the glide spring, via ML.moveRect)
// + reference/ingredients.md "One brand element across the film"; the absorb build after prompt-motion
// "wozu-co-the-prompt-i-used" (reference only — rebuilt as our own code).
ML.define({
  id: "element.fly-into-mark",
  category: "element",
  name: "Fly into or out of the mark",
  does: "Items (icons, cards, logos) shoot out of the brand mark into the scene, or the mark pops in among scattered cards and absorbs them.",
  says: ["brand", "connection", "playful", "simplicity", "relief"],
  energy: 3,
  targets: ["logo", "card", "shape"],
  duration: [1, 2.5],
  params: {
    direction: { type: "choice", options: ["into", "out-of"], default: "into" },
    items: { type: "choice", options: ["cards", "icons", "files", "logos"], default: "cards" },
    count: { type: "number", range: [3, 10], default: 6 },
    stagger: { type: "number", range: [0.04, 0.15], default: 0.08, unit: "s" },
    icon_enter: { type: "bool", default: true },
  },
  pairs: ["element.dot-to-logo-tile", "element.brand-element-placement", "text-in.punchline"],
  avoid: ["problem"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "product-film-skill:templates/kit/move.ts", license: "MIT", note: "with reference/ingredients.md (one brand element); absorb version rebuilt from prompt-motion wozu-co-the-prompt-i-used (reference only)" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080;
    let mark = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const layer = mk("div", `position:absolute;inset:0;pointer-events:none;z-index:6;`, host);
    if (!mark) {
      // the brand icon: rounded, the look's gradient, its shadow — in the middle of the picture region
      const s = Math.max(56, 120 * k);
      mark = mk("div", `position:absolute;left:${f.pic.x + f.pic.w / 2 - s / 2}px;top:${f.pic.y + f.pic.h / 2 - s / 2}px;width:${s}px;height:${s}px;border-radius:calc(min(var(--x-radius), ${s * 0.26}px));background:linear-gradient(140deg, var(--x-accent), var(--x-accent-2));box-shadow:var(--x-shadow);`, layer);
      mk("div", `position:absolute;inset:28%;border-radius:50%;border:${s * 0.08}px solid var(--x-accent-ink);opacity:.9;`, mark);
    }
    const mb = ctx.box(mark);
    const mc = { x: mb.x + mb.w / 2, y: mb.y + mb.h / 2 };
    // the items, scattered on a seeded ring around the mark, inside the safe area
    const n = Math.round(ML.clamp(p.count, 3, 10));
    const iw = { cards: 220, icons: 96, files: 120, logos: 104 }[p.items] * k;
    const ih = { cards: 140, icons: 96, files: 150, logos: 104 }[p.items] * k;
    const S = f.safe;
    const rx = Math.min(S.w * 0.42, Math.max(mb.w, iw) * 0.5 + 360 * k), ry = Math.min(S.h * 0.38, Math.max(mb.h, ih) * 0.5 + 320 * k);
    const build = (i) => {
      const e = mk("div", `position:absolute;left:0;top:0;width:${iw}px;height:${ih}px;box-sizing:border-box;opacity:0;transform-origin:50% 50%;`, layer);
      if (p.items === "cards") {
        e.style.cssText += `padding:${18 * k}px;display:grid;gap:${12 * k}px;align-content:start;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(min(var(--x-radius), ${22 * k}px));box-shadow:var(--x-shadow);`;
        mk("div", `width:${40 * k}px;height:${40 * k}px;border-radius:${12 * k}px;background:${i % 2 ? "var(--x-accent-2)" : "var(--x-accent)"};`, e);
        mk("div", `height:${14 * k}px;width:85%;border-radius:999px;background:var(--x-ink);opacity:.75;`, e);
        mk("div", `height:${12 * k}px;width:${50 + 30 * ML.rnd(i, 3)}%;border-radius:999px;background:var(--x-dim);opacity:.55;`, e);
      } else if (p.items === "icons") {
        e.style.cssText += `display:flex;align-items:center;justify-content:center;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(min(var(--x-radius), ${26 * k}px));box-shadow:var(--x-shadow);`;
        const svg = doc.createElementNS(NS, "svg");
        svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("width", String(48 * k)); svg.setAttribute("height", String(48 * k));
        const G = ["M4 12h16M12 4v16", "M5 12l4 4 10-10", "M12 3l9 16H3z", "M4 6h16v12H4zM4 7l8 6 8-6", "M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z", "M3 17l6-6 4 4 8-8", "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 7v5l3 3", "M6 3h9l3 3v15H6z"];
        svg.innerHTML = `<path d="${G[i % G.length]}" fill="none" stroke="${i % 3 === 0 ? "var(--x-accent)" : "var(--x-ink)"}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
        e.append(svg);
      } else if (p.items === "files") {
        const fold = 30 * k;
        e.style.cssText += `background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:${10 * k}px;box-shadow:var(--x-shadow);clip-path:polygon(0 0, calc(100% - ${fold}px) 0, 100% ${fold}px, 100% 100%, 0 100%);padding:${46 * k}px ${16 * k}px 0;display:grid;gap:${10 * k}px;align-content:start;`;
        mk("div", `position:absolute;right:0;top:0;width:${fold}px;height:${fold}px;background:var(--x-panel-2);border-bottom-left-radius:${6 * k}px;`, e);
        for (let j = 0; j < 4; j++) mk("div", `height:${9 * k}px;width:${[90, 70, 80, 50][j]}%;border-radius:999px;background:${j === 0 ? "var(--x-accent)" : "var(--x-dim)"};opacity:${j === 0 ? 0.8 : 0.45};`, e);
        mk("div", `position:absolute;left:${14 * k}px;top:${12 * k}px;font:var(--x-label-weight) ${16 * k}px var(--x-label-font);color:var(--x-dim);direction:ltr;`, e, ["PDF", "DOC", "CSV", "XLS", "PNG"][i % 5]);
      } else {
        e.style.cssText += `display:flex;align-items:center;justify-content:center;border-radius:50%;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);`;
        const shapes = [`border-radius:50%`, `border-radius:${8 * k}px;rotate:45deg`, `border-radius:${6 * k}px`, `clip-path:polygon(50% 0,100% 100%,0 100%)`];
        mk("div", `width:${44 * k}px;height:${44 * k}px;background:${["var(--x-accent)", "var(--x-ink)", "var(--x-accent-2)", "var(--x-dim)"][i % 4]};${shapes[(i + 1) % 4]};`, e);
      }
      return e;
    };
    const items = Array.from({ length: n }, (_, i) => {
      const a = -Math.PI / 2 + ((i + 0.5) / n) * Math.PI * 2 * (rtl ? -1 : 1) + (ML.rnd(i, 13) - 0.5) * 0.4;
      const rr = 0.85 + 0.15 * ML.rnd(i, 17);
      let x = mc.x + Math.cos(a) * rx * rr - iw / 2, y = mc.y + Math.sin(a) * ry * rr - ih / 2;
      x = ML.clamp(x, S.x, S.x + S.w - iw); y = ML.clamp(y, S.y, S.y + S.h - ih);
      const e = build(i);
      return { e, home: { x, y, w: iw, h: ih }, rot: (ML.rnd(i, 23) * 2 - 1) * 6 };
    });
    const into = p.direction !== "out-of";
    const st = ML.clamp(p.stagger, 0.04, 0.15);
    const enter = p.icon_enter;
    const markAt = into ? at + 0.25 : at; // the mark pops in among the scattered items (into), or first (out of)
    const goAt = into ? markAt + (enter ? 0.45 : 0.15) : markAt + (enter ? 0.35 : 0.05);
    const arrive = items.map((_, i) => goAt + i * st + 0.5);
    if (enter) ctx.sfx(markAt, "pop", 0.35);
    ctx.sfx(goAt, "whoosh.soft", 0.3);
    if (into) arrive.forEach((t, i) => i % 2 === 0 && ctx.sfx(t, "blip", 0.15));
    const backOut = (x, c = 2.2) => { if (x <= 0) return 0; const y = x - 1; return 1 + (c + 1) * y * y * y + c * y * y; };
    const markBox = { x: mc.x - iw * 0.2, y: mc.y - ih * 0.2, w: iw * 0.4, h: ih * 0.4 };
    return {
      draw(t) {
        // the mark: pops 0 → 1.15 → 1, squashes 1.08 on each arrival (into)
        let sc = enter ? (t < markAt ? 0 : backOut(ML.lin(t, markAt, markAt + 0.4))) : 1;
        if (into) for (const a of arrive) sc *= 1 + 0.08 * (t >= a - 0.02 ? Math.exp(-(t - a + 0.02) / 0.09) * Math.min(1, (t - a + 0.02) / 0.02) : 0);
        mark.style.opacity = enter && t < markAt ? "0" : "1";
        mark.style.scale = Math.abs(sc - 1) < 1e-4 ? "none" : Math.max(0, sc).toFixed(4);
        items.forEach((it, i) => {
          const go = goAt + i * st;
          let r, o, s;
          if (into) {
            // scattered (fading in, staggered a little) → to the mark's centre on power3.in
            const x = ML.lin(t, go, go + 0.5), e = x * x * x;
            r = { x: it.home.x + (mc.x - iw / 2 - it.home.x) * e, y: it.home.y + (mc.y - ih / 2 - it.home.y) * e };
            s = 1 - 0.6 * e;
            o = ML.out(t, at + i * 0.04, at + i * 0.04 + 0.3) * (1 - ML.lin(t, go + 0.3, go + 0.5));
          } else {
            // out of the mark: a magic move on the glide spring from the mark's rect to its home
            const m = ML.moveRect(t, go, markBox, it.home);
            r = { x: m.x + (m.w - iw) / 2, y: m.y + (m.h - ih) / 2 };
            s = Math.min(1, Math.max(0.05, m.w / iw));
            o = t < go ? 0 : ML.out(t, go, go + 0.18);
          }
          const rot = it.rot * (into ? 1 : Math.min(1, ML.step(t - go)));
          it.e.style.opacity = Math.max(0, o).toFixed(4);
          it.e.style.transform = `translate(${r.x.toFixed(2)}px, ${r.y.toFixed(2)}px) scale(${s.toFixed(4)}) rotate(${rot.toFixed(2)}deg)`;
        });
      },
    };
  },
});
