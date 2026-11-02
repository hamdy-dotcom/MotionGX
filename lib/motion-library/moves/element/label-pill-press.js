// Pill label rises and gets pressed: the label becomes a white pill (full radius, panel colour, an outline icon before
// its words) with a soft shadow, rises from +12 px (scaled to the pill) and fades in over 0.3 s power3.out, holds a
// beat, then is pressed like a button — scale 0.97 and the shadow tightens over 0.1 s — and springs back on release.
// A card target keeps its own face and only rises and gets pressed. The icon's arrow points the reading way.
// Source: prompt-motion "jhylee95-opus-5-5-max-is" (reference only — rebuilt as our own code).
ML.define({
  id: "element.label-pill-press",
  category: "element",
  name: "Pill label rises and gets pressed",
  does: "A white pill label with an icon rises under the headline with a soft shadow and then gets pressed like a button.",
  says: ["step", "tech"],
  energy: 2,
  targets: ["label", "card"],
  duration: [0.5, 1.2],
  params: {
    press: { type: "bool", default: true },
    icon: { type: "bool", default: true },
    hold: { type: "number", range: [0.1, 0.8], default: 0.25, unit: "s" },
    depth: { type: "number", range: [0.94, 0.99], default: 0.97 },
  },
  pairs: ["text-in.punchline", "ui.cursor-click", "element.hard-offset-shadow"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "click",
  source: { from: "prompt-motion:jhylee95-opus-5-5-max-is", license: "reference", note: "the pill, its rise and the spring press are our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    let el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    if (!el) {
      const host = ctx.scene || ctx.stage;
      const holder = doc.createElement("div");
      holder.style.cssText = `position:absolute;left:${f.pic.x}px;top:${f.pic.y}px;width:${f.pic.w}px;height:${f.pic.h}px;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:6;`;
      host.append(holder);
      el = doc.createElement("div"); el.className = "ml-label"; el.textContent = rtl ? "ابدأ الآن" : "Get started"; holder.append(el);
    }
    // a small text element becomes the pill; anything with a body of its own (a card) keeps its face
    const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize) || 22 * k;
    const isLabel = !el.querySelector("img, svg, .ml-panel") && el.children.length < 3 && (el.textContent || "").trim().length < 48;
    if (isLabel) {
      Object.assign(el.style, { display: "inline-flex", alignItems: "center", gap: `${(fs * 0.55).toFixed(1)}px`, padding: `${(fs * 0.62).toFixed(1)}px ${(fs * 1.05).toFixed(1)}px`, background: "var(--x-panel)", color: "var(--x-ink)", borderRadius: "var(--x-radius-s)", border: "var(--x-edge) solid var(--x-edge-color)", whiteSpace: "nowrap", width: "max-content", maxWidth: "100%", boxSizing: "border-box" });
      if (p.icon) {
        // an outline arrow-in-circle, in the accent, pointing the reading way
        const s = (fs * 1.15).toFixed(1);
        const ic = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
        ic.setAttribute("viewBox", "0 0 24 24"); ic.setAttribute("width", s); ic.setAttribute("height", s);
        ic.style.cssText = `flex:none;display:block;color:var(--x-accent);${rtl ? "transform:scaleX(-1);" : ""}`;
        ic.innerHTML = '<circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.5 12h7M12.5 8.5 16 12l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
        el.prepend(ic);
      }
    }
    const h = el.offsetHeight || fs * 2.2;
    const rise = Math.max(12 * k, h * 0.32); // +12 px on a 12 px pill, kept in proportion
    const inEnd = at + 0.3;
    const press = Math.min(inEnd + p.hold, end - 0.35);
    const doPress = p.press && press > inEnd - 0.05;
    const down = 0.1;
    // the shadow: 0 6 18 at rest (ink at 15 %), 0 2 6 pressed
    const sh = (y, b, a) => `0 ${(y * k).toFixed(2)}px ${(b * k).toFixed(2)}px color-mix(in srgb, var(--x-ink) ${a.toFixed(1)}%, transparent)`;
    if (doPress) ctx.sfx(press, "click", 0.5);
    return {
      draw(t) {
        if (t < at) { el.style.opacity = "0"; return; }
        const u = 1 - Math.pow(1 - ML.lin(t, at, inEnd), 4); // power3.out
        const leave = ML.ease(t, end - 0.22, end);
        el.style.opacity = (u * (1 - leave)).toFixed(4);
        let s = 1, q = 0; // q: how pressed (0 rest, 1 down)
        if (doPress && t >= press) {
          const d = ML.out(t, press, press + down);
          // release: a spring back from the pressed state
          const r = t > press + down ? ML.step(t - press - down, { stiffness: 380, damping: 16 }) : 0;
          q = d * (1 - r);
        }
        s = 1 - (1 - p.depth) * q;
        el.style.translate = `0 ${((1 - u) * rise).toFixed(2)}px`;
        el.style.scale = Math.abs(s - 1) < 1e-4 ? "none" : Math.min(1, s).toFixed(4);
        if (isLabel) el.style.boxShadow = sh(6 - 4 * q, 18 - 12 * q, 15 - 3 * q);
      },
    };
  },
});
