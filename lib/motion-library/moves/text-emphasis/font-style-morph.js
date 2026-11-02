// Font style morph: letter by letter the word turns from one type style into another — two layers per letter (say a
// heavy grotesk cap and a flowing italic serif lowercase). Stagger 0.06 s in reading order (or centre-out): the old
// letter blurs 0 → 8 px, fades and skews −10°; the new one blurs 8 → 0, fades in and rises 10 px → 0, 0.3 s
// power2.out, its colour going from ink to the look's accent (or any look colour). Each letter's slot eases from the
// old glyph's width to the new one's as it switches, so the line reflows smoothly. Then an optional long extruded
// shadow builds behind the new style (12 stacked 1 px copies in ink, 0.3 s). Arabic (joined letters never split):
// the whole word crossfades between the two faces. Styles come from the look's font variables only.
// Source: prompt-motion:web3wesley-this-took-opus-5-5 (reference) — our own rebuild.
ML.define({
  id: "text-emphasis.font-style-morph",
  category: "text-emphasis",
  name: "Letters morph into another type style",
  does: "Letter by letter, heavy grotesk caps turn into a flowing italic serif lowercase, each blurring through the switch, optionally gaining an extruded shadow.",
  says: ["change", "luxury", "playful", "before-after"],
  energy: 3,
  targets: ["word"],
  duration: [0.8, 2],
  params: {
    from: { type: "choice", options: ["grotesk-caps", "grotesk", "serif-italic", "serif", "script", "mono-caps"], default: "grotesk-caps" },
    to: { type: "choice", options: ["serif-italic", "serif", "script", "grotesk-caps", "grotesk", "mono-caps"], default: "serif-italic" },
    order: { type: "choice", options: ["ltr", "centre-out", "whole-word"], default: "ltr" },
    stagger: { type: "number", range: [0.03, 0.1], default: 0.06, unit: "s" },
    extrude: { type: "bool", default: false },
    tint: { type: "text", default: "accent" },
    blur: { type: "number", range: [0, 14], default: 8, unit: "px" },
    switch: { type: "number", range: [0.2, 0.5], default: 0.3, unit: "s" },
  },
  pairs: ["text-emphasis.extrude-shadow", "text-in.punchline"],
  avoid: ["urgency", "tech"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:web3wesley-this-took-opus-5-5", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const VARS = ["accent", "accent-2", "accent-ink", "ink", "dim", "ground", "panel", "panel-2", "good", "bad", "line", "ring"];
    const col = (v, d) => { v = String(v || d).trim(); if (v.startsWith("var(")) return v; if (v.startsWith("--")) return `var(${v})`; v = v.replace(/^x-/, ""); return `var(--x-${VARS.includes(v) ? v : d})`; };
    const STYLES = {
      "grotesk-caps": { font: "var(--x-head-font)", weight: "800", style: "normal", tt: "uppercase" },
      grotesk: { font: "var(--x-head-font)", weight: "var(--x-head-weight)", style: "normal", tt: "none" },
      "serif-italic": { font: "var(--x-serif-font)", weight: "400", style: "italic", tt: "lowercase" },
      serif: { font: "var(--x-serif-font)", weight: "400", style: "normal", tt: "none" },
      script: { font: "var(--x-script-font)", weight: "500", style: "normal", tt: "none" },
      "mono-caps": { font: "var(--x-mono-font)", weight: "600", style: "normal", tt: "uppercase" },
    };
    const A = STYLES[p.from] || STYLES["grotesk-caps"], B = STYLES[p.to] || STYLES["serif-italic"];
    const tint = col(p.tint, "accent");
    const apply = (s, st) => Object.assign(s.style, { fontFamily: st.font, fontWeight: st.weight, fontStyle: st.style, textTransform: st.tt });
    const arabic = ML.ARABIC.test(el.textContent);
    const whole = arabic || p.order === "whole-word";
    const units = whole ? ML.split(el, "words") : ML.split(el, "chars");
    if (!units.length) return null;
    const k = el.getBoundingClientRect().width / (el.offsetWidth || 1) || 1;
    const ext = Array.from({ length: 12 }, (_, i) => i + 1);
    // two layers per unit; the unit's slot width is measured for each style once
    const parts = units.map((u) => {
      const text = u.textContent;
      u.textContent = "";
      Object.assign(u.style, { position: "relative", display: "inline-block", whiteSpace: "pre", verticalAlign: "baseline" });
      const a = document.createElement("span"), b = document.createElement("span");
      a.textContent = text; b.textContent = text;
      apply(a, A); apply(b, B);
      Object.assign(a.style, { display: "inline-block", whiteSpace: "pre" });
      Object.assign(b.style, { position: "absolute", left: "0", bottom: "0", whiteSpace: "pre", color: tint, opacity: "0" });
      u.append(a, b);
      const wa = a.getBoundingClientRect().width / k;
      b.style.position = "static"; b.style.display = "inline-block";
      a.style.display = "none";
      const wb = b.getBoundingClientRect().width / k;
      a.style.display = "inline-block"; b.style.position = "absolute"; b.style.display = "inline-block";
      // the new glyph centred over the old one's slot as it changes
      return { u, a, b, wa, wb };
    });
    // reading order (RTL reverses), or centre-out
    const n = parts.length, idx = parts.map((_, i) => i);
    let rank;
    if (p.order === "centre-out") { const c = (n - 1) / 2; rank = idx.map((i) => Math.round(Math.abs(i - c))); }
    else rank = idx.map((i) => (rtl && !whole ? n - 1 - i : i)); // DOM order already follows the script for Latin
    if (whole && p.order !== "centre-out") rank = idx.map((i) => i * 0.5);
    const t0 = at + 0.1, D = p.switch;
    const starts = rank.map((r) => t0 + r * (whole ? p.stagger * 3 : p.stagger));
    const last = Math.max(...starts) + D;
    ctx.sfx(t0, "whoosh.soft", 0.3);
    if (p.extrude) ctx.sfx(last, "tap", 0.25);
    const p2 = (t, a, b) => { const x = ML.lin(t, a, b); return 1 - (1 - x) * (1 - x); };
    return {
      draw(t) {
        const lv = ML.ease(t, end - 0.25, end - 0.05);
        el.style.opacity = (1 - lv).toFixed(4);
        const ex = p.extrude ? p2(t, last, last + 0.3) : 0;
        const shadow = ex > 0 ? ext.slice(0, Math.max(1, Math.round(ex * 12))).map((i) => `${i * (rtl ? -1 : 1)}px ${i}px 0 var(--x-ink)`).join(", ") : "none";
        parts.forEach(({ u, a, b, wa, wb }, i) => {
          const s = starts[i], e = p2(t, s, s + D);
          const w = wa + (wb - wa) * e;
          u.style.width = w.toFixed(2) + "px";
          // old style leaves: blur up, fade, skew
          a.style.opacity = (1 - ML.lin(t, s, s + D * 0.8)).toFixed(4);
          a.style.filter = e > 0 && e < 1 ? `blur(${(e * p.blur).toFixed(2)}px)` : "none";
          a.style.transform = e > 0 ? `skewX(${(-10 * e).toFixed(2)}deg)` : "none";
          a.style.visibility = e >= 1 ? "hidden" : "visible";
          a.style.marginLeft = ((w - wa) / 2).toFixed(2) + "px";
          // new style arrives: unblur, fade in, rise
          b.style.opacity = e.toFixed(4);
          b.style.filter = e < 1 ? `blur(${((1 - e) * p.blur).toFixed(2)}px)` : "none";
          b.style.left = ((w - wb) / 2).toFixed(2) + "px";
          b.style.transform = `translateY(${((1 - e) * 10).toFixed(2)}px)`;
          b.style.textShadow = shadow;
        });
      },
    };
  },
});
