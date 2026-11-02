// Blob circle wipe: 3-5 large circles (alternating the given look colours) with centres scattered around the frame
// grow 0 -> 0.8 W, overlapping and merging, on expo.inOut over 0.5 s with a 0.06 s stagger; the last circle (paper by
// default) carries the next scene inside it — a window, not a scale — and keeps expanding to full frame. Edges crisp
// (clip-path circles). Scatter is seeded, mirrored in RTL; "centre" grows them all from the middle in turn.
// Source: prompt-motion danilowm-cursor-usando-o-opus (reference only: our own rebuild).
ML.define({
  id: "transition.blob-circle-wipe",
  category: "transition",
  name: "Blob circle wipe",
  does: "Several large circles grow and merge across the frame, then the last one carries the next scene inside it out to full frame.",
  says: ["transition", "change", "playful"],
  energy: 4,
  targets: ["scene"],
  duration: [0.6, 1.2],
  params: {
    count: { type: "number", range: [3, 5], default: 4 },
    colours: { type: "text", default: "accent, paper" },
    origin: { type: "choice", options: ["scattered", "centre"], default: "scattered" },
    duration: { type: "number", range: [0.4, 0.7], default: 0.5, unit: "s" },
    next: { type: "text", default: "" },
  },
  pairs: ["transition.circle-iris", "text-in.punchline"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop",
  source: { from: "prompt-motion:danilowm-cursor-usando-o-opus", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const scene = ctx.scene || stage;
    const W = scene.offsetWidth || f.W, H = scene.offsetHeight || f.H;
    const n = Math.round(ML.clamp(p.count, 3, 5)), D0 = ML.clamp(p.duration, 0.4, 0.7);
    const z = ML.clamp((ctx.end - at) / ((n - 1) * 0.06 + D0 * 1.2), 0.4, 1), D = D0 * z, stag = 0.06 * z; // squeezes to fit before ctx.end
    const expoIO = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2);
    const TOK = { accent: ["var(--x-accent)", "var(--x-accent-ink)"], "accent-2": ["var(--x-accent-2)", "var(--x-ink)"], paper: ["var(--x-panel)", "var(--x-ink)"], panel: ["var(--x-panel)", "var(--x-ink)"], white: ["var(--x-panel)", "var(--x-ink)"], "panel-2": ["var(--x-panel-2)", "var(--x-ink)"], ground: ["var(--x-ground)", "var(--x-ink)"], ink: ["var(--x-ink)", "var(--x-ground)"], good: ["var(--x-good)", "var(--x-accent-ink)"] };
    const names = String(p.colours || "accent, paper").split(/[,\s]+/).map((s) => s.replace(/^--x-/, "").trim().toLowerCase()).filter((s) => TOK[s]);
    const cols = names.length ? names : ["accent", "paper"];
    const mir = ctx.rtl ? -1 : 1;
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:6;overflow:hidden";
    scene.append(layer);
    const circles = [];
    for (let i = 0; i < n; i++) {
      const last = i === n - 1;
      // the last circle is the paper one (the last colour named) and lands near the middle
      const name = last ? cols[cols.length - 1] : cols[i % cols.length];
      let cx, cy;
      if (p.origin === "centre") { cx = W / 2; cy = H / 2; }
      else if (last) { cx = W * (0.5 + mir * (ML.rnd(i, 9) - 0.5) * 0.3); cy = H * (0.45 + (ML.rnd(i, 4) - 0.5) * 0.3); }
      else {
        const a = (i / (n - 1)) * Math.PI * 2 + ML.rnd(i, 2) * 0.9;
        cx = W * (0.5 + mir * Math.cos(a) * (0.32 + 0.12 * ML.rnd(i, 3))); cy = H * (0.5 + Math.sin(a) * (0.3 + 0.12 * ML.rnd(i, 5)));
      }
      const r1 = last ? Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy)) * 1.02 : W * 0.8;
      const d = document.createElement("div");
      d.style.cssText = `position:absolute;inset:0;background:${TOK[name][0]};clip-path:circle(0px at ${cx.toFixed(1)}px ${cy.toFixed(1)}px)`;
      layer.append(d);
      circles.push({ d, cx, cy, r1, t0: at + i * stag, dur: last ? D * 1.2 : D, last, ink: TOK[name][1] });
    }
    // the next scene inside the last circle: its title (given, or the scene's own line)
    const lastC = circles[n - 1];
    const head = scene.querySelector(".ml-title"), sub = scene.querySelector(".ml-sub");
    const text = (p.next || "").trim() || (sub ? sub.textContent.trim() : head ? head.textContent.trim() : "");
    const fs = Math.min(parseFloat(getComputedStyle(scene).getPropertyValue("--x-head-size")) || 104, W * 0.085);
    const title = document.createElement("div");
    title.setAttribute("dir", ctx.rtl ? "rtl" : "ltr");
    title.style.cssText = `position:absolute;left:${f.m}px;right:${f.m}px;top:0;bottom:0;display:flex;align-items:center;justify-content:center;text-align:center;font:var(--x-head-weight) ${fs.toFixed(1)}px/var(--x-head-line) var(--x-head-font);letter-spacing:${ctx.rtl ? "0" : "var(--x-head-track)"};text-transform:var(--x-head-case);color:${lastC.ink};text-wrap:balance`;
    const line = document.createElement("div"); line.textContent = text; title.append(line); // a block inside the flex box keeps the spaces between split words
    lastC.d.append(title);
    const words = ML.split(line, "words");
    circles.forEach((c, i) => i < n - 1 && i % 2 === 0 && ctx.sfx(c.t0 + c.dur * 0.35, "pop", 0.3));
    ctx.sfx(lastC.t0 + lastC.dur * 0.3, "pop.soft", 0.35);
    const done = lastC.t0 + lastC.dur;
    // the title is already inside the window as it opens: it rises while the circle's edge sweeps past it
    const ta = lastC.t0 + lastC.dur * 0.42;
    return {
      draw(t) {
        layer.style.visibility = t < at ? "hidden" : "visible";
        for (const c of circles) {
          const r = c.r1 * expoIO(ML.lin(t, c.t0, c.t0 + c.dur));
          // once the last one covers the frame, the ones beneath are spent
          c.d.style.visibility = !c.last && t >= done ? "hidden" : "visible";
          c.d.style.clipPath = c.last && t >= done ? "none" : `circle(${r.toFixed(2)}px at ${c.cx.toFixed(1)}px ${c.cy.toFixed(1)}px)`;
        }
        words.forEach((w, i) => { const v = ML.land(t, ta + i * 0.05, ta + 0.4 + i * 0.05); w.style.opacity = v.toFixed(4); w.style.translate = `0 ${((1 - v) * 28).toFixed(2)}px`; });
      },
    };
  },
});
