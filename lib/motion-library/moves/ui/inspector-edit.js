// Inspector edit: a design tool — the canvas with a selected heading (a thin selection box with four handles and a
// tag) and an inspector column of fields. The pointer glides to one field and clicks (CLICK = WATCH + 0.31 in the
// source): the field takes a focus ring and its value shows selected until typing starts; the new value is typed in
// (typed(value, t, STILL + 0.1, STILL + 0.5)), the caret blinks on a 0.5 s period after, and the heading follows the
// value live — letter-spacing --ls = 0.02 + 0.1·ease(TYPE1, TYPE1 + 0.35) em (or its size, colour or corner radius).
// The pointer leaves and the selection box fades over 0.3 s. A gentle camera push (the source holds 4.4×) makes the
// change read. Arabic headings never get letter-spacing (it breaks the joined letters): word spacing widens instead.
// Ported from MengTo/Skills media/html-reel demo (MIT): the field / caret / --ls draw and the .sel-box handles.
ML.define({
  id: "ui.inspector-edit",
  category: "ui",
  name: "Inspector field edit changes the design live",
  does: "The pointer clicks a letter-spacing field, the value is selected and retyped, and the heading on the canvas visibly widens its spacing.",
  says: ["change", "precision", "tech"],
  energy: 3,
  targets: ["screen", "headline", "label"],
  duration: [1, 2.5],
  params: {
    property: { type: "choice", options: ["letter-spacing", "size", "colour", "radius"], default: "letter-spacing" },
    duration: { type: "number", range: [0.3, 0.6], default: 0.35, unit: "s" },
    push: { type: "number", range: [1, 1.6], default: 1.12 },
    heading: { type: "text" },
  },
  pairs: ["ui.selection-handles", "camera.push-in", "ui.cursor-glide-click"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key",
  source: { from: "MengTo/Skills:media/html-reel", license: "MIT", note: "demo/index.html draw (field, caret, --ls) and .sel-box rebuilt on the look variables" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, html) => { const e = doc.createElement(tag); e.style.cssText = css; if (html != null) e.innerHTML = html; parent.append(e); return e; };
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const own = el && el.children.length === 0 ? (el.textContent || "").trim() : "";
    const text = p.heading || own || (rtl ? "صمّم بهدوء" : "Design in calm");
    const arabic = ML.ARABIC.test(text);

    // the window: canvas + inspector, inside the picture region
    const R = f.pic;
    const W = Math.min(R.w, f.wide ? 1300 * k : R.w), H = Math.min(R.h, W * (f.wide ? 0.56 : f.tall ? 0.95 : 0.7));
    const view = mk("div", `position:absolute;left:${(R.x + (R.w - W) / 2).toFixed(1)}px;top:${(R.y + (R.h - H) / 2).toFixed(1)}px;width:${W.toFixed(1)}px;height:${H.toFixed(1)}px;overflow:hidden;border-radius:calc(var(--x-radius) * 0.6);box-shadow:var(--x-shadow);border:var(--x-edge) solid var(--x-edge-color);background:var(--x-panel-2);z-index:6;pointer-events:none;`, ctx.scene || ctx.stage);
    view.dir = rtl ? "rtl" : "ltr";
    const stack = f.tall || W < 1000 * k; // narrow frames: the canvas above, the inspector below
    const world = mk("div", `position:absolute;inset:0;display:flex;flex-direction:${stack ? "column" : "row"};`, view);
    const bar = 44 * k;
    // the canvas side
    const canvas = mk("div", `position:relative;flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;`, world);
    mk("div", `height:${bar.toFixed(1)}px;flex:none;display:flex;align-items:center;gap:${(8 * k).toFixed(1)}px;padding:0 ${(16 * k).toFixed(1)}px;background:var(--x-bar);border-bottom:var(--x-edge) solid var(--x-line);`, canvas,
      ["--x-light-1", "--x-light-2", "--x-light-3"].map((v) => `<i style="width:${(12 * k).toFixed(1)}px;height:${(12 * k).toFixed(1)}px;border-radius:50%;background:var(${v});opacity:var(--x-lights)"></i>`).join(""));
    const art = mk("div", `position:relative;flex:1;margin:${(26 * k).toFixed(1)}px;border-radius:calc(var(--x-radius) * 0.4);background:linear-gradient(160deg, var(--x-accent), var(--x-accent-2));display:flex;align-items:center;justify-content:center;overflow:visible;`, canvas);
    const artW = (stack ? W : W - Math.max(220 * k, Math.min(W * 0.36, 380 * k))) - 52 * k;
    const hsz = ML.clamp((artW * 0.5) / Math.max(5, Array.from(text).length) * 1.9, 36 * k, 104 * k);
    const hWrap = mk("div", `position:relative;display:inline-block;`, art);
    const h1 = mk("div", `position:relative;padding:${(0.12 * hsz).toFixed(1)}px ${(0.3 * hsz).toFixed(1)}px;font:var(--x-head-weight) ${hsz.toFixed(1)}px/1.1 var(--x-head-font);color:var(--x-accent-ink);white-space:nowrap;`, hWrap);
    h1.textContent = text;
    // the selection box around the heading, its handles and its tag
    const sel = mk("div", `position:absolute;inset:${(-6 * k).toFixed(1)}px;border:${Math.max(1, 2 * k).toFixed(1)}px solid var(--x-accent-ink);`, hWrap);
    const hd = 10 * k;
    [["0", "0"], ["100%", "0"], ["0", "100%"], ["100%", "100%"]].forEach(([x, y]) => mk("i", `position:absolute;left:${x};top:${y};width:${hd.toFixed(1)}px;height:${hd.toFixed(1)}px;margin:${(-hd / 2).toFixed(1)}px;box-sizing:border-box;border:${Math.max(1, 2 * k).toFixed(1)}px solid var(--x-accent);background:var(--x-accent-ink);`, sel));
    mk("span", `position:absolute;inset-inline-start:0;bottom:calc(100% + ${(6 * k).toFixed(1)}px);padding:${(4 * k).toFixed(1)}px ${(8 * k).toFixed(1)}px;border-radius:${(4 * k).toFixed(1)}px;background:var(--x-accent-ink);color:var(--x-accent);font:600 ${(16 * k).toFixed(1)}px var(--x-label-font);letter-spacing:0;`, sel, "H1");

    // the inspector side
    const insW = Math.max(220 * k, Math.min(W * 0.36, 380 * k));
    const ins = stack
      ? mk("div", `flex:none;box-sizing:border-box;background:var(--x-panel);border-top:var(--x-edge) solid var(--x-line);padding:${(22 * k).toFixed(1)}px ${(26 * k).toFixed(1)}px;display:grid;grid-template-columns:1fr 1fr;gap:${(16 * k).toFixed(1)}px ${(26 * k).toFixed(1)}px;`, world)
      : mk("div", `flex:none;width:${insW.toFixed(1)}px;box-sizing:border-box;background:var(--x-panel);border-inline-start:var(--x-edge) solid var(--x-line);padding:${(bar + 18 * k).toFixed(1)}px ${(20 * k).toFixed(1)}px ${(20 * k).toFixed(1)}px;display:flex;flex-direction:column;gap:${(16 * k).toFixed(1)}px;`, world);
    mk("div", `${stack ? "grid-column:1 / -1;" : ""}font:var(--x-label-weight) ${(15 * k).toFixed(1)}px var(--x-label-font);letter-spacing:${rtl ? "0" : "var(--x-label-track)"};text-transform:var(--x-label-case);color:var(--x-dim);`, ins, rtl ? "النص" : "Type");
    const prop = p.property;
    const L = rtl
      ? { "letter-spacing": arabic ? "المسافة" : "التباعد", size: "الحجم", colour: "اللون", radius: "الحواف" }
      : { "letter-spacing": arabic ? "Word" : "Letter", size: "Size", colour: "Colour", radius: "Radius" };
    const FROM = { "letter-spacing": arabic ? "0.05em" : "0.02em", size: String(Math.round(hsz / k)), colour: "FFFFFF", radius: "0" };
    const TO = { "letter-spacing": arabic ? "0.6em" : "0.12em", size: String(Math.round((hsz * 1.3) / k)), colour: "14141C", radius: "24" };
    const order = ["size", "letter-spacing", "colour", "radius"];
    const fs = 20 * k;
    let field = null, valEl = null, caret = null;
    for (const key of order) {
      const row = mk("div", `display:flex;align-items:center;gap:${(10 * k).toFixed(1)}px;min-width:0;`, ins);
      mk("em", `font:normal 500 ${(fs * 0.85).toFixed(1)}px var(--x-body-font);color:var(--x-dim);width:38%;white-space:nowrap;overflow:hidden;`, row, L[key]);
      const box = mk("div", `position:relative;flex:1;min-width:0;height:${(fs * 2).toFixed(1)}px;box-sizing:border-box;border-radius:${(8 * k).toFixed(1)}px;background:var(--x-panel-2);border:var(--x-edge) solid var(--x-line);display:flex;align-items:center;gap:${(6 * k).toFixed(1)}px;padding:0 ${(10 * k).toFixed(1)}px;font:500 ${fs.toFixed(1)}px var(--x-mono-font);color:var(--x-ink);direction:ltr;white-space:nowrap;overflow:hidden;`, row);
      if (key === "colour") mk("i", `flex:none;width:${(fs * 0.9).toFixed(1)}px;height:${(fs * 0.9).toFixed(1)}px;border-radius:${(4 * k).toFixed(1)}px;background:${key === prop ? "var(--x-accent-ink)" : "var(--x-ink)"};border:var(--x-edge) solid var(--x-line);`, box);
      const v = mk("span", key === prop ? "will-change:transform;" : "", box);
      v.textContent = key === prop ? FROM[key] : key === "colour" ? "14141C" : key === "size" ? String(Math.round(hsz / k)) : key === "radius" ? "0" : "0.02em";
      if (key === prop) {
        field = box; valEl = v;
        caret = mk("i", `display:inline-block;width:${Math.max(2, 2 * k).toFixed(1)}px;height:1.1em;background:var(--x-accent);margin-inline-start:-${(4 * k).toFixed(1)}px;`, box);
        if (key === "colour") box.querySelector("i").style.willChange = "transform";
      }
    }
    if (!stack) mk("div", `flex:1;`, ins);
    if (!stack) mk("div", `height:${(fs * 2).toFixed(1)}px;border-radius:${(8 * k).toFixed(1)}px;background:var(--x-accent);opacity:0.9;`, ins);

    // the pointer, anchored at its tip
    const ps = 46 * k;
    const ptr = mk("div", `position:absolute;left:0;top:0;width:${ps.toFixed(1)}px;height:${ps.toFixed(1)}px;z-index:3;filter:drop-shadow(0 ${(3 * k).toFixed(1)}px ${(5 * k).toFixed(1)}px rgba(0,0,0,.25));`, world,
      `<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M5 2 L5 19 L9.5 15.5 L12.5 22 L15.5 20.5 L12.5 14 L18.5 14 Z" fill="var(--x-pointer)" stroke="var(--x-pointer-edge)" stroke-width="1.4" stroke-linejoin="round"/></svg>`);

    // measure (world space, before any push) where the field and heading sit
    const vb = view.getBoundingClientRect(), sc = vb.width / (view.offsetWidth || 1) || 1;
    const rel = (e) => { const r = e.getBoundingClientRect(); return { x: (r.left - vb.left) / sc, y: (r.top - vb.top) / sc, w: r.width / sc, h: r.height / sc }; };
    const fb = rel(field), hb = rel(h1);
    const FIELD = { x: fb.x + fb.w * (rtl ? 0.25 : 0.7), y: fb.y + fb.h * 0.7 };
    const IDLE = { x: hb.x + hb.w * 0.5, y: Math.min(H - ps, hb.y + hb.h + 60 * k) };

    // timing (the reel's WATCH / CLICK / TYPE / AWAY, packed into the move's span)
    const span = Math.max(1, end - at);
    const WATCH = at + 0.15, CLICK = Math.min(WATCH + 0.31 + 0.25, at + span * 0.35);
    const TYPE = [CLICK + 0.3, CLICK + 0.7];
    const D = ML.clamp(p.duration, 0.3, 0.6);
    const AWAY = [TYPE[1] + D + 0.1, TYPE[1] + D + 0.6];
    ctx.sfx(CLICK - 0.01, "click", 0.4);
    ctx.sfx(TYPE[0] + 0.05, "key", 0.22);
    ctx.sfx(TYPE[0] + 0.3, "key", 0.18);
    const from = FROM[prop], to = TO[prop];
    const lerp = (a, b, x) => a + (b - a) * x;
    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.25, end);
        view.style.opacity = (ML.out(t, at, at + 0.3) * (1 - leave)).toFixed(4);
        // a gentle push toward the space between the field and the heading
        const pu = 1 + (ML.clamp(p.push, 1, 1.6) - 1) * ML.ease(t, at, CLICK + 0.2);
        // the push pivots on the inspector's outer edge, so the fields stay whole and the canvas grows away from them
        const ox = stack ? W / 2 : rtl ? 0 : W, oy = stack ? H : (FIELD.y + hb.y + hb.h / 2) / 2;
        world.style.transformOrigin = `${ox.toFixed(1)}px ${oy.toFixed(1)}px`;
        world.style.scale = Math.abs(pu - 1) < 1e-4 ? "none" : pu.toFixed(4);
        // the pointer: idle sway, glide to the field, click, leave
        const g = ML.ease(t, WATCH, CLICK - 0.04), aw = ML.ease(t, AWAY[0], AWAY[1]);
        let x = lerp(IDLE.x + 8 * k * Math.sin(t * 1.3), FIELD.x, g), y = lerp(IDLE.y + 5 * k * Math.sin(t * 0.9 + 1), FIELD.y, g);
        x = lerp(x, x + (rtl ? 70 : -70) * k, aw); y = lerp(y, y + 60 * k, aw);
        const press = 1 - 0.14 * ML.pulse(t, CLICK, 0.05, 0.12);
        ptr.style.translate = `${(x - ps * 0.21).toFixed(2)}px ${(y - ps * 0.08).toFixed(2)}px`;
        ptr.style.scale = press.toFixed(4);
        ptr.style.opacity = (ML.lin(t, at + 0.05, at + 0.2) * (1 - ML.ease(t, AWAY[1] - 0.3, AWAY[1]))).toFixed(4);
        // the field: focus ring, the value selected until typing, typed, caret
        const focused = t >= CLICK && t < AWAY[1] + 0.2;
        field.style.boxShadow = focused ? `0 0 0 ${Math.max(2, 3 * k).toFixed(1)}px color-mix(in srgb, var(--x-accent) 45%, transparent)` : "none";
        field.style.borderColor = focused ? "var(--x-accent)" : "var(--x-line)";
        const selected = t >= CLICK && t < TYPE[0];
        valEl.style.background = selected ? "color-mix(in srgb, var(--x-accent) 28%, transparent)" : "transparent";
        valEl.textContent = t < TYPE[0] ? from : ML.typed(to, t, TYPE[0], TYPE[1]);
        const typing = t >= TYPE[0] && t < TYPE[1] + 0.1;
        caret.style.opacity = focused && t >= TYPE[0] && (typing || Math.floor((t - TYPE[1]) / 0.5) % 2 === 1) ? "1" : "0";
        if (prop === "colour") field.querySelector("i").style.background = t >= TYPE[1] ? "var(--x-ink)" : "var(--x-accent-ink)";
        // the design follows the value
        const v = ML.ease(t, TYPE[1], TYPE[1] + D);
        if (prop === "letter-spacing") {
          if (arabic) { h1.style.wordSpacing = `${(0.05 + 0.55 * v).toFixed(4)}em`; h1.style.letterSpacing = "0"; }
          else { h1.style.letterSpacing = `${(0.02 + 0.1 * v).toFixed(4)}em`; h1.style.paddingInlineStart = `calc(${(0.3 * hsz).toFixed(1)}px + ${(0.02 + 0.1 * v).toFixed(4)}em)`; }
        } else if (prop === "size") h1.style.fontSize = `${(hsz * (1 + 0.3 * v)).toFixed(2)}px`;
        else if (prop === "colour") h1.style.color = `color-mix(in srgb, var(--x-ink) ${(v * 100).toFixed(1)}%, var(--x-accent-ink))`;
        else if (prop === "radius") { h1.style.background = "color-mix(in srgb, var(--x-accent-ink) 22%, transparent)"; h1.style.borderRadius = `${(24 * k * v).toFixed(2)}px`; }
        // the selection box fades after the pointer leaves
        sel.style.opacity = (ML.lin(t, at + 0.1, at + 0.3) * (1 - ML.ease(t, AWAY[1], AWAY[1] + 0.3))).toFixed(4);
      },
    };
  },
});
