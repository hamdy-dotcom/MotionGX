// Camera follows a recorded clip: a real screen recording plays in the window while the camera eases from one recorded
// action to the next. Ported from MotionGX's live engine (R.clip in lib/live-engine/worker/vendor/recipes.js), made a
// pure function of t:
//   · the clip is an image sequence swapped by time: frame = floor((t − a)·fps·rate), rate = max(rate, clip length /
//     window length) — sped up to fit, never slowed; a short clip holds its last frame. Every frame is decoded in setup
//     and stacked, one shown per frame, so a seek never waits on a load;
//   · base zoom = max(readable zoom (median text · zoom ≥ 22 px), the zoom that fills the window's height or width) —
//     or `fixed_zoom` — never past the recording's real pixels;
//   · for each recorded mark (click, type, scroll target) the camera eases to the mark's box over
//     min(0.7, max(0.3, gap·0.8)) s on power2.inOut, starting `lead` s before the mark so the action lands in frame;
//   · translate + scale on a .ui-cam layer (origin 0 0), clamped so the recording never leaves the window.
// The clip, on the target window: data-clip-frames="url,url,…" (or data-clip-dir + data-clip-n [+ data-clip-ext jpg]),
// data-clip-fps (10), data-clip-w / -h (the recording's px, else the first frame's), data-clip-text (its median text px, for
// the readable zoom; a recording's text can't be measured, so without it readable falls back to min_zoom), data-clip-marks='[{"t":1.2,
// "box":[x,y,w,h],"kind":"click"},…]' (clip seconds, recording px). Without frames the window's own live content is the
// recording (one still) and its marks are its [data-mark] parts, else its controls and figures, in reading order; no click
// happened on a still, so those stops land with a quiet tap, not a click.
// Source: own lib/live-engine/worker/vendor/recipes.js (R.clip).
ML.define({
  id: "camera.clip-follow",
  category: "camera",
  name: "Camera follows a recorded clip",
  does: "A real screen recording plays in the window while the camera eases from one recorded action to the next.",
  says: ["proof", "flow", "tech"],
  energy: 2,
  targets: ["screen"],
  duration: [2, 12],
  params: {
    rate: { type: "number", range: [1, 4], default: 1, unit: "x" },
    lead: { type: "number", range: [0.2, 0.6], default: 0.35, unit: "s" },
    zoom: { type: "choice", options: ["readable", "fill", "fixed"], default: "readable" },
    fixed_zoom: { type: "number", range: [1, 3], default: 1.6, unit: "x" },
    min_zoom: { type: "number", range: [1, 2.5], default: 1.4, unit: "x" },
  },
  pairs: ["ui.cursor-glide-click", "camera.screen-focus", "device.app-window-frame"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "click",
  source: { from: "own:lib/live-engine/worker/vendor/recipes.js", license: "own", note: "R.clip: frame swap by time, readable / fill zoom, eased camera to each recorded mark" },
  async setup(ctx) {
    const { el, p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const doc = document;
    const win = el && el !== stage && el !== host ? el : host;
    const inner = win !== host;
    const ds = win.dataset || {};
    // ── the recording ──
    let urls = [];
    if (ds.clipFrames) urls = ds.clipFrames.split(",").map((s) => s.trim()).filter(Boolean);
    else if (ds.clipDir && +ds.clipN > 0) { const n = +ds.clipN, ext = ds.clipExt || "jpg"; for (let i = 1; i <= n; i++) urls.push(`${ds.clipDir}/${String(i).padStart(4, "0")}.${ext}`); }
    const fps = +ds.clipFps > 0 ? +ds.clipFps : 10;
    let marks = [];
    try { marks = JSON.parse(ds.clipMarks || "[]").filter((m) => m && Array.isArray(m.box) && m.box.length === 4 && Number.isFinite(+m.t)); } catch { marks = []; }
    marks.sort((a, b) => a.t - b.t);

    if (inner) { if (getComputedStyle(win).position === "static") win.style.position = "relative"; win.style.overflow = "hidden"; }
    const VW = inner ? win.clientWidth : f.W, VH = inner ? win.clientHeight : f.H;
    const cam = doc.createElement("div");
    cam.className = "ui-cam ml-cam";
    cam.style.cssText = "position:absolute;left:0;top:0;transform-origin:0 0";
    let RW, RH, frames = [], live = false, sizes = [];
    if (urls.length) {
      // every frame decoded now and stacked: a seek only flips which one shows
      frames = await Promise.all(urls.map((u) => new Promise((res) => { const im = new Image(); im.decoding = "sync"; im.onload = im.onerror = () => res(im); im.src = u; })));
      frames = frames.filter((im) => im.naturalWidth > 0);
    }
    if (frames.length) {
      RW = +ds.clipW || frames[0].naturalWidth; RH = +ds.clipH || frames[0].naturalHeight;
      cam.style.width = RW + "px"; cam.style.height = RH + "px";
      for (const im of frames) { im.style.cssText = `position:absolute;left:0;top:0;width:${RW}px;height:${RH}px;visibility:hidden`; im.alt = ""; cam.append(im); }
      win.replaceChildren(cam);
    } else {
      // no frames: the window's own live content is the recording (a still)
      live = true;
      RW = VW; RH = VH;
      cam.style.width = RW + "px"; cam.style.height = RH + "px";
      while (win.firstChild) cam.append(win.firstChild);
      win.append(cam);
      const C = cam.getBoundingClientRect(), k = C.width / (cam.offsetWidth || 1) || 1;
      const boxOf = (n) => { const r = n.getBoundingClientRect(); return [(r.left - C.left) / k, (r.top - C.top) / k, r.width / k, r.height / k]; };
      const shown = (n) => n.getClientRects().length > 0 && getComputedStyle(n).visibility !== "hidden";
      let parts = [...cam.querySelectorAll("[data-mark]")].filter(shown);
      if (!parts.length) {
        const seen = new Set();
        for (const n of cam.querySelectorAll("button, input, [role=button], .ml-label, .ml-panel > *, img, svg")) {
          if (!shown(n) || n.closest("svg") !== null && n.tagName.toLowerCase() !== "svg") continue;
          if ([...seen].some((s) => s.contains(n) || n.contains(s))) continue;
          const b = boxOf(n);
          if (b[2] * b[3] < 400 || b[2] > RW * 0.95) continue;
          seen.add(n);
        }
        parts = [...seen];
      }
      // reading order: top to bottom, then along the line (right to left in RTL)
      const bs = parts.map((n) => ({ n, b: boxOf(n) })).sort((a, b) => (Math.abs(a.b[1] - b.b[1]) > 24 ? a.b[1] - b.b[1] : ctx.rtl ? b.b[0] - a.b[0] : a.b[0] - b.b[0])).slice(0, 6);
      const span = Math.max(0.6, end - at - 0.6);
      marks = bs.map((x, i) => ({ t: 0.35 + (i * span) / Math.max(1, bs.length), box: x.b, kind: "stop" }));
      for (const n of cam.querySelectorAll("*")) if ([...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()) && shown(n)) sizes.push(parseFloat(getComputedStyle(n).fontSize));
    }

    // ── the clock: sped up to fit, never slowed; a short clip holds its last frame ──
    const n = frames.length, clipLen = n ? n / fps : 0;
    const a = at, b = Math.max(a + 0.5, end - 0.3);
    const rate = Math.max(ML.clamp(p.rate, 1, 4), clipLen ? clipLen / (b - a) : 1);
    // ── the zoom ──
    sizes.sort((x, y) => x - y);
    const med = sizes.length ? sizes[Math.floor(sizes.length / 2)] : +ds.clipText || 0;
    const fill = Math.max(VW / RW, VH / RH);
    const readable = med && med < 22 ? 22 / med : 1;
    // never past the recording's real pixels (a live still is vector: no cap past 3); a smaller recording is centred
    const cap = live ? 3 : Math.max(0.05, frames[0].naturalWidth / RW);
    let z = p.zoom === "fixed" ? ML.clamp(p.fixed_zoom, 1, 3) : p.zoom === "fill" ? fill : Math.max(readable, fill);
    if (marks.length && p.zoom === "readable") z = Math.max(z, ML.clamp(p.min_zoom, 1, 2.5)); // a camera that can follow
    z = Math.min(Math.max(z, fill), cap);
    const mr = n ? rate : 1; // a live still's marks are already in screen seconds
    // the pose that centres a box, clamped so the recording never leaves the window (centred when smaller)
    const poseOf = (bx) => {
      const cx = bx[0] + bx[2] / 2, cy = bx[1] + bx[3] / 2, cw = RW * z, ch = RH * z;
      const x = cw > VW ? ML.clamp(VW / 2 - cx * z, VW - cw, 0) : (VW - cw) / 2;
      const y = ch > VH ? ML.clamp(VH / 2 - cy * z, VH - ch, 0) : (VH - ch) / 2;
      return { x, y };
    };
    const lead = ML.clamp(p.lead, 0.2, 0.6);
    const first = marks[0] ? marks[0].box : [0, 0, RW, RH];
    const segs = marks.map((m, i) => {
      const tm = a + m.t / mr, gap = i ? (m.t - marks[i - 1].t) / mr : 0.6;
      const d = Math.min(0.7, Math.max(0.3, gap * 0.8)), s = Math.max(at, tm - lead);
      if (tm <= end) ctx.sfx(tm, m.kind === "type" ? "key" : m.kind === "click" ? "click" : "tap", m.kind === "type" || m.kind === "click" ? 0.22 : 0.12);
      return [s, s + d, poseOf(m.box)];
    });
    const p2 = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    const rest = poseOf(first);
    return {
      draw(t) {
        // the frame on screen
        if (n) {
          const i = t < a ? 0 : Math.min(n - 1, Math.floor((t - a) * fps * rate));
          frames.forEach((im, k) => (im.style.visibility = k === i ? "visible" : "hidden"));
        }
        // the camera
        let cur = rest;
        for (const [s, e, q] of segs) {
          if (t < s) break;
          const u = p2(ML.lin(t, s, e));
          // every begun segment blends in (never stops at the first unfinished one): close marks overlap, and the next
          // one must take over from its own start or the camera jumps when the earlier one ends
          cur = { x: cur.x + (q.x - cur.x) * u, y: cur.y + (q.y - cur.y) * u };
        }
        cam.style.transform = `translate(${cur.x.toFixed(2)}px, ${cur.y.toFixed(2)}px) scale(${z.toFixed(4)})`;
      },
    };
  },
});
