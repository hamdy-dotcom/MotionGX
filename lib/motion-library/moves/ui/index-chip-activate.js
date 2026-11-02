// Index chip activate: a row of numbered chapter chips (a large light tabular number, a caps label and a line of small
// copy). The current chapter's number turns to the accent and lifts 2 px over 0.5 s on the ease-out curve while its
// label and copy brighten from the dim ink to the ink over 0.4 s; the others stay dim. "walk" steps the active state
// through every chip in turn (the previous one dims back). The chips rise in first with a short stagger.
// Ported from MengTo/Skills web-design/build-threejs-scroll-worlds demo (MIT): .chip .num { transition: color .4s,
// transform .5s var(--ease-out) } and .chip.on .num { color: var(--ember); transform: translate3d(0,-2px,0) },
// .chip.on b { color: var(--bone) } — rebuilt here as functions of t.
ML.define({
  id: "ui.index-chip-activate",
  category: "ui",
  name: "Chapter chip activate",
  does: "In a row of numbered chapters, the current number turns to the accent and lifts 2px while its label brightens.",
  says: ["step", "list", "time"],
  energy: 1,
  targets: ["number", "list", "label"],
  duration: [0.4, 1],
  params: {
    labels: { type: "bool", default: true },
    lift: { type: "number", range: [0, 4], default: 2, unit: "px" },
    count: { type: "number", range: [2, 5], default: 4 },
    active: { type: "number", range: [1, 5], default: 2 },
    advance: { type: "choice", options: ["one", "walk"], default: "one" },
    items: { type: "text" },
  },
  pairs: ["text-in.kicker-rule", "ui.progress-fill"],
  avoid: ["energy", "urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:web-design/build-threejs-scroll-worlds", license: "MIT", note: ".chip / .chip.on / .num transition rebuilt as functions of t" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    // labels: the director's list items, the items param, or chapter names of our own
    const fromList = el && el.children.length >= 2 ? [...el.children].map((c) => (c.textContent || "").trim()).filter(Boolean) : [];
    const given = String(p.items || "").split(/[|,،]/).map((s) => s.trim()).filter(Boolean);
    const DEF = rtl
      ? [["البداية", "منين نبدأ"], ["الاستكشاف", "نشوف الصورة كاملة"], ["البناء", "قطعة ورا قطعة"], ["الإطلاق", "يوصل للناس"], ["النمو", "ونكبر بعدها"]]
      : [["Arrive", "Where it all starts"], ["Explore", "See the whole picture"], ["Build", "Piece by piece"], ["Launch", "Out into the world"], ["Grow", "And then it scales"]];
    const names = (given.length >= 2 ? given : fromList.length >= 2 ? fromList : DEF.map((d) => d[0]));
    const n = Math.round(ML.clamp(given.length >= 2 || fromList.length >= 2 ? names.length : p.count, 2, 5));
    const act = Math.round(ML.clamp(p.active, 1, n)) - 1;

    // the row: on a panel in the picture region (wraps to a column on narrow frames)
    const R = f.pic;
    const column = f.tall && n > 3;
    const wrap = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;display:flex;align-items:center;justify-content:center;z-index:6;pointer-events:none;`, ctx.scene || ctx.stage);
    const panel = mk("div", `box-sizing:border-box;max-width:100%;${column ? `min-width:${Math.min(R.w, 720 * k).toFixed(1)}px;` : ""}display:grid;grid-template-columns:${column ? "1fr" : `repeat(${n}, minmax(0, 1fr))`};gap:${(column ? 34 : 40) * k}px ${(40 * k).toFixed(1)}px;padding:${(48 * k).toFixed(1)}px ${(52 * k).toFixed(1)}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:var(--x-radius);box-shadow:var(--x-shadow);`, wrap);
    panel.dir = rtl ? "rtl" : "ltr";
    const numSize = (column ? 72 : f.wide ? 84 : Math.max(52, 200 / n * 1.6)) * k;
    const chips = Array.from({ length: n }, (_, i) => {
      const chip = mk("div", `display:flex;gap:${(18 * k).toFixed(1)}px;align-items:flex-start;min-width:0;`, panel);
      const num = mk("span", `flex:none;min-width:1.25em;font:300 ${numSize.toFixed(1)}px/1 var(--x-head-font);font-variant-numeric:tabular-nums;letter-spacing:-0.02em;`, chip, String(i + 1).padStart(2, "0"));
      const tx = mk("div", `min-width:0;padding-top:${(6 * k).toFixed(1)}px;display:${p.labels ? "block" : "none"};`, chip);
      const b = mk("b", `display:block;font:var(--x-label-weight) ${(20 * k).toFixed(1)}px/1.3 var(--x-label-font);letter-spacing:${rtl ? "0" : "var(--x-label-track)"};text-transform:var(--x-label-case);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`, tx, names[i] || DEF[i][0]);
      const cp = mk("p", `margin:${(8 * k).toFixed(1)}px 0 0;font:400 ${(22 * k).toFixed(1)}px/1.45 var(--x-body-font);max-width:22ch;`, tx, (given.length >= 2 || fromList.length >= 2) ? "" : DEF[i][1]);
      return { chip, num, b, cp };
    });

    // timing: the row rises in, then the active chip (or each in turn) lights on its spoken word or a step
    const enter = (i) => at + i * 0.06;
    const t0 = at + 0.18 + n * 0.04;
    const span = Math.max(0.5, end - 0.3 - t0);
    const step = p.advance === "walk" ? Math.min(0.7, span / n) : 0;
    const onAt = chips.map((c, i) => {
      if (p.advance !== "walk") return i === act ? Math.max(t0, Math.min(ctx.word(c.b.textContent, t0), end - 0.6)) : Infinity;
      return t0 + i * step;
    });
    const offAt = chips.map((c, i) => (p.advance === "walk" && i < n - 1 ? onAt[i + 1] : Infinity));
    onAt.forEach((s) => Number.isFinite(s) && ctx.sfx(s, "tap", 0.22));
    const easeOut = ML.bezier(0.16, 1, 0.3, 1);
    const level = (t, i, d) => { const a = ML.lin(t, onAt[i], onAt[i] + d), b = ML.lin(t, offAt[i], offAt[i] + d); return easeOut(a) * (1 - easeOut(b)); };
    const mixc = (v, from, to) => `color-mix(in srgb, ${to} ${(v * 100).toFixed(1)}%, ${from})`;
    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.25, end);
        wrap.style.opacity = (ML.lin(t, at, at + 0.2) * (1 - leave)).toFixed(4);
        chips.forEach((c, i) => {
          const r = ML.out(t, enter(i), enter(i) + 0.4);
          c.chip.style.opacity = r.toFixed(4);
          c.chip.style.translate = `0 ${((1 - r) * 18 * k).toFixed(2)}px`;
          const nv = level(t, i, 0.5), lv = level(t, i, 0.4);
          c.num.style.color = mixc(nv, "var(--x-dim)", "var(--x-accent)");
          c.num.style.translate = `0 ${(-p.lift * 1.6 * k * nv).toFixed(2)}px`;
          c.b.style.color = mixc(lv, "var(--x-dim)", "var(--x-ink)");
          c.cp.style.color = mixc(lv, "color-mix(in srgb, var(--x-dim) 70%, transparent)", "var(--x-dim)");
        });
      },
    };
  },
});
