// Giant wordmark rising from behind the foreground: the frame becomes a scene in layers — a plate (the look's sky),
// the brand word set frame-wide (weight 600, tracking .40em on short words so it spans edge to edge, one vertical ramp
// shared by every glyph), an occluding cut-out in front of its lower part (a hill, a fringe of grass, a product slab, or
// none: the baseline itself masks it) and a fog over both. Reveal r = min(cap, (t − at) / rise); per glyph
// st = clamp((r − i·stagger) / 0.62); y = (1 − easeOut(st)) · capHeight · 1.15 below its place; opacity = easeOut(st):
// the letters climb out from behind the occluder in a wave along the reading direction. It holds while the scene drifts
// (the occluder parallaxes), then leaves: dissolve (opacity × 1 − near · 0.96, near = smoothstep(.02, .92, progress)),
// push past (the word grows through the frame as it fades), or hold. Arabic: each word rises whole, never split.
// Source: MengTo/Skills build-threejs-scroll-worlds demo/index.html — the WORD glyph reveal and dissolve (MIT), rebuilt
// in the DOM with the look's colours.
ML.define({
  id: "kinetic.wordmark-rise-behind",
  category: "kinetic",
  name: "Giant wordmark rising from behind the foreground",
  does: "A frame-wide brand word rises letter by letter from behind a foreground cut-out, then thins away as the camera moves toward it.",
  says: ["brand", "reveal", "arrival", "luxury", "scale"],
  energy: 4,
  targets: ["headline", "logo", "stage"],
  duration: [2, 6],
  params: {
    split: { type: "choice", options: ["letters", "word"], default: "letters" },
    stagger: { type: "number", range: [0.03, 0.12], default: 0.075, unit: "s" },
    rise: { type: "number", range: [0.6, 2.5], default: 1.5, unit: "s" },
    occluder: { type: "choice", options: ["grass", "hill", "product", "none"], default: "hill" },
    exit: { type: "choice", options: ["dissolve", "push-past", "hold"], default: "dissolve" },
    baseline: { type: "number", range: [0.12, 0.7], default: 0.58, unit: "frame" },
    fog: { type: "bool", default: true },
  },
  pairs: ["camera.push-in"],
  avoid: ["urgency", "playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "MengTo/Skills:agent-skills/web-design/build-threejs-scroll-worlds/demo/index.html", license: "MIT" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const host = ctx.scene || ctx.stage, doc = host.ownerDocument, NS = "http://www.w3.org/2000/svg";
    const f = ctx.f, W = f.W, H = f.H, k = Math.min(W, H) / 1080;
    const isStage = el === ctx.stage || el === ctx.scene;
    const srcEl = isStage ? host.querySelector(".ml-title") : el;
    const text = ((srcEl && srcEl.textContent) || "").replace(/\s+/g, " ").trim();
    if (!text) return null;
    const arabic = ML.ARABIC.test(text);
    ctx.sfx(at, "swell", 0.35);
    // ── layers ──
    const layer = doc.createElement("div");
    Object.assign(layer.style, { position: "absolute", inset: "0", zIndex: "6", overflow: "hidden", pointerEvents: "none", background: "linear-gradient(180deg, color-mix(in srgb, var(--x-accent-2) 22%, var(--x-ground)) 0%, var(--x-ground) 62%)" });
    host.append(layer);
    const glow = doc.createElement("div");
    Object.assign(glow.style, { position: "absolute", inset: "0", background: "radial-gradient(60% 45% at 50% 38%, color-mix(in srgb, var(--x-glow-1) 30%, transparent), transparent 70%)", opacity: "var(--x-glow-o)" });
    layer.append(glow);
    // the wordmark: tracked wide on short Latin words, never on Arabic; it fills the frame width, kept a hair inside the
    // edges (the source runs 1.00–1.06× and lets the frame crop it; a cropped brand word reads as a mistake in a film)
    const mark = doc.createElement("div");
    const track = arabic ? 0 : text.length <= 6 ? 0.4 : text.length <= 10 ? 0.18 : 0.06;
    Object.assign(mark.style, { position: "absolute", left: "50%", top: "0", whiteSpace: "pre", direction: rtl ? "rtl" : "ltr", font: `600 100px / 1.3 var(--x-head-font)`, letterSpacing: track + "em", textTransform: arabic ? "none" : "uppercase" });
    mark.textContent = text;
    layer.append(mark);
    const glyphs = ML.split(mark, p.split === "word" || arabic ? "words" : "chars").filter((g) => g.textContent.trim());
    // the trailing tracking after the last letter is not part of the ink
    const lastG = glyphs[glyphs.length - 1];
    if (lastG && track) lastG.style.marginInlineEnd = -track + "em";
    const fill = 0.96;
    const w0 = mark.offsetWidth || 1;
    const size = Math.min((100 * W * fill) / w0, H * 0.42);
    mark.style.fontSize = size.toFixed(2) + "px";
    // ink box of a capital: about 0.72 of the size for Latin caps, more for Arabic's tall forms
    const cap = size * (arabic ? 0.8 : 0.72);
    const tall = f.tall && p.baseline === 0.58;
    const baseY = H * (tall ? 0.46 : p.baseline); // where the letters' baseline sits (tall frames: higher, still clear of the top UI)
    // where the baseline falls inside the line box: a zero-size probe sitting on it
    const probe = doc.createElement("span");
    Object.assign(probe.style, { display: "inline-block", width: "0", height: "0", verticalAlign: "baseline" });
    mark.append(probe);
    const baseIn = probe.offsetTop || size * 1.05;
    probe.remove();
    const lineTop = baseY - baseIn; // top of the line box so the baseline lands on baseY
    mark.style.top = lineTop.toFixed(1) + "px";
    mark.style.translate = "-50% 0";
    // one ramp for the whole word: every glyph shares the same line box, so the same vertical gradient reads as one
    const ramp = "linear-gradient(180deg, color-mix(in srgb, var(--x-ink) 92%, var(--x-ground)) 18%, color-mix(in srgb, var(--x-ink) 72%, var(--x-ground)) 52%, color-mix(in srgb, var(--x-ink) 52%, var(--x-accent)) 86%)";
    glyphs.forEach((g) => Object.assign(g.style, { backgroundImage: ramp, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }));
    // the occluder: its top edge hides the lower quarter of the letters
    const occTop = arabic ? baseY - size * 0.03 : baseY - cap * 0.24; // Arabic bodies sit on the baseline: only the tails go under
    const occ = doc.createElementNS(NS, "svg");
    occ.setAttribute("viewBox", `0 0 ${W} ${H}`); occ.setAttribute("width", W); occ.setAttribute("height", H);
    Object.assign(occ.style, { position: "absolute", left: "0", top: "0" });
    // the cut-out in the look's darker tone, lit a little at its crest (one gradient down the frame)
    const gid = "ml-wrb-" + Math.round(ML.rnd(at * 2.3 + text.length, 7) * 1e9);
    const fillC = `url(#${gid})`;
    const grad = `<defs><linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="0" y1="${(occTop - cap * 0.2).toFixed(1)}" x2="0" y2="${H}"><stop offset="0" style="stop-color: color-mix(in srgb, var(--x-ink) 62%, var(--x-accent))"/><stop offset="0.35" style="stop-color: color-mix(in srgb, var(--x-ink) 85%, var(--x-accent))"/><stop offset="1" style="stop-color: var(--x-ink)"/></linearGradient></defs>`;
    let shape = "";
    if (p.occluder === "hill") {
      const y0 = occTop, a = cap * 0.12;
      shape = `<path d="M0 ${(y0 + a * 0.6).toFixed(1)} C ${W * 0.22} ${(y0 - a).toFixed(1)}, ${W * 0.42} ${(y0 + a * 0.2).toFixed(1)}, ${W * 0.6} ${(y0 - a * 0.3).toFixed(1)} S ${W * 0.9} ${(y0 + a * 0.8).toFixed(1)}, ${W} ${(y0 - a * 0.1).toFixed(1)} L ${W} ${H} L 0 ${H} Z" fill="${fillC}"/>` +
        `<path d="M0 ${(y0 + a * 1.8).toFixed(1)} C ${W * 0.3} ${(y0 + a * 0.9).toFixed(1)}, ${W * 0.55} ${(y0 + a * 2.2).toFixed(1)}, ${W} ${(y0 + a * 1.2).toFixed(1)} L ${W} ${H} L 0 ${H} Z" fill="${fillC}" opacity="0.9"/>`;
    } else if (p.occluder === "grass") {
      let d = `M0 ${H} L0 ${(occTop + cap * 0.1).toFixed(1)} `;
      const blades = Math.round(W / (14 * k));
      for (let i = 0; i <= blades; i++) {
        const x = (i / blades) * W, h = cap * (0.12 + ML.rnd(i, 2) * 0.32), lean = (ML.rnd(i, 3) - 0.5) * 22 * k;
        d += `L${(x - 5 * k).toFixed(1)} ${(occTop + cap * 0.14).toFixed(1)} L${(x + lean).toFixed(1)} ${(occTop + cap * 0.14 - h).toFixed(1)} L${(x + 5 * k).toFixed(1)} ${(occTop + cap * 0.14).toFixed(1)} `;
      }
      shape = `<path d="${d}L${W} ${H} Z" fill="${fillC}"/>`;
    } else if (p.occluder === "product") {
      const pw = W * (f.wide ? 0.34 : 0.56), px = (W - pw) / 2, r = Math.min(pw * 0.12, 60 * k);
      shape = `<rect x="0" y="${(occTop + cap * 0.45).toFixed(1)}" width="${W}" height="${H}" fill="color-mix(in srgb, var(--x-ink) 86%, var(--x-accent))"/>` +
        `<rect x="${px.toFixed(1)}" y="${occTop.toFixed(1)}" width="${pw.toFixed(1)}" height="${H}" rx="${r.toFixed(1)}" fill="var(--x-panel)" stroke="var(--x-line)" stroke-width="${Math.max(1, 2 * k).toFixed(1)}"/>` +
        `<rect x="${(px + pw * 0.08).toFixed(1)}" y="${(occTop + pw * 0.08).toFixed(1)}" width="${(pw * 0.84).toFixed(1)}" height="${(cap * 0.08).toFixed(1)}" rx="${(cap * 0.04).toFixed(1)}" fill="var(--x-accent)" opacity="0.85"/>`;
      // the slab stands in front of the middle; the word's sides still need a ground line
    }
    occ.innerHTML = grad + shape;
    if (p.occluder !== "none") layer.append(occ);
    else mark.style.clipPath = `inset(-50% -10% ${(mark.offsetHeight - baseIn - size * 0.04).toFixed(1)}px -10%)`;
    let fogEl = null;
    if (p.fog) {
      fogEl = doc.createElement("div");
      Object.assign(fogEl.style, { position: "absolute", left: "0", right: "0", top: (occTop - cap * 0.6).toFixed(1) + "px", height: (cap * 1.4).toFixed(1) + "px", background: "linear-gradient(180deg, transparent, color-mix(in srgb, var(--x-ground) 38%, transparent) 50%, transparent)" });
      layer.append(fogEl);
    }
    // ── timing ──
    const n = glyphs.length;
    const stg = n > 1 ? Math.min(p.stagger, 0.6 / (n - 1)) : 0;
    const rcap = Math.max(1.2, (n - 1) * stg + 0.62);
    const leaveD = p.exit === "hold" ? 0 : Math.min(1.4, (end - at) * 0.32);
    const easeOut = (x) => 1 - Math.pow(1 - x, 3);
    const smooth = (a, b, x) => { const u = ML.clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
    const hideSource = !isStage && srcEl;
    return {
      draw(t) {
        const on = t >= at - 1e-6 && t < end;
        layer.style.visibility = on ? "visible" : "hidden";
        if (hideSource) srcEl.style.opacity = on ? "0" : "";
        if (!on) return;
        const r = Math.min(rcap, Math.max(0, (t - at) / p.rise));
        const prog = leaveD ? ML.lin(t, end - leaveD, end) : 0;
        const near = smooth(0.02, 0.92, prog);
        // the scene drifts while it holds: the occluder slides down a touch (parallax), the plate stays
        const drift = ML.lin(t, at, end);
        occ.style.transform = `translateY(${(drift * 0.02 * H + near * 0.06 * H).toFixed(2)}px)`;
        if (fogEl) fogEl.style.opacity = String(1 - near * 0.6);
        glyphs.forEach((g, i) => {
          const st = ML.clamp((r - i * stg) / 0.62), e = easeOut(st);
          g.style.transform = `translateY(${((1 - e) * cap * 1.15).toFixed(2)}px)`;
          g.style.opacity = (e * (p.exit === "dissolve" ? 1 - near * 0.96 : p.exit === "push-past" ? 1 - near : 1)).toFixed(4);
        });
        // push past: the word grows through the frame (2D, from its centre) as the camera passes it
        const sc = p.exit === "push-past" ? 1 + near * near * 1.6 : 1 + drift * 0.015;
        mark.style.transformOrigin = `50% ${(baseY - lineTop - cap * 0.5).toFixed(1)}px`;
        mark.style.scale = sc.toFixed(4);
      },
    };
  },
});
