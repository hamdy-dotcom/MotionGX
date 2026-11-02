// Media settle: the picture layer alone (never the text) eases from a slight overscale to rest as it arrives — scale
// 1.03 (1.02–1.06) → 1 over 0.6–0.8 s on cubic-bezier(.22,.61,.36,1), optionally lifting opacity .75 → 1 with it.
// Variants: "band" (the media-band look: the picture on the look's dark ground in mix-blend screen, opacity .7 → 1 and
// scale 1 → 1.02 over 1 s, with a small mono ASSET_ID chip) and "emphasis" (1 → 1.02 over 0.5 s on the key word).
// The picture scales inside its own rounded mask, so nothing spills; never past 1.06 and never blurred.
// Source: MengTo/Skills web-design masked-reveal, editorial-portfolio-chapters, css-border-gradient demos (MIT).
ML.define({
  id: "photo.media-settle",
  category: "photo",
  name: "Media settle on arrival",
  does: "A picture eases from a slight overscale to rest as it arrives, so the scene feels like it breathes in.",
  says: ["calm", "luxury", "arrival"],
  energy: 1,
  targets: ["image"],
  duration: [0.5, 1.5],
  params: {
    from: { type: "number", range: [1.02, 1.06], default: 1.03 },
    duration: { type: "number", range: [0.5, 1.2], default: 0.7, unit: "s" },
    opacity_lift: { type: "bool", default: false },
    variant: { type: "choice", options: ["settle", "band", "emphasis"], default: "settle" },
  },
  pairs: ["photo.molded-mount", "text-in.punchline"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:agent-skills/web-design/masked-reveal", license: "MIT", note: "the image-layer settle (scale 1.03 → 1, cubic-bezier(.22,.61,.36,1)) and the media-band variant from editorial-portfolio-chapters" },
  setup(ctx) {
    const { el, p, at, rtl } = ctx;
    if (!el) return null;
    const img = el.tagName === "IMG" ? el : el.querySelector("img");
    if (!img) return null;
    // the picture's own mask: a box in the picture's place, so the scale never spills past its rounded edge
    let box = img.parentElement;
    if (!box.dataset.mlPic) {
      const cs = getComputedStyle(img), w = img.offsetWidth, h = img.offsetHeight;
      box = document.createElement("div");
      box.dataset.mlPic = "1";
      box.style.cssText = `position:relative;overflow:hidden;isolation:isolate;flex:none;width:${w}px;height:${h}px;border-radius:${cs.borderRadius};margin:${cs.margin}`;
      img.parentNode.insertBefore(box, img);
      box.append(img);
      Object.assign(img.style, { width: "100%", height: "100%", display: "block", margin: "0" });
    }
    const curve = ML.bezier(0.22, 0.61, 0.36, 1);
    const v = p.variant;
    const from = v === "settle" ? ML.clamp(p.from, 1, 1.06) : 1;
    const to = v === "settle" ? 1 : 1.02;
    const dur = v === "band" ? Math.max(p.duration, 1) : v === "emphasis" ? 0.5 : p.duration;
    const o0 = v === "band" ? 0.7 : p.opacity_lift ? 0.75 : 1;
    if (v === "band") {
      // the media band: the look's darkest tone under the picture, the picture screened onto it, a mono id chip
      box.style.background = "color-mix(in srgb, var(--x-ink) 92%, var(--x-ground))";
      img.style.mixBlendMode = "screen";
      const chip = document.createElement("div");
      const h = box.offsetHeight || 200;
      chip.textContent = "ASSET_" + String(Math.floor(ML.rnd(at * 3.1 + h, 5) * 9000) + 1000);
      chip.setAttribute("dir", "ltr");
      chip.style.cssText = `position:absolute;${rtl ? "right" : "left"}:${Math.round(h * 0.07)}px;bottom:${Math.round(h * 0.07)}px;z-index:2;` +
        `font:500 ${Math.max(12, Math.round(h * 0.06))}px var(--x-mono-font);letter-spacing:0.08em;padding:0.35em 0.7em;border-radius:var(--x-radius-s);` +
        "color:var(--x-ground);background:color-mix(in srgb, var(--x-ink) 55%, transparent);border:1px solid color-mix(in srgb, var(--x-ground) 22%, transparent)";
      box.append(chip);
    }
    img.style.transformOrigin = "50% 50%";
    ctx.sfx(at, v === "emphasis" ? "tap" : "whoosh.soft", 0.16);
    return {
      draw(t) {
        const u = curve(ML.lin(t, at, at + dur));
        const s = from + (to - from) * u;
        img.style.scale = Math.abs(s - 1) < 1e-5 ? "none" : s.toFixed(5);
        img.style.opacity = o0 === 1 ? "" : (o0 + (1 - o0) * u).toFixed(4);
      },
    };
  },
});
