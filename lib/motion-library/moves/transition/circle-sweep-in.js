// Circle sweep in: a giant circle of the next ground (radius ~0.4-0.6 x the frame's width) starts off-frame (x +1.1 W
// on the right, or the left / bottom / bottom-left, or rising from the middle) and travels to the centre while growing
// 1 -> 2.5 (at least enough to cover) over 0.6 s expo.inOut; or, rolling, it enters over 0.35 s power3.in turning (its
// texture shows the roll) and then grows to cover over 0.3 s. Edge soft (a radial-gradient soft stop) or hard. The
// circle is drawn at its real size every frame (never a scaled bitmap), so its edge stays crisp. The previous scene's
// type does not move; the next title starts once the frame is covered. Left / right mirror in RTL.
// Source: prompt-motion motiondsgnr-yo-opus-5-5-raw + jesscaroline7-motion-reel-do-inspirada (reference only: our own rebuild).
ML.define({
  id: "transition.circle-sweep-in",
  category: "transition",
  name: "Circle sweep in",
  does: "A giant circle of the next colour travels in from off-frame (rolling, or with a soft blurry rim) and grows until it swallows the frame.",
  says: ["transition", "change", "energy", "playful"],
  energy: 3,
  targets: ["scene"],
  duration: [0.5, 0.9],
  params: {
    from: { type: "choice", options: ["left", "right", "bottom", "bottom-left", "center"], default: "right" },
    edge: { type: "choice", options: ["soft", "hard"], default: "soft" },
    roll: { type: "bool", default: false },
    colour: { type: "text", default: "next ground" },
    size: { type: "number", range: [0.4, 0.6], default: 0.5 },
    next: { type: "text", default: "" },
  },
  pairs: ["transition.colour-field-cut", "text-in.punchline"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:motiondsgnr-yo-opus-5-5-raw", license: "reference", note: "our own rebuild; with jesscaroline7-motion-reel-do-inspirada" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const scene = ctx.scene || stage;
    const W = scene.offsetWidth || f.W, H = scene.offsetHeight || f.H, k = Math.min(W, H) / 1080;
    const c = String(p.colour || "").trim().replace(/^--x-/, "").toLowerCase();
    const COL = { accent: ["var(--x-accent)", "var(--x-accent-ink)"], "accent-2": ["var(--x-accent-2)", "var(--x-ink)"], ink: ["var(--x-ink)", "var(--x-ground)"], panel: ["var(--x-panel)", "var(--x-ink)"], "panel-2": ["var(--x-panel-2)", "var(--x-ink)"], device: ["var(--x-device)", "var(--x-ground)"], good: ["var(--x-good)", "var(--x-accent-ink)"] };
    // "next ground": the next scene's ground (data-next-ground on the scene), else the accent
    const [col, onCol] = COL[c] || COL[scene.dataset.nextGround] || COL.accent;
    let from = p.from;
    if (ctx.rtl) from = from === "left" ? "right" : from === "right" ? "left" : from === "bottom-left" ? "bottom-right" : from;
    const r = W * ML.clamp(p.size, 0.4, 0.6);
    const cover = (Math.hypot(W, H) / 2) * 1.04 / r;
    const sEnd = Math.max(2.5, cover);
    const start = { right: [W * 1.1 + r, H / 2], left: [-W * 0.1 - r, H / 2], bottom: [W / 2, H + r * 1.05], "bottom-left": [-r * 0.6, H + r * 0.6], "bottom-right": [W + r * 0.6, H + r * 0.6], center: [W / 2, H + r * 1.05] }[from] || [W * 1.1 + r, H / 2];
    const expoIO = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2);
    const p3in = (x) => x * x * x * x, p3out = (x) => 1 - Math.pow(1 - x, 4);
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:6;overflow:hidden";
    scene.append(layer);
    const disc = document.createElement("div");
    const soft = p.edge === "soft";
    disc.style.cssText = `position:absolute;left:0;top:0;border-radius:50%;background:${soft ? `radial-gradient(circle closest-side, ${col} 90%, transparent 100%)` : col};overflow:hidden`;
    layer.append(disc);
    // the roll's texture: a few marks on the disc that turn with it
    const marks = document.createElement("div");
    marks.style.cssText = "position:absolute;inset:0;border-radius:50%";
    if (p.roll) {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2, rr = 0.3 + 0.12 * ML.rnd(i, 7), s = 0.035 + 0.02 * ML.rnd(i, 2);
        const m = document.createElement("div");
        m.style.cssText = `position:absolute;left:${(50 + Math.cos(a) * rr * 100 - s * 100).toFixed(2)}%;top:${(50 + Math.sin(a) * rr * 100 - s * 100).toFixed(2)}%;width:${(s * 200).toFixed(2)}%;height:${(s * 200).toFixed(2)}%;border-radius:50%;background:color-mix(in srgb, ${onCol} 26%, transparent)`;
        marks.append(m);
      }
      const band = document.createElement("div");
      band.style.cssText = `position:absolute;left:8%;right:8%;top:47%;height:6%;border-radius:999px;background:color-mix(in srgb, ${onCol} 18%, transparent)`;
      marks.append(band);
      disc.append(marks);
    }
    const plate = document.createElement("div");
    plate.style.cssText = `position:absolute;inset:0;background:${col};visibility:hidden`;
    layer.append(plate);
    let words = [];
    const text = (p.next || "").trim();
    if (text) {
      const fs = Math.min(parseFloat(getComputedStyle(scene).getPropertyValue("--x-head-size")) || 104, W * 0.085);
      const title = document.createElement("div");
      title.setAttribute("dir", ctx.rtl ? "rtl" : "ltr");
      title.style.cssText = `position:absolute;left:${f.m}px;right:${f.m}px;top:0;bottom:0;display:flex;align-items:center;justify-content:center;text-align:center;font:var(--x-head-weight) ${fs.toFixed(1)}px/var(--x-head-line) var(--x-head-font);letter-spacing:var(--x-head-track);color:${onCol};text-wrap:balance`;
      const line = document.createElement("div"); line.textContent = text; title.append(line); plate.append(title); words = ML.split(line, "words"); // a block inside the flex box keeps the spaces between split words
    }
    const TRAVEL = p.roll ? 0.35 : 0.6, GROW = p.roll ? 0.3 : 0, done = at + TRAVEL + GROW;
    ctx.sfx(at + 0.1, "whoosh.soft", 0.45);
    return {
      draw(t) {
        layer.style.visibility = t < at ? "hidden" : "visible";
        let x, y, s, rot = 0;
        if (p.roll) {
          const u = p3in(ML.lin(t, at, at + TRAVEL)), g = p3out(ML.lin(t, at + TRAVEL, done));
          x = start[0] + (W / 2 - start[0]) * u; y = start[1] + (H / 2 - start[1]) * u;
          s = 1 + (sEnd - 1) * g;
          rot = (-(Math.hypot(W / 2 - start[0], H / 2 - start[1]) * u) / r) * (180 / Math.PI) * (start[0] > W / 2 ? 1 : -1);
        } else {
          const u = expoIO(ML.lin(t, at, done));
          x = start[0] + (W / 2 - start[0]) * u; y = start[1] + (H / 2 - start[1]) * u; s = 1 + (sEnd - 1) * u;
        }
        const R = r * s;
        disc.style.width = disc.style.height = `${(2 * R).toFixed(2)}px`;
        disc.style.transform = `translate(${(x - R).toFixed(2)}px, ${(y - R).toFixed(2)}px)`;
        marks.style.rotate = `${rot.toFixed(2)}deg`;
        marks.style.opacity = (1 - ML.lin(t, at + TRAVEL, done)).toFixed(4);
        const covered = t >= done;
        plate.style.visibility = covered ? "visible" : "hidden";
        disc.style.visibility = covered ? "hidden" : "visible";
        words.forEach((w, i) => { const v = ML.land(t, done + 0.05 + i * 0.06, done + 0.4 + i * 0.06); w.style.opacity = v.toFixed(4); w.style.translate = `0 ${((1 - v) * 28 * k).toFixed(2)}px`; });
      },
    };
  },
});
