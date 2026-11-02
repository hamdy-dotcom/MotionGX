// Framed glyph title: a film title card. One oversized character (Latin: the initial; Arabic: the whole first word,
// never split) sits in a hairline bracket — a rule under it turning up as a vertical rule on its inner side (L), a
// full box, or none — with the rest stacked small beside it (one word a line), or on one line. Enter: hard cut with a
// one-frame grey flash, glyphs settling 1.04 → 1 in 0.3 s expo.out, hairlines drawing out of the corner (0.35 s
// power3.out). Holds, then cuts out. Mirrors for RTL (big glyph on the right).
// Source: prompt-motion:majin-appsheet-claude-code-opus-5-5-pv-ai (reference only — our own rebuild).
ML.define({
  id: "text-in.framed-glyph",
  category: "text-in",
  name: "Framed glyph title",
  does: "One giant character sits in an L-shaped hairline bracket with smaller characters stacked vertically beside it, like a film title card.",
  says: ["brand", "story", "precision", "luxury"],
  energy: 3,
  targets: ["headline", "word", "logo"],
  duration: [0.8, 2],
  params: {
    orientation: { type: "choice", options: ["vertical-stack", "horizontal"], default: "vertical-stack" },
    rule: { type: "choice", options: ["L", "box", "none"], default: "L" },
    flash: { type: "bool", default: true },
    hold: { type: "number", range: [0.4, 1.2], default: 0.6, unit: "s" },
  },
  pairs: ["transition.hard-cut", "background.grain"],
  avoid: ["playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "prompt-motion:majin-appsheet-claude-code-opus-5-5-pv-ai", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl, stage } = ctx;
    if (!el) return null;
    const text = (el.textContent || "").trim().replace(/\s+/g, " ");
    if (!text) return null;
    const ws = text.split(" ");
    let big, rest;
    if (ML.ARABIC.test(ws[0])) { big = ws[0]; rest = ws.slice(1); }
    else { const ch = Array.from(ws[0]); big = ch[0]; rest = [ch.slice(1).join(""), ...ws.slice(1)].filter(Boolean); }
    if (!rest.length) rest = [""];
    const fs0 = parseFloat(getComputedStyle(el).fontSize);
    const room = el.parentElement ? el.parentElement.clientWidth : ctx.f.W * 0.8;
    const roomH = el.parentElement ? el.parentElement.clientHeight : ctx.f.H * 0.3;
    let B = Math.min(fs0 * 2.4, roomH * 0.85);
    const hw = Math.max(1, Math.round(ctx.f.W / 900)); // a hairline, relative to the stage
    el.textContent = "";
    el.setAttribute("aria-label", text);
    const wrap = document.createElement("span");
    Object.assign(wrap.style, { display: "inline-flex", alignItems: "flex-end", position: "relative", lineHeight: "1", verticalAlign: "middle" });
    const bigEl = document.createElement("span");
    bigEl.textContent = big;
    Object.assign(bigEl.style, { position: "relative", display: "inline-block", lineHeight: "0.95", transformOrigin: rtl ? "100% 100%" : "0% 100%" });
    const stack = document.createElement("span");
    Object.assign(stack.style, { display: "inline-flex", flexDirection: p.orientation === "vertical-stack" ? "column" : "row", gap: p.orientation === "vertical-stack" ? "0.08em" : "0.3em", alignItems: "flex-start", lineHeight: "1", transformOrigin: rtl ? "100% 100%" : "0% 100%", fontWeight: "var(--x-body-weight)" });
    for (const r of rest) { const s = document.createElement("span"); s.textContent = r; s.style.whiteSpace = "pre"; stack.append(s); }
    wrap.append(bigEl, stack);
    el.append(wrap);
    // hairlines: bottom + inner vertical (L), plus top + outer vertical (box)
    const lineCol = "color-mix(in srgb, var(--x-dim) 65%, transparent)";
    const mk = (css) => { const i = document.createElement("i"); Object.assign(i.style, { position: "absolute", background: lineCol, pointerEvents: "none" }, css); bigEl.append(i); return i; };
    const lines = [];
    const inner = rtl ? "left" : "right", outer = rtl ? "right" : "left";
    if (p.rule !== "none") {
      lines.push({ el: mk({ left: "0", right: "0", bottom: "0", height: hw + "px", transformOrigin: rtl ? "0% 50%" : "100% 50%" }), axis: "x", d: 0 });
      lines.push({ el: mk({ top: "0", bottom: "0", [inner]: "0", width: hw + "px", transformOrigin: "50% 100%" }), axis: "y", d: 0 });
      if (p.rule === "box") {
        lines.push({ el: mk({ left: "0", right: "0", top: "0", height: hw + "px", transformOrigin: rtl ? "0% 50%" : "100% 50%" }), axis: "x", d: 0.12 });
        lines.push({ el: mk({ top: "0", bottom: "0", [outer]: "0", width: hw + "px", transformOrigin: "50% 0%" }), axis: "y", d: 0.12 });
      }
    }
    // sizes: big ≈ 2.4× the headline (within its band); the stack shares the big glyph's height, ≤ 45 % of it each
    const layout = () => {
      bigEl.style.fontSize = B.toFixed(1) + "px";
      bigEl.style.padding = `0.04em ${p.rule === "box" ? "0.12em" : "0.08em"} 0.06em`;
      bigEl.style[rtl ? "paddingLeft" : "paddingRight"] = "0.14em";
      const n = p.orientation === "vertical-stack" ? rest.length : 1;
      stack.style.fontSize = (Math.min(B * 0.45, (B * 0.95) / (n * 1.08))).toFixed(1) + "px";
      wrap.style.gap = (B * 0.12).toFixed(1) + "px";
    };
    layout();
    for (let k = 0; k < 6 && wrap.getBoundingClientRect().width / (el.getBoundingClientRect().width / (el.offsetWidth || 1) || 1) > room * 0.96; k++) { B *= 0.85; layout(); }
    // the one-frame grey flash over the stage
    let flash = null;
    if (p.flash) {
      flash = document.createElement("div");
      Object.assign(flash.style, { position: "absolute", inset: "0", background: "var(--x-dim)", pointerEvents: "none", zIndex: "50" });
      (ctx.scene || stage).append(flash);
    }
    const outAt = Math.max(at + 0.45, Math.min(end - 0.05, at + 0.4 + p.hold));
    ctx.sfx(at, "hit", 0.4);
    return {
      draw(t) {
        const on = t >= at && t < outAt;
        el.style.opacity = on ? "1" : "0";
        if (flash) { const f = t >= at && t < at + 1 / 30; flash.style.opacity = f ? "0.55" : "0"; flash.style.visibility = f ? "visible" : "hidden"; }
        const s1 = ML.expo(t, at, at + 0.3), s2 = ML.expo(t, at + 0.05, at + 0.35);
        bigEl.style.scale = s1 < 1 ? (1.04 - 0.04 * s1).toFixed(4) : "none";
        stack.style.scale = s2 < 1 ? (1.04 - 0.04 * s2).toFixed(4) : "none";
        stack.style.opacity = (t >= at + 0.05 ? 1 : 0).toFixed(0);
        for (const l of lines) {
          const x = ML.lin(t, at + 0.04 + l.d, at + 0.39 + l.d), u = 1 - Math.pow(1 - x, 3);
          l.el.style.transform = l.axis === "x" ? `scaleX(${u.toFixed(4)})` : `scaleY(${u.toFixed(4)})`;
        }
      },
    };
  },
});
