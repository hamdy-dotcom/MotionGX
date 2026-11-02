// Letter smudge erase: focus brackets close around one letter and a small mono label in the warning red names it; a
// soft eraser blob (a radial gradient of the ground colour with a light core, blurred 6 px, about half the type size)
// passes over the glyph in 0.3 s, and a mask wipes the glyph away right behind it, the ink smearing a little as it
// goes. Then it comes back — the blob passing the other way and the letter restored — or it stays erased. Letters
// are split, so Arabic (whose letters join) is not offered this move.
// Source: prompt-motion:m1n9-k7-this-is-insane-opus (reference) — our own rebuild.
ML.define({
  id: "text-emphasis.letter-smudge-erase",
  category: "text-emphasis",
  name: "A letter gets smudged away",
  does: "A soft eraser blob passes over one letter of the word, smudging it out (and back) inside focus brackets.",
  says: ["change", "precision", "playful"],
  energy: 3,
  targets: ["word"],
  duration: [0.6, 1.5],
  params: {
    erase: { type: "choice", options: ["restore", "keep"], default: "restore" },
    letter: { type: "number", range: [0, 12], default: 0 },
    pass: { type: "number", range: [0.2, 0.5], default: 0.3, unit: "s" },
    brackets: { type: "bool", default: true },
    label: { type: "text", default: "" },
    pick: { type: "choice", options: ["longest", "first", "last"], default: "longest" },
  },
  pairs: ["text-emphasis.corner-bracket-focus", "text-emphasis.letter-insert"],
  avoid: ["luxury"],
  rtl: false,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:m1n9-k7-this-is-insane-opus", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, stage } = ctx;
    if (!el) return null;
    ML.split(el, "chars");
    const words = [...el.querySelectorAll(".ml-w")].filter((w) => w.querySelector(".ml-c"));
    if (!words.length) return null;
    const isL = (c) => /[\p{L}\p{N}]/u.test(c.textContent);
    const count = (w) => [...w.querySelectorAll(".ml-c")].filter(isL).length;
    const word = p.pick === "first" ? words[0] : p.pick === "last" ? words[words.length - 1] : words.reduce((a, b) => (count(b) > count(a) ? b : a));
    const ls = [...word.querySelectorAll(".ml-c")].filter(isL);
    if (!ls.length) return null;
    const L = ls[Math.max(0, Math.min(ls.length - 1, Math.round(p.letter)))];
    const fs = parseFloat(getComputedStyle(el).fontSize) || 56;
    const u = Math.max(0.6, Math.min(2, fs / 72));
    const b = ctx.box(L);
    const layer = document.createElement("div");
    Object.assign(layer.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "5" });
    (ctx.scene || stage).append(layer);
    // the eraser
    const R = Math.max(b.w, b.h * 0.6) * 0.75 + 10 * u;
    const blob = document.createElement("div");
    Object.assign(blob.style, { position: "absolute", left: "0", top: "0", width: 2 * R + "px", height: 2 * R + "px", borderRadius: "50%", background: "radial-gradient(circle, color-mix(in srgb, var(--x-panel) 70%, var(--x-ground)) 0 34%, color-mix(in srgb, var(--x-ground) 85%, transparent) 52%, transparent 70%)", filter: `blur(${(6 * u * 0.8).toFixed(2)}px)`, opacity: "0" });
    layer.append(blob);
    // brackets around the letter
    const gap = 0.08 * fs, arm = Math.max(6, 0.14 * fs), sw = Math.max(2, 1.6 * u);
    const corners = p.brackets ? [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => {
      const d = document.createElement("div");
      Object.assign(d.style, { position: "absolute", width: arm + "px", height: arm + "px", boxSizing: "border-box", borderColor: "var(--x-accent)", borderStyle: "solid", borderWidth: "0", opacity: "0" });
      d.style[sy < 0 ? "borderTopWidth" : "borderBottomWidth"] = sw + "px";
      d.style[sx < 0 ? "borderLeftWidth" : "borderRightWidth"] = sw + "px";
      layer.append(d);
      return { d, sx, sy };
    }) : [];
    const tag = document.createElement("div");
    tag.textContent = p.label || `DEL '${L.textContent}'`;
    Object.assign(tag.style, { position: "absolute", font: `var(--x-label-weight) ${Math.max(12, 15 * u).toFixed(1)}px var(--x-mono-font)`, color: "var(--x-bad)", letterSpacing: "0.08em", whiteSpace: "nowrap", opacity: "0", direction: "ltr" });
    layer.append(tag);
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, hw = b.w / 2 + gap, hh = b.h / 2 + gap;
    tag.style.left = (cx - hw).toFixed(2) + "px";
    tag.style.top = (cy - hh - Math.max(12, 15 * u) * 1.5 - sw * 2).toFixed(2) + "px";
    L.style.webkitMaskSize = "100% 100%";
    const tE = at + 0.25, P = p.pass;
    const tR = p.erase === "restore" ? Math.max(tE + P + 0.35, Math.min(end - P - 0.45, tE + P + 0.8)) : Infinity;
    const leaveAt = end - 0.28;
    ctx.sfx(at + 0.1, "click", 0.3);
    ctx.sfx(tE, "whoosh.soft", 0.35);
    if (tR < Infinity) ctx.sfx(tR, "whoosh.soft", 0.25);
    const x0 = b.x - R * 1.1, x1 = b.x + b.w + R * 1.1;
    return {
      draw(t) {
        // the blob goes left → right to erase, right → left to restore
        const a = ML.ease(t, tE, tE + P), r = tR < Infinity ? ML.ease(t, tR, tR + P) : 0;
        const going = t >= tE && t <= tE + P, back = t >= tR && t <= tR + P;
        const bx = back ? x1 + (x0 - x1) * r : x0 + (x1 - x0) * a;
        blob.style.translate = `${(bx - R).toFixed(2)}px ${(cy - R).toFixed(2)}px`;
        blob.style.opacity = (going ? Math.sin(Math.PI * ML.lin(t, tE, tE + P)) : back ? Math.sin(Math.PI * ML.lin(t, tR, tR + P)) : 0).toFixed(4);
        // what of the glyph is gone: everything left of the blob's centre while erasing; restored behind it coming back
        const edge = ((bx - b.x) / Math.max(1, b.w)) * 100;
        let mask = "none", smear = 0;
        if (t >= tE && (t < tR || tR === Infinity)) {
          mask = t >= tE + P ? "linear-gradient(transparent, transparent)" : `linear-gradient(90deg, transparent ${(edge - 12).toFixed(2)}%, #000 ${(edge + 12).toFixed(2)}%)`;
          smear = going ? Math.sin(Math.PI * a) : 0;
        } else if (t >= tR) {
          mask = t >= tR + P ? "none" : `linear-gradient(90deg, transparent ${(edge - 12).toFixed(2)}%, #000 ${(edge + 12).toFixed(2)}%)`;
          smear = back ? Math.sin(Math.PI * r) * 0.6 : 0;
        }
        L.style.webkitMaskImage = mask; L.style.maskImage = mask;
        L.style.filter = smear > 0.01 ? `blur(${(smear * 3 * u).toFixed(2)}px)` : "none";
        L.style.translate = smear > 0.01 ? `${(smear * 0.05 * fs).toFixed(2)}px 0` : "none";
        // brackets and label
        const snap = t < at ? 0 : ML.back(t, at, at + 0.22, 1.6), o = ML.lin(t, at, at + 0.12) * (1 - ML.ease(t, leaveAt, leaveAt + 0.24));
        const off = (1 - snap) * 24 * u;
        for (const { d, sx, sy } of corners) {
          const x = cx + sx * (hw + off), y = cy + sy * (hh + off);
          d.style.left = (sx < 0 ? x : x - arm).toFixed(2) + "px";
          d.style.top = (sy < 0 ? y : y - arm).toFixed(2) + "px";
          d.style.opacity = o.toFixed(4);
        }
        tag.style.opacity = (ML.lin(t, at + 0.15, at + 0.3) * (1 - ML.ease(t, leaveAt, leaveAt + 0.24))).toFixed(4);
      },
    };
  },
});
