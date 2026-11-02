// Gradient caret keyword wipe: a keyword fills the screen (30–40 % of the frame height, fitted to its width, sans
// 600), revealed by a tall caret — a solid accent bar the text's full height — that drags a gradient tail behind it
// (transparent → accent-2 at 60 %, `tail` of the word's width). The clip edge is the caret: it travels 0 → the word's
// width in `duration` s on expo.out while the word sharpens from an 8 px blur as it is revealed. Each word of the
// target is a keyword, landing on its spoken word and replacing the one before; the last tilts away (rotateZ −10°
// with a 3D tilt) sliding out. Arabic (RTL) runs the caret right → left.
// Source: prompt-motion:ultimaxbt-2ddf1e (reference only — our own rebuild).
ML.define({
  id: "kinetic.gradient-caret-keyword-wipe",
  category: "kinetic",
  name: "Gradient caret keyword wipe",
  does: "A keyword fills the screen huge, revealed by a tall caret dragging a gradient tail behind it; keywords replace each other.",
  says: ["focus", "choice", "energy"],
  energy: 4,
  targets: ["word", "headline"],
  duration: [0.8, 4],
  params: {
    direction: { type: "choice", options: ["ltr", "rtl"], default: "ltr" },
    tilt_exit: { type: "bool", default: true },
    duration: { type: "number", range: [0.3, 0.8], default: 0.5, unit: "s" },
    tail: { type: "number", range: [0.2, 0.6], default: 0.4, unit: "word" },
  },
  pairs: ["text-emphasis.accent-word", "transition.whip-pan"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:ultimaxbt-2ddf1e", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, stage, f } = ctx;
    if (!el) return null;
    const text = (el.textContent || "").trim().replace(/\s+/g, " ");
    if (!text) return null;
    const host = ctx.scene || stage;
    const k = stage.getBoundingClientRect().width / (stage.offsetWidth || 1) || 1;
    const rtlRun = ctx.rtl || ML.ARABIC.test(text) ? true : p.direction === "rtl";
    const names = text.split(" ").filter(Boolean);
    const n = names.length, D = ML.clamp(p.duration, 0.3, 0.8);
    const exitDur = p.tilt_exit ? 0.45 : 0.2;
    const span = Math.max(D + 0.15, (end - exitDur - at) / n);
    const times = names.map((w, i) => (i === 0 ? at : Math.max(at, ctx.word(w, at + i * span))));
    for (let i = 1; i < n; i++) times[i] = Math.max(times[i], times[i - 1] + D * 0.7);
    // the layer: a takeover of the stage on its own ground, the keyword centred, in perspective for the tilted exit
    const layer = document.createElement("div");
    Object.assign(layer.style, { position: "absolute", inset: "0", zIndex: "6", display: "grid", placeItems: "center", pointerEvents: "none", background: "var(--x-ground)", backgroundImage: "var(--x-ground-image)", perspective: (f.W * 1.4).toFixed(0) + "px", overflow: "hidden" });
    host.append(layer);
    const caretW = Math.max(4, Math.round(f.W * 0.0093)); // 10 px at 1080
    const words = names.map((name) => {
      const box = document.createElement("div");
      Object.assign(box.style, { gridArea: "1 / 1", position: "relative", display: "inline-block", transformStyle: "preserve-3d" });
      const w = document.createElement("div");
      w.textContent = name;
      const ar = ML.ARABIC.test(name);
      Object.assign(w.style, { font: `600 100px / 1 var(--x-head-font)`, letterSpacing: ar ? "0" : "var(--x-head-track)", whiteSpace: "nowrap", color: "var(--x-ink)", padding: ar ? "0.1em 0" : "0" });
      const tail = document.createElement("i");
      Object.assign(tail.style, { position: "absolute", top: "0", height: "100%", pointerEvents: "none", background: `linear-gradient(${rtlRun ? "to left" : "to right"}, transparent, color-mix(in srgb, var(--x-accent-2) 60%, transparent))` });
      const caret = document.createElement("i");
      Object.assign(caret.style, { position: "absolute", top: "0", height: "100%", width: caretW + "px", background: "var(--x-accent)", pointerEvents: "none" });
      box.append(w, tail, caret);
      layer.append(box);
      // size: 30–40 % of the frame height, within 90 % of its width
      const w100 = w.getBoundingClientRect().width / k || 1;
      const size = Math.min(f.H * 0.34, (100 * f.W * 0.88) / w100, f.W * 0.6);
      w.style.fontSize = size.toFixed(1) + "px";
      box.style.display = "none";
      return { box, w, tail, caret };
    });
    for (const x of words) { x.box.style.display = "inline-block"; x.W = x.w.getBoundingClientRect().width / k; x.box.style.display = "none"; }
    const exitAt = Math.max(times[n - 1] + D + 0.1, end - exitDur);
    times.forEach((t0) => ctx.sfx(t0, "whoosh.soft", 0.3));
    return {
      draw(t) {
        el.style.visibility = t >= at ? "hidden" : "visible";
        layer.style.visibility = t >= at && t < exitAt + exitDur ? "visible" : "hidden";
        words.forEach((x, i) => {
          const on = t >= times[i] && (i + 1 < n ? t < times[i + 1] : t < exitAt + exitDur);
          x.box.style.display = on ? "inline-block" : "none";
          if (!on) return;
          const u = ML.expo(t, times[i], times[i] + D), cx = u * x.W;
          const hide = ((1 - u) * 100).toFixed(3);
          x.w.style.clipPath = u >= 1 ? "none" : rtlRun ? `inset(-10% 0 -10% ${hide}%)` : `inset(-10% ${hide}% -10% 0)`;
          x.w.style.filter = u < 1 ? `blur(${(8 * (1 - u)).toFixed(2)}px)` : "none";
          const gone = ML.lin(t, times[i] + D, times[i] + D + 0.15);
          const tw = Math.min(cx, p.tail * x.W);
          x.caret.style.opacity = x.tail.style.opacity = (1 - gone).toFixed(4);
          x.caret.style[rtlRun ? "right" : "left"] = (cx - caretW / 2).toFixed(2) + "px";
          x.caret.style[rtlRun ? "left" : "right"] = "auto";
          x.tail.style[rtlRun ? "right" : "left"] = (cx - tw).toFixed(2) + "px";
          x.tail.style[rtlRun ? "left" : "right"] = "auto";
          x.tail.style.width = Math.max(0, tw).toFixed(2) + "px";
          // the last keyword tilts and slides away (or simply fades)
          if (i === n - 1) {
            const e = ML.lin(t, exitAt, exitAt + exitDur), q = e * e * e;
            if (p.tilt_exit) {
              const dir = rtlRun ? 1 : -1;
              x.box.style.transform = e > 0 ? `translateX(${(dir * q * f.W * 0.9).toFixed(1)}px) rotateZ(${(-10 * ML.ease(t, exitAt, exitAt + exitDur * 0.6)).toFixed(3)}deg) rotateY(${(dir * -24 * q).toFixed(3)}deg)` : "none";
              x.box.style.opacity = (1 - ML.lin(t, exitAt + exitDur * 0.5, exitAt + exitDur)).toFixed(4);
            } else { x.box.style.transform = "none"; x.box.style.opacity = (1 - e).toFixed(4); }
          } else { x.box.style.transform = "none"; x.box.style.opacity = "1"; }
        });
      },
    };
  },
});
