// Fast photo flash montage: full-bleed photos hard-cut every 0.25-0.4 s behind the words, each pushing 1.08 -> 1.0 in
// its slot. The continuous element ties it together: either every picture runs through one duotone gradient map
// (shadows -> highlights, the look's dark and light by default, or a brand pair "a -> b") with light film grain, or a
// line keeps typing straight across the cuts, turned light with a soft shadow while a photo is under it (pictures may
// then mix colour and black-and-white). Cuts fall on a steady rate from `at`; a tap marks every other cut.
// Pictures: the scene's own (different crops of one picture when there is only one); grain is a seeded canvas laid
// once and shifted per slot, so every frame is a function of t.
// Source: prompt-motion influencer-seo "Opus 5.5 is insanely" + rossaxbt 3085b7 (reference only: our own rebuild).
ML.define({
  id: "photo.flash-montage",
  category: "photo",
  name: "Fast photo flash montage",
  does: "Full-bleed photos hard-cut every quarter second, optionally graded to one duotone or behind a line that keeps typing over them.",
  says: ["energy", "scale", "result", "choice", "story"],
  energy: 4,
  targets: ["image", "line"],
  duration: [1, 4],
  params: {
    cut_rate: { type: "number", range: [0.2, 0.5], default: 0.3, unit: "s" },
    tint: { type: "choice", options: ["none", "duotone"], default: "duotone" },
    tint_colour: { type: "text", default: "look" },
    push: { type: "number", range: [1, 1.1], default: 1.08 },
    text_over: { type: "choice", options: ["none", "typing"], default: "none" },
    grain: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "photo.darkened-blur-backdrop"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:influencer-seo-opus-5-5-is-insanely", license: "reference", note: "also prompt-motion:rossaxbt-3085b7; rebuilt as our own code" },
  async setup(ctx) {
    const { el, p, at, end, f } = ctx;
    const host = ctx.scene || ctx.stage;
    const imgOf = (e) => (e && (e.tagName === "IMG" ? e : e.querySelector && e.querySelector("img"))) || null;
    const pics = [...new Set([...(ctx.els || []), el].map(imgOf).filter(Boolean).concat([...host.querySelectorAll("img")]))];
    if (!pics.length) return null;
    await Promise.all(pics.map((x) => x.decode().catch(() => null)));
    const W = f.W, H = f.H, k = W / 1080;
    const mk = (tag, css, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (parent) parent.append(e); return e; };
    const toRgb = (css) => { const pr = mk("span", `color:${css}`, host); const c = document.createElement("canvas"); c.width = c.height = 1; const g = c.getContext("2d"); g.fillStyle = getComputedStyle(pr).color; g.fillRect(0, 0, 1, 1); pr.remove(); return [...g.getImageData(0, 0, 1, 1).data.slice(0, 3)].map((v) => v / 255); };
    const layer = mk("div", `position:absolute;inset:0;overflow:hidden;pointer-events:none;visibility:hidden;background:var(--x-ink)`);
    host.insertBefore(layer, host.firstChild); // behind the words
    // the duotone: luminance -> a ramp from the shadow colour to the highlight colour
    let filter = "none";
    if (p.tint === "duotone") {
      const pair = String(p.tint_colour || "look").split(/->|→/).map((x) => x.trim()).filter(Boolean);
      const [lo, hi] = pair.length === 2 ? pair : ["color-mix(in srgb, var(--x-ink) 78%, var(--x-accent))", "color-mix(in srgb, var(--x-accent-2) 28%, var(--x-panel))"];
      const A = toRgb(lo), B = toRgb(hi), id = "mlduo" + Math.round(ML.rnd(at * 13 + 1, W) * 1e8);
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
      svg.innerHTML = `<filter id="${id}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0"/>` +
        `<feComponentTransfer><feFuncR type="table" tableValues="${A[0].toFixed(4)} ${B[0].toFixed(4)}"/><feFuncG type="table" tableValues="${A[1].toFixed(4)} ${B[1].toFixed(4)}"/><feFuncB type="table" tableValues="${A[2].toFixed(4)} ${B[2].toFixed(4)}"/></feComponentTransfer></filter>`;
      host.append(svg);
      filter = `url(#${id})`;
    }
    // one slot per cut; each shows a picture (a fresh crop when they repeat) and pushes in
    const rate = ML.clamp(p.cut_rate, 0.15, 0.6), n = Math.max(1, Math.ceil((end - at) / rate));
    const slots = [];
    for (let i = 0; i < n; i++) {
      const src = pics[i % pics.length], img = src.cloneNode(true);
      img.removeAttribute("data-slot"); img.removeAttribute("data-slot-sample");
      const px = Math.round(ML.rnd(i, 11) * 100), py = Math.round(ML.rnd(i, 12) * 100);
      const mono = p.tint !== "duotone" && p.text_over === "typing" && ML.rnd(i, 13) < 0.34;
      img.style.cssText = `position:absolute;inset:0;width:100%;height:100%;max-width:none;margin:0;border-radius:0;object-fit:cover;object-position:${px}% ${py}%;transform-origin:50% 50%;visibility:hidden;` +
        `filter:${filter !== "none" ? filter : mono ? "grayscale(1)" : "var(--x-pic-filter)"}`;
      layer.append(img);
      slots.push({ img, t0: at + i * rate });
      if (i % 2 === 0) ctx.sfx(at + i * rate, "tap", 0.18);
    }
    // grain: one seeded speckle canvas, shifted per slot (static within a slot)
    let grain = null;
    if (p.grain) {
      const gw = Math.ceil(W / 2) + 64, gh = Math.ceil(H / 2) + 64;
      grain = mk("canvas", `position:absolute;left:-64px;top:-64px;width:${gw * 2}px;height:${gh * 2}px;mix-blend-mode:overlay;opacity:calc(var(--x-grain) * 4);image-rendering:pixelated`, layer);
      grain.width = gw; grain.height = gh;
      const g = grain.getContext("2d"), d = g.createImageData(gw, gh);
      for (let i = 0; i < gw * gh; i++) { const v = ML.rnd(i, 21) * 255; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; }
      g.putImageData(d, 0, 0);
    }
    // the typing line: the target line, or the scene's headline
    let line = null, full = "", typedEl = null, restEl = null, orig = "";
    if (p.text_over === "typing") {
      line = el && el.tagName !== "IMG" && !el.querySelector("img") ? el : host.querySelector(".ml-title");
      if (line) {
        orig = line.innerHTML; full = line.textContent.trim();
        line.innerHTML = ""; typedEl = mk("span", "", line); restEl = mk("span", "visibility:hidden", line);
        ctx.sfx(at, "key", 0.15);
      }
    }
    const sharp = el && imgOf(el);
    const chars = Array.from(full);
    return {
      draw(t) {
        const on = t >= at - 1e-6 && t < end;
        layer.style.visibility = on ? "visible" : "hidden";
        if (sharp) sharp.style.visibility = on ? "hidden" : "";
        if (line) {
          // before the move the line waits empty (its slot kept by the hidden rest); after, it stands complete
          const shown = on ? Math.round(chars.length * ML.lin(t, at + 0.05, Math.max(at + 0.4, end - 0.35))) : t < at ? 0 : chars.length;
          typedEl.textContent = chars.slice(0, shown).join(""); restEl.textContent = chars.slice(shown).join("");
          line.style.color = on ? "var(--x-accent-ink)" : "";
          line.style.textShadow = on ? "0 1px 8px color-mix(in srgb, var(--x-ink) 35%, transparent)" : "";
        }
        if (!on) return;
        const i = ML.clamp(Math.floor((t - at) / rate), 0, n - 1);
        slots.forEach((s, j) => { s.img.style.visibility = j === i ? "visible" : "hidden"; });
        const s = slots[i], u = ML.out(t, s.t0, s.t0 + rate);
        s.img.style.transform = `scale(${(p.push + (1 - p.push) * u).toFixed(5)})`;
        if (grain) grain.style.transform = `translate(${Math.round(ML.rnd(i, 31) * 64)}px, ${Math.round(ML.rnd(i, 32) * 64)}px)`;
        layer.style.opacity = (1 - ML.lin(t, end - 0.12, end)).toFixed(4);
      },
    };
  },
});
