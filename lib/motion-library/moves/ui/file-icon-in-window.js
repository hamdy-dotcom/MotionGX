// File icon in a folder window: a small desktop window (title bar, the look's traffic lights, a path) sits in the picture
// region; inside it a document glyph (48 px at the window's own scale, a folded corner, a few text lines) with a 10 px
// filename under it pops in — scale 0.8 → 1 and opacity on a back-out over 0.25 s. With `count` > 1 the copies follow on
// `stagger` and their names pile up the way a real folder does (final.doc, final_v2.doc, final_final.doc, …), the setup
// for a "versions everywhere" problem beat. Icons flow with the reading direction (Arabic fills from the right).
// Source: prompt-motion yunn260414 "什么是 Git?" explainer (reference only: rebuilt as our own code).
ML.define({
  id: "ui.file-icon-in-window",
  category: "ui",
  name: "A file icon appears in a folder window",
  does: "Inside a folder window a document icon with its filename pops in, ready to be multiplied or renamed.",
  says: ["story", "problem", "step"],
  energy: 2,
  targets: ["card", "screen"],
  duration: [0.4, 2],
  params: {
    count: { type: "number", range: [1, 5], default: 1 },
    stagger: { type: "number", range: [0.1, 0.4], default: 0.2, unit: "s" },
    filename: { type: "text", default: "final.doc" },
    pop: { type: "number", range: [0.18, 0.4], default: 0.25, unit: "s" },
    window: { type: "bool", default: true },
  },
  pairs: ["ui.cursor-glide-click", "text-emphasis.accent-word"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "prompt-motion:yunn260414-opus-5-5-git-git-js-git", license: "reference", note: "our own rebuild of the technique; no pixels or assets copied" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); parent.append(e); return e; };
    const U = (n) => `calc(var(--u) * ${n})`;
    const host = ctx.scene || ctx.stage;
    const inEl = ctx.el && ctx.el !== ctx.stage;
    const R = inEl ? null : f.pic;
    const layer = inEl
      ? mk("div", "position:relative;display:flex;justify-content:center;width:100%;pointer-events:none;", ctx.el)
      : mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;display:grid;place-items:center;pointer-events:none;z-index:6;`, host);
    const n = Math.round(ML.clamp(p.count, 1, 5));

    // the names a folder collects
    const deflt = p.filename === "final.doc";
    const raw = rtl && deflt ? "نهائي.doc" : p.filename || "final.doc";
    const dot = raw.lastIndexOf("."), base = dot > 0 ? raw.slice(0, dot) : raw, ext = dot > 0 ? raw.slice(dot) : "";
    const tails = rtl && deflt ? ["", "_2", "_نهائي", "_نهائي_2", "_آخر_نسخة"] : ["", "_v2", "_final", "_final_final", "_final_v3"];
    const names = tails.slice(0, n).map((x) => base + x + ext);

    // the window, sized in its own units (--u) then fitted to the room
    const win = mk("div", `--u:1px;width:${U(n > 3 ? 520 : 420)};box-sizing:border-box;border-radius:${U(14)};overflow:hidden;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);font-family:var(--x-body-font);color:var(--x-ink);`, layer);
    if (!p.window) { win.style.background = "transparent"; win.style.border = "0"; win.style.boxShadow = "none"; }
    const bar = mk("div", `display:${p.window ? "flex" : "none"};align-items:center;gap:${U(7)};padding:${U(10)} ${U(12)};background:var(--x-bar);border-bottom:1px solid var(--x-line);color:var(--x-bar-ink);font-size:${U(11)};`, win);
    const lights = mk("div", `display:flex;gap:${U(6)};opacity:var(--x-lights);order:var(--x-bar-order);`, bar);
    for (const c of ["--x-light-1", "--x-light-2", "--x-light-3"]) mk("span", `width:${U(10)};height:${U(10)};border-radius:50%;background:var(${c});`, lights);
    const path = mk("div", `display:flex;align-items:center;gap:${U(6)};margin-inline-start:${U(8)};`, bar);
    const fsv = sv("svg", { viewBox: "0 0 24 24", width: "1.2em", height: "1.2em" }, path);
    sv("path", { d: "M3 6.5a1.5 1.5 0 0 1 1.5-1.5h4.6l2 2h8.4A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z", fill: "var(--x-accent)", opacity: "0.85" }, fsv);
    mk("span", "", path, rtl ? "المستندات" : "Documents");
    const body = mk("div", `display:flex;flex-wrap:wrap;justify-content:flex-start;gap:${U(18)} ${U(22)};padding:${U(26)} ${U(26)} ${U(30)};min-height:${U(150)};align-content:flex-start;`, win);

    const icons = names.map((name, i) => {
      const cell = mk("div", `display:flex;flex-direction:column;align-items:center;gap:${U(6)};width:${U(76)};transform-origin:50% 60%;`, body);
      const g = sv("svg", { viewBox: "0 0 48 48", width: "100%", height: "100%" }, cell);
      g.style.cssText = `width:${U(48)};height:${U(48)};overflow:visible;`;
      sv("path", { d: "M11 4h18l10 10v28a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", fill: "var(--x-panel-2)", stroke: "var(--x-line)", "stroke-width": 1.4 }, g);
      sv("path", { d: "M29 4v8a2 2 0 0 0 2 2h8", fill: "var(--x-panel)", stroke: "var(--x-line)", "stroke-width": 1.4, "stroke-linejoin": "round" }, g);
      sv("rect", { x: 9, y: 30, width: 30, height: 9, fill: "var(--x-accent)" }, g);
      for (const [y, w] of [[18, 16], [22, 20], [26, 13]]) sv("rect", { x: rtl ? 35 - w : 14, y, width: w, height: 1.8, rx: 0.9, fill: "var(--x-dim)", opacity: 0.55 }, g);
      const lab = mk("div", `font-size:${U(10)};line-height:1.3;text-align:center;color:var(--x-ink);word-break:break-all;max-width:100%;`, cell, name);
      lab.dir = "ltr"; // a filename keeps its extension at its end, even an Arabic one
      return cell;
    });

    // fit the window to the room it has (never taller or wider than the region)
    const roomW = inEl ? ctx.el.clientWidth || f.pic.w : R.w * 0.92, roomH = inEl ? Infinity : R.h * 0.9;
    const u = Math.min(roomW / win.offsetWidth, roomH / win.offsetHeight);
    win.style.setProperty("--u", u.toFixed(4) + "px");

    const winIn = at, first = at + (p.window ? 0.3 : 0);
    const times = icons.map((_, i) => first + i * p.stagger);
    times.forEach((t) => ctx.sfx(t, "pop.soft", 0.35));
    const backOut = (x) => { const c = 1.70158, y = x - 1; return 1 + (c + 1) * y * y * y + c * y * y; };
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.22);
        const w = ML.out(t, winIn, winIn + 0.35);
        win.style.opacity = (Math.min(1, w * 1.4) * (1 - leave)).toFixed(4);
        win.style.translate = `0 ${((1 - w) * 18 * u).toFixed(2)}px`;
        icons.forEach((c, i) => {
          const x = ML.lin(t, times[i], times[i] + p.pop);
          c.style.opacity = ML.clamp(x * 1.6).toFixed(4);
          c.style.scale = x >= 1 ? "none" : (0.8 + 0.2 * backOut(x)).toFixed(4);
        });
      },
    };
  },
});
