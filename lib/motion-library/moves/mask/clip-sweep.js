// Clip sweep surface change: a pixel-aligned duplicate of the object wearing a new finish sits exactly over it, and
// clip-path inset(0 0 (1 − e)·100% 0) reveals it from one edge as e runs 0 → 1 (power2.inOut over `duration`) — the
// object stays put while its surface changes. Coat mode: the duplicate's opacity = e instead (a lacquer coating
// everything at once). sweep+coat: the finish sweeps over the first 65 %, then a gloss layer coats over the rest
// ("stain, then gloss"). The finish comes from the look: char (darkened, warm, low saturation), mono (greyscale), tint
// (the accent laid over it as colour), lacquer (richer and glossier), or a different picture when the target names one
// (data-after="<url>" or the `after` param) for a real before → after. Only colour filters, never a blur or an
// enlargement. Arabic: left / right mirror, so a sideways sweep runs in the reading direction.
// Source: MengTo/Skills agent-skills/web-design/horizontal-scroll-scenes (demo.html .char3 / .coat4, MIT).
ML.define({
  id: "mask.clip-sweep",
  category: "mask",
  name: "Clip sweep surface change",
  does: "A new surface — char, paint, lacquer, a recolour — sweeps over an object from one edge, changing its finish while the object stays put.",
  says: ["change", "before-after", "result"],
  energy: 2,
  targets: ["image", "shape", "card"],
  duration: [0.8, 2],
  params: {
    direction: { type: "choice", options: ["down", "up", "left", "right"], default: "down" },
    mode: { type: "choice", options: ["sweep", "coat", "sweep+coat"], default: "sweep" },
    duration: { type: "number", range: [0.8, 1.8], default: 1.2, unit: "s" },
    finish: { type: "choice", options: ["char", "mono", "tint", "lacquer"], default: "tint" },
    after: { type: "text", default: "" },
    edge: { type: "bool", default: true },
  },
  pairs: ["data.before-after-figure", "text-emphasis.accent-word"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:agent-skills/web-design/horizontal-scroll-scenes", license: "MIT", note: "demo.html .char3 clip sweep + .coat4 opacity coat; finishes are our own" },
  setup(ctx) {
    const { el, p, at, stage } = ctx;
    if (!el) return null;
    const host = ctx.scene || stage;
    const whole = el === stage || el === host;
    const b = whole ? { x: 0, y: 0, w: ctx.f.W, h: ctx.f.H } : ctx.box(el);
    const cs = getComputedStyle(whole ? host : el);
    const dur = ML.clamp(+p.duration, 0.8, 1.8);
    let dir = p.direction;
    if (ctx.rtl && (dir === "left" || dir === "right")) dir = dir === "left" ? "right" : "left";
    // the layer over the object: its own box and corners
    const layer = document.createElement("div");
    layer.style.cssText = `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;border-radius:${cs.borderRadius};overflow:hidden;pointer-events:none;z-index:3`;
    // the duplicate wearing the new finish
    const src = whole ? null : el;
    let dup;
    const other = (p.after || (src && src.getAttribute("data-after")) || "").trim();
    if (src && src.tagName === "IMG" && other) {
      dup = document.createElement("img"); dup.src = other;
      dup.style.cssText = `object-fit:${cs.objectFit};object-position:${cs.objectPosition}`;
    } else if (src) {
      dup = src.cloneNode(true);
      dup.removeAttribute("data-slot"); dup.removeAttribute("id");
      dup.querySelectorAll("[data-slot],[id]").forEach((n) => { n.removeAttribute("data-slot"); n.removeAttribute("id"); });
    } else {
      dup = document.createElement("div"); dup.style.background = "var(--x-accent)";
    }
    dup.setAttribute("aria-hidden", "true");
    dup.style.position = "absolute"; dup.style.inset = "0"; dup.style.width = "100%"; dup.style.height = "100%"; dup.style.margin = "0";
    dup.style.borderRadius = "0"; dup.style.clipPath = "none"; dup.style.translate = "none"; dup.style.scale = "none"; dup.style.transform = "none"; dup.style.opacity = "1";
    const looks = { char: "brightness(.42) sepia(.55) saturate(.7) contrast(1.15)", mono: "grayscale(1) contrast(1.08)", tint: "none", lacquer: "saturate(1.4) contrast(1.12) brightness(1.04)" };
    if (!other) dup.style.filter = looks[p.finish] || "none";
    const surface = document.createElement("div");
    surface.style.cssText = "position:absolute;inset:0";
    surface.append(dup);
    if (p.finish === "tint" && !other) {
      const tint = document.createElement("div");
      tint.style.cssText = "position:absolute;inset:0;background:var(--x-accent);mix-blend-mode:color;opacity:.9";
      surface.append(tint);
    }
    layer.append(surface);
    // the gloss coat (sweep+coat, lacquer): a light sheen across the object
    const gloss = document.createElement("div");
    gloss.style.cssText = "position:absolute;inset:0;background:linear-gradient(135deg, color-mix(in srgb, var(--x-panel) 55%, transparent) 0%, transparent 38%, transparent 62%, color-mix(in srgb, var(--x-panel) 28%, transparent) 100%)";
    layer.append(gloss);
    // a thin bright line riding the sweep front
    const line = document.createElement("div");
    const across = dir === "left" || dir === "right";
    line.style.cssText = across
      ? "position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;background:color-mix(in srgb, var(--x-accent-2) 60%, var(--x-panel));box-shadow:0 0 10px 1px color-mix(in srgb, var(--x-accent-2) 50%, transparent)"
      : "position:absolute;left:0;right:0;height:2px;margin-top:-1px;background:color-mix(in srgb, var(--x-accent-2) 60%, var(--x-panel));box-shadow:0 0 10px 1px color-mix(in srgb, var(--x-accent-2) 50%, transparent)";
    layer.append(line);
    host.append(layer);

    const quad = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2); // power2.inOut
    const sweepEnd = p.mode === "sweep+coat" ? at + dur * 0.65 : at + dur;
    const clipAt = (e) => {
      const v = ((1 - e) * 100).toFixed(3) + "%";
      return dir === "down" ? `inset(0 0 ${v} 0)` : dir === "up" ? `inset(${v} 0 0 0)` : dir === "right" ? `inset(0 ${v} 0 0)` : `inset(0 0 0 ${v})`;
    };
    ctx.sfx(at, "whoosh.soft", 0.35);
    if (p.mode === "sweep+coat") ctx.sfx(sweepEnd, "swell", 0.3);
    return {
      draw(t) {
        const on = t >= at - 1e-6;
        layer.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        let e, coat;
        if (p.mode === "coat") { e = 1; coat = quad(ML.lin(t, at, at + dur)); }
        else { e = quad(ML.lin(t, at, sweepEnd)); coat = p.mode === "sweep+coat" ? quad(ML.lin(t, sweepEnd, at + dur)) : 0; }
        surface.style.clipPath = e >= 1 ? "none" : clipAt(e);
        surface.style.opacity = p.mode === "coat" ? coat.toFixed(4) : "1";
        gloss.style.opacity = (p.mode === "coat" ? (p.finish === "lacquer" ? coat : 0) : coat).toFixed(4);
        const sweeping = p.mode !== "coat" && p.edge && e > 0 && e < 1;
        line.style.visibility = sweeping ? "visible" : "hidden";
        line.style.opacity = (Math.min(1, e * 8) * Math.min(1, (1 - e) * 8)).toFixed(3);
        const pos = (dir === "down" || dir === "right" ? e : 1 - e) * 100;
        if (across) line.style.left = pos.toFixed(3) + "%"; else line.style.top = pos.toFixed(3) + "%";
      },
    };
  },
});
