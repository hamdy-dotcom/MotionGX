// Status list over a meter: an inset panel (the look's second panel tone, a hairline edge, a soft inner shadow) with a
// mono header row ("PATH" dim / "ACTIVE" accent), a status list with a 1 px rule on its reading edge whose rows tick
// in 0.15 s apart ("Node_A  Clear"), and a 4 px meter under it whose fill (ink) runs 0 → value over 0.8 s power2.out
// with a light sheen pulsing over it (opacity 1 ↔ 0.5, 2 s, cubic-bezier(.4, 0, .6, 1), Tailwind's animate-pulse).
// On a list target its items become the rows; on a chart or with no target the panel is built in the picture region.
// Source: MengTo/Skills web-design company-logos demo, "Fluid Routing" module (MIT).
ML.define({
  id: "data.status-meter",
  category: "data",
  name: "Status list over a meter",
  does: "A mono status list ('Node_A Clear') ticks in above a thin bar that fills to three quarters with a soft pulsing sheen.",
  says: ["tech", "trust", "step"],
  energy: 1,
  targets: ["chart", "list"],
  duration: [1, 4],
  params: {
    rows: { type: "number", range: [1, 4], default: 2 },
    value: { type: "number", range: [0, 1], default: 0.75 },
    pulse: { type: "bool", default: true },
    header: { type: "text", default: "" },
    state: { type: "text", default: "" },
  },
  pairs: ["data.spec-rows", "data.readout-swap"],
  avoid: ["energy", "celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/company-logos/demo/index.html", license: "MIT" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const mk = (tag, css, parent, text) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const scene = ctx.scene || ctx.stage, hb = ctx.box(scene);
    const n = Math.round(ML.clamp(p.rows, 1, 4));
    const kids = el && el.getAttribute("data-slot") === "list" ? [...el.children].map((c) => c.textContent.trim()).filter(Boolean) : [];
    const L = "ABCD", AR = "أبجد";
    const rows = Array.from({ length: n }, (_, i) => [kids[i] || (rtl ? `المسار ${AR[i]}` : `Node_${L[i]}`), rtl ? "سليم" : "Clear"]);
    // the host: over a list slot (it hides under the panel), else a panel in the picture region
    let bx;
    if (el) { const b = ctx.box(el); const w = Math.min(f.W - f.m * 2, Math.max(b.w, f.W * 0.5)); bx = { x: Math.max(f.m, Math.min(f.W - f.m - w, b.x + b.w / 2 - w / 2)), y: b.y + b.h / 2, w }; }
    else { const w = Math.min(f.pic.w * 0.8, f.wide ? f.W * 0.36 : f.W * 0.74); bx = { x: f.pic.x + (f.pic.w - w) / 2, y: f.pic.y + f.pic.h / 2, w }; }
    const k = bx.w / 300; // the source panel is ~300 px wide with 12 px mono
    const panel = mk("div", `position:absolute;left:${(bx.x - hb.x).toFixed(1)}px;top:${(bx.y - hb.y).toFixed(1)}px;width:${bx.w.toFixed(1)}px;translate:0 -50%;z-index:14;box-sizing:border-box;padding:${(16 * k).toFixed(1)}px;background:color-mix(in srgb, var(--x-panel-2) 80%, var(--x-panel));border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * 0.4);box-shadow:inset 0 ${(2 * k).toFixed(1)}px ${(4 * k).toFixed(1)}px color-mix(in srgb, var(--x-ink) 7%, transparent);direction:${rtl ? "rtl" : "ltr"};pointer-events:none`, scene);
    const latin = (s) => !ML.ARABIC.test(s);
    const hText = p.header || (rtl ? "المسار" : "PATH"), sText = p.state || (rtl ? "نشِط" : "ACTIVE");
    const head = mk("div", `display:flex;justify-content:space-between;align-items:center;margin-bottom:${(16 * k).toFixed(1)}px;font:500 ${(12 * k).toFixed(1)}px/1.3 var(--x-mono-font);text-transform:uppercase;color:var(--x-dim)`, panel);
    mk("span", `letter-spacing:${latin(hText) ? "0.08em" : "0"}`, head, hText);
    mk("span", `color:var(--x-accent);letter-spacing:${latin(sText) ? "0.08em" : "0"}`, head, sText);
    const list = mk("div", `display:grid;gap:${(8 * k).toFixed(1)}px;border-inline-start:${Math.max(1, k * 0.6).toFixed(1)}px solid var(--x-line);padding-inline-start:${(12 * k).toFixed(1)}px;font:500 ${(12 * k).toFixed(1)}px/1.35 var(--x-mono-font)`, panel);
    const rowEls = rows.map(([a, b]) => { const r = mk("p", `margin:0;color:var(--x-dim);white-space:nowrap`, list, a); mk("span", `color:var(--x-ink);margin-inline-start:${(8 * k).toFixed(1)}px`, r, b); return r; });
    const track = mk("div", `position:relative;height:${(4 * k).toFixed(1)}px;width:100%;margin-top:${(12 * k).toFixed(1)}px;background:var(--x-line);border-radius:999px;overflow:hidden`, list);
    const fill = mk("div", `position:absolute;top:0;bottom:0;inset-inline-start:0;width:0;background:var(--x-ink);border-radius:999px`, track);
    const sheen = mk("div", `position:absolute;inset:0;background:color-mix(in srgb, var(--x-panel) 20%, transparent)`, fill);
    // sheen: Tailwind's pulse — keyframes 0/100 % opacity 1, 50 % opacity .5, each half eased by cubic-bezier(.4,0,.6,1)
    const bz = ML.bezier(0.4, 0, 0.6, 1);
    const tick = rows.map((_, i) => at + 0.25 + i * 0.15), barAt = tick[tick.length - 1] + 0.2;
    tick.forEach((s, i) => (i === 0 || i === tick.length - 1) && ctx.sfx(s, "tap", 0.2));
    const p2 = (x) => 1 - Math.pow(1 - x, 3);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2), enter = ML.out(t, at, at + 0.3);
        panel.style.opacity = (enter * (1 - leave)).toFixed(4);
        panel.style.translate = `0 calc(-50% + ${((1 - enter) * 12 * k).toFixed(2)}px)`;
        if (el) el.style.opacity = (1 - enter * (1 - leave)).toFixed(4);
        rowEls.forEach((r, i) => { const q = ML.out(t, tick[i], tick[i] + 0.12); r.style.opacity = q.toFixed(4); r.style.translate = `${((1 - q) * 6 * k * (rtl ? 1 : -1)).toFixed(2)}px 0`; });
        fill.style.width = `${(ML.clamp(p.value) * p2(ML.lin(t, barAt, barAt + 0.8)) * 100).toFixed(3)}%`;
        let o = 1;
        if (p.pulse && t > barAt) { const ph = (((t - barAt) % 2) + 2) % 2 / 2, h = ph < 0.5 ? ph * 2 : (ph - 0.5) * 2, e = bz(h); o = ph < 0.5 ? 1 - 0.5 * e : 0.5 + 0.5 * e; }
        sheen.style.opacity = p.pulse ? o.toFixed(4) : "0";
      },
    };
  },
});
