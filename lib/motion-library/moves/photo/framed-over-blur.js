// Framed over its blurred copy: a landscape clip or picture plays in a rounded box in the middle of a vertical frame,
// over a darkened, blurred copy of itself filling the background. Box: the frame's width less 48 px a side (984 of
// 1080), at the media's own aspect, its top at 29 % of the height (y 560 of 1920), radius 28 (0 + the flat ground for
// a technical source). Backdrop: the same media covering the frame, blurred 40 px, brightness -0.22, saturation 1.1;
// or dim (brightness -0.45), or the look's flat ground. Titles keep the band above (they stay in front), captions
// below. In 16:9 / 1:1 the box sits centred (or on the reading side) with the backdrop showing at the sides. The box
// eases in on the look's motion and holds; the framed picture is never enlarged past its pixels and never blurred
// (only the backdrop copy is, which is the point of the technique). The titles in the band take whichever of the look's
// ink / ground reads best on that backdrop, as it fades in. A clip is seeked from t (speed 0.5-2.2, the source's limits).
// Everywhere except 9:16 with the headline on top, the box fits the region the look leaves for pictures.
// Source: MengTo/Skills media/html-reel scripts/frame-video.mjs (MIT): the backdrop() chain and the default box.
ML.define({
  id: "photo.framed-over-blur",
  category: "photo",
  name: "Framed over its blurred copy",
  does: "A landscape clip or picture plays in a rounded box in the middle of a vertical frame, over a darkened blurred copy of itself filling the background.",
  says: ["proof", "tech", "story"],
  energy: 2,
  targets: ["image", "screen"],
  duration: [1.5, 15],
  params: {
    backdrop: { type: "choice", options: ["blur", "dim", "flat"], default: "blur" },
    radius: { type: "number", range: [0, 32], default: 28, unit: "px" },
    box: { type: "choice", options: ["center", "top", "bottom", "full"], default: "center" },
    blur: { type: "number", range: [20, 60], default: 40, unit: "px" },
    speed: { type: "number", range: [0.5, 2.2], default: 1 },
    side: { type: "choice", options: ["center", "reading"], default: "center" },
  },
  pairs: ["text-in.punchline", "camera.push-in"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:media/html-reel/scripts/frame-video.mjs", license: "MIT" },
  setup(ctx) {
    const { el, p, at, end, f } = ctx;
    if (!el) return null;
    const host = ctx.scene || ctx.stage;
    const W = f.W, H = f.H, k = Math.min(W, H) / 1080;
    const media = el.tagName === "IMG" || el.tagName === "VIDEO" ? el : el.querySelector("img, video");
    const nw = media ? media.naturalWidth || media.videoWidth || 0 : 0, nh = media ? media.naturalHeight || media.videoHeight || 0 : 0;
    const eb = ctx.box(el);
    const aspect = nw && nh ? nw / nh : eb.w / Math.max(1, eb.h);
    // the box (frame-video.mjs defaults, scaled to the shape)
    const source916 = f.tall && f.at === "top";
    const side = 48 * k;
    let bw, bh, bx, by;
    if (p.box === "full") { bw = W; bh = Math.min(H, W / aspect); }
    else if (source916) { bw = W - side * 2; bh = bw / aspect; const maxH = H * (p.box === "center" ? 0.5 : 0.42); if (bh > maxH) { bh = maxH; bw = bh * aspect; } }
    else { bh = Math.min(f.pic.h, H * 0.62); bw = bh * aspect; if (bw > f.pic.w) { bw = f.pic.w; bh = bw / aspect; } }
    // never past the picture's own pixels
    if (nw && bw > nw) { bh *= nw / bw; bw = nw; }
    // "top" is the source's split layout: it never runs over titles that are actually there
    const headEl = host.querySelector(".ml-head"), titleEnd = headEl && headEl.textContent.trim() ? Math.max(...[...headEl.children].map((c) => ctx.box(c).y + ctx.box(c).h), 0) : 0;
    bx = source916 || p.box === "full" ? (W - bw) / 2 : f.pic.x + (f.pic.w - bw) / 2;
    if (p.side === "reading" && !source916 && p.box !== "full") bx = ctx.rtl ? f.pic.x + f.pic.w - bw : f.pic.x;
    if (p.box === "full") by = (H - bh) / 2;
    else if (source916) by = p.box === "top" ? Math.max(H * 0.16, titleEnd + 24 * k) : p.box === "bottom" ? H - bh - H * 0.16 : H * 0.2917;
    else by = p.box === "top" ? f.pic.y : p.box === "bottom" ? f.pic.y + f.pic.h - bh : f.pic.y + (f.pic.h - bh) / 2;
    by = ML.clamp(by, 0, H - bh);
    // the param's radius, never rounder than the look's pictures (a square-cornered look stays square)
    const r = p.box === "full" ? "0px" : `min(${(p.radius * k).toFixed(1)}px, var(--x-pic-radius))`;

    const mk = (tag, css, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (parent) parent.append(e); return e; };
    const layer = mk("div", "position:absolute;inset:0;pointer-events:none;visibility:hidden;overflow:hidden");
    host.insertBefore(layer, host.firstChild); // behind the headline band: titles stay in front
    const flat = p.backdrop === "flat" || !media;
    // frame-video.mjs's eq=brightness subtracts from every channel (a multiply would leave the lights bright): the same, as a filter
    const sink = p.backdrop === "dim" ? 0.45 : 0.22, fid = "fob" + Math.round(ML.rnd(sink * 7 + at, 5) * 1e6);
    if (!flat) layer.insertAdjacentHTML("beforeend", `<svg width="0" height="0" style="position:absolute"><filter id="${fid}" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%"><feComponentTransfer>${["R", "G", "B"].map((c) => `<feFunc${c} type="linear" slope="1" intercept="${-sink}"/>`).join("")}</feComponentTransfer></filter></svg>`);
    const back = mk("div", `position:absolute;inset:0;background:${flat ? "var(--x-ground)" : "var(--x-ink)"};overflow:hidden`, layer);
    let backPic = null;
    if (!flat) {
      backPic = media.cloneNode(true);
      backPic.removeAttribute("data-slot"); backPic.removeAttribute("data-slot-sample");
      const bl = p.blur * k;
      backPic.style.cssText = `position:absolute;left:${-bl * 1.5}px;top:${-bl * 1.5}px;width:${W + bl * 3}px;height:${H + bl * 3}px;max-width:none;object-fit:cover;border-radius:0;margin:0;` +
        (p.backdrop === "blur" ? `filter:blur(${bl.toFixed(1)}px) url(#${fid}) saturate(1.1)` : `filter:url(#${fid})`);
      back.append(backPic);
    }
    const box = mk("div", `position:absolute;left:${bx}px;top:${by}px;width:${bw}px;height:${bh}px;border-radius:${r};overflow:hidden;box-shadow:var(--x-shadow);background:var(--x-pic-ground)`, layer);
    const pic = media ? media.cloneNode(true) : el.cloneNode(true);
    pic.removeAttribute("data-slot"); pic.removeAttribute("data-slot-sample");
    pic.style.cssText = `position:absolute;inset:0;width:100%;height:100%;max-width:none;margin:0;object-fit:cover;border-radius:0;filter:var(--x-pic-filter)`;
    box.append(pic);
    // what the framed media replaces: the target's picture area is taken over by the frame
    const area = el.closest(".ml-pic") || el;
    // a clip stays a function of t: never playing, seeked each frame
    const clips = [pic, backPic].filter((v) => v && v.tagName === "VIDEO");
    for (const v of clips) { v.removeAttribute("autoplay"); v.muted = true; v.pause(); }
    const clipAt = (t) => { for (const v of clips) { const d = v.duration || Infinity; v.currentTime = Math.min(Math.max(0, (t - at) * ML.clamp(p.speed, 0.5, 2.2)), Math.max(0, d - 0.04)); } };
    // the titles in the band: the look's ink or ground, whichever reads best on this backdrop
    const head = flat ? null : host.querySelector(".ml-head");
    let flip = null;
    if (head) {
      const canvas = document.createElement("canvas"); canvas.width = canvas.height = 8;
      const g2 = canvas.getContext("2d", { willReadFrequently: true });
      const lin = (c) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      const lumOf = (d, drop = 0) => { const q = (c) => lin(Math.max(0, c - drop * 255)); let s = 0; for (let i = 0; i < d.length; i += 4) s += 0.2126 * q(d[i]) + 0.7152 * q(d[i + 1]) + 0.0722 * q(d[i + 2]); return s / (d.length / 4); };
      const probe = (v) => { const e = mk("span", `color:var(--x-${v})`, layer), c = getComputedStyle(e).color; e.remove(); return c; };
      const INK = probe("ink"), GROUND = probe("ground"), DIM = probe("dim");
      const lumColor = (c) => { g2.clearRect(0, 0, 8, 8); g2.fillStyle = c; g2.fillRect(0, 0, 8, 8); return lumOf(g2.getImageData(0, 0, 8, 8).data); };
      const li = lumColor(INK), lg = lumColor(GROUND);
      let lb = 0.14; // a mid dark, when the media cannot be read
      try { g2.drawImage(media, 0, 0, 8, 8); lb = lumOf(g2.getImageData(0, 0, 8, 8).data, sink); } catch (e) { /* cross-origin */ }
      const contrast = (a) => (Math.max(a, lb) + 0.05) / (Math.min(a, lb) + 0.05);
      // whichever is lighter usually carries better over a picture than the numbers say: the darker one only when clearly stronger
      const [light, dark, ll, ld] = li > lg ? [INK, GROUND, li, lg] : [GROUND, INK, lg, li];
      flip = { INK, DIM, TO: contrast(ll) >= contrast(ld) * 0.8 ? light : dark };
    }
    const titles = (v) => {
      if (!flip) return;
      if (v <= 0) { head.style.removeProperty("color"); head.style.removeProperty("--x-ink"); head.style.removeProperty("--x-dim"); return; }
      const ink = `color-mix(in srgb, ${flip.TO} ${(v * 100).toFixed(1)}%, ${flip.INK})`;
      head.style.color = ink; head.style.setProperty("--x-ink", ink);
      head.style.setProperty("--x-dim", `color-mix(in srgb, ${flip.TO} ${(v * 84).toFixed(1)}%, ${flip.DIM})`);
    };
    const dur = Math.max(0.3, ctx.look.dur), dist = ctx.look.dist * k;
    ctx.sfx(at, "whoosh.soft", 0.3);
    return {
      draw(t) {
        const on = t >= at - 1e-6 && t < end;
        layer.style.visibility = on ? "visible" : "hidden";
        const g = ML.ease(t, at, at + dur * 0.8), leave = ML.lin(t, end - 0.25, end);
        // the target's own picture area gives way as the backdrop comes up, and stays away once the frame has faded
        area.style.opacity = t >= at - 1e-6 ? (1 - g).toFixed(4) : "";
        area.style.visibility = t >= at - 1e-6 && g >= 1 ? "hidden" : "";
        titles(on ? g * (1 - leave) : 0);
        if (!on) return;
        clipAt(t);
        back.style.opacity = (g * (1 - leave)).toFixed(4);
        const u = ML.expo(t, at + 0.08, at + 0.08 + dur);
        box.style.opacity = (Math.min(1, u * 1.6) * (1 - leave)).toFixed(4);
        box.style.translate = `0 ${((1 - u) * dist * 1.4).toFixed(2)}px`;
      },
    };
  },
});
