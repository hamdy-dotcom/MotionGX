// Brand palette swatches: the look's own colours (read off the page — ground, surface, second accent, accent, muted,
// ink, good) appear one after another, lightest to the action colour, each named with its hex code.
//  · bands: one card (padding 4) of 3–6 equal bands with rounded ends, 10 px caps labels; each grows from the top
//    (scaleY 0 → 1, 0.4 s power3.out, 0.08 s apart), labels fade in last;
//  · bars: tall swatches (radius 22, mono hex bottom-end) that rise from the bottom (scaleY 0 → 1, 0.45 s
//    back.out(1.5)) on the word "colours" when the voice says it — MotionGX's capture scene, reading like a bar chart;
//  · tiles: square tiles (padding 32, gap 16, caps label on top, name 20 + mono hex 12) that rise 30 px and fade in
//    (0.6 s power3.out, 0.1 s apart); the action colour's tile then lifts 4 px with a bigger shadow on its cue.
// The entrance can be swapped (grow / wipe in the reading direction / rise) and the swatches set in columns or rows.
// Source: MotionGX lib/studio-engine/assets/scenes.js S.capture (own: the .pal bars, scaleY from the bottom,
// back.out(1.5), stagger 0.1 on "الألوان"); MengTo/Skills web-design orange-clean-paper-saas palette block +
// gsap-scrolltrigger-storytelling (MIT) for the band card and the tile grid.
ML.define({
  id: "element.palette-swatches",
  category: "element",
  name: "Brand palette swatches",
  does: "The brand's colours appear as bands, bars or square tiles that grow or rise in one after another, labelled with names and hex codes.",
  says: ["brand", "list", "simplicity", "precision"],
  energy: 2,
  targets: ["card", "shape", "list", "chart"],
  duration: [1, 3],
  params: {
    form: { type: "choice", options: ["bands", "bars", "tiles"], default: "bars" },
    count: { type: "number", range: [3, 6], default: 4 },
    entrance: { type: "choice", options: ["grow", "wipe", "rise"], default: "grow" },
    orientation: { type: "choice", options: ["rows", "columns"], default: "columns" },
    stagger: { type: "number", range: [0.06, 0.14], default: 0.1, unit: "s" },
    sync: { type: "choice", options: ["spoken", "stagger"], default: "spoken" },
  },
  pairs: ["element.panel-expand", "text-in.punchline", "data.bar-grow"],
  avoid: ["problem", "urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "own:lib/studio-engine/assets/scenes.js#S.capture", license: "own", note: "band card and tile grid after MengTo/Skills orange-clean-paper-saas and gsap-scrolltrigger-storytelling demos (MIT); colours read from the look, every frame from t" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const ob = own ? ctx.box(own) : null;
    const big = ob && ob.w > f.W * 0.4 && ob.h > f.H * 0.18;
    const R = big ? ob : f.pic;
    const k = Math.min(f.W, f.H) / 1080;
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;display:flex;align-items:center;justify-content:center;`, host);
    mk("div", "position:absolute;inset:0;border-radius:var(--x-radius);background:var(--x-ground);", layer);
    // the look's colours, lightest → the action colour
    const N = Math.round(ML.clamp(p.count, 3, 6));
    const ORDER = {
      3: ["accent-2", "accent", "ink"],
      4: ["panel-2", "accent-2", "accent", "ink"],
      5: ["ground", "panel-2", "accent-2", "accent", "ink"],
      6: ["ground", "panel-2", "accent-2", "accent", "dim", "ink"],
    }[N];
    const NAMES = rtl
      ? { ground: "الخلفية", "panel-2": "السطح", "accent-2": "لون مساعد", accent: "اللون الأساسي", dim: "هادئ", ink: "الحبر" }
      : { ground: "Ground", "panel-2": "Surface", "accent-2": "Accent 2", accent: "Accent", dim: "Muted", ink: "Ink" };
    const probe = mk("i", "position:absolute;visibility:hidden;", layer);
    const rgbOf = (v) => { probe.style.color = `var(--x-${v})`; const m = getComputedStyle(probe).color.match(/[\d.]+/g) || [0, 0, 0]; return m.slice(0, 3).map(Number); };
    const hex = (c) => "#" + c.map((x) => Math.round(x).toString(16).padStart(2, "0")).join("").toUpperCase();
    const lum = (c) => { const l = c.map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]; };
    const inkL = lum(rgbOf("ink")), groundL = lum(rgbOf("ground"));
    const sw = ORDER.map((v) => { const c = rgbOf(v), L = lum(c); return { v, name: NAMES[v], hex: hex(c), on: Math.abs(L - inkL) > Math.abs(L - groundL) ? "var(--x-ink)" : "var(--x-ground)" }; });
    probe.remove();
    const rows = p.orientation === "rows";
    const tall = R.h > R.w * 1.1;
    const W = Math.min(R.w * 0.9, 980 * k * 1.2), Hh = Math.min(R.h * 0.86, W * (rows ? 1 : 0.75));
    const flowDir = rows ? "column" : "row"; // a row already runs right to left on an Arabic page
    let wrap, items = [], labels = [];
    if (p.form === "bands") {
      const bandH = rows ? Math.min(Hh, N * 64 * k * 1.6) : Math.min(Hh * 0.6, 160 * k * 2);
      wrap = mk("div", `position:relative;width:${W}px;height:${bandH}px;box-sizing:border-box;padding:${4 * k * 1.5}px;border-radius:${16 * k * 1.5}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);display:flex;flex-direction:${flowDir};gap:0;`, layer);
      items = sw.map((s, i) => {
        const first = i === 0, last = i === N - 1, r = 12 * k * 1.5;
        const rad = rows ? `${first ? r : 0}px ${first ? r : 0}px ${last ? r : 0}px ${last ? r : 0}px` : (!rtl ? `${first ? r : 0}px ${last ? r : 0}px ${last ? r : 0}px ${first ? r : 0}px` : `${last ? r : 0}px ${first ? r : 0}px ${first ? r : 0}px ${last ? r : 0}px`);
        const b = mk("div", `position:relative;flex:1;background:var(--x-${s.v});border-radius:${rad};display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-start;padding:${10 * k * 1.4}px;box-sizing:border-box;`, wrap);
        const l = mk("div", `font:var(--x-label-weight) ${10 * k * 1.9}px/1.3 var(--x-label-font);letter-spacing:${rtl ? 0 : "0.12em"};text-transform:${rtl ? "none" : "uppercase"};color:${s.on};`, b, s.name);
        mk("div", `font:500 ${10 * k * 1.7}px/1.3 var(--x-mono-font);color:${s.on};opacity:.75;direction:ltr;`, l, s.hex);
        labels.push(l);
        return b;
      });
    } else if (p.form === "bars") {
      const barH = rows ? Math.min((Hh - (N - 1) * 18 * k) / N, 130 * k * 1.3) : Math.min(Hh * 0.62, (tall ? 220 : 160) * k * 1.6);
      wrap = mk("div", `position:relative;width:${W}px;box-sizing:border-box;padding:${36 * k * 1.2}px;border-radius:var(--x-radius);background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);display:flex;flex-direction:column;gap:${22 * k * 1.2}px;`, layer);
      mk("div", `font:var(--x-label-weight) ${22 * k}px/1 var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:${rtl ? "none" : "var(--x-label-case)"};color:var(--x-dim);`, wrap, rtl ? "الألوان" : "Colours");
      const row = mk("div", `display:flex;flex-direction:${flowDir};gap:${18 * k * 1.2}px;${rows ? "" : `height:${barH}px;`}`, wrap);
      items = sw.map((s) => {
        const b = mk("div", `position:relative;flex:1;${rows ? `height:${barH}px;` : ""}border-radius:${22 * k * 1.2}px;background:var(--x-${s.v});box-shadow:inset 0 0 0 1px var(--x-line);`, row);
        const l = mk("span", `position:absolute;bottom:${10 * k * 1.2}px;${rtl ? "left" : "right"}:${14 * k * 1.2}px;font:500 ${20 * k * 1.1}px/1 var(--x-mono-font);color:${s.on};opacity:.85;direction:ltr;`, b, s.hex);
        labels.push(l);
        return b;
      });
    } else {
      const cols = rows ? 1 : tall ? Math.min(2, N) : N;
      const gap = 16 * k * 1.3;
      const tileW = rows ? Math.min(W, Hh * 2.2) : Math.min((W - gap * (cols - 1)) / cols, (Hh - gap * (Math.ceil(N / cols) - 1)) / Math.ceil(N / cols));
      const tileH = rows ? Math.min((Hh - gap * (N - 1)) / N, tileW) : tileW;
      wrap = mk("div", `position:relative;display:grid;grid-template-columns:repeat(${cols}, ${tileW}px);gap:${gap}px;direction:${rtl ? "rtl" : "ltr"};`, layer);
      items = sw.map((s) => {
        const pad = Math.min(32 * k * 1.2, tileH * 0.16);
        const b = mk("div", `position:relative;width:${tileW}px;height:${tileH}px;box-sizing:border-box;padding:${pad}px;border-radius:var(--x-radius);background:var(--x-${s.v});box-shadow:inset 0 0 0 1px var(--x-line), var(--x-shadow);display:flex;flex-direction:column;justify-content:space-between;color:${s.on};`, wrap);
        const fs = Math.min(1, tileH / (200 * k * 1.2));
        mk("div", `font:var(--x-label-weight) ${12 * k * 1.6 * fs}px/1.2 var(--x-label-font);letter-spacing:${rtl ? 0 : "0.14em"};text-transform:${rtl ? "none" : "uppercase"};opacity:.7;`, b, rtl ? "لون" : "Colour");
        const l = mk("div", "", b);
        mk("div", `font:600 ${20 * k * 1.6 * fs}px/1.2 var(--x-body-font);`, l, s.name);
        mk("div", `font:500 ${12 * k * 1.6 * fs}px/1.4 var(--x-mono-font);opacity:.75;direction:ltr;text-align:${rtl ? "right" : "left"};`, l, s.hex);
        labels.push(l);
        return b;
      });
    }
    // times: on the word "colours" when spoken (bars especially), else from the start
    const st = ML.clamp(p.stagger, 0.06, 0.14);
    const w0 = p.sync === "spoken" ? Math.max(at, ctx.word(rtl ? "الألوان" : "colour", at)) : at;
    const t0 = Math.min(w0, end - 0.6 - N * st);
    const T = (i) => Math.max(at, t0) + 0.1 + i * (p.form === "bands" ? Math.min(st, 0.08) : st);
    const labT = T(N - 1) + 0.25;
    const acc = ORDER.indexOf("accent"), liftT = labT + 0.4;
    ctx.sfx(T(0), "pop.soft", 0.3);
    if (N > 3) ctx.sfx(T(Math.floor(N / 2) + 1), "pop.soft", 0.22);
    if (p.form === "tiles") ctx.sfx(liftT, "tap", 0.2);
    const leaveA = Math.max(liftT + 0.5, end - 0.3);
    const p3 = (x) => 1 - Math.pow(1 - x, 3);
    return {
      draw(t) {
        const leave = ML.clamp((t - leaveA) / 0.25);
        layer.style.opacity = (ML.lin(t, at - 0.05, at + 0.15) * (1 - leave)).toFixed(4);
        layer.style.visibility = t < at - 0.06 ? "hidden" : "visible";
        items.forEach((b, i) => {
          const a = T(i);
          let tr = "none", clip = "none", o = 1;
          if (p.entrance === "wipe") {
            const u = ML.ease(t, a, a + 0.45), r = (1 - u) * 100;
            clip = rows && p.form !== "tiles" ? `inset(0 0 ${r}% 0)` : rtl ? `inset(0 0 0 ${r}%)` : `inset(0 ${r}% 0 0)`;
            if (u <= 0) o = 0;
          } else if (p.entrance === "rise" || p.form === "tiles") {
            const u = p3(ML.lin(t, a, a + 0.6)); o = u; tr = `translateY(${((1 - u) * 30 * k * 1.3).toFixed(2)}px)`;
          } else if (p.form === "bands") {
            const u = p3(ML.lin(t, a, a + 0.4)); b.style.transformOrigin = rows ? (rtl ? "right center" : "left center") : "center top";
            tr = rows ? `scaleX(${u.toFixed(4)})` : `scaleY(${u.toFixed(4)})`; o = u > 0 ? 1 : 0;
          } else {
            const u = t < a ? 0 : ML.back(t, a, a + 0.45, 1.5); b.style.transformOrigin = rows ? (rtl ? "right center" : "left center") : "center bottom";
            tr = rows ? `scaleX(${Math.max(0, u).toFixed(4)})` : `scaleY(${Math.max(0, u).toFixed(4)})`; o = u > 0 ? 1 : 0;
          }
          if (p.form === "tiles" && i === acc) {
            const lift = ML.out(t, liftT, liftT + 0.3);
            if (lift > 0) { tr = `translateY(${(-4 * k * 1.5 * lift).toFixed(2)}px)`; b.style.boxShadow = `inset 0 0 0 1px var(--x-line), 0 ${(24 * lift * k).toFixed(1)}px ${(50 * lift * k).toFixed(1)}px -${(12 * k).toFixed(1)}px color-mix(in srgb, var(--x-ink) ${(12 + 20 * lift).toFixed(1)}%, transparent)`; }
            else b.style.boxShadow = "inset 0 0 0 1px var(--x-line), var(--x-shadow)";
          }
          b.style.transform = tr; b.style.clipPath = clip; b.style.opacity = o.toFixed(4);
        });
        labels.forEach((l, i) => { const v = p.form === "tiles" ? 1 : ML.out(t, p.form === "bands" ? labT : T(i) + 0.3, (p.form === "bands" ? labT : T(i) + 0.3) + 0.3); l.style.opacity = v.toFixed(4); });
      },
    };
  },
});
