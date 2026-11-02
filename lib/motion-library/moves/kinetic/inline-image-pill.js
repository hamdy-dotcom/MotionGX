// Image pill slots into the sentence: the line is laid out with an empty slot at word `slot_index`; the slot opens
// from 0 width (its neighbours slide apart) while a pill — an avatar group, a photo, an icon or the logo — flies in
// from above, from the side or from where the previous scene left it (big, centre frame) and FLIPs into the slot over
// 0.5 s on a quartic in-out (power3.inOut), shrinking to text height (cap height × 1.2), fully rounded. The words
// around blur in from 8 px as the pill lands. The pill's box is animated by width / height (never scaled up), the
// photo is the scene's own picture (else a look-coloured gradient), Arabic words stay whole and the slot opens in
// reading order.
// Source: prompt-motion:samuel-yostt-891f87 (reference only — our own rebuild).
ML.define({
  id: "kinetic.inline-image-pill",
  category: "kinetic",
  name: "Image pill slots into the sentence",
  does: "An image or avatar pill flies into a line of text and the words open up to make room, so the picture reads as part of the sentence.",
  says: ["connection", "playful", "brand"],
  energy: 3,
  targets: ["line", "image"],
  duration: [1, 3],
  params: {
    slot_index: { type: "number", range: [0, 12], default: 2 },
    content: { type: "choice", options: ["avatar-group", "photo", "icon", "logo"], default: "avatar-group" },
    from: { type: "choice", options: ["above", "side", "previous-scene"], default: "above" },
    fly: { type: "number", range: [0.3, 0.9], default: 0.5, unit: "s" },
  },
  pairs: ["text-in.punchline", "text-emphasis.accent-word"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "prompt-motion:samuel-yostt-891f87", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    if (!el) return null;
    const host = ctx.scene || ctx.stage, doc = host.ownerDocument;
    const words = ML.split(el, "words");
    if (!words.length) return null;
    const fs = parseFloat(getComputedStyle(el).fontSize) || 80;
    const h = fs * 0.72 * 1.2; // cap height × 1.2
    const aspect = { "avatar-group": 2.98, photo: 1.9, icon: 1, logo: 1.7 }[p.content] || 2;
    const w = h * aspect;
    // the slot: an inline box between two words, its width opening from 0
    const idx = Math.max(0, Math.min(words.length, Math.round(p.slot_index)));
    const slot = doc.createElement("span");
    Object.assign(slot.style, { display: "inline-block", width: "0px", height: h + "px", verticalAlign: "-0.06em", marginInline: "0" });
    const gap = doc.createTextNode(" ");
    if (idx < words.length) words[idx].before(slot, gap);
    else words[words.length - 1].after(doc.createTextNode(" "), slot);
    const mx = fs * 0.06;
    slot.style.width = w + "px"; slot.style.marginInline = mx + "px";
    const B = ctx.box(slot);
    slot.style.width = "0px"; slot.style.marginInline = "0px";
    // the pill
    const pill = doc.createElement("div");
    Object.assign(pill.style, { position: "absolute", left: "0", top: "0", zIndex: "7", borderRadius: "var(--x-radius-s)", overflow: "hidden", pointerEvents: "none", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", direction: "ltr", visibility: "hidden" });
    if (p.content === "avatar-group") {
      // four overlapping avatars (look-coloured head-and-shoulders), one SVG so it scales with the pill's box
      Object.assign(pill.style, { overflow: "visible", background: "transparent" });
      const tones = ["var(--x-accent)", "var(--x-accent-2)", "var(--x-good)", "var(--x-ink)"];
      const id = "ml-iip-" + Math.round(ML.rnd(at * 3.7 + idx, 4) * 1e9);
      let g = "";
      tones.forEach((c, i) => {
        const cx = 50 + i * 66;
        g += `<g><circle cx="${cx}" cy="50" r="50" fill="var(--x-ground)"/><clipPath id="${id}${i}"><circle cx="${cx}" cy="50" r="45"/></clipPath><g clip-path="url(#${id}${i})"><rect x="${cx - 50}" y="0" width="100" height="100" fill="color-mix(in srgb, ${c} 24%, var(--x-panel))"/><circle cx="${cx}" cy="40" r="17" fill="color-mix(in srgb, ${c} 62%, var(--x-panel))"/><ellipse cx="${cx}" cy="98" rx="34" ry="30" fill="color-mix(in srgb, ${c} 80%, var(--x-panel))"/></g></g>`;
      });
      pill.innerHTML = `<svg viewBox="0 0 298 100" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;display:block">${g}</svg>`;
    } else if (p.content === "photo") {
      const img = host.querySelector("img");
      if (img && img.src) {
        const im = doc.createElement("img");
        im.src = img.currentSrc || img.src;
        Object.assign(im.style, { width: "100%", height: "100%", objectFit: "cover", display: "block", filter: "var(--x-pic-filter)" });
        pill.append(im);
      } else pill.style.background = "linear-gradient(135deg, var(--x-accent), var(--x-accent-2))";
    } else if (p.content === "icon") {
      pill.style.background = "var(--x-accent)";
      pill.innerHTML = `<svg viewBox="0 0 24 24" style="width:58%;height:58%" fill="none" stroke="var(--x-accent-ink)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg>`;
    } else {
      // the logo: the scene's own logo when it has one, else the brand's mark in the accent
      Object.assign(pill.style, { background: "var(--x-panel)", border: "var(--x-edge) solid var(--x-edge-color)" });
      const logo = host.querySelector('[data-slot="logo"], [data-slot-sample="logo"], svg[data-logo]');
      if (logo) { const c = logo.cloneNode(true); c.removeAttribute("data-slot"); c.removeAttribute("data-slot-sample"); Object.assign(c.style, { width: "78%", height: "70%" }); c.setAttribute("width", "100%"); c.setAttribute("height", "100%"); pill.append(c); }
      else pill.innerHTML = `<i style="width:44%;aspect-ratio:1;border-radius:28%;background:var(--x-accent)"></i>`;
    }
    host.append(pill);
    // where the pill comes from
    const big = Math.min(f.W * 0.62, f.H * 0.3) / Math.max(1, aspect * 0.8);
    const S = { w: big * aspect, h: big };
    if (p.from === "above") { S.x = B.x + w / 2 - S.w / 2; S.y = Math.max(f.safe.y * 0.5, B.y - S.h - fs * 1.6); }
    else if (p.from === "side") { S.x = rtl ? -S.w * 0.2 : f.W - S.w * 0.8; S.y = B.y + h / 2 - S.h / 2; }
    else { S.x = f.W / 2 - S.w / 2; S.y = f.H / 2 - S.h / 2; S.w *= 1.15; S.h *= 1.15; S.x = f.W / 2 - S.w / 2; S.y = f.H / 2 - S.h / 2; }
    S.x = Math.max(f.m * 0.5, Math.min(f.W - S.w - f.m * 0.5, S.x));
    const q3 = (x) => (x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2); // power3.inOut
    const appear = at, fly0 = at + (p.from === "previous-scene" ? 0.05 : 0.3), fly1 = fly0 + p.fly;
    ctx.sfx(fly0, "whoosh.soft", 0.18);
    ctx.sfx(fly1 - 0.03, "pop.soft", 0.4);
    // words blur in from the slot outwards, done as the pill lands
    const order = words.map((_, i) => Math.abs(i - (idx - 0.5)));
    const far = Math.max(...order) || 1;
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        const on = t >= appear - 1e-6 && leave < 1;
        el.style.opacity = t < appear ? "0" : String(1 - leave);
        pill.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        const u = q3(ML.lin(t, fly0, fly1));
        // the slot opens with the pill's flight
        slot.style.width = (w * u).toFixed(2) + "px";
        slot.style.marginInline = (mx * u).toFixed(2) + "px";
        // the pill lands on the slot's laid-out box (measured live: the line may re-balance as it opens)
        const now = u >= 1 ? B : (() => { const b = ctx.box(slot); return { x: b.x + (b.w - w) / 2, y: b.y }; })();
        const x = S.x + (now.x - S.x) * u, y = S.y + (now.y - S.y) * u, pw = S.w + (w - S.w) * u, ph = S.h + (h - S.h) * u;
        Object.assign(pill.style, { left: x.toFixed(2) + "px", top: y.toFixed(2) + "px", width: pw.toFixed(2) + "px", height: ph.toFixed(2) + "px" });
        pill.style.opacity = (ML.lin(t, appear, appear + 0.15) * (1 - leave)).toFixed(4);
        const settle = ML.pulse(t, fly1, 0.03, 0.18);
        pill.style.translate = `0 ${(-settle * h * 0.05).toFixed(2)}px`;
        words.forEach((wd, i) => {
          const s = fly0 + (p.fly * 0.45) * (order[i] / far), v = ML.out(t, s, s + p.fly * 0.55 + 0.05);
          wd.style.opacity = (0.15 + 0.85 * v).toFixed(4);
          wd.style.filter = v < 1 ? `blur(${((1 - v) * 8).toFixed(2)}px)` : "none";
        });
      },
    };
  },
});
