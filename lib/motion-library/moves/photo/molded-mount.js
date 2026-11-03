// Molded mount: the photo sits inside a soft molded frame — outer radius 2rem, 8 px of inner padding, a top-to-bottom
// surface gradient, an inset highlight along the top edge, a faint ring and a soft drop — like an object set into a
// tray; the photo inside takes the outer radius minus the padding. Light: the look's panel surfaces (#FFF → #F8F7F4 in
// the source); dark: the look's darkest tone with a lifted ring and a 6 % top highlight. Enter: the mount rises from
// the look's distance and fades in over 0.7 s (power3.out) while the photo settles 1.06 → 1 inside over 0.9 s.
// Source: MengTo/Skills web-design image-first-grid-layout demo (MIT): aspect-[4/5] rounded-[2rem] p-2 molded cards.
ML.define({
  id: "photo.molded-mount",
  category: "photo",
  name: "Molded inset mount",
  does: "Photos sit inside soft molded frames with inner padding and a highlight edge, like objects set into a tray.",
  says: ["luxury", "trust", "calm"],
  energy: 2,
  targets: ["image", "card"],
  duration: [0.8, 3],
  params: {
    theme: { type: "choice", options: ["light", "dark"], default: "light" },
    radius: { type: "number", range: [12, 40], default: 32, unit: "px" },
    padding: { type: "number", range: [4, 16], default: 8, unit: "px" },
  },
  pairs: ["photo.media-settle", "photo.mono-grain-grade"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "land.light",
  source: { from: "MengTo/Skills:agent-skills/web-design/image-first-grid-layout", license: "MIT", note: "the molded card: linear-gradient(#FFF, #F8F7F4), inset 0 2px 4px #fff + 0 8px 20px rgba(0,0,0,.04), 1px black/2 border, p-2, image radius 1.5rem" },
  setup(ctx) {
    const { el, p, at, look } = ctx;
    if (!el) return null;
    const img = el.tagName === "IMG" ? el : el.querySelector("img") || el;
    // a picture another move already masked: the mount goes around that mask, so its shadow is not clipped by it
    const held = img.parentElement && img.parentElement.dataset.mlPic ? img.parentElement : null;
    const outer = held || img;
    const w = outer.offsetWidth, h = outer.offsetHeight, cs = getComputedStyle(outer);
    // the radius and padding scale with the picture, so a small thumbnail and a hero get the same molding
    const k = ML.clamp(Math.min(w, h) / 420, 0.6, 2);
    const R = Math.round(p.radius * k), P = Math.max(3, Math.round(p.padding * k));
    // the look decides how round things are: a square-edged look keeps a square mount, the window always the outer radius minus the padding
    const outerR = `min(${R}px, var(--x-radius))`, innerR = `max(0px, calc(${outerR} - ${P}px))`;
    const mount = document.createElement("div");
    mount.dataset.mlMount = "1";
    // the look's darkest and lightest tones: which of ink / ground is which depends on the look being light or dark
    const lumOf = (expr) => {
      const s = document.createElement("span"); s.style.display = "none"; s.style.color = expr; el.parentElement.append(s);
      const c = getComputedStyle(s).color; s.remove();
      const cv = document.createElement("canvas"); cv.width = cv.height = 1;
      const g = cv.getContext("2d"); g.fillStyle = "#000"; g.fillStyle = c; g.fillRect(0, 0, 1, 1);
      const d = g.getImageData(0, 0, 1, 1).data; return 0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2];
    };
    const inkDark = lumOf("var(--x-ink)") <= lumOf("var(--x-ground)");
    const DEEP = inkDark ? "var(--x-ink)" : "var(--x-ground)", LIGHT = inkDark ? "var(--x-ground)" : "var(--x-ink)";
    const dark = p.theme === "dark";
    const surface = dark
      ? `linear-gradient(180deg, color-mix(in srgb, ${DEEP} 90%, ${LIGHT}) 0%, color-mix(in srgb, ${DEEP} 96%, ${LIGHT}) 100%)`
      : "linear-gradient(180deg, var(--x-panel) 0%, var(--x-panel-2) 100%)";
    const lit = inkDark ? "var(--x-panel)" : `color-mix(in srgb, ${LIGHT} 10%, transparent)`; // the inset highlight on the light theme
    const shadow = dark
      ? `inset 0 1px 0 color-mix(in srgb, ${LIGHT} 6%, transparent), 0 0 0 1px color-mix(in srgb, ${DEEP} 82%, ${LIGHT}), 0 10px 24px color-mix(in srgb, ${DEEP} 22%, transparent)`
      : `inset 0 2px 4px ${lit}, 0 8px 20px color-mix(in srgb, ${DEEP} 6%, transparent)`;
    mount.style.cssText = `position:relative;box-sizing:border-box;flex:none;width:${w}px;height:${h}px;margin:${cs.margin};padding:${P}px;` +
      `border-radius:${outerR};background:${surface};box-shadow:${shadow};` +
      (dark ? "border:0" : `border:1px solid color-mix(in srgb, ${DEEP} 4%, transparent)`);
    // the photo's own window inside the mount
    const win = held || document.createElement("div");
    win.dataset.mlPic = "1"; // later moves on this picture reuse the window instead of nesting another mask
    win.style.cssText = `position:relative;width:100%;height:100%;margin:0;overflow:hidden;border-radius:${innerR};isolation:isolate`;
    outer.parentNode.insertBefore(mount, outer);
    mount.append(win);
    if (!held) win.append(img);
    Object.assign(img.style, { width: "100%", height: "100%", display: "block", margin: "0", borderRadius: "0", transformOrigin: "50% 50%" });
    // the highlight edge: a 1 px light line just inside the top of the mount
    const edge = document.createElement("div");
    edge.style.cssText = `position:absolute;left:${R * 0.6}px;right:${R * 0.6}px;top:1px;height:1px;pointer-events:none;` +
      `background:linear-gradient(90deg, transparent, ${dark ? `color-mix(in srgb, ${LIGHT} 14%, transparent)` : lit}, transparent)`;
    mount.append(edge);
    const rise = (look && look.dist) || 24;
    const power3 = (t, a, b) => 1 - Math.pow(1 - ML.lin(t, a, b), 3);
    ctx.sfx(at, "land.light", 0.2);
    return {
      draw(t) {
        const u = power3(t, at, at + 0.7);
        mount.style.opacity = u.toFixed(4);
        mount.style.translate = u < 1 ? `0 ${((1 - u) * rise).toFixed(2)}px` : "none";
        const s = 1.06 - 0.06 * power3(t, at, at + 0.9);
        img.style.scale = s > 1.00001 ? s.toFixed(5) : "none";
      },
    };
  },
});
