// 3D swoop: the outgoing frame swings off on a tilted 3D path — rotateY 0 -> +30deg, rotateZ 0 -> -10deg, x 0 -> -60%,
// blur 0 -> 10 px over 0.3 s power2.in — while the next one swings in mirrored from the other side (rotateY -30 -> 0,
// rotateZ 10 -> 0, x 60% -> 0, blur 10 -> 0) over 0.38 s power3.out, overlapping the exit, under a ~1200 px perspective.
// Optionally the whole stage tilts a couple of degrees as the swap happens. Scene scope swings the scene's content out
// and a next frame (its ground + the next title) in; element scope (a word, a screen) swings the element out and back
// in from the other side carrying the next text. Direction mirrors in RTL.
// Source: prompt-motion ultimaxbt-2ddf1e (reference only: our own rebuild).
ML.define({
  id: "transition.3d-swoop",
  category: "transition",
  name: "3D swoop",
  does: "Elements swing in and out of the frame on a tilted 3D path with heavy blur, linking shots in one continuous move.",
  says: ["speed", "transition", "flow"],
  energy: 4,
  targets: ["scene", "screen", "word"],
  duration: [0.5, 0.9],
  params: {
    direction: { type: "choice", options: ["left", "right"], default: "left" },
    tilt: { type: "number", range: [0, 15], default: 10, unit: "deg" },
    blur: { type: "number", range: [4, 16], default: 10, unit: "px" },
    swing: { type: "number", range: [15, 45], default: 30, unit: "deg" },
    stage_tilt: { type: "bool", default: false },
    next_ground: { type: "choice", options: ["ground", "panel", "panel-2", "accent", "ink"], default: "ground" },
    next: { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "camera.push-in"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:ultimaxbt-2ddf1e", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const scene = ctx.scene || stage;
    const W = scene.offsetWidth || f.W, H = scene.offsetHeight || f.H, k = Math.min(W, H) / 1080;
    // which way the outgoing leaves: "left" in reading order, mirrored for RTL
    const dir = (p.direction === "right" ? 1 : -1) * (ctx.rtl ? -1 : 1);
    const swing = ML.clamp(p.swing, 15, 45), tilt = ML.clamp(p.tilt, 0, 15), blur = ML.clamp(p.blur, 4, 16);
    const p2in = (x) => x * x * x, p3out = (x) => 1 - Math.pow(1 - x, 4);
    const OUT = 0.3, IN0 = 0.2, IN = 0.38;
    ctx.sfx(at + 0.12, "whoosh.soft", 0.5);
    const pose = (el, x, ry, rz, b, o) => {
      el.style.transform = x || ry || rz ? `translateX(${x.toFixed(3)}%) rotateY(${ry.toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg)` : "none";
      el.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : "none";
      el.style.opacity = o.toFixed(4);
    };
    const el = ctx.el && ctx.el !== stage && ctx.el !== scene ? ctx.el : null;
    if (el) {
      // element scope: out one side, back in from the other carrying the next text
      const parent = el.parentElement;
      if (parent) parent.style.perspective = `${(1200 * k).toFixed(0)}px`;
      const orig = el.innerHTML, next = (p.next || "").trim();
      el.style.transformOrigin = "50% 50%";
      return {
        draw(t) {
          const u = p2in(ML.lin(t, at, at + OUT)), v = p3out(ML.lin(t, at + IN0, at + IN0 + IN));
          if (t < at + IN0) {
            if (next && el.innerHTML !== orig) el.innerHTML = orig;
            pose(el, dir * 60 * u, -dir * swing * u, dir * tilt * u, blur * u, 1 - u * u);
          } else {
            if (next && el.textContent !== next) el.textContent = next;
            if (!next && el.innerHTML !== orig) el.innerHTML = orig;
            pose(el, -dir * 60 * (1 - v), dir * swing * (1 - v), -dir * tilt * (1 - v), blur * (1 - v), Math.min(1, v * 2));
          }
        },
      };
    }
    // scene scope: wrap the scene's content (the outgoing frame), build the next frame
    const wrap = document.createElement("div");
    wrap.style.cssText = "position:absolute;inset:0;transform-origin:50% 50%";
    [...scene.children].forEach((c) => wrap.append(c));
    scene.append(wrap);
    scene.style.perspective = `${(1200 * k).toFixed(0)}px`;
    const inc = document.createElement("div");
    inc.style.cssText = "position:absolute;inset:0;transform-origin:50% 50%;pointer-events:none;z-index:6;opacity:0";
    const g = p.next_ground;
    const ground = `var(--x-${g})`;
    const ink = g === "accent" ? "var(--x-accent-ink)" : g === "ink" ? "var(--x-ground)" : "var(--x-ink)";
    const plate = document.createElement("div");
    plate.style.cssText = `position:absolute;inset:0;background:${ground};border-radius:${(28 * k).toFixed(1)}px;box-shadow:var(--x-shadow)`;
    inc.append(plate);
    const head = scene.querySelector(".ml-title");
    const sub = scene.querySelector(".ml-sub");
    const text = (p.next || "").trim() || (sub ? sub.textContent.trim() : head ? head.textContent.trim() : "");
    const title = document.createElement("div");
    const fs = Math.min(parseFloat(getComputedStyle(scene).getPropertyValue("--x-head-size")) || 104, W * 0.09);
    title.style.cssText = `position:absolute;left:${f.m}px;right:${f.m}px;top:0;bottom:0;display:flex;align-items:center;justify-content:center;text-align:center;font:var(--x-head-weight) ${fs.toFixed(1)}px/var(--x-head-line) var(--x-head-font);letter-spacing:var(--x-head-track);color:${ink};text-wrap:balance`;
    title.setAttribute("dir", ctx.rtl ? "rtl" : "ltr");
    title.textContent = text;
    inc.append(title);
    scene.append(inc);
    return {
      draw(t) {
        const u = p2in(ML.lin(t, at, at + OUT)), v = p3out(ML.lin(t, at + IN0, at + IN0 + IN));
        wrap.style.visibility = u >= 1 ? "hidden" : "visible";
        pose(wrap, dir * 60 * u, -dir * swing * u, dir * tilt * u, blur * u, 1 - u * u);
        inc.style.visibility = t < at + IN0 ? "hidden" : "visible";
        pose(inc, -dir * 60 * (1 - v), dir * swing * (1 - v), -dir * tilt * (1 - v), blur * (1 - v), t < at + IN0 ? 0 : Math.min(1, v * 2.5));
        // the whole stage leans a little through the swap and settles
        const lean = p.stage_tilt ? Math.sin(Math.PI * ML.lin(t, at, at + IN0 + IN)) * -dir * Math.min(3, tilt * 0.25) : 0;
        scene.style.rotate = Math.abs(lean) > 0.001 ? `${lean.toFixed(3)}deg` : "none";
      },
    };
  },
});
