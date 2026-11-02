// Camera frames a region of a screen or canvas. The explainer engine's view(): pose = translate(PW·ax − W·x·s,
// PH·ay − H·y·s) scale(s) with transform-origin 0 0 — (x, y) shares of the world, (ax, ay) shares of the window (0.5) —
// and MotionGX's live-engine focus (kit.js K.focus + recipes.js F):
//   · box: z = min(vw·0.92 / w, vh·0.9 / h) (and the margin), clamped to [readable floor, cap] (median text · zoom ≥ 22 px;
//     cap 3.2–4); the box's centre goes to the view's centre, clamped so the page never leaves the window (centred when
//     smaller);
//   · nodes: the newest node and what feeds it, framed inside the free area (margin), zoom min(1.2, max(1, fit));
//   · all: the whole canvas, zoom min(1.08, max(0.86, fit));
//   · stops: [[from, to, pose]…] — each node in turn, cubic in-out between, holding on each.
// Tween over `duration` power3.inOut (or cubic in-out, or linear); duration 0 = set. drop_chrome (brainextends detail):
// everything that is not the focus fades to 0 by the tween's half-way. The window moves, never the UI inside it; 2D only
// past 1, so the raster stays sharp. A region wider than the view slides to its part with the most content (RTL
// prefers the right).
// Sources: MengTo/Skills media/html-explainer-video scripts/explainer.js (view) + web-design/html-demo references/film.md
// (MIT); own lib/live-engine/worker/vendor/kit.js; prompt-motion brainextends-opus-5-5-is-f-cking (reference only).
ML.define({
  id: "camera.screen-focus",
  category: "camera",
  name: "Camera frames a region of a screen or canvas",
  does: "The whole window or canvas glides and scales so one chosen part (a box, a set of nodes, a point) fills the view, like a calm camera on the UI.",
  says: ["focus", "proof", "tech", "calm", "flow"],
  energy: 2,
  targets: ["screen", "card", "stage"],
  duration: [0.8, 6],
  params: {
    target: { type: "choice", options: ["box", "nodes", "all", "stops"], default: "box" },
    duration: { type: "number", range: [0, 1.6], default: 0.8, unit: "s" },
    ease: { type: "choice", options: ["power3.inOut", "cubic-in-out", "none"], default: "power3.inOut" },
    zoom_min: { type: "number", range: [0.8, 1], default: 1, unit: "x" },
    zoom_cap: { type: "number", range: [1.2, 4], default: 3.2, unit: "x" },
    margin: { type: "number", range: [24, 96], default: 48, unit: "px" },
    drop_chrome: { type: "bool", default: false },
  },
  pairs: ["camera.readable-establish", "camera.region-tour", "ui.workflow-node-chain"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:media/html-explainer-video", license: "MIT", note: "view() from scripts/explainer.js, film.md; readable-zoom focus from own live-engine kit.js / recipes.js" },
  setup(ctx) {
    const { el, p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const inner = !!(el && el !== stage && el !== host && el.tagName !== "IMG" && el.children.length);
    const view = inner ? el : host;
    const cam = document.createElement("div");
    cam.className = "ml-cam";
    if (inner) {
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      el.style.overflow = "hidden";
      cam.style.cssText = "position:relative;width:100%;transform-origin:0 0";
    } else cam.style.cssText = "position:absolute;inset:0;transform-origin:0 0";
    while (view.firstChild) cam.append(view.firstChild);
    view.append(cam);
    const VW = inner ? el.clientWidth : f.W, VH = inner ? el.clientHeight : f.H;
    const WW = Math.max(VW, inner ? cam.offsetWidth : f.W), WH = Math.max(VH, inner ? cam.offsetHeight : f.H);
    const C = cam.getBoundingClientRect(), k = C.width / (cam.offsetWidth || 1) || 1;
    const boxOf = (n) => { const r = n.getBoundingClientRect(); return { x: (r.left - C.left) / k, y: (r.top - C.top) / k, w: r.width / k, h: r.height / k }; };
    const shown = (n) => { const cs = getComputedStyle(n); return cs.display !== "none" && cs.visibility !== "hidden" && n.getClientRects().length; };
    const union = (bs) => { const x0 = Math.min(...bs.map((b) => b.x)), y0 = Math.min(...bs.map((b) => b.y)), x1 = Math.max(...bs.map((b) => b.x + b.w)), y1 = Math.max(...bs.map((b) => b.y + b.h)); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; };
    const grow = (b, m) => ({ x: b.x - m, y: b.y - m, w: b.w + 2 * m, h: b.h + 2 * m });

    // readable floor: the median text size times the zoom stays ≥ 22 px
    const sizes = [], leaves = [];
    for (const n of cam.querySelectorAll("*")) {
      if (!shown(n)) continue;
      const media = n.matches("img, svg, canvas, video, input, button");
      const text = [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
      if (n.closest("svg") && n.tagName.toLowerCase() !== "svg") continue;
      if (text) sizes.push(parseFloat(getComputedStyle(n).fontSize));
      if (text || media) leaves.push(n);
    }
    sizes.sort((a, b) => a - b);
    const med = sizes.length ? sizes[Math.floor(sizes.length / 2)] : 0;
    const CAP = ML.clamp(p.zoom_cap, 1.2, 4), M = ML.clamp(p.margin, 24, 96);
    const floor = Math.max(ML.clamp(p.zoom_min, 0.8, 1), med && med < 22 ? Math.min(CAP, 22 / med) : 0);

    // the nodes of a canvas: [data-node], else the children of the first container holding three or more
    let nodes = [...cam.querySelectorAll("[data-node]")].filter(shown);
    if (nodes.length < 2) {
      const list = [...cam.querySelectorAll("*")].find((n) => !n.closest("svg") && [...n.children].filter(shown).length >= 3 && n !== cam);
      nodes = list ? [...list.children].filter(shown) : [];
    }
    const pick = cam.querySelector("[data-focus]") || cam.querySelector("img, canvas, video") || cam.querySelector(".ml-panel") || cam.firstElementChild;

    const poseFor = (b, mode) => {
      const fit = Math.min((VW * 0.92) / b.w, (VH * 0.9) / b.h, (VW - 2 * M) / b.w, (VH - 2 * M) / b.h);
      let s;
      if (mode === "nodes") s = Math.min(1.2, Math.max(1, fit));
      else if (mode === "all") s = Math.min(1.08, Math.max(0.86, fit));
      else s = ML.clamp(fit, floor, CAP);
      s = Math.max(s, mode === "all" ? 0.8 : ML.clamp(p.zoom_min, 0.8, 1));
      let cx = b.x + b.w / 2;
      // wider than the view: slide to the part with the most content (RTL prefers the right)
      const hw = VW / (2 * s);
      if (b.w > 2 * hw * 1.05) {
        const inside = leaves.map(boxOf).filter((r) => r.y < b.y + b.h && r.y + r.h > b.y && r.x < b.x + b.w && r.x + r.w > b.x);
        let best = null;
        for (const x0 of inside.flatMap((r) => [r.x - 12, r.x + r.w + 12 - 2 * hw]).map((x) => ML.clamp(x, b.x, Math.max(b.x, b.x + b.w - 2 * hw)))) {
          const v = inside.reduce((acc, r) => acc + Math.max(0, Math.min(r.x + r.w, x0 + 2 * hw) - Math.max(r.x, x0)) * Math.min(r.h, 200), 0);
          if (!best || v > best.v + 1 || (Math.abs(v - best.v) <= 1 && (ctx.rtl ? x0 > best.x0 : x0 < best.x0))) best = { x0, v };
        }
        if (best && best.v > 0) cx = best.x0 + hw;
      }
      return { s, cx, cy: b.y + b.h / 2 };
    };
    const rest = { s: 1, cx: VW / 2, cy: VH / 2 };
    const D = ML.clamp(p.duration, 0, 1.6);
    const segs = [];
    let focusNode = pick;
    if (p.target === "stops" && nodes.length >= 2) {
      const list = nodes.slice(0, 5);
      const step = Math.max(D + 0.3, (end - at) / list.length);
      list.forEach((n, i) => { segs.push([at + i * step, at + i * step + D, poseFor(boxOf(n), "box")]); ctx.sfx(Math.max(0, at + i * step - 0.05), "whoosh.soft", 0.16); });
      focusNode = null;
    } else {
      let b, mode = p.target;
      if (mode === "nodes" && nodes.length >= 2) { const last = nodes[nodes.length - 1]; b = grow(union([boxOf(nodes[nodes.length - 2]), boxOf(last)]), M); focusNode = last.parentElement; }
      else if (mode === "all") { b = leaves.length ? grow(union(leaves.map(boxOf)), M) : { x: 0, y: 0, w: WW, h: WH }; focusNode = null; }
      else { mode = "box"; b = pick ? boxOf(pick) : { x: 0, y: 0, w: WW, h: WH }; }
      segs.push([at, at + D, poseFor(b, mode)]);
      ctx.sfx(Math.max(0, at - 0.05), "whoosh.soft", 0.22);
    }
    // drop_chrome: the siblings along the focus's path up to the window fade out
    const others = [];
    if (p.drop_chrome && focusNode && focusNode !== cam) {
      for (let n = focusNode; n && n !== cam; n = n.parentElement) for (const s of n.parentElement ? n.parentElement.children : []) if (s !== n && !others.includes(s) && !s.contains(focusNode)) others.push(s);
    }
    const p3 = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const bz = ML.bezier(0.45, 0, 0.2, 1);
    const fn = p.ease === "none" ? (x) => x : p.ease === "cubic-in-out" ? bz : p3;
    const poseAt = (t) => {
      let cur = rest;
      for (const [a, b, q] of segs) {
        if (t < a) break;
        const e = b > a ? fn(ML.lin(t, a, b)) : 1;
        cur = { s: Math.exp(Math.log(cur.s) + (Math.log(q.s) - Math.log(cur.s)) * e), cx: cur.cx + (q.cx - cur.cx) * e, cy: cur.cy + (q.cy - cur.cy) * e };
        if (t < b) break;
      }
      return cur;
    };
    const [a0, b0] = segs.length ? [segs[0][0], segs[0][1]] : [at, at];
    return {
      draw(t) {
        const q = poseAt(t);
        const tx = q.s * WW >= VW ? ML.clamp(VW / 2 - q.s * q.cx, VW - q.s * WW, 0) : (VW - q.s * WW) / 2;
        const ty = q.s * WH >= VH ? ML.clamp(VH / 2 - q.s * q.cy, VH - q.s * WH, 0) : (VH - q.s * WH) / 2;
        cam.style.transform = Math.abs(q.s - 1) < 1e-4 && Math.abs(tx) < 0.01 && Math.abs(ty) < 0.01 ? "none" : `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${q.s.toFixed(4)})`;
        if (others.length) {
          const o = 1 - (b0 > a0 ? ML.lin(t, a0, a0 + (b0 - a0) * 0.5) : t >= a0 ? 1 : 0);
          for (const n of others) n.style.opacity = o.toFixed(4);
        }
      },
    };
  },
});
