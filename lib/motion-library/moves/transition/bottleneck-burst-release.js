// Bottleneck burst: a choke point — two triangles pinching a flow line, apex to apex, with a queue of dashes piled up
// against the neck — bursts. At release the halves rotate +-40deg and fly 120-160 px away (power3.out 0.5 s), one out
// top-right, one out the bottom, fading; a thin ring (2 px, 30%) scales 0.3 -> 1.6 from the neck (0.6 s expo.out)
// fading; 12-24 radial ticks (2 x 22 px) burst 40 -> 110 px out and fade over 0.5 s; and the queued dashes accelerate
// through to ~1600 px/s with a horizontal motion blur (scaleX up to 3 + blur 4 px), 0.01 s apart, fanning out a little
// past the neck and exiting the far side; the next line (if given) lands where the choke was. The frame holds still. Flow runs in reading direction (right-to-left in RTL). Pixel sizes scale with the stage.
// Scene scope builds the choke in the picture region on the ground; shape scope centres it on the target shape.
// Source: prompt-motion prasad-pilla-wtf-made-entirely-with (reference only: our own rebuild).
ML.define({
  id: "transition.bottleneck-burst-release",
  category: "transition",
  name: "Bottleneck burst",
  does: "A choke point bursts: the hourglass halves fly apart, a ring of tick rays pops at the neck, and the queued items shoot through as motion-blurred streaks.",
  says: ["relief", "speed", "change"],
  energy: 4,
  targets: ["scene", "shape"],
  duration: [1, 2],
  params: {
    ring: { type: "bool", default: true },
    ticks: { type: "number", range: [12, 24], default: 16 },
    streak_colour: { type: "text", default: "accent" },
    queue: { type: "number", range: [8, 30], default: 18 },
    hold: { type: "number", range: [0, 0.8], default: 0.35, unit: "s" },
    next: { type: "text", default: "" },
  },
  pairs: ["text-emphasis.accent-word", "text-in.punchline"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:prasad-pilla-wtf-made-entirely-with", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const scene = ctx.scene || stage;
    const W = scene.offsetWidth || f.W, H = scene.offsetHeight || f.H, k = Math.min(W, H) / 1080;
    const onShape = ctx.el && ctx.el !== stage && ctx.el !== scene;
    const dir = ctx.rtl ? -1 : 1;
    const TOK = { accent: "var(--x-accent)", "accent-2": "var(--x-accent-2)", ink: "var(--x-ink)", good: "var(--x-good)", bad: "var(--x-bad)", dim: "var(--x-dim)" };
    const streak = TOK[String(p.streak_colour || "accent").replace(/^--x-/, "").trim()] || "var(--x-accent)";
    // the neck: the shape's centre, else the picture region's centre
    let cx = f.pic.x + f.pic.w / 2, cy = f.pic.y + f.pic.h / 2;
    if (onShape) { const b = ctx.box(ctx.el); cx = b.x + b.w / 2; cy = b.y + b.h / 2; }
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:6;overflow:hidden";
    scene.append(layer);
    if (!onShape) {
      // the choke sits on a clean ground over the picture region
      const plate = document.createElement("div");
      plate.style.cssText = `position:absolute;left:0;right:0;top:${(f.pic.y - 12 * k).toFixed(0)}px;height:${(f.pic.h + 90 * k).toFixed(0)}px;background:var(--x-ground)`;
      layer.append(plate);
      const rule = document.createElement("div");
      rule.style.cssText = `position:absolute;left:0;right:0;top:${(cy - 0.5).toFixed(1)}px;height:1px;background:var(--x-line)`;
      layer.append(rule);
    }
    const s = 1.4 * k, th = 92 * s, tw = 78 * s; // triangle height / base
    const tri = (up) => {
      const d = document.createElement("div");
      d.style.cssText = `position:absolute;left:${(cx - tw / 2).toFixed(1)}px;top:${(up ? cy + 2 * k : cy - th - 2 * k).toFixed(1)}px;width:${tw.toFixed(1)}px;height:${th.toFixed(1)}px;background:var(--x-ink);clip-path:${up ? "polygon(50% 0, 100% 100%, 0 100%)" : "polygon(0 0, 100% 0, 50% 100%)"};transform-origin:50% ${up ? "0%" : "100%"}`;
      layer.append(d); return d;
    };
    const top = tri(false), bot = tri(true);
    const ring = document.createElement("div");
    const R = 120 * s;
    ring.style.cssText = `position:absolute;left:${(cx - R).toFixed(1)}px;top:${(cy - R).toFixed(1)}px;width:${(2 * R).toFixed(1)}px;height:${(2 * R).toFixed(1)}px;border-radius:50%;box-shadow:inset 0 0 0 ${(2 * k).toFixed(2)}px color-mix(in srgb, var(--x-ink) 30%, transparent);opacity:0`;
    if (p.ring) layer.append(ring);
    const nT = Math.round(ML.clamp(p.ticks, 12, 24));
    const ticks = Array.from({ length: nT }, (_, i) => {
      const d = document.createElement("div"), a = (i / nT) * 360;
      d.style.cssText = `position:absolute;left:${(cx - 1 * k).toFixed(1)}px;top:${(cy - 11 * k).toFixed(1)}px;width:${(2 * k).toFixed(2)}px;height:${(22 * k).toFixed(1)}px;background:var(--x-ink);border-radius:${k}px;opacity:0`;
      layer.append(d); return { d, a };
    });
    // the queue: dashes piled up against the neck on the incoming side
    const nQ = Math.round(ML.clamp(p.queue, 8, 30)), dw = 26 * k, dh = 6 * k, gap = 12 * k;
    const dashes = Array.from({ length: nQ }, (_, i) => {
      const lane = (ML.rnd(i, 3) - 0.5) * 110 * k, x0 = tw * 0.18 + 8 * k + i * (dw + gap); // its lane past the neck, its way to the neck
      const d = document.createElement("div");
      const x = cx - dir * (tw * 0.18 + 8 * k + i * (dw + gap)) - (dir > 0 ? dw : 0);
      d.style.cssText = `position:absolute;left:${x.toFixed(1)}px;top:${(cy - dh / 2).toFixed(1)}px;width:${dw.toFixed(1)}px;height:${dh.toFixed(1)}px;background:var(--x-ink);border-radius:${(dh / 2).toFixed(1)}px;transform-origin:${dir > 0 ? "100%" : "0%"} 50%`;
      layer.append(d); return { d, x, lane, x0 };
    });
    const hold = ML.clamp(Math.min(p.hold, ctx.end - at - 0.9), 0, 0.8), rel = at + 0.2 + hold; // a short slot before ctx.end shortens the hold, never the burst
    const p3out = (x) => 1 - Math.pow(1 - x, 4), expoOut = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
    // the next line lands on the cleared ground (scene scope), taking the flow line's place
    let words = [], rule = null;
    const nextText = (p.next || "").trim();
    if (!onShape) rule = layer.children[1];
    if (!onShape && nextText) {
      const fs = Math.min(parseFloat(getComputedStyle(scene).getPropertyValue("--x-head-size")) || 104, W * 0.085);
      const title = document.createElement("div");
      title.setAttribute("dir", ctx.rtl ? "rtl" : "ltr");
      title.style.cssText = `position:absolute;left:${f.m}px;right:${f.m}px;top:${(cy - 300 * k).toFixed(0)}px;height:${(600 * k).toFixed(0)}px;display:flex;align-items:center;justify-content:center;text-align:center;font:var(--x-head-weight) ${fs.toFixed(1)}px/var(--x-head-line) var(--x-head-font);letter-spacing:${ctx.rtl ? "0" : "var(--x-head-track)"};text-transform:var(--x-head-case);color:var(--x-ink);text-wrap:balance`;
      const line = document.createElement("div"); line.textContent = nextText; title.append(line); layer.append(title);
      words = ML.split(line, "words");
    }
    const V = 1600 * k, ACC = 0.25; // px/s reached after ACC seconds
    const fly = 140 * k;
    ctx.sfx(rel, "hit", 0.35);
    ctx.sfx(rel + 0.05, "whoosh.soft", 0.5);
    return {
      draw(t) {
        layer.style.visibility = t < at ? "hidden" : "visible";
        const intro = ML.out(t, at, at + 0.2);
        layer.style.opacity = intro.toFixed(4);
        // the halves: pinched (a slight strain before release), then flung apart
        const u = p3out(ML.lin(t, rel, rel + 0.5)), strain = t < rel ? Math.sin(t * 60) * 0.6 * k * ML.lin(t, rel - 0.3, rel) : 0;
        top.style.transform = `translate(${(dir * u * fly * 0.8 + strain).toFixed(2)}px, ${(-u * fly).toFixed(2)}px) rotate(${(dir * 40 * u).toFixed(2)}deg)`;
        bot.style.transform = `translate(${(-dir * u * fly * 0.25 - strain).toFixed(2)}px, ${(u * fly * 1.1).toFixed(2)}px) rotate(${(-dir * 40 * u).toFixed(2)}deg)`;
        top.style.opacity = bot.style.opacity = (1 - ML.lin(t, rel + 0.2, rel + 0.5)).toFixed(4);
        // the ring
        const r = expoOut(ML.lin(t, rel, rel + 0.6));
        ring.style.opacity = t < rel ? "0" : (1 - r).toFixed(4);
        ring.style.transform = `scale(${(0.3 + 1.3 * r).toFixed(4)})`;
        // the ticks
        const q = p3out(ML.lin(t, rel, rel + 0.5));
        ticks.forEach(({ d, a }) => {
          d.style.opacity = t < rel ? "0" : (1 - ML.lin(t, rel + 0.15, rel + 0.5)).toFixed(4);
          d.style.transform = `rotate(${a}deg) translateY(${(-(40 + 70 * q) * k).toFixed(2)}px)`;
        });
        const nx = rel + 0.55;
        words.forEach((w, i) => { const v = ML.land(t, nx + i * 0.06, nx + 0.4 + i * 0.06); w.style.opacity = v.toFixed(4); w.style.translate = `0 ${((1 - v) * 28 * k).toFixed(2)}px`; });
        if (rule && words.length) rule.style.opacity = (1 - ML.lin(t, rel, nx)).toFixed(4);
        // the queue: a nervous shuffle, then streaks through the neck, nearest first
        dashes.forEach(({ d, lane, x0 }, i) => {
          const tau = t - (rel + 0.03 + i * 0.01);
          let x = 0, v = 0;
          if (tau > 0) { if (tau < ACC) { x = (V * tau * tau) / (2 * ACC); v = (V * tau) / ACC; } else { x = V * (tau - ACC / 2); v = V; } }
          const wob = t < rel ? Math.sin(t * 14 + i * 1.7) * 1.5 * k * ML.lin(t, at, rel) : 0;
          const sp = v / V;
          const fan = ML.ease(x - x0, 0, 320 * k);
          d.style.transform = `translate(${(dir * x + wob).toFixed(2)}px, ${(lane * fan).toFixed(2)}px) scaleX(${(1 + 2 * sp).toFixed(3)})`;
          d.style.filter = sp > 0.02 ? `blur(${(4 * sp).toFixed(2)}px)` : "none";
          d.style.background = tau > 0 ? streak : "var(--x-ink)";
        });
      },
    };
  },
});
