// Keyword pill: the punch word lands inside a solid rounded pill (radius 0.22 em up to fully round, padding
// 0.08 em 0.25 em, the accent or an accent → accent-2 gradient, a soft shadow in the pill's colour at 35 %).
// Together: the pill opens from its reading-start edge in 0.25 s back.out(1.6) while it untilts (tilt → 0), the word
// fades and rises 8 px 0.15 s after, an optional leading icon pops 0.1 s later and a small glow pulses on landing.
// Pill-first: the empty capsule grows 0 → its width in 0.35 s power3.out while sliding 40 px, a tiny placeholder dot
// inside; then the word pops in 0.6 → 1.05 → 1 (back.out 2) from −4°, heavy, with a hard 0 4 px 0 shadow, and the
// pill squashes to scaleY 0.9 on impact; word and pill rest on the same tilt, like one sticker. The word's room is kept from the first frame (padding set in setup), so the
// line never reflows. Words stay whole (Arabic safe); the leading edge follows the reading direction.
// Source: prompt-motion:sudo-kiran-built-a-product-demo + slvdev-opus-5-5-max-motion (reference) — our own rebuild.
ML.define({
  id: "text-emphasis.keyword-pill",
  category: "text-emphasis",
  name: "Key word lands inside a coloured pill",
  does: "The punch word arrives inside a solid rounded pill that pops with overshoot — together, or the empty capsule first and the word popping into it.",
  says: ["focus", "reveal", "brand", "playful"],
  energy: 3,
  targets: ["word", "label"],
  duration: [0.8, 2],
  params: {
    order: { type: "choice", options: ["together", "pill-first"], default: "together" },
    fill: { type: "choice", options: ["solid", "gradient"], default: "solid" },
    icon: { type: "choice", options: ["none", "play", "any"], default: "none" },
    tilt: { type: "number", range: [-6, 0], default: -3, unit: "deg" },
    colour: { type: "text", default: "accent" },
    radius: { type: "choice", options: ["round", "soft"], default: "round" },
    pick: { type: "choice", options: ["last", "first", "longest", "all"], default: "last" },
    word: { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "text-emphasis.karaoke-highlight"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop",
  source: { from: "prompt-motion:sudo-kiran-built-a-product-demo", license: "reference", note: "also slvdev-opus-5-5-max-motion; our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const VARS = ["accent", "accent-2", "accent-ink", "ink", "dim", "ground", "panel", "panel-2", "good", "bad", "line", "ring"];
    const col = (v, d) => { v = String(v || d).trim(); if (v.startsWith("var(")) return v; if (v.startsWith("--")) return `var(${v})`; v = v.replace(/^x-/, ""); return `var(--x-${VARS.includes(v) ? v : d})`; };
    const words = ML.split(el, "words");
    if (!words.length) return null;
    // the word that gets the pill (or the whole slot, wrapped once)
    let w;
    if (p.pick === "all" || words.length === 1) {
      w = document.createElement("span");
      w.style.display = "inline-block";
      while (el.firstChild) w.append(el.firstChild);
      el.append(w);
    } else {
      const len = (x) => ML.plain(x.textContent).length;
      w = p.word ? words.find((x) => ML.plain(x.textContent).includes(ML.plain(p.word))) : null;
      w = w || (p.pick === "first" ? words[0] : p.pick === "longest" ? words.reduce((a, b) => (len(b) > len(a) ? b : a)) : words[words.length - 1]);
    }
    const fs = parseFloat(getComputedStyle(w).fontSize) || 56;
    const u = fs / 72;
    const c = col(p.colour, "accent");
    const fill = p.fill === "gradient" ? `linear-gradient(${rtl ? 270 : 90}deg, ${c}, var(--x-accent-2))` : c;
    const iconW = p.icon === "none" ? 0 : 0.62;
    // keep the word's room from the first frame
    Object.assign(w.style, { position: "relative", isolation: "isolate", padding: "0.08em 0.25em", margin: "0 0.08em", color: "var(--x-accent-ink)", transformOrigin: "50% 60%" });
    if (iconW) w.style[rtl ? "paddingRight" : "paddingLeft"] = `${(0.25 + iconW).toFixed(2)}em`;
    // the glyphs ride in their own span so the pill can sit behind them
    const txt = document.createElement("span");
    txt.style.display = "inline-block";
    if (p.order === "pill-first") txt.style.fontWeight = "800"; // before the measure below: the pill is cut to this width
    while (w.firstChild) txt.append(w.firstChild);
    w.append(txt);
    const pill = document.createElement("span");
    Object.assign(pill.style, { position: "absolute", top: "0", bottom: "0", zIndex: "-1", background: fill, borderRadius: p.radius === "soft" ? "0.22em" : "var(--x-radius-s)", transformOrigin: rtl ? "100% 50%" : "0% 50%", pointerEvents: "none" });
    pill.style[rtl ? "right" : "left"] = "0";
    w.prepend(pill);
    let icon = null;
    if (iconW) {
      icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icon.setAttribute("viewBox", "0 0 24 24");
      const sz = 0.5 * fs;
      Object.assign(icon.style, { position: "absolute", top: "50%", width: sz + "px", height: sz + "px", marginTop: -sz / 2 + "px", fill: "var(--x-accent-ink)", overflow: "visible" });
      icon.style[rtl ? "right" : "left"] = "0.25em";
      icon.innerHTML = p.icon === "play" ? `<path d="${rtl ? "M18 4 L4 12 L18 20 Z" : "M6 4 L20 12 L6 20 Z"}" stroke="var(--x-accent-ink)" stroke-width="2" stroke-linejoin="round"/>` : `<path d="M12 1.5 L14.6 9.4 L22.5 12 L14.6 14.6 L12 22.5 L9.4 14.6 L1.5 12 L9.4 9.4 Z"/>`;
      w.append(icon);
    }
    let dot = null;
    if (p.order === "pill-first") {
      dot = document.createElement("span");
      const d = Math.max(6, 0.12 * fs);
      Object.assign(dot.style, { position: "absolute", top: "50%", width: d + "px", height: d + "px", marginTop: -d / 2 + "px", borderRadius: "50%", background: "var(--x-accent-ink)", opacity: "0" });
      dot.style[rtl ? "right" : "left"] = "0.3em";
      w.append(dot);
    }
    const W = w.offsetWidth;
    const dir = rtl ? -1 : 1;
    const tilt = p.tilt * dir; // the lean mirrors with the reading direction
    const land = p.order === "pill-first" ? at + 0.45 : at + 0.18;
    ctx.sfx(land, "pop", 0.45);
    if (p.order === "pill-first") ctx.sfx(at, "whoosh.soft", 0.2);
    const shadow = (k) => `0 ${(8 * u).toFixed(1)}px ${(20 * u).toFixed(1)}px color-mix(in srgb, ${c} ${(35 * k).toFixed(1)}%, transparent)`;
    return {
      draw(t) {
        const glow = t < land ? 0 : ML.pulse(t, land, 0.05, 0.35);
        if (p.order === "together") {
          const e = t < at ? 0 : ML.back(t, at, at + 0.25, 1.6);
          const o = ML.lin(t, at, at + 0.06);
          pill.style.width = (W * Math.max(0, e)).toFixed(2) + "px";
          pill.style.opacity = o.toFixed(4);
          pill.style.rotate = `${(tilt * (1 - Math.min(1, ML.out(t, at, at + 0.3)))).toFixed(2)}deg`;
          pill.style.scale = "none";
          const tt = ML.out(t, at + 0.15, at + 0.35);
          txt.style.opacity = tt.toFixed(4);
          txt.style.translate = `0 ${((1 - tt) * 8 * u).toFixed(2)}px`;
          txt.style.scale = "none"; txt.style.rotate = "none";
          if (icon) icon.style.scale = (t < at + 0.25 ? 0 : ML.back(t, at + 0.25, at + 0.45, 2)).toFixed(4);
        } else {
          const e = ML.out(t, at, at + 0.35);
          pill.style.width = (W * e).toFixed(2) + "px";
          pill.style.opacity = ML.lin(t, at, at + 0.05).toFixed(4);
          pill.style.translate = `${(-(1 - e) * 40 * u * dir).toFixed(2)}px 0`;
          pill.style.rotate = `${tilt.toFixed(2)}deg`;
          const sq = t < land + 0.08 ? 0 : ML.pulse(t, land + 0.08, 0.03, 0.12);
          pill.style.scale = `1 ${(1 - 0.1 * sq).toFixed(4)}`;
          if (dot) dot.style.opacity = (ML.lin(t, at + 0.2, at + 0.3) * (1 - ML.lin(t, land - 0.02, land + 0.06))).toFixed(4);
          const s = t < land ? 0.6 : 0.6 + 0.4 * ML.back(t, land, land + 0.3, 2);
          txt.style.opacity = ML.lin(t, land, land + 0.06).toFixed(4);
          txt.style.scale = s.toFixed(4);
          txt.style.rotate = `${(tilt + (-4 * dir - tilt) * (1 - ML.out(t, land, land + 0.35))).toFixed(2)}deg`;
          txt.style.translate = "none";
          txt.style.textShadow = `0 ${(4 * u).toFixed(1)}px 0 color-mix(in srgb, var(--x-ink) 22%, transparent)`;
          if (icon) icon.style.scale = (t < land + 0.1 ? 0 : ML.back(t, land + 0.1, land + 0.3, 2)).toFixed(4);
        }
        pill.style.boxShadow = `${shadow(1)}, 0 0 ${(glow * 26 * u).toFixed(1)}px ${(glow * 4 * u).toFixed(1)}px color-mix(in srgb, ${c} ${(glow * 45).toFixed(1)}%, transparent)`;
      },
    };
  },
});
