// Opening view that reads: the framing a live screen opens on, so its first frame shows its message big. Ported from
// MotionGX's live engine (recipes.js R.mainBox / R.establish / R.minZoom): the visible content rects (text, pictures,
// fields, buttons) are grouped into vertical clusters — a gap over 12% of the view starts a new one — and the cluster
// with the most content is the main box.
//   · content covers < 15% of the view (a confirmation: a small ✓ and a line on white) → zoom so the main box fills
//     fill_width of the width or 80% of the height (≥ 1, capped);
//   · else all the content is small (its box < 40% of the view) → it fills 98% of the width / 85% of the height;
//   · else its text renders under 22 px at full width (a dashboard, a table) → open on the preferred region
//     ([data-focus]) or the main box, at the zoom where it reads;
//   · else the whole width.
// Applied with duration 0 at scene start (it is the framing, not a move); glide > 0 eases into it from the full view.
// The window moves, never the UI inside it; 2D only, so the raster stays sharp; the view never leaves the page.
// Source: own, lib/live-engine/worker/vendor/recipes.js.
ML.define({
  id: "camera.readable-establish",
  category: "camera",
  name: "Opening view that reads",
  does: "The first frame of a live screen shows its message big — a mostly blank page opens zoomed onto its content.",
  says: ["focus", "simplicity"],
  energy: 1,
  targets: ["screen"],
  duration: [0, 1],
  params: {
    fill_width: { type: "number", range: [0.92, 0.98], default: 0.92 },
    zoom_cap: { type: "number", range: [1, 3.2], default: 3.2, unit: "x" },
    glide: { type: "number", range: [0, 1], default: 0, unit: "s" },
  },
  pairs: ["camera.region-tour", "camera.screen-focus", "ui.type-into-field"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "own:lib/live-engine/worker/vendor/recipes.js", license: "own", note: "R.mainBox / R.establish / R.minZoom" },
  setup(ctx) {
    const { el, p, at, stage, f } = ctx;
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

    // the content rects, in world px
    const C = cam.getBoundingClientRect(), k = C.width / (cam.offsetWidth || 1) || 1;
    const rects = [], sizes = [];
    for (const n of cam.querySelectorAll("*")) {
      const media = n.matches("img, svg, canvas, video, input, textarea, select, button");
      const text = [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
      if (!media && !text) continue;
      if (n.closest("svg") && n.tagName.toLowerCase() !== "svg") continue;
      const cs = getComputedStyle(n);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      const r = n.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const b = [(r.left - C.left) / k, (r.top - C.top) / k, r.width / k, r.height / k];
      if (b[2] >= WW * 0.97) continue;
      rects.push(b);
      if (text && !media) sizes.push(parseFloat(cs.fontSize) * (r.height / k / (n.offsetHeight || r.height / k) || 1));
    }
    sizes.sort((a, b) => a - b);
    const textPx = sizes.length ? sizes[Math.floor(sizes.length / 2)] : null;
    const CAP = ML.clamp(p.zoom_cap, 1, 3.2);
    const minZoom = textPx && textPx < 22 ? Math.min(CAP, 22 / textPx) : 1;
    const seenH = Math.min(WH, VH);
    const vis = rects.filter((r) => r[1] < seenH).sort((a, b) => a[1] - b[1]);
    const union = (list) => { const x0 = Math.min(...list.map((b) => b[0])), y0 = Math.min(...list.map((b) => b[1])), x1 = Math.max(...list.map((b) => b[0] + b[2])), y1 = Math.max(...list.map((b) => b[1] + b[3])); return [x0, y0, x1 - x0, y1 - y0]; };

    let box = null, z = 1;
    if (vis.length) {
      // vertical clusters: a gap over 12% of the view starts a new one; the cluster with the most content wins
      const groups = [];
      for (const r of vis) { const g = groups[groups.length - 1]; if (g && r[1] <= g.y1 + seenH * 0.12) { g.items.push(r); g.y1 = Math.max(g.y1, r[1] + r[3]); } else groups.push({ items: [r], y1: r[1] + r[3] }); }
      const area = (g) => g.items.reduce((a, r) => a + r[2] * r[3], 0);
      const best = groups.slice().sort((a, b) => area(b) - area(a))[0];
      const main = union(best.items);
      const cover = vis.reduce((a, r) => a + Math.min(r[2] * r[3], VW * seenH), 0) / (VW * seenH);
      const cb = union(vis);
      if (cover < 0.15 && main[2] * main[3] < 0.3 * VW * seenH) {
        const pad = 10;
        box = [Math.max(0, main[0] - pad), Math.max(0, main[1] - pad), Math.min(WW, main[2] + 2 * pad), main[3] + 2 * pad];
        z = Math.min((VW * ML.clamp(p.fill_width, 0.92, 0.98)) / box[2], (VH * 0.8) / box[3]);
      } else if (cb[2] * Math.min(cb[3], seenH - cb[1]) < 0.4 * VW * seenH) {
        box = cb;
        z = Math.min((VW * 0.98) / cb[2], (VH * 0.85) / cb[3]);
      } else if (minZoom > 1.01) {
        const pref = cam.querySelector("[data-focus]");
        if (pref) { const r = pref.getBoundingClientRect(); box = [(r.left - C.left) / k, (r.top - C.top) / k, r.width / k, r.height / k]; }
        else box = main;
        z = Math.max(minZoom, Math.min((VW * 0.92) / box[2], (VH * 0.9) / box[3]));
      }
    }
    z = ML.clamp(z, 1, CAP);
    // never past a picture's pixels: the pictures in the opening view limit the zoom (this outranks the readable floor)
    const pixLimit = (n) => { // how much further a picture may scale before it runs past its own pixels (a vector has no limit)
      const nw = n.naturalWidth || n.videoWidth || 0, nh = n.naturalHeight || n.videoHeight || 0;
      if (!nw || !nh || /\.svg|image\/svg/i.test(n.currentSrc || n.src || "")) return Infinity;
      const r = n.getBoundingClientRect(), K = k, fit = getComputedStyle(n).objectFit;
      return Math.max(1, 1 / (fit === "contain" ? Math.min(r.width / K / nw, r.height / K / nh) : Math.max(r.width / K / nw, r.height / K / nh)));
    };
    if (box && z > 1) for (const n of cam.querySelectorAll("img, video")) {
      const r = n.getBoundingClientRect(), x = (r.left - C.left) / k, y = (r.top - C.top) / k, cx = box[0] + box[2] / 2, cy = box[1] + box[3] / 2;
      if (x < cx + VW / (2 * z) && x + r.width / k > cx - VW / (2 * z) && y < cy + VH / (2 * z) && y + r.height / k > cy - VH / (2 * z)) z = Math.max(1, Math.min(z, pixLimit(n)));
    }
    let tx = 0, ty = 0;
    if (box && z > 1.001) {
      const cx = box[0] + box[2] / 2, cy = box[1] + box[3] / 2;
      tx = ML.clamp(VW / 2 - z * cx, VW - z * WW, 0);
      ty = ML.clamp(VH / 2 - z * cy, VH - z * WH, 0);
    }
    const G = ML.clamp(p.glide, 0, 1);
    const start = G > 0 ? at : ctx.from ?? at;
    return {
      draw(t) {
        if (z <= 1.001) { cam.style.transform = "none"; return; }
        // the framing holds from the scene's first frame; with glide it eases in from the full view
        const e = G > 0 ? ML.ease(t, start, start + G) : 1;
        const s = Math.exp(Math.log(z) * e);
        cam.style.transform = `translate(${(tx * (s - 1) / (z - 1)).toFixed(2)}px, ${(ty * (s - 1) / (z - 1)).toFixed(2)}px) scale(${s.toFixed(4)})`;
      },
    };
  },
});
