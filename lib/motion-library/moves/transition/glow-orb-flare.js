// Glow orb flare: a ball or a line becomes a big blurred glowing orb with a white-hot core that flares and cuts to the
// next scene. From a ball: it grows 1 -> 6x over 0.3 s expo.in (its size, never a scale-up of pixels), blurring 0 ->
// 14 px with a growing bloom, while ~30 thin radial streaks (1-2 px, long, tails fading for motion blur) rush outward.
// From a line: the line shrinks (scaleX -> 0) to its centre in 0.3 s power3.in, then the orb (a radial gradient,
// radius 0 -> 120 px at 1080, blur 20 px, a 10 px white-hot core) grows over 0.4 s. The flare: brightness up and 1.2x in
// 0.1 s, then a hard cut on the peak (the scene is gone, the next one plays) or a 2-frame flash of the look's light.
// On a shape target the ball / line is that shape (hidden as the orb takes over); otherwise one is drawn at the centre.
// Colour: a look name or a --x- variable.
// Source: prompt-motion leonkohli-opus-5-5-is-crazy + zaqailo-the-consistency-of-opus (reference only: our own rebuild).
ML.define({
  id: "transition.glow-orb-flare",
  category: "transition",
  name: "Glow orb flare",
  does: "A ball or line becomes a big blurred glowing orb with a white-hot core that flares (optionally with radial speed streaks) and cuts to the next scene.",
  says: ["transition", "energy"],
  energy: 5,
  targets: ["shape", "scene"],
  duration: [0.4, 0.8],
  params: {
    from: { type: "choice", options: ["ball", "line"], default: "ball" },
    streaks: { type: "bool", default: true },
    colour: { type: "text", default: "accent" },
    cut: { type: "choice", options: ["hard", "flash"], default: "hard" },
  },
  pairs: ["transition.collapse-to-line", "transition.flash-cut"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.heavy",
  source: { from: "prompt-motion:leonkohli-opus-5-5-is-crazy", license: "reference", note: "with prompt-motion zaqailo-the-consistency-of-opus; our own rebuild" },
  setup(ctx) {
    const { p, at, stage, f, el } = ctx;
    const scene = ctx.scene || null;
    const W = f.W, H = f.H, k = Math.min(W, H) / 1080, diag = Math.hypot(W, H);
    const C = (c, fb) => {
      c = String(c || "").trim();
      if (c.startsWith("--x-")) return `var(${c})`;
      if (c === "white" || c === "light") return "var(--x-accent-ink)";
      if (c === "black" || c === "dark") return "var(--x-device)";
      if (/^(accent|accent-2|accent-ink|ink|good|bad|panel|panel-2|ground|dim|device|glow-1|glow-2)$/.test(c)) return `var(--x-${c})`;
      return fb;
    };
    const col = C(p.colour, "var(--x-accent)"), hot = "var(--x-accent-ink)";
    const line = p.from === "line";
    const src = el && el !== stage ? el : null;
    let cx = W / 2, cy = H / 2, d0 = 90 * k, lw = Math.min(W, H) * 0.6, lh = 8 * k;
    if (src) { const b = ctx.box(src); cx = b.x + b.w / 2; cy = b.y + b.h / 2; d0 = ML.clamp(Math.min(b.w, b.h), 20 * k, 240 * k); lw = b.w; lh = Math.max(4 * k, Math.min(b.h, 14 * k)); }
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:8;display:none";
    // the line (from: line)
    const bar = document.createElement("div");
    bar.style.cssText = `position:absolute;left:${cx - lw / 2}px;top:${cy - lh / 2}px;width:${lw}px;height:${lh}px;border-radius:${lh}px;background:${col};box-shadow:0 0 ${(18 * k).toFixed(1)}px ${col}`;
    // the orb: a radial gradient with a white-hot core, sized per frame (never scaled up)
    const orb = document.createElement("div");
    orb.style.cssText = `position:absolute;border-radius:50%;background:radial-gradient(circle, ${hot} 0%, ${hot} 14%, color-mix(in srgb, ${col} 70%, ${hot}) 30%, ${col} 52%, color-mix(in srgb, ${col} 35%, transparent) 72%, transparent 100%)`;
    const streakEls = [];
    const N = p.streaks ? 30 : 0;
    for (let i = 0; i < N; i++) {
      const s = document.createElement("div");
      const w = (1 + ML.rnd(i, 41)) * k * 1.4, len = diag * (0.12 + 0.18 * ML.rnd(i, 42));
      s.style.cssText = `position:absolute;left:${cx}px;top:${cy - w / 2}px;width:${len.toFixed(1)}px;height:${w.toFixed(2)}px;transform-origin:0 50%;` +
        `background:linear-gradient(to right, transparent, color-mix(in srgb, ${col} 70%, ${hot}))`;
      streakEls.push({ s, a: (i / N) * 360 + (ML.rnd(i, 43) - 0.5) * 9, len, d: ML.rnd(i, 44) * 0.08 });
      layer.append(s);
    }
    const flash = document.createElement("div");
    flash.style.cssText = `position:absolute;inset:0;background:${hot};display:none`;
    layer.append(bar, orb, flash);
    stage.append(layer);
    // timeline
    const T = line ? { shrink: [at, at + 0.3], grow: [at + 0.3, at + 0.7], flare: [at + 0.7, at + 0.8] } : { grow: [at, at + 0.3], flare: [at + 0.3, at + 0.4] };
    const cut = T.flare[1], FR = 1 / 30, flashEnd = cut + 2 * FR;
    const expoIn = (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10));
    const p3in = (x) => x * x * x * x;
    const rMax = line ? 120 * k * 2.2 : d0 * 3; // orb radius at the end of its growth (gradient fades past the core)
    ctx.sfx(T.grow[0], "whoosh.heavy", 0.5);
    if (p.cut === "flash") ctx.sfx(cut, "hit", 0.35);
    return {
      draw(t) {
        const on = t >= at && t < (p.cut === "flash" ? flashEnd : cut);
        layer.style.display = on ? "block" : "none";
        if (src) src.style.visibility = t >= at && t < cut ? "hidden" : "";
        if (scene) scene.style.visibility = t >= cut ? "hidden" : "";
        if (!on) return;
        if (t >= cut) { flash.style.display = "block"; flash.style.opacity = (1 - ML.lin(t, cut, flashEnd)).toFixed(4); bar.style.display = orb.style.display = "none"; streakEls.forEach((q) => (q.s.style.display = "none")); return; }
        flash.style.display = "none";
        orb.style.display = "block";
        let r, blur, g;
        if (line) {
          const u = p3in(ML.lin(t, T.shrink[0], T.shrink[1]));
          bar.style.display = t < T.shrink[1] ? "block" : "none";
          bar.style.transform = `scaleX(${(1 - u).toFixed(4)})`;
          const v = ML.expo(t, T.grow[0], T.grow[1]);
          r = Math.max(lh / 2, rMax * v); blur = 20 * k * v; g = v;
        } else {
          bar.style.display = "none";
          const v = expoIn(ML.lin(t, T.grow[0], T.grow[1]));
          r = (d0 / 2) * (1 + 5 * v) * 1.4; blur = 14 * k * v; g = v;
        }
        const fl = ML.out(t, T.flare[0], T.flare[1]);
        r *= 1 + 0.2 * fl;
        orb.style.left = `${(cx - r).toFixed(1)}px`; orb.style.top = `${(cy - r).toFixed(1)}px`;
        orb.style.width = orb.style.height = `${(2 * r).toFixed(1)}px`;
        orb.style.filter = `blur(${blur.toFixed(2)}px) brightness(${(1 + 0.8 * fl).toFixed(3)})`;
        orb.style.boxShadow = `0 0 ${(r * 0.8 * g).toFixed(1)}px ${(r * 0.25 * g).toFixed(1)}px color-mix(in srgb, ${col} ${(55 * g).toFixed(1)}%, transparent)`;
        for (const q of streakEls) {
          const a0 = T.grow[0] + q.d, u = ML.lin(t, a0, cut);
          const head = r * 0.5 + (diag * 0.75) * (u * u);
          q.s.style.display = t < a0 ? "none" : "block";
          q.s.style.transform = `rotate(${q.a.toFixed(2)}deg) translateX(${Math.max(r * 0.45, head - q.len).toFixed(1)}px)`;
          q.s.style.opacity = (Math.min(1, u * 4) * 0.9).toFixed(4);
        }
      },
    };
  },
});
