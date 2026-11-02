// Dot stretches into a pill: a small accent dot (14 px at 720p, scaled to the stage) arrives with a halo ring
// pulsing 1 → 1.6 and fading (0.3 s), then stretches on a spring: width 16 → `width` over ~0.45 s with a slight
// overshoot, height 16 → 54 px 0.05 s later, the corners always height / 2 (or a card's radius / a circle), the
// edges motion-blurred while it moves fast; it may turn into a white panel with a soft shadow. When it settles the
// content arrives: a label (y 8 → 0, blur 6 → 0, 0.25 s) or a row of 3–5 overlapping 44 px circles (avatars, logos
// or icons, a 2 px ring in the panel colour, overlapping −14 px) popping scale 0 → 1 on back.out(2), 0.07 s apart —
// right-to-left in Arabic. The shape is a real box re-laid every frame (never scaled up); a picture target fills the
// avatars at or below its own pixels, never blurred.
// Source: prompt-motion "twoclipping-opus-5-5-is-the", "samuel-yostt-891f87" (reference only — rebuilt as our own code).
ML.define({
  id: "element.dot-to-pill",
  category: "element",
  name: "Dot stretches into a pill",
  does: "A small dot pulses and stretches into a pill, then a label or a row of overlapping avatars appears inside it.",
  says: ["arrival", "simplicity", "tech", "connection", "trust"],
  energy: 3,
  targets: ["shape", "card", "label", "image", "logo"],
  duration: [0.8, 1.8],
  params: {
    content: { type: "choice", options: ["label", "avatars", "logos", "icons"], default: "label" },
    end_shape: { type: "choice", options: ["pill", "card", "circle"], default: "pill" },
    count: { type: "number", range: [3, 5], default: 4 },
    width: { type: "number", range: [100, 320], default: 160, unit: "px" },
    surface: { type: "choice", options: ["accent", "panel"], default: "accent" },
    halo: { type: "bool", default: true },
    text: { type: "text", default: "" },
  },
  pairs: ["element.avatar-stack", "text-in.punchline"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "prompt-motion:twoclipping-opus-5-5-is-the", license: "reference", note: "also samuel-yostt-891f87; technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, end, f, el, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const host = ctx.scene || ctx.stage;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const own = el && el !== ctx.stage ? el : null;
    const k = Math.min(f.W, f.H) / 720;
    const B = own ? ctx.box(own) : f.pic;
    const cx = B.x + B.w / 2, cy = B.y + B.h / 2;
    const pic = own && own.tagName === "IMG" ? own : null;
    const logoSvg = own && own.tagName.toLowerCase() === "svg" ? own : null;
    const content = pic && p.content === "label" ? "avatars" : p.content;

    // end size
    const n = Math.round(ML.clamp(p.count, 3, 5));
    const av = 44 * k, ov = 14 * k, ringW = 2 * k;
    const H0 = 54 * k;
    const dot = 14 * k;
    const text = p.text || (own && !pic && !logoSvg ? (own.textContent || "").trim() : "") || (rtl ? "متاح الآن" : "Now live");
    const surface = p.surface === "panel" ? "var(--x-panel)" : "var(--x-accent)";
    const ink = p.surface === "panel" ? "var(--x-ink)" : "var(--x-accent-ink)";
    const shell = mk("div", `position:absolute;left:0;top:0;pointer-events:none;z-index:6;`, host);
    const halo = p.halo ? mk("div", `position:absolute;box-sizing:border-box;border-radius:50%;border:${Math.max(1.5, 1.5 * k)}px solid var(--x-accent);`, shell) : null;
    const body = mk("div", `position:absolute;overflow:hidden;background:${surface};color:${ink};display:flex;align-items:center;justify-content:center;${p.surface === "panel" ? "box-shadow:var(--x-shadow);border:var(--x-edge) solid var(--x-edge-color);" : ""}`, shell);
    const row = mk("div", `display:flex;align-items:center;justify-content:center;flex-direction:${rtl ? "row-reverse" : "row"};white-space:nowrap;`, body);

    let items = [], label = null;
    if (content === "label") {
      label = mk("div", `font:var(--x-label-weight) ${18 * k}px/1 var(--x-body-font);letter-spacing:0;padding:0 ${22 * k}px;`, row, text);
    } else {
      const glyphs = ["M5 12l4 4 10-10", "M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z", "M13 2L4 14h7l-1 8 9-12h-7z", "M12 21s-7-4.4-9.2-9C1.3 8.4 3.7 4.6 7.4 4.6c2 0 3.6 1.1 4.6 2.6 1-1.5 2.6-2.6 4.6-2.6 3.7 0 6.1 3.8 4.6 7.4C19 16.6 12 21 12 21z", "M4 6h16M4 12h16M4 18h10"];
      const tones = ["var(--x-accent)", "var(--x-accent-2)", "var(--x-good)", "var(--x-ink)", "var(--x-dim)"];
      const initials = rtl ? ["م", "س", "ل", "ن", "ر"] : ["A", "M", "J", "S", "K"];
      for (let i = 0; i < n; i++) {
        const c = mk("div", `position:relative;flex:none;width:${av}px;height:${av}px;box-sizing:border-box;border-radius:50%;border:${ringW}px solid var(--x-panel);overflow:hidden;display:flex;align-items:center;justify-content:center;${i ? `margin-inline-start:${-ov}px;` : ""}background:${content === "logos" ? "var(--x-panel)" : `color-mix(in srgb, ${tones[i % tones.length]} ${content === "icons" ? 18 : 85}%, var(--x-panel))`};z-index:${n - i};`, row);
        if (content === "avatars" && pic) {
          const im = pic.cloneNode(true); im.removeAttribute("data-slot");
          const side = Math.min(av, pic.naturalWidth || av, pic.naturalHeight || av);
          im.style.cssText = `width:${side}px;height:${side}px;object-fit:cover;object-position:${20 + i * 18}% 50%;display:block;border-radius:50%;`;
          c.append(im);
        } else if (content === "avatars") {
          mk("div", `font:var(--x-head-weight) ${av * 0.4}px/1 var(--x-head-font);color:var(--x-panel);`, c, initials[i]);
        } else if (content === "logos" && logoSvg) {
          const sv = logoSvg.cloneNode(true); sv.removeAttribute("data-slot"); sv.removeAttribute("width"); sv.removeAttribute("height");
          sv.querySelectorAll("text").forEach((x) => x.remove());
          sv.setAttribute("viewBox", "-2 2 36 36");
          sv.style.cssText = "width:58%;height:58%;display:block;";
          c.append(sv);
        } else {
          // simple marks drawn in the look's colours: logos as geometric marks, icons as line icons
          const s = doc.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.style.cssText = "width:56%;height:56%;display:block;overflow:visible;";
          if (content === "logos") {
            const shapes = ['<circle cx="12" cy="12" r="8"/>', '<rect x="4" y="4" width="16" height="16" rx="4"/>', '<path d="M12 3l9 17H3z"/>', '<path d="M4 12a8 8 0 0 1 16 0z"/><rect x="4" y="14" width="16" height="5" rx="2"/>', '<path d="M12 3l8 9-8 9-8-9z"/>'];
            s.innerHTML = `<g fill="${tones[i % tones.length]}">${shapes[i % shapes.length]}</g>`;
          } else s.innerHTML = `<path d="${glyphs[i % glyphs.length]}" fill="none" stroke="${tones[i % 3]}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
          c.append(s);
        }
        items.push(c);
      }
    }
    // the shape it ends as
    const contentW = label ? label.offsetWidth : n * av - (n - 1) * ov + 20 * k;
    let W1 = Math.max(ML.clamp(p.width, 100, 320) * k, contentW + (label ? 0 : 6 * k)), H1 = H0;
    if (p.end_shape === "card") H1 = Math.max(H0 * 1.6, av + 36 * k), W1 = Math.max(W1, H1 * 1.5);
    if (p.end_shape === "circle") W1 = H1 = Math.max(H0 * 1.4, Math.min(contentW, av * 2.2));
    W1 = Math.min(W1, f.W - f.m * 2);
    if (label && label.offsetWidth > W1) { label.style.fontSize = ((18 * k * W1) / label.offsetWidth) * 0.9 + "px"; }
    const radiusEnd = p.end_shape === "card" ? `min(var(--x-radius), ${(H1 / 2).toFixed(1)}px)` : null;

    const in0 = at, in1 = at + 0.18, s0 = at + 0.28, h0 = s0 + 0.05;
    const settle = s0 + 0.48, c0 = settle;
    const go = Math.max(c0 + 0.3 + n * 0.07, end - 0.25);
    const spring = { stiffness: 260, damping: 19 };
    ctx.sfx(in0, "blip", 0.2);
    ctx.sfx(s0 + 0.1, "pop.soft", 0.4);
    if (items.length) ctx.sfx(c0 + 0.07, "pop", 0.25); else ctx.sfx(c0, "tap", 0.2);

    return {
      draw(t) {
        if (own) own.style.opacity = t >= at ? "0" : "";
        const on = t >= in0 && t < go + 0.25;
        shell.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        shell.style.opacity = (1 - ML.clamp((t - go) / 0.25)).toFixed(4);
        const appear = ML.back(t, in0, in1, 1.6);
        const sw = ML.step(t - s0, spring), sh = ML.step(t - h0, spring);
        const w = dot * appear + (W1 - dot) * sw, h = dot * appear + (H1 - dot) * sh;
        body.style.left = (cx - w / 2).toFixed(2) + "px"; body.style.top = (cy - h / 2).toFixed(2) + "px";
        body.style.width = Math.max(0, w).toFixed(2) + "px"; body.style.height = Math.max(0, h).toFixed(2) + "px";
        body.style.borderRadius = radiusEnd && sh > 0.6 ? radiusEnd : (Math.max(0, Math.min(w, h)) / 2).toFixed(2) + "px";
        // motion blur on the edges while the stretch is fast (a shape, never a picture)
        const speed = Math.abs(ML.step(t - s0 + 0.016, spring) - ML.step(t - s0 - 0.016, spring)) / 0.032;
        const bl = Math.min(4 * k, speed * 0.6 * k);
        body.style.filter = bl > 0.15 && !pic ? `blur(${bl.toFixed(2)}px)` : "none";
        // the halo pulse as it lands
        if (halo) {
          const hp = ML.lin(t, in0, in0 + 0.3), hs = dot * (1 + 0.6 * hp) * 1.25;
          halo.style.left = (cx - hs / 2).toFixed(2) + "px"; halo.style.top = (cy - hs / 2).toFixed(2) + "px";
          halo.style.width = halo.style.height = hs.toFixed(2) + "px";
          halo.style.opacity = t < in0 + 0.3 ? (0.8 * (1 - hp)).toFixed(4) : "0";
        }
        // content
        if (label) {
          const u = ML.out(t, c0, c0 + 0.25);
          label.style.opacity = u.toFixed(4);
          label.style.transform = `translateY(${((1 - u) * 8 * k).toFixed(2)}px)`;
          label.style.filter = u < 1 ? `blur(${((1 - u) * 6).toFixed(2)}px)` : "none";
        }
        items.forEach((c, i) => {
          const a = c0 + i * 0.07, u = ML.back(t, a, a + 0.3, 2);
          c.style.transform = `scale(${Math.max(0, Math.min(1.08, u)).toFixed(4)})`;
          c.style.opacity = t >= a ? "1" : "0";
        });
      },
    };
  },
});
