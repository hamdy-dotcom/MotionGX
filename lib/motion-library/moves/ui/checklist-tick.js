// Checklist ticks off: each row of a list gets a check at its start; one after another (a steady interval, or on
// the row's spoken word) the checks fill. flat-circle (MotionGX's plan scene): a 58 px circle with a 3 px hairline
// edge whose background and edge turn the good colour over 0.2 s, a check in the accent ink inside, a confirm click
// each. skeuo-square (MengTo's high-contrast skeuomorphic checkbox): a small sunken box (the ink, an inset shadow,
// a darker ring) that pops .85 -> 1.08 -> 1 on back.out over 0.3 s into a lit gradient of the colour with an inner
// highlight and a soft glow, its check drawing in (stroke-dashoffset, 0.2 s). Optional strike: a 1 px line draws
// across the label (scaleX 0 -> 1 from the reading start, 0.25 s) while the label dims. RTL: checks on the right,
// strikes drawn right to left.
// Sources: MotionGX lib/studio-engine/assets/scenes.js S.plan (own); MengTo/Skills web-design
// high-contrast-skeuomorphic-clean demo (MIT) for the skeuomorphic box.
ML.define({
  id: "ui.checklist-tick",
  category: "ui",
  name: "Checklist ticks off",
  does: "The check boxes of a list fill with colour one after another, optionally striking through and dimming each task.",
  says: ["step", "result", "list", "relief"],
  energy: 2,
  targets: ["list", "label"],
  duration: [0.6, 3],
  params: {
    style: { type: "choice", options: ["flat-circle", "skeuo-square"], default: "flat-circle" },
    interval: { type: "number", range: [0.2, 0.4], default: 0.3, unit: "s" },
    strike: { type: "bool", default: false },
    colour: { type: "text", default: "" },
    sync: { type: "choice", options: ["stagger", "spoken"], default: "stagger" },
  },
  pairs: ["ui.list-rows-stagger", "ui.progress-fill"],
  avoid: ["problem"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "click.confirm",
  source: { from: "own:lib/studio-engine/assets/scenes.js", license: "own", note: "S.plan check circles; skeuo box from MengTo/Skills high-contrast-skeuomorphic-clean (MIT)" },
  setup(ctx) {
    const { el, p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const C = p.colour && String(p.colour).trim() ? String(p.colour).trim() : "var(--x-good)";
    // the rows: the target's items (one wrapper deep), a single label as one row, or a sample list
    let rows = [], list = null;
    const target = el && el !== ctx.stage ? el : null;
    if (target) {
      let box = target;
      while (box.children.length === 1 && box.firstElementChild.children.length > 1) box = box.firstElementChild;
      rows = box.children.length >= 2 ? [...box.children].filter((c) => c.textContent.trim()) : [target];
    }
    if (!rows.length || (rows.length === 1 && !rows[0].textContent.trim())) {
      const R = f.pic;
      list = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;display:flex;flex-direction:column;justify-content:center;gap:${(22 * k).toFixed(1)}px;z-index:5;font:600 ${(40 * k).toFixed(1)}px var(--x-body-font);color:var(--x-ink)`, ctx.scene || ctx.stage);
      list.dir = rtl ? "rtl" : "ltr";
      rows = (rtl ? ["اختار الخطة", "اكتب رقمك", "أكّد الطلب"] : ["Pick a plan", "Add your number", "Confirm the order"]).map((x) => mk("div", `padding:${(26 * k).toFixed(1)}px ${(30 * k).toFixed(1)}px;background:var(--x-panel);border-radius:calc(var(--x-radius) * 0.85);box-shadow:var(--x-shadow)`, list, x));
    }
    const skeuo = p.style === "skeuo-square";
    const items = rows.map((row) => {
      const fsz = parseFloat(getComputedStyle(row).fontSize) || 28;
      // the label: the row's own content, wrapped so a strike spans the words only
      const label = mk("span", "position:relative;display:inline-block");
      while (row.firstChild) label.append(row.firstChild);
      if (getComputedStyle(row).display === "inline") row.style.display = "inline-flex";
      else if (!/flex|grid/.test(getComputedStyle(row).display)) row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.gap = (fsz * 0.55).toFixed(1) + "px";
      const size = skeuo ? fsz * 0.9 : Math.min(58 * k, fsz * 1.5);
      const bw = Math.max(2, 3 * k * (size / (58 * k)));
      const mark = mk("span", `flex:none;position:relative;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;` + (skeuo
        ? `border-radius:${(size * 0.25).toFixed(1)}px;background:var(--x-device);box-shadow:0 0 0 ${Math.max(1, 1.5 * k).toFixed(1)}px color-mix(in srgb, var(--x-ink) 70%, var(--x-dim)), inset 0 2px 4px color-mix(in srgb, var(--x-device) 60%, transparent)`
        : `border-radius:50%;border:${bw.toFixed(1)}px solid var(--x-line);background:transparent`));
      const svg = doc.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.style.cssText = `width:${skeuo ? "78%" : "60%"};height:${skeuo ? "78%" : "60%"};overflow:visible`;
      const path = doc.createElementNS(NS, "path");
      path.setAttribute("d", "M5 12.5l4.5 4.5L19 7.5");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "var(--x-accent-ink)");
      path.setAttribute("stroke-width", skeuo ? "3" : "3.2");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("pathLength", "1");
      path.style.strokeDasharray = "1";
      svg.append(path);
      mark.append(svg);
      // the light fill under the check (skeuo: a lit gradient; flat: the colour)
      const fill = mk("span", `position:absolute;inset:${skeuo ? "0" : `-${bw.toFixed(1)}px`};border-radius:inherit;opacity:0;background:${skeuo ? `linear-gradient(135deg, color-mix(in srgb, ${C} 70%, var(--x-panel)), color-mix(in srgb, ${C} 85%, var(--x-device)))` : C};${skeuo ? `box-shadow:inset 0 1px 1px color-mix(in srgb, var(--x-panel) 50%, transparent), 0 0 0 ${Math.max(1, 1.5 * k).toFixed(1)}px color-mix(in srgb, ${C} 80%, var(--x-panel)), 0 2px 8px color-mix(in srgb, ${C} 50%, transparent)` : ""}`);
      mark.prepend(fill);
      svg.style.position = "relative";
      row.prepend(mark);
      row.append(label);
      let strike = null;
      if (p.strike) strike = mk("i", `position:absolute;inset-inline:0;top:52%;height:${Math.max(1, fsz * 0.06).toFixed(1)}px;background:currentColor;transform-origin:${rtl ? "right" : "left"} center;transform:scaleX(0);pointer-events:none`, label);
      return { row, mark, fill, path, label, strike, text: label.textContent.trim() };
    });
    // each row's moment
    const t0 = at + 0.15;
    const times = items.map((it, i) => {
      const fb = t0 + i * Math.min(p.interval, items.length > 1 ? Math.max(0.12, (end - t0 - 0.35) / (items.length - 1)) : p.interval);
      if (p.sync !== "spoken") return fb;
      const w = ctx.word(it.text.split(/\s+/).find((x) => ML.plain(x).length > 2) || "", -1);
      return w >= at && w < end ? w : fb;
    });
    for (let i = 1; i < times.length; i++) times[i] = Math.max(times[i], times[i - 1] + 0.12);
    times.forEach((x) => x < end && ctx.sfx(x, "click.confirm", 0.4));
    return {
      draw(t) {
        // a list this move built itself arrives and leaves with it; a target's list is the scene's own
        if (list) list.style.opacity = (ML.out(t, at - 0.1, at + 0.2) * (1 - ML.clamp((t - (end - 0.3)) / 0.25))).toFixed(4);
        items.forEach((it, i) => {
          const a = times[i];
          if (skeuo) {
            // pop .85 -> 1.08 -> 1 (back.out over 0.3 s), the lit fill in, the check drawing over 0.2 s
            const u = ML.clamp((t - a) / 0.3);
            const s = t < a ? 1 : u < 0.4 ? 0.85 + (1.08 - 0.85) * ML.out(u, 0, 0.4) : 1.08 - 0.08 * ML.ease(u, 0.4, 1);
            it.mark.style.scale = s === 1 ? "none" : s.toFixed(4);
            it.fill.style.opacity = ML.lin(t, a, a + 0.12).toFixed(4);
            it.path.style.strokeDashoffset = (1 - ML.out(t, a + 0.05, a + 0.25)).toFixed(4);
          } else {
            // the colour fills over 0.2 s; the check shows with it
            const u = ML.lin(t, a, a + 0.2);
            it.fill.style.opacity = u.toFixed(4);
            it.path.style.strokeDashoffset = (1 - ML.out(t, a, a + 0.2)).toFixed(4);
          }
          if (it.strike) {
            const sk = ML.out(t, a + 0.08, a + 0.33);
            it.strike.style.transform = `scaleX(${sk.toFixed(4)})`;
            it.label.style.opacity = (1 - 0.45 * sk).toFixed(4);
          }
        });
      },
    };
  },
});
