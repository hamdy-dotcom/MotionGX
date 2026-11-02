// Glass surface brighten: a frosted card becomes the focus — its fill lifts by `amount` (blue-cloudy: white 3 % → 6 %
// over 0.5 s), its 1 px edge goes from a faint 7 % line to ~30 % (Kage outline, 0.5 s), and a soft conic sheen
// fades 0 → 0.2 over 0.3 s (Omni's conic overlay). Everything is a tint of the look's ink over the card, so on a dark
// look it reads as the glass brightening and on a light look as the surface coming forward. The card's content never
// moves; the target is used as is, else a frosted card of our own is built in the picture region.
// Source: MengTo/Skills web-design/blue-cloudy-clean-modern demo/index.html (MIT: glass cards bg white/3 → white/6,
// border white/7 hover brightening), rebuilt as a pure function of t.
ML.define({
  id: "ui.surface-brighten",
  category: "ui",
  name: "Glass surface brighten",
  does: "A frosted card's fill and edge brighten slightly as it becomes the focus.",
  says: ["focus", "calm"],
  energy: 1,
  targets: ["card", "screen", "image", "list"],
  duration: [0.3, 0.8],
  params: {
    amount: { type: "number", range: [0.02, 0.3], default: 0.06 },
    edge: { type: "bool", default: true },
    sheen: { type: "bool", default: true },
    dur: { type: "number", range: [0.3, 0.8], default: 0.5, unit: "s" },
  },
  pairs: ["ui.focus-ring", "camera.push-in", "ui.row-focus-highlight"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:web-design/blue-cloudy-clean-modern", license: "MIT", note: "demo/index.html glass cards (bg white/3 → white/6, border white/7 → brighter on hover); Omni conic overlay and Kage outline as noted in the technique" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };

    let card = ctx.el && ctx.el !== ctx.stage ? ctx.el : null, built = false;
    if (!card) {
      // a frosted card of our own: a faint ink tint over the ground, a hairline edge, a small label, a title and a line
      built = true;
      const R = f.pic, w = Math.min(R.w * 0.86, 820 * k), h = Math.min(R.h * 0.6, 520 * k);
      card = mk("div", `position:absolute;left:${(R.x + (R.w - w) / 2).toFixed(1)}px;top:${(R.y + (R.h - h) / 2).toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;box-sizing:border-box;padding:${(56 * k).toFixed(1)}px;border-radius:var(--x-radius);background:color-mix(in srgb, var(--x-ink) 3%, color-mix(in srgb, var(--x-panel) 90%, transparent));display:flex;flex-direction:column;justify-content:flex-end;gap:${(16 * k).toFixed(1)}px;color:var(--x-ink);`, ctx.scene || ctx.stage);
      card.dir = rtl ? "rtl" : "ltr";
      const dot = mk("div", `position:absolute;top:${(56 * k).toFixed(1)}px;${rtl ? "right" : "left"}:${(56 * k).toFixed(1)}px;width:${(64 * k).toFixed(1)}px;height:${(64 * k).toFixed(1)}px;border-radius:calc(var(--x-radius) * 0.5);background:color-mix(in srgb, var(--x-accent) 85%, transparent);`, card);
      dot.style.boxShadow = "var(--x-shadow)";
      mk("div", `font:var(--x-label-weight) ${(22 * k).toFixed(1)}px var(--x-label-font);letter-spacing:${rtl ? "0" : "var(--x-label-track)"};text-transform:${rtl ? "none" : "var(--x-label-case)"};color:var(--x-dim);`, card, rtl ? "مساحة العمل" : "Workspace");
      mk("div", `font:var(--x-head-weight) ${(56 * k).toFixed(1)}px/1.1 var(--x-head-font);letter-spacing:var(--x-head-track);`, card, rtl ? "كل حاجة في مكانها" : "Everything in its place");
      mk("div", `font:var(--x-body-weight) ${(28 * k).toFixed(1)}px/1.4 var(--x-body-font);color:var(--x-dim);`, card, rtl ? "هادي، واضح، جاهز." : "Calm, clear and ready.");
    }
    if (getComputedStyle(card).position === "static") card.style.position = "relative";
    // the brightening lives in two layers over the card (its own fill and content are untouched)
    const tint = mk("div", "position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:-1;", null);
    const sheen = mk("div", "position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:-1;mix-blend-mode:soft-light;background:conic-gradient(from 120deg at 50% -40%, var(--x-panel), var(--x-accent-2), var(--x-glow-1, var(--x-accent)), var(--x-panel), var(--x-accent-2), var(--x-panel));", null);
    card.style.isolation = "isolate";
    card.prepend(sheen); card.prepend(tint);
    const edgeRest = 7, edgeOn = Math.min(60, 7 + 23 * Math.min(2, p.amount / 0.06));
    const out0 = card.style.outline, oo0 = card.style.outlineOffset;
    const amt = ML.clamp(p.amount, 0.02, 0.3) * 100;
    const T = Math.max(at, Math.min(end - 0.2, at + 0.1));

    return {
      draw(t) {
        const u = ML.ease(t, T, T + p.dur), s = ML.out(t, T, T + 0.3);
        const leave = built ? ML.lin(t, end - 0.25, end) : 0;
        // fill: + amount of ink over the card (white 3 % → 6 % on the source's dark glass)
        tint.style.background = u > 0 ? `color-mix(in srgb, var(--x-ink) ${(amt * u).toFixed(2)}%, transparent)` : "transparent";
        sheen.style.opacity = p.sheen ? (0.2 * Math.min(1.5, p.amount / 0.06) * s).toFixed(4) : "0";
        if (p.edge) {
          const e = edgeRest + (edgeOn - edgeRest) * u;
          card.style.outline = `${Math.max(1, 1.5 * k).toFixed(2)}px solid color-mix(in srgb, var(--x-ink) ${e.toFixed(2)}%, transparent)`;
          card.style.outlineOffset = `${(-Math.max(1, 1.5 * k)).toFixed(2)}px`;
        } else { card.style.outline = out0; card.style.outlineOffset = oo0; }
        if (built) {
          card.style.opacity = (ML.lin(t, at - 0.3, at) * (1 - leave)).toFixed(4);
          card.style.boxShadow = u > 0 ? `0 ${(30 * k * u).toFixed(1)}px ${(80 * k).toFixed(1)}px ${(-30 * k).toFixed(1)}px color-mix(in srgb, var(--x-ink) ${(14 * u).toFixed(2)}%, transparent)` : "none";
        }
      },
    };
  },
});
