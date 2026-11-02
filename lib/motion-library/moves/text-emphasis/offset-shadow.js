// Offset shadow: one or two coloured copies of the word slide out from behind it to a hard offset — a print
// double-strike / misregistration. The copies are aria-hidden duplicates laid exactly over the word, one layer
// behind it; offsets go 0 -> final and opacity 0 -> 1 over 0.35 s power2.out while the word settles 1.05 -> 1. Solid
// fill or outline only (a thin text stroke). Two copies: the accent at the offset, the second accent at 1.7×. The
// angle mirrors in RTL so the shadow falls behind the reading direction. Optional ±1 px jitter on each beat, and a
// small italic serif caption fading in below. The copies hold whole text, so Arabic stays joined.
// Source: own rebuild of MengTo/Skills editorial-portfolio-chapters (the offset type treatment, ARTICLE.md) and
// prompt-motion references eyishazyer-found-another-prompt-for, ndhabarde11-wtf-claude-opus-5-5.
ML.define({
  id: "text-emphasis.offset-shadow",
  category: "text-emphasis",
  name: "Hard offset colour shadow behind the word",
  does: "One or two coloured copies of the word slide out from behind it to a hard offset, a print double-strike or misregistration.",
  says: ["energy", "brand", "playful", "focus", "story"],
  energy: 3,
  targets: ["headline", "word", "logo"],
  duration: [0.5, 3],
  params: {
    copies: { type: "number", range: [1, 2], default: 1 },
    offset: { type: "number", range: [2, 12], default: 6, unit: "px" },
    angle: { type: "number", range: [0, 360], default: 45, unit: "deg" },
    fill: { type: "choice", options: ["solid", "outline"], default: "solid" },
    colours: { type: "text", default: "accent" },
    strength: { type: "number", range: [0.35, 1], default: 1 },
    jitter: { type: "bool", default: false },
    settle: { type: "bool", default: true },
    caption: { type: "text", default: "" },
  },
  pairs: ["text-in.slam", "text-in.punchline", "text-emphasis.letter-wave"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "snap",
  source: { from: "prompt-motion:eyishazyer-found-another-prompt-for", license: "reference", note: "our own rebuild; also ndhabarde11-wtf-claude-opus-5-5 and MengTo/Skills editorial-portfolio-chapters ARTICLE.md" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const doc = el.ownerDocument;
    const tones = { accent: "var(--x-accent)", "accent-2": "var(--x-accent-2)", ink: "var(--x-ink)", dim: "var(--x-dim)", good: "var(--x-good)", bad: "var(--x-bad)" };
    // "accent", "accent-2", "accent,accent-2" … look names only (never a fixed colour)
    const names = String(p.colours || "accent").split(/[,\s/]+/).filter(Boolean);
    const pick = (k) => tones[names[k]] || (k === 0 ? tones.accent : tones["accent-2"]);
    const isSvg = el instanceof SVGElement;
    const n = Math.round(ML.clamp(p.copies, 1, 2));
    const fs = isSvg ? (el.getBoundingClientRect().height || 60) * 0.7 : parseFloat(getComputedStyle(el).fontSize) || 104;
    const S = fs / 104; // the offset is set for a 104 px headline at 1080p
    const ang = (p.angle * Math.PI) / 180;
    const dir = { x: Math.cos(ang) * (rtl ? -1 : 1), y: Math.sin(ang) };
    const copies = [];
    const vb = isSvg && el.viewBox && el.viewBox.baseVal && el.viewBox.baseVal.width ? el.viewBox.baseVal.width : 0;
    const userK = isSvg && vb ? (el.getBoundingClientRect().width || vb) / vb : 1; // screen px per svg unit
    if (isSvg) {
      // a logo: copies of the drawing behind it, recoloured
      const g = el;
      for (let k = 0; k < n; k++) {
        const c = doc.createElementNS("http://www.w3.org/2000/svg", "g");
        c.setAttribute("aria-hidden", "true");
        c.innerHTML = g.innerHTML;
        c.querySelectorAll("*").forEach((x) => { if (p.fill === "outline") Object.assign(x.style, { fill: "none", stroke: pick(k), strokeWidth: "1.2" }); else Object.assign(x.style, { fill: pick(k), stroke: "none" }); });
        g.insertBefore(c, g.firstChild);
        copies.push({ c, k, svg: true });
      }
    } else {
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      el.style.zIndex = "0"; // its own stack: the copies sit behind its text, above whatever is behind the slot
      const html = el.innerHTML;
      for (let k = 0; k < n; k++) {
        const c = doc.createElement("div");
        c.setAttribute("aria-hidden", "true");
        c.innerHTML = html;
        Object.assign(c.style, { position: "absolute", inset: "0", zIndex: String(-1 - k), pointerEvents: "none", userSelect: "none", opacity: "0" });
        if (p.fill === "outline") Object.assign(c.style, { color: "transparent", webkitTextStroke: `max(1px, ${(0.012).toFixed(3)}em) ${pick(k)}` });
        else c.style.color = pick(k);
        el.append(c);
        copies.push({ c, k });
      }
    }
    let cap = null;
    if (p.caption && !isSvg) {
      cap = doc.createElement("div");
      cap.textContent = p.caption;
      Object.assign(cap.style, { position: "absolute", left: "0", right: "0", top: "100%", marginTop: "0.25em", font: `italic 400 ${(30 * S).toFixed(1)}px/1.3 var(--x-serif-font)`, color: "var(--x-dim)", textAlign: "inherit", opacity: "0" });
      el.append(cap);
    }
    const dur = 0.35;
    const beat = 0.25; // the jitter steps on a quarter second
    ctx.sfx(at, "snap", 0.3);
    return {
      draw(t) {
        const x = ML.lin(t, at, at + dur), e = 1 - (1 - x) * (1 - x); // power2.out
        copies.forEach(({ c, k, svg }) => {
          let off = p.offset * S * (k ? 1.7 : 1) * e;
          let jx = 0, jy = 0;
          if (p.jitter && t > at + dur) { const b = Math.floor((t - at) / beat); jx = (ML.rnd(b, 3 + k) - 0.5) * 2 * S; jy = (ML.rnd(b, 7 + k) - 0.5) * 2 * S; }
          const dx = dir.x * off + jx, dy = dir.y * off + jy;
          if (svg) { c.setAttribute("transform", `translate(${(dx / userK).toFixed(3)} ${(dy / userK).toFixed(3)})`); c.setAttribute("opacity", (e * p.strength).toFixed(4)); }
          else { c.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`; c.style.opacity = (e * p.strength).toFixed(4); }
        });
        if (p.settle && !isSvg) { const s = 1 + 0.05 * (1 - e) * (t >= at ? 1 : 0); el.style.scale = s === 1 ? "none" : s.toFixed(4); }
        if (cap) cap.style.opacity = ML.ease(t, at + dur, at + dur + 0.4).toFixed(4);
      },
    };
  },
});
