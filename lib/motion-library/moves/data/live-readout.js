// Live numeric readout: small mono numbers in a corner (or under the object) recomputed every frame from the clock —
// a rate meter (start + rate · (t − at), no easing so it reads as a live meter, commas / compact / plain), an elapsed
// time ("12.40 seconds ago.") or animation values ("t = 01.73 s  θ = 1.23  sin = 0.94") with fixed decimals and
// tabular numerals so the width never jumps. Type: the mono face at ~1.3% of the short side scaled from the source's
// 11–16 px, ink at 50%, tracking .05em, a tiny caps label before it at 40%. Placed 32 px (scaled) inside the safe area,
// or under its target. Fades in over 0.3 s with the scene; no other motion. Says "this is happening at scale right now"
// without pulling focus. In Arabic the corners mirror and the label reads right to left; the digits stay Latin, LTR.
// Sources: prompt-motion "ismailfahmi-bikin-showreel-15-detik", "kloss-xyz-had-to-test-this",
// "math-files-i-made-this-using" (reference only: rebuilt as our own code).
ML.define({
  id: "data.live-readout",
  category: "data",
  name: "Live numeric readout",
  does: "Small mono numbers in a corner or under a headline update every frame from the clock — a rate meter, a 'seconds ago', a t / theta value.",
  says: ["precision", "tech", "time", "proof", "scale"],
  energy: 1,
  targets: ["number", "label"],
  duration: [1, 15],
  params: {
    mode: { type: "choice", options: ["rate", "elapsed", "value"], default: "rate" },
    rate: { type: "number", range: [1, 10000000], default: 2300000, unit: "/s" },
    start: { type: "number", range: [0, 1000000000], default: 0 },
    decimals: { type: "number", range: [0, 3], default: 2 },
    format: { type: "choice", options: ["plain", "compact", "commas"], default: "commas" },
    position: { type: "choice", options: ["top-right", "top-left", "bottom-right", "bottom-left", "under-object"], default: "top-right" },
    label: { type: "text", default: "" },
    unit: { type: "text", default: "" },
  },
  pairs: ["data.live-curve-graph-inset", "data.timecode-hud"],
  avoid: ["celebration", "playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "prompt-motion:kloss-xyz-had-to-test-this", license: "reference", note: "+ ismailfahmi-bikin-showreel-15-detik, math-files-i-made-this-using; our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    const mk = (tag, css, parent, text) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const u = Math.min(f.W, f.H) / 1080;
    const scene = ctx.scene || stage, hb = ctx.box(scene);
    const dec = Math.round(ML.clamp(p.decimals, 0, 3));
    const fs = 26 * u;
    // where: a corner of the safe area (mirrored in Arabic), or under the target
    let pos = p.position;
    if (pos !== "under-object" && rtl) pos = pos.includes("right") ? pos.replace("right", "left") : pos.replace("left", "right");
    const S = f.safe, m = 32 * u;
    let css;
    if (pos === "under-object" && el) {
      const b = ctx.box(el);
      css = `left:${(b.x - hb.x).toFixed(1)}px;top:${(b.y + b.h + 12 * u - hb.y).toFixed(1)}px;width:${b.w.toFixed(1)}px;justify-content:${rtl ? "flex-end" : "flex-start"}`;
      if (getComputedStyle(el).textAlign === "center") css += ";justify-content:center";
    } else {
      if (pos === "under-object") pos = rtl ? "bottom-left" : "bottom-right";
      const x = pos.includes("right") ? `right:${(f.W - (S.x + S.w) + m - hb.x).toFixed(1)}px` : `left:${(S.x + m - hb.x).toFixed(1)}px`;
      const y = pos.includes("top") ? `top:${(S.y + m * 0.5 - hb.y).toFixed(1)}px` : `top:${(S.y + S.h - m * 0.5 - fs * 1.6 - hb.y).toFixed(1)}px`;
      css = `${x};${y}`;
    }
    const box = mk("div", `position:absolute;${css};z-index:22;display:flex;align-items:baseline;gap:${(12 * u).toFixed(1)}px;white-space:nowrap;visibility:hidden;will-change:opacity;direction:${rtl ? "rtl" : "ltr"}`, scene);
    const defLabel = { rate: rtl ? "مباشر" : "live", elapsed: rtl ? "آخر تحديث" : "updated", value: rtl ? "القيم" : "values" }[p.mode];
    const lab = p.label || defLabel;
    if (lab) mk("span", `font:var(--x-label-weight) ${(fs * 0.72).toFixed(1)}px var(--x-label-font);letter-spacing:var(--x-label-track);text-transform:var(--x-label-case);color:color-mix(in srgb, var(--x-ink) 40%, transparent)`, box, lab);
    const val = mk("span", `font:500 ${fs.toFixed(1)}px var(--x-mono-font);font-variant-numeric:tabular-nums;letter-spacing:.05em;color:color-mix(in srgb, var(--x-ink) 52%, transparent);direction:ltr;unicode-bidi:isolate`, box, "");
    if (p.mode === "elapsed" && rtl) val.style.direction = "rtl";
    const fmtNum = (v) => {
      if (p.format === "compact") {
        const a = Math.abs(v), units = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
        for (const [k, s] of units) if (a >= k) return (v / k).toFixed(Math.max(1, dec)) + s;
        return v.toFixed(dec);
      }
      if (p.format === "plain") return v.toFixed(dec);
      return v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
    };
    const two = (v, d) => { const s = Math.abs(v).toFixed(d), [i, fr] = s.split("."); return (v < 0 ? "−" : "") + i.padStart(2, "0") + (fr ? "." + fr : ""); };
    const sgn = (v, d) => (v < 0 ? "−" : "+") + Math.abs(v).toFixed(d);
    const text = (t) => {
      const s = Math.max(0, t - at);
      if (p.mode === "elapsed") { const n = s.toFixed(Math.max(1, dec)); return rtl ? `منذ ${n} ثانية.` : `${n} seconds ago.`; }
      if (p.mode === "value") { const th = (s * 1.2) % (Math.PI * 2); return `t = ${two(s, 2)} s   θ = ${th.toFixed(2)}   sin = ${sgn(Math.sin(th), 2)}`; }
      const v = p.start + p.rate * s;
      return fmtNum(v) + (p.unit ? " " + p.unit : "");
    };
    return {
      draw(t) {
        if (t < at - 1e-6) { box.style.visibility = "hidden"; return; }
        box.style.visibility = "visible";
        const leave = ML.clamp((t - (end - 0.25)) / 0.2), e = ML.ease(t, at, at + 0.3);
        box.style.opacity = (e * (1 - leave)).toFixed(4);
        const s = text(t);
        if (val.textContent !== s) val.textContent = s;
      },
    };
  },
});
