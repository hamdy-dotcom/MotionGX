// Slice smear out: the word leaves cut into strips that shove sideways and smear into horizontal streaks.
// Halves (slices 2-5): a 1 px accent line draws across the cut (scaleX 0 -> 1, 0.15 s); the word, duplicated into
// clip-path strips (top 0-50 % / bottom 50-100 % for two; 3 or 5 even strips otherwise), shoves ±40 px in opposite
// directions (0.2 s power2.in), then each strip smears: scaleX 1 -> 3 from its leading side, blur 0 -> 20 px, a slit-
// scan streak behind it (a copy stretched far along its travel, so the strip's own pixels draw out as lines), opacity
// -> 0 over 0.2 s. Bands (slices 6-20): 14-20 thin horizontal bands, each thrown 120-400 px with a seeded sign (or all
// one way), scaleX 1 -> 2.5, blur 0 -> 8 px over 0.4 s power3.in, 0.01 s apart in a seeded order; the bands keep the
// text's own colours, so it reads as smeared pixels. Background unchanged. direction: "split" alternates the strips,
// "left" / "right" send them all one way. Pictures are never blurred: a picture smears by stretch and streak only.
// Source: prompt-motion tolgayhickiran-motion-graphics-from-a, itsuki-dev-opus-5-5-cooked-this (reference only: our
// own rebuild).
ML.define({
  id: "transition.slice-smear-out",
  category: "transition",
  name: "Slice smear out",
  does: "The word is cut into strips (two halves, or many bands) that shift sideways and smear into horizontal streaks as it leaves.",
  says: ["transition", "energy", "speed", "tech"],
  energy: 5,
  targets: ["headline", "word", "scene", "image"],
  duration: [0.3, 0.6],
  params: {
    slices: { type: "number", range: [2, 20], default: 2 },
    cut_line: { type: "bool", default: true },
    direction: { type: "choice", options: ["split", "left", "right"], default: "split" },
  },
  pairs: ["text-in.punchline", "transition.slice-glitch", "transition.line-streak-exit"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:tolgayhickiran-motion-graphics-from-a", license: "reference", note: "with itsuki-dev-opus-5-5-cooked-this; our own rebuild" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const scene = ctx.scene || stage;
    const el = ctx.el && ctx.el !== stage ? ctx.el : scene;
    const whole = el === scene;
    const k = Math.min(f.W, f.H) / 1080;
    const isPic = /^(IMG|VIDEO|CANVAS|PICTURE)$/i.test(el.tagName) || (!whole && !!el.querySelector("img,video,canvas,picture") && !el.textContent.trim());
    // the strips live in a layer laid exactly over the target
    const host = whole ? scene : el.offsetParent || el.parentElement;
    const L = el.offsetLeft, T = el.offsetTop, w = whole ? f.W : el.offsetWidth, h = whole ? f.H : el.offsetHeight;
    const layer = document.createElement("div");
    layer.dataset.mlFx = "1";
    layer.style.cssText = `position:absolute;left:${whole ? 0 : L}px;top:${whole ? 0 : T}px;width:${w}px;height:${h}px;pointer-events:none;overflow:visible;z-index:5`;
    // one copy of the target, in its own box (no slot, no id), set where it sits
    const copy = () => {
      const c = el.cloneNode(true);
      c.removeAttribute("data-slot"); c.removeAttribute("id"); c.dataset.mlFx = "1";
      c.querySelectorAll("[data-slot],[id]").forEach((e) => { e.removeAttribute("data-slot"); e.removeAttribute("id"); });
      if (whole) { c.style.position = "absolute"; c.style.inset = "0"; c.style.display = "block"; }
      else Object.assign(c.style, { position: "absolute", left: "0", top: "0", width: w + "px", height: h + "px", margin: "0", boxSizing: "border-box" });
      return c;
    };
    const n = Math.round(ML.clamp(+p.slices || 2, 2, 20));
    const bandsMode = n > 5;
    const N = bandsMode ? Math.max(14, n) : n;
    const one = p.direction === "left" ? -1 : p.direction === "right" ? 1 : 0;
    const strips = [];
    for (let i = 0; i < N; i++) {
      const y0 = (i / N) * 100, y1 = ((i + 1) / N) * 100;
      const wrap = document.createElement("div");
      wrap.style.cssText = `position:absolute;inset:0;clip-path:inset(${y0.toFixed(3)}% -400% ${(100 - y1).toFixed(3)}% -400%)`;
      const body = copy(), streak = copy();
      const sign = one || (bandsMode ? (ML.rnd(i, 41) < 0.5 ? -1 : 1) : (i % 2 ? 1 : -1));
      // the streak: the strip's own pixels drawn out far along its travel, behind it
      streak.style.opacity = "0";
      wrap.append(streak, body);
      layer.append(wrap);
      const dist = bandsMode ? (120 + 280 * ML.rnd(i, 42)) * k : 40 * k;
      const delay = bandsMode ? Math.floor(ML.rnd(i, 43) * N) * 0.01 : 0;
      strips.push({ body, streak, sign, dist, delay, origin: sign > 0 ? "0% 50%" : "100% 50%" });
    }
    // the cut line across the middle of the target (halves only)
    const cut = document.createElement("div");
    cut.style.cssText = `position:absolute;left:${(-0.04 * w).toFixed(1)}px;width:${(1.08 * w).toFixed(1)}px;top:${(h / 2 - 0.5).toFixed(1)}px;height:${Math.max(1, Math.round(1.5 * k))}px;background:var(--x-accent);transform-origin:${ctx.rtl ? "100%" : "0%"} 50%`;
    if (p.cut_line && !bandsMode) layer.append(cut);
    host.append(layer);

    const p2i = (x) => x * x, p3i = (x) => x * x * x;
    const lineA = at, lineB = at + 0.15;
    const shA = p.cut_line && !bandsMode ? lineB : at, shB = shA + 0.2, smA = shB, smB = smA + 0.2;
    const bandD = 0.4;
    const last = bandsMode ? at + (N - 1) * 0.01 + bandD : smB;
    ctx.sfx(bandsMode ? at : shA, "whoosh.soft", 0.4);
    return {
      draw(t) {
        const on = t >= at && t < last;
        layer.style.visibility = on ? "visible" : "hidden";
        // the target itself: whole until the strips take over, gone after
        el.style.visibility = t >= (bandsMode ? at : shA) && !whole ? "hidden" : "";
        if (whole) for (const c of scene.children) if (!c.dataset.mlFx) c.style.visibility = t >= (bandsMode ? at : shA) ? "hidden" : "";
        const l = ML.out(t, lineA, lineB);
        cut.style.transform = `scaleX(${l.toFixed(4)})`;
        cut.style.opacity = (1 - ML.lin(t, shA, shA + 0.12)).toFixed(4);
        for (const s of strips) {
          let x = 0, sx = 1, blur = 0, o = 1, streakO = 0;
          if (bandsMode) {
            const u = p3i(ML.lin(t, at + s.delay, at + s.delay + bandD));
            x = s.sign * s.dist * u; sx = 1 + 1.5 * u; blur = 8 * u * k; o = 1 - u; streakO = 0.5 * Math.sin(Math.PI * u);
          } else {
            const a = p2i(ML.lin(t, shA, shB)), m = ML.lin(t, smA, smB);
            x = s.sign * s.dist * a; sx = 1 + 2 * m; blur = 20 * m * k; o = 1 - m; streakO = 0.6 * Math.sin(Math.PI * Math.min(1, m * 1.4));
          }
          s.body.style.transformOrigin = s.origin;
          s.body.style.transform = `translateX(${x.toFixed(2)}px) scaleX(${sx.toFixed(4)})`;
          s.body.style.filter = blur > 0.05 && !isPic ? `blur(${blur.toFixed(2)}px)` : "";
          s.body.style.opacity = o.toFixed(4);
          // the slit-scan streak: the same strip stretched far toward where it is going, faint
          s.streak.style.transformOrigin = s.origin;
          s.streak.style.transform = `translateX(${x.toFixed(2)}px) scaleX(${(1 + (sx - 1) * 4).toFixed(4)})`;
          s.streak.style.opacity = streakO.toFixed(4);
        }
      },
    };
  },
});
