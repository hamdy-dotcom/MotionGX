// Step chain: a quiet row of process steps ticks in one item at a time, separated by middle dots (or arrows /
// slashes), the last ending in an ellipsis — "this takes forever" before the product answers. Each item fades in
// with blur 4px → 0 and x −4px → 0 (mirrored for RTL) over 0.3 s on a deliberately slow stagger; the separator
// arrives with the item after it. "row" sets the items as a small dim label line (55% ink); "keep" leaves their look.
// Items are the target's children, else its text split on · , / → |.
// Source: prompt-motion:ai-baymax-tried-opus-5-5-for (reference only — our own rebuild).
ML.define({
  id: "text-in.step-chain",
  category: "text-in",
  name: "Step chain",
  does: "A small row of process step labels ticks in one item at a time, separated by dots, ending in an ellipsis that implies a long tedious process.",
  says: ["problem", "step", "list", "time"],
  energy: 1,
  targets: ["list", "label"],
  duration: [1, 3],
  params: {
    items: { type: "number", range: [3, 7], default: 5 },
    separator: { type: "choice", options: ["dot", "arrow", "slash"], default: "dot" },
    stagger: { type: "number", range: [0.15, 0.4], default: 0.25, unit: "s" },
    ellipsis: { type: "bool", default: true },
    style: { type: "choice", options: ["row", "keep"], default: "row" },
  },
  pairs: ["text-in.punchline", "text-emphasis.strike-through"],
  avoid: ["celebration", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:ai-baymax-tried-opus-5-5-for", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const dir = rtl ? -1 : 1;
    let items = [...el.children].filter((c) => c.textContent.trim());
    if (!items.length) {
      // text only: rebuild it as item spans
      let parts = el.textContent.split(/\s*[·•,،؛/→←|]\s*/).map((s) => s.trim()).filter(Boolean);
      if (parts.length < 2) parts = el.textContent.trim().split(/\s+/).filter(Boolean);
      el.textContent = "";
      items = parts.map((s) => { const sp = document.createElement("span"); sp.textContent = s; el.append(sp); return sp; });
    }
    const max = Math.round(p.items);
    items.slice(max).forEach((c) => (c.style.display = "none"));
    items = items.slice(0, max);
    const row = p.style === "row";
    const align = getComputedStyle(el).textAlign;
    // gaps and separators take their size from the items, which may be set larger than the row itself
    const itemSize = parseFloat(getComputedStyle(items[0] || el).fontSize);
    Object.assign(el.style, { display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: align === "center" ? "center" : "", columnGap: row ? (itemSize * 0.5).toFixed(1) + "px" : getComputedStyle(el).columnGap, rowGap: (itemSize * 0.2).toFixed(1) + "px" });
    if (row) {
      el.style.color = "color-mix(in srgb, var(--x-ink) 55%, transparent)";
      el.style.fontFamily = "var(--x-label-font)";
      el.style.letterSpacing = rtl ? "0" : "0.02em"; // Arabic letters join: never spaced
      for (const c of items) Object.assign(c.style, { background: "transparent", border: "none", boxShadow: "none", padding: "0", color: "inherit", fontFamily: "inherit" });
    }
    const SEP = { dot: "·", arrow: rtl ? "←" : "→", slash: "/" }[p.separator] || "·";
    const seps = items.map((c, i) => {
      if (!i) return null;
      const s = document.createElement("span");
      s.textContent = SEP; s.setAttribute("aria-hidden", "true");
      s.style.fontSize = itemSize.toFixed(1) + "px";
      Object.assign(s.style, { display: "inline-block", opacity: "0", color: "color-mix(in srgb, var(--x-ink) 60%, transparent)", fontWeight: "700" });
      el.insertBefore(s, c);
      return s;
    });
    let dots = null;
    if (p.ellipsis && items.length) {
      dots = document.createElement("span");
      dots.textContent = "…";
      dots.style.display = "inline-block";
      items[items.length - 1].append(dots);
    }
    for (const c of items) if (getComputedStyle(c).display === "inline") c.style.display = "inline-block";
    const n = items.length, stg = Math.min(p.stagger, Math.max(0.12, (end - at - 0.8) / Math.max(1, n)));
    const T = items.map((_, i) => at + i * stg);
    T.forEach((x) => ctx.sfx(x, "tap", 0.16));
    const dotsAt = T[n - 1] + 0.3, dotsEnd = dotsAt + Math.min(0.6, Math.max(0.2, end - 0.3 - dotsAt));
    const pose = (e, t0, len = 0.3) => {
      const u = ML.out(ML.lin(e, t0, t0 + len), 0, 1);
      return { o: t0 > e ? 0 : u, blur: (1 - u) * 4, x: -dir * (1 - u) * 4 };
    };
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        el.style.opacity = String(1 - leave);
        items.forEach((c, i) => {
          const s = pose(t, T[i]);
          c.style.opacity = s.o.toFixed(4);
          c.style.filter = s.blur > 0.05 ? `blur(${s.blur.toFixed(2)}px)` : "none";
          c.style.translate = `${s.x.toFixed(2)}px 0`;
          if (seps[i]) { const q = pose(t, T[i] - 0.04, 0.24); seps[i].style.opacity = q.o.toFixed(4); seps[i].style.translate = `${q.x.toFixed(2)}px 0`; }
        });
        // the ellipsis trails in dot by dot after the last item lands
        if (dots) { const c = (100 - ML.lin(t, dotsAt, dotsEnd) * 100).toFixed(2); dots.style.clipPath = `inset(0 ${rtl ? 0 : c}% 0 ${rtl ? c : 0}%)`; }
      },
    };
  },
});
