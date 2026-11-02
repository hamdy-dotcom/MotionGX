// Grid tiles stagger in: a grid of thumbnails, icon tiles or the target's own UI tiles arrives tile by tile, then stays
// still. Order: row-major (reading order, mirrored in Arabic), diagonal (row + column) or centre-out (by distance from
// the grid's centre), `stagger` apart (0.05–0.15 s). Motion per tile:
//   rise  — fade-rise y 30 → 0, 1 s power3.out (the look's distance when it sets one)
//   fade  — opacity 0 → 1 with scale 0.96 → 1, 0.5 s power2.out (R.layout tiles: in place, then still)
//   snap  — scale 0 → 1.1 → 1, 0.4 s back.out(2); the icon pops 0.1 s later with a small wobble
//   scale — scale 0.85 → 1 + y 12 → 0 + opacity, 0.35 s cubic-bezier(0.34, 1.56, 0.64, 1); the title fades 0.1 s later
//   look  — the look's own motion (ML.show)
// Built tiles: 2–4 columns, 6 tiles (8 on tall shapes), gap 12–24 and padding 16 (in 1080 units); each an icon tile — a
// 1 px gradient-border shell around a panel, a 24-unit stroke icon and a 12-unit label — whose icon may stroke-draw
// 0.4 s after the tile lands (icon_draw).
// Source: MengTo/Skills media/html-explainer-video demo film.js "makes" + web-design/number-details demo (MIT); MotionGX
// lib/live-engine/worker/vendor/recipes.js R.layout tiles (own); prompt-motion brainextends-opus-5-5-is-f-cking and
// thilina-a-i-also-tried-it (reference: the overshoot pop and the icon wobble) — every frame from t.
ML.define({
  id: "element.stagger-grid",
  category: "element",
  name: "Grid tiles stagger in",
  does: "A grid of thumbnails, icon tiles or real UI tiles arrives tile by tile in quick succession, then stays still.",
  says: ["list", "growth", "energy", "simplicity", "proof", "calm"],
  energy: 2,
  targets: ["card", "image", "list", "screen"],
  duration: [0.8, 2.5],
  params: {
    stagger: { type: "number", range: [0.05, 0.15], default: 0.1, unit: "s" },
    cols: { type: "number", range: [2, 4], default: 2 },
    order: { type: "choice", options: ["row-major", "diagonal", "center-out"], default: "row-major" },
    motion: { type: "choice", options: ["rise", "fade", "snap", "scale", "look"], default: "rise" },
    icon_draw: { type: "bool", default: false },
    count: { type: "number", range: [4, 12], default: 6 },
  },
  pairs: ["element.slide-in", "camera.push-in", "text-in.punchline"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "MengTo/Skills:agent-skills/media/html-explainer-video", license: "MIT", note: "film.js makes + number-details demo tiles; R.layout tiles from lib/live-engine/worker/vendor/recipes.js (own); pop and wobble after prompt-motion brainextends / thilina (reference)" },
  setup(ctx) {
    const { p, at, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const k = Math.min(f.W, f.H) / 1080;

    // the tiles: the target's own children (real UI tiles) or a built icon grid
    let tiles = [];
    const kids = own && own.tagName !== "IMG" && own.tagName.toLowerCase() !== "svg" ? [...own.children].filter((c) => c.offsetWidth > 0) : [];
    if (kids.length > 1) tiles = kids.map((el) => ({ el, icon: null, label: null, paths: [] }));
    else if (own) tiles = [{ el: own, icon: null, label: null, paths: [] }];
    else {
      const cols = Math.round(ML.clamp(p.cols, 2, 4));
      const n = Math.round(ML.clamp(p.count, 4, 12)) + (f.tall && p.count === 6 ? 2 : 0);
      const rows = Math.ceil(n / cols);
      const R = f.pic, gap = (12 + 12 * ML.clamp((R.w / cols - 160) / 300)) * k * 1.3, pad = 16 * k;
      const cell = Math.min((R.w - (cols - 1) * gap) / cols, (R.h - (rows - 1) * gap) / rows);
      const gw = cols * cell + (cols - 1) * gap, gh = rows * cell + (rows - 1) * gap;
      const grid = mk("div", `position:absolute;left:${R.x + (R.w - gw) / 2}px;top:${R.y + (R.h - gh) / 2}px;width:${gw}px;display:grid;grid-template-columns:repeat(${cols}, ${cell}px);gap:${gap}px;pointer-events:none;z-index:6;`, host);
      const L = rtl ? ["الفواتير", "العملاء", "التقارير", "الفريق", "المدفوعات", "الأمان", "الرسائل", "الإعدادات", "التقويم", "المخزون", "الطلبات", "الدعم"]
        : ["Invoices", "Clients", "Reports", "Team", "Payments", "Security", "Messages", "Settings", "Calendar", "Stock", "Orders", "Support"];
      const ICONS = [
        "M6 3h9l5 5v13H6z M15 3v5h5 M9 13h8 M9 17h6", // document
        "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21c1-4 4-6 8-6s7 2 8 6", // person
        "M4 20V10 M10 20V4 M16 20v-7 M22 20H2", // bars
        "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M17 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M2 20c.6-3 3-5 6-5s5.4 2 6 5 M14 15c.8-.3 1.8-.5 3-.5 3 0 5.4 2 6 5", // team
        "M3 6h18v12H3z M3 10h18 M7 15h4", // card
        "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4", // shield
        "M4 5h16v11H8l-4 4z", // message
        "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2", // settings
      ];
      tiles = Array.from({ length: n }, (_, i) => {
        const shell = mk("div", `width:${cell}px;height:${cell}px;box-sizing:border-box;padding:1px;border-radius:var(--x-radius);background:linear-gradient(140deg, color-mix(in srgb, var(--x-accent) 55%, transparent), var(--x-edge-color) 45%, color-mix(in srgb, var(--x-accent-2) 40%, transparent));box-shadow:var(--x-shadow);`, grid);
        const panel = mk("div", `width:100%;height:100%;box-sizing:border-box;border-radius:calc(var(--x-radius) - 1px);background:var(--x-panel);display:flex;flex-direction:column;align-items:flex-start;justify-content:space-between;padding:${pad * 1.6}px;`, shell);
        const ic = Math.max(24 * k, cell * 0.24);
        const holder = mk("div", `width:${ic * 1.7}px;height:${ic * 1.7}px;border-radius:calc(var(--x-radius) * 0.45);display:grid;place-items:center;background:color-mix(in srgb, var(--x-accent) 12%, transparent);`, panel);
        const svg = doc.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "0 0 24 24"); svg.style.cssText = `width:${ic}px;height:${ic}px;display:block;overflow:visible;`;
        const paths = ICONS[i % ICONS.length].split(" M").map((d, j) => { const pa = doc.createElementNS(NS, "path"); pa.setAttribute("d", (j ? "M" : "") + d); pa.setAttribute("fill", "none"); pa.setAttribute("stroke", "var(--x-accent)"); pa.setAttribute("stroke-width", "1.8"); pa.setAttribute("stroke-linecap", "round"); pa.setAttribute("stroke-linejoin", "round"); pa.setAttribute("pathLength", "1"); svg.append(pa); return pa; });
        holder.append(svg);
        const label = mk("div", `font:var(--x-body-weight) ${Math.max(12 * k * 1.6, cell * 0.1)}px/1.2 var(--x-body-font);color:var(--x-ink);`, panel, L[i % L.length]);
        return { el: shell, icon: holder, label, paths };
      });
    }

    // order: measured positions, so it holds for real tiles too (reading order runs right → left in Arabic)
    const boxes = tiles.map((T) => ctx.box(T.el));
    const xs = [...new Set(boxes.map((b) => Math.round(b.x / 8)))].sort((a, b) => (rtl ? b - a : a - b));
    const ys = [...new Set(boxes.map((b) => Math.round(b.y / 8)))].sort((a, b) => a - b);
    const cxm = boxes.reduce((a, b) => a + b.x + b.w / 2, 0) / boxes.length, cym = boxes.reduce((a, b) => a + b.y + b.h / 2, 0) / boxes.length;
    const rank = boxes.map((b, i) => {
      const c = xs.indexOf(Math.round(b.x / 8)), r = ys.indexOf(Math.round(b.y / 8));
      if (p.order === "diagonal") return r + c;
      if (p.order === "center-out") return Math.hypot(b.x + b.w / 2 - cxm, b.y + b.h / 2 - cym) / Math.max(1, Math.max(...boxes.map((q) => q.w)));
      return r * xs.length + c + i * 1e-6;
    });
    const sorted = rank.map((r, i) => [r, i]).sort((a, b) => a[0] - b[0]);
    const times = new Array(tiles.length);
    if (p.order === "row-major") sorted.forEach(([, i], j) => (times[i] = at + j * p.stagger));
    else sorted.forEach(([r, i]) => (times[i] = at + r * p.stagger * (p.order === "center-out" ? 1.4 : 1)));
    [...new Set(times.map((t) => +t.toFixed(3)))].sort((a, b) => a - b).forEach((t, j) => j % 3 === 0 && ctx.sfx(t, "pop.soft", 0.25));

    const p3 = (t, a, b) => 1 - Math.pow(1 - ML.lin(t, a, b), 3), p2 = (t, a, b) => 1 - Math.pow(1 - ML.lin(t, a, b), 2);
    const bz = ML.bezier(0.34, 1.56, 0.64, 1);
    const dist = Math.max(ctx.look.dist || 28, 30) * k;

    return {
      draw(t) {
        tiles.forEach((T, i) => {
          const a = times[i], el = T.el;
          if (p.motion === "look") { ML.show(el, t, a, Infinity); }
          else {
            let o = 1, y = 0, s = 1;
            if (p.motion === "rise") { const u = p3(t, a, a + 1); o = Math.min(1, u * 1.4); y = (1 - u) * dist; }
            else if (p.motion === "fade") { const u = p2(t, a, a + 0.5); o = u; s = 0.96 + 0.04 * u; }
            else if (p.motion === "snap") { const u = ML.back(t, a, a + 0.4, 2); o = Math.min(1, ML.lin(t, a, a + 0.12)); s = Math.max(0, u); }
            else { const u = bz(ML.lin(t, a, a + 0.35)); o = Math.min(1, ML.lin(t, a, a + 0.2)); s = 0.85 + 0.15 * u; y = (1 - u) * 12 * k; }
            el.style.visibility = t < a - 1e-6 ? "hidden" : "visible";
            el.style.opacity = o.toFixed(4);
            el.style.translate = y ? `0 ${y.toFixed(2)}px` : "none";
            el.style.scale = Math.abs(s - 1) < 1e-4 ? "none" : s.toFixed(4);
          }
          // inside a built tile: the icon pops (snap) or the title fades a beat later (scale); the icon may draw itself
          if (T.icon) {
            if (p.motion === "snap") {
              const u = ML.back(t, a + 0.1, a + 0.4, 2.2), w = t > a + 0.4 ? Math.exp(-(t - a - 0.4) * 9) * Math.sin((t - a - 0.4) * 30) * 8 : 0;
              T.icon.style.scale = Math.max(0, u).toFixed(4);
              T.icon.style.rotate = `${w.toFixed(2)}deg`;
            }
            if (p.motion === "scale") T.label.style.opacity = ML.out(t, a + 0.1, a + 0.35).toFixed(4);
            const land = a + (p.motion === "rise" ? 0.6 : 0.4);
            T.paths.forEach((pa, j) => {
              const d = p.icon_draw ? 1 - ML.ease(t, land + j * 0.06, land + 0.4 + j * 0.06) : 0;
              pa.setAttribute("stroke-dasharray", "1 1");
              pa.setAttribute("stroke-dashoffset", d.toFixed(4));
            });
          }
        });
      },
    };
  },
});
