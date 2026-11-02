// Blur-to-sharp resolve: a picture develops out of softness into place.
// Card (generate) form: the picture itself, radius and shadow from the look, scale scale_from → 1, blur blur_from → 0,
// saturate 0.6 → 1 over `duration` on power2.out, opacity 0 → 1 in the first 0.3 s; then an idle float (y ±6 px,
// scale drifting toward 1.02 — capped at the picture's own pixels). Dark-room (full-frame) form: the stage goes to the
// look's device dark, the picture develops as large as its pixels allow (cover, never enlarged past them) from
// brightness 0.6 / scale 1.06 to its final exposure, with a darkening veil kept for the copy that lands on top.
// Reveal flavours: blur (the blur always settles to 0 — never held), pixelate (a mosaic whose cells shrink to 1 px,
// painted on a canvas per frame), scan (a bright line resolving the picture top-down).
// Source: MengTo/Skills web-design/editorial-portfolio-chapters (MIT, the dark-room develop) + prompt-motion
// miskinho-que-maravilla-opus-5-5 (reference only — the generate card); our own code.
ML.define({
  id: "photo.blur-resolve",
  category: "photo",
  name: "Blur-to-sharp resolve",
  does: "A picture develops out of blur: from almost invisible and soft it sharpens into place, as if generated or developed in a dark room.",
  says: ["reveal", "result", "story", "calm"],
  energy: 2,
  targets: ["image", "card", "scene"],
  duration: [1, 4],
  params: {
    framing: { type: "choice", options: ["card", "full-frame"], default: "card" },
    blur_from: { type: "number", range: [6, 20], default: 16, unit: "px" },
    scale_from: { type: "number", range: [0.9, 1.08], default: 0.92 },
    final_exposure: { type: "number", range: [0.4, 1], default: 1 },
    duration: { type: "number", range: [0.8, 4], default: 1, unit: "s" },
    reveal: { type: "choice", options: ["blur", "pixelate", "scan"], default: "blur" },
    float_after: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "photo.card-focus-zoom"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "MengTo/Skills:agent-skills/web-design/editorial-portfolio-chapters", license: "MIT", note: "dark-room develop; the generate card is a rebuild of prompt-motion:miskinho-que-maravilla-opus-5-5 (reference)" },
  setup(ctx) {
    const { el, p, at, stage } = ctx;
    if (!el) return null;
    const scene = ctx.scene || stage;
    const full = p.framing === "full-frame" || el === stage || el === scene;
    const img = el.tagName === "IMG" ? el : el.querySelector && el.querySelector("img");
    const D = p.duration, p2out = ML.bezier(0.215, 0.61, 0.355, 1); // power2.out
    // how far this picture may grow before it is enlarged past its own pixels
    const capOf = (im, w, h) => { if (!im || !im.naturalWidth) return 1.02; const s = Math.max(w / im.naturalWidth, h / im.naturalHeight); return Math.max(1, 1 / s); };
    let pic = el, veil = null, field = null, W, H;
    const baseFilter = getComputedStyle(el).filter === "none" ? "" : getComputedStyle(el).filter + " ";
    if (full) {
      // the dark room: a field over the scene's ground, the picture developed in it, a veil for the copy
      W = scene.offsetWidth || ctx.f.W; H = scene.offsetHeight || ctx.f.H;
      field = document.createElement("div");
      field.style.cssText = `position:absolute;inset:0;background:var(--x-device);overflow:hidden;pointer-events:none;z-index:0`;
      scene.insertBefore(field, scene.firstChild);
      if (img) {
        pic = img.cloneNode(false); pic.removeAttribute("data-slot");
        const nw = img.naturalWidth || W, nh = img.naturalHeight || H, k = Math.min(Math.max(W / nw, H / nh), 1); // cover, never past its pixels
        const pw = nw * k, ph = nh * k;
        pic.style.cssText = `position:absolute;left:${(W - pw) / 2}px;top:${(H - ph) / 2}px;width:${pw}px;height:${ph}px;object-fit:cover;max-width:none`;
        field.append(pic);
        if (el !== stage && el !== scene) el.style.visibility = "hidden";
      } else pic = null;
      veil = document.createElement("div");
      veil.style.cssText = `position:absolute;inset:0;background:var(--x-device);opacity:0`;
      field.append(veil);
    } else {
      W = el.offsetWidth; H = el.offsetHeight;
      el.style.borderRadius = el.style.borderRadius || "var(--x-pic-radius)";
      el.style.boxShadow = "var(--x-shadow)";
    }
    const cap = capOf(img, pic ? pic.offsetWidth || W : W, pic ? pic.offsetHeight || H : H);
    // pixelate: a canvas over the picture, the mosaic painted per frame from t
    let cv = null, g = null, crop = null;
    if (p.reveal === "pixelate" && img && pic) {
      cv = document.createElement("canvas");
      const pw = pic.offsetWidth || W, ph = pic.offsetHeight || H, dpr = window.devicePixelRatio || 1;
      cv.width = Math.round(pw * dpr); cv.height = Math.round(ph * dpr);
      cv.style.cssText = `position:absolute;pointer-events:none;width:${pw}px;height:${ph}px;border-radius:${getComputedStyle(pic).borderRadius}`;
      if (full) { cv.style.left = pic.style.left; cv.style.top = pic.style.top; field.insertBefore(cv, veil); }
      else {
        const host = pic.offsetParent || pic.parentElement;
        if (getComputedStyle(host).position === "static") host.style.position = "relative";
        cv.style.left = pic.offsetLeft + "px"; cv.style.top = pic.offsetTop + "px"; pic.after(cv);
      }
      g = cv.getContext("2d");
      const nw = img.naturalWidth || pw, nh = img.naturalHeight || ph, s = Math.max(pw / nw, ph / nh), vw = pw / s, vh = ph / s;
      crop = { sx: (nw - vw) / 2, sy: (nh - vh) / 2, sw: vw, sh: vh };
    }
    let line = null;
    if (p.reveal === "scan" && pic) {
      line = document.createElement("div");
      line.style.cssText = `position:absolute;height:${Math.max(2, (pic.offsetHeight || H) / 90)}px;background:var(--x-accent);box-shadow:0 0 18px var(--x-accent);pointer-events:none`;
      if (full) { line.style.left = pic.style.left; line.style.width = pic.style.width; field.insertBefore(line, veil); }
      else { const host = pic.offsetParent || pic.parentElement; if (getComputedStyle(host).position === "static") host.style.position = "relative"; line.style.left = pic.offsetLeft + "px"; line.style.width = pic.offsetWidth + "px"; pic.after(line); }
    }
    const exposure = full ? ML.clamp(p.final_exposure, 0.4, 1) : 1;
    ctx.sfx(at, "swell", 0.35);
    return {
      draw(t) {
        const u = p2out(ML.lin(t, at, at + D)), fade = ML.lin(t, at, at + Math.min(0.3, D * 0.4));
        if (field) { field.style.visibility = t < at - 0.3 ? "hidden" : "visible"; field.style.opacity = ML.lin(t, at - 0.3, at).toFixed(4); }
        if (!pic) return;
        // the idle float once settled (card form)
        const idle = p.float_after && !full ? Math.max(0, t - (at + D)) : 0;
        const fy = idle ? Math.sin(idle * 1.6) * 6 * ML.lin(idle, 0, 0.8) : 0;
        const drift = idle ? Math.min(cap, 1.02) : 1, fs = 1 + (drift - 1) * ML.ease(t, at + D, at + D + 4);
        const s0 = full ? Math.min(1.06, cap) : Math.min(p.scale_from, cap);
        const sc = (s0 + (1 - s0) * u) * fs;
        let o = full ? fade * (0.25 + 0.75 * u) : fade, filter = baseFilter;
        if (p.reveal === "blur") { const b = (1 - u) * p.blur_from; if (b > 0.05) filter += `blur(${b.toFixed(2)}px) `; }
        filter += `saturate(${(0.6 + 0.4 * u).toFixed(3)})`;
        if (full) filter += ` brightness(${(0.6 + 0.4 * u).toFixed(3)})`;
        pic.style.opacity = o.toFixed(4);
        pic.style.filter = filter;
        pic.style.scale = Math.abs(sc - 1) < 1e-4 ? "none" : sc.toFixed(5);
        pic.style.translate = fy ? `0 ${fy.toFixed(2)}px` : "none";
        pic.style.clipPath = "none";
        if (veil) veil.style.opacity = ((1 - exposure) * ML.lin(t, at, at + D)).toFixed(4);
        if (cv) {
          // the mosaic: cells from ~1/10 of the picture down to 1 px; the real picture takes over when they reach 1
          const pw = cv.width, ph = cv.height, cell = Math.max(1, Math.round(Math.max(pw, ph) / 10 * Math.pow(1 - u, 2.2)));
          const on = cell > 1 && t >= at - 0.3;
          cv.style.visibility = on ? "visible" : "hidden";
          Object.assign(cv.style, { opacity: pic.style.opacity, scale: pic.style.scale, translate: pic.style.translate, filter: `saturate(${(0.6 + 0.4 * u).toFixed(3)})` });
          if (on) {
            const cw = Math.max(1, Math.ceil(pw / cell)), chh = Math.max(1, Math.ceil(ph / cell));
            g.imageSmoothingEnabled = true; g.clearRect(0, 0, pw, ph);
            g.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, cw, chh);
            g.imageSmoothingEnabled = false;
            g.drawImage(cv, 0, 0, cw, chh, 0, 0, cw * cell, chh * cell);
            pic.style.opacity = "0";
          }
        }
        if (line) {
          // the scan: the picture shows above the line, the line travels top-down and leaves
          const y = u * 100;
          pic.style.scale = "none"; // the scan resolves in place, so the line stays on the picture's edge
          pic.style.clipPath = u >= 1 ? "none" : `inset(0 0 ${(100 - y).toFixed(3)}% 0)`;
          pic.style.opacity = (full ? 0.25 + 0.75 * u : 1).toFixed(4);
          const top = (full ? parseFloat(pic.style.top) : pic.offsetTop) + (pic.offsetHeight || H) * u;
          line.style.top = top.toFixed(2) + "px";
          const lo = ML.lin(t, at - 0.05, at + 0.05) * (1 - ML.lin(t, at + D, at + D + 0.25));
          line.style.opacity = lo.toFixed(4); line.style.visibility = lo > 0.001 ? "visible" : "hidden";
        }
      },
    };
  },
});
