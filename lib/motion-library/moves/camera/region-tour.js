// Camera tours a screen's regions. Ported from MotionGX's live engine (recipes.js R.tour / R.regions / F): the screen
// opens on its establishing view, then the stops are the director's focus regions ([data-focus], minus nav) followed by
// the best-scored content blocks (scored by the stats / rows / fields / buttons / charts / pictures inside, their size
// and height): 1 stop under 3.5 s, 2 under 5.5 s, else 3 (never more than `stops`). The span from start + 1 s is shared
// evenly. Each stop: the camera focuses on the block over focus_time power3.inOut (zoom so it fills 92% of the width /
// 90% of the height, never under the readable zoom, cap 3.2), then a hold push to the block shrunk to ×0.92, linear,
// until the next stop — never a still frame. A block wider than the view at its readable zoom is panned end to end
// (sine.inOut; RTL starts at the right). Elements inside come alive 0.5 s after the camera arrives (a ring that fits
// them). The window moves, never the UI inside it; 2D only, so text stays sharp; the view never leaves the page.
// Source: own, lib/live-engine/worker/vendor/recipes.js (R.tour).
ML.define({
  id: "camera.region-tour",
  category: "camera",
  name: "Camera tours a screen's regions",
  does: "The camera visits two or three key areas of a real screen in turn, slowly pushing in on each.",
  says: ["proof", "focus", "flow"],
  energy: 2,
  targets: ["screen"],
  duration: [3, 10],
  params: {
    stops: { type: "number", range: [1, 3], default: 2 },
    hold_push: { type: "bool", default: true },
    pan_wide: { type: "bool", default: true },
    focus_time: { type: "number", range: [0.5, 1.2], default: 0.8, unit: "s" },
  },
  pairs: ["camera.readable-establish", "ui.ui-come-alive", "ui.focus-ring"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "own:lib/live-engine/worker/vendor/recipes.js", license: "own", note: "R.tour, R.regions, the readable-zoom focus F" },
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

    // readability: the median text size → the zoom below which text renders under 22 px
    const sizes = [];
    for (const n of cam.querySelectorAll("*")) if ([...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim().length > 1) && shown(n)) sizes.push(parseFloat(getComputedStyle(n).fontSize));
    sizes.sort((a, b) => a - b);
    const med = sizes.length ? sizes[Math.floor(sizes.length / 2)] : 0;
    const ZMAX = 3.2, minZoom = med && med < 22 ? Math.min(ZMAX, 22 / med) : 1;
    const viewA = VW * VH;
    const isNav = (n, b) => n.closest("nav, aside, [role=navigation], [data-nav]") || (b.w < VW * 0.22 && b.h > VH * 0.6 && (b.x < 4 || b.x + b.w > WW - 4));

    // the regions: the director's focus first, then content blocks by score
    const focus = [...cam.querySelectorAll("[data-focus]")].filter(shown).map((n) => ({ n, b: boxOf(n), s: 1e6 })).filter((r) => !isNav(r.n, r.b));
    const cands = [];
    for (const n of cam.querySelectorAll("*")) {
      if (n.closest("svg") && n.tagName.toLowerCase() !== "svg") continue;
      if (!shown(n)) continue;
      const b = boxOf(n), a = (b.w * b.h) / viewA;
      if (a < 0.02 || a > 0.32 || b.w < VW * 0.15 || b.h < 24 || isNav(n, b)) continue;
      const leaves = [...n.querySelectorAll("*")].filter((x) => [...x.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()));
      const stats = leaves.filter((x) => /\d/.test(x.textContent) && parseFloat(getComputedStyle(x).fontSize) >= (med || 16) * 1.3).length + (/\d/.test(n.textContent) && parseFloat(getComputedStyle(n).fontSize) >= (med || 16) * 1.3 && !n.children.length ? 1 : 0);
      const rows = Math.min(6, n.children.length);
      const fields = n.querySelectorAll("input, textarea, select").length;
      const buttons = n.querySelectorAll("button, [role=button]").length;
      const charts = n.querySelectorAll("svg, canvas").length + (n.matches("svg, canvas") ? 1 : 0);
      const pics = n.querySelectorAll("img, video").length + (n.matches("img, video") ? 1 : 0);
      const textual = leaves.length + (n.children.length ? 0 : n.textContent.trim() ? 1 : 0);
      if (!textual && !pics && !charts && !fields) continue;
      const score = stats * 3 + rows + fields * 2 + buttons * 1.5 + charts * 2.5 + pics * 2 + Math.min(1, a * 6) * 2 + Math.min(1, b.h / (VH * 0.25));
      cands.push({ n, b, s: score });
    }
    cands.sort((a, b) => b.s - a.s);
    const overlap = (a, b) => { const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)), iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)); return (ix * iy) / Math.min(a.w * a.h, b.w * b.h); };
    const chosen = [];
    for (const r of [...focus, ...cands]) if (chosen.length < 3 && !chosen.some((c) => overlap(c.b, r.b) > 0.35)) chosen.push(r);
    const d = end - at;
    const nMax = d >= 5.5 ? 3 : d >= 3.5 ? 2 : 1;
    let stops = chosen.slice(0, Math.min(nMax, Math.round(ML.clamp(p.stops, 1, 3))));
    if (!focus.length) stops = stops.sort((a, b) => a.b.y - b.b.y || (ctx.rtl ? b.b.x - a.b.x : a.b.x - b.b.x)); // reading order

    // poses: { s, cx, cy } — the zoom and the world point at the view's centre
    const rest = { s: 1, cx: VW / 2, cy: VH / 2 };
    const fitZ = (b) => ML.clamp(Math.min((VW * 0.92) / b.w, (VH * 0.9) / b.h), Math.max(1, minZoom), ZMAX);
    const segs = []; // [a, b, pose, easeFn]
    const FT = ML.clamp(p.focus_time, 0.5, 1.2);
    const t0 = end - (at + 1) >= 1.2 * stops.length ? at + 1 : at + 0.3;
    const span = Math.max(0.6, (end - 0.2 - t0) / Math.max(1, stops.length));
    const p3 = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const sine = (x) => -(Math.cos(Math.PI * x) - 1) / 2;
    const lin = (x) => x;
    const alive = [];
    stops.forEach((r, i) => {
      const a = t0 + i * span, holdEnd = Math.min(end, a + span);
      const b = r.b, z = fitZ(b), viewW = VW / z;
      if (p.pan_wide && b.w > viewW * 1.15) {
        const hh = Math.min(b.h, VH / z), y = b.y + hh / 2;
        const xa = ctx.rtl ? b.x + b.w - viewW / 2 : b.x + viewW / 2, xb = ctx.rtl ? b.x + viewW / 2 : b.x + b.w - viewW / 2;
        segs.push([a, a + FT, { s: z, cx: xa, cy: y }, p3]);
        segs.push([a + FT, holdEnd, { s: z, cx: xb, cy: y }, sine]);
      } else {
        segs.push([a, a + FT, { s: z, cx: b.x + b.w / 2, cy: b.y + b.h / 2 }, p3]);
        // slow push while holding: the box shrunk to ×0.92, linear until the next stop
        if (p.hold_push) segs.push([a + FT, holdEnd, { s: Math.min(ZMAX, z / 0.92), cx: b.x + b.w / 2, cy: b.y + b.h / 2 }, lin]);
      }
      alive.push({ n: r.n, from: a + 0.5, to: holdEnd - 0.15 });
      ctx.sfx(Math.max(0, a - 0.05), "whoosh.soft", 0.2);
    });
    const poseAt = (t) => {
      let cur = rest;
      for (const [a, b, q, fn] of segs) {
        if (t <= a) break;
        const e = fn(ML.lin(t, a, b));
        cur = { s: Math.exp(Math.log(cur.s) + (Math.log(q.s) - Math.log(cur.s)) * e), cx: cur.cx + (q.cx - cur.cx) * e, cy: cur.cy + (q.cy - cur.cy) * e };
        if (t < b) break;
      }
      return cur;
    };
    return {
      draw(t) {
        const q = poseAt(t);
        const tx = q.s * WW >= VW ? ML.clamp(VW / 2 - q.s * q.cx, VW - q.s * WW, 0) : (VW - q.s * WW) / 2;
        const ty = q.s * WH >= VH ? ML.clamp(VH / 2 - q.s * q.cy, VH - q.s * WH, 0) : (VH - q.s * WH) / 2;
        cam.style.transform = q.s === 1 && !tx && !ty ? "none" : `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${q.s.toFixed(4)})`;
        // what the camera arrived on comes alive: a ring that fits it
        for (const r of alive) ML.ring(r.n, t, r.from, r.to, 6);
      },
    };
  },
});
