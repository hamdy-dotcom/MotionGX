// Image sequence scrub: a product turns, opens or assembles through a series of frames, stepped exactly in step with
// the story. frame = clamp(round(p * (frameCount - 1)), 0, frameCount - 1), p the move's progress through a chosen
// curve (no implicit easing in the mapping), forward / reverse / ping-pong. Frames come from (in order): the `frames`
// param or the target's data-frames (a comma list of URLs, or one URL with {i} / {i3} for the index), the target's own
// <video> (every frame drawn once in setup by seeking, so a frame is the same picture every time), else a sequence
// built from the target picture itself (its tiles assembling, or the picture turning on a turntable). All frames are
// decoded before the first draw; the poster (frame 0, or the picture itself) holds until the run starts. Renderers:
// frames (an <img> whose src steps), canvas (painted, DPR cap 2), svg (<image> href steps), video (pre-drawn frames).
// Object-fit + an explicit focal point, so the subject survives 9:16 crops. The picture is never enlarged past its pixels.
// Source: MengTo/Skills web-design/scroll-scrubbed-visual-sequence (MIT): one position, one state — progress is the
// only input, reversible, no hidden timeline; here the clock is t instead of scroll.
ML.define({
  id: "photo.frame-sequence-scrub",
  category: "photo",
  name: "Image sequence scrub",
  does: "A product turns, opens or assembles through a series of real frames, played forward and back exactly in step with the story.",
  says: ["change", "precision", "proof"],
  energy: 2,
  targets: ["image", "screen"],
  duration: [1, 6],
  params: {
    renderer: { type: "choice", options: ["frames", "video", "canvas", "svg"], default: "frames" },
    direction: { type: "choice", options: ["forward", "reverse", "ping-pong"], default: "forward" },
    curve: { type: "choice", options: ["none", "power1.inOut", "power2.out", "sine.inOut"], default: "power1.inOut" },
    frame_count: { type: "number", range: [24, 240], default: 96 },
    frames: { type: "text", default: "" },
    built: { type: "choice", options: ["assemble", "turn"], default: "assemble" },
    fit: { type: "choice", options: ["cover", "contain"], default: "cover" },
    focus_x: { type: "number", range: [0, 1], default: 0.5 },
    focus_y: { type: "number", range: [0, 1], default: 0.5 },
    readout: { type: "bool", default: true },
  },
  pairs: ["camera.push-in", "data.count-up"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:web-design/scroll-scrubbed-visual-sequence", license: "MIT" },
  async setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const host = ctx.scene || ctx.stage;
    const img = el.tagName === "IMG" ? el : el.querySelector("img");
    const vid = el.tagName === "VIDEO" ? el : el.querySelector("video");
    const b = ctx.box(el);
    const N = Math.round(ML.clamp(p.frame_count, 24, 240));
    const radius = getComputedStyle(el).borderRadius || "var(--x-pic-radius)";
    const curves = {
      none: (x) => x,
      "power1.inOut": (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
      "power2.out": (x) => 1 - Math.pow(1 - x, 3),
      "sine.inOut": (x) => -(Math.cos(Math.PI * x) - 1) / 2,
    };
    const curve = curves[p.curve] || curves.none;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const mk = (tag, css, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (parent) parent.append(e); return e; };
    const wrap = mk("div", `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;overflow:hidden;border-radius:${radius};pointer-events:none;z-index:3;visibility:hidden;background:var(--x-pic-ground)`, host);

    // draw one source into a w×h box with object-fit + focal point, never enlarged past the source's pixels
    const place = (sw, sh, w, h) => {
      let s = p.fit === "contain" ? Math.min(w / sw, h / sh) : Math.max(w / sw, h / sh);
      const dw = sw * s, dh = sh * s;
      return { s, dx: (w - dw) * p.focus_x, dy: (h - dh) * p.focus_y, dw, dh };
    };

    // ── the frames ──
    let urls = [];
    const spec = String(p.frames || el.dataset.frames || "").trim();
    if (spec) urls = spec.includes(",") ? spec.split(",").map((s) => s.trim()).filter(Boolean) : Array.from({ length: N }, (_, i) => spec.replace("{i3}", String(i).padStart(3, "0")).replace("{i}", String(i)));
    const sources = []; // drawables, one per frame (Image, canvas)
    if (urls.length) {
      for (const u of urls) { const im = new Image(); im.src = u; sources.push(im); }
      await Promise.all(sources.map((im) => (im.decode ? im.decode().catch(() => {}) : 0)));
    } else if (vid && vid.duration) {
      vid.pause();
      const vw = vid.videoWidth, vh = vid.videoHeight;
      for (let i = 0; i < N; i++) {
        const c = document.createElement("canvas"); c.width = vw; c.height = vh;
        await new Promise((r) => { const done = () => { vid.removeEventListener("seeked", done); r(); }; vid.addEventListener("seeked", done); vid.currentTime = (i / (N - 1)) * (vid.duration - 0.04); setTimeout(r, 1500); });
        c.getContext("2d").drawImage(vid, 0, 0, vw, vh);
        sources.push(c);
      }
    }
    const real = sources.length > 0;
    const frames = real ? sources.length : N;
    const mode = real ? (p.renderer === "video" ? "canvas" : p.renderer) : "canvas";

    // ── renderers ──
    let paint;
    if (mode === "frames" || mode === "svg") {
      const s0 = sources[0], sw = s0.naturalWidth || s0.width || b.w, sh = s0.naturalHeight || s0.height || b.h;
      const k = Math.min(place(sw, sh, b.w, b.h).s, 1), w = sw * k, h = sh * k; // never past its own pixels
      const x = (b.w - w) * p.focus_x, y = (b.h - h) * p.focus_y;
      if (mode === "frames") {
        const im = mk("img", `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;max-width:none;filter:var(--x-pic-filter)`, wrap);
        const toURL = (i) => sources[i].src;
        let last = -1; paint = (i) => { if (i !== last) { im.src = toURL(i); last = i; } };
      } else {
        const NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
        svg.setAttribute("width", b.w); svg.setAttribute("height", b.h); svg.style.cssText = "position:absolute;inset:0";
        const im = document.createElementNS(NS, "image");
        for (const [k, v] of [["x", x], ["y", y], ["width", w], ["height", h]]) im.setAttribute(k, v);
        svg.append(im); wrap.append(svg);
        let last = -1; paint = (i) => { if (i !== last) { im.setAttribute("href", sources[i].src); last = i; } };
      }
    } else {
      const cv = mk("canvas", `position:absolute;inset:0;width:${b.w}px;height:${b.h}px;filter:var(--x-pic-filter)`, wrap);
      cv.width = Math.round(b.w * DPR); cv.height = Math.round(b.h * DPR);
      const g = cv.getContext("2d");
      const probe = mk("span", "color:var(--x-ink)", wrap), ink = getComputedStyle(probe).color; probe.remove();
      if (real) {
        paint = (i) => {
          const s = sources[i], sw = s.naturalWidth || s.width, sh = s.naturalHeight || s.height;
          const k = Math.min(place(sw, sh, b.w, b.h).s, 1), w = sw * k, h = sh * k; // a source smaller than the box stays at its size
          g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, b.w, b.h);
          g.drawImage(s, (b.w - w) * p.focus_x, (b.h - h) * p.focus_y, w, h);
        };
      } else if (img) {
        // a sequence built from the one picture: its own frames, still stepped (frame index, never smooth time)
        const sw = img.naturalWidth || b.w, sh = img.naturalHeight || b.h, pl = place(sw, sh, b.w, b.h);
        const sx = Math.max(0, -pl.dx / pl.s), sy = Math.max(0, -pl.dy / pl.s), cw = Math.min(sw, b.w / pl.s), ch = Math.min(sh, b.h / pl.s);
        const cols = ML.clamp(Math.round(6 * Math.sqrt(b.w / b.h)), 3, 10), rows = ML.clamp(Math.round((cols * b.h) / b.w), 2, 10);
        const tiles = [];
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const i = r * cols + c, ang = ML.rnd(i, 3) * Math.PI * 2, far = 0.35 + ML.rnd(i, 4) * 0.5;
          tiles.push({ c, r, ox: Math.cos(ang) * far * b.w * 0.6, oy: Math.sin(ang) * far * b.h * 0.9, rot: (ML.rnd(i, 5) - 0.5) * 50, lag: (ctx.rtl ? cols - 1 - c : c) / cols * 0.45 + ML.rnd(i, 6) * 0.1 });
        }
        const tw = b.w / cols, th = b.h / rows, sTw = cw / cols, sTh = ch / rows;
        paint = (i) => {
          const q = i / (N - 1);
          g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, b.w, b.h);
          if (p.built === "turn") {
            // a turntable: half a turn through the run, the far side shaded with the look's ink
            const ang = q * Math.PI * (ctx.rtl ? -1 : 1), sx2 = Math.cos(ang), wv = Math.abs(sx2) * b.w;
            g.save(); g.translate(b.w / 2, 0); g.scale(sx2 < 0 ? -1 : 1, 1);
            g.drawImage(img, sx, sy, cw, ch, -wv / 2, b.h * 0.04 * (1 - Math.abs(sx2)), wv, b.h * (1 - 0.08 * (1 - Math.abs(sx2))));
            g.globalAlpha = 0.55 * (1 - Math.abs(sx2)); g.fillStyle = ink; g.fillRect(-wv / 2, 0, wv, b.h); g.restore();
            g.globalAlpha = 1;
          } else {
            for (const T of tiles) {
              const u = ML.clamp((q - T.lag) / 0.45), e = 1 - Math.pow(1 - u, 3);
              if (u <= 0) continue;
              g.save(); g.globalAlpha = Math.min(1, u * 3);
              g.translate(T.c * tw + tw / 2 + T.ox * (1 - e), T.r * th + th / 2 + T.oy * (1 - e)); g.rotate((T.rot * (1 - e) * Math.PI) / 180);
              g.drawImage(img, sx + T.c * sTw, sy + T.r * sTh, sTw, sTh, -tw / 2 - 0.3, -th / 2 - 0.3, tw + 0.6, th + 0.6);
              g.restore();
            }
          }
        };
      } else return null;
    }

    // frame readout (mono label, bottom corner on the reading side)
    const tag = p.readout ? mk("div", `position:absolute;bottom:${Math.max(8, b.h * 0.05)}px;${ctx.rtl ? "left" : "right"}:${Math.max(10, b.w * 0.03)}px;padding:4px 10px;border-radius:var(--x-radius-s);background:color-mix(in srgb, var(--x-panel) 82%, transparent);color:var(--x-ink);font:var(--x-label-weight) ${Math.max(14, Math.min(22, b.h * 0.07))}px var(--x-mono-font);direction:ltr;font-variant-numeric:tabular-nums`, wrap) : null;

    const run0 = at, run1 = Math.max(at + 0.6, end - 0.35);
    ctx.sfx(at, "whoosh.soft", 0.25);
    return {
      draw(t) {
        const on = t >= at - 1e-6 && t < end;
        wrap.style.visibility = on ? "visible" : "hidden";
        el.style.visibility = on ? "hidden" : "";
        if (!on) return;
        let x = ML.lin(t, run0, run1);
        if (p.direction === "reverse") x = 1 - x;
        else if (p.direction === "ping-pong") x = x < 0.5 ? x * 2 : 2 - x * 2;
        const f = ML.clamp(Math.round(curve(x) * (frames - 1)), 0, frames - 1);
        paint(f);
        if (tag) tag.textContent = `${String(f + 1).padStart(3, "0")} / ${String(frames).padStart(3, "0")}`;
        wrap.style.opacity = (1 - ML.lin(t, end - 0.2, end)).toFixed(4);
      },
    };
  },
});
