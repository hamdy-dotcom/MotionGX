// Difference-blend wordmark: a giant wordmark laid across a multi-colour picture (top 45 %, 94 % wide, centred, 16 %
// of the stage width per em, line height .72, tracking -.09em, the heaviest head weight) in the look's light colour
// with mix-blend-mode: difference — so every colour band under it shows a different inverted hue. The picture is the
// scene itself ("scene") or a field of look-coloured bands the move lays behind the word ("bands", the source's
// 115° four-band art). Enter "scale-settle": the wordmark 1.06 → 1 with opacity over 0.9 s
// cubic-bezier(.22,.61,.36,1) while the bands settle 1.03 → 1; "mask-rise": letters (or whole words) rise out of a
// mask, 0.04 s apart. Hold; a short fade at the end. Arabic: whole words rise, no tracking, a taller line.
// Source: MengTo/Skills web-design/editorial-portfolio-chapters demo (MIT): .hero h1 { top 45%; width 94%;
// font-size 16vw; line-height .72; letter-spacing -.09em; mix-blend-mode: difference } over .heroArt bands.
ML.define({
  id: "kinetic.blend-wordmark",
  category: "kinetic",
  name: "Difference-blend wordmark over image",
  does: "A giant wordmark sits across a multi-colour image and inverts its colours band by band.",
  says: ["brand", "energy", "reveal"],
  energy: 3,
  targets: ["headline", "logo"],
  duration: [1.5, 5],
  params: {
    blend: { type: "choice", options: ["difference", "exclusion", "overlay"], default: "difference" },
    enter: { type: "choice", options: ["mask-rise", "scale-settle"], default: "scale-settle" },
    size: { type: "number", range: [10, 22], default: 16, unit: "vw" },
    split: { type: "choice", options: ["letters", "word"], default: "word" },
    backdrop: { type: "choice", options: ["bands", "scene"], default: "bands" },
  },
  pairs: ["photo.media-settle", "camera.push-in"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:web-design/editorial-portfolio-chapters", license: "MIT", note: "demo/index.html .hero h1 difference blend over .heroArt; the enters follow its .8s cubic-bezier(.22,.61,.36,1) settle" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    if (!el) return null;
    const host = ctx.scene || ctx.stage, doc = host.ownerDocument;
    const text = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return null;
    const settle = ML.bezier(0.22, 0.61, 0.36, 1);
    // the look's lighter colour of ground / ink (the source sets the word in its light paper colour)
    const probe = doc.createElement("div"), cv = doc.createElement("canvas").getContext("2d");
    host.append(probe);
    const lum = (v) => { probe.style.color = v; cv.fillStyle = getComputedStyle(probe).color; cv.fillRect(0, 0, 1, 1); const d = cv.getImageData(0, 0, 1, 1).data; return 0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]; };
    const light = lum("var(--x-ground)") >= lum("var(--x-ink)") ? "var(--x-ground)" : "var(--x-ink)";
    probe.remove();
    // the multi-colour picture: look-coloured bands at 115°, like the source's hero art (only when asked)
    let bands = null;
    if (p.backdrop === "bands") {
      bands = doc.createElement("div");
      const c1 = "var(--x-accent)", c2 = "color-mix(in srgb, var(--x-ink) 88%, var(--x-accent))", c3 = "var(--x-accent-2)", c4 = "color-mix(in srgb, var(--x-ink) 70%, var(--x-accent-2))";
      Object.assign(bands.style, { position: "absolute", left: (f.W * (f.tall ? 0.056 : 0.13)).toFixed(1) + "px", right: (f.W * (f.tall ? 0.056 : 0.13)).toFixed(1) + "px", top: (f.safe.y * 0.55).toFixed(1) + "px", bottom: (f.H - f.safe.y - f.safe.h) * 0.4 + "px", zIndex: "5", pointerEvents: "none", overflow: "hidden", background: `linear-gradient(${rtl ? 245 : 115}deg, ${c1} 0 24%, ${c2} 24% 44%, ${c3} 44% 65%, ${c4} 65%)` });
      const glints = doc.createElement("div");
      Object.assign(glints.style, { position: "absolute", inset: "0", background: `radial-gradient(ellipse at 20% 60%, color-mix(in srgb, var(--x-ground) 80%, var(--x-accent)) 0 8%, transparent 9%), radial-gradient(ellipse at 70% 42%, color-mix(in srgb, var(--x-ground) 75%, var(--x-accent-2)) 0 9%, transparent 10%)` });
      bands.append(glints);
      host.append(bands);
    }
    // the wordmark
    const layer = doc.createElement("div");
    Object.assign(layer.style, { position: "absolute", left: "3%", width: "94%", top: "45%", zIndex: "6", pointerEvents: "none", mixBlendMode: p.blend, textAlign: "center", direction: rtl ? "rtl" : "ltr" });
    const lh = rtl ? 1.15 : 0.72;
    // the mask reaches past the tight line box so nothing but the rise is cut: descenders and Arabic's marks stay whole
    const padT = rtl ? 0.1 : 0.16, padB = rtl ? 0.16 : 0.3, rise = lh + padB + 0.05;
    const mask = doc.createElement("div");
    Object.assign(mask.style, { fontSize: ((f.W * ML.clamp(p.size, 10, 22)) / 100).toFixed(2) + "px", lineHeight: String(lh), padding: `${padT}em 0.12em ${padB}em`, margin: `-${padT}em -0.12em -${padB}em`, overflow: p.enter === "mask-rise" ? "hidden" : "visible" });
    const word = doc.createElement("div");
    word.textContent = text;
    Object.assign(word.style, { display: "inline-block", whiteSpace: "nowrap", color: light, fontFamily: "var(--x-head-font)", fontWeight: "800", lineHeight: String(lh), letterSpacing: rtl ? "0" : "-0.09em" });
    mask.append(word);
    layer.append(mask);
    host.append(layer);
    // fit the 94 % width (the source's 16vw is sized for one short word)
    const max = f.W * 0.94 * 0.98, w = word.offsetWidth;
    if (w > max) mask.style.fontSize = ((parseFloat(mask.style.fontSize) * max) / w).toFixed(2) + "px";
    // centre vertically on the 45 % line, the way the source's top:45% block sits
    layer.style.translate = `0 -${(layer.offsetHeight / 2).toFixed(1)}px`;
    const parts = p.enter === "mask-rise" ? ML.split(word, p.split === "letters" ? "chars" : "words") : [];
    const stag = 0.04;
    ctx.sfx(at, "whoosh.soft", 0.3);
    if (p.enter === "mask-rise") ctx.sfx(at + Math.min(0.5, parts.length * stag) + 0.3, "land.light", 0.25);
    return {
      draw(t) {
        el.style.opacity = "0"; // the wordmark is this slot while the move runs
        const on = t >= at - 1e-6 && t < end;
        layer.style.display = on ? "block" : "none";
        if (bands) bands.style.display = on ? "block" : "none";
        if (!on) return;
        const leave = ML.ease(t, end - 0.3, end - 0.02);
        const img = settle(ML.lin(t, at, at + 0.9));
        if (bands) { bands.style.opacity = (Math.min(1, ML.lin(t, at, at + 0.35)) * (1 - leave)).toFixed(4); bands.style.scale = img >= 1 ? "none" : (1.03 - 0.03 * img).toFixed(5); }
        if (p.enter === "scale-settle") {
          const u = settle(ML.lin(t, at + 0.05, at + 0.95));
          word.style.opacity = (u * (1 - leave)).toFixed(4);
          word.style.scale = u >= 1 ? "none" : (1.06 - 0.06 * u).toFixed(5);
          return;
        }
        word.style.opacity = (1 - leave).toFixed(4);
        parts.forEach((s, i) => {
          const u = settle(ML.lin(t, at + 0.1 + i * stag, at + 0.1 + i * stag + 0.7));
          s.style.translate = u >= 1 ? "none" : `0 ${((1 - u) * rise).toFixed(4)}em`;
        });
      },
    };
  },
});
