// Rolling object wipe: a round object (the brand's mark on a disc by default, or any short text / emoji) about 40 % of
// the frame's height rolls across the frame — x crosses from off one side to off the other over `duration` power2.in,
// its rotation exactly distance / radius so it rolls without slipping — with a horizontal motion blur that grows with
// its speed (fading copies trailing along x), and a hard edge of the next scene's colour following right behind it (a clip
// from the entry side up to the object's centre), so the roller is the wipe edge. Direction follows reading order
// unless set; the next scene's colour is a look variable; an optional `next` title rises on the new colour.
// Source: prompt-motion thilina-a-i-also-tried-it (reference only: our own rebuild).
ML.define({
  id: "transition.rolling-object-wipe",
  category: "transition",
  name: "Rolling object wipe",
  does: "An object rolls across the frame with motion blur and the next scene's colour follows right behind it, so the roller is the wipe edge.",
  says: ["transition", "playful"],
  energy: 4,
  targets: ["scene"],
  duration: [0.4, 0.8],
  params: {
    direction: { type: "choice", options: ["reading", "ltr", "rtl"], default: "reading" },
    object: { type: "text", default: "brand object" },
    next_colour: { type: "choice", options: ["accent", "accent-2", "ink", "device", "panel"], default: "accent" },
    size: { type: "number", range: [0.25, 0.5], default: 0.4 },
    duration: { type: "number", range: [0.4, 0.8], default: 0.5, unit: "s" },
    next: { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "transition.colour-field-cut"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:thilina-a-i-also-tried-it", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, end, stage, f } = ctx;
    const scene = ctx.scene || stage;
    const W = scene.offsetWidth || f.W, H = scene.offsetHeight || f.H;
    const dir = p.direction === "ltr" ? 1 : p.direction === "rtl" ? -1 : ctx.rtl ? -1 : 1;
    const D = Math.min(ML.clamp(p.duration, 0.4, 0.8), Math.max(0.2, end - at)); // always crosses before the scene ends
    const r = Math.min(H * ML.clamp(p.size, 0.25, 0.5), W * 0.7) / 2;
    const col = { accent: "var(--x-accent)", "accent-2": "var(--x-accent-2)", ink: "var(--x-ink)", device: "var(--x-device)", panel: "var(--x-panel)" }[p.next_colour] || "var(--x-accent)";
    const onCol = { accent: "var(--x-accent-ink)", "accent-2": "var(--x-ink)", ink: "var(--x-ground)", device: "var(--x-ground)", panel: "var(--x-ink)" }[p.next_colour] || "var(--x-accent-ink)";
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:6;overflow:hidden";
    scene.append(layer);
    const plate = document.createElement("div");
    plate.style.cssText = `position:absolute;inset:0;background:${col}`;
    layer.append(plate);
    let title = null, words = [];
    const text = (p.next || "").trim();
    if (text) {
      title = document.createElement("div");
      const fs = Math.min(parseFloat(getComputedStyle(scene).getPropertyValue("--x-head-size")) || 104, W * 0.09);
      title.style.cssText = `position:absolute;left:${f.m}px;right:${f.m}px;top:0;bottom:0;display:flex;align-items:center;justify-content:center;text-align:center;font:var(--x-head-weight) ${fs.toFixed(1)}px/1.12 var(--x-head-font);letter-spacing:var(--x-head-track);color:${onCol};text-wrap:balance`;
      const line = document.createElement("div"); line.textContent = text; title.append(line); plate.append(title); words = ML.split(line, "words"); // split inside a plain block: a flex parent would drop the spaces
    }
    // the roller: a disc with a rim, a few marks so its turn reads, and the object in the middle
    const roller = document.createElement("div");
    roller.style.cssText = `position:absolute;left:0;top:${(H / 2 - r).toFixed(2)}px;width:${2 * r}px;height:${2 * r}px;z-index:2`;
    layer.append(roller);
    const disc = document.createElement("div");
    disc.style.cssText = `position:absolute;inset:0;border-radius:50%;background:var(--x-panel);box-shadow:inset 0 0 0 ${(r * 0.07).toFixed(1)}px var(--x-ink), var(--x-shadow);overflow:hidden;display:flex;align-items:center;justify-content:center`;
    roller.append(disc);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4, rr = r * (0.66 + 0.08 * ML.rnd(i, 3)), s = r * (0.09 + 0.05 * ML.rnd(i, 5));
      const dot = document.createElement("div");
      dot.style.cssText = `position:absolute;left:${(r + Math.cos(a) * rr - s).toFixed(1)}px;top:${(r + Math.sin(a) * rr - s).toFixed(1)}px;width:${2 * s}px;height:${2 * s}px;border-radius:${i % 2 ? "50%" : "30%"};background:${i % 2 ? "var(--x-accent)" : "var(--x-ink)"}`;
      disc.append(dot);
    }
    const mid = document.createElement("div");
    mid.style.cssText = `position:relative;width:${(r * 1.05).toFixed(1)}px;height:${(r * 1.05).toFixed(1)}px;display:flex;align-items:center;justify-content:center;font:var(--x-head-weight) ${(r * 0.62).toFixed(1)}px/1 var(--x-head-font);color:var(--x-ink)`;
    disc.append(mid);
    const logo = /^brand( object)?$|^logo$/i.test(p.object.trim()) ? scene.querySelector('[data-slot="logo"], [data-slot-sample="logo"], [data-logo]') : null;
    if (logo) {
      const c = logo.cloneNode(true);
      c.removeAttribute("data-slot"); c.removeAttribute("data-slot-sample"); c.removeAttribute("id");
      // the mark alone when it is an icon + word lockup: keep its first shape, sized to the middle
      if (c.tagName.toLowerCase() === "svg") {
        const first = c.querySelector("rect,circle,path,polygon,ellipse");
        if (first && c.querySelector("text")) { c.innerHTML = ""; c.append(first); const bb = logo.querySelector("rect,circle,path,polygon,ellipse").getBBox(); c.setAttribute("viewBox", `${bb.x} ${bb.y} ${bb.width} ${bb.height}`); }
        c.setAttribute("width", String(r * 0.8)); c.setAttribute("height", String(r * 0.8));
      } else { c.style.maxWidth = r * 0.9 + "px"; c.style.maxHeight = r * 0.9 + "px"; }
      mid.append(c);
    } else {
      const head = scene.querySelector(".ml-title");
      const t0 = /^brand( object)?$/i.test(p.object.trim()) ? ((head && head.textContent.trim()) || "•").split(/\s+/)[0] : p.object.trim();
      const glyph = Array.from(t0).length <= 3 || ML.ARABIC.test(t0) ? t0 : Array.from(t0)[0];
      mid.textContent = glyph;
      ML.fit(mid, r * 1.1);
    }
    // motion blur along x: a few fading copies of the roller trailing behind it (strength follows its speed)
    const ghosts = [1, 2, 3, 4].map((j) => { const gh = roller.cloneNode(true); gh.style.zIndex = "1"; gh.style.filter = "none"; layer.insertBefore(gh, roller); return { gh, j }; });
    const p2in = (x) => x * x * x;
    const x0 = dir > 0 ? -2 * r - 4 : W + 4, x1 = dir > 0 ? W + 4 : -2 * r - 4, dist = Math.abs(x1 - x0);
    ctx.sfx(at + D * 0.35, "whoosh.soft", 0.45);
    if (text) ctx.sfx(at + D + 0.1, "pop.soft", 0.25);
    return {
      draw(t) {
        layer.style.visibility = t < at ? "hidden" : "visible";
        const u = p2in(ML.lin(t, at, at + D)), x = x0 + (x1 - x0) * u;
        const speed = t > at && t < at + D ? (3 * Math.pow(ML.lin(t, at, at + D), 2) * dist) / D : 0; // px / s
        roller.style.transform = `translateX(${x.toFixed(2)}px) rotate(${((dir * dist * u) / r * (180 / Math.PI)).toFixed(2)}deg)`;
        roller.style.visibility = u >= 1 ? "hidden" : "visible";
        const smear = Math.min(r * 0.5, speed * 0.012), rot = (dir * dist * u) / r * (180 / Math.PI);
        ghosts.forEach(({ gh, j }) => {
          gh.style.transform = `translateX(${(x - dir * smear * j / 4).toFixed(2)}px) rotate(${(rot - (dir * smear * j / 4) / r * (180 / Math.PI)).toFixed(2)}deg)`;
          gh.style.opacity = u >= 1 || smear < 1 ? "0" : (0.32 * (1 - j / 5)).toFixed(4);
        });
        roller.style.opacity = smear > 1 ? "0.85" : "1";
        // the colour edge sits at the roller's centre, filled from the side it entered
        const cx = x + r, edge = ML.clamp(cx / W, 0, 1) * 100;
        plate.style.clipPath = u >= 1 ? "none" : dir > 0 ? `inset(0 ${(100 - edge).toFixed(3)}% 0 0)` : `inset(0 0 0 ${edge.toFixed(3)}%)`;
        words.forEach((w, i) => { const v = ML.land(t, at + D + 0.1 + i * 0.06, at + D + 0.45 + i * 0.06); w.style.opacity = v.toFixed(4); w.style.translate = `0 ${((1 - v) * 30).toFixed(2)}px`; });
      },
    };
  },
});
