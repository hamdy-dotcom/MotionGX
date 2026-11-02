// Progress bar fills: a pill track (the look's ink at 10 %, `thickness` px at 1080) whose accent fill grows from empty to
// full, linear, across the scene (start + 0.3 → end − 0.35, so the full bar is seen before it leaves) — scenes.js S.appvideo. `length: video` is the live engine's
// R.bg bar instead: one thin bar on the frame's top edge, scaleX 0 → 1 linear over the whole film. A move only draws
// while its scene is on, so the director places it on every scene: all of them share the one bar. The fill grows from
// the reading side (right in Arabic). A soft blip when it completes.
// Sources: MotionGX lib/studio-engine/assets/scenes.js S.appvideo and lib/live-engine/worker/vendor/recipes.js R.bg (own).
ML.define({
  id: "ui.progress-fill",
  category: "ui",
  name: "Progress bar fills",
  does: "A thin bar fills from empty to full across the scene.",
  says: ["time", "flow"],
  energy: 1,
  targets: ["shape"],
  duration: [1, 60],
  params: {
    length: { type: "choice", options: ["scene", "video"], default: "scene" },
    thickness: { type: "number", range: [4, 14], default: 12, unit: "px" },
    width: { type: "number", range: [0.4, 1], default: 0.8 },
  },
  pairs: ["ui.processing-overlay", "data.count-up"],
  avoid: ["energy", "urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "own:lib/studio-engine/assets/scenes.js", license: "own", note: "S.appvideo fill + live-engine recipes.js R.bg #bar" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent) => { const e = doc.createElement(tag); e.style.cssText = css; parent.append(e); return e; };
    const th = Math.max(2, p.thickness * k);
    const video = p.length === "video";
    let track, fill, t0, t1;
    if (video) {
      // the whole film: one bar on the stage's top edge, from 0 to the film's end
      track = ctx.stage.querySelector("[data-ml-film-bar]");
      if (track) fill = track.firstElementChild;
      else {
        track = mk("div", `position:absolute;left:0;right:0;top:0;height:${th.toFixed(1)}px;z-index:30;background:color-mix(in srgb, var(--x-ink) 10%, transparent);pointer-events:none;`, ctx.stage);
        track.dataset.mlFilmBar = "1";
        fill = mk("div", `position:absolute;inset:0;background:var(--x-accent);transform-origin:${rtl ? "100%" : "0"} 50%;transform:scaleX(0);`, track);
      }
      t0 = 0; t1 = typeof window.__duration === "number" ? window.__duration : end;
    } else {
      const own = !ctx.el || ctx.el === ctx.stage;
      const host = own ? ctx.scene || ctx.stage : ctx.el;
      if (own) {
        const R = f.pic, w = R.w * p.width;
        track = mk("div", `position:absolute;left:${(R.x + (R.w - w) / 2).toFixed(1)}px;top:${(R.y + R.h / 2 - th / 2).toFixed(1)}px;width:${w.toFixed(1)}px;height:${th.toFixed(1)}px;border-radius:999px;overflow:hidden;background:color-mix(in srgb, var(--x-ink) 10%, transparent);z-index:5;`, host);
      } else {
        if (getComputedStyle(host).position === "static") host.style.position = "relative";
        track = mk("div", `position:relative;width:${(p.width * 100).toFixed(1)}%;height:${th.toFixed(1)}px;margin:${(th * 1.5).toFixed(1)}px auto 0;border-radius:999px;overflow:hidden;background:color-mix(in srgb, var(--x-ink) 10%, transparent);`, host);
      }
      fill = mk("div", `position:absolute;top:0;bottom:0;${rtl ? "right" : "left"}:0;width:0;border-radius:999px;background:var(--x-accent);`, track);
      t0 = at + 0.15; t1 = Math.max(t0 + 0.5, end - 0.35);
      ctx.sfx(t1, "blip", 0.25);
    }
    return {
      draw(t) {
        const q = ML.lin(t, t0, t1);
        if (video) { fill.style.transform = `scaleX(${q.toFixed(5)})`; return; }
        const leave = ML.clamp((t - (end - 0.2)) / 0.18);
        track.style.opacity = (t < at ? 0 : ML.lin(t, at, at + 0.2) * (1 - leave)).toFixed(4);
        fill.style.width = (q * 100).toFixed(3) + "%";
      },
    };
  },
});
