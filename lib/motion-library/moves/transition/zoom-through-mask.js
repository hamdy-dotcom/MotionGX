// Zoom through a letter or logo: the camera dives into one letter's counter (the hole in a P, an O, a ق), a period's
// dot, or the hole in a logo. The scene scales around that point 1 -> 15-60 over `speed` (0.5-0.8 s) expo.in, so the
// letter strokes blow past the frame edges as dark curves, a 4 px motion blur on them in the fastest 0.2 s; the hole
// is a circular window onto the next scene (the film's next scene, or a plate in the look's accent), which
// counter-scales 0.6 -> 1 for parallax. When the hole outgrows the frame the old scene is dropped and the next one
// stays full-bleed (the plate continuing a slow push). With no next scene a period dot's plate is its own colour
// (jhylee95: the dot's colour covers the screen). The next scene is styled by a stylesheet rule that holds only while
// this scene is displayed, so nothing is left on it when a frame far from this one is drawn. The counter is measured on the laid-out text (a Range over one
// character), so Arabic words stay whole and joined: you zoom into one counter, no letter is split.
// Pictures are never enlarged past their pixels: they fade as the zoom takes off.
// Source: prompt-motion jhylee95-opus-5-5-max-is, topi-003-opus5-5-15, 3xtihor-made-with-claude-opus,
// arjunsh1607-opus-5-5-on-ultracode, andginja-i-gave-claude-opus, jayscambler-credit-to-opus-5-5 (reference only).
ML.define({
  id: "transition.zoom-through-mask",
  category: "transition",
  name: "Zoom through a letter or logo",
  does: "The camera dives into one letter's counter or the hole in a logo; the image inside grows until it becomes the full next scene.",
  says: ["transition", "reveal", "energy", "arrival", "brand"],
  energy: 4,
  targets: ["scene", "headline", "logo", "image", "word"],
  duration: [0.5, 1],
  params: {
    mask: { type: "choice", options: ["letter-counter", "logo-hole"], default: "letter-counter" },
    letter_index: { type: "number", range: [0, 20], default: 0 },
    speed: { type: "number", range: [0.5, 0.8], default: 0.6, unit: "s" },
    parallax: { type: "bool", default: true },
    focus: { type: "choice", options: ["letter-counter", "period-dot", "logo-hole", "icon"], default: "letter-counter" },
  },
  pairs: ["text-in.punchline", "transition.colour-field-cut"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.heavy",
  source: { from: "prompt-motion:jhylee95-opus-5-5-max-is", license: "reference", note: "our own rebuild; also topi-003-opus5-5-15, 3xtihor-made-with-claude-opus, arjunsh1607-opus-5-5-on-ultracode, andginja-i-gave-claude-opus, jayscambler-credit-to-opus-5-5" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const scene = ctx.scene || stage;
    const W = f.W, H = f.H;
    const sr = stage.getBoundingClientRect(), k = sr.width / (stage.offsetWidth || 1) || 1;
    const toStage = (r) => ({ x: (r.left - sr.left) / k, y: (r.top - sr.top) / k, w: r.width / k, h: r.height / k });
    const own = ctx.el && ctx.el !== stage && ctx.el !== scene ? ctx.el : null;
    let focus = p.focus;
    if (p.mask === "logo-hole" && focus === "letter-counter") focus = "logo-hole";
    if (own && (own.tagName.toLowerCase() === "svg" || own.tagName === "IMG") && /letter|period/.test(focus)) focus = "logo-hole";

    // ── the focus point (fx, fy) and the hole's radius r0 at scale 1 ──
    let fx = W / 2, fy = H / 2, r0 = Math.min(W, H) * 0.03, dotFill = false;
    const COUNTER = /[OoQ0DdbpqgaeAPRB689قفوهةمصضطظ]/;
    const text = own && !/^(svg|img)$/i.test(own.tagName) ? own : scene.querySelector(".ml-title, .ml-hero, [data-slot-sample='headline']");
    const chars = [];
    if (text) {
      const tw = document.createTreeWalker(text, NodeFilter.SHOW_TEXT);
      for (let n = tw.nextNode(); n; n = tw.nextNode()) { let i = 0; for (const ch of Array.from(n.textContent)) { if (!/\s/.test(ch)) chars.push({ n, i, ch }); i += ch.length; } }
    }
    const measure = (c) => {
      const r = document.createRange(); r.setStart(c.n, c.i); r.setEnd(c.n, c.i + c.ch.length);
      const rc = r.getClientRects()[0] || r.getBoundingClientRect(), b = toStage(rc);
      const cs = getComputedStyle(c.n.parentElement), fs = parseFloat(cs.fontSize) || 100;
      const cv = document.createElement("canvas").getContext("2d");
      cv.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const m = cv.measureText(c.ch), asc = m.fontBoundingBoxAscent || fs * 0.9, desc = m.fontBoundingBoxDescent || fs * 0.25;
      const base = b.y + asc * (b.h / (asc + desc || 1)), capH = cv.measureText("H").actualBoundingBoxAscent || fs * 0.7, xH = cv.measureText("x").actualBoundingBoxAscent || fs * 0.5;
      return { b, fs, base, capH, xH };
    };
    if (/letter|period/.test(focus) && chars.length) {
      let pick = -1;
      if (focus === "period-dot") pick = chars.map((c) => c.ch).lastIndexOf(".");
      if (pick < 0) {
        focus = "letter-counter";
        const start = Math.min(chars.length - 1, Math.max(0, Math.round(p.letter_index)));
        for (let j = 0; j < chars.length; j++) { const q = (start + j) % chars.length; if (COUNTER.test(chars[q].ch)) { pick = q; break; } }
        if (pick < 0) pick = start;
      }
      const c = chars[pick], m = measure(c), ch = c.ch;
      if (focus === "period-dot") { r0 = m.fs * 0.07; fx = m.b.x + m.b.w / 2; fy = m.base - r0; dotFill = true; }
      else if (/[؀-ۿ]/.test(ch)) { fx = m.b.x + m.b.w * 0.5; fy = m.base - m.fs * (/[قف]/.test(ch) ? 0.39 : 0.3); r0 = m.fs * 0.075; }
      else {
        // the bowl's centre by letter (share of the glyph's width, height above the baseline)
        const X = { P: 0.55, R: 0.52, B: 0.55, b: 0.6, p: 0.6, d: 0.4, q: 0.4, g: 0.42, a: 0.44, e: 0.5 }[ch] ?? 0.5;
        const up = /[PRB]/.test(ch) ? m.capH * 0.68 : /[A]/.test(ch) ? m.capH * 0.32 : /[OQ0D689]/.test(ch) ? m.capH * (ch === "6" ? 0.3 : ch === "9" ? 0.68 : 0.5) : m.xH * (ch === "e" ? 0.62 : 0.5);
        fx = m.b.x + m.b.w * X; fy = m.base - up;
        r0 = /[PRB]/.test(ch) ? m.capH * 0.105 : /[A]/.test(ch) ? m.capH * 0.08 : /[OQ0D]/.test(ch) ? m.capH * 0.24 : /[689]/.test(ch) ? m.capH * 0.12 : m.xH * (ch === "e" ? 0.14 : 0.22);
      }
    } else {
      // a logo's hole / an icon: the logo (target, else the scene's), its first shape's centre
      const logo = (own && (own.tagName.toLowerCase() === "svg" || own.tagName === "IMG") ? own : null) || scene.querySelector("[data-slot='logo'], [data-slot-sample='logo'], svg, img");
      if (logo) {
        const shape = logo.tagName.toLowerCase() === "svg" ? logo.querySelector("rect, circle, path, ellipse, polygon") || logo : logo;
        const b = toStage(shape.getBoundingClientRect());
        fx = b.x + b.w / 2; fy = b.y + b.h / 2; r0 = Math.max(4, Math.min(b.w, b.h) * (focus === "icon" ? 0.42 : 0.26));
      }
    }
    const Rcover = Math.hypot(Math.max(fx, W - fx), Math.max(fy, H - fy));
    const Smax = ML.clamp(Rcover / r0, 15, 60);
    // a small counter caps at 60x before it covers the frame: the window opens the rest of the way as the scale peaks, so there is no pop at the swap
    const Kopen = Math.max(1, (Rcover * 1.02) / (r0 * Smax));
    const L = ML.clamp(p.speed, 0.5, 0.8), done = at + L;

    // ── the next scene: the film's own, else a plate (accent ground, a disc; a dot's colour when diving a period) ──
    let next = scene !== stage ? scene.nextElementSibling : null;
    while (next && !(next.classList && next.classList.contains("ml-scene"))) next = next.nextElementSibling;
    let plate = null;
    if (!next) {
      plate = document.createElement("div");
      const bg = dotFill ? "var(--x-ink)" : "var(--x-accent)", ink = dotFill ? "var(--x-ground)" : "var(--x-accent-ink)", d = Math.min(W, H) * 0.42;
      plate.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none;z-index:9;overflow:hidden;display:none;background:radial-gradient(ellipse at 50% 45%, color-mix(in srgb, ${bg} 86%, ${ink}) 0%, ${bg} 60%, color-mix(in srgb, ${bg} 80%, var(--x-device)) 100%)`;
      const disc = document.createElement("div");
      disc.style.cssText = `position:absolute;left:${W / 2 - d / 2}px;top:${H / 2 - d / 2}px;width:${d}px;height:${d}px;border-radius:50%;background:${ink};box-shadow:0 0 0 ${(d * 0.08).toFixed(0)}px color-mix(in srgb, ${ink} 22%, transparent), 0 0 0 ${(d * 0.2).toFixed(0)}px color-mix(in srgb, ${ink} 10%, transparent)`;
      plate.append(disc);
      stage.append(plate);
    }
    const inc = next || plate;
    // the rule: while this scene is on, the next one sits above it on its ground, windowed by variables draw(t) sets
    const uid = "ml-zm-" + Math.floor(ML.rnd(at * 97 + r0, 6) * 1e9).toString(36), onScene = scene !== stage ? `[data-${uid}][style*="display: block"] ~ ` : "";
    if (scene !== stage) scene.setAttribute(`data-${uid}`, "");
    inc.setAttribute(`data-${uid}-in`, "");
    const rule = document.createElement("style");
    rule.textContent = `${onScene}[data-${uid}-in] { display: block !important; opacity: 1 !important; z-index: 9; background: var(--x-ground); background-image: var(--x-ground-image); clip-path: var(--${uid}-clip); scale: var(--${uid}-scale); transform-origin: var(--${uid}-origin); }`;
    document.head.append(rule);
    const setIn = (clip, scale, origin) => { stage.style.setProperty(`--${uid}-clip`, clip); stage.style.setProperty(`--${uid}-scale`, scale); stage.style.setProperty(`--${uid}-origin`, origin); };
    // what goes soft in the fastest 0.2 s, and the pictures that fade instead of growing past their pixels
    const PIC = /^(IMG|VIDEO|CANVAS|PICTURE)$/i;
    const pics = [...scene.querySelectorAll("img, video, canvas, picture")];
    const soft = [];
    const walk = (n) => { for (const c of n.children) { if (PIC.test(c.tagName)) continue; if (!c.querySelector("img,video,canvas,picture")) soft.push(c); else walk(c); } };
    walk(scene);
    const expoIn = (x) => (x <= 0 ? 0 : Math.pow(2, 10 * (x - 1)));
    ctx.sfx(at, "whoosh.heavy", 0.45);
    return {
      draw(t) {
        const u = ML.lin(t, at, done), s = 1 + (Smax - 1) * expoIn(u);
        const r = r0 * s * Math.pow(Kopen, expoIn(u)), swapped = t >= done || r >= Rcover * 1.02;
        // the old scene, scaled around the hole
        if (t < at) { scene.style.scale = ""; scene.style.visibility = ""; }
        else {
          scene.style.transformOrigin = `${fx.toFixed(2)}px ${fy.toFixed(2)}px`;
          scene.style.scale = s.toFixed(4);
          scene.style.visibility = swapped ? "hidden" : "";
        }
        // 4 px on screen: the filter runs inside the scale, so it is divided by it
        const blur = (4 * ML.lin(t, done - 0.2, done)) / s;
        soft.forEach((e) => { e.style.filter = blur > 0.02 && !swapped ? `blur(${blur.toFixed(3)}px)` : ""; });
        const po = 1 - ML.lin(s, 1.25, 2.2);
        pics.forEach((e) => { e.style.opacity = po < 1 ? po.toFixed(4) : ""; });
        // the next scene through the hole: counter-scaled 0.6 -> 1 (parallax), then full-bleed and a slow push
        if (t < at) { setIn("circle(0px at 0 0)", "none", "50% 50%"); return; }
        let q = p.parallax ? 0.6 + 0.4 * Math.min(1, (s - 1) / (Smax - 1) * 1.0) : 1;
        if (swapped) q = plate ? 1 + 0.04 * ML.ease(t, done, done + 1.6) : 1;
        setIn(swapped ? "none" : `circle(${(r / q).toFixed(2)}px at ${fx.toFixed(2)}px ${fy.toFixed(2)}px)`, q === 1 ? "none" : q.toFixed(4), swapped ? "50% 50%" : `${fx.toFixed(2)}px ${fy.toFixed(2)}px`);
      },
    };
  },
});
