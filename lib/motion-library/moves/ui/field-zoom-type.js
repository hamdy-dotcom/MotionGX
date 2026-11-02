// Zoom to a field, type the real value: the camera inside the screen eases onto its input (0.6 s, the field filling
// most of the window, zoom capped at 3.2×), the field takes focus, and from +0.5 s the value types in over ~1.3 s —
// placeholder → typed text with a caret (MotionGX's K.typeInto) — then the view eases back out to the whole screen so
// the result can show. Works on the given screen (its first field / input) or on a small form it builds; a given line
// becomes the value typed into that form (and leaves its place while the form is up).
// Source: MotionGX live engine worker/vendor/recipes.js typeIn + kit.js K.typeInto / K.focus (own).
ML.define({
  id: "ui.field-zoom-type",
  category: "ui",
  name: "Zoom to field, type real value",
  does: "The camera zooms onto the screen's own input and the value types into it, placeholder to text with a caret, then eases back out.",
  says: ["step", "precision"],
  energy: 2,
  targets: ["screen", "line"],
  duration: [1.8, 3.5],
  params: {
    typing: { type: "number", range: [0.8, 1.6], default: 1.3, unit: "s" },
    zoom_in: { type: "number", range: [0.4, 0.8], default: 0.6, unit: "s" },
    max_zoom: { type: "number", range: [1.4, 3.2], default: 3.2 },
    text: { type: "text" },
    placeholder: { type: "text" },
    zoom_out: { type: "bool", default: true },
  },
  pairs: ["ui.button-fill", "ui.cursor-free-path"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key",
  source: { from: "own:lib/live-engine/worker/vendor/recipes.js#typeIn", license: "own", note: "K.typeInto (placeholder → typed + caret) and K.focus (zoom to a field, cap ZMAX) from worker/vendor/kit.js" },
  setup(ctx) {
    const { el, p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080, px = (v) => (v * k).toFixed(1) + "px";
    const mk = (tag, css, parent, html) => { const e = doc.createElement(tag); e.style.cssText = css; if (html != null) e.innerHTML = html; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const ph = p.placeholder || (rtl ? "اكتب اسمك" : "Your full name");

    // the screen (a viewport that clips, and the content the camera moves) and its field
    let view, content, field, value = null, input = null, wrap = null, button = null;
    const given = el && el !== ctx.stage ? el.querySelector('[data-role="field"], input, textarea, .field') : null;
    const own = !given && el && el !== ctx.stage && !el.querySelector("img, svg, input, button") ? (el.textContent || "").trim() : "";
    const lineEl = own && own.length <= 60 ? el : null;
    const text = p.text || (lineEl ? own : rtl ? "سارة خليل" : "Sara Khalil");
    if (given) {
      view = el;
      // the camera moves everything in the screen: its only child when that holds the field, else a wrapper keeping the layout
      content = el.children.length === 1 && el.firstElementChild.contains(given) ? el.firstElementChild : null;
      if (!content) {
        content = doc.createElement("div");
        content.style.cssText = "display:inherit;flex-direction:inherit;flex-wrap:inherit;align-items:inherit;justify-content:inherit;gap:inherit;grid-template-columns:inherit;grid-template-rows:inherit;width:100%;height:100%;";
        while (el.firstChild) content.append(el.firstChild);
        el.append(content);
      }
      view.style.overflow = "hidden";
      field = given;
      if (given.tagName === "INPUT" || given.tagName === "TEXTAREA") input = given;
      else {
        value = given.querySelector(".uv");
        if (!value) { value = doc.createElement("span"); while (given.firstChild) value.append(given.firstChild); given.append(value); }
      }
    } else {
      const R = f.pic;
      const vw = Math.min(R.w * (f.wide ? 0.6 : 0.88), 920 * k), vh = Math.min(R.h * 0.94, vw * (f.wide ? 0.66 : 1.05));
      wrap = mk("div", `position:absolute;left:${(R.x + (R.w - vw) / 2).toFixed(1)}px;top:${(R.y + (R.h - vh) / 2).toFixed(1)}px;width:${vw.toFixed(1)}px;height:${vh.toFixed(1)}px;display:flex;flex-direction:column;border-radius:var(--x-radius);background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);overflow:hidden;z-index:8;`, host);
      const bar = mk("div", `flex:none;display:flex;align-items:center;gap:${px(10)};padding:${px(18)} ${px(22)};background:var(--x-bar);border-bottom:var(--x-edge) solid var(--x-line);`, wrap);
      bar.dir = "ltr";
      ["--x-light-1", "--x-light-2", "--x-light-3"].forEach((v) => mk("i", `width:${px(14)};height:${px(14)};border-radius:50%;background:var(${v});opacity:var(--x-lights);`, bar));
      view = mk("div", "position:relative;flex:1;overflow:hidden;", wrap);
      // the form's own unit: it fits the window whatever the shape
      const q = Math.min(vw / 860, (vh - 60 * k) / 690), pq = (v) => (v * q).toFixed(1) + "px";
      content = mk("div", `position:absolute;left:0;top:0;width:100%;height:100%;box-sizing:border-box;padding:${pq(48)} ${pq(52)};display:flex;flex-direction:column;justify-content:center;gap:${pq(26)};color:var(--x-ink);`, view);
      mk("div", `font:var(--x-head-weight) ${pq(50)}/1.15 var(--x-head-font);`, content).textContent = rtl ? "افتح حسابك" : "Create your account";
      mk("div", `font:400 ${pq(26)}/1.4 var(--x-body-font);color:var(--x-dim);`, content).textContent = rtl ? "دقيقة واحدة وتبدأ" : "One minute and you're in";
      const fieldBox = (label, phTxt) => {
        const g = mk("div", `display:flex;flex-direction:column;gap:${pq(10)};`, content);
        mk("div", `font:600 ${pq(22)} var(--x-body-font);color:var(--x-dim);`, g).textContent = label;
        const b = mk("div", `display:flex;align-items:center;height:${pq(80)};padding:0 ${pq(24)};border-radius:calc(var(--x-radius) * 0.45);border:${pq(2)} solid var(--x-line);background:var(--x-ground);font:500 ${pq(32)} var(--x-body-font);white-space:nowrap;overflow:hidden;`, g);
        const v = mk("span", "", b); v.textContent = phTxt; v.style.color = "var(--x-dim)";
        return { b, v };
      };
      const a = fieldBox(rtl ? "الاسم الكامل" : "Full name", ph);
      fieldBox(rtl ? "البريد الإلكتروني" : "Email", rtl ? "name@mail.com" : "you@company.com");
      button = mk("div", `margin-top:${pq(8)};display:flex;align-items:center;justify-content:center;height:${pq(84)};border-radius:calc(var(--x-radius) * 0.45);background:var(--x-accent);color:var(--x-accent-ink);font:600 ${pq(32)} var(--x-body-font);`, content);
      button.textContent = rtl ? "متابعة" : "Continue";
      field = a.b; value = a.v;
      for (const c of content.children) c.style.flex = "none";
    }
    const caret = value ? mk("span", `display:inline-block;width:${Math.max(2, 3 * k).toFixed(1)}px;height:1.1em;margin-inline-start:${px(2)};vertical-align:-0.15em;background:var(--x-accent);opacity:0;`, value.parentNode) : null;
    if (caret) value.after(caret);
    const phText = value ? value.textContent : "";
    const phColour = value ? value.style.color : "";

    // the camera: measured in content coordinates (before any transform)
    const VW = view.clientWidth, VH = view.clientHeight;
    const vr = view.getBoundingClientRect(), fr = field.getBoundingClientRect(), cr = content.getBoundingClientRect(), sk = vr.width / (view.offsetWidth || 1) || 1;
    const ox = (cr.left - vr.left) / sk, oy = (cr.top - vr.top) / sk; // where the content sits in the view (a padded screen)
    const fx = (fr.left - vr.left) / sk, fy = (fr.top - vr.top) / sk, fw = fr.width / sk, fh = fr.height / sk;
    const CW = Math.max(content.offsetWidth, content.scrollWidth), CH = Math.max(content.offsetHeight, content.scrollHeight);
    // zoom by the field's height (it should read large, ~a quarter of the window), never past max_zoom; a field wider
    // than the window at that zoom is framed from its typing side, so the value always types into view
    const S = Math.max(1.3, Math.min(p.max_zoom, (VH * 0.26) / fh));
    // never past the content's own edges (unless it is smaller than the view)
    const clampT = (v, size, csize, s, o) => (csize * s < size ? v : Math.min(-o, Math.max(size - o - csize * s, v)));
    const fitsW = fw * S <= VW * 0.9;
    const tx0 = (fitsW ? VW / 2 - (fx - ox + fw / 2) * S : rtl ? VW * 0.94 - (fx - ox + fw) * S : VW * 0.06 - (fx - ox) * S) - ox;
    const TX = clampT(tx0, VW, CW, S, ox), TY = clampT(VH / 2 - (fy - oy + fh / 2) * S - oy, VH, CH, S, oy);
    content.style.transformOrigin = "0 0";

    // timing (recipes typeIn: focus at +0, type from +0.5 for `typing`, result from done + 0.7)
    // squeezed so the value finishes typing and the view is back out inside the span
    const sc = Math.min(1, Math.max(0.5, end - at) / (0.45 + 0.5 + p.typing + (p.zoom_out ? 0.4 + p.zoom_in + 0.25 : 0.25)));
    const zin = p.zoom_in * sc, typing = p.typing * sc;
    const tZoom = at + 0.45 * sc, tType = tZoom + 0.5 * sc, tDone = tType + typing, tOut = tDone + 0.4 * sc;
    const chars = Array.from(text);
    for (let i = 0; i < 4; i++) ctx.sfx(tType + (i * typing) / 4, "key", 0.22);
    if (p.zoom_out) ctx.sfx(tOut, "whoosh.soft", 0.15);

    return {
      draw(t) {
        if (wrap) ML.show(wrap, t, at, end - 0.22);
        if (lineEl) lineEl.style.visibility = t >= at ? "hidden" : "";
        // the camera
        const zi = ML.ease(t, tZoom, tZoom + zin), zo = p.zoom_out ? ML.ease(t, tOut, tOut + zin) : 0, z = zi * (1 - zo);
        const s = 1 + (S - 1) * z;
        content.style.transform = z > 0 ? `translate(${(TX * z).toFixed(2)}px, ${(TY * z).toFixed(2)}px) scale(${s.toFixed(4)})` : "none";
        // focus
        const foc = ML.out(t, tZoom, tZoom + 0.25);
        field.style.borderColor = `color-mix(in srgb, var(--x-accent) ${(foc * 100).toFixed(1)}%, var(--x-line))`;
        field.style.boxShadow = foc > 0 ? `0 0 0 ${px(5 * foc)} color-mix(in srgb, var(--x-accent) 18%, transparent)` : "none";
        // the value: placeholder → typed text with a caret (solid while typing, blinking after)
        const n = Math.round(chars.length * ML.lin(t, tType, tDone));
        if (input) input.value = t < tType ? "" : chars.slice(0, n).join("");
        else if (value) {
          if (t < tType) { value.textContent = phText; value.style.color = phColour || "var(--x-dim)"; }
          else { value.textContent = chars.slice(0, n).join(""); value.style.color = "var(--x-ink)"; }
        }
        if (caret) caret.style.opacity = t < tZoom + 0.1 ? "0" : t < tDone ? "1" : String(ML.blink(t - tDone, 1));
        if (button) button.style.scale = p.zoom_out && t > tOut + zin ? (1 - 0.04 * ML.pulse(t, tOut + zin + 0.15, 0.06, 0.25)).toFixed(4) : "none";
      },
    };
  },
});
