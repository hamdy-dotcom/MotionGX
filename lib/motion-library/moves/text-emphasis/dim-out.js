// Dim out: a held title fades down toward the ground — its colour mixes from full ink to `to` (30–70 %) over 0.45 s
// sine.inOut (power2.in in the light direction) while accent children (anything carrying its own colour, or marked
// data-accent / .ml-accent) keep full colour. No movement: the stillness closes the beat. Scene scope also lays a veil
// over the whole scene — toward the darker of ink / ground (dark: brightness 1 → 0.35) or the lighter (light) — with
// the title above it dimming on its own. Ends: hold, a hard cut (gone on the last frame) or everything fading out over
// 0.4 s. An optional "01 / 02" mono counter at 40 % sits under the title. Colours are the look's: no fixed colour.
// Source: prompt-motion:shneural-after-opus-5-5-it + charlesmendez-holly-cow-just-asked (reference) — our own rebuild.
ML.define({
  id: "text-emphasis.dim-out",
  category: "text-emphasis",
  name: "Title dims away",
  does: "A held title fades down to grey (accents stay bright) and darkens with the scene — no movement, the stillness closes the beat.",
  says: ["calm", "transition", "focus"],
  energy: 1,
  targets: ["headline", "line", "scene"],
  duration: [0.5, 1.5],
  params: {
    to: { type: "number", range: [0.3, 0.7], default: 0.5 },
    scope: { type: "choice", options: ["text", "scene"], default: "text" },
    end: { type: "choice", options: ["hold", "cut", "fade-black"], default: "cut" },
    counter: { type: "bool", default: false },
    "keep-accent": { type: "bool", default: true },
    direction: { type: "choice", options: ["dark", "light"], default: "dark" },
    dim: { type: "number", range: [0.3, 0.6], default: 0.45, unit: "s" },
    hold: { type: "number", range: [0, 1], default: 0.25, unit: "s" },
    index: { type: "text", default: "01 / 02" },
  },
  pairs: ["text-in.punchline", "transition.flash-cut"],
  avoid: ["energy", "celebration", "urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "prompt-motion:shneural-after-opus-5-5-it", license: "reference", note: "our own rebuild; also charlesmendez-holly-cow-just-asked" },
  setup(ctx) {
    const { el, p, at, end, stage } = ctx;
    if (!el) return null;
    const host = ctx.scene || stage;
    const whole = el === stage || el === ctx.scene;
    // the darker / lighter of the look's ink and ground, by luminance (so "dark" is dark on any look)
    const lum = (v) => {
      const probe = document.createElement("i"); probe.style.color = `var(${v})`; probe.style.display = "none"; host.append(probe);
      const m = getComputedStyle(probe).color.match(/[\d.]+/g) || [0, 0, 0]; probe.remove();
      const [r, g, b] = m.slice(0, 3).map((x) => +x / 255);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const inkL = lum("--x-ink"), groundL = lum("--x-ground");
    const darker = inkL < groundL ? "var(--x-ink)" : "var(--x-ground)", lighter = inkL < groundL ? "var(--x-ground)" : "var(--x-ink)";
    const veilCol = p.direction === "light" ? lighter : darker;
    // the text dims toward the ground (that is what "dim" reads as on any look)
    const texts = whole ? [...host.querySelectorAll(".ml-title, .ml-hero, .ml-sub, .ml-label")] : [el];
    const accentCs = (() => { const pr = document.createElement("i"); pr.style.color = "var(--x-accent)"; pr.style.display = "none"; host.append(pr); const c = getComputedStyle(pr).color; pr.remove(); return c; })();
    const accents = [];
    for (const tx of texts) for (const c of tx.querySelectorAll("*")) {
      const marked = c.matches("[data-accent], .ml-accent") || getComputedStyle(c).color === accentCs || c.style.color;
      if (marked) accents.push(c);
    }
    const base = texts.map((tx) => tx.style.color || "");
    // scene veil: under the title (raised above it) when the title is the target, over everything when it is the stage
    let veil = null;
    if (p.scope === "scene" || whole || p.end === "fade-black") {
      veil = document.createElement("div");
      Object.assign(veil.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", background: veilCol, opacity: "0", pointerEvents: "none", zIndex: "20" });
      host.append(veil);
      if (!whole && p.scope === "scene") { if (getComputedStyle(el).position === "static") el.style.position = "relative"; el.style.zIndex = "21"; }
    }
    let counter = null;
    if (p.counter && !whole) {
      counter = document.createElement("div");
      counter.textContent = String(p.index || "01 / 02");
      const fs = parseFloat(getComputedStyle(el).fontSize) || 100;
      const b = ctx.box(el);
      Object.assign(counter.style, { position: "absolute", left: b.x.toFixed(1) + "px", width: b.w.toFixed(1) + "px", top: (b.y + b.h + fs * 0.12).toFixed(1) + "px", font: `var(--x-label-weight) ${Math.max(12, fs * 0.16).toFixed(1)}px var(--x-mono-font)`, letterSpacing: "0.12em", color: "var(--x-ink)", opacity: "0", textAlign: getComputedStyle(el).textAlign, direction: "ltr", zIndex: "21", pointerEvents: "none" });
      host.append(counter);
    }
    const t0 = at + p.hold, t1 = t0 + p.dim;
    const sine = (x) => -(Math.cos(Math.PI * x) - 1) / 2;
    const curve = p.direction === "light" ? (x) => x * x : sine;
    const fadeA = end - 0.42, cutAt = end - 1 / 30;
    return {
      draw(t) {
        const k = curve(ML.lin(t, t0, t1)); // 0 → 1 over the dim
        const keep = 1 - (1 - p.to) * k; // share of full ink left
        const mixc = k > 0 ? `color-mix(in srgb, var(--x-ink) ${(keep * 100).toFixed(2)}%, ${p.direction === "light" ? lighter : "var(--x-ground)"})` : "";
        texts.forEach((tx, i) => { tx.style.color = mixc || base[i]; });
        if (!p["keep-accent"]) for (const c of accents) c.style.filter = k > 0 ? `opacity(${keep.toFixed(4)})` : "none";
        let v = p.scope === "scene" || whole ? k * 0.65 : 0; // brightness 1 → 0.35
        if (p.end === "fade-black") v = Math.max(v, ML.ease(t, fadeA, end - 0.02));
        if (veil) veil.style.opacity = v.toFixed(4);
        if (p.end === "fade-black" && !whole) el.style.opacity = (1 - ML.ease(t, fadeA, end - 0.02)).toFixed(4);
        const gone = p.end === "cut" && t >= cutAt;
        el.style.visibility = gone ? "hidden" : "";
        if (counter) counter.style.opacity = gone ? "0" : (0.4 * ML.lin(t, t0, t1)).toFixed(4);
      },
    };
  },
});
