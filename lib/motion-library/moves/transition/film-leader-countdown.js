// Film leader countdown: an old film leader counting `start` … 1. A toned ground (sepia, or black and white) with a
// vignette and grain; two concentric circles (light strokes) and a crosshair; a giant serif number centred. A darker
// wedge (conic-gradient) sweeps 360 degrees per count, linear, over the lighter ground; the number changes on each full
// sweep with a blip. Flicker and dust specks change every film frame (24 fps), seeded, so a frame is always the same.
// The tones come from the look (ink and ground mixed into greys) and are toned sepia by a filter, never a fixed colour.
// One count is 1 s, shortened when the move's time is shorter. On a number target the leader sits over that number.
// Source: prompt-motion henkpoley-opus-5-5-on-max (reference only: our own rebuild).
ML.define({
  id: "transition.film-leader-countdown",
  category: "transition",
  name: "Film leader countdown",
  does: "A sepia film-leader circle shows a big number while a radar-like wedge sweeps around, counting 3, 2, 1.",
  says: ["time", "playful", "story"],
  energy: 2,
  targets: ["number", "scene"],
  duration: [1, 4],
  params: {
    start: { type: "number", range: [3, 10], default: 3 },
    style: { type: "choice", options: ["sepia", "bw"], default: "sepia" },
    flicker: { type: "bool", default: true },
  },
  pairs: ["transition.dip-to-colour", "background.grain"],
  avoid: ["tech", "urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:henkpoley-opus-5-5-on-max", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const real = ctx.el && ctx.el !== stage ? ctx.el : null;
    // over a number: a round leader a little wider than it, kept inside the frame
    const B = real ? (() => {
      const b = ctx.box(real), s = Math.min(Math.max(b.w, b.h) * 1.15, Math.min(f.W, f.H) * 0.9);
      return { x: ML.clamp(b.x + b.w / 2 - s / 2, 0, f.W - s), y: ML.clamp(b.y + b.h / 2 - s / 2, 0, f.H - s), w: s, h: s };
    })() : { x: 0, y: 0, w: f.W, h: f.H };
    const S = Math.min(B.w, B.h), u = S / 100;
    const N = Math.round(ML.clamp(p.start, 3, 10));
    const per = ML.clamp((end - at - 0.15) / N, 0.35, 1);
    const done = at + N * per;
    // opening a scene, the full-frame leader holds on its first count from the scene's first frame (no flash of the scene)
    const shown = !real && at - ctx.from < 0.3 ? ctx.from : at;
    // greys from the look: the darkest and lightest of ink / ground
    const lum = (c) => { const m = String(c).match(/[\d.]+/g); if (!m || m.length < 3) return 0.5; return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255; };
    const probe = document.createElement("div"); host.append(probe);
    const res = (n) => { probe.style.color = `var(${n})`; return getComputedStyle(probe).color; };
    const pair = ["--x-ink", "--x-ground"].sort((a, b) => lum(res(a)) - lum(res(b)));
    probe.remove();
    const dark = `var(${pair[0]})`, light = `var(${pair[1]})`;
    const g = (pct) => `color-mix(in srgb, ${dark} ${pct}%, ${light})`; // pct of dark
    const NS = "http://www.w3.org/2000/svg";
    const box = document.createElement("div");
    box.style.cssText = `position:absolute;left:${B.x}px;top:${B.y}px;width:${B.w}px;height:${B.h}px;pointer-events:none;z-index:7;overflow:hidden;display:none;border-radius:${real ? "50%" : "0"};` +
      `filter:${p.style === "bw" ? "grayscale(1)" : "grayscale(1) sepia(0.85) saturate(1.25) hue-rotate(-8deg)"}`;
    host.append(box);
    const lay = (css) => { const d = document.createElement("div"); d.style.cssText = "position:absolute;inset:0;" + css; box.append(d); return d; };
    const ground = lay(`background:${g(52)}`);
    const R = S * 0.42;
    // the sweep: a darker wedge over the lighter ground
    const wedge = lay("");
    // circles and crosshair
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${B.w} ${B.h}`); svg.setAttribute("width", B.w); svg.setAttribute("height", B.h);
    svg.style.cssText = "position:absolute;inset:0";
    const cx = B.w / 2, cy = B.h / 2, sw = Math.max(2, 0.3 * u);
    svg.innerHTML = `<g style="fill:none;stroke:${g(8)};stroke-width:${sw}">` +
      `<circle cx="${cx}" cy="${cy}" r="${R}"/><circle cx="${cx}" cy="${cy}" r="${R * 0.82}"/>` +
      `<line x1="0" y1="${cy}" x2="${B.w}" y2="${cy}"/><line x1="${cx}" y1="0" x2="${cx}" y2="${B.h}"/></g>`;
    box.append(svg);
    const num = lay(`display:flex;align-items:center;justify-content:center;font:700 ${(R * 1.25).toFixed(1)}px/1 var(--x-serif-font);color:${g(92)};direction:ltr;font-variant-numeric:lining-nums`);
    const vignette = lay(`background:radial-gradient(ellipse 75% 70% at 50% 50%, transparent 52%, color-mix(in srgb, ${dark} 70%, transparent) 100%)`);
    // grain: turbulence with a new seed every film frame
    const grain = document.createElementNS(NS, "svg");
    const fid = `mlfl${Math.round(at * 1000)}`; // unique per placement
    grain.setAttribute("width", B.w); grain.setAttribute("height", B.h);
    grain.style.cssText = "position:absolute;inset:0;opacity:0.22;mix-blend-mode:overlay";
    grain.innerHTML = `<filter id="${fid}"><feTurbulence type="fractalNoise" baseFrequency="${(0.9 / Math.max(1, u / 10)).toFixed(3)}" numOctaves="2" seed="1"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#${fid})"/>`;
    box.append(grain);
    const turb = grain.querySelector("feTurbulence");
    // dust specks: a few per frame, seeded by the frame number
    const specks = Array.from({ length: 7 }, () => lay(`inset:auto;border-radius:50%;background:${g(96)}`));
    const flash = lay(`background:${light};opacity:0`);
    for (let i = 0; i < N; i++) ctx.sfx(at + i * per, "blip", 0.35);
    return {
      draw(t) {
        const on = t >= shown && t < done;
        box.style.display = on ? "block" : "none";
        if (real) real.style.visibility = on ? "hidden" : "";
        if (!on) return;
        const run = Math.max(0, t - at);
        const k = Math.min(N - 1, Math.floor(run / per));
        const frac = run / per - k;
        num.textContent = String(N - k);
        const deg = (frac * 360).toFixed(2);
        wedge.style.background = `conic-gradient(from 0deg at 50% 50%, ${g(74)} 0deg ${deg}deg, transparent ${deg}deg 360deg)`;
        const fr = Math.floor(t * 24);
        turb.setAttribute("seed", String(1 + (fr % 97)));
        // flicker: exposure wobbles a little per frame, with a brighter frame on each new count
        const fl = p.flicker ? 0.06 * (ML.rnd(fr, 3) - 0.5) : 0;
        ground.style.filter = `brightness(${(1 + fl).toFixed(3)})`;
        flash.style.opacity = frac < 0.04 ? "0.25" : "0";
        specks.forEach((s, i) => {
          const show = p.flicker && ML.rnd(fr * 7 + i, 4) < 0.45;
          s.style.display = show ? "block" : "none";
          if (!show) return;
          const r = (0.15 + 0.55 * ML.rnd(fr * 7 + i, 5)) * u;
          s.style.left = (ML.rnd(fr * 7 + i, 6) * B.w).toFixed(1) + "px";
          s.style.top = (ML.rnd(fr * 7 + i, 7) * B.h).toFixed(1) + "px";
          s.style.width = r.toFixed(1) + "px";
          s.style.height = (r * (0.6 + ML.rnd(fr * 7 + i, 8))).toFixed(1) + "px";
        });
        vignette.style.opacity = (0.9 + fl).toFixed(3);
      },
    };
  },
});
