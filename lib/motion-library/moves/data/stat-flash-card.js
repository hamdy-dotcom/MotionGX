// Stat flash card: punctuation between sections. A hard cut to a full ink frame holding one big numeral in the accent
// (mono or serif slab), centred, with small dim HUD metadata in the four corners (an index, a running timecode, the
// stat's label, a frame count). In: the cut lands, then two frames at 60 % opacity flicker up to full — or the digits
// scramble first (seeded digits swapped every 2 frames for 0.2 s, separators kept) before settling. Hold 0.4–1 s, then
// a hard cut back out. The number is the target's own text.
// Source: prompt-motion "reflex-cloud-this-is-legit-insane" (reference only: rebuilt as our own code).
ML.define({
  id: "data.stat-flash-card",
  category: "data",
  name: "Number flash card",
  does: "A hard cut to black shows one big coloured number for a beat, then cuts away.",
  says: ["proof", "scale", "result"],
  energy: 3,
  targets: ["number"],
  duration: [0.4, 1],
  params: {
    enter: { type: "choice", options: ["cut", "scramble"], default: "cut" },
    hold: { type: "number", range: [0.4, 1], default: 0.6, unit: "s" },
    hud: { type: "bool", default: true },
    face: { type: "choice", options: ["mono", "serif"], default: "mono" },
    value: { type: "text", default: "" },
    label: { type: "text", default: "" },
  },
  pairs: ["photo.ken-burns", "text-in.punchline"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "prompt-motion:reflex-cloud-this-is-legit-insane", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const mk = (tag, css, parent, text) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const scene = ctx.scene || ctx.stage;
    const text = (p.value || (el && el.textContent.trim()) || "4,500").trim();
    const u = Math.min(f.W, f.H) / 1080;
    const card = mk("div", `position:absolute;inset:0;z-index:40;background:var(--x-ink);display:flex;align-items:center;justify-content:center;pointer-events:none`, scene);
    const fs = Math.min(f.H * 0.26, f.W * 0.36);
    const num = mk("div", `font:${p.face === "serif" ? "700" : "600"} ${fs.toFixed(1)}px/1 ${p.face === "serif" ? "var(--x-serif-font)" : "var(--x-mono-font)"};letter-spacing:-0.04em;color:var(--x-accent-2);font-variant-numeric:tabular-nums lining-nums;white-space:nowrap;direction:ltr;unicode-bidi:isolate`, card, text);
    ML.fit(num, f.W - f.m * 2.4);
    // the corner HUD: small mono, dim on the ink
    const hudCss = `position:absolute;font:500 ${(22 * u).toFixed(1)}px/1.3 var(--x-mono-font);color:color-mix(in srgb, var(--x-ground) 48%, transparent);letter-spacing:0.08em;white-space:nowrap;direction:ltr`;
    const ins = `${(f.tall ? 230 : 60 * u + 20).toFixed(0)}px`, side = `${f.m.toFixed(0)}px`, bot = `${(f.tall ? 320 : 60 * u + 20).toFixed(0)}px`;
    const labelText = p.label || (rtl ? "الرقم" : "FIG. 04");
    const A = rtl ? "right" : "left", B = rtl ? "left" : "right";
    const tl = mk("div", `${hudCss};${A}:${side};top:${ins}`, card, labelText);
    if (ML.ARABIC.test(labelText)) { tl.style.direction = "rtl"; tl.style.letterSpacing = "0"; tl.style.font = `500 ${(24 * u).toFixed(1)}px/1.3 var(--x-label-font)`; }
    const tr = mk("div", `${hudCss};${B}:${side};top:${ins}`, card, "");
    const bl = mk("div", `${hudCss};${A}:${side};bottom:${bot}`, card, "REF / 0412");
    const br = mk("div", `${hudCss};${B}:${side};bottom:${bot}`, card, "");
    for (const h of [tl, tr, bl, br]) h.style.display = p.hud ? "block" : "none";
    card.style.display = "none";

    const scr = p.enter === "scramble" ? 0.2 : 0;
    const out = Math.min(end - 0.05, at + scr + p.hold);
    const chars = Array.from(text);
    const pad = (n, w = 2) => String(n).padStart(w, "0");
    ctx.sfx(at, "hit", 0.5);
    return {
      draw(t) {
        const on = t >= at && t < out;
        card.style.display = on ? "flex" : "none";
        if (!on) return;
        const fr = Math.floor((t - at) * 30); // frames since the cut, at 30 fps
        num.style.opacity = fr < 2 ? "0.6" : "1";
        if (t < at + scr) {
          const k = Math.floor((t - at) * 15); // a new set every 2 frames
          num.textContent = chars.map((c, i) => (/\d/.test(c) ? String(Math.floor(ML.rnd(i + 1, k + 7) * 10)) : c)).join("");
        } else num.textContent = text;
        const tf = Math.floor(t * 30);
        tr.textContent = `${pad(Math.floor(t / 60))}:${pad(Math.floor(t) % 60)}:${pad(tf % 30)}`;
        br.textContent = `F ${pad(tf, 4)}`;
      },
    };
  },
});
