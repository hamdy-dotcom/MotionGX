// Whip off: after a short hold the word pulls back a touch against its travel (0–60 px, scaleX .97, 0.25 s ease-in-out)
// and then shoots off the frame in 0.25 s on power3.in — skewX −8°, a directional blur that grows
// with its speed (an SVG feGaussianBlur on one axis only; never on a picture), 0–6 ghosts trailing at falling opacity,
// and 20–40 thin speed lines (1–2 px, 20–50 % ink, 80–600 px) crossing the same way at twice its speed, fading out.
// "forward" goes the way the script reads (right in LTR, left in RTL). Every pose comes from t alone: the ghosts are
// the word's own path sampled a few hundredths of a second back.
// Source: prompt-motion vanshwtfff-this-is-seriously-crazy + hanifproduktif-use-this-prompt-in (reference) — our own code.
ML.define({
  id: "text-emphasis.whip-off",
  category: "text-emphasis",
  name: "Word whips off with motion blur",
  does: "The word (optionally after pulling back a touch) shoots off-frame sideways with heavy directional blur, ghosts and speed lines.",
  says: ["speed", "energy", "transition", "change"],
  energy: 5,
  targets: ["headline", "word", "logo", "image"],
  duration: [0.25, 0.6],
  params: {
    direction: { type: "choice", options: ["forward", "left", "right", "up"], default: "forward" },
    anticipation: { type: "number", range: [0, 60], default: 30, unit: "px" },
    blur: { type: "number", range: [0, 30], default: 20, unit: "px" },
    streaks: { type: "bool", default: true },
    ghosts: { type: "number", range: [0, 6], default: 4 },
    hold: { type: "number", range: [0, 1.5], default: 0.4, unit: "s" },
    whip: { type: "number", range: [0.18, 0.4], default: 0.25, unit: "s" },
  },
  pairs: ["text-in.punchline", "transition.whip-pan"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.heavy",
  source: { from: "prompt-motion:vanshwtfff-this-is-seriously-crazy", license: "reference", note: "also hanifproduktif-use-this-prompt-in; our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl, stage } = ctx;
    if (!el) return null;
    const dir = p.direction === "forward" ? (rtl ? "left" : "right") : p.direction;
    const sx = dir === "right" ? 1 : dir === "left" ? -1 : 0, sy = dir === "up" ? -1 : 0;
    const W = stage.offsetWidth, H = stage.offsetHeight;
    const b = ctx.box(el);
    const pic = el.tagName === "IMG" || !!el.querySelector?.("img, video, canvas");
    const u = Math.max(0.5, Math.min(2, (sx ? b.h : b.w) / 120));
    // travel: far enough that the word's trailing edge leaves the frame by 20 %
    const dist = sx > 0 ? W - b.x + W * 0.2 : sx < 0 ? b.x + b.w + W * 0.2 : b.y + b.h + H * 0.2;
    const ant = p.anticipation;
    const run = (ant > 0 ? 0.25 : 0) + p.whip;
    const a0 = Math.max(at, Math.min(at + p.hold, end - 0.08 - run)), a1 = a0 + (ant > 0 ? 0.25 : 0), w1 = a1 + p.whip;
    const whipCurve = (x) => x * x * x; // power3.in
    // the word's offset along its travel, from t alone
    const along = (t) => {
      const back = ant > 0 ? -ant * ML.ease(t, a0, a1) : 0;
      return t < a1 ? back : back + (dist + ant) * whipCurve(ML.lin(t, a1, w1));
    };
    const speed = (t) => Math.abs(along(t) - along(t - 1 / 60)) * 60; // px / s
    const vmax = (dist + ant) / Math.max(0.05, p.whip) * 1.2;
    // horizontal (or vertical) blur only on text / shapes, never on a picture
    let fe = null, fid = "";
    if (!pic && p.blur > 0) {
      const NS = "http://www.w3.org/2000/svg";
      fid = "ml-whip-" + Math.floor(ML.rnd(b.x + b.y * 3, 7) * 1e9);
      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
      Object.assign(svg.style, { position: "absolute", width: "0", height: "0" });
      svg.innerHTML = `<filter id="${fid}" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="0 0"/></filter>`;
      stage.append(svg);
      fe = svg.querySelector("feGaussianBlur");
    }
    // ghosts: copies of the word just behind it on its own path, fading
    const n = Math.round(p.ghosts);
    const host = el.parentElement;
    const sk = stage.getBoundingClientRect().width / (W || 1) || 1;
    const ghosts = [];
    for (let i = 0; i < n && host; i++) {
      const g = el.cloneNode(true);
      g.removeAttribute("data-slot"); g.removeAttribute("id"); g.querySelectorAll?.("[data-slot],[id]").forEach((c) => { c.removeAttribute("data-slot"); c.removeAttribute("id"); });
      g.setAttribute("aria-hidden", "true");
      Object.assign(g.style, { position: "absolute", left: "0px", top: "0px", width: (b.w).toFixed(2) + "px", height: (b.h).toFixed(2) + "px", margin: "0", pointerEvents: "none", opacity: "0", boxSizing: "border-box" });
      host.insertBefore(g, el);
      // place it exactly over the word, whatever its containing block
      const gb = g.getBoundingClientRect(), eb = el.getBoundingClientRect();
      g.style.left = ((eb.left - gb.left) / sk).toFixed(2) + "px"; g.style.top = ((eb.top - gb.top) / sk).toFixed(2) + "px";
      ghosts.push(g);
    }
    // speed lines across the word's band
    const lines = [];
    let sl = null;
    if (p.streaks) {
      sl = document.createElement("div");
      Object.assign(sl.style, { position: "absolute", inset: "0", pointerEvents: "none", overflow: "hidden", zIndex: "5" });
      stage.append(sl);
      const count = 20 + Math.round(ML.rnd(b.w + 1, 2) * 20);
      for (let i = 0; i < count; i++) {
        const d = document.createElement("i");
        const len = (80 + ML.rnd(i, 11) * 520) * u, th = 1 + Math.round(ML.rnd(i, 12)), o = 0.2 + ML.rnd(i, 13) * 0.3;
        const off = (ML.rnd(i, 14) - 0.5) * 1.6; // across the band, a bit wider than the word
        const lag = ML.rnd(i, 15) * 0.12;
        Object.assign(d.style, { position: "absolute", display: "block", background: `color-mix(in srgb, var(--x-ink) ${(o * 100).toFixed(0)}%, transparent)`, borderRadius: "2px" });
        if (sx) Object.assign(d.style, { width: len.toFixed(1) + "px", height: th + "px", top: (b.y + b.h / 2 + off * b.h).toFixed(1) + "px", left: "0" });
        else Object.assign(d.style, { height: len.toFixed(1) + "px", width: th + "px", left: (b.x + b.w / 2 + off * b.w).toFixed(1) + "px", top: "0" });
        sl.append(d);
        lines.push({ d, len, lag });
      }
    }
    ctx.sfx(a1 - 0.04, "whoosh.heavy", 0.55);
    const pose = (t) => {
      const x = along(t), k = ML.lin(t, a1, a1 + p.whip * 0.4);
      const sq = ant > 0 ? 1 - 0.03 * ML.ease(t, a0, a1) * (1 - k) : 1;
      const skew = sx ? -8 * sx * k : 0;
      return `translate(${(sx * x).toFixed(2)}px, ${(sy * x).toFixed(2)}px) skewX(${skew.toFixed(2)}deg) scale(${sx ? sq.toFixed(4) : 1}, ${sx ? 1 : sq.toFixed(4)})`;
    };
    const gone = (t) => t >= w1;
    return {
      draw(t) {
        el.style.transform = t < a0 ? "" : pose(t);
        el.style.transformOrigin = "50% 50%";
        el.style.opacity = gone(t) ? "0" : "1";
        if (fe) {
          const v = ML.clamp(speed(t) / vmax), s = (p.blur * v).toFixed(2);
          fe.setAttribute("stdDeviation", sx ? `${s} 0` : `0 ${s}`);
          el.style.filter = v > 0.01 && !gone(t) ? `url(#${fid})` : "";
        }
        ghosts.forEach((g, i) => {
          const tt = t - (i + 1) * 0.022;
          const on = t >= a1 && tt < w1 + 0.03;
          g.style.opacity = on ? ((1 - (i + 1) / (n + 1)) * 0.45 * (1 - ML.lin(t, w1, w1 + 0.08))).toFixed(3) : "0";
          g.style.transform = on ? pose(Math.max(a1, tt)) : "";
          g.style.filter = on && fe ? `url(#${fid})` : "";
        });
        if (sl) {
          lines.forEach(({ d, len, lag }) => {
            const s0 = a1 + lag * 0.5, s1 = w1 + 0.12 + lag;
            const q = ML.lin(t, s0, s1);
            const vis = q > 0 && q < 1;
            d.style.opacity = vis ? (Math.sin(Math.PI * q)).toFixed(3) : "0";
            if (!vis) return;
            // twice the word's speed: crossing the whole frame (plus its own length) in the whip time
            if (sx) { const span = W + len * 2, x = sx > 0 ? -len + span * q * 1.0 : W + len - span * q; d.style.transform = `translateX(${(x - (sx > 0 ? 0 : len)).toFixed(1)}px)`; }
            else { const span = H + len * 2, y = H + len - span * q; d.style.transform = `translateY(${(y - len).toFixed(1)}px)`; }
          });
        }
      },
    };
  },
});
