// Press, hold and drag: the pointer glides onto the target (a hand-like arc on bezier(0.42, 0, 0.12, 1)), clicks — a
// selection frame with corner handles appears — and stays pressed (the cursor held squashed at 0.86) while it drags the
// element to a new spot: both move together, 0.25 s after the click, over 0.7 s on power2.inOut (straight or on an
// arc). The release restores the cursor; the element stays where it was put and the pointer drifts off.
// Sources: MotionGX studio engine scenes.js S.editroom (own: the drag of the post's headline), product-film-skill
// templates/kit/cursor.tsx (MIT: glide with a slight arc, click squash, held press 0.86 until release).
ML.define({
  id: "ui.drag-move",
  category: "ui",
  name: "Press, hold and drag to move",
  does: "The pointer presses down on an element, selects it, drags it to a new spot with both moving together, then releases and leaves it there.",
  says: ["change", "simplicity", "step", "precision"],
  energy: 2,
  targets: ["headline", "card", "cursor"],
  duration: [0.8, 2],
  params: {
    distance: { type: "number", range: [60, 400], default: 160, unit: "px" },
    direction: { type: "choice", options: ["down", "up", "start", "end"], default: "down" },
    path: { type: "choice", options: ["straight", "arc"], default: "straight" },
    hold_squash: { type: "number", range: [0.8, 0.95], default: 0.86 },
    drag: { type: "number", range: [0.4, 1.2], default: 0.7, unit: "s" },
    select: { type: "bool", default: true },
  },
  pairs: ["ui.cursor-free-path", "ui.drag-select-blur"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "click",
  source: { from: "own:lib/studio-engine/assets/scenes.js#S.editroom", license: "own", note: "cursor glide / click squash / held press ported from product-film-skill templates/kit/cursor.tsx (MIT)" },
  setup(ctx) {
    const { el, p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const k = Math.min(f.W, f.H) / 1080, px = (v) => (v * k).toFixed(1) + "px";
    const mk = (tag, css, parent, html) => { const e = doc.createElement(tag); e.style.cssText = css; if (html != null) e.innerHTML = html; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const layer = mk("div", "position:absolute;inset:0;pointer-events:none;z-index:8;", host);
    const dir = rtl ? -1 : 1;

    // the thing dragged: the target, else a small card in the picture region
    let item = el && el !== ctx.stage ? el : null;
    if (!item) {
      const R = f.pic;
      item = mk("div", `position:absolute;left:${(R.x + R.w * 0.5).toFixed(1)}px;top:${(R.y + R.h * 0.3).toFixed(1)}px;translate:-50% 0;padding:${px(28)} ${px(44)};border-radius:var(--x-radius);background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);font:600 ${px(44)} var(--x-body-font);color:var(--x-ink);white-space:nowrap;`, layer, rtl ? "حرّكني" : "Move me");
      item.style.translate = "none";
      item.style.left = (R.x + R.w * 0.5 - item.offsetWidth / 2).toFixed(1) + "px";
    }
    // measured before anything moves
    const b = ctx.box(item);
    // the frame hugs what is dragged: a text target gets an inline wrapper (so it follows the set type, whatever the
    // font ends up measuring), anything else carries the frame itself
    let hug = item;
    if (item.textContent && (item.children.length === 0 || item.querySelector(".ml-w"))) {
      hug = doc.createElement("span");
      hug.style.cssText = "position:relative;display:inline-block;";
      while (item.firstChild) hug.append(item.firstChild);
      item.append(hug);
      const hb = ctx.box(hug); b.x = hb.x; b.y = hb.y; b.w = hb.w; b.h = hb.h;
    } else if (getComputedStyle(item).position === "static") item.style.position = "relative";
    if (getComputedStyle(item).position === "static") item.style.position = "relative"; // so it can come to the front
    const grab = { x: b.x + b.w * 0.5, y: b.y + b.h * 0.55 };
    const d = p.distance * k;
    const vec = p.direction === "up" ? { x: 0.25 * d * dir, y: -d } : p.direction === "start" ? { x: -d * dir, y: 0.15 * d } : p.direction === "end" ? { x: d * dir, y: 0.15 * d } : { x: -0.25 * d * dir, y: d };

    // the selection frame with two corner handles (editroom)
    const pad = 12 * k;
    const sel = p.select ? mk("div", `position:absolute;inset:${(-pad).toFixed(1)}px;box-sizing:border-box;border:${px(3)} solid var(--x-accent);border-radius:${px(6)};opacity:0;pointer-events:none;`, hug,
      ["top:-1;left:-1", "top:-1;right:-1", "bottom:-1;left:-1", "bottom:-1;right:-1"].map((pos) => `<i style="position:absolute;${pos.replace(/-1/g, px(-11))};width:${px(18)};height:${px(18)};background:var(--x-panel);border:${px(3)} solid var(--x-accent);box-sizing:border-box"></i>`).join("")) : null;

    // the pointer (product-film's macOS arrow, anchored at its tip)
    const cs = 56 * k;
    const cur = mk("div", "position:absolute;left:0;top:0;", layer);
    const svg = doc.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("width", cs.toFixed(1)); svg.setAttribute("height", cs.toFixed(1));
    svg.style.cssText = `position:absolute;left:${(-5 / 24 * cs).toFixed(1)}px;top:${(-2 / 24 * cs).toFixed(1)}px;overflow:visible;transform-origin:${(5 / 24 * cs).toFixed(1)}px ${(2 / 24 * cs).toFixed(1)}px;filter:drop-shadow(0 ${px(4)} ${px(6)} color-mix(in srgb, var(--x-ink) 30%, transparent));`;
    svg.innerHTML = '<path d="M5 2 L5 19 L9.5 15.5 L12.5 22 L15.5 20.5 L12.5 14 L18.5 14 Z" fill="var(--x-pointer)" stroke="var(--x-pointer-edge)" stroke-width="1.4" stroke-linejoin="round"/>';
    cur.append(svg);

    // timing: glide in, click, hold, drag, release (squeezed to fit the span)
    const span = Math.max(0.8, end - at - 0.35);
    const sc = Math.min(1, span / (0.55 + 0.25 + p.drag + 0.4));
    const tClick = at + 0.55 * sc, tDrag = tClick + 0.25 * sc, tRel = tDrag + p.drag * sc;
    const start = { x: rtl ? f.safe.x + f.safe.w * 0.15 : f.safe.x + f.safe.w * 0.85, y: f.safe.y + f.safe.h * 0.9 };
    const glide = ML.bezier(0.42, 0, 0.12, 1), inOut = ML.bezier(0.455, 0.03, 0.515, 0.955); // power2.inOut
    const bow = (a, bb, u, max) => { const dx = bb.x - a.x, dy = bb.y - a.y, L = Math.hypot(dx, dy) || 1, s = Math.sin(Math.PI * u) * Math.min(max, L * 0.09); return { x: -(dy / L) * s, y: (dx / L) * s }; };
    ctx.sfx(tClick, "click", 0.45);
    ctx.sfx(tRel, "click", 0.3);

    return {
      draw(t) {
        const on = ML.clamp((t - at) / 0.2), gone = ML.clamp((t - (tRel + 0.45)) / 0.3);
        // the drag offset (shared by element, frame and pointer)
        const u = inOut(ML.lin(t, tDrag, tRel));
        let ox = vec.x * u, oy = vec.y * u;
        if (p.path === "arc") { const L = Math.hypot(vec.x, vec.y) || 1, s = Math.sin(Math.PI * u) * L * 0.3 * -dir; ox += (-vec.y / L) * s; oy += (vec.x / L) * s; }
        item.style.translate = u > 0 ? `${ox.toFixed(2)}px ${oy.toFixed(2)}px` : "none";
        // a picked-up element comes to the front (and stays there once placed)
        item.style.zIndex = t >= tClick ? "9" : "";
        // pointer: glide onto the grab point with a slight arc, ride the drag, drift off after the release
        let c;
        if (t < tClick) { const g = glide(ML.lin(t, tClick - Math.min(0.46, 0.5 * sc), tClick)), w = bow(start, grab, g, 70 * k); c = { x: start.x + (grab.x - start.x) * g + w.x, y: start.y + (grab.y - start.y) * g + w.y }; }
        else c = { x: grab.x + ox, y: grab.y + oy };
        if (t > tRel + 0.1) { const v = ML.out(t, tRel + 0.1, tRel + 0.7); c = { x: c.x + dir * 70 * k * v, y: c.y + 60 * k * v }; }
        cur.style.transform = `translate(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px)`;
        cur.style.opacity = (on * (1 - gone)).toFixed(4);
        // squash: a click dip, then held at hold_squash until the release
        let s = 1;
        if (t >= tClick && t - tClick < 0.16) s = 1 - 0.2 * Math.sin((Math.PI * (t - tClick)) / 0.16);
        if (t >= tClick && t < tRel) s = Math.min(s, t - tClick < 0.08 ? s : p.hold_squash);
        if (t >= tRel && t < tRel + 0.12) s = p.hold_squash + (1 - p.hold_squash) * ML.out(t, tRel, tRel + 0.12);
        svg.style.transform = s === 1 ? "none" : `scale(${s.toFixed(4)})`;
        // the selection frame: on at the click, rides the drag, fades after the release
        if (sel) {
          const so = ML.clamp((t - tClick) / 0.15) * (1 - ML.clamp((t - (tRel + 0.5)) / 0.25));
          sel.style.opacity = so.toFixed(4);
        }
      },
    };
  },
});
