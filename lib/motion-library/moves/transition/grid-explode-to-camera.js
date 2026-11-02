// Grid explodes to camera: the thumbs of a grid (the target's children — or, for a single picture / card / screen, the
// target cut into a grid of tiles) lift out one by one and fly toward the viewer: each tile travels z 0 -> 900 px under
// a 1200 px perspective (computed by hand and drawn as a 2D scale, so text stays sharp and a picture is never enlarged
// past its own pixels — a tile is cut as it passes the camera), pushed outward from the grid's centre 100-400 px,
// turning +-8deg, non-picture tiles blurring with depth (pictures never blur). 0.8 s power2.in, stagger 0.03 s from the
// top rows (or seeded 0-0.2 s); the device (the grid's frame) fades to 30 % and away. Away: the tiles fall back into
// depth; scatter: a flat radial burst. Ring: every tile pushed the same distance along its angle around the centre.
// Text outside the target stays put. On a scene target the scene's picture area is cut.
// Source: prompt-motion l3d1c-claude-opus-5-5-made + sudo-kiran-i-have-asked-opus (reference only: our own rebuild).
ML.define({
  id: "transition.grid-explode-to-camera",
  category: "transition",
  name: "Grid explodes to camera",
  does: "The photos lift out of a grid one by one and fly toward the viewer with depth blur, emptying the device.",
  says: ["transition", "energy", "scale"],
  energy: 4,
  targets: ["image", "list", "screen", "card", "scene"],
  duration: [0.8, 1.4],
  params: {
    direction: { type: "choice", options: ["to-camera", "away", "scatter"], default: "to-camera" },
    order: { type: "choice", options: ["rows", "random"], default: "rows" },
    layout: { type: "choice", options: ["grid", "ring"], default: "grid" },
  },
  pairs: ["transition.flash-cut", "camera.push-in"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.heavy",
  source: { from: "prompt-motion:sudo-kiran-i-have-asked-opus", license: "reference", note: "with prompt-motion l3d1c-claude-opus-5-5-made; our own rebuild" },
  setup(ctx) {
    const { p, at, stage, f, el } = ctx;
    const scene = ctx.scene || null;
    const k = Math.min(f.W, f.H) / 1080;
    const src = el && el !== stage ? el : (scene && (scene.querySelector(".ml-pic > *") || scene.querySelector(".ml-pic"))) || scene;
    if (!src) return null;
    const sb = ctx.box(src);
    const kids = [...src.children].filter((c) => c.offsetWidth > 4 && c.offsetHeight > 4);
    const isPic = (e) => e.tagName === "IMG" || e.tagName === "VIDEO" || e.tagName === "CANVAS" || !!(e.querySelector && e.querySelector("img, video, canvas"));
    const picCap = (e) => {
      const im = e.tagName === "IMG" ? e : e.querySelector && e.querySelector("img");
      if (!im || !im.naturalWidth) return 4;
      const b = ctx.box(im);
      return ML.clamp(im.naturalWidth / Math.max(1, b.w), 1, 4);
    };
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:7;display:none";
    const tiles = [], hide = [];
    const grid = kids.length >= 2 && src.tagName !== "IMG" && src.tagName !== "svg";
    if (grid) {
      // a real grid: each thumb cloned at its place
      for (const c of kids) {
        const b = ctx.box(c), w = document.createElement("div");
        w.style.cssText = `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px`;
        const cl = c.cloneNode(true);
        cl.removeAttribute("data-slot"); cl.removeAttribute("data-slot-sample");
        cl.style.margin = "0"; cl.style.width = b.w + "px"; cl.style.height = b.h + "px"; cl.style.boxSizing = "border-box";
        w.append(cl); layer.append(w);
        tiles.push({ w, b, pic: isPic(c), cap: isPic(c) ? picCap(c) : 4 });
        hide.push(c);
      }
    } else {
      // one picture / card / screen: cut into tiles, each showing its own part of a clone
      const aspect = sb.w / Math.max(1, sb.h), cols = ML.clamp(Math.round(Math.sqrt(12 * aspect)), 2, 6), rows = ML.clamp(Math.round(12 / cols), 2, 6);
      const pic = isPic(src), cap = pic ? picCap(src) : 4;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const b = { x: sb.x + (c * sb.w) / cols, y: sb.y + (r * sb.h) / rows, w: sb.w / cols, h: sb.h / rows };
        const w = document.createElement("div");
        w.style.cssText = `position:absolute;left:${b.x.toFixed(2)}px;top:${b.y.toFixed(2)}px;width:${(b.w + 0.5).toFixed(2)}px;height:${(b.h + 0.5).toFixed(2)}px;overflow:hidden`;
        const cl = src.cloneNode(true);
        cl.removeAttribute("data-slot"); cl.removeAttribute("data-slot-sample");
        cl.style.position = "absolute"; cl.style.margin = "0"; cl.style.left = `${(-(c * sb.w) / cols).toFixed(2)}px`; cl.style.top = `${(-(r * sb.h) / rows).toFixed(2)}px`;
        cl.style.width = sb.w + "px"; cl.style.height = sb.h + "px"; cl.style.maxWidth = "none"; cl.style.boxSizing = "border-box";
        w.append(cl); layer.append(w);
        tiles.push({ w, b, pic, cap, row: r });
      }
      hide.push(src);
    }
    stage.append(layer);
    // grid centre, push directions, start times
    const G = { x: sb.x + sb.w / 2, y: sb.y + sb.h / 2 };
    const order = tiles.map((q, i) => i).sort((a, b) => tiles[a].b.y - tiles[b].b.y || (ctx.rtl ? tiles[b].b.x - tiles[a].b.x : tiles[a].b.x - tiles[b].b.x));
    order.forEach((ti, rank) => {
      const q = tiles[ti], i = ti;
      q.c = { x: q.b.x + q.b.w / 2, y: q.b.y + q.b.h / 2 };
      const dx = q.c.x - G.x, dy = q.c.y - G.y, dist = Math.hypot(dx, dy) || 1;
      const ang = p.layout === "ring" ? (rank / tiles.length) * Math.PI * 2 - Math.PI / 2 : Math.atan2(dy || (ML.rnd(i, 51) - 0.5), dx || (ML.rnd(i, 52) - 0.5));
      const mag = p.layout === "ring" ? 260 * k : (100 + 300 * ML.clamp(dist / (Math.hypot(sb.w, sb.h) / 2))) * k;
      q.push = { x: Math.cos(ang) * mag, y: Math.sin(ang) * mag };
      q.rot = (ML.rnd(i, 53) - 0.5) * 16;
      q.t0 = at + (p.order === "random" ? ML.rnd(i, 54) * 0.2 : rank * 0.03);
    });
    const last = Math.max(...tiles.map((q) => q.t0)) + 0.8;
    const P = 1200, p2in = (x) => x * x * x;
    ctx.sfx(at, "whoosh.heavy", 0.5);
    return {
      draw(t) {
        const on = t >= at && t < last;
        layer.style.display = on ? "block" : "none";
        for (const e of hide) e.style.visibility = t >= at ? "hidden" : "";
        if (grid) src.style.opacity = t >= at ? (0.3 * (1 - ML.ease(t, at + 0.3, last)) + 0.7 * (1 - ML.lin(t, at, at + 0.3))).toFixed(4) : "";
        if (!on) return;
        for (const q of tiles) {
          const u = p2in(ML.lin(t, q.t0, q.t0 + 0.8));
          let sc = 1, px = q.push.x * u, py = q.push.y * u, rot = q.rot * u, o = 1, blur = 0;
          if (p.direction === "away") {
            const z = -1500 * u; sc = P / (P - z); o = 1 - ML.lin(u, 0.6, 1); blur = 6 * k * u;
          } else if (p.direction === "scatter") {
            px *= 2.4; py *= 2.4; rot *= 2.2; o = 1 - ML.lin(u, 0.65, 1);
          } else {
            const z = 900 * u; sc = P / (P - z); blur = 10 * k * u;
            // cut as it passes the camera — and before a picture would be enlarged past its pixels
            const cut = Math.min(q.cap, 3.2);
            o = sc >= cut ? 0 : 1 - ML.lin(sc, cut * 0.82, cut);
          }
          sc = p.direction === "to-camera" ? Math.min(sc, q.cap) : sc;
          // projected about the grid centre: the further forward, the further out
          const cx = G.x + (q.c.x - G.x + px) * sc, cy = G.y + (q.c.y - G.y + py) * sc;
          q.w.style.transform = `translate(${(cx - q.c.x).toFixed(2)}px, ${(cy - q.c.y).toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
          q.w.style.opacity = (t < q.t0 ? 1 : o).toFixed(4);
          q.w.style.filter = !q.pic && blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
          q.w.style.zIndex = String(Math.round(u * 100));
        }
      },
    };
  },
});
