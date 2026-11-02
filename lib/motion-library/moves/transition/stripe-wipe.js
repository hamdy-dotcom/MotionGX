// Stripe wipe: 4-9 equal bands (frame / N) in the look's palette (accent, panel cream, ink, second accent, cycling)
// slide in one after another — each from -100 % to its place over 0.24 s power3.out, 0.04 s apart, in order or in a
// seeded order — until the frame is striped over (~0.45 s); they hold two frames, then either clear by carrying on out
// of the far side with the same stagger ("continue"), go back the way they came ("reverse"), or vanish on a cut ("cut"),
// and the new scene is underneath. A band running along its travel slides; a band across its travel grows from that
// side (scaleY 0 -> 1 from the top for horizontal bands moving down). The leading edge carries a soft smear (a
// gradient feather, 10 % of the band's length) when blur_edge is on. "pass": 4-6 bars 10-15 % high at seeded heights
// shoot right across (-100 % -> +100 %, 0.3 s expo.inOut, 0.04 s apart) and the new scene wipes in behind the last
// bar. Horizontal travel follows the reading direction (mirrored in Arabic). The old scene is the one before this
// when the film has it; alone, a copy of this layout in the look's inverse.
// Source: prompt-motion gonzalomacagno-que-locura-opus-5-5, jasonzhou1993-wft-this-is-one, tequilafunks-opus-5-5-
// remotion-make, lukasersil-ten-claudeai-me-neprestava (reference only: our own rebuild).
ML.define({
  id: "transition.stripe-wipe",
  category: "transition",
  name: "Stripe wipe",
  does: "Bands in the palette colours slide or shoot in one after another until the frame is striped over, then clear to reveal the next scene.",
  says: ["transition", "energy", "brand", "celebration", "speed"],
  energy: 4,
  targets: ["scene"],
  duration: [0.45, 1],
  params: {
    orientation: { type: "choice", options: ["horizontal", "vertical"], default: "horizontal" },
    direction: { type: "choice", options: ["left", "right", "up", "down"], default: "right" },
    bands: { type: "number", range: [4, 9], default: 7 },
    order: { type: "choice", options: ["sequential", "random"], default: "sequential" },
    mode: { type: "choice", options: ["cover", "pass"], default: "cover" },
    blur_edge: { type: "bool", default: true },
    exit: { type: "choice", options: ["cut", "continue", "reverse"], default: "continue" },
  },
  pairs: ["text-in.punchline", "transition.glitch-bar-wipe", "transition.hard-cut"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:gonzalomacagno-que-locura-opus-5-5", license: "reference", note: "with jasonzhou1993-wft-this-is-one, tequilafunks-opus-5-5-remotion-make, lukasersil-ten-claudeai-me-neprestava; our own rebuild" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const scene = ctx.scene || stage;
    const W = f.W, H = f.H;
    /** the old frame: the scene before this one when the film has it, else a copy of this layout in the look's inverse */
    const oldFrame = (scene) => {
      let prev = scene.previousElementSibling;
      while (prev && !(prev.classList && prev.classList.contains("ml-scene"))) prev = prev.previousElementSibling;
      const g = document.createElement("div");
      g.dataset.mlFx = "1";
      g.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden;background:var(--x-ground);background-image:var(--x-ground-image);color:var(--x-ink)";
      if (prev && prev.dataset.look) g.dataset.look = prev.dataset.look; // the old scene keeps its own look
      for (const c of (prev || scene).children) if (!(c.dataset && c.dataset.mlFx)) g.append(c.cloneNode(true));
      g.querySelectorAll("[data-slot],[id]").forEach((e) => { e.removeAttribute("data-slot"); e.removeAttribute("id"); });
      if (!prev) {
        const cs = getComputedStyle(scene), v = (n) => cs.getPropertyValue(n).trim();
        const ground = v("--x-ink"), ink = v("--x-ground");
        const set = { "--x-ground": ground, "--x-ink": ink, "--x-dim": `color-mix(in srgb, ${ink} 66%, transparent)`, "--x-panel": `color-mix(in srgb, ${ink} 9%, ${ground})`, "--x-panel-2": `color-mix(in srgb, ${ink} 14%, ${ground})`, "--x-line": `color-mix(in srgb, ${ink} 14%, transparent)`, "--x-edge-color": `color-mix(in srgb, ${ink} 14%, transparent)`, "--x-ground-image": "none" };
        for (const [n, x] of Object.entries(set)) g.style.setProperty(n, x);
        g.style.background = ground; g.style.color = ink;
      }
      return g;
    };
    const A = oldFrame(scene);
    const layer = document.createElement("div");
    layer.dataset.mlFx = "1";
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:7;overflow:hidden";
    scene.append(A, layer);

    const horiz = p.orientation !== "vertical"; // horizontal bands: full width, H / N tall
    // travel axis and sign: right / down = +1; horizontal travel mirrored in Arabic (bands come from the reading start)
    let dir = p.direction || "right";
    if (ctx.rtl && (dir === "left" || dir === "right")) dir = dir === "left" ? "right" : "left";
    const alongX = dir === "left" || dir === "right";
    const sgn = dir === "right" || dir === "down" ? 1 : -1;
    const slide = horiz === alongX; // the band runs along its travel: it slides; else it grows from the side it comes from
    const pal = ["var(--x-accent)", "var(--x-panel-2)", "var(--x-ink)", "var(--x-accent-2)"];
    const feather = (col, axisDeg) => (p.blur_edge ? `linear-gradient(${axisDeg}, transparent 0, ${col} 10%, ${col} 100%)` : col);
    const ease3o = (x) => 1 - Math.pow(1 - x, 3), ease3io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const expoIO = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2);
    const mk = (css) => { const d = document.createElement("div"); d.style.cssText = "position:absolute;" + css; layer.append(d); return d; };

    if (p.mode === "pass") {
      // pass: bars shoot across along x (or y), the new scene wipes in behind the last
      const n = 4 + Math.round(2 * ML.rnd(at * 13 + 1, 3));
      const bars = [];
      for (let i = 0; i < n; i++) {
        const thick = (alongX ? H : W) * (0.1 + 0.05 * ML.rnd(i, 21));
        const pos = ((i + 0.15 + 0.7 * ML.rnd(i, 22)) / n) * (alongX ? H : W) - thick / 2;
        const len = (alongX ? W : H) * 0.9;
        const col = pal[i % pal.length];
        const lead = alongX ? (sgn > 0 ? "270deg" : "90deg") : (sgn > 0 ? "0deg" : "180deg");
        const el = mk(alongX ? `left:0;top:${pos.toFixed(1)}px;width:${len}px;height:${thick.toFixed(1)}px;background:${feather(col, lead)}` : `top:0;left:${pos.toFixed(1)}px;height:${len}px;width:${thick.toFixed(1)}px;background:${feather(col, lead)}`);
        bars.push({ el, len, a: at + i * 0.04 });
      }
      const span = alongX ? W : H, last = bars[bars.length - 1];
      ctx.sfx(at, "whoosh.soft", 0.45);
      return {
        draw(t) {
          layer.style.display = t > last.a + 0.3 ? "none" : "block";
          for (const b of bars) {
            const u = expoIO(ML.lin(t, b.a, b.a + 0.3));
            // from fully before the frame to fully past it
            const x = -b.len + u * (span + b.len);
            const d = sgn > 0 ? x : span - b.len - x;
            b.el.style.translate = alongX ? `${d.toFixed(1)}px 0` : `0 ${d.toFixed(1)}px`;
          }
          // the new scene wipes in behind the last bar's tail
          const u = expoIO(ML.lin(t, last.a, last.a + 0.3));
          const tail = ML.clamp((-last.len + u * (span + last.len)) / span, 0, 1);
          A.style.visibility = t >= last.a + 0.3 ? "hidden" : "visible";
          A.style.clipPath = t < last.a ? "none" : alongX ? (sgn > 0 ? `inset(0 0 0 ${(tail * 100).toFixed(2)}%)` : `inset(0 ${(tail * 100).toFixed(2)}% 0 0)`) : (sgn > 0 ? `inset(${(tail * 100).toFixed(2)}% 0 0 0)` : `inset(0 0 ${(tail * 100).toFixed(2)}% 0)`);
        },
      };
    }

    // cover: N equal bands, staggered in, full cover by ~0.45 s, two frames' hold, then clear
    const n = Math.round(ML.clamp(+p.bands || 7, 4, 9));
    const cross = (horiz ? H : W) / n;
    const order = Array.from({ length: n }, (_, i) => i);
    if (p.order === "random") order.sort((a, b) => ML.rnd(a, 31) - ML.rnd(b, 31));
    else if (!slide && sgn < 0) order.reverse(); // growing up / left: the far band first
    const dIn = n > 6 ? 0.2 : 0.24, stag = Math.min(0.05, (0.45 - dIn) / Math.max(1, n - 1));
    const bands = [];
    for (let i = 0; i < n; i++) {
      const col = pal[i % pal.length];
      const len = (horiz ? W : H) * (slide ? 1.12 : 1); // the band's own length; a sliding band carries its feather past the far edge
      const lead = alongX ? (sgn > 0 ? "270deg" : "90deg") : (sgn > 0 ? "0deg" : "180deg");
      const bg = slide ? feather(col, lead) : col;
      const css = horiz
        ? `top:${(i * cross - 0.5).toFixed(1)}px;height:${(cross + 1).toFixed(1)}px;width:${len}px;left:${slide && sgn < 0 ? W - len : 0}px`
        : `left:${(i * cross - 0.5).toFixed(1)}px;width:${(cross + 1).toFixed(1)}px;height:${len}px;top:${slide && sgn < 0 ? H - len : 0}px`;
      const el = mk(`${css};background:${bg};transform-origin:${alongX ? (sgn > 0 ? "0% 50%" : "100% 50%") : (sgn > 0 ? "50% 0%" : "50% 100%")}`);
      const k = order.indexOf(i);
      bands.push({ el, len, a: at + k * stag });
    }
    const covered = at + (n - 1) * stag + dIn, hold = 2 / 30, outA = covered + hold;
    const span = alongX ? W : H;
    const exit = p.exit || "continue";
    const outEnd = outA + (n - 1) * stag + dIn;
    ctx.sfx(at, "whoosh.soft", 0.45);
    if (exit !== "cut") ctx.sfx(outA, "whoosh.soft", 0.3);
    return {
      draw(t) {
        const done = exit === "cut" ? t >= outA : t >= outEnd;
        layer.style.display = done ? "none" : "block";
        A.style.visibility = t >= covered ? "hidden" : "visible";
        for (const b of bands) {
          const u = ease3o(ML.lin(t, b.a, b.a + dIn));
          const v = exit === "cut" ? 0 : ease3io(ML.lin(t, b.a - at + outA, b.a - at + outA + dIn));
          if (slide) {
            // in: from fully off its side; out: on across the far side (continue) or back (reverse)
            let x = -(1 - u) * b.len;
            if (v > 0) x = exit === "reverse" ? -v * b.len : v * (span + 2);
            b.el.style.translate = alongX ? `${(sgn * x).toFixed(1)}px 0` : `0 ${(sgn * x).toFixed(1)}px`;
            b.el.style.transform = "";
          } else {
            // across its travel: grows from the side it comes from, shrinks toward the far side (continue) or back
            const s = v > 0 ? 1 - v : u;
            const origin = v > 0 && exit === "continue" ? (alongX ? (sgn > 0 ? "100% 50%" : "0% 50%") : (sgn > 0 ? "50% 100%" : "50% 0%")) : (alongX ? (sgn > 0 ? "0% 50%" : "100% 50%") : (sgn > 0 ? "50% 0%" : "50% 100%"));
            b.el.style.transformOrigin = origin;
            b.el.style.transform = alongX ? `scaleX(${s.toFixed(4)})` : `scaleY(${s.toFixed(4)})`;
          }
          b.el.style.visibility = t < b.a ? "hidden" : "visible";
        }
      },
    };
  },
});
