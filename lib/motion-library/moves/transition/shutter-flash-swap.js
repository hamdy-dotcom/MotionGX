// Shutter flash swap: the studio engine's app capture. A screen is "captured" `captures` times, `interval` apart: at
// each capture time T the next page crossfades in (opacity 0 -> 1 over 0.25 s starting at T − 0.35), the screen
// flashes like a camera shutter (filter brightness(`brightness`) -> 1 over 0.35 s from T, power1.out) with a switch
// click, and a thumbnail of that page pops into a side strip at T + 0.1 (scale 0.4 -> 1, y 60 -> 0 on a back ease), so
// the run of screens reads as captured proof. Pages: the screen's own [data-page] children, else its current face
// followed by built pages (look-coloured app skeletons). The strip sits beside the screen on its free side (below on
// a tall frame; the reading end on a wide one), or along the screen's inner edge when there is no room. A short slot
// (`end`) tightens the interval, then takes captures off, so the last one still finishes on screen.
// Source: MotionGX lib/studio-engine/assets/scenes.js S.appcapture (own).
ML.define({
  id: "transition.shutter-flash-swap",
  category: "transition",
  name: "Shutter flash swap",
  does: "Each captured screen flashes bright like a camera shutter as the next page crossfades in.",
  says: ["proof", "tech", "step"],
  energy: 3,
  targets: ["screen"],
  duration: [0.7, 6],
  params: {
    brightness: { type: "number", range: [1.5, 2.5], default: 2 },
    thumbnail: { type: "bool", default: true },
    captures: { type: "number", range: [1, 5], default: 3 },
    interval: { type: "number", range: [0.4, 1.5], default: 0.6, unit: "s" },
  },
  pairs: ["transition.recede-fade", "transition.crossfade"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "click",
  source: { from: "own:lib/studio-engine/assets/scenes.js", license: "own", note: "S.appcapture: brightness(2) shutter, page crossfade, thumbnail strip" },
  setup(ctx) {
    const { p, at, end, stage, f } = ctx;
    const scene = ctx.scene || stage;
    // the screen: the target, else the scene's main panel, else the stage
    const screen = (ctx.el && ctx.el !== stage && ctx.el !== scene && ctx.el) || scene.querySelector(".ml-pic .ml-panel, .ml-panel") || scene;
    if (getComputedStyle(screen).position === "static") screen.style.position = "relative";
    const n = Math.round(ML.clamp(p.captures, 1, 5));
    const sw = screen.offsetWidth, sh = screen.offsetHeight, u = Math.min(sw, sh) / 100;
    const strip0 = (e) => { e.querySelectorAll("[data-slot],[id]").forEach((x) => { x.removeAttribute("data-slot"); x.removeAttribute("id"); }); e.removeAttribute("data-slot"); e.removeAttribute("id"); return e; };
    let pages = [...screen.querySelectorAll(":scope > [data-page]")];
    const live = strip0(screen.cloneNode(true)); // the live face before any built page goes on it
    const built = [];
    if (pages.length < 2) {
      // built pages over the live face: header, a hero number bar, a chart or rows — skeletons in the look's colours
      for (let k = 1; k < n; k++) {
        const pg = document.createElement("div");
        pg.style.cssText = `position:absolute;inset:0;background:var(--x-panel);border-radius:inherit;overflow:hidden;padding:${(6 * u).toFixed(1)}px;display:flex;flex-direction:column;gap:${(3.2 * u).toFixed(1)}px;box-sizing:border-box`;
        const bar = (w, h, c, r = "var(--x-radius-s)") => { const d = document.createElement("div"); d.style.cssText = `flex:0 0 auto;width:${w}%;height:${h.toFixed(1)}px;border-radius:${r};background:${c}`; pg.append(d); return d; };
        bar(34 + 20 * ML.rnd(k, 1), 3.2 * u, "var(--x-panel-2)");
        bar(58 + 20 * ML.rnd(k, 2), 9 * u, k % 2 ? "var(--x-accent)" : "color-mix(in srgb, var(--x-accent) 22%, var(--x-panel-2))", "calc(var(--x-radius) * .5)");
        if (k % 2) {
          const ch = document.createElement("div");
          ch.style.cssText = `flex:1 1 auto;display:flex;align-items:flex-end;gap:${(2 * u).toFixed(1)}px;padding:${(3 * u).toFixed(1)}px;border-radius:calc(var(--x-radius) * .5);background:var(--x-panel-2);min-height:0`;
          for (let i = 0; i < 7; i++) { const b = document.createElement("div"); b.style.cssText = `flex:1;height:${(30 + 65 * ML.rnd(i, k + 3)).toFixed(0)}%;border-radius:${(1.2 * u).toFixed(1)}px;background:${i === 5 ? "var(--x-accent-2)" : "var(--x-accent)"}`; ch.append(b); }
          pg.append(ch);
        } else {
          for (let i = 0; i < 4; i++) {
            const row = document.createElement("div");
            row.style.cssText = `flex:0 0 auto;display:flex;align-items:center;gap:${(3 * u).toFixed(1)}px;padding:${(1.6 * u).toFixed(1)}px 0;border-bottom:1px solid var(--x-line)`;
            const dot = document.createElement("div"); dot.style.cssText = `width:${(8 * u).toFixed(1)}px;height:${(8 * u).toFixed(1)}px;border-radius:50%;background:${i % 2 ? "var(--x-accent-2)" : "var(--x-accent)"}`;
            const ln = document.createElement("div"); ln.style.cssText = `flex:1;height:${(2.6 * u).toFixed(1)}px;border-radius:var(--x-radius-s);background:var(--x-panel-2);max-width:${(45 + 40 * ML.rnd(i, k)).toFixed(0)}%`;
            const val = document.createElement("div"); val.style.cssText = `margin-inline-start:auto;width:${(12 * u).toFixed(1)}px;height:${(2.6 * u).toFixed(1)}px;border-radius:var(--x-radius-s);background:var(--x-good)`;
            row.append(dot, ln, val); pg.append(row);
          }
        }
        screen.append(pg); built.push(pg);
      }
      pages = [null, ...built]; // null: the screen's live face
    }
    let count = Math.min(n, pages.length), iv = ML.clamp(p.interval, 0.4, 1.5);
    const room = Math.max(0.2, end - at), runOf = (c) => 0.35 + (c - 1) * iv + 0.55; // first flash … last thumbnail settled
    if (runOf(count) > room && count > 1) { iv = Math.max(0.4, (room - 0.9) / (count - 1)); while (count > 1 && runOf(count) > room) count--; }
    // the strip of thumbnails
    let thumbs = [];
    if (p.thumbnail) {
      const sb = ctx.box(screen), W = f.W, H = f.H, m = f.m * 0.5;
      const room = { below: H - (sb.y + sb.h) - m * 2, above: sb.y - m * 2, start: (ctx.rtl ? W - sb.x - sb.w : sb.x) - m * 2, end: (ctx.rtl ? sb.x : W - sb.x - sb.w) - m * 2 };
      const ar = sw / sh, gap = Math.max(10, Math.min(W, H) * 0.018);
      const fitRow = (h) => Math.min(h, (sb.w - gap * (count - 1)) / count / ar); // thumbs side by side
      const fitCol = (w) => Math.min(w, ((sb.h - gap * (count - 1)) / count) * ar);
      // never above (the headline lives there): below on a tall frame, the sides on a wide one
      const opts = f.tall ? [["below", fitRow(room.below)], ["end", fitCol(room.end) / ar]] : [["end", fitCol(room.end) / ar], ["start", fitCol(room.start) / ar], ["below", fitRow(room.below)]];
      opts.sort((a, b) => b[1] - a[1]);
      let [side, th] = opts[0];
      let inside = false;
      if (th < Math.min(W, H) * 0.06) { inside = true; side = f.tall ? "below" : "end"; th = f.tall ? Math.min(sh * 0.2, fitRow(9e9) * 0.6) : Math.min(sh * 0.24, fitCol(9e9) / ar * 0.7); }
      const tw = th * ar;
      const row = side === "below" || side === "above";
      const strip = document.createElement("div");
      const tot = row ? count * tw + (count - 1) * gap : count * th + (count - 1) * gap;
      let x, y;
      const endX = ctx.rtl ? sb.x - m - tw : sb.x + sb.w + m, startX = ctx.rtl ? sb.x + sb.w + m : sb.x - m - tw;
      if (row) { x = sb.x + (sb.w - tot) / 2; y = inside ? sb.y + sb.h - th - gap : side === "below" ? sb.y + sb.h + m : sb.y - m - th; }
      else { x = inside ? (ctx.rtl ? sb.x + gap : sb.x + sb.w - tw - gap) : side === "end" ? endX : startX; y = sb.y + (sb.h - tot) / 2; }
      x = ML.clamp(x, 2, W - (row ? tot : tw) - 2); y = ML.clamp(y, 2, H - (row ? th : tot) - 2);
      strip.style.cssText = `position:absolute;left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;display:flex;flex-direction:${row ? (ctx.rtl ? "row-reverse" : "row") : "column"};gap:${gap}px;pointer-events:none;z-index:7`;
      (scene === stage ? stage : scene).append(strip);
      const k = tw / sw;
      for (let i = 0; i < count; i++) {
        const t0 = document.createElement("div");
        t0.style.cssText = `position:relative;width:${tw.toFixed(1)}px;height:${th.toFixed(1)}px;overflow:hidden;border-radius:calc(var(--x-radius) * .45);background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);transform-origin:50% 100%`;
        const face = pages[i] ? strip0(pages[i].cloneNode(true)) : live.cloneNode(true);
        face.style.cssText += `;position:absolute;left:0;top:0;width:${sw}px;height:${sh}px;right:auto;bottom:auto;box-sizing:border-box;margin:0;transform:scale(${k.toFixed(5)});transform-origin:0 0;opacity:1;filter:none;box-shadow:none;border:0`;
        t0.append(face); strip.append(t0); thumbs.push(t0);
      }
    }
    const T = Array.from({ length: count }, (_, i) => at + 0.35 + i * iv);
    T.forEach((x) => ctx.sfx(x, "click", 0.5));
    const p1o = (x) => 1 - (1 - x) * (1 - x);
    return {
      draw(t) {
        // pages: the first is simply there; page i is in from T[i] − 0.35 (each later page covers the ones before)
        pages.forEach((pg, i) => { if (!pg) return; const o = i >= count ? 0 : i === 0 ? 1 : ML.lin(t, T[i] - 0.35, T[i] - 0.1); pg.style.opacity = o.toFixed(4); pg.style.visibility = o > 0 ? "visible" : "hidden"; });
        // the shutter: the brightest flash still running
        let b = 1;
        for (const x of T) if (t >= x) b = Math.max(b, p.brightness - (p.brightness - 1) * p1o(ML.lin(t, x, x + 0.35)));
        screen.style.filter = b > 1.0005 ? `brightness(${b.toFixed(4)})` : "";
        thumbs.forEach((th, i) => {
          const a = T[i] + 0.1, v = ML.back(t, a, a + 0.45, 1.7), o = ML.lin(t, a, a + 0.12);
          th.style.opacity = o.toFixed(4);
          th.style.visibility = t < a ? "hidden" : "visible";
          th.style.transform = `translateY(${((1 - v) * 60).toFixed(2)}px) scale(${(0.4 + 0.6 * v).toFixed(4)})`;
        });
      },
    };
  },
});
