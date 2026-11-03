// Block lifts out of the screen: two layers — the device (a laptop showing a real screen) and a copy of one real block
// of that screen at the same place. The device recedes (opacity → dim, blur → 4 px, scale → 0.94 over 0.5 s
// power2.out) while the block fades in where it sits (0 → 1, 96 % → 100 %) and grows out toward the viewer to a big
// centred box over the same 0.5 s; its own content comes alive at +0.45 s (its number counts, its bars grow, its rows
// rise). While it holds, it zooms 1 → 1.05 linearly (no float, no sway). It reads because the background recedes the
// moment the block advances. The copy is laid out at its final size and only ever scaled down (sharp at every frame).
// Source: MotionGX lib/live-engine/worker/vendor/recipes.js R.pop (own).
ML.define({
  id: "device.block-lift-out",
  category: "device",
  name: "Block lifts out of the screen",
  does: "The laptop dims and blurs back while one real block of its screen grows out toward the viewer and comes alive.",
  says: ["focus", "proof"],
  energy: 3,
  targets: ["screen", "card"],
  duration: [1.5, 6],
  params: {
    dim: { type: "number", range: [0.15, 0.5], default: 0.25 },
    blur: { type: "number", range: [0, 8], default: 4, unit: "px" },
    back_scale: { type: "number", range: [0.88, 1], default: 0.94 },
    hold_zoom: { type: "number", range: [1, 1.1], default: 1.05 },
  },
  pairs: ["device.laptop-3d-terminal", "camera.push-in"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "own:lib/live-engine/worker/vendor/recipes.js#R.pop", license: "own" },
  setup(ctx) {
    const { p, at, end, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, text, parent) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const layer = ctx.scene || ctx.stage;
    const given = ctx.el && ctx.el.tagName !== "IMG" ? ctx.el : null;
    let dev, block, room, host = null, own = !given;
    if (given) {
      dev = given;
      room = ctx.box(given);
      // the block: the biggest descendant holding 12–65 % of the screen's area
      const A = room.w * room.h;
      let best = null, bestA = 0;
      for (const e of given.querySelectorAll("*")) { const b = ctx.box(e), a = b.w * b.h; if (a > A * 0.12 && a < A * 0.65 && a > bestA) { best = e; bestA = a; } }
      block = best || given.firstElementChild || given;
    } else {
      // a laptop (lid + base) with a real app on its screen
      host = mk("div", "position:absolute;left:var(--pic-x);top:var(--pic-y);width:var(--pic-w);height:var(--pic-h);z-index:4;background:var(--x-ground);display:flex;align-items:center;justify-content:center", null, layer);
      const HW = ctx.f.pic.w, HH = ctx.f.pic.h;
      let LW = Math.min(HW * 0.86, (HH * 0.9) / 0.7), LH = LW * 0.625;
      LW = Math.round(LW); LH = Math.round(LH);
      dev = mk("div", "position:relative;display:flex;flex-direction:column;align-items:center", null, host);
      const lid = mk("div", `position:relative;width:${LW}px;height:${LH}px;box-sizing:border-box;padding:${(LW * 0.022).toFixed(1)}px;background:var(--x-device);border-radius:${(LW * 0.03).toFixed(1)}px ${(LW * 0.03).toFixed(1)}px 0 0;box-shadow:var(--x-shadow)`, null, dev);
      const screen = mk("div", "position:relative;width:100%;height:100%;overflow:hidden;background:var(--x-ground);border-radius:4px", null, lid);
      mk("div", `width:${Math.round(LW * 1.14)}px;height:${Math.round(LW * 0.028)}px;background:linear-gradient(180deg, color-mix(in srgb, var(--x-panel-2) 70%, var(--x-dim)), color-mix(in srgb, var(--x-panel-2) 40%, var(--x-dim)));border-radius:0 0 ${Math.round(LW * 0.04)}px ${Math.round(LW * 0.04)}px;box-shadow:var(--x-shadow)`, null, dev);
      mk("div", `position:absolute;left:50%;bottom:0;translate:-50% 0;width:${Math.round(LW * 0.16)}px;height:${Math.round(LW * 0.012)}px;border-radius:0 0 ${Math.round(LW * 0.012)}px ${Math.round(LW * 0.012)}px;background:color-mix(in srgb, var(--x-panel-2) 55%, var(--x-dim))`, null, dev.lastChild);
      // the app
      const fs = (LW - LW * 0.044) / 46;
      const T = rtl
        ? { nav: ["الرئيسية", "الطلبات", "العملاء", "التقارير"], title: "مبيعات المتجر", stats: [["طلبات جديدة", "1,284"], ["التحويل", "4.7%"]], chart: "الإيراد هذا الشهر", total: 48920, rows: ["أحمد · طلب ٢٤٨", "سارة · طلب ٢٤٩"] }
        : { nav: ["Home", "Orders", "Customers", "Reports"], title: "Store sales", stats: [["New orders", "1,284"], ["Conversion", "4.7%"]], chart: "Revenue this month", total: 48920, rows: ["Maya · order 248", "Omar · order 249"] };
      const app = mk("div", `position:absolute;inset:0;display:flex;font-size:${fs}px;color:var(--x-ink);font-family:var(--x-body-font)`, null, screen);
      const side = mk("div", "flex:none;width:22%;padding:1.1em 0.8em;display:flex;flex-direction:column;gap:0.45em;background:var(--x-panel-2);border-inline-end:var(--x-edge) solid var(--x-line)", null, app);
      mk("div", "width:1.8em;height:1.8em;border-radius:0.5em;background:var(--x-accent);margin-bottom:0.7em", null, side);
      T.nav.forEach((n, i) => { const it = mk("div", `display:flex;align-items:center;gap:0.55em;padding:0.4em 0.6em;border-radius:0.55em;font-size:0.88em;white-space:nowrap;${i === 0 ? "background:color-mix(in srgb, var(--x-accent) 14%, transparent);color:var(--x-accent);font-weight:600" : "color:var(--x-dim)"}`, null, side); mk("i", "width:0.5em;height:0.5em;border-radius:0.16em;background:currentColor;opacity:.7", null, it); mk("span", "", n, it); });
      const main = mk("div", "flex:1;min-width:0;padding:1.2em 1.4em;display:grid;grid-template-columns:1.6fr 1fr;grid-template-rows:auto 1fr;gap:0.9em", null, app);
      mk("div", "grid-column:1 / -1;font:var(--x-head-weight) 1.6em/1.15 var(--x-head-font);letter-spacing:" + (rtl ? 0 : "var(--x-head-track)"), T.title, main);
      const card = "background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * 0.4)";
      const chart = mk("div", `display:flex;flex-direction:column;gap:0.4em;padding:0.9em 1em;min-height:0;${card}`, null, main);
      mk("div", "font-size:0.8em;color:var(--x-dim)", T.chart, chart);
      const num = mk("div", "font:800 2em/1.1 var(--x-head-font);font-variant-numeric:tabular-nums", T.total.toLocaleString("en-US"), chart);
      num.dataset.count = String(T.total);
      const bars = mk("div", "flex:1;min-height:0;display:flex;align-items:flex-end;gap:4%", null, chart);
      for (let i = 0; i < 10; i++) { const b = mk("i", `display:block;flex:1;height:${(28 + 66 * ML.rnd(i, 3) * (0.45 + i / 18)).toFixed(1)}%;transform-origin:50% 100%;border-radius:0.25em 0.25em 0 0;background:${i === 9 ? "var(--x-accent)" : "color-mix(in srgb, var(--x-accent) 32%, transparent)"}`, null, bars); b.dataset.bar = ""; }
      const col = mk("div", "display:flex;flex-direction:column;gap:0.9em;min-height:0", null, main);
      T.stats.forEach(([l, v]) => { const c = mk("div", `padding:0.8em 1em;${card}`, null, col); mk("div", "font-size:0.75em;color:var(--x-dim);white-space:nowrap", l, c); mk("div", "font:700 1.4em var(--x-head-font)", v, c); });
      const list = mk("div", `flex:1;padding:0.7em 1em;display:flex;flex-direction:column;gap:0.5em;${card}`, null, col);
      T.rows.forEach((r) => { const row = mk("div", "display:flex;align-items:center;gap:0.5em;font-size:0.78em;white-space:nowrap", null, list); mk("i", "flex:none;width:1.4em;height:1.4em;border-radius:50%;background:color-mix(in srgb, var(--x-accent-2) 45%, transparent)", null, row); mk("span", "", r, row); });
      block = chart;
      room = { x: ctx.f.pic.x, y: ctx.f.pic.y, w: HW, h: HH };
    }
    // the copy, laid out at its biggest size (box × hold zoom) and scaled down to the place it starts from
    const small = ctx.box(block), aspect = small.w / Math.max(1, small.h);
    // never past a picture's own pixels, if the block holds one (hold zoom included)
    let cap = Infinity;
    for (const im of [block, ...block.querySelectorAll("img")]) if (im.tagName === "IMG" && im.naturalWidth) cap = Math.min(cap, (small.w * im.naturalWidth) / Math.max(1, ctx.box(im).w) / Math.max(1, p.hold_zoom));
    let bw = Math.min(room.w * 0.84, room.h * 0.82 * aspect, Math.max(small.w, cap)), bh = bw / aspect;
    const big = { w: bw, h: bh, x: room.x + (room.w - bw) / 2, y: room.y + (room.h - bh) / 2 };
    const hz = Math.max(1, p.hold_zoom), LWb = big.w * hz, LHb = big.h * hz;
    const fsSmall = parseFloat(getComputedStyle(block).fontSize) || 16;
    // CSS zoom lays the copy out at the big size with every em, border and gap in proportion (no upscaled raster)
    const zk = LWb / small.w;
    const popHost = mk("div", `position:absolute;left:0;top:0;width:${LWb}px;height:${LHb}px;transform-origin:0 0;z-index:6;pointer-events:none;visibility:hidden`, null, layer);
    const pop = block.cloneNode(true);
    pop.removeAttribute("data-slot"); pop.removeAttribute("id");
    pop.querySelectorAll("[data-slot], [id]").forEach((e) => { e.removeAttribute("data-slot"); e.removeAttribute("id"); });
    pop.style.cssText += `;position:absolute;left:0;top:0;margin:0;box-sizing:border-box;width:${small.w}px;height:${small.h}px;font-size:${fsSmall}px;zoom:${zk.toFixed(5)};box-shadow:var(--x-shadow)`;
    popHost.append(pop);
    const counts = [...pop.querySelectorAll("[data-count]")].map((e) => ({ e, v: +e.dataset.count }));
    // alive = a live update: each bar climbs to its new value, the number counts on to its new total
    const growBars = [...pop.querySelectorAll("[data-bar]")].map((e, i) => { const h0 = parseFloat(e.style.height) || 50; return { e, h0, h1: Math.min(98, h0 * (1.08 + 0.3 * ML.rnd(i, 11))) }; });
    const rows = growBars.length || counts.length ? [] : [...pop.children];
    const hasPic = !!dev.querySelector("img") || dev.tagName === "IMG";
    const out2 = (t, a, b) => ML.out(t, a, b); // power2.out
    ctx.sfx(at, "whoosh.soft", 0.45);
    ctx.sfx(at + 0.45, "pop.soft", 0.25);
    const leave = Math.max(at + 1, end - 0.3);
    return {
      draw(t) {
        // the device recedes
        // (a target of the scene comes back as the block goes; our own laptop leaves with it)
        const gone = ML.ease(t, leave, leave + 0.25), r = out2(t, at, at + 0.5) * (own ? 1 : 1 - gone);
        if (own) host.style.opacity = (1 - gone).toFixed(4);
        dev.style.opacity = (1 - (1 - p.dim) * r).toFixed(4);
        dev.style.filter = !hasPic && r * p.blur > 0.05 ? `blur(${(r * p.blur).toFixed(2)}px)` : "none";
        dev.style.scale = r > 0 ? (1 - (1 - p.back_scale) * r).toFixed(4) : "none";
        // the block advances: in place, then out to the big box, then a slow linear zoom while it holds
        if (t < at) { popHost.style.visibility = "hidden"; return; }
        popHost.style.visibility = "visible";
        const g = out2(t, at, at + 0.5), sIn = 0.96 + 0.04 * g;
        const hold = 1 + (hz - 1) * ML.lin(t, at + 0.7, Math.max(at + 1.2, end - 0.2));
        const w = small.w + (big.w - small.w) * g;
        const cx = small.x + small.w / 2 + (big.x + big.w / 2 - small.x - small.w / 2) * g, cy = small.y + small.h / 2 + (big.y + big.h / 2 - small.y - small.h / 2) * g;
        const s = (w / LWb) * sIn * hold; // ≤ 1 always: the copy is laid out at big × hold zoom
        popHost.style.transform = `translate(${(cx - (LWb * s) / 2).toFixed(2)}px, ${(cy - (LHb * s) / 2).toFixed(2)}px) scale(${s.toFixed(5)})`;
        popHost.style.opacity = (ML.clamp((t - at) / 0.25) * (1 - gone)).toFixed(4);
        // the block's own life from +0.45 s
        const life = at + 0.45;
        counts.forEach(({ e, v }) => { e.textContent = Math.round(v * (1 + 0.12 * ML.expo(t, life, life + 1.1))).toLocaleString("en-US"); });
        growBars.forEach((b, i) => { const u = ML.expo(t, life + i * 0.05, life + i * 0.05 + 0.6); b.e.style.height = (b.h0 + (b.h1 - b.h0) * u).toFixed(2) + "%"; });
        rows.forEach((c, i) => { const u = ML.expo(t, life + i * 0.06, life + i * 0.06 + 0.45); c.style.translate = `0 ${(-Math.sin(Math.PI * u) * 8).toFixed(2)}px`; });
      },
    };
  },
});
