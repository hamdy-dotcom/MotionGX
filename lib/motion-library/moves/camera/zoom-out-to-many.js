// Zoom out to many: the frame starts filled by one thing (the whole scene, a card, a picture) and the camera pulls back
// to reveal it is one cell of a wall, a grid or a gallery of many. A world holds the grid, laid out in "end units"
// (at camera scale 1 the grid shows `columns` cells across the frame) inside a box with CSS zoom = the start scale, so
// every cell is re-laid-out at its start size (crisp) and the camera only ever scales DOWN (c = s / start ≤ 1, the
// perspective tilt is projected per cell in 2D, never a 3D layer). The camera runs start → end_scale in log space over
// `duration` on cubic-bezier(.7,0,.2,1) (fast middle).
// The start is where the hero fills the frame, so `columns` sets it: with the stage as target the start scale is exactly
// that (the first frame IS the live frame, seamless); with a target it is at least that and `start_scale` can only go
// further in (a picture stops at its own pixels). `end_scale` stops where the wall would no longer cover the frame.
// Layouts:
//   copies    — the hero cloned into a brick-offset wall that turns to −4° as it lands; random clones show an accent pill
//   tile-wall — quiet rounded icon tiles, a few in the accent; they fade in by distance from the hero (0.002 s per frame
//               px, tightened so the wall is whole soon after the landing); the hero wears an accent ring as it lands
//   array     — an N×M array of identical copies; the others darken, the near rows go soft (DOF) when no picture is in it
//   gallery   — a page: header with the scene's title + a grid of live cards in the hero's own shape (3 columns, 5 on a
//               wide frame; thumbnail, title bars, duration badge); the camera drifts so the title lands at the top and
//               a tab bar fades in over the last 30%
// Cells near the hero are true clones with a playing scrub bar (they keep "playing"); far cells are lighter copies.
// After the pull: hold, drift (keeps receding and turning a little) or scroll (the page moves up 40 px over 2 s).
// RTL: the wall turns and the bricks offset the other way, the drift mirrors.
// Source: prompt-motion gabrielbuzziv-tutorial-o-mais-insano, antonio-kodheli-490109, polydao-claude-opus-5-5-is,
// lemomo-ai-lemo-opuscar-skill-opus-5-5, bogdandragomir-this-was-made-entirely (reference only: our own rebuild).
ML.define({
  id: "camera.zoom-out-to-many",
  category: "camera",
  name: "Pull back from one to reveal it is one of many",
  does: "The frame starts filled by one tile, window, card or object, then the camera pulls back to reveal it is one cell in a wall, grid or gallery of many.",
  says: ["scale", "reveal", "proof", "choice", "growth", "problem"],
  energy: 3,
  targets: ["stage", "screen", "card", "image", "scene"],
  duration: [1, 3],
  params: {
    layout: { type: "choice", options: ["copies", "tile-wall", "array", "gallery"], default: "copies" },
    start_scale: { type: "number", range: [2, 8], default: 4.5, unit: "x" },
    end_scale: { type: "number", range: [0.12, 1], default: 1, unit: "x" },
    duration: { type: "number", range: [0.7, 1.4], default: 1, unit: "s" },
    tilt: { type: "number", range: [0, 40], default: 0, unit: "deg" },
    columns: { type: "number", range: [3, 20], default: 6 },
    after: { type: "choice", options: ["hold", "drift", "scroll"], default: "drift" },
  },
  pairs: ["camera.push-in", "text-in.punchline"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:gabrielbuzziv-tutorial-o-mais-insano", license: "reference", note: "our own rebuild; also antonio-kodheli-490109, polydao-claude-opus-5-5-is, lemomo-ai-lemo-opuscar-skill-opus-5-5, bogdandragomir-this-was-made-entirely" },
  setup(ctx) {
    const { p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H;
    const el = ctx.el;
    const isStage = !el || el === stage || el === host;
    const layout = ["copies", "tile-wall", "array", "gallery"].includes(p.layout) ? p.layout : "copies";
    const dir = ctx.rtl ? -1 : 1;
    const dur = Math.min(ML.clamp(p.duration, 0.7, 1.4), Math.max(0.3, end - at));
    let s1 = ML.clamp(p.end_scale, layout === "gallery" ? 0.8 : 0.12, 1); // a gallery is one page: it never floats small
    let s0 = ML.clamp(p.start_scale, 2, 8);
    const tilt = ML.clamp(p.tilt, 0, 40);
    const cols = layout === "gallery" ? (f.wide ? 5 : 3) : Math.round(ML.clamp(p.columns, 3, 20));

    // ── the hero: what fills the frame at the start ──
    const strip = (n) => {
      n.removeAttribute && ["data-slot", "data-slot-sample", "id"].forEach((a) => n.removeAttribute(a));
      n.querySelectorAll && n.querySelectorAll("[data-slot],[data-slot-sample],[id]").forEach((x) => ["data-slot", "data-slot-sample", "id"].forEach((a) => x.removeAttribute(a)));
      return n;
    };
    let bw, bh, hasPic, nw = 0, nh = 0, frameKids = null;
    if (isStage) {
      bw = W; bh = H;
      frameKids = [...host.children];
      hasPic = !!host.querySelector("img, video, picture, canvas");
    } else {
      const b = ctx.box(el);
      bw = Math.max(40, b.w); bh = Math.max(40, b.h);
      hasPic = el.matches("img, video, picture, canvas") || !!el.querySelector("img, video, picture, canvas");
      if (el.tagName === "IMG") { nw = el.naturalWidth || 0; nh = el.naturalHeight || 0; }
    }
    const gap0 = layout === "tile-wall" ? 0.14 : layout === "gallery" ? 0.08 : 0.07;
    // cell size in end units (camera scale 1 = frame px): the hero's box (a gallery card's thumbnail, else the whole
    // cell) in the hero's own shape where the layout lets it, and a gallery card's caption under it
    const cw = (W * 0.92) / (cols + (cols - 1) * gap0);
    const shape = isStage ? H / W : ML.clamp(bh / bw, 0.45, 1.8);
    const heroW = cw, heroH = layout === "tile-wall" ? cw : cw * shape;
    const capH = layout === "gallery" ? cw * 0.3 : 0;
    const ch = heroH + capH, thumbH = heroH;
    const g = cw * gap0;
    // the scale at which the hero fills the frame: the whole scene edge to edge, or a target as large as fits
    if (isStage) s0 = Math.max(W / heroW, H / heroH);
    else s0 = Math.max(s0, Math.min(W / heroW, H / heroH));
    // a picture never enlarged past its own pixels
    if (nw && nh) s0 = Math.min(s0, Math.max(1, Math.min(nw / heroW, nh / heroH)));
    const k = s0; // layout zoom of the world: the camera scale c = s / k stays ≤ 1

    // look values a few cells need as numbers
    const probe = document.createElement("div");
    host.append(probe);
    probe.style.cssText = "position:absolute;width:var(--x-radius);visibility:hidden";
    const radius = probe.getBoundingClientRect().width / ((stage.getBoundingClientRect().width / (stage.offsetWidth || 1)) || 1) || 24;
    probe.remove();

    // ── the view (full frame) → camera (transform) → world (zoom k, origin at the hero's centre) ──
    const view = document.createElement("div");
    view.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:hidden;z-index:6;pointer-events:none;visibility:hidden;background:var(--x-ground);background-image:var(--x-ground-image)`;
    const PD = Math.max(W, H) * 1.5; // the perspective distance of the tilt
    const cam = document.createElement("div");
    cam.style.cssText = "position:absolute;left:0;top:0;width:0;height:0;transform-origin:0 0";
    const world = document.createElement("div");
    world.style.cssText = `position:absolute;left:0;top:0;width:0;height:0;zoom:${k}`;
    cam.append(world); view.append(cam);

    // the copy of the hero: the whole scene in a frame, or a clone of the target fitted into w × h
    function heroCopy(w, h) {
      if (isStage) {
        const fr = document.createElement("div");
        const z = Math.min(w / W, h / H);
        fr.style.cssText = `position:absolute;left:${((w - W * z) / 2 / z).toFixed(3)}px;top:${((h - H * z) / 2 / z).toFixed(3)}px;width:${W}px;height:${H}px;overflow:hidden;background:var(--x-ground);background-image:var(--x-ground-image);color:var(--x-ink);font-family:var(--x-body-font);zoom:${z}`;
        for (const c of frameKids) { const n = strip(c.cloneNode(true)); if (n.style) n.style.display = n.classList && n.classList.contains("ml-scene") ? "block" : n.style.display; fr.append(n); }
        return fr;
      }
      const wrap = document.createElement("div");
      wrap.style.cssText = `position:absolute;inset:0;display:flex;align-items:center;justify-content:center;overflow:hidden`;
      const n = strip(el.cloneNode(true));
      if (el.tagName === "IMG") {
        n.style.cssText = `width:${w}px;height:${h}px;object-fit:cover;display:block;border-radius:0;margin:0`;
      } else {
        const z = Math.min((w * 0.94) / bw, (h * 0.94) / bh);
        n.style.width = `${bw}px`; n.style.height = `${bh}px`; n.style.margin = "0"; n.style.flex = "0 0 auto"; n.style.boxSizing = "border-box";
        n.style.zoom = String(z); n.style.position = "relative"; n.style.left = "0"; n.style.top = "0"; n.style.translate = "none"; n.style.transform = "none"; n.style.opacity = "1";
      }
      wrap.append(n);
      return wrap;
    }
    // a lighter copy: the hero's shape drawn as a panel with a picture block and two lines
    function lightCopy(w, h, i) {
      const d = document.createElement("div");
      const hue = ML.rnd(i, 3) > 0.5 ? "var(--x-accent)" : "var(--x-accent-2)";
      const bar = (css) => { const b = document.createElement("div"); b.style.cssText = "position:absolute;border-radius:999px;" + css; d.append(b); return b; };
      if (isStage) {
        // the scene's own layout in miniature: the headline band, then the panel with its picture
        const hd = f.head, pc = f.pic, P = (v, of) => ((v / of) * 100).toFixed(2) + "%";
        d.style.cssText = "position:absolute;inset:0;background:var(--x-ground);overflow:hidden";
        const tw = 50 + ML.rnd(i, 5) * 30;
        bar(`left:${(50 - tw / 2).toFixed(1)}%;width:${tw.toFixed(1)}%;top:${P(hd.y + hd.h * 0.38, H)};height:${P(hd.h * 0.16, H)};background:var(--x-ink);opacity:.85`);
        bar(`left:30%;width:40%;top:${P(hd.y + hd.h * 0.62, H)};height:${P(hd.h * 0.08, H)};background:var(--x-dim);opacity:.6`);
        const pn = document.createElement("div");
        pn.style.cssText = `position:absolute;left:${P(pc.x + pc.w * 0.1, W)};width:${P(pc.w * 0.8, W)};top:${P(pc.y + pc.h * 0.25, H)};height:${P(pc.h * 0.5, H)};background:var(--x-panel);border-radius:${((radius * w) / W).toFixed(2)}px;box-shadow:var(--x-shadow);overflow:hidden`;
        const pic = document.createElement("div");
        pic.style.cssText = `position:absolute;left:5%;right:5%;top:42%;height:36%;border-radius:${((radius * 0.5 * w) / W).toFixed(2)}px;background:${hue};opacity:${(0.55 + ML.rnd(i, 4) * 0.4).toFixed(2)}`;
        pn.append(pic); d.append(pn);
        return d;
      }
      d.style.cssText = `position:absolute;inset:0;background:var(--x-panel);overflow:hidden`;
      const side = ctx.rtl ? "right" : "left";
      const pic = document.createElement("div");
      pic.style.cssText = `position:absolute;left:8%;right:8%;top:10%;height:46%;border-radius:${((radius * 0.4 * w) / W).toFixed(2)}px;background:${hue};opacity:${(0.55 + ML.rnd(i, 4) * 0.4).toFixed(2)}`;
      d.append(pic);
      bar(`${side}:8%;width:${(50 + ML.rnd(i, 5) * 34).toFixed(0)}%;top:64%;height:8%;background:var(--x-ink);opacity:.85`);
      bar(`${side}:8%;width:${(30 + ML.rnd(i, 6) * 30).toFixed(0)}%;top:78%;height:6%;background:var(--x-dim);opacity:.6`);
      return d;
    }
    // a quiet wall: panels with a line icon, a few in the accent (never a noise of colours)
    const ICONS = [
      "M12 3l2.7 5.8 6.3.8-4.6 4.3 1.2 6.3L12 17l-5.6 3.2 1.2-6.3L3 9.6l6.3-.8z",
      "M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z",
      "M13 3L5 14h6l-1 7 8-11h-6z",
      "M6 17v-6a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21.5h4",
      "M4 5h16v11H9l-5 4z",
      "M4 4h8l8 8-8 8-8-8zM8 8h.01",
      "M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5",
      "M4 12a8 8 0 1 0 16 0a8 8 0 1 0-16 0M8.5 12l2.5 2.5 4.5-5",
    ];
    function tileFace(i) {
      const d = document.createElement("div");
      const v = ML.rnd(i, 7);
      const [fill, ink] = v > 0.88 ? ["var(--x-accent)", "var(--x-accent-ink)"] : v > 0.68 ? ["var(--x-panel-2)", "var(--x-accent)"] : ["var(--x-panel)", v > 0.34 ? "var(--x-dim)" : "var(--x-accent)"];
      d.style.cssText = `position:absolute;inset:0;background:${fill};color:${ink};display:flex;align-items:center;justify-content:center`;
      d.innerHTML = `<svg viewBox="0 0 24 24" width="52%" height="52%" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS[Math.floor(ML.rnd(i, 8) * ICONS.length)]}"/></svg>`;
      return d;
    }

    // ── the grid ──
    const sx = cw + g, sy = ch + g;
    const brick = layout === "copies";
    // a tilted wall narrows towards its far rows, so it needs more cells across
    const wideBy = 1 + (0.9 * tilt) / 40;
    const reachX = (W / 2) / s1 * 1.25 * wideBy + sx * 2, reachY = (H / 2) / s1 * 1.25 + sy * 2;
    let nx = Math.min(44, Math.ceil(reachX / sx)), ny = Math.min(40, Math.ceil(reachY / sy));
    let nyUp = ny + (tilt > 0 ? Math.ceil(ny * (tilt / 40) * 1.2) : 0);
    while ((2 * nx + 1) * (ny + nyUp + 1) > 2600) { nx = Math.max(2, nx - 1); ny = Math.max(2, ny - 1); nyUp = Math.max(2, nyUp - 1); }
    if (layout === "gallery") { nx = Math.floor(cols / 2); nyUp = 0; ny = Math.min(40, Math.ceil(((H / s1) * 1.1) / sy) + 2); }
    // the number of cells is capped: the camera stops where the wall still covers the frame
    if (layout !== "gallery") s1 = Math.min(1, Math.max(s1, (W * 0.6 * wideBy) / (nx * sx), (H * 0.6) / (ny * sy)));
    const cells = [];
    for (let j = -nyUp; j <= ny; j++) for (let i = -nx; i <= nx; i++) {
      const off = brick && Math.abs(j) % 2 === 1 ? (sx / 2) * dir : 0;
      const x = i * sx + off, y = j * sy;
      cells.push({ i, j, x, y, d: Math.hypot(x, y), hero: i === 0 && j === 0 });
    }
    cells.sort((a, b) => a.d - b.d);
    const isImg = !isStage && el.tagName === "IMG";
    // true copies wherever a copy can still be read: all that the frame shows at the end (cells are sorted from the
    // hero, so a circle round the frame), lighter ones past that, and only tiny cells far out as a plain background
    const shown = ((W / s1 / sx + 2) * (H / s1 / sy + 2) * 1.9) | 0;
    const FULL = layout === "tile-wall" ? 1 : Math.min(isImg ? 700 : 320, shown), LIGHT = 1400;
    // a look's shadow is in px: on small cells it would turn the wall into a haze
    const shadowed = cw >= 110;
    const live = []; // playing scrub bars on the true copies
    // tile wall: seconds of delay per end unit from the hero
    const tileD = Math.min(0.002 * s1, Math.min(dur + 0.5, 0.7 * Math.max(0.3, end - at - 0.3)) / (Math.hypot(W, H) / 2 / s1));
    cells.forEach((c, n) => {
      const id = (c.i + 97) * 131 + (c.j + 89);
      const cell = document.createElement("div");
      const r = layout === "tile-wall" ? cw * 0.22 : (radius * cw) / (isStage ? W : Math.max(W * 0.5, bw * 1.4));
      cell.style.cssText = `position:absolute;left:${(c.x - cw / 2).toFixed(2)}px;top:${(c.y - ch / 2).toFixed(2)}px;width:${cw.toFixed(2)}px;height:${ch.toFixed(2)}px;border-radius:${r.toFixed(2)}px;overflow:hidden;background:var(--x-panel);box-shadow:${shadowed ? "var(--x-shadow)" : "none"}`;
      c.r = r;
      let face;
      if (layout === "gallery") {
        cell.style.background = "var(--x-panel)";
        if (!c.hero) { cell.style.boxSizing = "border-box"; cell.style.border = "var(--x-edge) solid var(--x-edge-color)"; } // the hero's edge would show on the first frame
        const th = document.createElement("div");
        th.style.cssText = `position:absolute;left:0;top:0;width:100%;height:${thumbH.toFixed(2)}px;overflow:hidden;background:var(--x-panel-2)`;
        if (c.hero) th.append(heroCopy(heroW, heroH));
        else if (isStage) th.append(lightCopy(heroW, heroH, id)); // other films of the same kind
        else {
          const a = (ML.rnd(id, 9) * 180).toFixed(0);
          th.style.background = `linear-gradient(${a}deg, var(--x-accent), var(--x-accent-2))`;
          th.style.opacity = String((0.6 + ML.rnd(id, 10) * 0.4).toFixed(2));
        }
        const badge = document.createElement("div");
        badge.textContent = `${Math.floor(ML.rnd(id, 11) * 9)}:${String(Math.floor(ML.rnd(id, 12) * 60)).padStart(2, "0")}`;
        badge.style.cssText = `position:absolute;${ctx.rtl ? "left" : "right"}:${(cw * 0.04).toFixed(1)}px;top:${(thumbH - cw * 0.12).toFixed(1)}px;padding:0 ${(cw * 0.025).toFixed(1)}px;height:${(cw * 0.085).toFixed(1)}px;line-height:${(cw * 0.085).toFixed(1)}px;font:600 ${(cw * 0.055).toFixed(1)}px var(--x-mono-font);direction:ltr;background:var(--x-ink);color:var(--x-panel);border-radius:${(cw * 0.02).toFixed(1)}px;opacity:.88`;
        const t1 = document.createElement("div");
        t1.style.cssText = `position:absolute;${ctx.rtl ? "right" : "left"}:6%;top:${(thumbH + cw * 0.07).toFixed(1)}px;width:${(56 + ML.rnd(id, 13) * 30).toFixed(0)}%;height:${(cw * 0.06).toFixed(1)}px;border-radius:999px;background:var(--x-ink);opacity:.85`;
        const t2 = document.createElement("div");
        t2.style.cssText = `position:absolute;${ctx.rtl ? "right" : "left"}:6%;top:${(thumbH + cw * 0.17).toFixed(1)}px;width:${(28 + ML.rnd(id, 14) * 24).toFixed(0)}%;height:${(cw * 0.04).toFixed(1)}px;border-radius:999px;background:var(--x-dim);opacity:.55`;
        cell.append(th, badge, t1, t2);
        if (c.hero) c.badge = badge;
        if (n < FULL || c.hero) {
          const bar = document.createElement("div");
          bar.style.cssText = `position:absolute;left:0;top:${(thumbH - cw * 0.018).toFixed(1)}px;height:${(cw * 0.018).toFixed(1)}px;width:100%;background:var(--x-accent);transform-origin:${ctx.rtl ? "100%" : "0"} 50%`;
          cell.append(bar); live.push({ bar, ph: ML.rnd(id, 15), sp: 0.12 + ML.rnd(id, 16) * 0.2 });
        }
      } else if (layout === "tile-wall") {
        face = c.hero ? heroCopy(cw, ch) : tileFace(id);
        cell.append(face);
      } else {
        face = c.hero || n < FULL ? heroCopy(cw, ch) : n < LIGHT ? lightCopy(cw, ch, id) : null;
        if (face) cell.append(face);
        else cell.style.background = isStage ? `linear-gradient(var(--x-ink), var(--x-ink)) 50% 16% / 60% 3% no-repeat, linear-gradient(var(--x-accent), var(--x-accent)) 50% 62% / 58% 12% no-repeat, linear-gradient(var(--x-panel), var(--x-panel)) 50% 62% / 72% 26% no-repeat, var(--x-ground)` : `linear-gradient(${ML.rnd(id, 2) > 0.5 ? "var(--x-accent)" : "var(--x-accent-2)"}, var(--x-accent-2)) 50% 22% / 84% 46% no-repeat, var(--x-panel)`;
        if (face && (c.hero || n < Math.min(FULL, 60))) {
          const bar = document.createElement("div");
          const bh2 = Math.max(ch * 0.012, 1.2);
          bar.style.cssText = `position:absolute;left:0;bottom:0;height:${bh2.toFixed(2)}px;width:100%;background:var(--x-accent);transform-origin:${ctx.rtl ? "100%" : "0"} 50%`;
          cell.append(bar); live.push({ bar, ph: ML.rnd(id, 15), sp: 0.12 + ML.rnd(id, 16) * 0.2 });
        }
        if (layout === "copies" && !c.hero && n < LIGHT && ML.rnd(id, 17) > 0.8) {
          const pill = document.createElement("div");
          pill.style.cssText = `position:absolute;top:7%;${ctx.rtl ? "left" : "right"}:7%;width:26%;height:${(cw * 0.08).toFixed(2)}px;border-radius:999px;background:var(--x-accent);box-shadow:0 0 0 ${(cw * 0.012).toFixed(2)}px var(--x-panel);transform-origin:${ctx.rtl ? "0" : "100%"} 50%`;
          cell.append(pill); c.pill = pill; c.pillAt = at + dur * 0.55 + ML.rnd(id, 18) * 0.5;
        }
        if (layout === "array" && !c.hero) {
          const dim = document.createElement("div");
          dim.style.cssText = "position:absolute;inset:0;background:var(--x-ink)";
          cell.append(dim); c.dim = dim;
          // depth of field: the near rows go soft (never on a picture)
          if (!hasPic && tilt > 0 && c.j > 1) cell.style.filter = `blur(${Math.min(6, (c.j - 1) * 1.2).toFixed(1)}px)`;
        }
      }
      if (c.hero) c.el = cell;
      c.cell = cell;
      world.append(cell);
    });
    const hero = cells.find((c) => c.hero);
    hero.el.style.zIndex = "2";
    if (isStage) hero.el.style.background = "var(--x-ground)";
    // a target smaller than the frame would show its neighbours on the first frame: they arrive as the pull starts
    let veil = null;
    if (!isStage && layout !== "tile-wall") {
      veil = document.createElement("div");
      const vw = Math.max(W, H) / s1 * 1.5;
      veil.style.cssText = `position:absolute;left:${(-vw).toFixed(1)}px;top:${(-vw).toFixed(1)}px;width:${(vw * 2).toFixed(1)}px;height:${(vw * 2).toFixed(1)}px;z-index:1;background:var(--x-ground);background-image:var(--x-ground-image)`;
      world.append(veil);
    }

    // gallery: the page header above the grid (the scene's own title, a label) and a tab bar in screen space
    let headTop = 0, tabbar = null;
    if (layout === "gallery") {
      const gw = cols * cw + (cols - 1) * g;
      const head = document.createElement("div");
      const hh = cw * 0.62;
      headTop = -ch / 2 - g - hh;
      head.style.cssText = `position:absolute;left:${(-gw / 2).toFixed(2)}px;top:${headTop.toFixed(2)}px;width:${gw.toFixed(2)}px;height:${hh.toFixed(2)}px;display:flex;flex-direction:column;justify-content:flex-end;gap:${(cw * 0.04).toFixed(1)}px;text-align:start`;
      const lab = document.createElement("div");
      lab.style.cssText = `width:${(cw * 0.5).toFixed(1)}px;height:${(cw * 0.05).toFixed(1)}px;border-radius:999px;background:var(--x-accent)`;
      const tsrc = host.querySelector(".ml-title");
      const ttl = document.createElement("div");
      ttl.textContent = tsrc ? tsrc.textContent.trim() : "";
      ttl.style.cssText = `font:400 ${(cw * 0.2).toFixed(1)}px/1.1 var(--x-serif-font);color:var(--x-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis`;
      if (!ttl.textContent) { ttl.textContent = ""; ttl.style.height = `${(cw * 0.14).toFixed(1)}px`; ttl.style.width = "60%"; ttl.style.background = "var(--x-ink)"; ttl.style.borderRadius = "999px"; }
      head.append(lab, ttl);
      world.append(head);
      tabbar = document.createElement("div");
      const tw = Math.min(W * 0.62, 620), th = Math.min(W, H) * 0.085;
      tabbar.style.cssText = `position:absolute;left:${((W - tw) / 2).toFixed(1)}px;top:${(H - (f.H - f.safe.y - f.safe.h) * 0.5 - th).toFixed(1)}px;width:${tw.toFixed(1)}px;height:${th.toFixed(1)}px;border-radius:999px;background:var(--x-panel);box-shadow:var(--x-shadow);border:var(--x-edge) solid var(--x-edge-color);display:flex;align-items:center;justify-content:space-around;opacity:0`;
      for (let q = 0; q < 4; q++) {
        const dot = document.createElement("div");
        dot.style.cssText = `width:${(th * 0.36).toFixed(1)}px;height:${(th * 0.36).toFixed(1)}px;border-radius:${q % 2 ? "28%" : "50%"};background:${q === 0 ? "var(--x-accent)" : "var(--x-dim)"};opacity:${q === 0 ? 1 : 0.45}`;
        tabbar.append(dot);
      }
      view.append(tabbar);
    }
    host.append(view);

    // where the camera ends: the gallery drifts so its title lands near the safe top
    const dyEnd = layout === "gallery" ? f.safe.y + H * 0.02 - H / 2 - headTop * s1 : 0;
    const pull = ML.bezier(0.7, 0, 0.2, 1);
    const tEnd = at + dur;
    const ln0 = Math.log(s0), ln1 = Math.log(s1);
    const unit = W / 1080;
    ctx.sfx(at, "whoosh.soft", 0.4);
    if (layout === "tile-wall") ctx.sfx(at + dur * 0.5, "pop.soft", 0.18);
    else if (layout === "copies") ctx.sfx(at + dur * 0.6, "blip", 0.15);
    ctx.sfx(tEnd, "land.light", 0.22);

    return {
      draw(t) {
        const on = t >= at && t <= end;
        view.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        const u = pull(ML.lin(t, at, tEnd));
        let s = Math.exp(ln0 + (ln1 - ln0) * u);
        const after = Math.max(0, t - tEnd);
        let rot = (layout === "copies" ? -4 : 0) * dir * u;
        // the hero's picture is centred at the start (a gallery card's caption sits below it), the page at the end
        let dx = 0, dy = (capH / 2) * s * (1 - u) + dyEnd * u;
        if (after > 0 && p.after === "drift" && layout === "gallery") dy += -8 * unit * after; // a page does not tilt away
        else if (after > 0 && p.after === "drift") { s *= Math.exp(-0.05 * after); rot += -0.6 * dir * after; dx += -6 * unit * dir * after; dy += -8 * unit * after; }
        if (after > 0 && p.after === "scroll") dy += -40 * unit * ML.ease(after, 0, 2);
        const c = s / k; // ≤ 1
        const rx = tilt * u, rz = (-8 * tilt) / 40 * dir * u;
        // the camera stays a flat transform (scale ≤ 1); the perspective tilt is projected per cell below, so nothing
        // goes through a 3D-composited layer (a huge 3D layer rasterises late and soft)
        cam.style.transform = `translate(${(W / 2 + dx).toFixed(2)}px, ${(H / 2 + dy).toFixed(2)}px) rotate(${(rot + rz).toFixed(3)}deg) scale(${c.toFixed(5)})`;
        const ra = (rx * Math.PI) / 180, sa = Math.sin(ra), ca = Math.cos(ra);
        // soft as it starts, never on a picture: 6 px → 0 from a cut, and from 0 when the first frame is the live frame
        const bp = ML.lin(t, at, at + dur * 0.55);
        const bl = hasPic ? 0 : isStage ? 6 * Math.sin(Math.PI * bp) : 6 * (1 - bp);
        cam.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : "none";
        hero.el.style.borderRadius = `${(hero.r * ML.lin(t, at, at + dur * 0.4)).toFixed(2)}px`;
        if (veil) veil.style.opacity = (1 - ML.lin(t, at + dur * 0.02, at + dur * 0.35)).toFixed(3);
        if (layout === "tile-wall") hero.el.style.boxShadow = `0 0 0 ${(cw * 0.035 * ML.lin(t, at + dur * 0.6, tEnd)).toFixed(2)}px var(--x-accent), var(--x-shadow)`;
        // the copies keep playing
        const bo = ML.lin(t, at + dur * 0.15, at + dur * 0.5).toFixed(3);
        if (hero.badge) hero.badge.style.opacity = (0.88 * bo).toFixed(3);
        for (const L of live) { const v = (L.ph + (t - at) * L.sp) % 1; L.bar.style.transform = `scaleX(${v.toFixed(4)})`; L.bar.style.opacity = bo; }
        for (const cc of cells) {
          let tf = "";
          if (rx > 0.01) {
            // rotateX about the frame centre seen through a perspective of PD: q = PD / (PD − z), z = y·s·sin a
            const q = PD / (PD - Math.min(PD * 0.6, cc.y * s * sa));
            tf = `translate(${(cc.x * (q - 1)).toFixed(3)}px, ${(cc.y * (ca * q - 1)).toFixed(3)}px) scale(${q.toFixed(5)}, ${(q * ca).toFixed(5)})`;
          }
          if (layout === "tile-wall" && !cc.hero) {
            const v = ML.out(t, at + cc.d * tileD, at + cc.d * tileD + 0.3);
            cc.cell.style.opacity = v.toFixed(3);
            if (v < 1) tf += ` scale(${(0.85 + 0.15 * v).toFixed(4)})`;
          }
          if (tilt > 0 || layout === "tile-wall") cc.cell.style.transform = tf || "none"; // every frame: a seek back to the start leaves nothing behind
          if (cc.dim) cc.dim.style.opacity = (0.38 * u).toFixed(3);
          if (cc.pill) { const v = ML.clamp(ML.back(t, cc.pillAt, cc.pillAt + 0.3), 0, 1); cc.pill.style.transform = `scaleX(${v.toFixed(4)})`; cc.pill.style.opacity = ML.lin(t, cc.pillAt, cc.pillAt + 0.1).toFixed(3); }
        }
        if (tabbar) tabbar.style.opacity = ML.lin(t, at + dur * 0.7, tEnd).toFixed(3);
      },
    };
  },
});
