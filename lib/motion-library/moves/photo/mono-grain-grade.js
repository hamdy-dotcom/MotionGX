// Mono grain grade: the photo drains to a contrasty black-and-white — grayscale(1) contrast(1.2) brightness(.75) (.9 for
// lighter cards) — with a fine film grain laid over it in mix-blend overlay. The grain is a seeded noise tile (ML.rnd,
// never Math.random) whose offset changes with the frame index, so it shimmers yet the same t is always the same grain.
// Directions: colour → mono over .8–1.2 s power2.inOut with the grain rising 0 → 1; mono → colour (the colour returns on
// the key word, the grain falling away); or hold the mono look. Filters only: nothing blurred, nothing enlarged.
// Source: MengTo/Skills web-design marquee-loop demo (MIT): "grayscale contrast-[1.2] brightness-75" photos under a
// "texture-overlay mix-blend-overlay" grain.
ML.define({
  id: "photo.mono-grain-grade",
  category: "photo",
  name: "Mono grain grade",
  does: "A photo drains to a contrasty black-and-white with a fine film grain over it (or colour returns from it on the key word).",
  says: ["luxury", "calm", "story", "before-after"],
  energy: 1,
  targets: ["image"],
  duration: [0.8, 20],
  params: {
    direction: { type: "choice", options: ["colour-to-mono", "mono-to-colour", "hold"], default: "colour-to-mono" },
    brightness: { type: "number", range: [0.75, 0.9], default: 0.75 },
    grain: { type: "choice", options: ["static", "per-frame"], default: "per-frame" },
    duration: { type: "number", range: [0.8, 1.2], default: 1, unit: "s" },
  },
  pairs: ["photo.media-settle", "photo.molded-mount"],
  avoid: ["playful", "celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "MengTo/Skills:agent-skills/web-design/marquee-loop", license: "MIT", note: "grayscale contrast(1.2) brightness(.75) + mix-blend-overlay grain; the grain rebuilt as a seeded tile offset per frame" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const img = el.tagName === "IMG" ? el : el.querySelector("img");
    if (!img) return null;
    // the picture's own box, so the grain sits exactly over it
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
    // the grain tile: neutral light/dark specks (luminance only, so it takes no colour of its own), seeded
    const N = 160, seed = 7 + Math.floor(at * 13);
    const cv = document.createElement("canvas"); cv.width = N; cv.height = N;
    const g = cv.getContext("2d"), im = g.createImageData(N, N);
    for (let i = 0; i < N * N; i++) {
      const a = ML.rnd(i, seed), b = ML.rnd(i, seed + 1.7);
      const v = (a + b) / 2; // a softer, film-like distribution around the middle
      const lum = v > 0.5 ? 255 : 0, alpha = Math.min(255, Math.abs(v - 0.5) * 2 * 255 * 0.4);
      im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = lum; im.data[i * 4 + 3] = alpha;
    }
    g.putImageData(im, 0, 0);
    const grain = document.createElement("div");
    grain.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:1;mix-blend-mode:overlay;background-image:url(${cv.toDataURL()});background-size:${N}px ${N}px;opacity:0`;
    box.append(grain);
    const quad = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2); // power2.inOut
    const dur = ML.clamp(p.duration, 0.6, 1.6);
    const bMono = ML.clamp(p.brightness, 0.6, 1);
    // how mono the picture is at t (1 = full grade)
    const monoAt = (t) => {
      if (p.direction === "hold") return quad(ML.lin(t, at, at + 0.6));
      const u = quad(ML.lin(t, at, at + dur));
      return p.direction === "mono-to-colour" ? 1 - u : u;
    };
    ctx.sfx(at, "swell", 0.16);
    return {
      draw(t) {
        const m = monoAt(t);
        img.style.filter = m < 0.001 ? "none" : `grayscale(${m.toFixed(4)}) contrast(${(1 + 0.2 * m).toFixed(4)}) brightness(${(1 - (1 - bMono) * m).toFixed(4)})`;
        grain.style.opacity = (0.85 * m).toFixed(4);
        if (p.grain === "per-frame") {
          const f = Math.floor(Math.max(0, t) * 24); // the film's frame index: a new grain offset per frame
          grain.style.backgroundPosition = `${Math.floor(ML.rnd(f, 3.3) * N)}px ${Math.floor(ML.rnd(f, 9.1) * N)}px`;
        } else grain.style.backgroundPosition = "0 0";
      },
    };
  },
});
