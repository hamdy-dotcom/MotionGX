// Smoke veil skip: the fast-skip of a horizontal chapter film. To jump several chapters at once, dark smoke rolls over
// the frame — a radial veil (90 % 70 % at the centre, a lifted tone of the smoke colour to the colour itself at 70 %)
// with a slow seeded turbulence texture drifting through it — its opacity a smoothstep 0 -> 1 over `cover` (0.38 s,
// 0.25-0.5). Under the veil the film cuts to the station just before the target (the chapters passed through are never
// shown, so their words never flash), then plays only the final move into the target over `final_move` (2.6 s,
// 1.5-2.6) on 1 - (1 - x)^2.4 while the veil lifts over that move's first 24 % (1 - smoothstep(0, 0.24, k)). The
// target lands already assembled. The final move is the source's wipe between stations: a line sweeps across toward the
// reading end (mirrored in Arabic), L = -0.08 + 1.24 * rc so it starts at the frame's edge at once; the station before
// the target is frozen on the far side of the line, the target is live on the near side, and the target's parts arrive
// on their own slices of the move (0, .12, .40, .60, each a 0.30 ramp: opacity and a 24 px rise), so it is assembled
// before the move ends.
// colour: a CSS colour or a look token (device, ink, accent…); the default is the look's device dark.
// Source: MengTo/Skills agent-skills/web-design/horizontal-scroll-scenes/SKILL.md, rule 9 "Fast-skip plays only the
// last move" (MIT): 380 ms smoke in, scroll to the station before the target, 2,600 ms final move on 1-(1-x)^2.4 with
// the veil lifting over its first 24 %.
ML.define({
  id: "transition.smoke-veil-skip",
  category: "transition",
  name: "Smoke veil skip",
  does: "To jump several chapters at once, dark smoke rolls over the frame, and as it lifts the final move into the target chapter plays.",
  says: ["transition", "speed", "change"],
  energy: 3,
  targets: ["scene"],
  duration: [1.8, 3.2],
  params: {
    colour: { type: "text", default: "device" },
    cover: { type: "number", range: [0.25, 0.5], default: 0.38, unit: "s" },
    final_move: { type: "number", range: [1.5, 2.6], default: 2.6, unit: "s" },
  },
  pairs: ["transition.panel-track", "camera.push-in"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.heavy",
  source: { from: "MengTo/Skills:agent-skills/web-design/horizontal-scroll-scenes/SKILL.md", license: "MIT", note: "rule 9, fast-skip" },
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
    const tok = (s) => {
      const x = String(s || "device").trim();
      return /^(device|ink|accent|accent-2|ground|panel|dim)$/.test(x) ? `var(--x-${x})` : x;
    };
    const C = tok(p.colour);
    const coverD = ML.clamp(+p.cover || 0.38, 0.25, 0.5), moveD = ML.clamp(+p.final_move || 2.6, 1.5, 2.6);
    const dir = ctx.rtl ? -1 : 1; // the track runs toward the reading end: content travels −dir

    // the chapter you leave (shown until the veil is thick), the station before the target (its ground only, so its
    // words never flash), and the target (this scene's own blocks, live)
    const A = oldFrame(scene);
    const pre = oldFrame(scene);
    pre.textContent = ""; // the stations passed through show their ground only: no word of theirs may flash
    const B = document.createElement("div"); // not an fx layer: the next scene's old frame must find these blocks
    B.style.cssText = "position:absolute;inset:0";
    for (const c of [...scene.children]) if (!c.dataset.mlFx) B.append(c);
    // the target's parts, in reading order: the headline band's lines first, then the other blocks
    const parts = [];
    for (const c of B.children) { if (c.classList.contains("ml-head")) parts.push(...c.children); else parts.push(c); }
    const slices = [0, 0.12, 0.4, 0.6];
    // the line between them
    const line = document.createElement("div");
    line.dataset.mlFx = "1";
    const lw = Math.max(2, Math.min(W, H) * 0.004);
    line.style.cssText = `position:absolute;top:0;height:${H}px;left:${(-lw / 2).toFixed(1)}px;width:${lw.toFixed(1)}px;z-index:8;pointer-events:none;background:var(--x-accent);box-shadow:0 0 ${(lw * 6).toFixed(1)}px var(--x-accent-2), 0 0 ${(lw * 16).toFixed(1)}px color-mix(in srgb, var(--x-accent-2) 50%, transparent)`;
    scene.append(B, pre, line, A);

    // the veil: radial dark smoke + a seeded turbulence texture that drifts upward (rolls) with t
    const veil = document.createElement("div");
    veil.dataset.mlFx = "1";
    veil.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:9;overflow:hidden;background:radial-gradient(90% 70% at 50% 50%, color-mix(in srgb, ${C} 86%, var(--x-panel)), ${C} 70%)`;
    const NS = "http://www.w3.org/2000/svg";
    const id = "ml-smoke-" + Math.floor(ML.rnd(at * 31 + W, 5) * 1e9).toString(36);
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", String(W)); svg.setAttribute("height", String(H * 1.6));
    svg.style.cssText = "position:absolute;left:0;top:0;mix-blend-mode:screen;opacity:0.55";
    svg.innerHTML = `<defs><filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${(2.2 / Math.min(W, H)).toFixed(5)}" numOctaves="4" seed="7"/>` +
      `<feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.4 -0.55"/></filter></defs>` +
      `<rect width="100%" height="100%" filter="url(#${id})" style="color:var(--x-panel)"/>`;
    // tint the white smoke toward the look's panel tone through a colour layer above it
    const tint = document.createElement("div");
    tint.style.cssText = `position:absolute;inset:0;background:${C};mix-blend-mode:multiply;opacity:0.6`;
    veil.append(svg, tint);
    scene.append(veil);

    const cA = at, cB = at + coverD, mA = cB, mB = mA + moveD;
    const smooth = (a, b, x) => { const u = ML.clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
    const fin = (x) => 1 - Math.pow(1 - x, 2.4);
    ctx.sfx(cA, "whoosh.heavy", 0.45);
    ctx.sfx(mA + moveD * 0.2, "whoosh.soft", 0.25);
    return {
      draw(t) {
        const k = ML.lin(t, mA, mB);
        const cover = smooth(0, 1, ML.lin(t, cA, cB));
        const o = t < mA ? cover : 1 - smooth(0, 0.24, k);
        veil.style.opacity = o.toFixed(4);
        veil.style.visibility = o > 0.001 ? "visible" : "hidden";
        // the smoke rolls: the texture drifts up a little through the whole skip
        svg.style.translate = `0 ${(-H * 0.5 * ML.lin(t, cA, mB)).toFixed(1)}px`;
        // the chapter you leave stays until the veil is thick; then the final move from the station before the target
        A.style.visibility = t < mA ? "visible" : "hidden";
        const e = fin(k), rc = ML.clamp((e - 0.01) / 0.97), L = -0.08 + 1.24 * rc; // the line's place, 0-1 across
        const xL = (dir > 0 ? L : 1 - L) * W;
        // target live on the swept side, the pre-target station frozen ahead of the line
        const pct = (ML.clamp(dir > 0 ? L : 1 - L) * 100).toFixed(3);
        pre.style.visibility = t >= mA && L < 1 ? "visible" : "hidden";
        pre.style.clipPath = dir > 0 ? `inset(0 0 0 ${pct}%)` : `inset(0 ${(100 - pct).toFixed(3)}% 0 0)`;
        B.style.visibility = t >= mA ? "visible" : "hidden";
        B.style.clipPath = L >= 1 ? "" : dir > 0 ? `inset(0 ${(100 - pct).toFixed(3)}% 0 0)` : `inset(0 0 0 ${pct}%)`;
        line.style.visibility = t >= mA && L > -0.01 && L < 1.01 ? "visible" : "hidden";
        line.style.translate = `${xL.toFixed(2)}px 0`;
        // the target's parts arrive on their slices of the move, done well before it ends
        parts.forEach((el, i) => {
          const s0 = slices[Math.min(i, slices.length - 1)] + Math.max(0, i - slices.length + 1) * 0.06;
          const u = t < mA ? 0 : ML.out(e, s0, s0 + 0.3);
          el.style.opacity = u >= 1 ? "" : u.toFixed(4);
          el.style.translate = u >= 1 ? "" : `0 ${((1 - u) * 24 * Math.min(W, H) / 1080).toFixed(2)}px`;
        });
      },
    };
  },
});
