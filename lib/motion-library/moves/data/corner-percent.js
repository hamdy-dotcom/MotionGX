// Quiet corner percent (MengTo threejs-towers' build meter): a huge bold percentage in a corner counts 0 → 100
// linearly with the move (value = round(progress × 100)), line-height .76, tight tracking, 86% opacity, tabular, its
// '%' small at 50% opacity; under it a thin timeline (2.5 px track in the line colour, an ink fill at 78% opacity
// = the progress) with a bold tabular "0.00 / 4.40" time readout at its far end. When it completes the number fades
// away over .6 s. A quiet meter beside a hero visual. The count ends at the target's own percentage when it shows one
// ("87%"), else 100. In Arabic the corners mirror (the meter sits on the reading-end side) and the track fills from
// the right. Sizes scale from the source's 132 px (64 px on phones) to the frame.
// Source: MengTo/Skills web-design/threejs-towers demo (MIT): .pct, .track / .fill, .time.
ML.define({
  id: "data.corner-percent",
  category: "data",
  name: "Quiet corner percent",
  does: "A huge bold percentage in the corner counts 0 to 100 while a thin timeline fills beneath it, then fades away when done.",
  says: ["growth", "time", "result", "precision"],
  energy: 2,
  targets: ["number"],
  duration: [2, 8],
  params: {
    position: { type: "choice", options: ["bottom-right", "bottom-left", "top-right", "top-left"], default: "bottom-right" },
    size: { type: "number", range: [64, 160], default: 132, unit: "px" },
    timeline: { type: "bool", default: true },
    fade_on_done: { type: "bool", default: true },
  },
  pairs: ["data.count-up", "camera.push-in"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/threejs-towers/demo/index.html", license: "MIT" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const mk = (tag, css, text, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const AR = "٠١٢٣٤٥٦٧٨٩";
    const own = el ? (el.textContent || "") : "";
    const arDigits = /[٠-٩]/.test(own);
    const m = own.replace(/[٠-٩]/g, (d) => String(AR.indexOf(d))).match(/(\d+(?:\.\d+)?)\s*[%٪]/);
    const goal = m ? ML.clamp(Math.round(parseFloat(m[1])), 1, 100) : 100;
    const N = (v) => (arDigits ? String(v).replace(/\d/g, (d) => AR[d]) : String(v));
    // place: the chosen corner of the safe region (left / right mirrored in Arabic)
    let pos = String(p.position || "bottom-right");
    if (rtl) pos = pos.replace(/right|left/, (s) => (s === "right" ? "left" : "right"));
    const top = pos.startsWith("top"), right = pos.endsWith("right");
    const k = Math.min(f.W, f.H) / 1080;
    const fs = ML.clamp(p.size, 64, 160) * k * 1.25;
    const scene = ctx.scene || ctx.stage, hb = ctx.box(scene);
    const S = f.safe, pad = 16 * k;
    const meterW = Math.min(S.w, f.wide ? S.w * 0.42 : S.w * 0.8);
    const box = mk("div", `position:absolute;${right ? "right" : "left"}:${(right ? hb.x + hb.w - (S.x + S.w) : S.x - hb.x).toFixed(1)}px;${top ? "top" : "bottom"}:${(top ? S.y - hb.y : hb.y + hb.h - (S.y + S.h)).toFixed(1)}px;width:${meterW.toFixed(1)}px;z-index:14;pointer-events:none;will-change:transform;display:flex;flex-direction:column;align-items:${right ? "flex-end" : "flex-start"};gap:${(22 * k).toFixed(1)}px;padding:${pad.toFixed(1)}px 0;direction:ltr`, null, scene);
    const num = mk("div", `font:700 ${fs.toFixed(1)}px/0.76 var(--x-head-font);letter-spacing:${(-fs * 0.038).toFixed(2)}px;opacity:.86;font-variant-numeric:tabular-nums lining-nums;color:var(--x-ink);white-space:nowrap;padding-top:${(fs * 0.12).toFixed(1)}px`, null, box);
    const val = mk("span", "", N(0), num);
    mk("i", `font-style:normal;font-size:${(fs * 0.3).toFixed(1)}px;letter-spacing:0;margin-left:${(6 * k).toFixed(1)}px;opacity:.5`, arDigits ? "٪" : "%", num);
    let fill = null, time = null, foot = null;
    if (p.timeline) {
      foot = mk("div", `display:flex;align-items:center;gap:${(16 * k).toFixed(1)}px;width:100%;${rtl ? "flex-direction:row-reverse" : ""}`, null, box);
      const track = mk("div", `position:relative;flex:1 1 auto;height:${Math.max(2.5, 3.5 * k).toFixed(1)}px;background:var(--x-line)`, null, foot);
      fill = mk("div", `position:absolute;${rtl ? "right" : "left"}:0;top:0;bottom:0;width:0;background:var(--x-ink);opacity:.78`, null, track);
      time = mk("div", `font:700 ${Math.max(13, 20 * k).toFixed(1)}px var(--x-body-font);letter-spacing:.5px;opacity:.72;white-space:nowrap;font-variant-numeric:tabular-nums;min-width:${(150 * k).toFixed(1)}px;text-align:${rtl ? "left" : "right"}`, "", foot);
    }
    // the run: from `at` to just before the end (leaving room for the fade), linear like the source
    const fade = p.fade_on_done ? 0.6 : 0;
    const done = Math.max(at + 0.8, end - fade - 0.3), DUR = done - at;
    ctx.sfx(at, "tap", 0.2);
    ctx.sfx(done, "tap", 0.25);
    return {
      draw(t) {
        const frac = ML.lin(t, at, done);
        box.style.visibility = t >= at - 1e-6 ? "visible" : "hidden";
        val.textContent = N(Math.round(frac * goal));
        const cssEase = ML.bezier(0.25, 0.1, 0.25, 1);
        num.style.opacity = (0.86 * (fade ? 1 - cssEase(ML.lin(t, done, done + fade)) : 1)).toFixed(4);
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        box.style.opacity = (ML.lin(t, at - 0.05, at + 0.2) * (1 - leave)).toFixed(4);
        if (fill) fill.style.width = (frac * 100).toFixed(3) + "%";
        if (time) time.textContent = `${N((frac * DUR).toFixed(2))} / ${N(DUR.toFixed(2))}`;
      },
    };
  },
});
