// World-canvas camera: every scene lives on one big canvas side by side and the camera travels and zooms between
// them, so the film reads as one continuous space. Ported from product-film's kit camera.ts: a world layer
// (transform-origin 0 0) under transform translate(W/2, H/2) scale(zoom) translate(−x, −y), where camera keys
// [t, x, y, zoom] are world points at the frame's centre; x and y each follow track(t, keys, spring) = the first value
// + Σ delta·step(t − key.t), and zoom tracks log(zoom), exp'd, so a push reads the same at any scale (ML.camera /
// ML.worldTransform). The camera spring is stiffness 120, damping 30, mass 1.2 (10 rad/s, ζ 1.25, overdamped: 52% at
// 0.2 s, 89% at 0.5 s, 98% at 0.8 s): slow, heavy, no overshoot — held, not thrown; glide is lighter. The world layer
// never gets will-change (text would blur). The neighbours are the film's own scenes (the one before and after this
// one, copied without their slots) or, alone, quiet tiles in the look; a dotted world grid shows the travel.
//   pan: from the previous scene to this one · push: from a wide view of the world into this scene · pull: from this
//   scene out to the world · diagonal: from the scene up-and-before this one. RTL: "before" lies to the right.
// Source: Rieranthony/product-film-skill, reference/engine.md (camera.ts) + reference/ingredients.md (Camera moves) (MIT).
ML.define({
  id: "camera.world-canvas-camera",
  category: "camera",
  name: "Camera glides across one big world canvas",
  does: "All scenes live side by side on one large canvas and the camera travels and zooms from one to the next, so the film feels like one continuous space.",
  says: ["flow", "connection", "story", "transition"],
  energy: 3,
  targets: ["stage", "scene"],
  duration: [1, 60],
  params: {
    move: { type: "choice", options: ["pan", "push", "pull", "diagonal"], default: "pan" },
    spring: { type: "choice", options: ["camera", "glide"], default: "camera" },
    gap: { type: "number", range: [0.04, 0.3], default: 0.12, unit: "frame" },
    travel_at: { type: "choice", options: ["start", "end"], default: "start" },
  },
  pairs: ["camera.spring-retarget", "text-in.punchline"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "product-film-skill:reference/engine.md (camera.ts)", license: "MIT", note: "world layer translate(W/2,H/2) scale(z) translate(−x,−y); keys on the camera spring; zoom in log space; ingredients.md Camera moves" },
  setup(ctx) {
    const { p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H;
    const G = Math.round(Math.min(W, H) * ML.clamp(p.gap, 0.04, 0.3));
    const sx = W + G, sy = H + G; // one tile's pitch on the world
    const before = ctx.rtl ? 1 : -1; // where the previous scene sits
    // the world: this scene's content at the origin tile, neighbours around it
    const world = document.createElement("div");
    world.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0`;
    const here = document.createElement("div");
    here.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;background:var(--x-ground);background-image:var(--x-ground-image);overflow:hidden;border-radius:calc(var(--x-radius) * 0.6)`;
    while (host.firstChild) here.append(host.firstChild);
    // the grid behind the tiles: the canvas between scenes
    const grid = document.createElement("div");
    const R = 4;
    grid.style.cssText = `position:absolute;left:${-R * sx}px;top:${-R * sy}px;width:${(2 * R + 1) * sx}px;height:${(2 * R + 1) * sy}px;background-image:radial-gradient(circle, color-mix(in srgb, var(--x-ink) 22%, transparent) ${Math.max(1.5, G * 0.02)}px, transparent ${Math.max(2, G * 0.025)}px);background-size:${G * 0.5}px ${G * 0.5}px`;
    world.append(grid);
    const sib = (dirn) => { let n = host[dirn]; while (n && !(n.classList && n.classList.contains("ml-scene"))) n = n[dirn]; return n; };
    const copyOf = (scene) => {
      const c = scene.cloneNode(true);
      c.removeAttribute("id");
      c.querySelectorAll("[data-slot], [id]").forEach((n) => { n.removeAttribute("data-slot"); n.removeAttribute("id"); });
      c.style.cssText = "position:absolute;inset:0;display:block;opacity:1";
      return c;
    };
    const tile = (gx, gy, scene, i) => {
      const d = document.createElement("div");
      d.style.cssText = `position:absolute;left:${gx * sx}px;top:${gy * sy}px;width:${W}px;height:${H}px;overflow:hidden;border-radius:calc(var(--x-radius) * 0.6);background:var(--x-ground);background-image:var(--x-ground-image);box-shadow:var(--x-shadow)`;
      if (scene) d.append(copyOf(scene));
      else {
        // a quiet stand-in scene: a title bar and a card, in the look
        const m = f.m, bar = document.createElement("div"), card = document.createElement("div");
        bar.style.cssText = `position:absolute;left:${m}px;top:${f.head.y + f.head.h * 0.3}px;width:${(0.4 + ML.rnd(i, 2) * 0.35) * f.head.w}px;height:${f.head.h * 0.22}px;border-radius:var(--x-radius-s);background:var(--x-ink);opacity:0.85`;
        card.className = "ml-panel";
        card.style.cssText = `position:absolute;left:${f.pic.x + f.pic.w * 0.1}px;top:${f.pic.y + f.pic.h * 0.1}px;width:${f.pic.w * 0.8}px;height:${f.pic.h * 0.8}px;background:${i % 2 ? "var(--x-panel)" : "color-mix(in srgb, var(--x-accent) 22%, var(--x-panel))"}`;
        d.append(bar, card);
      }
      world.append(d);
    };
    const prev = sib("previousElementSibling"), next = sib("nextElementSibling");
    tile(before, 0, prev, 1);
    tile(-before, 0, next, 2);
    tile(before, -1, null, 3);
    tile(0, -1, null, 4);
    tile(-before, 1, null, 5);
    tile(0, 1, null, 6);
    world.append(here);
    host.append(world);
    host.style.background = "var(--x-panel-2)";

    // the keys: [t, x, y, zoom], world points at the frame's centre
    const home = [W / 2, H / 2], wide = Math.min(W / (3 * sx), H / (3 * sy)) * 1.05;
    const t0 = p.travel_at === "end" ? Math.max(at, end - 1.1) : at;
    let keys;
    if (p.travel_at === "end") {
      // leaving: hold here, then travel onward to the next scene (or out to the world)
      const to = p.move === "pull" ? [home[0], home[1], wide] : p.move === "push" ? [home[0], home[1], 1.0] : p.move === "diagonal" ? [home[0] - before * sx, home[1] + sy, 1] : [home[0] - before * sx, home[1], 1];
      keys = [[0, home[0], home[1], 1], [t0, to[0], to[1], to[2]]];
      if (p.move === "push") keys = [[0, home[0], home[1], 1], [t0, home[0], home[1], 0.82]];
    } else {
      const from = p.move === "push" ? [home[0], home[1], wide] : p.move === "pull" ? [home[0], home[1], 1] : p.move === "diagonal" ? [home[0] + before * sx, home[1] - sy, 1] : [home[0] + before * sx, home[1], 1];
      const to = p.move === "pull" ? [home[0], home[1], wide] : [home[0], home[1], 1];
      keys = [[0, from[0], from[1], from[2]], [t0, to[0], to[1], to[2]]];
    }
    // a pan or diagonal between two scenes eases out a little in zoom on the way, so both are seen (log space)
    const dip = (p.move === "pan" || p.move === "diagonal") ? 0.8 : 1;
    const cfg = p.spring === "glide" ? ML.SPRING.glide : ML.SPRING.camera;
    ctx.sfx(Math.max(0, t0 - 0.05), "whoosh.soft", 0.3);
    return {
      draw(t) {
        const cam = ML.camera(t, keys, cfg);
        if (dip < 1) {
          // the dip: a zoom track out and back, both on the same spring, so it lives inside the travel
          const z = Math.exp(ML.track(t, [[0, 0], [t0, Math.log(dip)], [t0 + 0.32, 0]], cfg));
          cam.zoom *= z;
        }
        world.style.transform = ML.worldTransform({ x: +cam.x.toFixed(3), y: +cam.y.toFixed(3), zoom: +cam.zoom.toFixed(5) }, W, H);
      },
    };
  },
});
