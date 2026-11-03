// Offset shadow: one or two coloured copies of the word slide out from behind it to a hard offset — a print
// double-strike / misregistration. The copies are aria-hidden duplicates laid exactly over the word, one layer
// behind it; offsets go 0 -> final and opacity 0 -> 1 over 0.35 s power2.out while the word settles 1.05 -> 1. Solid
// fill or outline only (a thin text stroke). Two copies: the accent at the offset, the second accent at 1.7×. The
// angle mirrors in RTL so the shadow falls behind the reading direction. Optional ±1 px jitter on each beat, and a
// small italic serif caption fading in below (upright in Arabic, reserved in the layout so it overlaps nothing). The
// copies hold whole text, so Arabic stays joined. A logo that is an image takes the same offset as a hard drop-shadow
// (solid only), its own pixels untouched.
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
    const pic = !isSvg && (el.tagName === "IMG" || !!el.querySelector("img, svg"));
    const n = Math.round(ML.clamp(p.copies, 1, 2));
    const fs = isSvg || pic ? (el.getBoundingClientRect().height || 60) * 0.7 : parseFloat(getComputedStyle(el).fontSize) || 104;
    const S = fs / 104; // the offset is set for a 104 px headline at 1080p
    const ang = (p.angle * Math.PI) / 180;
    const dir = { x: Math.cos(ang) * (rtl ? -1 : 1), y: Math.sin(ang) };
    const copies = [];
    const vb = isSvg && el.viewBox && el.viewBox.baseVal && el.viewBox.baseVal.width ? el.viewBox.baseVal.width : 0;
    const userK = isSvg && vb ? (el.getBoundingClientRect().width || vb) / vb : 1; // screen px per svg unit
    if (isSvg) {
      // a logo: copies of the drawing behind it, recoloured
      const g = el, drawing = g.innerHTML;
      g.style.overflow = "visible"; // a copy past the viewBox must not be cut
      for (let k = 0; k < n; k++) {
        const c = doc.createElementNS("http://www.w3.org/2000/svg", "g");
        c.setAttribute("aria-hidden", "true");
        c.innerHTML = drawing;
        c.querySelectorAll("*").forEach((x) => { if (p.fill === "outline") Object.assign(x.style, { fill: "none", stroke: pick(k), strokeWidth: "1.2" }); else Object.assign(x.style, { fill: pick(k), stroke: "none" }); });
        g.insertBefore(c, g.firstChild);
        copies.push({ c, k, svg: true });
      }
    } else if (!pic) {
      const pad = getComputedStyle(el).padding;
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      el.style.zIndex = "0"; // its own stack: the copies sit behind its text, above whatever is behind the slot
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
      const html = el.innerHTML, arabic = ML.ARABIC.test(el.textContent || "");
      for (let k = 0; k < n; k++) {
        const c = doc.createElement("div");
        c.setAttribute("aria-hidden", "true");
        c.innerHTML = html;
        Object.assign(c.style, { position: "absolute", inset: "0", padding: pad, zIndex: String(-1 - k), pointerEvents: "none", userSelect: "none", opacity: "0" });
        if (p.fill === "outline" && arabic) Object.assign(c.style, { color: pick(k), filter: hollow(el, Math.max(1, 0.012 * fs), pick(k)) });
        else if (p.fill === "outline") Object.assign(c.style, { color: "transparent", webkitTextStroke: `max(1px, ${(0.012).toFixed(3)}em) ${pick(k)}` });
        else c.style.color = pick(k);
        el.append(c);
        copies.push({ c, k });
      }
    }
    // a wave that ran first has letters changing weight: the copies follow them
    const own = [...el.querySelectorAll(".ml-c")].filter((x) => !x.closest("[aria-hidden]"));
    const twins = copies.filter((q) => !q.svg).map((q) => [...q.c.querySelectorAll(".ml-c")]);
    let cap = null;
    if (p.caption && !isSvg && !pic) {
      cap = doc.createElement("div");
      cap.textContent = p.caption;
      Object.assign(cap.style, { marginTop: "0.25em", font: `${ML.ARABIC.test(p.caption) ? "" : "italic "}400 ${(30 * S).toFixed(1)}px/1.3 var(--x-serif-font)`, letterSpacing: "0", color: "var(--x-dim)", textAlign: "inherit", opacity: "0" });
      el.append(cap);
    }
    const dur = 0.35;
    const beat = 0.25; // the jitter steps on a quarter second
    ctx.sfx(at, "snap", 0.3);
    return {
      draw(t) {
        const x = ML.lin(t, at, at + dur), e = 1 - (1 - x) * (1 - x); // power2.out
        if (pic) {
          // two hard shadows at most, no blur, the picture itself never scaled
          const hard = (k) => `drop-shadow(${(dir.x * p.offset * S * (k ? 1.7 : 1) * e).toFixed(2)}px ${(dir.y * p.offset * S * (k ? 1.7 : 1) * e).toFixed(2)}px 0 color-mix(in srgb, ${pick(k)} ${(e * p.strength * 100).toFixed(1)}%, transparent))`;
          el.style.filter = e > 0 ? (n > 1 ? hard(0) + " " + hard(1) : hard(0)) : "none";
        }
        for (const list of twins) list.forEach((x, i) => { const o = own[i]; if (o) { x.style.fontVariationSettings = o.style.fontVariationSettings; x.style.fontWeight = o.style.fontWeight; } });
        copies.forEach(({ c, k, svg }) => {
          let off = p.offset * S * (k ? 1.7 : 1) * e;
          let jx = 0, jy = 0;
          if (p.jitter && t > at + dur) { const b = Math.floor((t - at) / beat); jx = (ML.rnd(b, 3 + k) - 0.5) * 2 * S; jy = (ML.rnd(b, 7 + k) - 0.5) * 2 * S; }
          const dx = dir.x * off + jx, dy = dir.y * off + jy;
          if (svg) { c.setAttribute("transform", `translate(${(dx / userK).toFixed(3)} ${(dy / userK).toFixed(3)})`); c.setAttribute("opacity", (e * p.strength).toFixed(4)); }
          else { c.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`; c.style.opacity = (e * p.strength).toFixed(4); }
        });
        if (p.settle && !isSvg && !pic) { const s = 1 + 0.05 * (1 - e) * ML.lin(t, at - 0.05, at); el.style.scale = s === 1 ? "none" : s.toFixed(4); }
        if (cap) cap.style.opacity = ML.ease(t, at + dur, at + dur + 0.4).toFixed(4);
      },
    };
  },
});
