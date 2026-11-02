// Grid with focus ring: a grid of similar pictures pops in (scale 0.9 -> 1, stagger 0.03 s, reading order), a
// hand-drawn ink ring draws around the chosen one (stroke-dashoffset, 0.4 s), the others fade while the chosen one
// travels to the centre and grows (0.5 s power3.inOut) inside a bigger ink circle. Pictures: the other pictures in
// the scene / the `images` param, else crops of the target picture (each a different window on it, never enlarged
// past its pixels). The growth is a real resize, not a scale, so the picture stays sharp; it stops at its own pixels.
// Ring: ink (a wobbly, slightly overshooting double loop in the look's ink) or clean (a true circle in the accent).
// Source: prompt-motion lexnlin-claude-opus-5-5-made (reference only: our own rebuild).
ML.define({
  id: "photo.grid-focus-ring",
  category: "photo",
  name: "Grid with focus ring",
  does: "A grid of similar images pops in, an ink circle sweeps around one, then that one alone fills the frame.",
  says: ["choice", "focus"],
  energy: 3,
  targets: ["image", "list"],
  duration: [1.5, 3.5],
  params: {
    grid: { type: "choice", options: ["2x2", "3x3", "4x4"], default: "3x3" },
    pick: { type: "number", range: [0, 15], default: 4 },
    ring: { type: "choice", options: ["ink", "clean"], default: "ink" },
    zoom_after: { type: "bool", default: true },
    gap: { type: "number", range: [4, 24], default: 12, unit: "px" },
    images: { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "text-emphasis.accent-word"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop",
  source: { from: "prompt-motion:lexnlin-claude-opus-5-5-made", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, f } = ctx;
    if (!el) return null;
    const host = ctx.scene || ctx.stage, k = Math.min(f.W, f.H) / 1080;
    const scope = ctx.scene || ctx.stage;
    const own = el.tagName === "IMG" ? el : el.querySelector("img");
    const listed = String(p.images || el.dataset.images || "").split(",").map((s) => s.trim()).filter(Boolean);
    const sceneImgs = [...scope.querySelectorAll("img")].map((x) => x.src);
    const srcs = listed.length ? listed : sceneImgs.length ? sceneImgs : [];
    if (!srcs.length && !own) return null;
    const n = +String(p.grid)[0] || 3, N = n * n;
    const pick = Math.round(ML.clamp(p.pick, 0, N - 1));
    // the region: the scene's picture area (the grid replaces it)
    const area = el.closest(".ml-pic") || el;
    const R = area === el ? ctx.box(el) : { x: f.pic.x, y: f.pic.y, w: f.pic.w, h: f.pic.h };
    const gap = p.gap * k;
    const cell = Math.min((R.w - gap * (n - 1)) / n, (R.h - gap * (n - 1)) / n);
    const gw = cell * n + gap * (n - 1), gx = R.x + (R.w - gw) / 2, gy = R.y + (R.h - gw) / 2;
    const mk = (tag, css, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (parent) parent.append(e); return e; };
    const layer = mk("div", "position:absolute;inset:0;pointer-events:none;visibility:hidden;z-index:3", host);
    const natW = own ? own.naturalWidth || 1200 : 1200, natH = own ? own.naturalHeight || 900 : 900;
    const cells = [];
    for (let i = 0; i < N; i++) {
      const r = Math.floor(i / n), c = i % n, cc = ctx.rtl ? n - 1 - c : c; // reading order: RTL fills from the right
      const x = gx + cc * (cell + gap), y = gy + r * (cell + gap);
      const box = mk("div", `position:absolute;left:${x}px;top:${y}px;width:${cell}px;height:${cell}px;border-radius:var(--x-pic-radius);overflow:hidden;background:var(--x-pic-ground);box-shadow:var(--x-shadow)`, layer);
      const im = mk("img", "position:absolute;max-width:none;filter:var(--x-pic-filter)", box);
      const src = srcs.length > 1 ? srcs[i % srcs.length] : own ? own.src : srcs[0];
      im.src = src;
      // a window on the picture: its own crop for each cell (a tighter crop only while it stays within the pixels)
      const z = srcs.length > 1 ? 1 : Math.max(1, Math.min(1.8, Math.min(natW, natH) / Math.max(1, cell * 1.0) * 0.6));
      const fx = srcs.length > 1 ? 0.5 : ML.rnd(i, 11), fy = srcs.length > 1 ? 0.5 : ML.rnd(i, 12);
      cells.push({ box, im, x, y, i, z, fx, fy });
    }
    // the picked cell lays out its image as it grows: object-fit cover inside the live size
    const layoutImg = (q, w, h) => {
      // cover the live box; the crop loosens as the box grows, so the picture is never drawn past its pixels
      const s0 = Math.max(w / natW, h / natH), s = s0 * Math.max(1, Math.min(q.z, 1 / s0));
      const fw = natW * s, fh = natH * s;
      q.im.style.width = fw.toFixed(2) + "px"; q.im.style.height = fh.toFixed(2) + "px";
      q.im.style.left = ((w - fw) * q.fx).toFixed(2) + "px"; q.im.style.top = ((h - fh) * q.fy).toFixed(2) + "px";
    };
    cells.forEach((q) => layoutImg(q, cell, cell));
    // the ring(s): SVG over the grid
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", f.W); svg.setAttribute("height", f.H);
    svg.style.cssText = "position:absolute;left:0;top:0;overflow:visible";
    layer.append(svg);
    const ink = p.ring === "ink";
    const loop = (cx, cy, rad, seed) => {
      if (!ink) return `M${cx + rad} ${cy} A${rad} ${rad} 0 1 1 ${cx - rad} ${cy} A${rad} ${rad} 0 1 1 ${cx + rad} ${cy}`;
      // a hand loop: 1.12 turns, radius wobbling with a seeded low-frequency sway, start and end not meeting
      const pts = [], turns = 1.12, steps = 64, a0 = -Math.PI * 0.62 + (ML.rnd(seed, 1) - 0.5) * 0.4, dirn = ctx.rtl ? -1 : 1;
      for (let s = 0; s <= steps; s++) {
        const u = s / steps, a = a0 + dirn * u * turns * Math.PI * 2;
        const wob = 1 + 0.05 * Math.sin(u * 7 + seed) + 0.035 * Math.sin(u * 13 + seed * 2) + 0.06 * (u - 0.5);
        pts.push([cx + Math.cos(a) * rad * wob * 1.06, cy + Math.sin(a) * rad * wob * 0.94]);
      }
      return "M" + pts.map((q) => q[0].toFixed(1) + " " + q[1].toFixed(1)).join(" L");
    };
    const mkPath = (d, w) => {
      const pa = document.createElementNS(NS, "path");
      pa.setAttribute("d", d); pa.setAttribute("fill", "none");
      pa.setAttribute("stroke-linecap", "round"); pa.setAttribute("stroke-linejoin", "round");
      pa.style.stroke = ink ? "var(--x-ink)" : "var(--x-accent)"; pa.style.strokeWidth = w + "px";
      svg.append(pa);
      const L = pa.getTotalLength();
      pa.style.strokeDasharray = `${L} ${L}`; pa.style.strokeDashoffset = String(L);
      return { pa, L };
    };
    const P = cells[pick];
    const pcx = P.x + cell / 2, pcy = P.y + cell / 2;
    const ring1 = mkPath(loop(pcx, pcy, cell * 0.66, 3), Math.max(3, 6 * k) * (ink ? 1 : 0.8));
    // the zoom: centred in the region, as big as fits (never past the picture's pixels)
    let big = Math.min(R.w, R.h) * 0.8;
    if (srcs.length <= 1 && own) big = Math.min(big, Math.min(natW, natH));
    const bx = R.x + (R.w - big) / 2, by = R.y + (R.h - big) / 2;
    const ring2 = p.zoom_after ? mkPath(loop(R.x + R.w / 2, R.y + R.h / 2, big * 0.6, 7), Math.max(4, 8 * k) * (ink ? 1 : 0.8)) : null;
    // the beats
    const span = Math.max(1.4, end - at);
    const tPop = at, popEnd = at + N * 0.03 + 0.3;
    const tRing = Math.max(popEnd, at + span * 0.32), tZoom = tRing + 0.55, tRing2 = tZoom + 0.35;
    const p3io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    ctx.sfx(tPop, "pop", 0.35);
    ctx.sfx(tRing, "swell", 0.25);
    if (p.zoom_after) ctx.sfx(tZoom, "whoosh.soft", 0.3);
    return {
      draw(t) {
        const on = t >= at - 1e-6 && t < end;
        layer.style.visibility = on ? "visible" : "hidden";
        area.style.visibility = on ? "hidden" : "";
        if (!on) return;
        const leave = ML.lin(t, end - 0.25, end);
        layer.style.opacity = (1 - leave).toFixed(4);
        const z = p.zoom_after ? p3io(ML.lin(t, tZoom, tZoom + 0.5)) : 0;
        for (const q of cells) {
          const u = ML.back(t, tPop + q.i * 0.03, tPop + q.i * 0.03 + 0.3, 1.4), o = ML.lin(t, tPop + q.i * 0.03, tPop + q.i * 0.03 + 0.12);
          if (q === P) {
            const w = cell + (big - cell) * z, x = q.x + (bx - q.x) * z, y = q.y + (by - q.y) * z;
            q.box.style.left = x.toFixed(2) + "px"; q.box.style.top = y.toFixed(2) + "px";
            q.box.style.width = w.toFixed(2) + "px"; q.box.style.height = w.toFixed(2) + "px";
            q.box.style.zIndex = "2";
            layoutImg(q, w, w);
            q.box.style.opacity = o.toFixed(4);
            q.box.style.scale = z > 0 ? "none" : Math.min(1, 0.9 + 0.1 * u).toFixed(4);
          } else {
            const fade = p.zoom_after ? 1 - ML.ease(t, tZoom - 0.1, tZoom + 0.3) : 1 - 0.55 * ML.ease(t, tRing + 0.3, tRing + 0.6);
            q.box.style.opacity = (o * fade).toFixed(4);
            q.box.style.scale = Math.min(1, 0.9 + 0.1 * u).toFixed(4);
          }
        }
        // ring 1 draws on, then (with the zoom) lets go as the picture travels
        const d1 = ML.out(t, tRing, tRing + 0.4);
        ring1.pa.style.strokeDashoffset = (ring1.L * (1 - d1)).toFixed(2);
        ring1.pa.style.opacity = (d1 > 0 ? 1 - (p.zoom_after ? ML.lin(t, tZoom, tZoom + 0.18) : 0) : 0).toFixed(4);
        if (ring2) {
          const d2 = ML.out(t, tRing2, tRing2 + 0.45);
          ring2.pa.style.strokeDashoffset = (ring2.L * (1 - d2)).toFixed(2);
          ring2.pa.style.opacity = d2 > 0 ? "1" : "0";
        }
      },
    };
  },
});
