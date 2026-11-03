// Image through text / logo: a giant word (or the headline, or the logotype) becomes a window onto a picture. The
// letters arrive the way the look moves with a flat fill (the ink), then the fill crossfades to the picture over
// 0.2–0.6 s; inside, the picture keeps alive — it settles from inner_scale (1–1.3) to 1 and pans a little over the
// hold. The text mask is the element's own text (background-clip: text), so Arabic stays one joined word and nothing
// is re-laid out by hand; a logo SVG gets the picture as an <image> clipped by its own shapes. A 1 px outline of the ink
// keeps the glyph edges defined against busy media (drawn from the painted glyphs, so joined Arabic letters show no seams). Optional: the whole word grows 1 → 1.1 meanwhile; a caption row
// below (a large "01" and a mono label over a thin rule). Fill: the scene's picture, a <video>'s poster (its frames
// cannot be read back deterministically), or a gradient from the look. The picture is never shown past its pixels.
// Source: prompt-motion influencer-seo-opus-5-5-is-insanely + andginja-i-gave-claude-opus (reference only: our own rebuild).
ML.define({
  id: "mask.image-through-text",
  category: "mask",
  name: "Image through text / logo",
  does: "A giant word or the logotype becomes a window onto a photo, its solid fill crossfading into the picture, which keeps drifting inside the letters.",
  says: ["brand", "reveal", "story", "luxury", "tech"],
  energy: 3,
  targets: ["headline", "word", "logo", "image"],
  duration: [1, 4],
  params: {
    mask: { type: "choice", options: ["word", "logo", "headline"], default: "word" },
    fill: { type: "choice", options: ["image", "video", "gradient"], default: "image" },
    crossfade: { type: "number", range: [0.2, 0.6], default: 0.35, unit: "s" },
    inner_scale: { type: "number", range: [1, 1.3], default: 1.2 },
    outline: { type: "bool", default: true },
    caption: { type: "bool", default: false },
    grow: { type: "bool", default: false },
  },
  pairs: ["camera.slow-push", "transition.zoom-through-mask"],
  avoid: ["playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:influencer-seo-opus-5-5-is-insanely", license: "reference", note: "our own rebuild; also prompt-motion:andginja-i-gave-claude-opus" },
  setup(ctx) {
    const { el, p, at, end, stage, f } = ctx;
    if (!el) return null;
    const host = ctx.scene || stage;
    // the window: the target itself, or (target is a picture) the headline it shows through
    let win = el, picEl = null;
    if (el.tagName === "IMG") { picEl = el; win = host.querySelector(p.mask === "logo" ? "svg" : ".ml-title, [data-slot='headline']") || null; if (!win) return null; }
    const isSvg = win instanceof SVGElement;
    // the media
    const vid = host.querySelector("video");
    const img = picEl || [...host.querySelectorAll("img")].find((i) => !win.contains(i)) || null;
    let src = null, nat = { w: 0, h: 0 };
    if (p.fill === "video" && vid && vid.poster) { src = vid.poster; nat = { w: vid.videoWidth || 1920, h: vid.videoHeight || 1080 }; }
    else if (p.fill !== "gradient" && img) { src = img.currentSrc || img.src; nat = { w: img.naturalWidth, h: img.naturalHeight }; }
    const gradient = "linear-gradient(120deg, var(--x-accent) 0%, var(--x-accent-2) 45%, var(--x-glow-1) 70%, var(--x-good) 100%)";
    const css = (v) => (v ? `url("${String(v).replace(/"/g, '\\"')}")` : gradient);

    // the caption row: a large "01" and a mono label over a thin rule, under the window
    let cap = null;
    if (p.caption && !isSvg) {
      cap = document.createElement("div");
      const label = (host.querySelector(".ml-label") || host.querySelector(".ml-sub") || {}).textContent || "";
      cap.style.cssText = "display:flex;align-items:flex-end;gap:24px;margin-top:22px;padding-top:18px;border-top:1px solid var(--x-line);justify-content:inherit";
      cap.innerHTML = `<span style="font:var(--x-head-weight) calc(var(--x-sub-size) * 1.3)/1 var(--x-head-font);color:var(--x-ink)">01</span><span class="ml-label">${label.replace(/[<>&]/g, "")}</span>`;
      win.after(cap);
    }
    // the word: heavy caps (Latin), fitted to ~70 % of the frame width on one line
    if (!isSvg && p.mask === "word") {
      win.style.fontWeight = "900";
      if (!ctx.rtl && !ML.ARABIC.test(win.textContent)) { win.style.textTransform = "uppercase"; win.style.letterSpacing = "-0.01em"; }
      win.style.whiteSpace = "nowrap";
      win.style.fontSize = "var(--x-hero-size)";
      win.style.lineHeight = ML.ARABIC.test(win.textContent) ? "1.25" : "1"; // Arabic's dots and tails hang below the line
      // ~70 % of the frame's width, as far as the space around the word's centre allows
      const k0 = (stage.getBoundingClientRect().width / (stage.offsetWidth || 1)) || 1, size0 = parseFloat(getComputedStyle(win).fontSize);
      const rg = document.createRange(); rg.selectNodeContents(win);
      const w0 = rg.getBoundingClientRect().width / k0, b0 = ctx.box(win), room = 2 * Math.min(b0.y + b0.h / 2, f.H - b0.y - b0.h / 2) * 0.9;
      if (w0 > 0) win.style.fontSize = Math.min((size0 * f.W * 0.7) / w0, Math.max(size0, Math.min(f.H * 0.4, room))).toFixed(2) + "px";
      // in a band of fixed height (the headline band) the word gives way, rather than running into what is around it
      const par = win.parentElement, kids = par ? [...par.children] : [];
      if (kids.length && par.clientHeight) {
        const span = (kids[kids.length - 1].getBoundingClientRect().bottom - kids[0].getBoundingClientRect().top) / k0, over = span - par.clientHeight;
        if (over > 0) { const now = parseFloat(getComputedStyle(win).fontSize), lh = parseFloat(win.style.lineHeight); win.style.fontSize = Math.max(now - over / lh, size0 * 0.6).toFixed(2) + "px"; }
      }
    }
    if (picEl) picEl.style.visibility = "hidden";

    let paint;
    if (isSvg) {
      // logo: its shapes become a clip for an <image>; the original shapes fade off on top of it (the flat fill)
      const NS = "http://www.w3.org/2000/svg", id = "ml-itt-" + Math.floor(ML.rnd(at * 7 + 1, 3) * 1e9).toString(36);
      const vb = win.viewBox && win.viewBox.baseVal && win.viewBox.baseVal.width ? win.viewBox.baseVal : { x: 0, y: 0, width: win.clientWidth, height: win.clientHeight };
      const shapes = [...win.children].filter((n) => !/^(defs|title|desc)$/i.test(n.tagName));
      const defs = document.createElementNS(NS, "defs"), cp = document.createElementNS(NS, "clipPath");
      cp.id = id; shapes.forEach((s) => cp.append(s.cloneNode(true))); defs.append(cp);
      const g = document.createElementNS(NS, "g"); g.setAttribute("clip-path", `url(#${id})`);
      let media;
      if (src) { media = document.createElementNS(NS, "image"); media.setAttribute("href", src); media.setAttribute("preserveAspectRatio", "xMidYMid slice"); }
      else { media = document.createElementNS(NS, "foreignObject"); const d = document.createElement("div"); d.style.cssText = `width:100%;height:100%;background:${gradient}`; media.append(d); }
      // 8 % spare around the logo, so the pan never uncovers an edge
      for (const [k, v] of [["x", vb.x - vb.width * 0.04], ["y", vb.y - vb.height * 0.04], ["width", vb.width * 1.08], ["height", vb.height * 1.08]]) media.setAttribute(k, v);
      media.style.transformBox = "fill-box"; media.style.transformOrigin = "50% 50%";
      g.append(media);
      const flat = document.createElementNS(NS, "g"); shapes.forEach((s) => flat.append(s)); // the originals (the flat fill)
      const rim = document.createElementNS(NS, "g");
      shapes.forEach((s) => { const c = s.cloneNode(true); c.setAttribute("fill", "none"); c.style.fill = "none"; c.style.stroke = "color-mix(in srgb, var(--x-ink) 45%, transparent)"; c.setAttribute("stroke-width", "1"); c.setAttribute("vector-effect", "non-scaling-stroke"); rim.append(c); });
      win.append(defs, g, flat);
      if (p.outline) win.append(rim);
      paint = (x, s, pan) => { flat.style.opacity = (1 - x).toFixed(4); g.style.opacity = x > 0 ? "1" : "0"; media.style.transform = `translate(${(pan * vb.width).toFixed(3)}px, 0) scale(${s.toFixed(4)})`; rim.style.opacity = x.toFixed(3); };
    } else {
      // text: the flat ink and the picture as two backgrounds clipped to the glyphs. A background only paints inside its
      // box, so the box grows past the line (Arabic's dots and tails, swashes), without moving anything
      win.style.padding = "0.4em 0.1em"; win.style.margin = "-0.4em -0.1em";
      const b = ctx.box(win), k = (stage.getBoundingClientRect().width / (stage.offsetWidth || 1)) || 1;
      const r = document.createRange(); r.selectNodeContents(win); const tb = r.getBoundingClientRect();
      const tw = tb.width / k || b.w, th = tb.height / k || b.h;
      // the text's centre inside the element's box (backgrounds are laid out from the border box's corner)
      const eb = win.getBoundingClientRect(), tcx = tb.width ? (tb.left - eb.left) / k + tw / 2 : b.w / 2, tcy = tb.height ? (tb.top - eb.top) / k + th / 2 : b.h / 2;
      // cover the text box, then cap the extra scale so the picture never shows past its own pixels
      const cover = nat.w && nat.h ? Math.max(tw / nat.w, th / nat.h) * 1.07 : 0; // 7 % spare for the pan
      const maxS = cover ? Math.max(1, 1 / cover / (p.grow ? 1.1 : 1)) : 1.3;
      win.style.webkitBackgroundClip = "text"; win.style.backgroundClip = "text";
      win.style.backgroundRepeat = "no-repeat";
      win.style.backgroundOrigin = "border-box";
      const ink = getComputedStyle(win).color;
      win.style.color = "transparent";
      paint = (x, s, pan) => {
        const sc = Math.min(s, maxS);
        const flat = `linear-gradient(color-mix(in srgb, ${ink} ${((1 - x) * 100).toFixed(2)}%, transparent), color-mix(in srgb, ${ink} ${((1 - x) * 100).toFixed(2)}%, transparent))`;
        win.style.backgroundImage = `${flat}, ${css(src)}`;
        const w = src && nat.w ? nat.w * cover * sc : tw * 1.07 * sc, h = src && nat.w ? nat.h * cover * sc : th * 1.07 * sc;
        win.style.backgroundSize = `100% 100%, ${w.toFixed(1)}px ${h.toFixed(1)}px`;
        win.style.backgroundPosition = `0 0, ${(tcx - w / 2 + pan * tw).toFixed(2)}px ${(tcy - h / 2).toFixed(2)}px`;
        // the outline: four hard copies of the painted glyphs, added to whatever the look's entrance set this frame
        if (p.outline && x > 0.002) {
          const c = `color-mix(in srgb, var(--x-ink) ${(x * 45).toFixed(1)}%, transparent)`, base = win.style.filter;
          win.style.filter = `${base && base !== "none" ? base + " " : ""}drop-shadow(1px 0 0 ${c}) drop-shadow(-1px 0 0 ${c}) drop-shadow(0 1px 0 ${c}) drop-shadow(0 -1px 0 ${c})`;
        }
      };
    }

    const lead = Math.min(ctx.look.dur, 0.6) * 0.7, x0 = at + lead, x1 = x0 + ML.clamp(+p.crossfade, 0.2, 0.6);
    ctx.sfx(x0, "whoosh.soft", 0.3);
    return {
      draw(t) {
        ML.show(win, t, at);
        const x = ML.ease(t, x0, x1), hold = ML.lin(t, x0, Math.max(x0 + 0.5, end));
        const s = 1 + (ML.clamp(+p.inner_scale, 1, 1.3) - 1) * (1 - ML.out(t, x0, Math.max(x0 + 0.5, end)));
        paint(x, s, (hold - 0.5) * 0.06 * (ctx.rtl ? -1 : 1));
        if (p.grow && t >= x0) win.style.scale = (1 + 0.1 * ML.ease(t, x0, Math.max(x0 + 0.5, end))).toFixed(4);
        if (cap) { const c = ML.out(t, x1, x1 + 0.4); cap.style.opacity = c.toFixed(3); cap.style.translate = `0 ${((1 - c) * 14).toFixed(2)}px`; }
      },
    };
  },
});
