// Art-direction crossfade: the whole frame glides from one art direction to another without a cut. Each direction is a
// full preset of the page tokens (ground, panel, ink, dim, line, accent, accent-ink, edge) plus the light (glow opacity);
// every colour is lerped in linear light between the two presets over .45-.8 s power2.inOut (object-only scope: the
// picture region alone, .35-.45 s ease), and the discrete part (the scene's data-art pattern) swaps at the midpoint.
// Presets are read from looks (a look id) or derived from the current look's own variables the way the source's three
// directions relate: signal (the accent becomes the field, ink on it, the ground becomes the accent), editorial (a pale
// neutral field, the accent muted to dim), pearl (a soft tinted field, accent kept) and inverse. "next look" uses the
// scene's data-next-look, else signal; a look that is not on the page (no change at all) also falls back to signal. A
// ground image crossfades with its direction. Nothing is a fixed colour: every value comes from look variables.
// Source: MengTo/Skills scroll-world-storytelling demo/threejs (MIT: presets + applyPreset, the alt-bead swap).
ML.define({
  id: "transition.art-direction-crossfade",
  category: "transition",
  name: "Art-direction crossfade",
  does: "The whole frame (background field, panels, light and type colours) glides from one art direction to another without a cut.",
  says: ["change", "brand", "before-after", "transition", "choice"],
  energy: 2,
  targets: ["scene", "stage"],
  duration: [0.35, 1],
  params: {
    from: { type: "text", default: "current look" },
    to: { type: "text", default: "next look" },
    duration: { type: "number", range: [0.35, 0.8], default: 0.6, unit: "s" },
    scope: { type: "choice", options: ["whole-frame", "object-only"], default: "whole-frame" },
  },
  pairs: ["camera.push-in", "text-in.punchline"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:agent-skills/web-design/scroll-world-storytelling/demo/threejs/index.html", license: "MIT", note: "presets and applyPreset, lerped per frame" },
  setup(ctx) {
    const { p, at, stage } = ctx;
    const scene = ctx.scene || stage;
    const objectOnly = p.scope === "object-only";
    const host = objectOnly ? scene.querySelector(".ml-pic") || scene : scene;
    const D = objectOnly ? ML.clamp(p.duration, 0.35, 0.45) : ML.clamp(p.duration, 0.45, 0.8);
    const KEYS = ["ground", "panel", "panel-2", "ink", "dim", "line", "accent", "accent-2", "accent-ink", "edge-color", "ring", "glow-1", "glow-2", "bar", "bar-ink"]; // the last four are var()s resolved at the root: they must be carried too
    // resolve a look's colours to rgba through a hidden probe (look id via data-look, else the current cascade)
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;visibility:hidden";
    scene.append(probe);
    // a computed colour may be rgb(), or color(srgb …) / oklch() when a look uses color-mix or wide colours: those go through a pixel
    const cv = document.createElement("canvas"); cv.width = cv.height = 1;
    const g2 = cv.getContext("2d", { willReadFrequently: true });
    const parse = (s) => {
      const m = /^rgba?\(([^)]+)\)/.exec(String(s));
      if (m) { const n = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [n[0], n[1], n[2], n[3] ?? 1]; }
      g2.clearRect(0, 0, 1, 1); g2.fillStyle = String(s); g2.fillRect(0, 0, 1, 1);
      const d = g2.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255];
    };
    const read = (lookId) => {
      if (lookId) probe.setAttribute("data-look", lookId); else probe.removeAttribute("data-look");
      const o = {};
      for (const k of KEYS) { probe.style.color = `var(--x-${k})`; o[k] = parse(getComputedStyle(probe).color); }
      probe.style.color = ""; const pc = getComputedStyle(probe);
      o.glow = parseFloat(pc.getPropertyValue("--x-glow-o")) || 0.42; o.image = pc.getPropertyValue("--x-ground-image").trim() || "none";
      return o;
    };
    const cur = read("");
    const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const mixc = (a, b, w) => a.map((v, i) => v + (b[i] - v) * w);
    const alpha = (c, a) => [c[0], c[1], c[2], a];
    const best = (bg, list) => list.reduce((m, c) => (contrast(bg, c) > contrast(bg, m) ? c : m), list[0]);
    const derive = (name) => { const d = preset(name); return { ...d, ring: d.accent, "glow-1": d.accent, "glow-2": d["accent-2"], bar: d.panel, "bar-ink": d.dim, image: "none" }; };
    const preset = (name) => {
      const c = cur;
      if (name === "signal") {
        const ground = c.accent, ink = best(ground, [c.ink, c["accent-ink"], c.ground]);
        const acc = best(ground, [c.ground, c.panel, c["accent-ink"]]);
        return { ...c, ground, ink, dim: alpha(ink, 0.66), line: alpha(ink, 0.32), "edge-color": alpha(ink, 0.32), accent: acc, "accent-2": mixc(acc, ground, 0.3), "accent-ink": ground, panel: mixc(ground, c.ground, 0.16), "panel-2": mixc(ground, c.ground, 0.28), glow: c.glow * 0.88 };
      }
      if (name === "editorial") {
        const ground = mixc(c.ground, c.panel, 0.5), acc = c.dim;
        return { ...c, ground, panel: mixc(ground, c.panel, 0.6), "panel-2": ground, line: alpha(c.ink, 0.25), "edge-color": alpha(c.ink, 0.25), accent: acc, "accent-2": mixc(acc, ground, 0.4), "accent-ink": best(acc, [c.ground, c.ink]), glow: c.glow * 0.77 };
      }
      if (name === "pearl") {
        const ground = mixc(c.ground, c.dim, 0.12);
        return { ...c, ground, panel: mixc(c.ground, c.panel, 0.3), "panel-2": mixc(ground, c.dim, 0.06), line: alpha(c.ink, 0.22), "edge-color": alpha(c.ink, 0.22), glow: c.glow * 1.1 };
      }
      if (name === "inverse") {
        const ground = c.ink, ink = c.ground;
        return { ...c, ground, ink, panel: mixc(ground, ink, 0.08), "panel-2": mixc(ground, ink, 0.14), dim: mixc(ink, ground, 0.4), line: alpha(ink, 0.14), "edge-color": alpha(ink, 0.14), accent: c["accent-2"], "accent-2": c.accent };
      }
      return { ...c };
    };
    const resolve = (spec) => {
      const s = String(spec || "").trim().toLowerCase();
      if (!s || s === "current" || s === "current look") return { set: cur, art: "current" };
      if (s === "next" || s === "next look") { const nl = scene.dataset.nextLook; return nl ? { set: read(nl), art: nl } : { set: derive("signal"), art: "signal" }; }
      if (/^(signal|editorial|pearl|inverse)$/.test(s)) return { set: derive(s), art: s };
      return { set: read(s), art: s }; // a look id (its css must be on the page)
    };
    const A = resolve(p.from);
    let B = resolve(p.to);
    if (KEYS.every((k) => A.set[k].join() === B.set[k].join())) B = { set: derive("signal"), art: "signal" }; // nothing would change: never a dead move
    probe.remove();
    // lerp in linear light
    const toLin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const toSrgb = (v) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
    const lerpC = (a, b, u) => { const c = [0, 1, 2].map((i) => toSrgb(toLin(a[i]) + (toLin(b[i]) - toLin(a[i])) * u)); return `rgba(${c.map((x) => Math.round(ML.clamp(x, 0, 255))).join(",")},${(a[3] + (b[3] - a[3]) * u).toFixed(3)})`; };
    const p2io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const cssEase = ML.bezier(0.25, 0.1, 0.25, 1);
    if (!objectOnly) host.style.background = "var(--x-ground)";
    // a ground image cannot be lerped: each direction's own image fades with it
    const pics = [A, B].map(({ set }) => {
      if (objectOnly || set.image === "none") return null;
      const d = document.createElement("div");
      d.style.cssText = `position:absolute;inset:0;pointer-events:none;background-image:${set.image}`;
      return d;
    });
    pics.slice().reverse().forEach((d) => d && host.prepend(d));
    host.style.color = "var(--x-ink)";
    const run = Math.max(0.2, Math.min(D, ctx.end - at));
    ctx.sfx(at, "whoosh.soft", 0.3);
    return {
      draw(t) {
        const x = ML.lin(t, at, at + run), u = objectOnly ? cssEase(x) : p2io(x);
        for (const k of KEYS) host.style.setProperty(`--x-${k}`, lerpC(A.set[k], B.set[k], u));
        host.style.setProperty("--x-glow-o", (A.set.glow + (B.set.glow - A.set.glow) * u).toFixed(3));
        if (pics[0]) pics[0].style.opacity = (1 - u).toFixed(4);
        if (pics[1]) pics[1].style.opacity = u.toFixed(4);
        // the discrete part of a direction (its pattern) swaps at the midpoint
        host.dataset.art = x < 0.5 ? A.art : B.art;
      },
    };
  },
});
