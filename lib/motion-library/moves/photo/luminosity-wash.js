// Luminosity wash: the photo is drained into the panel's dark tint and darkened by scrims so the text, specs or glass
// panel on top own the attention. The container is solid look-dark (the darker of the look's ink and ground, with a
// breath of accent); the photo sits at opacity .5 (.2–.6) in mix-blend luminosity (it adopts the container's hue;
// screen / multiply as alternatives), contrast(1.1) brightness(.9). Scrims: bottom (transparent → dark/80), top (the
// hero's dark .95 / .4 at 40 % / .1), right (the directional to-right 80 → 20 → 60 % plus a to-top 80 → 0 → 20 %; it
// mirrors in RTL) or both. Optional glass panel: dark/20 with a 1 px light/10 edge, radius 16, a serif title and mono
// label / value rows split by 1 px light/10 lines, rows rising in on a .1 s stagger. (The source's backdrop-blur is left
// out on purpose: the library never blurs a picture, so the panel is a little denser instead.)
// Entrance: the photo fades 0 → target over .8 s while settling 1.06 → 1, the wash comes up over .6 s, the panel rises
// 24 px and fades over .6 s power3.out .25 s later. Optional beat: colour returns (luminosity → normal) over 1 s.
// Source: MengTo/Skills web-design split-layout-technical / image-first-grid-layout ("object-cover opacity-50
// mix-blend-luminosity" + "bg-gradient-to-b from-transparent to-[#151914]/80"), skeuomorphic-ui and
// agency-grid-layout-minimal demos (MIT).
ML.define({
  id: "photo.luminosity-wash",
  category: "photo",
  name: "Luminosity tinted photo",
  does: "A photo is drained into the panel's dark tint and darkened by scrims so text, specs or a glass panel on top own the attention.",
  says: ["calm", "luxury", "focus", "precision", "proof"],
  energy: 1,
  targets: ["image", "card", "scene", "list"],
  duration: [1, 20],
  params: {
    opacity: { type: "number", range: [0.2, 0.6], default: 0.5 },
    blend: { type: "choice", options: ["luminosity", "screen", "multiply"], default: "luminosity" },
    scrim: { type: "choice", options: ["bottom", "top", "right", "both"], default: "bottom" },
    panel: { type: "choice", options: ["none", "glass"], default: "none" },
    colour_return: { type: "bool", default: false },
    title: { type: "text", default: "" },
    rows: { type: "text", default: "" },
  },
  pairs: ["photo.mono-grain-grade", "photo.media-settle"],
  avoid: ["playful", "celebration", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "MengTo/Skills:agent-skills/web-design/split-layout-technical", license: "MIT", note: "the luminosity-blended photo on #151914 with its scrims and spec-table glass overlay; also image-first-grid-layout, skeuomorphic-ui, agency-grid-layout-minimal" },
  setup(ctx) {
    const { el, p, at, end, rtl, scene, stage, look } = ctx;
    if (!el) return null;
    // the picture: the target itself, or the first picture inside a card / list / scene
    const img = el.tagName === "IMG" ? el : el.querySelector("img");
    let box;
    if (img) {
      box = img.parentElement;
      if (!box.dataset.mlPic) {
        const cs = getComputedStyle(img), w = img.offsetWidth, h = img.offsetHeight;
        box = document.createElement("div");
        box.dataset.mlPic = "1";
        box.style.cssText = `position:relative;overflow:hidden;isolation:isolate;flex:none;width:${w}px;height:${h}px;border-radius:${cs.borderRadius};margin:${cs.margin}`;
        img.parentNode.insertBefore(box, img);
        box.append(img);
        Object.assign(img.style, { width: "100%", height: "100%", display: "block", margin: "0" });
      }
    } else {
      // no picture: the wash and scrims still darken the target so what sits on it reads
      box = el;
      if (getComputedStyle(box).position === "static") box.style.position = "relative";
      box.style.isolation = "isolate";
    }
    // look-dark and look-light: whichever of ink / ground is darker, so a dark look still gets a dark wash
    const lumOf = (expr) => {
      const s = document.createElement("span"); s.style.display = "none"; s.style.color = expr; box.append(s);
      const c = getComputedStyle(s).color; s.remove();
      const cv = document.createElement("canvas"); cv.width = cv.height = 1;
      const g = cv.getContext("2d"); g.fillStyle = "#000"; g.fillStyle = c; g.fillRect(0, 0, 1, 1);
      const d = g.getImageData(0, 0, 1, 1).data; return 0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2];
    };
    const inkDark = lumOf("var(--x-ink)") <= lumOf("var(--x-ground)");
    const DARK = `color-mix(in srgb, ${inkDark ? "var(--x-ink)" : "var(--x-ground)"} 93%, var(--x-accent))`;
    const LIGHT = inkDark ? "var(--x-ground)" : "var(--x-ink)";
    const a = (c, pct) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;
    const H = box.offsetHeight || 300, W = box.offsetWidth || 300;

    // the container's dark tint (under the picture)
    const ground = document.createElement("div");
    ground.style.cssText = `position:absolute;inset:0;z-index:-1;pointer-events:none;background:${DARK};opacity:0`;
    box.prepend(ground);
    // the colour-return layer: the same picture in normal blend, faded in on the beat
    let colour = null;
    if (img) {
      img.style.transformOrigin = "50% 50%";
      if (p.colour_return) {
        colour = img.cloneNode();
        colour.removeAttribute("data-slot");
        Object.assign(colour.style, { position: "absolute", inset: "0", mixBlendMode: "normal", opacity: "0" });
        box.append(colour);
      }
    }
    // the scrims
    const dir = rtl ? "to left" : "to right";
    const scrims = {
      bottom: [`linear-gradient(to bottom, transparent 0%, ${a(DARK, 80)} 100%)`],
      top: [`linear-gradient(to top, ${a(DARK, 95)} 0%, ${a(DARK, 40)} 40%, ${a(DARK, 10)} 100%)`],
      right: [`linear-gradient(${dir}, ${a(DARK, 80)} 0%, ${a(DARK, 20)} 50%, ${a(DARK, 60)} 100%)`, `linear-gradient(to top, ${a(DARK, 80)} 0%, transparent 50%, ${a(DARK, 20)} 100%)`],
    };
    const layers = p.scrim === "both" ? [...scrims.top, scrims.right[0]] : scrims[p.scrim] || scrims.bottom;
    const scrim = document.createElement("div");
    scrim.style.cssText = `position:absolute;inset:0;z-index:1;pointer-events:none;background:${layers.join(",")};opacity:0` + (p.scrim === "right" ? ";mix-blend-mode:multiply" : "");
    box.append(scrim);

    // the glass panel with a serif title and mono label / value rows
    let panel = null, rowEls = [];
    if (p.panel === "glass") {
      const title = (p.title || (scene && scene.querySelector(".ml-sub")?.textContent) || "").trim();
      const rows = String(p.rows || "").split(";").map((r) => r.split("|").map((x) => x.trim())).filter((r) => r[0]);
      const pad = Math.round(ML.clamp(Math.min(W, H) * 0.08, 10, 32));
      const fs = Math.round(ML.clamp(H * 0.1, 16, 44));
      panel = document.createElement("div");
      panel.style.cssText = `position:absolute;z-index:2;inset-inline:${pad}px;bottom:${pad}px;max-height:calc(100% - ${pad * 2}px);overflow:hidden;box-sizing:border-box;` +
        `padding:${Math.round(pad * 0.9)}px;border-radius:min(16px, var(--x-radius));background:${a(DARK, 45)};border:1px solid ${a(LIGHT, 10)};color:${LIGHT};text-align:start;opacity:0`;
      if (title) {
        const h = document.createElement("div");
        h.textContent = title;
        h.style.cssText = `font:400 ${fs}px/1.15 var(--x-serif-font);margin-bottom:${rows.length ? Math.round(fs * 0.5) : 0}px`;
        panel.append(h);
      }
      rowEls = rows.map(([k, v]) => {
        const r = document.createElement("div");
        r.style.cssText = `display:flex;justify-content:space-between;gap:1em;padding:${Math.round(fs * 0.28)}px 0;border-top:1px solid ${a(LIGHT, 10)};font:500 ${Math.max(14, Math.round(fs * 0.5))}px var(--x-mono-font)`;
        const kk = document.createElement("span"); kk.textContent = k; kk.className = "ml-label"; kk.style.cssText = `font:inherit;color:${a(LIGHT, 60)}`;
        const vv = document.createElement("span"); vv.textContent = v || ""; vv.dir = "auto"; kk.dir = "auto";
        r.append(kk, vv); panel.append(r);
        return r;
      });
      box.append(panel);
      if (!title && !rows.length) { panel.remove(); panel = null; }
    }
    const target = ML.clamp(p.opacity, 0.2, 0.6);
    const power3 = (t, s, e) => 1 - Math.pow(1 - ML.lin(t, s, e), 3);
    const rise = (look && look.dist) ? look.dist * 0.86 : 24;
    const beat = Math.min(end - 1.1, at + Math.max(1.4, (end - at) * 0.5));
    ctx.sfx(at, "swell", 0.16);
    if (colour) ctx.sfx(beat, "whoosh.soft", 0.14);
    if (panel) ctx.sfx(at + 0.25, "card", 0.16);
    return {
      draw(t) {
        const w = ML.ease(t, at, at + 0.6);
        ground.style.opacity = w.toFixed(4);
        scrim.style.opacity = w.toFixed(4);
        if (img) {
          const u = ML.out(t, at, at + 0.8);
          // before the move the photo is itself; as it starts it drains into the tint (blend on from the first frame of the move)
          img.style.mixBlendMode = t >= at ? p.blend : "normal";
          img.style.filter = t >= at ? `contrast(${(1 + 0.1 * u).toFixed(4)}) brightness(${(1 - 0.1 * u).toFixed(4)})` : "none";
          img.style.opacity = t >= at ? (1 - (1 - target) * w).toFixed(4) : "1";
          const s = 1.06 - 0.06 * u;
          img.style.scale = t >= at && s > 1.00001 ? s.toFixed(5) : "none";
          if (colour) {
            const c = ML.ease(t, beat, beat + 1);
            colour.style.opacity = (c * Math.min(1, target + 0.4)).toFixed(4);
            colour.style.scale = img.style.scale;
          }
        }
        if (panel) {
          const q = power3(t, at + 0.25, at + 0.85);
          panel.style.opacity = q.toFixed(4);
          panel.style.translate = q < 1 ? `0 ${((1 - q) * rise).toFixed(2)}px` : "none";
          rowEls.forEach((r, i) => {
            const v = power3(t, at + 0.45 + i * 0.1, at + 1.05 + i * 0.1);
            r.style.opacity = v.toFixed(4);
            r.style.translate = v < 1 ? `0 ${((1 - v) * rise * 0.5).toFixed(2)}px` : "none";
          });
        }
      },
    };
  },
});
