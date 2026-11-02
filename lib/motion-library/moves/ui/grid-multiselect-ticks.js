// Photo grid multi-select: a phone (220 × 450 at web scale) with a dark photo picker — a 3-column grid of square thumbs
// with 2 px gaps. Cell after cell is picked out of order (or in reading order) every `interval` s: the cell dips
// 1 → 0.92 → 1 over 0.2 s while a check circle pops at its bottom corner (scale 0 → 1, back.out(2)), and the footer
// counter climbs "N Photos Selected" on each pick. The phone floats in a warm radial glow from the look.
// The thumbs are drawn from the look's own colours (gradient skies, a sun, a hill line) — never third-party photos.
// In Arabic the grid reads right to left and the badge sits at the bottom-left (the inline end).
// Rebuilt as our own code from a prompt-motion reference (reference only: no pixels or code copied).
ML.define({
  id: "ui.grid-multiselect-ticks",
  category: "ui",
  name: "Photo grid multi-select",
  does: "Inside a phone, a grid of photos gets check badges popping on cell after cell while a 'N Photos Selected' counter climbs.",
  says: ["choice", "list", "simplicity"],
  energy: 2,
  targets: ["screen", "image", "list"],
  duration: [1.5, 4],
  params: {
    order: { type: "choice", options: ["random", "reading"], default: "random" },
    interval: { type: "number", range: [0.08, 0.2], default: 0.12, unit: "s" },
    counter: { type: "bool", default: true },
    picks: { type: "number", range: [3, 12], default: 8 },
  },
  pairs: ["camera.push-in", "ui.cursor-glide-click"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:l3d1c-claude-opus-5-5-made", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage && ctx.el.offsetHeight > 300 ? ctx.el : null;
    const R = own ? ctx.box(own) : f.pic;

    // phone: 220 × 450 ratio, as tall as the region allows
    const ph = Math.min(R.h * 0.94, (R.w * 0.9 * 450) / 220), pw = (ph * 220) / 450, u = pw / 220; // u: one web px
    const wrap = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;display:grid;place-items:center;z-index:6;pointer-events:none;`, host);
    const glow = mk("div", `position:absolute;left:50%;top:50%;width:${(pw * 2.6).toFixed(1)}px;height:${(pw * 2.6).toFixed(1)}px;translate:-50% -50%;border-radius:50%;background:radial-gradient(closest-side, color-mix(in srgb, var(--x-glow-1) 55%, transparent), color-mix(in srgb, var(--x-glow-2) 18%, transparent) 55%, transparent);opacity:var(--x-glow-o);`, wrap);
    const phone = mk("div", `position:relative;width:${pw.toFixed(1)}px;height:${ph.toFixed(1)}px;box-sizing:border-box;padding:${(6 * u).toFixed(1)}px;border-radius:${(34 * u).toFixed(1)}px;background:var(--x-device);box-shadow:var(--x-shadow);`, wrap);
    const scr = mk("div", `position:relative;width:100%;height:100%;overflow:hidden;border-radius:${(28 * u).toFixed(1)}px;background:color-mix(in srgb, var(--x-device) 88%, var(--x-panel));color:var(--x-accent-ink);display:flex;flex-direction:column;font-family:var(--x-body-font);`, phone);
    // status + header
    const top = mk("div", `display:flex;align-items:flex-end;justify-content:space-between;padding:${(26 * u).toFixed(1)}px ${(12 * u).toFixed(1)}px ${(8 * u).toFixed(1)}px;`, scr);
    mk("div", `font:var(--x-head-weight) ${(15 * u).toFixed(1)}px var(--x-head-font);color:var(--x-panel);`, top, rtl ? "الأحدث" : "Recents");
    mk("div", `font:600 ${(10 * u).toFixed(1)}px var(--x-body-font);color:var(--x-accent-2);`, top, rtl ? "إلغاء" : "Cancel");
    const grid = mk("div", `display:grid;grid-template-columns:repeat(3,1fr);gap:${(2 * u).toFixed(2)}px;flex:1;align-content:start;overflow:hidden;`, scr);
    const rows = Math.floor((ph - 110 * u) / (pw / 3)) + 1, n = rows * 3;
    const tones = ["var(--x-accent)", "var(--x-accent-2)", "var(--x-good)", "var(--x-bad)", "var(--x-glow-1)", "var(--x-ink)", "var(--x-dim)"];
    const cells = [];
    for (let i = 0; i < n; i++) {
      const a = tones[Math.floor(ML.rnd(i, 1) * tones.length)], b = tones[Math.floor(ML.rnd(i, 2) * tones.length)];
      const c = mk("div", `position:relative;aspect-ratio:1;overflow:visible;transform-origin:50% 50%;`, grid);
      const art = mk("div", `position:absolute;inset:0;overflow:hidden;background:linear-gradient(${Math.round(150 + ML.rnd(i, 3) * 60)}deg, color-mix(in srgb, ${a} 80%, var(--x-panel)), color-mix(in srgb, ${b} 70%, var(--x-device)));`, c);
      // a sun and a hill line, so each square reads as a picture
      const s = sv("svg", { viewBox: "0 0 100 100", preserveAspectRatio: "none", style: "position:absolute;inset:0;width:100%;height:100%;" }, art);
      sv("circle", { cx: 20 + ML.rnd(i, 4) * 60, cy: 22 + ML.rnd(i, 5) * 25, r: 8 + ML.rnd(i, 6) * 10, fill: "var(--x-panel)", "fill-opacity": 0.55 }, s);
      const h1 = 55 + ML.rnd(i, 7) * 20, h2 = 50 + ML.rnd(i, 8) * 25;
      sv("path", { d: `M0 ${h1} Q35 ${h2 - 18} 60 ${h2} T100 ${h1 - 6} V100 H0 Z`, fill: "var(--x-device)", "fill-opacity": 0.45 }, s);
      const bd = 14 * u;
      const badge = mk("div", `position:absolute;bottom:${(4 * u).toFixed(1)}px;${rtl ? "left" : "right"}:${(4 * u).toFixed(1)}px;width:${bd.toFixed(1)}px;height:${bd.toFixed(1)}px;border-radius:50%;background:var(--x-accent);box-shadow:0 0 0 ${(1.5 * u).toFixed(2)}px var(--x-accent-ink);display:grid;place-items:center;scale:0;`, c);
      const ck = sv("svg", { viewBox: "0 0 24 24", width: (bd * 0.7).toFixed(1), height: (bd * 0.7).toFixed(1) }, badge);
      sv("path", { d: "M5 12.5 L10 17 L19 7", fill: "none", stroke: "var(--x-accent-ink)", "stroke-width": 3.4, "stroke-linecap": "round", "stroke-linejoin": "round" }, ck);
      const shade = mk("div", `position:absolute;inset:0;background:var(--x-panel);opacity:0;`, c);
      c.insertBefore(shade, badge);
      cells.push({ c, badge, shade });
    }
    // footer counter
    const foot = mk("div", `display:flex;align-items:center;justify-content:center;gap:${(6 * u).toFixed(1)}px;height:${(46 * u).toFixed(1)}px;flex:none;border-top:${u.toFixed(2)}px solid color-mix(in srgb, var(--x-panel) 14%, transparent);background:color-mix(in srgb, var(--x-device) 70%, var(--x-panel));font:600 ${(11 * u).toFixed(1)}px var(--x-body-font);color:var(--x-panel);`, scr);
    const count = mk("span", "font-variant-numeric:tabular-nums;", foot);
    const word = mk("span", "", foot);
    if (!p.counter) foot.style.visibility = "hidden";

    // the picks: seeded shuffle (random) or reading order, as many as the room allows
    const idx = [...Array(n).keys()];
    if (p.order === "random") for (let i = n - 1; i > 0; i--) { const j = Math.floor(ML.rnd(i, 9) * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    const t0 = at + 0.45;
    const room = Math.max(1, Math.floor((end - 0.45 - t0) / p.interval) + 1);
    const picks = idx.slice(0, Math.max(1, Math.min(Math.round(p.picks), room, n)));
    // a small human rhythm: interval ± 25 %, seeded
    const times = []; let tt = t0;
    picks.forEach((_, i) => { times.push(tt); tt += p.interval * (0.75 + ML.rnd(i, 11) * 0.5); });
    times.forEach((t, i) => ctx.sfx(t, "tap", i % 2 ? 0.14 : 0.24));
    const pickAt = new Map(picks.map((c, i) => [c, times[i]]));
    const back2 = (x) => { const c = 2, y = x - 1; return 1 + (c + 1) * y * y * y + c * y * y; };
    const label = (N) => (rtl ? (N === 0 ? "اختار صورك" : N === 1 ? "صورة واحدة محددة" : N === 2 ? "صورتان محددتان" : N <= 10 ? "صور محددة" : "صورة محددة") : N === 0 ? "Select Items" : N === 1 ? "Photo Selected" : "Photos Selected");

    return {
      draw(t) {
        let N = 0;
        cells.forEach(({ c, badge, shade }, i) => {
          const T = pickAt.get(i);
          if (T == null || t < T) { c.style.scale = "none"; badge.style.scale = "0"; shade.style.opacity = "0"; return; }
          N++;
          const d = ML.lin(t, T, T + 0.2), dip = 1 - 0.08 * Math.sin(Math.PI * d);
          c.style.scale = d >= 1 ? "none" : dip.toFixed(4);
          badge.style.scale = Math.max(0, back2(ML.lin(t, T, T + 0.28))).toFixed(4);
          shade.style.opacity = (0.18 * ML.out(t, T, T + 0.15)).toFixed(4);
        });
        const showN = !(rtl && (N === 1 || N === 2)) && N > 0;
        count.textContent = showN ? String(N) : "";
        word.textContent = label(N);
        const e = ML.out(t, at, at + 0.5), l = ML.clamp((t - (end - 0.25)) / 0.22);
        wrap.style.opacity = (t < at ? 0 : e * (1 - l)).toFixed(4);
        phone.style.translate = `0 ${((1 - e) * 40 * u - Math.sin((t - at) * 1.4) * 3 * u).toFixed(2)}px`;
        glow.style.scale = (0.94 + 0.06 * e).toFixed(4);
      },
    };
  },
});
