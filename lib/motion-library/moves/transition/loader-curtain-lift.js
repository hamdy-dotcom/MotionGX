// Loader curtain lift: the film opens on a dark loader panel; a thin progress bar fills from the reading-start side
// (scaleX 0 -> 1, power3.out, 1.1 s at the default length) — or a percentage counter counts up — it pauses 0.15 s,
// then the whole panel lifts away (yPercent 0 -> -100, 0.9 s power4.inOut; or drops, or splits top / bottom) and
// hands straight off into the hero: the headline's words rise out of their masks starting ~0.3 s before the panel
// clears. An optional brand line sits above the bar. A riser under the bar, a whoosh on the lift. All timings scale
// with `duration`. Ported from MengTo/Skills cinematic-scroll-storytelling's initPreloader (MIT): the same timeline
// (bar fromTo scaleX 0 -> 1 1.1 s power3.out, then loader yPercent -100 0.9 s power4.inOut at "+=0.15"), here
// seeked from t instead of played.
ML.define({
  id: "transition.loader-curtain-lift",
  category: "transition",
  name: "Loader curtain lift",
  does: "A black screen fills a thin progress bar, then the whole black panel lifts away to uncover the first scene.",
  says: ["arrival", "brand", "luxury", "transition"],
  energy: 3,
  targets: ["scene", "stage"],
  duration: [1.5, 2.4],
  params: {
    exit: { type: "choice", options: ["up", "down", "split"], default: "up" },
    bar: { type: "choice", options: ["line", "counter"], default: "line" },
    duration: { type: "number", range: [1.5, 2.4], default: 2.1, unit: "s" },
    brand: { type: "text", default: "" },
    handoff: { type: "bool", default: true },
  },
  pairs: ["text-in.mask-rise", "camera.push-in"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "riser",
  source: { from: "MengTo/Skills:agent-skills/web-design/cinematic-scroll-storytelling", license: "MIT", note: "initPreloader timeline, seeked from t" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const W = f.W, H = f.H, v = Math.min(W, H) / 100;
    const host = ctx.scene || stage;
    const k = ML.clamp(p.duration, 1.5, 2.4) / 2.15; // 1.1 + 0.15 + 0.9 at the source's own pace
    const barA = at, barB = barA + 1.1 * k, liftA = barB + 0.15 * k, liftB = liftA + 0.9 * k;
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:8;overflow:hidden";
    host.append(layer);
    const mk = (css, parent = layer) => { const d = document.createElement("div"); d.style.cssText = "position:absolute;" + css; parent.append(d); return d; };
    const split = p.exit === "split";
    // the panel (two halves when it splits; their seam is invisible while they meet)
    const halves = split ? [mk(`left:0;top:0;width:${W}px;height:${H / 2 + 1}px;background:var(--x-device)`), mk(`left:0;top:${H / 2}px;width:${W}px;height:${H / 2}px;background:var(--x-device)`)] : [mk(`inset:0;background:var(--x-device)`)];
    const ui = mk(`left:0;top:0;width:${W}px;height:${H}px`);
    const bw = W * (f.wide ? 0.28 : 0.46), bh = Math.max(2, 0.22 * v), by = H / 2;
    const track = mk(`left:${(W - bw) / 2}px;top:${by - bh / 2}px;width:${bw}px;height:${bh}px;background:color-mix(in srgb, var(--x-accent-ink) 14%, transparent);border-radius:${bh}px;overflow:hidden;display:${p.bar === "line" ? "block" : "none"}`, ui);
    const fill = mk(`left:0;top:0;width:100%;height:100%;background:var(--x-accent-ink);transform-origin:${ctx.rtl ? "100%" : "0%"} 50%;transform:scaleX(0)`, track);
    const count = mk(`left:0;width:${W}px;top:${by - 4.4 * v}px;height:${8.8 * v}px;line-height:${8.8 * v}px;text-align:center;font:500 ${(6.4 * v).toFixed(1)}px var(--x-mono-font);color:var(--x-accent-ink);font-variant-numeric:tabular-nums;direction:ltr;display:${p.bar === "counter" ? "block" : "none"}`, ui);
    const brand = String(p.brand || "").trim();
    const title = mk(`left:0;width:${W}px;top:${by - 9 * v}px;text-align:center;font:var(--x-head-weight) ${(3.4 * v).toFixed(1)}px var(--x-head-font);color:var(--x-accent-ink);letter-spacing:${ctx.rtl ? 0 : "0.04em"};opacity:0;display:${brand ? "block" : "none"}`, ui);
    title.textContent = brand;
    if (p.bar === "counter" && brand) count.style.top = `${by - 1 * v}px`;
    // the hand-off: the headline's words rise out of masks as the panel clears
    let words = [];
    const head = p.handoff ? host.querySelector(".ml-title") : null;
    if (head) {
      words = ML.split(head, "words").map((w) => {
        const m = document.createElement("span");
        m.style.cssText = "display:inline-block;overflow:hidden;vertical-align:top;padding:0.06em 0.02em 0.16em;margin:-0.06em -0.02em -0.16em";
        w.replaceWith(m); m.append(w);
        return w;
      });
    }
    const handA = liftB - 0.3, rise = 0.8;
    const p3out = (x) => 1 - Math.pow(1 - x, 4);
    const p4io = (x) => (x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2);
    ctx.sfx(barA, "riser", 0.35);
    ctx.sfx(liftA + 0.1, "whoosh.soft", 0.45);
    return {
      draw(t) {
        const done = t >= liftB;
        layer.style.visibility = done ? "hidden" : "visible";
        const b = p3out(ML.lin(t, barA, barB));
        fill.style.transform = `scaleX(${b.toFixed(4)})`;
        count.textContent = `${Math.round(b * 100)}%`;
        title.style.opacity = ML.ease(t, barA, barA + 0.4).toFixed(4);
        const u = p4io(ML.lin(t, liftA, liftB));
        if (split) {
          halves[0].style.transform = `translateY(${(-u * (H / 2 + 2)).toFixed(2)}px)`;
          halves[1].style.transform = `translateY(${(u * (H / 2 + 2)).toFixed(2)}px)`;
          ui.style.opacity = (1 - ML.lin(t, liftA, liftA + 0.2)).toFixed(4);
        } else {
          const y = (p.exit === "down" ? 1 : -1) * u * H;
          halves[0].style.transform = `translateY(${y.toFixed(2)}px)`;
          ui.style.transform = `translateY(${y.toFixed(2)}px)`;
        }
        words.forEach((w, i) => {
          const e = ML.expo(t, handA + i * 0.08, handA + i * 0.08 + rise);
          w.style.translate = e < 1 ? `0 ${((1 - e) * 110).toFixed(2)}%` : "none";
        });
      },
    };
  },
});
