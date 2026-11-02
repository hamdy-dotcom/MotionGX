// Frame taken apart into 3D layers. The frame (or an app window / card) tilts back in perspective and its parts lift
// apart into stacked, outlined planes with flat leader-line tags naming them in code, holds with a slow live sway, then
// collapses flat into the finished frame. Ported from MengTo/Skills html-explainer-video demo/film.js "hook" + film.css
// .hk-space / .hk-stack / .hk-layer and html-reel demo draw() "it's HTML" (MIT):
//   · perspective 1100–2600 px from 50 % 40 %, preserve-3d — and 3D switched on only from the tilt, so anything before
//     stays 2D-sharp (html-reel toggles .d3);
//   · open = ease(at − 0.1 … +0.9); tilt rotateX + rotateY (−23…−30°, html-reel) or rotateX + rotateZ (−36° with
//     +5·sin(0.55 t) live sway, the explainer), settling over 0.9 s;
//   · each layer translateZ(i·gap − k·gap) with the lift on cubic-out 0.74 s; the gap widens with `open`
//     (explainer: 190 + 90·open); each plane's outline fades in over 0.2 s staggered 0.09 s; tags measured from where
//     each plane is drawn;
//   · flatten: gap·(1 − flat), rotations·(1 − flat).
// Every layer stays laid out at its own size and the whole stack is pushed back in Z by exactly what its nearest
// corner would come forward (computed per frame), so nothing is ever drawn larger than 1 — the "camera drops" by
// that push and creeps 5 % closer late. Sound: whoosh.soft on open, whoosh.heavy before the flatten, sub on landing.
ML.define({
  id: "element.exploded-layers",
  category: "element",
  name: "Frame taken apart into 3D layers",
  does: "The frame or an app window tilts back in perspective and separates into stacked, outlined layers floating apart (with labels), then collapses flat into the finished frame.",
  says: ["reveal", "tech", "story", "proof"],
  energy: 4,
  targets: ["scene", "screen", "stage", "card"],
  duration: [2, 5],
  params: {
    layers: { type: "number", range: [3, 5], default: 4 },
    tilt: { type: "number", range: [15, 60], default: 30, unit: "deg" },
    separation: { type: "number", range: [40, 300], default: 150, unit: "px" },
    axis: { type: "choice", options: ["xy", "xz"], default: "xy" },
    ends: { type: "choice", options: ["flatten", "hold"], default: "flatten" },
    labels: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "camera.push-in", "element.layer-stack-build"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:agent-skills/media/html-explainer-video/demo/film.js#hook", license: "MIT", note: "with film.css .hk-* and html-reel demo/index.html draw() (the tilt + lift)" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080;
    const n = Math.round(ML.clamp(p.layers, 3, 5));
    const whole = !ctx.el || ctx.el === ctx.stage || ctx.el === ctx.scene;
    const parts = []; // { el, role, layer }
    let root, RW, RH, base;
    // role levels → layer index for this many layers
    const LAYER = { 3: [0, 1, 1, 2, 2], 4: [0, 1, 2, 3, 3], 5: [0, 1, 2, 3, 4] }[n];
    const NAMES = ["<body>", "<section>", "<figure>", "<h1>", "<p>"];
    if (whole) {
      // the frame itself: everything in the scene goes into one stack (laid out exactly as before: inset 0)
      root = doc.createElement("div");
      root.style.cssText = "position:absolute;inset:0;transform-origin:0 0;";
      for (const c of [...host.childNodes]) root.append(c);
      host.append(root);
      RW = f.W; RH = f.H;
      const plate = doc.createElement("div");
      plate.style.cssText = `position:absolute;inset:0;background:var(--x-ground);background-image:linear-gradient(var(--x-line) 1px, transparent 1px), linear-gradient(90deg, var(--x-line) 1px, transparent 1px);background-size:${120 * k}px ${120 * k}px;outline:var(--x-edge) solid var(--x-edge-color);outline-offset:-1px;`;
      root.prepend(plate);
      parts.push({ el: plate, role: 0 });
      const head = root.querySelector(".ml-head");
      const inHead = (e) => head && head.contains(e);
      let surfaces = [...root.querySelectorAll(".ml-panel")].filter((e) => !inHead(e) && e !== plate);
      surfaces = surfaces.filter((e) => !surfaces.some((o) => o !== e && o.contains(e)));
      if (!surfaces.length) surfaces = [...root.children].filter((e) => e !== plate && e !== head && e.offsetWidth > 0);
      surfaces.forEach((e) => parts.push({ el: e, role: 1 }));
      let media = [];
      for (const s of surfaces) media.push(...s.querySelectorAll("img, svg, video, canvas, [data-slot], [data-slot-sample], .ml-label"));
      media = media.filter((e) => !media.some((o) => o !== e && o.contains(e)) && !surfaces.includes(e));
      media.forEach((e) => parts.push({ el: e, role: 2 }));
      if (head) [...head.children].forEach((e, i) => parts.push({ el: e, role: i === 0 ? 3 : 4 }));
      base = 1; // planes sit behind the frame's own plane (top layer at z 0)
    } else {
      // a window / card: its own surface is layer 0, its parts lift off it by depth
      root = ctx.el;
      const b = ctx.box(root);
      RW = b.w; RH = b.h;
      const area = RW * RH;
      const walk = (e, depth) => {
        for (const c of e.children) {
          if (depth > n - 1) return;
          const big = c.offsetWidth * c.offsetHeight > area * 0.015;
          if (!big) continue;
          parts.push({ el: c, role: Math.min(4, depth), byDepth: true });
          walk(c, depth + 1);
        }
      };
      walk(root, 1);
      if (!parts.length) {
        // nothing inside: ghost planes (outlines of the frame) lift off it
        if (getComputedStyle(root).position === "static") root.style.position = "relative";
        for (let i = 1; i < n; i++) parts.push({ el: mk("div", `position:absolute;inset:0;border-radius:inherit;border:${Math.max(1, 2 * k)}px solid color-mix(in srgb, var(--x-accent) ${70 - i * 12}%, transparent);pointer-events:none;`, root), role: i, byDepth: true });
      }
      root.style.transformOrigin = "0 0";
      base = 0;
    }
    for (const q of parts) q.layer = q.byDepth ? Math.min(n - 1, q.role) : LAYER[q.role];
    // each part's nearest part-ancestor (its translateZ is relative to it), and the chains that must keep 3D
    const isPart = new Map(parts.map((q) => [q.el, q]));
    const chain = new Set();
    for (const q of parts) {
      let a = q.el.parentElement;
      q.anc = null;
      while (a && a !== root) { if (isPart.has(a)) { q.anc = isPart.get(a); break; } a = a.parentElement; }
      let c = q.el.parentElement;
      while (c && c !== root.parentElement) { chain.add(c); if (c === root) break; c = c.parentElement; }
    }
    chain.add(root);
    // tags: flat, outside the stack (in the scene), one per layer, on its first plane
    const tagLayer = mk("div", `position:absolute;inset:0;pointer-events:none;z-index:30;`, host);
    const svg = doc.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${f.W} ${f.H}`);
    svg.style.cssText = `position:absolute;left:0;top:0;width:${f.W}px;height:${f.H}px;overflow:visible;`;
    tagLayer.append(svg);
    const tags = [];
    if (p.labels) {
      for (let i = 0; i < n; i++) {
        const q = parts.find((x) => x.layer === i);
        if (!q) continue;
        const name = whole ? NAMES[parts.filter((x) => x.layer === i).map((x) => x.role).sort()[0]] : ["<main>", "<div>", "<figure>", "<span>", "<i>"][i];
        const tag = mk("div", `position:absolute;left:0;top:0;padding:${7 * k}px ${13 * k}px;border-radius:var(--x-radius-s);background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);color:var(--x-ink);font:500 ${24 * k}px/1 var(--x-mono-font);white-space:nowrap;direction:ltr;opacity:0;`, tagLayer, name);
        const line = doc.createElementNS(NS, "line");
        line.setAttribute("stroke", "var(--x-accent)"); line.setAttribute("stroke-width", String(Math.max(1, 1.5 * k)));
        svg.append(line);
        const dot = doc.createElementNS(NS, "circle");
        dot.setAttribute("r", String(4 * k)); dot.setAttribute("fill", "var(--x-accent)");
        svg.append(dot);
        tags.push({ q, tag, line, dot, i, w: tag.offsetWidth, h: tag.offsetHeight });
      }
    }
    const prevOutline = parts.map((q) => q.el.style.outline);
    // each plane's flat box in the stack's own px (measured now, flat): tags are projected from it, never read back from
    // the drawn page (reading a 3D layer's rect mid-frame made the next raster depend on the frame before)
    const rb = whole ? { x: 0, y: 0 } : ctx.box(root);
    for (const q of parts) { const b = ctx.box(q.el); q.box = { x: b.x - rb.x, y: b.y - rb.y, w: b.w, h: b.h }; }

    // timing
    const TILT = [at, at + 0.55], LIFT = [at + 0.15, at + 0.89], OPEN = [at - 0.1 + 0.15, at + 0.9 + 0.15], SETTLE = [TILT[1], TILT[1] + 0.9];
    const flatten = p.ends !== "hold";
    const FLAT = flatten ? [Math.max(at + 1.7, end - 1.25), 0] : [Infinity, Infinity];
    FLAT[1] = FLAT[0] + 0.7;
    ctx.sfx(at, "whoosh.soft", 0.35);
    if (flatten) { ctx.sfx(FLAT[0] - 0.12, "whoosh.heavy", 0.35); ctx.sfx(FLAT[1], "sub", 0.4); }

    const tiltX = ML.clamp(p.tilt, 15, 60), dir = rtl ? -1 : 1;
    const P = Math.round(ML.clamp(Math.max(f.W, f.H) * 1.3, 1100, 2600));
    const ox = RW * 0.5, oy = RH * 0.4;
    const rad = Math.PI / 180;
    // the most any corner of the top plane comes forward after the rotation (CSS order: Z, then Y, then X)
    const nearest = (rx, ry, rz, zTop) => {
      let m = -Infinity;
      for (const [x0, y0] of [[-ox, -oy], [RW - ox, -oy], [-ox, RH - oy], [RW - ox, RH - oy]]) {
        const x1 = x0 * Math.cos(rz * rad) - y0 * Math.sin(rz * rad), y1 = x0 * Math.sin(rz * rad) + y0 * Math.cos(rz * rad);
        const z2 = -x1 * Math.sin(ry * rad) + zTop * Math.cos(ry * rad);
        const z3 = y1 * Math.sin(rx * rad) + z2 * Math.cos(rx * rad);
        m = Math.max(m, z3);
      }
      return Math.max(0, m);
    };
    const clear = () => {
      root.style.transform = "none";
      for (const c of chain) c.style.transformStyle = "";
      for (const q of parts) q.el.style.transform = "";
    };
    return {
      draw(t) {
        const ti = ML.ease(t, TILT[0], TILT[1]);
        const lift = ML.out(t, LIFT[0], LIFT[1]);
        const open = ML.ease(t, OPEN[0], OPEN[1]);
        const se = ML.ease(t, SETTLE[0], SETTLE[1]);
        const flat = ML.ease(t, FLAT[0], FLAT[1]);
        const late = ML.clamp((t - SETTLE[1]) / Math.max(0.5, (flatten ? FLAT[0] : end) - SETTLE[1]));
        const hold = 1 - flat;
        const gap = ML.clamp(p.separation, 40, 300) * k * (0.68 + 0.32 * open) * lift * hold;
        let rx, ry = 0, rz = 0;
        if (p.axis === "xz") {
          rx = tiltX * (1 - 0.1 * se);
          rz = dir * (-0.62 * tiltX * (1 - 0.15 * se) + 5 * Math.sin(t * 0.55));
        } else {
          rx = tiltX * (0.8 + 0.2 * (1 - se)) - 3 * late;
          ry = dir * (-Math.min(30, tiltX) * (0.77 + 0.23 * (1 - se)) + 4 * late + 1.5 * Math.sin(t * 0.55));
        }
        rx *= ti * hold; ry *= ti * hold; rz *= ti * hold;
        const live = ti * hold > 0.0005;
        let zb = 0;
        if (!live) clear();
        else {
          for (const c of chain) c.style.transformStyle = "preserve-3d";
          const Z = (i) => (i - base * (n - 1)) * gap;
          const zTop = Z(n - 1);
          // pushed back by exactly what comes forward, plus a camera drop that creeps 5 % closer late
          zb = nearest(rx, ry, rz, zTop) + P * (0.14 - 0.06 * late) * ti * hold;
          root.style.transform = `translate(${ox.toFixed(2)}px, ${oy.toFixed(2)}px) perspective(${P}px) translateZ(${(-zb).toFixed(2)}px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg) translate(${(-ox).toFixed(2)}px, ${(-oy).toFixed(2)}px)`;
          for (const q of parts) {
            const rel = Z(q.layer) - (q.anc ? Z(q.anc.layer) : 0);
            q.el.style.transform = Math.abs(rel) < 0.01 ? "translateZ(0px)" : `translateZ(${rel.toFixed(2)}px)`;
          }
        }
        // outlines: each plane's fades in over 0.2 s, staggered 0.09 s per layer; gone as it flattens
        const away = flatten ? 1 - ML.ease(t, FLAT[0] - 0.3, FLAT[0] + 0.05) : 1;
        parts.forEach((q, j) => {
          const a = q.layer === 0 && whole ? 0 : ML.ease(t, at + 0.04 + q.layer * 0.09, at + 0.24 + q.layer * 0.09) * away;
          q.el.style.outline = a > 0.004 ? `${Math.max(1, 2 * k).toFixed(1)}px solid color-mix(in srgb, var(--x-accent) ${(a * 85).toFixed(1)}%, transparent)` : prevOutline[j];
          q.el.style.outlineOffset = a > 0.004 ? `${(4 * k).toFixed(1)}px` : "";
        });
        // tags: at each plane's corner as it is drawn now (projected)
        if (tags.length) {
          // a point of the stack (x, y in its px, z its plane's depth) as drawn: the same transform list, worked out
          const cz = Math.cos(rz * rad), sz = Math.sin(rz * rad), cy2 = Math.cos(ry * rad), sy2 = Math.sin(ry * rad), cx2 = Math.cos(rx * rad), sx2 = Math.sin(rx * rad);
          const proj = (x, y, z) => {
            const px0 = x - ox, py0 = y - oy;
            const x1 = px0 * cz - py0 * sz, y1 = px0 * sz + py0 * cz;
            const x2 = x1 * cy2 + z * sy2, z2 = -x1 * sy2 + z * cy2;
            const y3 = y1 * cx2 - z2 * sx2, z3 = y1 * sx2 + z2 * cx2 - zb;
            const w = P / (P - z3);
            return [rb.x + ox + x2 * w, rb.y + oy + y3 * w];
          };
          const Zabs = (i) => (i - base * (n - 1)) * ML.clamp(p.separation, 40, 300) * k * (0.68 + 0.32 * open) * lift * hold;
          for (const g of tags) {
            const a = ML.ease(t, at + 0.3 + g.i * 0.09, at + 0.5 + g.i * 0.09) * away * (live ? 1 : 0);
            g.tag.style.opacity = a.toFixed(4);
            g.line.setAttribute("opacity", a.toFixed(4)); g.dot.setAttribute("opacity", a.toFixed(4));
            if (a <= 0) { g.tag.style.transform = "none"; for (const [n2, v] of [["x1", 0], ["y1", 0], ["x2", 0], ["y2", 0]]) g.line.setAttribute(n2, String(v)); g.dot.setAttribute("cx", "0"); g.dot.setAttribute("cy", "0"); continue; }
            const B = g.q.box, z = Zabs(g.q.layer);
            const cs = [proj(B.x, B.y, z), proj(B.x + B.w, B.y, z), proj(B.x, B.y + B.h, z), proj(B.x + B.w, B.y + B.h, z)];
            const r = { left: Math.min(...cs.map((c) => c[0])), right: Math.max(...cs.map((c) => c[0])), top: Math.min(...cs.map((c) => c[1])), bottom: Math.max(...cs.map((c) => c[1])) };
            // the ground plane's tag hangs off its foot, the others off their top corner on the trailing side
            const foot = g.i === 0 && whole;
            const ax = Math.round(rtl ? (foot ? r.right : r.left) : foot ? r.left : r.right), ay = Math.round(foot ? r.bottom : r.top);
            let tx = rtl ? ax - g.w - 34 * k : ax + 34 * k, ty = foot ? ay + 22 * k : ay - g.h - 22 * k;
            // whole pixels: a layer at a fractional offset keeps the raster offset of the frame before
            tx = Math.round(ML.clamp(tx, 16 * k, f.W - g.w - 16 * k)); ty = Math.round(ML.clamp(ty, 16 * k, f.H - g.h - 16 * k));
            g.tag.style.transform = `translate(${tx}px, ${ty}px)`;
            const lx = rtl ? tx + g.w + 3 : tx - 3, ly = ty + g.h / 2; // the leader stops just short of its pill
            g.line.setAttribute("x1", String(ax)); g.line.setAttribute("y1", String(ay));
            g.line.setAttribute("x2", String(lx)); g.line.setAttribute("y2", ly.toFixed(1));
            g.dot.setAttribute("cx", ax.toFixed(1)); g.dot.setAttribute("cy", ay.toFixed(1));
          }
        }
      },
    };
  },
});
