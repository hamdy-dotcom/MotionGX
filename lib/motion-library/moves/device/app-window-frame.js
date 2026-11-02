// App window frame: a desktop window — title bar with traffic lights, an optional row of tabs (Home, tabs with a
// swatch, the active one lifted, a globe and a chevron) — framing the real UI being shown, its chrome drawn by the look:
// panel ground, --x-edge border, --x-radius, --x-shadow; the bar 54 px with 12 px lights and a 21 px label (explainer
// .x-win / .x-bar), its stage designed at 1200 wide and scaled by one k = width / 1200 (html-demo .hd-win). Chrome
// variants: mac (lights + tabs), caption-bar (Paper: the bar becomes an italic serif caption under the window behind a
// hairline, no lights, 2 px radius), hard-poster (Poster: a thick ink edge, a hard offset shadow, an accent bar, square
// lights, a slight tilt) and terminal (no lights, a dashed rule under a short bar, no radius). The window arrives the
// way its look moves, its content rows following in a short stagger; a container for any UI move.
// Sources: MengTo/Skills html-explainer-video scripts/explainer.css (.x-win, .x-bar, .x-lights) and html-demo
// scripts/step-window.css (.hd-win, .hd-bar, .hd-tab) (MIT).
ML.define({
  id: "device.app-window-frame",
  category: "device",
  name: "App window frame (look-driven chrome)",
  does: "A desktop app window with a title bar and traffic lights frames the UI being shown, drawn in the film's look.",
  says: ["tech", "trust"],
  energy: 1,
  targets: ["screen", "card"],
  duration: [1, 20],
  params: {
    chrome: { type: "choice", options: ["mac", "caption-bar", "hard-poster", "terminal"], default: "mac" },
    tilt: { type: "number", range: [-1, 1], default: 0, unit: "deg" },
    radius: { type: "number", range: [0, 16], default: 14, unit: "px" },
    tabs: { type: "bool", default: false },
    label: { type: "text", default: "" },
  },
  pairs: ["ui.agent-windows-streaming", "camera.push-in"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "MengTo/Skills:html-explainer-video/scripts/explainer.css", license: "MIT", note: "with html-demo scripts/step-window.css (MIT)" },
  setup(ctx) {
    const { p, at, end, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, text, parent) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const given = ctx.el && ctx.el.tagName !== "IMG" ? ctx.el : null;
    // the window fills the target (its own content moves inside) or, with no target, the picture region with a sample app
    const host = mk("div", "position:absolute;z-index:4;display:flex;align-items:center;justify-content:center;pointer-events:none", null, ctx.scene || ctx.stage);
    let HW, HH;
    if (given) { const b = ctx.box(given); host.style.cssText += `;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px`; HW = b.w; HH = b.h; }
    else { host.style.cssText += ";left:var(--pic-x);top:var(--pic-y);width:var(--pic-w);height:var(--pic-h);background:var(--x-ground)"; HW = ctx.f.pic.w; HH = ctx.f.pic.h; }
    const chrome = p.chrome, caption = chrome === "caption-bar", poster = chrome === "hard-poster", term = chrome === "terminal";
    // the window's shape: 16:10 (html-demo's stage) where the room is wide, else the room's own shape (never taller than 4:5)
    let WW = HW, WH = HW / 1.6;
    if (given) { WW = HW; WH = HH; }
    else { if (WH > HH) { WH = HH; WW = HH * 1.6; } if (HH / HW > 1.0) { WW = HW; WH = Math.min(HH, HW * 1.25); } }
    WW = Math.round(WW * (poster ? 0.97 : 1)); WH = Math.round(WH * (poster ? 0.95 : 1));
    const k = WW / 1200 * 1.25; // explainer sizes are for a 1080 stage; a 960 px window keeps them
    const px = (v) => (v * k).toFixed(2) + "px";
    const rad = caption ? px(2) : term ? "0px" : poster ? "0px" : `min(var(--x-radius), ${px(p.radius)})`;
    const win = mk("div", `position:relative;width:${WW}px;height:${WH}px;display:flex;flex-direction:column;overflow:hidden;background:var(--x-panel);border-radius:${rad};` +
      (poster ? `border:${px(4)} solid var(--x-ink);box-shadow:${px(12)} ${px(12)} 0 0 var(--x-ink)` : `border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow)`), null, host);
    if (caption) win.style.overflow = "visible", win.style.background = "transparent", win.style.border = "none", win.style.boxShadow = "none";
    // the bar
    const barH = term ? 38 : caption ? 50 : 54;
    const bar = mk("div", `flex:none;display:flex;align-items:center;gap:${px(8)};height:${px(barH)};padding:0 ${px(20)};white-space:nowrap;overflow:hidden;` +
      `font-family:var(--x-label-font);font-weight:var(--x-label-weight);font-size:${px(21)};text-transform:var(--x-label-case);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};`, null, win);
    if (caption) bar.style.cssText += `;order:2;background:transparent;color:var(--x-dim);border-top:1px solid var(--x-line);font:italic 400 ${px(22)} var(--x-serif-font);letter-spacing:0;text-transform:none;justify-content:center;padding-top:${px(6)}`;
    else if (poster) bar.style.cssText += `;background:var(--x-accent);color:var(--x-accent-ink);border-bottom:${px(4)} solid var(--x-ink)`;
    else if (term) bar.style.cssText += `;background:var(--x-panel);color:var(--x-dim);border-bottom:1px dashed var(--x-line);font-family:var(--x-mono-font)`;
    else bar.style.cssText += `;order:var(--x-bar-order);background:var(--x-bar);color:var(--x-bar-ink);border-bottom:var(--x-edge) solid var(--x-edge-color)`;
    if (!caption && !term) {
      const lights = mk("span", `display:flex;gap:${px(8)};margin-inline-end:${px(10)};opacity:var(--x-lights)`, null, bar);
      for (let i = 1; i <= 3; i++) mk("i", `display:block;width:${px(12)};height:${px(12)};border-radius:${poster ? "0" : "50%"};background:var(--x-light-${i});${poster ? `outline:${px(2)} solid var(--x-ink)` : ""}`, null, lights);
    }
    const label = p.label || (rtl ? "لوحة المتجر" : "Store dashboard");
    const svgIcon = (d) => { const s = doc.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.style.cssText = `flex:none;width:${px(20)};height:${px(20)};fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round`; s.innerHTML = d; return s; };
    if (p.tabs && !caption) {
      bar.append(svgIcon('<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'));
      const names = rtl ? [label, "الطلبات", "التقارير"] : [label, "Orders", "Reports"];
      names.forEach((n, i) => {
        const tab = mk("span", `display:inline-flex;align-items:center;gap:${px(9)};min-width:0;max-width:${px(260)};height:${px(34)};padding:0 ${px(13)};border-radius:${px(9)};${i === 0 ? "color:var(--x-ink);background:color-mix(in srgb, var(--x-ink) 8.5%, transparent)" : ""}`, null, bar);
        mk("b", `flex:none;display:block;width:${px(13)};height:${px(13)};border-radius:${px(3)};background:${["var(--x-accent)", "var(--x-accent-2)", "var(--x-good)"][i]}`, null, tab);
        mk("span", "overflow:hidden;text-overflow:ellipsis", n, tab);
      });
      mk("span", "flex:1", null, bar);
      bar.append(svgIcon('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>'));
      bar.append(svgIcon('<path d="M6 9l6 6 6-6"/>'));
    } else {
      const lab = mk("span", `overflow:hidden;text-overflow:ellipsis;${caption ? "" : "flex:1;text-align:center"}`, label, bar);
      if (!caption && !term) mk("span", `width:${px(70)}`, null, bar); // balances the lights so the label sits centred
      if (term) lab.style.textAlign = "start", lab.textContent = (rtl ? "" : "~ / ") + label;
    }
    // the stage under the bar
    const view = mk("div", `position:relative;flex:1;min-height:0;overflow:hidden;background:var(--x-ground);${caption ? `border:var(--x-edge) solid var(--x-edge-color);border-radius:${rad};box-shadow:var(--x-shadow)` : ""}`, null, win);
    let rows;
    if (given) {
      // the target's own content now lives in the window
      const inner = mk("div", "position:absolute;inset:0;overflow:hidden", null, view);
      for (const c of [...given.childNodes]) inner.append(c);
      given.style.visibility = "hidden";
      rows = [...inner.children];
    } else {
      const fs = WW / 46;
      const T = rtl
        ? { nav: ["الرئيسية", "الطلبات", "العملاء", "التقارير"], kick: "اليوم", title: "مبيعات المتجر", stats: [["المبيعات", "48,920"], ["طلبات جديدة", "1,284"], ["التحويل", "4.7%"]], chart: "الإيراد الأسبوعي" }
        : { nav: ["Home", "Orders", "Customers", "Reports"], kick: "Today", title: "Store sales", stats: [["Revenue", "48,920"], ["New orders", "1,284"], ["Conversion", "4.7%"]], chart: "Weekly revenue" };
      const app = mk("div", `position:absolute;inset:0;display:flex;font-size:${fs}px;color:var(--x-ink);font-family:var(--x-body-font)`, null, view);
      const side = mk("div", "flex:none;width:24%;padding:1.2em 0.9em;display:flex;flex-direction:column;gap:0.5em;background:var(--x-panel-2);border-inline-end:var(--x-edge) solid var(--x-line)", null, app);
      mk("div", "width:1.9em;height:1.9em;border-radius:0.55em;background:var(--x-accent);margin-bottom:0.8em", null, side);
      T.nav.forEach((n, i) => { const it = mk("div", `display:flex;align-items:center;gap:0.6em;padding:0.45em 0.7em;border-radius:0.6em;font-size:0.9em;white-space:nowrap;${i === 0 ? "background:color-mix(in srgb, var(--x-accent) 14%, transparent);color:var(--x-accent);font-weight:600" : "color:var(--x-dim)"}`, null, side); mk("i", "width:0.55em;height:0.55em;border-radius:0.18em;background:currentColor;opacity:.7", null, it); mk("span", "", n, it); });
      const main = mk("div", "flex:1;min-width:0;padding:1.3em 1.5em;display:flex;flex-direction:column;gap:1em", null, app);
      const head = mk("div", "", null, main);
      mk("div", `font:var(--x-label-weight) 0.7em var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:var(--x-label-case);color:var(--x-dim)`, T.kick, head);
      mk("div", "font:var(--x-head-weight) 1.7em/1.15 var(--x-head-font);letter-spacing:var(--x-head-track)", T.title, head);
      const stats = mk("div", "display:grid;grid-template-columns:repeat(3,1fr);gap:0.8em", null, main);
      T.stats.forEach(([l, v]) => { const c = mk("div", "padding:0.8em 1em;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * 0.4)", null, stats); mk("div", "font-size:0.75em;color:var(--x-dim);white-space:nowrap", l, c); mk("div", "font:700 1.45em var(--x-head-font);font-variant-numeric:tabular-nums", v, c); });
      const chart = mk("div", "flex:1;min-height:0;display:flex;flex-direction:column;gap:0.6em;padding:0.9em 1em;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * 0.4)", null, main);
      mk("div", "font-size:0.8em;color:var(--x-dim)", T.chart, chart);
      const bars = mk("div", "flex:1;min-height:0;display:flex;align-items:flex-end;gap:3%", null, chart);
      for (let i = 0; i < 12; i++) mk("i", `flex:1;height:${(30 + 62 * ML.rnd(i, 7) * (0.5 + i / 22)).toFixed(1)}%;border-radius:0.25em 0.25em 0 0;background:${i === 11 ? "var(--x-accent)" : "color-mix(in srgb, var(--x-accent) 32%, transparent)"}`, null, bars);
      rows = [side, head, stats, chart];
    }
    ctx.sfx(at, "pop.soft", 0.3);
    const leave = Math.max(at + 0.6, end - 0.3);
    return {
      draw(t) {
        ML.show(win, t, at, leave);
        win.style.rotate = p.tilt ? `${p.tilt}deg` : "none";
        rows.forEach((r, i) => {
          const a = at + 0.18 + i * 0.07, u = ML.expo(t, a, a + 0.5);
          r.style.opacity = ML.clamp(u * 1.4).toFixed(4);
          r.style.translate = `0 ${((1 - u) * 14 * k).toFixed(2)}px`;
        });
      },
    };
  },
});
