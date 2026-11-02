// Status badge flips: a row's status chip changes its text and colour — "~ expected" becomes "✓ confirmed" on the
// good colour (or "↻ changed" on an amber between good and bad, or "✕ failed" on the bad colour), its ink turning to
// the accent ink, over 0.2 s; a confirm sound (a switch for "changed"). The text swaps in one frame at the flip, as the
// source's tl.set does; `pop` adds a small settle (0.92 → 1) for a louder beat. The target label becomes the chip (pill
// padding, a faint ink tint) unless `chip` is off; its own words are the "before", `text` (or the state's word) the
// "after". Arabic keeps its words whole; the chip reads in the label's own direction.
// Source: MotionGX's own lib/studio-engine/assets/scenes.js — S.livecheck (tl.set innerHTML "✓ مؤكّد", backgroundColor
// → #0e9f78, color #fff, 0.2 s; "↻ اتعدّل" on gold with ui/switch1; interface/bong_001).
ML.define({
  id: "ui.status-badge-flip",
  category: "ui",
  name: "Status badge flips",
  does: "A row's status chip changes its text and colour to confirmed.",
  says: ["result", "change", "proof"],
  energy: 2,
  targets: ["label"],
  duration: [0.2, 0.6],
  params: {
    state: { type: "choice", options: ["confirmed", "changed", "failed"], default: "confirmed" },
    delay: { type: "number", range: [0, 1.5], default: 0.35, unit: "s" }, // from the move's start to the flip
    fade: { type: "number", range: [0.1, 0.4], default: 0.2, unit: "s" },
    chip: { type: "bool", default: true },
    pop: { type: "bool", default: false },
    text: { type: "text" }, // the badge's words after the flip
  },
  pairs: ["ui.slot-fill-cascade", "ui.scan-highlight-filter", "data.count-up"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "click.confirm",
  source: { from: "own:lib/studio-engine/assets/scenes.js", license: "own", note: "S.livecheck status chip: tl.set text, background → good / gold, colour → white over 0.2 s, bong / switch" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const before = el.textContent;
    const words = {
      confirmed: rtl ? "✓ مؤكّد" : "✓ confirmed",
      changed: rtl ? "↻ اتعدّل" : "↻ changed",
      failed: rtl ? "✕ فشل" : "✕ failed",
    };
    const after = p.text || words[p.state] || words.confirmed;
    const tone = { confirmed: "var(--x-good)", changed: "color-mix(in srgb, var(--x-good) 30%, var(--x-bad))", failed: "var(--x-bad)" }[p.state] || "var(--x-good)";
    const cs = getComputedStyle(el);
    const ink0 = cs.color;
    if (p.chip) {
      el.style.padding = "0.32em 0.85em";
      el.style.borderRadius = "var(--x-radius-s)";
      el.style.boxShadow = "inset 0 0 0 1px color-mix(in srgb, var(--x-ink) 10%, transparent)";
      el.style.whiteSpace = "nowrap";
    }
    const bg0 = "color-mix(in srgb, var(--x-ink) 6%, transparent)";
    // both words laid out in one grid cell from the start: the chip keeps one width, only which word shows changes
    el.style.display = p.chip || getComputedStyle(el).display.includes("inline") ? "inline-grid" : "grid";
    el.style.justifyItems = "center";
    el.textContent = "";
    const mkWord = (txt) => { const s = document.createElement("span"); s.textContent = txt; s.style.gridArea = "1 / 1"; el.append(s); return s; };
    const wBefore = mkWord(before), wAfter = mkWord(after);
    if (rtl) { el.dir = "rtl"; wBefore.dir = wAfter.dir = "rtl"; }
    el.style.willChange = "transform";
    const flip = Math.min(at + p.delay, Math.max(at, end - 0.3));
    ctx.sfx(flip, p.state === "changed" ? "click" : p.state === "failed" ? "blip" : "click.confirm", 0.45);

    return {
      draw(t) {
        const on = t >= flip;
        wBefore.style.visibility = on ? "hidden" : "visible";
        wAfter.style.visibility = on ? "visible" : "hidden";
        const u = ML.ease(t, flip, flip + p.fade);
        if (p.chip || u > 0) el.style.backgroundColor = u <= 0 ? bg0 : u >= 1 ? tone : `color-mix(in srgb, ${tone} ${(u * 100).toFixed(1)}%, ${bg0})`;
        else el.style.backgroundColor = "";
        el.style.color = u <= 0 ? ink0 : u >= 1 ? "var(--x-accent-ink)" : `color-mix(in srgb, var(--x-accent-ink) ${(u * 100).toFixed(1)}%, ${ink0})`;
        if (p.pop) { const s = on ? ML.back(t, flip, flip + 0.3, 2) : 1; el.style.scale = on && t < flip + 0.3 ? (0.92 + 0.08 * s).toFixed(4) : "none"; }
      },
    };
  },
});
