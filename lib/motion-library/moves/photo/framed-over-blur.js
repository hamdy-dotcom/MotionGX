// Framed over its blurred copy: a landscape clip or picture plays in a rounded box in the middle of a vertical frame,
// over a darkened, blurred copy of itself filling the background. Box: the frame's width less 48 px a side (984 of
// 1080), at the media's own aspect, its top at 29 % of the height (y 560 of 1920), radius 28 (0 + the flat ground for
// a technical source). Backdrop: the same media covering the frame, blurred 40 px, brightness -0.22, saturation 1.1;
// or dim (brightness -0.45), or the look's flat ground. Titles keep the band above (they stay in front), captions
// below. In 16:9 / 1:1 the box sits centred (or on the reading side) with the backdrop showing at the sides. The box
// eases in on the look's motion and holds; the framed picture is never enlarged past its pixels and never blurred
// (only the backdrop copy is, which is the point of the technique).
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
    const W = f.W, H = f.H, k = W / 1080;
    const media = el.tagName === "IMG" || el.tagName === "VIDEO" ? el : el.querySelector("img, video");
    const nw = media ? media.naturalWidth || media.videoWidth || 0 : 0, nh = media ? media.naturalHeight || media.videoHeight || 0 : 0;
    const eb = ctx.box(el);
    const aspect = nw && nh ? nw / nh : eb.w / Math.max(1, eb.h);
    // the box (frame-video.mjs defaults, scaled to the shape)
    const side = 48 * k;
    let bw, bh, bx, by;
    if (p.box === "full") { bw = W; bh = Math.min(H, W / aspect); }
    else if (f.tall) { bw = W - side * 2; bh = bw / aspect; const maxH = H * (p.box === "center" ? 0.5 : 0.42); if (bh > maxH) { bh = maxH; bw = bh * aspect; } }
    else { bh = H * (f.wide ? 0.62 : 0.5); bw = bh * aspect; const maxW = W - side * 4; if (bw > maxW) { bw = maxW; bh = bw / aspect; } }
    // never past the picture's own pixels
    if (nw && bw > nw) { bh *= nw / bw; bw = nw; }
    bx = (W - bw) / 2;
    if (p.side === "reading" && !f.tall && p.box !== "full") bx = ctx.rtl ? W - bw - f.m : f.m;
    if (p.box === "full") by = (H - bh) / 2;
    else if (f.tall) by = p.box === "top" ? H * 0.16 : p.box === "bottom" ? H - bh - H * 0.16 : H * 0.2917;
    else by = p.box === "top" ? f.safe.y + f.head.h * 0.2 : p.box === "bottom" ? H - bh - H * 0.08 : Math.max((H - bh) / 2, f.head.y + f.head.h * 0.85);
    by = ML.clamp(by, 0, H - bh);
    const r = (p.box === "full" ? 0 : p.radius) * k;

    const mk = (tag, css, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (parent) parent.append(e); return e; };
    const layer = mk("div", "position:absolute;inset:0;pointer-events:none;visibility:hidden;overflow:hidden");
    host.insertBefore(layer, host.firstChild); // behind the headline band: titles stay in front
    const flat = p.backdrop === "flat" || !media;
    const back = mk("div", `position:absolute;inset:0;background:${flat ? "var(--x-ground)" : "var(--x-ink)"};overflow:hidden`, layer);
    let backPic = null;
    if (!flat) {
      backPic = media.cloneNode(true);
      backPic.removeAttribute("data-slot"); backPic.removeAttribute("data-slot-sample");
      const bl = p.blur * k;
      backPic.style.cssText = `position:absolute;left:${-bl * 1.5}px;top:${-bl * 1.5}px;width:${W + bl * 3}px;height:${H + bl * 3}px;max-width:none;object-fit:cover;border-radius:0;margin:0;` +
        (p.backdrop === "blur" ? `filter:blur(${bl.toFixed(1)}px) brightness(0.78) saturate(1.1)` : "filter:brightness(0.55)");
      back.append(backPic);
    }
    const box = mk("div", `position:absolute;left:${bx}px;top:${by}px;width:${bw}px;height:${bh}px;border-radius:${r}px;overflow:hidden;box-shadow:var(--x-shadow);background:var(--x-pic-ground)`, layer);
    const pic = media ? media.cloneNode(true) : el.cloneNode(true);
    pic.removeAttribute("data-slot"); pic.removeAttribute("data-slot-sample");
    pic.style.cssText = `position:absolute;inset:0;width:100%;height:100%;max-width:none;margin:0;object-fit:cover;border-radius:0;filter:var(--x-pic-filter)`;
    box.append(pic);
    // what the framed media replaces: the target's picture area is taken over by the frame
    const area = el.closest(".ml-pic") || el;
    const dur = Math.max(0.3, ctx.look.dur), dist = ctx.look.dist * k;
    ctx.sfx(at, "whoosh.soft", 0.3);
    return {
      draw(t) {
        const on = t >= at - 1e-6 && t < end;
        layer.style.visibility = on ? "visible" : "hidden";
        area.style.visibility = on ? "hidden" : "";
        if (!on) return;
        const g = ML.ease(t, at, at + dur * 0.8), leave = ML.lin(t, end - 0.25, end);
        back.style.opacity = (g * (1 - leave)).toFixed(4);
        const u = ML.expo(t, at + 0.08, at + 0.08 + dur);
        box.style.opacity = (Math.min(1, u * 1.6) * (1 - leave)).toFixed(4);
        box.style.translate = `0 ${((1 - u) * dist * 1.4).toFixed(2)}px`;
      },
    };
  },
});
