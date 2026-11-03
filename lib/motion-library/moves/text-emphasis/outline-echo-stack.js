// Outline echo stack: hollow outline copies of the word (no fill, a 1.5 px stroke of the ink at 35%) slide out from
// the solid word to offsets of ±0.9 line heights — alternately above and below, or on one side only when the slot has
// a neighbour on the other — 0.4 s expo.out, 0.05 s apart, then keep drifting outward at 10 px/s, fading with distance,
// building a stacked echo pattern. Horizontal: the echoes step out sideways (a word-width apart; above = behind the
// reading direction, below = ahead); radial: they grow outward around the word in even rings (2D scale, vector type).
// The copies hold whole text, so Arabic stays joined, and its outline is cut from the shape (a text stroke would draw
// the seams of its joined letters); sideways steps follow the reading direction.
// Source: own rebuild of prompt-motion reference web3wesley-this-took-opus-5-5.
ML.define({
  id: "text-emphasis.outline-echo-stack",
  category: "text-emphasis",
  name: "Outline echoes stack around the word",
  does: "Hollow outline copies slide out above and below the solid word (or sideways, or as rings around one short word) and keep drifting, building a stacked echo pattern.",
  says: ["energy", "scale", "brand"],
  energy: 3,
  targets: ["word", "headline"],
  duration: [1, 4],
  params: {
    copies: { type: "number", range: [2, 8], default: 4 },
    direction: { type: "choice", options: ["vertical", "horizontal", "radial"], default: "vertical" },
    side: { type: "choice", options: ["both", "above", "below"], default: "both" },
    drift: { type: "bool", default: true },
    stroke: { type: "choice", options: ["ink", "accent", "dim"], default: "ink" },
    strength: { type: "number", range: [0.15, 0.8], default: 0.35 },
  },
  pairs: ["text-in.slam", "text-emphasis.offset-shadow"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:web3wesley-this-took-opus-5-5", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl, stage } = ctx;
    if (!el) return null;
    const doc = el.ownerDocument;
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize) || 100;
    const LH = parseFloat(cs.lineHeight) || fs * 1.15;
    const S = (stage.offsetWidth < stage.offsetHeight ? stage.offsetWidth : stage.offsetHeight) / 1080;
    const ink = p.stroke === "accent" ? "var(--x-accent)" : p.stroke === "dim" ? "var(--x-dim)" : "var(--x-ink)";
    const n = Math.round(ML.clamp(p.copies, 2, 8));
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    el.style.zIndex = "0";
    // the text's own width (for sideways steps): the widest line, measured with a range
    const r = doc.createRange(); r.selectNodeContents(el);
    const k = el.getBoundingClientRect().width / (el.offsetWidth || 1) || 1;
    const textW = r.getBoundingClientRect().width / k || el.offsetWidth;
    const lines = Math.max(1, Math.round(el.offsetHeight / LH));
    const html = el.innerHTML;
    const fwd = rtl ? -1 : 1;
    // Arabic: a text stroke draws every seam where joined letters overlap, so its outline is cut from the shape instead
    const hollow = (host, width, colour) => {
      const id = "ml-outline-" + doc.querySelectorAll("filter").length;
      const s = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
      s.setAttribute("aria-hidden", "true");
      Object.assign(s.style, { position: "absolute", width: "0", height: "0" });
      s.innerHTML = `<filter id="${id}" color-interpolation-filters="sRGB" x="-5%" y="-20%" width="110%" height="140%"><feMorphology in="SourceAlpha" operator="dilate" radius="${width.toFixed(2)}" result="d"/><feFlood style="flood-color:${colour}" result="f"/><feComposite in="f" in2="d" operator="in" result="r"/><feComposite in="r" in2="SourceAlpha" operator="out"/></filter>`;
      host.append(s);
      return `url(#${id})`;
    };
    const arabic = ML.ARABIC.test(el.textContent || "");
    const stroke = `color-mix(in srgb, ${ink} ${(p.strength * 100).toFixed(0)}%, transparent)`;
    const outline = arabic ? hollow(el, Math.max(1, 0.75 * S), stroke) : "";
    const echoes = [];
    for (let i = 0; i < n; i++) {
      // above, below, above, below … (or all on one side)
      const level = p.side === "both" ? Math.floor(i / 2) + 1 : i + 1, side = p.side === "above" ? -1 : p.side === "below" ? 1 : i % 2 === 0 ? -1 : 1;
      const c = doc.createElement("div");
      c.setAttribute("aria-hidden", "true");
      c.innerHTML = html;
      Object.assign(c.style, { position: "absolute", inset: "0", zIndex: "-1", pointerEvents: "none", userSelect: "none", padding: cs.padding, opacity: "0", ...(arabic ? { color: "var(--x-ink)", filter: outline } : { color: "transparent", webkitTextStroke: `${(1.5 * S).toFixed(2)}px ${stroke}` }) });
      el.append(c);
      echoes.push({ c, i, level, side, at: at + i * 0.05 });
    }
    const maxLevel = p.side === "both" ? Math.ceil(n / 2) : n;
    // the step between echoes
    const stepY = 0.9 * LH * lines;
    const stepX = textW + fs * 0.35;
    ctx.sfx(at, "whoosh.soft", 0.25);
    return {
      draw(t) {
        const fadeOut = 1 - ML.ease(t, end - 0.35, end - 0.05);
        echoes.forEach((q) => {
          const e = ML.expo(t, q.at, q.at + 0.4);
          const drift = p.drift ? Math.max(0, t - (q.at + 0.4)) * 10 * S : 0;
          const near = p.direction === "radial" ? 1 - q.i / (n + 1) : 1 - (q.level - 1) / (maxLevel + 0.5); // fades with distance
          let tf;
          if (p.direction === "radial") {
            const s = 1 + 0.12 * (q.i + 1) * e + drift / Math.max(1, textW);
            tf = `scale(${s.toFixed(4)})`;
          } else if (p.direction === "horizontal") {
            const dx = q.side * fwd * (q.level * stepX * e + drift);
            tf = `translateX(${dx.toFixed(2)}px)`;
          } else {
            const dy = q.side * (q.level * stepY * e + drift);
            tf = `translateY(${dy.toFixed(2)}px)`;
          }
          q.c.style.transform = e > 0 ? tf : "none";
          q.c.style.opacity = (Math.min(1, e * 1.6) * near * fadeOut).toFixed(4);
        });
      },
    };
  },
});
