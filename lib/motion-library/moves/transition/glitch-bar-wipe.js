// Glitch bar wipe: 8-14 horizontal bars (heights 2-14 % of the frame, lengths 10-100 % of the width, seeded y and a
// 0-0.15 s seeded delay) shoot in from the left or right edge in 0.15-0.3 s power3.out (thousands of px a second); each
// bar's leading edge carries a 4-step smear (a pixel-stretch gradient fading into the dim) or an RGB split (two offset
// fringes in the look's warm and second accent). Colour = the next scene's ground, black (the device dark), or the
// accent / ink. When coverage passes ~70 % (0.2 s) the frame switches to the new colour, the remaining bars exit across
// and the field gives way to the next scene. ~0.35 s. Alternate: bars from both sides; one-way: from the reading side
// (right in Arabic).
// Source: prompt-motion eyishazyer-found-another-prompt-for + ndhabarde11-wtf-claude-opus-5-5 (reference only: our own
// rebuild).
ML.define({
  id: "transition.glitch-bar-wipe",
  category: "transition",
  name: "Glitch bar wipe",
  does: "Horizontal bars of random height and length shoot across from the sides with smeared or RGB-fringed edges until they cover the frame in the new colour.",
  says: ["transition", "energy", "tech"],
  energy: 5,
  targets: ["scene"],
  duration: [0.25, 0.5],
  params: {
    colour: { type: "choice", options: ["next-ground", "black", "accent", "ink"], default: "next-ground" },
    bars: { type: "number", range: [8, 14], default: 10 },
    edge: { type: "choice", options: ["smear", "rgb"], default: "smear" },
    direction: { type: "choice", options: ["alternate", "one-way"], default: "alternate" },
  },
  pairs: ["text-in.scramble", "transition.flash-cut"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:eyishazyer-found-another-prompt-for", license: "reference", note: "with prompt-motion ndhabarde11-wtf-claude-opus-5-5; our own rebuild" },
  setup(ctx) {
    const { p, at, end, stage, f } = ctx;
    const scene = ctx.scene || null;
    const W = f.W, H = f.H, k = Math.min(W, H) / 1080;
    const col = p.colour === "black" ? "var(--x-device)" : p.colour === "accent" ? "var(--x-accent)" : p.colour === "ink" ? "var(--x-ink)" : "var(--x-ground)";
    const n = Math.round(ML.clamp(+p.bars || 10, 8, 14));
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:8;overflow:hidden;display:none";
    const field = document.createElement("div");
    field.style.cssText = `position:absolute;inset:0;background:${col};visibility:hidden`;
    layer.append(field);
    const bandH = H / n, smearW = W * 0.07;
    const startSide = ctx.rtl ? -1 : 1; // +1 = from the left
    const bars = [];
    for (let i = 0; i < n; i++) {
      // stratified y so the bars spread down the frame, heights overlapping their band a little
      const h = ML.clamp(bandH * (0.6 + 0.75 * ML.rnd(i, 11)), H * 0.02, H * 0.14);
      const y = i * bandH + (bandH - h) * ML.rnd(i, 12) + (ML.rnd(i, 13) - 0.5) * bandH * 0.3;
      const short = ML.rnd(i, 14) < 0.18;
      const len = W * (short ? 0.1 + 0.2 * ML.rnd(i, 15) : 0.55 + 0.45 * ML.rnd(i, 15));
      const side = p.direction === "one-way" ? startSide : (i % 2 ? -startSide : startSide);
      const delay = 0.15 * ML.rnd(i, 16), dur = 0.15 + 0.15 * ML.rnd(i, 17);
      const el = document.createElement("div");
      el.style.cssText = `position:absolute;top:${y.toFixed(1)}px;height:${h.toFixed(1)}px;width:${(len + smearW).toFixed(1)}px;${side > 0 ? "left:0" : "right:0"}`;
      const body = document.createElement("div");
      body.style.cssText = `position:absolute;top:0;bottom:0;${side > 0 ? "left:0" : "right:0"};width:${len.toFixed(1)}px;background:${col}`;
      const lead = document.createElement("div");
      const toward = side > 0 ? "to right" : "to left";
      if (p.edge === "rgb") {
        // two fringes: warm ahead, cool above / below, the bar on top
        const o = 9 * k;
        const f1 = body.cloneNode(), f2 = body.cloneNode();
        f1.style.background = "var(--x-bad)"; f1.style.translate = `${(side * o).toFixed(1)}px ${(-o * 0.35).toFixed(1)}px`; f1.style.opacity = "0.85";
        f2.style.background = "var(--x-accent-2)"; f2.style.translate = `${(side * o * 0.5).toFixed(1)}px ${(o * 0.35).toFixed(1)}px`; f2.style.opacity = "0.85";
        el.append(f1, f2, body);
      } else {
        lead.style.cssText = `position:absolute;top:0;bottom:0;${side > 0 ? `left:${len.toFixed(1)}px` : `right:${len.toFixed(1)}px`};width:${smearW.toFixed(1)}px;` +
          `background:linear-gradient(${toward}, color-mix(in srgb, ${col} 80%, var(--x-dim)) 0 25%, color-mix(in srgb, ${col} 55%, var(--x-dim)) 25% 50%, color-mix(in srgb, ${col} 30%, var(--x-dim)) 50% 75%, color-mix(in srgb, ${col} 12%, transparent) 75% 100%)`;
        el.append(body, lead);
      }
      layer.append(el);
      bars.push({ el, side, len: len + smearW, a: at + delay, b: at + delay + dur });
    }
    stage.append(layer);
    const sw = at + 0.2, exitB = at + 0.36, fieldOut = Math.min(end, exitB + 0.12);
    const q4out = (x) => 1 - Math.pow(1 - x, 4), q3in = (x) => x * x * x;
    ctx.sfx(at, "whoosh.soft", 0.45);
    return {
      draw(t) {
        const on = t >= at && t < fieldOut;
        layer.style.display = on ? "block" : "none";
        if (scene) scene.style.visibility = t >= sw ? "hidden" : "";
        if (!on) return;
        field.style.visibility = t >= sw ? "visible" : "hidden";
        field.style.opacity = (1 - ML.lin(t, exitB, fieldOut)).toFixed(4);
        for (const b of bars) {
          const u = q4out(ML.lin(t, b.a, b.b));
          // in: from fully off its edge to anchored on it; after the switch: on across and out the far side
          const x = t < sw ? -(1 - u) * b.len : (1 - u) * -b.len + q3in(ML.lin(t, sw, exitB)) * (W + b.len);
          b.el.style.translate = `${(b.side * x).toFixed(1)}px 0`;
          b.el.style.visibility = t < b.a ? "hidden" : "visible";
        }
      },
    };
  },
});
