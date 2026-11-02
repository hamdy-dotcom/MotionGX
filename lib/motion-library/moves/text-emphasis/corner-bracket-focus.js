// Corner bracket focus: four L-shaped corners (arm 24 px, 2 px stroke in the accent) start 40 px outward at opacity 0
// and close to 14 px from the target's bounds (tight; 28 px loose) over 0.3 s back.out(1.6), like a camera focus frame
// locking on. They hold; an optional small mono label (the box's size) sits at the reading-start corner. All sizes
// scale with the target's type (the spec's px are at a 100 px headline). They open back out and fade before the end.
// Source: prompt-motion:heyiammallik-i-asked-opus-5-5 (reference) — our own rebuild.
ML.define({
  id: "text-emphasis.corner-bracket-focus",
  category: "text-emphasis",
  name: "Corner brackets snap around a word",
  does: "Four L-shaped corner marks close in around a word like a camera focus frame.",
  says: ["focus", "precision", "simplicity"],
  energy: 2,
  targets: ["word", "headline", "image"],
  duration: [0.5, 3],
  params: {
    colour: { type: "text", default: "accent" },
    fit: { type: "choice", options: ["tight", "loose"], default: "tight" },
    label: { type: "bool", default: false },
    arm: { type: "number", range: [6, 32], default: 24, unit: "px" },
    stroke: { type: "number", range: [1, 4], default: 2, unit: "px" },
    from: { type: "number", range: [10, 80], default: 40, unit: "px" },
    close: { type: "number", range: [0.2, 0.5], default: 0.3, unit: "s" },
  },
  pairs: ["text-in.punchline", "text-emphasis.highlight-sweep", "camera.push-in"],
  avoid: ["celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "click",
  source: { from: "prompt-motion:heyiammallik-i-asked-opus-5-5", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl, stage } = ctx;
    if (!el) return null;
    const VARS = ["accent", "accent-2", "accent-ink", "ink", "dim", "ground", "panel", "panel-2", "good", "bad", "line", "ring"];
    const col = (v, d) => { v = String(v || d).trim(); if (v.startsWith("var(")) return v; if (v.startsWith("--")) return `var(${v})`; v = v.replace(/^x-/, ""); return `var(--x-${VARS.includes(v) ? v : d})`; };
    // the target's bounds in stage px: its text where it is text, else its box
    const st = stage.getBoundingClientRect(), k = st.width / (stage.offsetWidth || 1) || 1;
    const textual = el.tagName !== "IMG" && el.tagName.toLowerCase() !== "svg" && !el.querySelector("img,svg,canvas,video") && el.textContent.trim();
    let r;
    if (textual) { const rg = document.createRange(); rg.selectNodeContents(el); r = rg.getBoundingClientRect(); } else r = el.getBoundingClientRect();
    const b = { x: (r.left - st.left) / k, y: (r.top - st.top) / k, w: r.width / k, h: r.height / k };
    const fs = textual ? parseFloat(getComputedStyle(el).fontSize) || 56 : Math.max(40, Math.min(b.w, b.h) * 0.5);
    const u = Math.max(0.75, Math.min(1.8, fs / 72)); // the spec's px read right at a ~72 px word
    const gap = (p.fit === "loose" ? 28 : 14) * u, arm = p.arm * u, sw = Math.max(2, p.stroke * u), far = p.from * u;
    const c = col(p.colour, "accent");
    const layer = document.createElement("div");
    Object.assign(layer.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "5" });
    (ctx.scene || stage).append(layer);
    // corners: [sx, sy] = which side (−1 left/top, +1 right/bottom)
    const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => {
      const d = document.createElement("div");
      Object.assign(d.style, { position: "absolute", width: arm + "px", height: arm + "px", boxSizing: "border-box", borderColor: c, borderStyle: "solid", borderWidth: "0", opacity: "0" });
      d.style[sy < 0 ? "borderTopWidth" : "borderBottomWidth"] = sw + "px";
      d.style[sx < 0 ? "borderLeftWidth" : "borderRightWidth"] = sw + "px";
      layer.append(d);
      return { d, sx, sy };
    });
    let tag = null;
    if (p.label) {
      tag = document.createElement("div");
      tag.textContent = `${Math.round(b.w)} × ${Math.round(b.h)}`;
      Object.assign(tag.style, { position: "absolute", font: `var(--x-label-weight) ${Math.max(12, 15 * u).toFixed(1)}px var(--x-mono-font)`, color: c, letterSpacing: "0.08em", whiteSpace: "nowrap", opacity: "0", direction: "ltr" });
      layer.append(tag);
    }
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, hw = b.w / 2 + gap, hh = b.h / 2 + gap;
    const t1 = at + p.close, leaveAt = end - 0.28;
    ctx.sfx(at + p.close * 0.7, "click", 0.4);
    return {
      draw(t) {
        const e = t < at ? 0 : ML.back(t, at, t1, 1.6); // closes in, overshooting a hair
        const o = ML.lin(t, at, at + p.close * 0.6);
        const lv = ML.ease(t, leaveAt, leaveAt + 0.24);
        const off = (1 - e) * far + lv * far * 0.5;
        for (const { d, sx, sy } of corners) {
          const x = cx + sx * (hw + off), y = cy + sy * (hh + off);
          d.style.left = (sx < 0 ? x : x - arm).toFixed(2) + "px";
          d.style.top = (sy < 0 ? y : y - arm).toFixed(2) + "px";
          d.style.opacity = (o * (1 - lv)).toFixed(4);
        }
        if (tag) {
          const lo = ML.lin(t, t1, t1 + 0.2) * (1 - lv);
          tag.style.opacity = lo.toFixed(4);
          const y = cy - hh - (1 - e) * far - sw * 4 - Math.max(12, 15 * u) * 1.1;
          tag.style.top = y.toFixed(2) + "px";
          if (rtl) { tag.style.right = ""; tag.style.left = (cx + hw - tag.offsetWidth).toFixed(2) + "px"; }
          else tag.style.left = (cx - hw).toFixed(2) + "px";
        }
      },
    };
  },
});
