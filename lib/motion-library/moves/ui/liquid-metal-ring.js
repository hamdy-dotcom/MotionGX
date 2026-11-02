// Liquid-metal ring select light-up: every chip / tab / plan carries a faint, frozen metal outline (strength ~0.14,
// 1 px, no glow). When one becomes selected its ring surges to ~0.8 over 0.35 s power2.out, the metal starts to flow
// (the "shader time" resumes), a soft halo fades in over 0.3 s and the ring steps 1 -> 1.5 px; the previously selected
// one reverses (strength back to idle, glow off, frozen). A static edge change (label stroke + ink) keeps the state
// readable without the effect. The metal is painted per frame from t: a metal conic sheen and two counter-rotating glints through a
// ring mask, their phase the integral of "running" time — no clock, no state.
// Source: MengTo/Skills web-design/liquid-metal-border (MIT) — the metal-fx active-state contract, rebuilt in CSS.
ML.define({
  id: "ui.liquid-metal-ring",
  category: "ui",
  name: "Metal ring select light-up",
  does: "When a tab, chip or plan becomes selected its faint metal outline surges into a bright flowing ring with a halo; the previous one dims back.",
  says: ["choice", "focus", "luxury"],
  energy: 2,
  targets: ["label", "card", "list"],
  duration: [0.4, 1.5],
  params: {
    active_strength: { type: "number", range: [0.6, 0.95], default: 0.8 },
    idle_strength: { type: "number", range: [0.1, 0.2], default: 0.14 },
    ring_step: { type: "number", range: [1, 2], default: 1.5, unit: "px" },
    preset: { type: "choice", options: ["chromatic", "silver", "accent"], default: "chromatic" },
    sync: { type: "choice", options: ["spoken", "stagger"], default: "spoken" },
    step: { type: "number", range: [0.4, 2], default: 0.9, unit: "s" },
    glow: { type: "bool", default: true },
  },
  pairs: ["ui.segmented-slide", "ui.cursor-glide-click"],
  avoid: ["urgency", "problem"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "MengTo/Skills:web-design/liquid-metal-border", license: "MIT", note: "metal-fx selected-state recipe rebuilt as per-frame CSS conic sheens" },
  setup(ctx) {
    const { p, at, end } = ctx;
    const el = ctx.el;
    if (!el) return null;
    const doc = document;
    const mk = (tag, css, parent) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (parent) parent.append(e); return e; };
    // the chips: several targets, or a list's items; one card is ringed whole; else the target's own content in a chip
    const isCard = el.dataset.slot === "card" || el.dataset.slot === "screen";
    let chips = ctx.els.length > 1 ? [...ctx.els] : isCard ? [el] : [...el.children].filter((c) => c.nodeType === 1 && c.textContent.trim());
    if (chips.length < 2 && !isCard) {
      const wrap = mk("span", "display:inline-block;padding:0.45em 0.95em;border-radius:var(--x-radius-s)");
      while (el.firstChild) wrap.append(el.firstChild);
      el.append(wrap);
      chips = [wrap];
    }
    const sheen = {
      // metal is contrast: dark reflections (ink) right beside highlights (panel), on any ground
      chromatic: "var(--x-accent), var(--x-ink) 11%, var(--x-panel) 19%, var(--x-accent-2) 30%, var(--x-ink) 43%, var(--x-good) 52%, var(--x-panel) 60%, var(--x-accent) 72%, var(--x-ink) 84%, var(--x-accent-2) 92%, var(--x-accent)",
      silver: "var(--x-ink), var(--x-panel) 13%, var(--x-dim) 25%, var(--x-panel) 38%, var(--x-ink) 50%, var(--x-panel-2) 62%, var(--x-panel) 72%, var(--x-dim) 86%, var(--x-ink)",
      accent: "var(--x-accent), var(--x-ink) 14%, var(--x-accent-2) 28%, var(--x-accent-ink) 40%, var(--x-accent) 54%, var(--x-ink) 68%, var(--x-accent-2) 82%, var(--x-accent)",
    }[p.preset] || "";
    const parts = chips.map((c) => {
      if (getComputedStyle(c).position === "static") c.style.position = "relative";
      const h = c.offsetHeight || 40, k = ML.clamp(h / 28, 1.5, 3);
      const ring = mk("i", "position:absolute;inset:0;border-radius:inherit;pointer-events:none;box-sizing:border-box;-webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)", c);
      const halo = mk("i", "position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0", c);
      if (!getComputedStyle(c).borderRadius || getComputedStyle(c).borderRadius === "0px") c.style.borderRadius = "var(--x-radius-s)";
      return { c, ring, halo, k, text: c.textContent.trim() };
    });
    // when each chip is selected (and when the next one takes it)
    // an item of several words lands where the voice says them in a row (ctx.word only matches inside one spoken word)
    const spoken = (text, fb) => {
      const q = text.split(/\s+/).map(ML.plain).filter(Boolean), w = ctx.words || [];
      if (q.length) for (let i = 0; i + q.length <= w.length; i++) if (q.every((x, k) => ML.plain(w[i + k].w).includes(x))) return w[i].t;
      return fb;
    };
    const n = parts.length;
    const on = parts.map((q, i) => (p.sync === "spoken" ? Math.max(at, spoken(q.text, at + 0.15 + i * p.step)) : at + 0.15 + i * p.step));
    for (let i = 1; i < n; i++) on[i] = Math.max(on[i], on[i - 1] + 0.4);
    const off = on.map((x, i) => (i + 1 < n ? on[i + 1] : Infinity));
    on.forEach((x) => ctx.sfx(x, "swell", 0.3));
    const p2out = (t, a, b) => 1 - Math.pow(1 - ML.clamp((t - a) / (b - a)), 2);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.22);
        parts.forEach((q, i) => {
          const a = on[i], b = off[i];
          // selection amount: up over 0.35 s power2.out, down the same when the next is chosen
          const s = t < a ? 0 : t < b ? p2out(t, a, a + 0.35) : 1 - p2out(t, b, b + 0.35);
          const strength = (p.idle_strength + (p.active_strength - p.idle_strength) * s) * (1 - leave);
          // flowing time: only runs while selected (frozen frame when idle)
          const run = Math.max(0, Math.min(t, b + 0.35) - a);
          const ph = (i * 47 + run * 140) % 360, ph2 = (i * 113 - run * 90 + 720) % 360;
          const width = (1 + (p.ring_step - 1) * s) * q.k;
          q.ring.style.padding = `${width.toFixed(2)}px`;
          q.ring.style.background = `conic-gradient(from ${ph2.toFixed(1)}deg, transparent, var(--x-panel) 7%, transparent 14%, transparent 50%, var(--x-panel) 57%, transparent 64%), conic-gradient(from ${ph.toFixed(1)}deg, ${sheen})`;
          q.ring.style.opacity = strength.toFixed(4);
          const g = p.glow ? ML.clamp((t - a) / 0.3) * (t < b ? 1 : 1 - ML.clamp((t - b) / 0.3)) * (1 - leave) : 0;
          q.halo.style.opacity = g.toFixed(4);
          q.halo.style.boxShadow = g > 0 ? `0 0 ${(q.k * 9).toFixed(1)}px ${(q.k * 0.5).toFixed(1)}px color-mix(in srgb, var(--x-accent) ${(26 + 8 * Math.sin(run * 3)).toFixed(1)}%, transparent)` : "none";
          // static state that reads without the effect
          if (!isCard) q.c.style.webkitTextStroke = s > 0.5 ? "0.025em currentColor" : ""; // heavier without reflowing
          q.c.style.color = s > 0.5 ? "var(--x-ink)" : "";
        });
      },
    };
  },
});
