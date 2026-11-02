// Diagnostic log stream: a short list of timestamped mono rows (left T-00:12…, right a 4 px square + STEP_NAME) under a
// thin-ruled "Diagnostic stream" heading. Brightness ladder: past rows dim, the current row bright with its step name
// boxed (1 px edge, a darker fill, px 6 / py 2) and a square pulsing 1 → .5 → 1 every 2 s on cubic-bezier(.4,0,.6,1)
// (Tailwind animate-pulse), future rows faint with fainter squares. Every beat the box travels to the next row's name
// (0.35 s power2.inOut, its width following the new name) and the colours shift; rows join at the bottom with a
// 0.25 s fade. Rows are the target list's items (as STEP_NAMES), padded with sample steps.
// Source: MengTo/Skills web-design/technical-wireframe-info-layout demo/index.html "Diagnostic Stream" (MIT), ported.
ML.define({
  id: "ui.log-stream-advance",
  category: "ui",
  name: "Diagnostic log stream",
  does: "A short list of timestamped mono log lines where the current step is boxed with a pulsing dot and the highlight steps down line by line.",
  says: ["step", "tech", "time", "proof"],
  energy: 2,
  targets: ["list", "label"],
  duration: [1.5, 6],
  params: {
    rows: { type: "number", range: [4, 8], default: 5 },
    interval: { type: "number", range: [0.4, 1.5], default: 0.8, unit: "s" },
    pulse: { type: "bool", default: true },
  },
  pairs: ["ui.cursor-glide-click", "text-in.scramble"],
  avoid: ["luxury", "playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/technical-wireframe-info-layout", license: "MIT", note: "demo/index.html Diagnostic Stream block (base64 srcdoc, decoded), animated per beat" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const N = Math.round(ML.clamp(p.rows, 4, 8));

    // step names: the target's items (or its text), padded with the source's own steps
    const kids = ctx.el && ctx.el !== ctx.stage ? [...ctx.el.children].map((c) => c.textContent.trim()).filter(Boolean) : [];
    const own = ctx.el && ctx.el !== ctx.stage && !kids.length ? [ctx.el.textContent.trim()].filter(Boolean) : [];
    const sample = rtl ? ["ربط البيانات", "ترتيب العناصر", "تجميع الروابط", "كتابة الفهرس", "فحص النتيجة", "نشر النسخة", "تنظيف الذاكرة", "النظام جاهز"]
      : ["BIND_SOURCE_DATA", "ALIGN_ENTITIES", "COMPILE_EDGES", "WRITE_INDEX", "VERIFY_OUTPUT", "PUSH_BUILD", "FLUSH_CACHE", "SYSTEM_IDLE"];
    const name = (s) => (ML.ARABIC.test(s) ? s : s.toUpperCase().replace(/[\s,.-]+/g, "_").replace(/[^A-Z0-9_]/g, ""));
    const steps = [...kids, ...own].map(name).filter(Boolean).slice(0, N);
    for (let i = 0; steps.length < N; i++) steps.push(sample[i % sample.length]);

    // the panel: inside the target (replacing its items) or in the picture region
    let host;
    if (ctx.el && ctx.el !== ctx.stage) { host = ctx.el; host.replaceChildren(); host.style.display = "block"; }
    else host = mk("div", `position:absolute;left:${f.pic.x}px;top:${f.pic.y}px;width:${f.pic.w}px;height:${f.pic.h}px;display:flex;align-items:center;justify-content:center;`, ctx.scene || ctx.stage);
    const fs = 30 * k;
    const ink = "var(--x-ink)";
    const tone = (pct) => `color-mix(in srgb, ${ink} ${pct}%, transparent)`;
    const panel = mk("div", `position:relative;box-sizing:border-box;width:${host === ctx.el ? "100%" : Math.min(f.pic.w * 0.9, 900 * k).toFixed(1) + "px"};padding:${(40 * k).toFixed(1)}px ${(44 * k).toFixed(1)}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * 0.5);box-shadow:var(--x-shadow);color:${ink};font:500 ${fs.toFixed(1)}px/1.25 var(--x-mono-font);`, host);
    const head = mk("div", `font:300 ${(fs * 0.95).toFixed(1)}px var(--x-label-font);letter-spacing:${rtl ? "0" : "0.24em"};text-transform:uppercase;color:${tone(50)};padding-bottom:${(14 * k).toFixed(1)}px;margin-bottom:${(22 * k).toFixed(1)}px;border-bottom:var(--x-edge) solid ${tone(16)};`, panel, rtl ? "سجل التشخيص" : "Diagnostic Stream");
    const list = mk("div", `position:relative;display:flex;flex-direction:column;gap:${(18 * k).toFixed(1)}px;letter-spacing:${rtl ? "0" : "0.1em"};`, panel);
    // the travelling box sits under the rows
    const boxEl = mk("div", `position:absolute;left:0;top:0;box-sizing:border-box;border:var(--x-edge) solid ${tone(30)};background:color-mix(in srgb, ${ink} 7%, var(--x-panel));`, list);
    const sq = 8 * k;
    const rows = steps.map((s, i) => {
      const r = mk("div", "position:relative;display:flex;justify-content:space-between;align-items:center;gap:1em;", list);
      const ts = mk("span", "direction:ltr;unicode-bidi:isolate;", r, `T-00:${String(12 + i).padStart(2, "0")}`);
      const lab = mk("span", `display:flex;align-items:center;gap:${(12 * k).toFixed(1)}px;padding:${(4 * k).toFixed(1)}px ${(12 * k).toFixed(1)}px;white-space:nowrap;`, r);
      const dot = mk("i", `display:block;flex:none;width:${sq.toFixed(1)}px;height:${sq.toFixed(1)}px;`, lab);
      mk("span", "", lab, s);
      return { r, ts, lab, dot };
    });
    // measured places of each step name inside the list
    const L = list.getBoundingClientRect(), scale = L.width / (list.offsetWidth || 1) || 1;
    const rect = rows.map(({ lab }) => { const b = lab.getBoundingClientRect(); return { x: (b.left - L.left) / scale, y: (b.top - L.top) / scale, w: b.width / scale, h: b.height / scale }; });

    // timing: rows join in a quick cascade, then the box steps down every `interval` until the last row or the end
    const join = (i) => at + i * 0.08;
    const first = at + N * 0.08 + 0.2;
    const stepAt = [];
    for (let i = 1; i < N; i++) { const s = first + i * p.interval; if (s > end - 0.4) break; stepAt.push(s); }
    stepAt.forEach((s) => ctx.sfx(s, "tap", 0.22));
    const pulseEase = ML.bezier(0.4, 0, 0.6, 1);
    const inOut = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2); // power2.inOut
    const colour = (rel) => (rel < -1 ? tone(45) : rel < 0 ? tone(62) : rel === 0 ? ink : tone(32));
    const dotColour = (rel) => (rel < 0 ? tone(rel < -1 ? 40 : 55) : rel === 0 ? ink : tone(22));

    return {
      draw(t) {
        // current row and how far the box has travelled toward it
        let cur = 0, u = 1;
        for (let i = 0; i < stepAt.length; i++) if (t >= stepAt[i]) { cur = i + 1; u = inOut(ML.lin(t, stepAt[i], stepAt[i] + 0.35)); }
        const prev = Math.max(0, cur - 1), a = rect[cur === 0 ? 0 : prev], b = rect[cur];
        const m = cur === 0 ? 1 : u;
        const x = a.x + (b.x - a.x) * m, y = a.y + (b.y - a.y) * m, w = a.w + (b.w - a.w) * m, h = a.h + (b.h - a.h) * m;
        const shown = ML.lin(t, first - 0.25, first);
        boxEl.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
        boxEl.style.width = w.toFixed(2) + "px"; boxEl.style.height = h.toFixed(2) + "px";
        boxEl.style.opacity = shown.toFixed(3);
        const pan = ML.lin(t, at - 0.05, at + 0.2);
        panel.style.opacity = pan.toFixed(3);
        rows.forEach(({ r, ts, lab, dot }, i) => {
          r.style.opacity = ML.lin(t, join(i), join(i) + 0.25).toFixed(3);
          // colours change as the box crosses the middle of its trip
          const now = t < first ? -99 : u >= 0.5 || cur === 0 ? cur : prev;
          const rel = t < first ? 1 : i - now;
          r.style.color = colour(rel);
          let o = 1;
          if (rel === 0 && p.pulse) { const ph = (((t - first) % 2) + 2) % 2 / 2; o = 1 - 0.5 * pulseEase(ph < 0.5 ? ph * 2 : 2 - ph * 2); }
          dot.style.background = dotColour(rel);
          dot.style.opacity = o.toFixed(3);
          ts.style.opacity = rel === 0 ? "1" : "0.9";
        });
      },
    };
  },
});
