// Jelly wobble word: the word is set full-width (about 90 % of the frame) in ultra-heavy caps and sits still, but its
// letters wobble slightly out of sync, like impatience — per letter, rotation and skewY swing on a sine (amplitude
// `amplitude`°, period `period` s, a phase step of 0.15 of a cycle per letter) and the letter bobs ±4 px; the whole
// baseline tilts ±1.5° slowly, and a 2 px accent rule beneath tilts with it. Arabic (or split "word") wobbles whole
// words, never letters that join. The wobble eases in after the look's entrance and the word leaves with the scene.
// Source: prompt-motion:gdgtify-inspired-by-what-techhalla (reference only — our own rebuild).
ML.define({
  id: "kinetic.jelly-wobble-word",
  category: "kinetic",
  name: "Jelly wobble word",
  does: "A full-width heavy word sits still but its letters skew and tilt slightly out of sync, like an impatient wobble.",
  says: ["time", "playful", "problem"],
  energy: 2,
  targets: ["headline", "word"],
  duration: [1.5, 6],
  params: {
    amplitude: { type: "number", range: [1, 6], default: 3, unit: "deg" },
    period: { type: "number", range: [0.6, 1.5], default: 1, unit: "s" },
    split: { type: "choice", options: ["chars", "word"], default: "chars" },
    rule: { type: "bool", default: true },
    width: { type: "number", range: [0.6, 0.94], default: 0.9 },
    own_frame: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "kinetic.fit-width-type"],
  avoid: ["luxury", "urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "prompt-motion:gdgtify-inspired-by-what-techhalla", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    if (!el) return null;
    const host = ctx.scene || ctx.stage, doc = host.ownerDocument;
    const text = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return null;
    const ar = ML.ARABIC.test(text);
    const B = ctx.box(el);
    // the layer: the word block centred where the target sat (kept inside the safe band)
    const layer = doc.createElement("div");
    Object.assign(layer.style, { position: "absolute", left: "0", width: f.W + "px", top: "0", zIndex: "6", pointerEvents: "none", display: "flex", flexDirection: "column", alignItems: "center", visibility: "hidden" });
    const tilt = doc.createElement("div");
    Object.assign(tilt.style, { display: "flex", flexDirection: "column", alignItems: "stretch", transformOrigin: "50% 100%" });
    const block = doc.createElement("div");
    Object.assign(block.style, { font: `max(var(--x-head-weight), 800) 100px / ${ar ? 1.12 : 0.92} var(--x-head-font)`, fontStretch: "125%", letterSpacing: ar ? "0" : "-0.01em", textTransform: ar ? "none" : "uppercase", color: "var(--x-ink)", whiteSpace: "nowrap", textAlign: "center", direction: rtl ? "rtl" : "ltr" });
    tilt.append(block);
    const rule = doc.createElement("i");
    Object.assign(rule.style, { display: p.rule ? "block" : "none", height: "max(2px, 0.02em)", background: "var(--x-accent)", marginTop: ar ? "0.12em" : "0.18em", transformOrigin: rtl ? "100% 50%" : "0 50%", fontSize: "100px" });
    tilt.append(rule);
    layer.append(tilt);
    // own_frame: the word owns the frame (a ground card behind it, word centred); else it sits where the target was
    const card = doc.createElement("div");
    Object.assign(card.style, { position: "absolute", inset: "0", zIndex: "5", background: "var(--x-ground)", backgroundImage: "var(--x-ground-image)", pointerEvents: "none", visibility: "hidden" });
    if (p.own_frame) host.append(card);
    host.append(layer);
    // lines: the fewest lines (1–3) whose fitted size still reads as a full-width word
    const words = text.split(" ");
    const room = f.W * p.width, floor = Math.min(f.W, f.H) * 0.15;
    const linesOf = (n) => { const out = [], per = Math.ceil(words.length / n); for (let i = 0; i < words.length; i += per) out.push(words.slice(i, i + per).join(" ")); return out; };
    let lines = [text], size = 100;
    for (let n = 1; n <= Math.min(3, words.length); n++) {
      lines = linesOf(n);
      block.innerHTML = lines.map((l) => `<div>${l.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c])}</div>`).join("");
      const w = Math.max(...[...block.children].map((d) => { d.style.display = "inline-block"; const x = d.offsetWidth; d.style.display = "block"; return x; }));
      size = Math.min(100 * room / w, f.H * 0.42 / lines.length);
      if (size >= floor) break;
    }
    block.style.fontSize = size.toFixed(2) + "px";
    rule.style.fontSize = size.toFixed(2) + "px";
    const parts = [...block.children].flatMap((d) => ML.split(d, p.split === "word" ? "words" : "chars"));
    parts.forEach((s) => { s.style.transformOrigin = "50% 90%"; });
    const bh = layer.offsetHeight;
    const cy = p.own_frame ? f.H / 2 : Math.max(f.safe.y + bh / 2, Math.min(f.safe.y + f.safe.h - bh / 2, B.y + B.h / 2));
    layer.style.top = (cy - bh / 2).toFixed(2) + "px";
    const TAU = Math.PI * 2, A = p.amplitude, P = p.period, bob = 4 * Math.min(f.W, f.H) / 1080 * (size / 200);
    const leaveAt = end - 0.3;
    return {
      draw(t) {
        el.style.opacity = t >= at - 1e-6 && t < end ? "0" : "";
        card.style.visibility = t >= at - 1e-6 && t < end ? "visible" : "hidden";
        const v = ML.show(layer, t, at, leaveAt);
        if (!v && (t < at || t > leaveAt + 0.25)) return;
        // the wobble eases in once the word has arrived
        const k = ML.ease(t, at + 0.15, at + 0.75);
        const s = t - at;
        parts.forEach((c, i) => {
          const ph = TAU * (s / P + i * 0.15);
          const r = A * Math.sin(ph) * k, sk = A * 0.8 * Math.sin(ph + 1.1) * k, y = bob * Math.sin(ph + 0.6) * k;
          c.style.transform = `translateY(${y.toFixed(2)}px) rotate(${r.toFixed(3)}deg) skewY(${sk.toFixed(3)}deg)`;
        });
        // the baseline tilts ±1.5° slowly, the rule with it
        tilt.style.rotate = (1.5 * Math.sin(TAU * s / (P * 4.2)) * k).toFixed(3) + "deg";
        rule.style.scale = `${ML.out(t, at + 0.1, at + 0.6).toFixed(4)} 1`;
      },
    };
  },
});
