// CRT power: like an old TV switching off, the picture squashes (scaleY 1 -> 0.008 over 0.18 s power4.in) into a
// bright glowing line on a dark screen; then either the line shrinks to a dot (scaleX 1 -> 0, 0.25 s power3.in) whose
// bright core holds 0.15 s while a radial glow fades up and blooms open into the next scene; or 2-3 offset bars
// flicker, a full-frame accent flash lands for two frames and the line shatters into particles; or a plain cut.
// Switching on: a dark screen with a 2 px line at the centre opens (scaleY -> 1 over 0.15 s expo.out) under a grey
// fill that clears to the scene over 0.2 s, and a scanline overlay remains. Particles are seeded (ML.rnd).
// Source: prompt-motion robvjourney-opus-5-5-is-cooking, ibrahimwasim240-opus-5-5-max-effort,
// astrodevil-insane-made-with-claude (reference only: our own rebuild).
ML.define({
  id: "transition.crt-power",
  category: "transition",
  name: "CRT power",
  does: "The picture squashes into a bright horizontal line like an old TV switching off (then to a dot, a flash or particles), or a line on black expands open like one switching on.",
  says: ["transition", "tech", "energy", "change", "arrival", "playful"],
  energy: 4,
  targets: ["scene", "screen"],
  duration: [0.3, 0.9],
  params: {
    direction: { type: "choice", options: ["off", "on"], default: "off" },
    end: { type: "choice", options: ["dot-bloom", "flash-particles", "cut"], default: "dot-bloom" },
    colour: { type: "text", default: "accent" },
    scanlines: { type: "bool", default: true },
  },
  pairs: ["text-in.glitch-in", "background.grain"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:robvjourney-opus-5-5-is-cooking", license: "reference", note: "our own rebuild; also ibrahimwasim240-opus-5-5-max-effort, astrodevil-insane-made-with-claude" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const isScreen = ctx.el && ctx.el !== stage;
    const pic = isScreen ? ctx.el : ctx.scene || stage; // what switches off / on
    const host = isScreen ? ctx.el.parentElement : stage;
    const W = isScreen ? ctx.el.offsetWidth : f.W, H = isScreen ? ctx.el.offsetHeight : f.H, v = Math.min(f.W, f.H) / 100;
    const ox = isScreen ? ctx.el.offsetLeft : 0, oy = isScreen ? ctx.el.offsetTop : 0;
    const c = String(p.colour || "accent").trim();
    const col = c.startsWith("--x-") ? `var(${c})` : /^(accent|accent-2|ink|good|bad|panel|ground|dim)$/.test(c) ? `var(--x-${c})` : "var(--x-accent)";
    const bright = `color-mix(in srgb, var(--x-accent-ink) 82%, ${col})`;
    if (pic !== stage && getComputedStyle(host).position === "static") host.style.position = "relative";
    // the dark tube behind the picture (under it), and the light layer above it
    const tube = document.createElement("div");
    tube.style.cssText = `position:absolute;left:${ox}px;top:${oy}px;width:${W}px;height:${H}px;background:var(--x-device);pointer-events:none;visibility:hidden;border-radius:${isScreen ? "inherit" : "0"}`;
    host.insertBefore(tube, pic === stage ? stage.firstChild : pic);
    const fx = document.createElement("div");
    fx.style.cssText = `position:absolute;left:${ox}px;top:${oy}px;width:${W}px;height:${H}px;pointer-events:none;overflow:hidden;z-index:6;visibility:hidden`;
    host.append(fx);
    const mk = (css) => { const d = document.createElement("div"); d.style.cssText = "position:absolute;" + css; fx.append(d); return d; };
    const lh = Math.max(2, 0.17 * v);
    const line = mk(`left:0;top:${(H - lh) / 2}px;width:${W}px;height:${lh}px;background:${bright};box-shadow:0 0 ${(1.1 * v).toFixed(1)}px ${col}, 0 0 ${(2.6 * v).toFixed(1)}px color-mix(in srgb, ${col} 50%, transparent);transform-origin:50% 50%`);
    const ds = Math.max(6, 0.55 * v);
    const dot = mk(`left:${(W - ds) / 2}px;top:${(H - ds) / 2}px;width:${ds}px;height:${ds}px;border-radius:50%;background:radial-gradient(circle, var(--x-accent-ink) 35%, ${bright} 70%);box-shadow:0 0 ${(1.2 * v).toFixed(1)}px ${col}`);
    const gr = 28 * v;
    const glow = mk(`left:${W / 2 - gr}px;top:${H / 2 - gr}px;width:${2 * gr}px;height:${2 * gr}px;border-radius:50%;background:radial-gradient(circle, color-mix(in srgb, ${col} 40%, transparent) 0%, color-mix(in srgb, ${col} 14%, transparent) 45%, transparent 70%)`);
    const bars = [0, 1, 2].map((i) => mk(`left:0;width:${W}px;height:${(lh * (i === 1 ? 2.5 : 1.5)).toFixed(1)}px;top:${(H / 2 + (i - 1) * 1.1 * v).toFixed(1)}px;background:${i === 1 ? col : "var(--x-dim)"}`));
    const flash = mk(`inset:0;background:${col}`);
    const N = 46;
    const parts = Array.from({ length: N }, (_, i) => {
      const s = Math.max(2, (0.25 + 0.4 * ML.rnd(i, 3)) * v);
      const d = mk(`left:0;top:0;width:${s}px;height:${s}px;border-radius:50%;background:${ML.rnd(i, 4) < 0.5 ? bright : col}`);
      return { d, x: ML.rnd(i, 1) * W, vx: (ML.rnd(i, 2) - 0.5) * 60 * v, vy: (ML.rnd(i, 5) - 0.5) * 70 * v, s };
    });
    const grey = mk(`inset:0;background:color-mix(in srgb, var(--x-dim) 70%, var(--x-panel))`);
    const scan = document.createElement("div");
    scan.style.cssText = `position:absolute;left:${ox}px;top:${oy}px;width:${W}px;height:${H}px;pointer-events:none;z-index:5;visibility:hidden;` +
      `background:repeating-linear-gradient(0deg, color-mix(in srgb, var(--x-device) 14%, transparent) 0 ${(0.14 * v).toFixed(1)}px, transparent ${(0.14 * v).toFixed(1)}px ${(0.42 * v).toFixed(1)}px)`;
    host.append(scan);
    // the picture carries the stage's ground while it switches (a scene is transparent over the stage)
    const ground = (on) => { if (pic === stage || isScreen) return; pic.style.background = on ? "var(--x-ground)" : ""; pic.style.backgroundImage = on ? "var(--x-ground-image)" : ""; };
    const all = [line, dot, glow, ...bars, flash, grey, ...parts.map((q) => q.d)];
    const hideAll = () => all.forEach((e) => (e.style.opacity = "0"));
    const p4in = (x) => x ** 5, p3in = (x) => x ** 4;
    const off = p.direction !== "on";
    // timings
    const sq = at + 0.18;
    const T = off
      ? p.end === "dot-bloom" ? { dotA: sq, dotB: sq + 0.25, hold: sq + 0.4, bloom: sq + 0.68 } : p.end === "flash-particles" ? { flick: sq + 0.1, flash: sq + 0.17, burst: sq + 0.55 } : { gone: sq + 0.1 }
      : { open: at + 0.15, clear: at + 0.35 };
    const doneAt = off ? (T.bloom || T.burst || T.gone) : T.clear;
    ctx.sfx(at, "blip", 0.4);
    if (off && p.end === "flash-particles") ctx.sfx(T.flash, "hit", 0.35);
    if (off && p.end === "dot-bloom") ctx.sfx(T.hold, "whoosh.soft", 0.25);
    return {
      draw(t) {
        hideAll();
        const live = off ? t >= at && t < doneAt + 0.02 : t < T.clear + 0.02;
        fx.style.visibility = live ? "visible" : "hidden";
        scan.style.visibility = p.scanlines && !off && t >= at ? "visible" : "hidden";
        if (off) {
          const after = t >= doneAt;
          tube.style.visibility = t >= at && !after ? "visible" : "hidden";
          ground(t >= at && !after);
          if (t < at) { pic.style.transform = ""; pic.style.filter = ""; pic.style.visibility = ""; return; }
          const s = p4in(ML.lin(t, at, sq));
          pic.style.transformOrigin = "50% 50%";
          pic.style.transform = `scaleY(${(1 - 0.992 * s).toFixed(4)})`;
          pic.style.filter = `brightness(${(1 + 1.4 * s).toFixed(3)})`;
          pic.style.visibility = t >= sq ? "hidden" : "";
          if (after) return;
          line.style.opacity = ML.lin(t, sq - 0.05, sq).toFixed(4);
          if (p.end === "dot-bloom") {
            const x = p3in(ML.lin(t, T.dotA, T.dotB));
            line.style.transform = `scaleX(${(1 - x).toFixed(4)})`;
            if (t >= T.dotB) line.style.opacity = "0";
            const dIn = ML.lin(t, T.dotB - 0.05, T.dotB), b = ML.ease(t, T.hold, T.bloom);
            dot.style.opacity = (dIn * (1 - b)).toFixed(4);
            dot.style.scale = (1 + 0.15 * Math.sin(ML.lin(t, T.dotB, T.hold) * Math.PI)).toFixed(4);
            const gu = ML.out(t, T.dotB, T.hold);
            glow.style.opacity = (gu * (1 - b)).toFixed(4);
            // bloom: the glow opens past the frame and the dark tube opens with it
            const need = Math.hypot(W, H) / (gr * 1.2);
            glow.style.scale = (1 + (need - 1) * b).toFixed(4);
            tube.style.webkitMaskImage = tube.style.maskImage = b > 0 ? `radial-gradient(circle at 50% 50%, transparent ${(b * 75).toFixed(2)}%, #000 ${(b * 75 + 8).toFixed(2)}%)` : "none";
          } else if (p.end === "flash-particles") {
            const fl = t >= sq && t < T.flick;
            bars.forEach((e, i) => { e.style.opacity = fl && (Math.floor((t - sq) * 30) + i) % 2 === 0 ? "1" : "0"; e.style.translate = `${((i - 1) * 2.2 * v).toFixed(1)}px 0`; });
            if (t >= T.flick) line.style.opacity = "0";
            flash.style.opacity = t >= T.flick && t < T.flash ? "0.8" : "0";
            const u = ML.lin(t, T.flash - 0.02, T.burst), tt = Math.max(0, t - (T.flash - 0.02));
            parts.forEach((q) => {
              if (t < T.flash - 0.02) return;
              q.d.style.opacity = (1 - u * u).toFixed(4);
              const x = q.x + q.vx * tt, y = H / 2 + q.vy * tt + 40 * v * tt * tt;
              q.d.style.transform = `translate(${(x - q.s / 2).toFixed(1)}px, ${(y - q.s / 2).toFixed(1)}px)`;
            });
          }
          return;
        }
        // switching on
        tube.style.visibility = t < T.clear ? "visible" : "hidden";
        ground(t < T.clear);
        const o = ML.expo(t, at, T.open);
        pic.style.transformOrigin = "50% 50%";
        pic.style.transform = t >= T.open ? "" : `scaleY(${(0.005 + 0.995 * o).toFixed(4)})`;
        pic.style.filter = "";
        pic.style.visibility = "";
        if (t < T.clear) {
          line.style.opacity = (1 - ML.lin(t, at, at + 0.08)).toFixed(4);
          // the grey fill opens with the picture, then clears to it
          const gh = (0.005 + 0.995 * o) * H;
          grey.style.inset = `${((H - gh) / 2).toFixed(1)}px 0`;
          grey.style.opacity = t < at ? "0" : (1 - ML.lin(t, T.open, T.clear)).toFixed(4);
          if (t < at) pic.style.transform = "scaleY(0.005)";
        }
      },
    };
  },
});
