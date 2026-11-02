// Chip row pops in: small tag / status / numbered chips pop into a wrapping row one after another, each already at
// its final position (so nothing shifts) — scale 0.6 -> 1 + opacity 0 -> 1 over 0.22 s back.out(2), stagger 0.12 s.
// after-click: status chips land every 0.25–0.5 s starting just after a click, each with a soft rollover sound.
// Chips: a rounded pill (panel-2 fill, 1 px line edge). Icons: none, a dot (the good colour), a check (optionally
// drawing in: stroke-dashoffset 1 -> 0 over 0.25 s at +0.1 s) or a mono number "01" (a table of contents).
// per-item-hue: each chip a 1 px outline + 15% tint of its own look colour (bad, accent, accent-2, amber, good…).
// A list target's items become the chips in place; a label becomes a row of chips (its text, plus the chips param).
// Sources: MotionGX lib/studio-engine/assets/scenes.js S.capture (own: status chips after the click, rollover per
// chip); MengTo/Skills web-design/landing-page SKILL.md (MIT: chip + drawing check); prompt-motion references
// "en-ra-wtf-made-with-claude", "gigabit-million-…" (numbered / tag chips, our own rebuild).
ML.define({
  id: "ui.chip-row-pop",
  category: "ui",
  name: "Chip row pops in",
  does: "Small tag / status / numbered chips pop into a row one after another at their final positions.",
  says: ["list", "result", "choice", "step", "tech"],
  energy: 2,
  targets: ["label", "list"],
  duration: [0.5, 2],
  params: {
    icon: { type: "choice", options: ["none", "dot", "check", "number"], default: "none" },
    colours: { type: "choice", options: ["neutral", "per-item-hue"], default: "neutral" },
    stagger: { type: "number", range: [0.12, 0.5], default: 0.12, unit: "s" },
    start: { type: "choice", options: ["on-beat", "after-click"], default: "on-beat" },
    check_draw: { type: "bool", default: false },
    chips: { type: "text", default: "" },
  },
  pairs: ["ui.cursor-glide-click", "ui.stacked-result-chips"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "own:lib/studio-engine/assets/scenes.js", license: "own", note: "S.capture status chips; check-draw chip from MengTo/Skills landing-page (MIT); numbered / tag chips rebuilt from prompt-motion references" },
  setup(ctx) {
    const { el, p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const target = el && el !== ctx.stage ? el : null;
    const extra = p.chips ? String(p.chips).split(/\s*[,،|]\s*/).filter(Boolean) : [];
    let chips;
    let fs;
    if (target && target.children.length >= 2) {
      // a list: its items are the chips, in place
      chips = [...target.children].filter((c) => c.textContent.trim());
      if (getComputedStyle(target).display !== "flex") { target.style.display = "flex"; }
      target.style.flexWrap = "wrap";
      fs = parseFloat(getComputedStyle(chips[0]).fontSize) || 28;
    } else {
      // a label (or nothing): a wrapping row of chips — the label's text first, then the chips param
      const own = target ? target.textContent.trim() : "";
      let words = [...(own ? [own] : []), ...extra];
      if (words.length < 2 && !extra.length) words = [...words, ...(rtl ? ["الصفحات", "الشاشات", "الألوان", "الخطوط"] : ["Pages", "Screens", "Colours", "Fonts"])].slice(0, own ? 4 : 4);
      let row;
      if (target) { row = target; row.replaceChildren(); fs = Math.max(18, parseFloat(getComputedStyle(target).fontSize) || 24); row.style.textTransform = "none"; row.style.letterSpacing = "0"; }
      else {
        const R = f.pic;
        row = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;align-content:center;justify-content:center;z-index:5`, ctx.scene || ctx.stage);
        fs = Math.max(20, 32 * k);
      }
      row.style.display = "flex"; row.style.flexWrap = "wrap"; row.style.alignItems = "center";
      row.style.gap = (fs * 0.45).toFixed(1) + "px";
      row.dir = rtl ? "rtl" : "ltr";
      chips = words.map((w) => mk("span", `font:500 ${fs.toFixed(1)}px/1.2 var(--x-body-font);color:var(--x-ink)`, row, w));
    }
    const HUES = ["var(--x-bad)", "var(--x-accent)", "var(--x-accent-2)", "var(--x-light-2)", "var(--x-good)", "color-mix(in srgb, var(--x-bad) 50%, var(--x-accent-2))"];
    const items = chips.map((c, i) => {
      const hue = HUES[i % HUES.length];
      const tint = p.colours === "per-item-hue";
      c.style.display = "inline-flex";
      c.style.alignItems = "center";
      c.style.gap = (fs * 0.4).toFixed(1) + "px";
      c.style.padding = `${(fs * 0.36).toFixed(1)}px ${(fs * 0.75).toFixed(1)}px`;
      c.style.borderRadius = p.icon === "number" ? `${(fs * 0.3).toFixed(1)}px` : "var(--x-radius-s)";
      c.style.border = `1px solid ${tint ? hue : "var(--x-line)"}`;
      c.style.background = tint ? `color-mix(in srgb, ${hue} 15%, var(--x-panel))` : "var(--x-panel-2)";
      c.style.boxShadow = "none";
      c.style.transformOrigin = "center";
      let path = null;
      if (p.icon === "dot") c.prepend(mk("span", `flex:none;width:${(fs * 0.5).toFixed(1)}px;height:${(fs * 0.5).toFixed(1)}px;border-radius:50%;background:${tint ? hue : "var(--x-good)"}`));
      else if (p.icon === "number") c.prepend(mk("span", `flex:none;font:600 ${(fs * 0.62).toFixed(1)}px/1 var(--x-mono-font);color:${tint ? hue : "var(--x-dim)"};direction:ltr`, null, String(i + 1).padStart(2, "0")));
      else if (p.icon === "check") {
        const svg = doc.createElementNS(NS, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.style.cssText = `flex:none;width:${(fs * 0.85).toFixed(1)}px;height:${(fs * 0.85).toFixed(1)}px;overflow:visible`;
        path = doc.createElementNS(NS, "path");
        path.setAttribute("d", "M5 12.5l4.5 4.5L19 7.5");
        for (const [a, v] of [["fill", "none"], ["stroke", tint ? hue : "var(--x-good)"], ["stroke-width", "3"], ["stroke-linecap", "round"], ["stroke-linejoin", "round"], ["pathLength", "1"]]) path.setAttribute(a, v);
        path.style.strokeDasharray = "1";
        svg.append(path);
        c.prepend(svg);
      }
      return { c, path };
    });
    // the moments: on the beat from `at`, or just after a click with a status pace (0.25–0.5 s)
    const click = p.start === "after-click";
    const gap = click ? ML.clamp(Math.max(p.stagger, 0.25), 0.25, 0.5) : p.stagger;
    const t0 = click ? at + 0.15 : at + 0.05;
    const room = Math.max(0.2, end - 0.35 - t0);
    const step = items.length > 1 ? Math.min(gap, room / (items.length - 1)) : gap;
    const times = items.map((_, i) => t0 + i * step);
    if (click) ctx.sfx(at, "click", 0.4);
    times.forEach((x, i) => (click || step >= 0.2 || i % 2 === 0) && ctx.sfx(x, click ? "tap" : "pop.soft", 0.3));
    const back2 = (u) => { const c = 2, x = u - 1; return u >= 1 ? 1 : 1 + (c + 1) * x * x * x + c * x * x; };
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.22);
        items.forEach((it, i) => {
          const a = times[i];
          const u = ML.clamp((t - a) / 0.22);
          it.c.style.visibility = t < a ? "hidden" : "visible";
          it.c.style.opacity = (ML.clamp(u * 1.6) * (1 - leave)).toFixed(4);
          const s = 0.6 + 0.4 * back2(u);
          it.c.style.scale = u >= 1 ? "none" : s.toFixed(4);
          if (it.path) it.path.style.strokeDashoffset = p.check_draw ? (1 - ML.out(t, a + 0.1, a + 0.35)).toFixed(4) : "0";
        });
      },
    };
  },
});
