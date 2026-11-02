// Split door: the old scene is two physical doors over the new one. Its content leaves first (opacity 1 -> 0, y -24 px,
// 0.35 s), a 1 px seam draws from the centre down the middle (scaleY 0 -> 1, 0.25 s, accent / ink), then both halves
// slide apart (x 0 -> -50 % / +50 % of the frame each, 0.8 s power3.inOut) to reveal the contrasting scene already
// waiting underneath; the seam fades over 0.2 s once the gap passes 40 px. "frame": the doors part only partly and an
// inset band of the old ground stays, so the new scene sits inside a card (inset 2 % / at least 24 px) bordered by the
// old. "horizontal" splits across the middle instead (top / bottom halves). Each half is a full copy of the old scene
// clipped to its 50 %, so nothing re-lays out while it moves. The old scene is the one before this when the film has
// it; alone, a copy of this layout in the look's inverse.
// Source: MengTo/Skills agent-skills/web-design/editorial-portfolio-chapters/ARTICLE.md, "Split-Door Hero Handoff Into
// a Contrasting Room" (MIT): two absolutely positioned panels, one seam, content out, seam, doors part, seam out.
ML.define({
  id: "transition.split-door",
  category: "transition",
  name: "Split door",
  does: "The current content lifts away, a thin seam appears down the middle, and the two halves slide apart to reveal a contrasting scene underneath.",
  says: ["transition", "reveal", "change", "before-after"],
  energy: 4,
  targets: ["scene"],
  duration: [0.8, 1.4],
  params: {
    axis: { type: "choice", options: ["vertical", "horizontal"], default: "vertical" },
    part: { type: "choice", options: ["full", "frame"], default: "full" },
    seam: { type: "text", default: "accent" },
  },
  pairs: ["text-in.punchline", "transition.curtain-open"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.heavy",
  source: { from: "MengTo/Skills:agent-skills/web-design/editorial-portfolio-chapters/ARTICLE.md", license: "MIT", note: "Split-Door Hero Handoff" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const scene = ctx.scene || stage;
    const W = f.W, H = f.H, k = Math.min(W, H) / 1080;
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
      const x = String(s || "accent").trim();
      return /^(accent|accent-2|ink|ground|dim|panel|good|bad|device)$/.test(x) ? `var(--x-${x})` : x;
    };
    const vert = p.axis !== "horizontal";
    const frame = p.part === "frame";
    const inset = Math.max(24 * k, 0.02 * Math.min(W, H));

    const layer = document.createElement("div");
    layer.dataset.mlFx = "1";
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:6;overflow:hidden";
    // two doors: each a full copy of the old scene, clipped to its half
    const doors = [0, 1].map((i) => {
      const d = oldFrame(scene);
      d.style.clipPath = vert ? (i ? "inset(0 0 0 50%)" : "inset(0 50% 0 0)") : (i ? "inset(50% 0 0 0)" : "inset(0 0 50% 0)");
      // the door's inner edge: a hairline shadow so the halves read as physical panels while they part
      const edge = document.createElement("div");
      const sh = `color-mix(in srgb, var(--x-device) 35%, transparent)`;
      edge.style.cssText = vert
        ? `position:absolute;top:0;bottom:0;width:${(10 * k).toFixed(1)}px;${i ? `left:${W / 2}px;background:linear-gradient(90deg, ${sh}, transparent)` : `left:${W / 2 - 10 * k}px;background:linear-gradient(270deg, ${sh}, transparent)`}`
        : `position:absolute;left:0;right:0;height:${(10 * k).toFixed(1)}px;${i ? `top:${H / 2}px;background:linear-gradient(180deg, ${sh}, transparent)` : `top:${H / 2 - 10 * k}px;background:linear-gradient(0deg, ${sh}, transparent)`}`;
      d.append(edge);
      layer.append(d);
      return { d, edge, kids: [...d.children].filter((c) => c !== edge), sign: i ? 1 : -1 };
    });
    // frame: the bands of the old ground that stay around the card (top and bottom for vertical doors, sides otherwise)
    const bands = [];
    if (frame) {
      for (const i of [0, 1]) {
        const b = oldFrame(scene);
        b.textContent = "";
        b.style.clipPath = vert ? (i ? `inset(${H - inset}px 0 0 0)` : `inset(0 0 ${H - inset}px 0)`) : (i ? `inset(0 0 0 ${W - inset}px)` : `inset(0 ${W - inset}px 0 0)`);
        layer.append(b);
        bands.push(b);
      }
    }
    const seam = document.createElement("div");
    seam.style.cssText = vert
      ? `position:absolute;top:0;height:${H}px;left:${W / 2 - 0.5}px;width:1px;background:${tok(p.seam)};transform-origin:50% 50%`
      : `position:absolute;left:0;width:${W}px;top:${H / 2 - 0.5}px;height:1px;background:${tok(p.seam)};transform-origin:50% 50%`;
    layer.append(seam);
    scene.append(layer);

    // the beats: content out 0.35 s; seam 0.25 s from 0.25 s in; doors 0.8 s once the seam is drawn
    const cA = at, cB = at + 0.35, sA = at + 0.25, sB = sA + 0.25, dA = sB, dB = dA + 0.8;
    const half = (vert ? W : H) / 2;
    const travel = frame ? half - inset : half;
    const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2); // power3.inOut
    const p2 = (x) => 1 - (1 - x) * (1 - x);
    // the seam fades once the gap passes 40 px: find that moment once (the door ease is monotonic)
    let gapAt = dB;
    for (let i = 0; i <= 200; i++) { const t = dA + (i / 200) * (dB - dA); if (2 * travel * io(ML.lin(t, dA, dB)) > 40 * k) { gapAt = t; break; } }
    ctx.sfx(dA, "whoosh.heavy", 0.45);
    return {
      draw(t) {
        layer.style.visibility = !frame && t >= dB ? "hidden" : "visible";
        const c = p2(ML.lin(t, cA, cB));
        const u = io(ML.lin(t, dA, dB));
        for (const d of doors) {
          for (const x of d.kids) { x.style.opacity = c > 0 ? (1 - c).toFixed(4) : ""; x.style.translate = c > 0 ? `0 ${(-24 * k * c).toFixed(2)}px` : ""; }
          const m = d.sign * travel * u;
          d.d.style.translate = Math.abs(m) < 0.01 ? "" : vert ? `${m.toFixed(2)}px 0` : `0 ${m.toFixed(2)}px`;
          d.edge.style.opacity = ML.lin(t, sA, dA).toFixed(3);
        }
        // frame: the bands rise in as the doors part, so the card is bordered on every side
        for (const b of bands) b.style.opacity = u.toFixed(4);
        const s = ML.out(t, sA, sB) * (1 - ML.lin(t, gapAt, gapAt + 0.2));
        seam.style.transform = vert ? `scaleY(${ML.out(t, sA, sB).toFixed(4)})` : `scaleX(${ML.out(t, sA, sB).toFixed(4)})`;
        seam.style.opacity = s.toFixed(4);
      },
    };
  },
});
