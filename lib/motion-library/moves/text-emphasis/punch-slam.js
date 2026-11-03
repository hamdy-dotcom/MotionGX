// Punch slam: the payoff word, set heavier and ~10 % larger in a contrast colour, drops in from scale 1.6, −12°,
// −40 px and 0 opacity to rest in 0.3 s back.out(2), swinging through a +3° overshoot on the way; its first two frames
// carry a vertical motion-blur smear (an SVG blur, stdDeviation "0 n"). 0.15 s after it lands an 8 px bar (word width
// + 8 px) scales X 0 → 1 from the reading edge in 0.25 s power3.out (with a thin 2 px bar above it in "double"). The
// impact is the moment back.out(2) first reaches rest size, a third of the way in: the hit sounds and the word rattles
// 3 px for 3 frames there. Lands on the spoken word when the voice says it.
// Source: prompt-motion:teslachartz-claude-opus-5-5-leaves (reference) — our own rebuild.
ML.define({
  id: "text-emphasis.punch-slam",
  category: "text-emphasis",
  name: "Punch word slams in tilted, then levels",
  does: "The payoff word drops in huge and rotated, overshoots, settles level, and a thick underline swipes under it.",
  says: ["energy", "result", "brand"],
  energy: 5,
  targets: ["word", "headline"],
  duration: [0.6, 2],
  params: {
    rotate: { type: "number", range: [-15, 15], default: -12, unit: "deg" },
    "from-scale": { type: "number", range: [1.2, 2], default: 1.6 },
    underline: { type: "choice", options: ["thick", "double", "none"], default: "thick" },
    colour: { type: "choice", options: ["contrast", "accent"], default: "contrast" },
    shake: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "text-emphasis.shake"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "prompt-motion:teslachartz-claude-opus-5-5-leaves", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, rtl } = ctx;
    if (!el) return null;
    const ar = ML.ARABIC.test(el.textContent || "");
    const fs = parseFloat(getComputedStyle(el).fontSize) || 56, k = Math.max(0.4, Math.min(2.5, fs / 56));
    // the word in its own box: heavier, 10 % larger, contrast colour
    const w = document.createElement("span");
    while (el.firstChild) w.append(el.firstChild);
    Object.assign(w.style, { display: "inline-block", position: "relative", maxWidth: "100%", fontSize: "1.1em", fontWeight: "800", fontFamily: "var(--x-head-font)", letterSpacing: ar ? "0" : "-0.02em", color: p.colour === "accent" ? "var(--x-accent)" : "var(--x-ink)", transformOrigin: "50% 60%" });
    el.append(w);
    // the motion-blur smear: a vertical-only blur for the first frames
    const id = "ml-punch-blur-" + document.querySelectorAll("[data-ml-filter]").length;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("data-ml-filter", "1"); svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
    Object.assign(svg.style, { position: "absolute", width: "0", height: "0", overflow: "hidden" });
    svg.innerHTML = `<filter id="${id}" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="0 0"/></filter>`;
    el.append(svg);
    const blurNode = svg.querySelector("feGaussianBlur");
    // the bars, from the reading edge
    const barCol = p.colour === "accent" ? "var(--x-ink)" : "var(--x-accent)";
    const bar = (h, gap) => {
      const b = document.createElement("span");
      b.setAttribute("aria-hidden", "true");
      Object.assign(b.style, { position: "absolute", height: h + "px", left: (-4 * k).toFixed(1) + "px", right: (-4 * k).toFixed(1) + "px", bottom: gap + "px", background: barCol, transformOrigin: rtl ? "100% 50%" : "0% 50%", transform: "scaleX(0)", pointerEvents: "none" });
      w.append(b);
      return b;
    };
    // the double's thin bar sits above the thick one but under the descenders, so neither strikes the letters
    const T = Math.max(3, 8 * k), drop = p.underline === "double" ? 6 * k : 0;
    const thick = p.underline === "none" ? null : bar(T.toFixed(1), (-0.12 * fs - drop).toFixed(1));
    const thin = p.underline === "double" ? bar(Math.max(1, 2 * k).toFixed(1), (-0.12 * fs - drop + T + 3 * k).toFixed(1)) : null;
    const first = (el.textContent || "").trim().split(/\s+/)[0] || "";
    const a = Math.max(at, ctx.word(first, at)), land = a + 0.3, line = land + 0.15, contact = a + 0.1;
    ctx.sfx(contact, "hit", 0.55);
    if (thick) ctx.sfx(line, "whoosh.soft", 0.25);
    const S = ML.clamp(p["from-scale"], 1.2, 2), R = ML.clamp(p.rotate, -15, 15);
    const pw3 = (t, x, y) => 1 - Math.pow(1 - ML.lin(t, x, y), 3);
    return {
      draw(t) {
        const u = ML.back(t, a, land, 2);
        const over = Math.sin(Math.PI * ML.lin(t, a + 0.13, land + 0.06));
        w.style.opacity = ML.lin(t, a, a + 0.05).toFixed(4);
        w.style.transform = `translateY(${(-40 * k * (1 - u)).toFixed(2)}px) rotate(${(R * (1 - Math.min(1, u)) - R * 0.25 * over).toFixed(3)}deg) scale(${(S + (1 - S) * u).toFixed(4)})`;
        const smear = t >= a && t < a + 2 / 30 ? 10 * k * (1 - (t - a) * 15) : 0;
        blurNode.setAttribute("stdDeviation", `0 ${smear.toFixed(2)}`);
        w.style.filter = smear > 0.05 ? `url(#${id})` : "none";
        const s = pw3(t, line, line + 0.25);
        if (thick) thick.style.transform = `scaleX(${s.toFixed(4)})`;
        if (thin) thin.style.transform = `scaleX(${pw3(t, line + 0.05, line + 0.3).toFixed(4)})`;
        const f = Math.floor((t - contact) * 30);
        if (p.shake && t >= contact && f < 3) {
          el.style.translate = `${((ML.rnd(f, 3) - 0.5) * 6 * k).toFixed(2)}px ${((ML.rnd(f, 5) - 0.5) * 6 * k).toFixed(2)}px`;
        } else el.style.translate = "none";
      },
    };
  },
});
