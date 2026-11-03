// Numbered rows reveal: a column of stacked rows (each 1fr, a 1 px line between) with a big accent number at the
// bottom of its start side (34 px bold at the web size) and a small uppercase label at its end side (10 px, tracking
// .15em). The rows clip in from the reading side — inset(0 100% 0 0) → inset(0) for left-to-right, mirrored for
// Arabic; "end" reveals from the far side — 0.5 s power3.out, 0.12 s apart, while each number counts 00 → its own (01,
// 02, 03…). It sits beside the hero block, taking the list's place. Labels: the list's own items, else `items`.
// Source: MengTo/Skills web-design/funky-purple-container-tech demo (MIT): ".layoutCards { grid-template-rows:
// repeat(3,1fr) } article { display:flex; align-items:end; justify-content:space-between; padding:26px; border-bottom:
// 1px solid var(--line) } b { color:var(--accent); font-size:34px } span { text-transform:uppercase; font-size:10px;
// letter-spacing:.15em }" — the reveal and count ours, every frame from t.
ML.define({
  id: "element.numbered-rows",
  category: "element",
  name: "Numbered rows reveal",
  does: "Stacked rows with big accent numbers (01, 02, 03) and uppercase labels clip in one after another from the reading side while their numbers count up.",
  says: ["list", "step", "precision"],
  energy: 2,
  targets: ["list"],
  duration: [1, 2.5],
  params: {
    rows: { type: "number", range: [2, 5], default: 3 },
    direction: { type: "choice", options: ["start", "end"], default: "start" },
    count_up: { type: "bool", default: true },
    stagger: { type: "number", range: [0.06, 0.3], default: 0.12, unit: "s" },
    items: { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "element.spec-rows"],
  avoid: ["playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:agent-skills/web-design/funky-purple-container-tech", license: "MIT", note: "the layoutCards rows (1fr rows, 1px lines, accent 34px number, 10px uppercase .15em label); reveal and count from t" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const n = Math.round(ML.clamp(p.rows, 2, 5));
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };

    // labels: items param, else the list's own items, else a sample
    const DEF = rtl ? ["الإطار", "الإيقاع", "الإشارة", "المدى", "الأثر"] : ["Frame", "Rhythm", "Signal", "Range", "Impact"];
    let labels = p.items ? String(p.items).split(/\s*[|\n]\s*/).filter(Boolean) : own ? (own.children.length ? [...own.children].map((c) => c.textContent.trim()) : [own.textContent.trim()]).filter(Boolean) : [];
    for (let i = labels.length; i < n; i++) labels.push(DEF[i % DEF.length]);
    labels = labels.slice(0, n);

    // the column: at the list's place (beside the hero), sized from the picture region
    const R = f.pic, ob = own ? ctx.box(own) : null;
    const cw = Math.min(R.w * (f.wide ? 0.5 : 0.86), 760 * (Math.min(f.W, f.H) / 1080));
    const u = cw / 420; // the web column was ~420 px wide
    const rowH = Math.min((R.h * 0.86) / n, 120 * u);
    const ch = rowH * n;
    const cx = ob ? ML.clamp(ob.x + ob.w / 2, R.x + cw / 2, R.x + R.w - cw / 2) : R.x + R.w / 2;
    const cy = ob ? ML.clamp(ob.y + ob.h / 2, R.y + ch / 2, R.y + R.h - ch / 2) : R.y + R.h / 2;
    const numS = Math.min(34 * u, rowH * 0.5), pad = Math.min(26 * u, (rowH - numS) * 0.42); // short rows: the padding and number give way, nothing is cut
    const col = mk("div", `position:absolute;left:${(cx - cw / 2).toFixed(1)}px;top:${(cy - ch / 2).toFixed(1)}px;width:${cw.toFixed(1)}px;height:${ch.toFixed(1)}px;display:grid;grid-template-rows:repeat(${n}, 1fr);background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * 0.6);overflow:hidden;box-shadow:var(--x-shadow);z-index:6;pointer-events:none;visibility:hidden;direction:${rtl ? "rtl" : "ltr"};`, host);
    const rows = labels.map((lab, i) => {
      const r = mk("div", `display:flex;align-items:flex-end;justify-content:space-between;gap:${(12 * u).toFixed(1)}px;min-height:0;padding:${pad.toFixed(1)}px ${(26 * u).toFixed(1)}px;box-sizing:border-box;${i < n - 1 ? "border-bottom:1px solid var(--x-line);" : ""}`, col);
      const b = mk("b", `flex:0 0 auto;font:700 ${numS.toFixed(1)}px/1 var(--x-head-font);color:var(--x-accent);font-variant-numeric:tabular-nums;letter-spacing:-0.02em;direction:ltr;`, r, "00");
      const ar = ML.ARABIC.test(lab); // Arabic letters join: never spaced
      const s = mk("span", `font:600 ${(10 * u * 1.6).toFixed(1)}px var(--x-label-font);text-transform:${ar ? "none" : "uppercase"};letter-spacing:${ar ? 0 : "0.15em"};color:var(--x-ink);white-space:nowrap;`, r, lab);
      ML.fit(s, cw - 52 * u - numS * 1.6 - 12 * u); // a long label shrinks, never cut by the panel
      return { r, b, s };
    });

    const st = ML.clamp(p.stagger, 0.06, 0.3);
    const times = rows.map((_, i) => at + 0.1 + i * st);
    // which side the clip opens from: the reading start (left in LTR, right in RTL), or the far end
    const fromLeft = (p.direction !== "end") !== rtl;
    const p3 = (t, a, b) => 1 - Math.pow(1 - ML.lin(t, a, b), 3);
    const leave = Math.max(times[n - 1] + 0.9, end - 0.3);
    ctx.sfx(at, "whoosh.soft", 0.16);
    times.forEach((t, i) => ctx.sfx(t + 0.05, "tap", 0.16 + (i === n - 1 ? 0.06 : 0)));

    return {
      draw(t) {
        col.style.visibility = t < at - 1e-6 ? "hidden" : "visible";
        const q = ML.ease(t, leave, leave + 0.3);
        if (own) own.style.visibility = t < at - 1e-6 || (q >= 1 && end < ctx.to - 0.01) ? "" : "hidden"; // back when the move ends before its scene
        col.style.opacity = (ML.ease(t, at, at + 0.2) * (1 - q)).toFixed(4);
        rows.forEach((x, i) => {
          const e = p3(t, times[i], times[i] + 0.5), hid = ((1 - e) * 100).toFixed(3);
          x.r.style.clipPath = e >= 1 ? "none" : fromLeft ? `inset(0 ${hid}% 0 0)` : `inset(0 0 0 ${hid}%)`;
          const v = p.count_up ? Math.round((i + 1) * ML.out(t, times[i], times[i] + 0.5)) : i + 1;
          x.b.textContent = String(v).padStart(2, "0");
        });
      },
    };
  },
});
