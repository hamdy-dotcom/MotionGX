// Before/after slider sweep: two stacked pictures — the before under, the after on top — and the after revealed by a
// clip-path inset whose edge sweeps across on power2.inOut; a 2 px divider in the panel colour with a round handle
// carrying a ‹ › glyph rides the edge, a soft shadow under the handle. Back-and-forth overshoots, returns to ~70 %,
// then goes full. Mirrored for RTL. The before is a second target when the scene gives one (els[1]), a picture named
// by `before_src`, or the same picture in a muted state (grayscale / faded / sepia) built in setup.
// Source: prompt-motion oliahmed205-just-tried-opus-5-5 (reference only — our own code).
ML.define({
  id: "photo.before-after-slider",
  category: "photo",
  name: "Before/after slider sweep",
  does: "A vertical divider with a round handle sweeps across the photo, revealing the changed version behind it.",
  says: ["before-after", "change", "proof", "result"],
  energy: 3,
  targets: ["image", "screen"],
  duration: [1.2, 3],
  params: {
    direction: { type: "choice", options: ["auto", "ltr", "rtl"], default: "auto" },
    stops: { type: "choice", options: ["single", "back-and-forth"], default: "single" },
    duration: { type: "number", range: [0.6, 2], default: 0.9, unit: "s" },
    handle: { type: "bool", default: true },
    before: { type: "choice", options: ["grayscale", "faded", "sepia"], default: "grayscale" },
    before_src: { type: "text", default: "" },
  },
  pairs: ["photo.colorize", "text-in.punchline"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:oliahmed205-just-tried-opus-5-5", license: "reference", note: "rebuilt as our own DOM code" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const host = el.offsetParent || el.parentElement;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    const hr = host.getBoundingClientRect(), er = el.getBoundingClientRect(), k = hr.width / (host.offsetWidth || 1) || 1;
    const L = (er.left - hr.left) / k - host.clientLeft, T = (er.top - hr.top) / k - host.clientTop, W = er.width / k, H = er.height / k;
    const cs = getComputedStyle(el), radius = cs.borderRadius;
    // the before: a second target, a named picture, or the same picture muted
    let before;
    if (ctx.els[1]) { before = ctx.els[1]; el.before(before); } // under the after, wherever the scene had it
    else {
      if (p.before_src && el.tagName === "IMG") { before = el.cloneNode(false); before.src = p.before_src; }
      else before = el.cloneNode(true);
      before.removeAttribute("data-slot");
      before.querySelectorAll && before.querySelectorAll("[data-slot]").forEach((n) => n.removeAttribute("data-slot"));
      if (!p.before_src) {
        const base = cs.filter === "none" ? "" : cs.filter + " ";
        before.style.filter = base + (p.before === "sepia" ? "sepia(0.85) contrast(0.92)" : p.before === "faded" ? "saturate(0.45) contrast(0.8) brightness(1.06)" : "grayscale(1) contrast(0.95)");
      }
      el.before(before);
    }
    Object.assign(before.style, { position: "absolute", left: L + "px", top: T + "px", width: W + "px", height: H + "px", margin: "0", borderRadius: radius, objectFit: cs.objectFit, zIndex: "0" });
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    el.style.zIndex = "1";
    // the divider and its handle
    const hs = ML.clamp(Math.min(W, H) * 0.16, 30, 72), lw = Math.max(2, hs / 18);
    const bar = document.createElement("div");
    bar.style.cssText = `position:absolute;top:${T}px;height:${H}px;width:0;z-index:2;pointer-events:none`;
    bar.innerHTML = `<div style="position:absolute;left:${-lw / 2}px;top:0;width:${lw}px;height:100%;background:var(--x-panel);box-shadow:0 0 ${lw * 3}px color-mix(in srgb, var(--x-ink) 30%, transparent)"></div>` +
      (p.handle ? `<div style="position:absolute;left:${-hs / 2}px;top:${H / 2 - hs / 2}px;width:${hs}px;height:${hs}px;border-radius:50%;background:var(--x-panel);box-shadow:var(--x-shadow);display:flex;align-items:center;justify-content:center;gap:${hs * 0.08}px;color:var(--x-ink);font:700 ${hs * 0.42}px/1 var(--x-body-font)"><span>‹</span><span>›</span></div>` : "");
    el.after(bar);
    const rtl = p.direction === "auto" ? ctx.rtl : p.direction === "rtl";
    // a short scene gets a quicker sweep: the after is always whole before the cut
    const D = Math.min(p.duration, Math.max(0.3, (end - at - 0.1) / (p.stops === "single" ? 1 : 1.2))), inOut = ML.bezier(0.455, 0.03, 0.515, 0.955); // power2.inOut
    const seg = (t, a, b, x0, x1) => x0 + (x1 - x0) * inOut(ML.lin(t, a, b));
    const share = (t) => {
      if (t <= at) return 0;
      if (p.stops === "single") return seg(t, at, at + D, 0, 1);
      const a1 = at + D * 0.5, a2 = a1 + D * 0.28, a3 = a2 + D * 0.42;
      return t < a1 ? seg(t, at, a1, 0, 0.92) : t < a2 ? seg(t, a1, a2, 0.92, 0.7) : seg(t, a2, a3, 0.7, 1);
    };
    const done = at + (p.stops === "single" ? D : D * 1.2);
    ctx.sfx(at, "whoosh.soft", 0.35);
    if (p.stops !== "single") ctx.sfx(at + D * 0.78, "whoosh.soft", 0.2);
    return {
      draw(t) {
        const s = share(t), x = s * 100;
        el.style.clipPath = s >= 1 ? "none" : rtl ? `inset(0 0 0 ${(100 - x).toFixed(3)}%)` : `inset(0 ${(100 - x).toFixed(3)}% 0 0)`;
        before.style.visibility = s >= 1 ? "hidden" : "visible";
        // the divider: shows as the sweep starts, leaves once the after is whole
        const o = ML.lin(t, at - 0.15, at + 0.05) * (1 - ML.lin(t, done + 0.1, done + 0.35));
        bar.style.opacity = o.toFixed(4);
        bar.style.visibility = o > 0.001 ? "visible" : "hidden";
        bar.style.left = (L + (rtl ? W * (1 - s) : W * s)).toFixed(2) + "px";
      },
    };
  },
});
