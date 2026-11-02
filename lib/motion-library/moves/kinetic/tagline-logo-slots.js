// Tagline with partner logos landing in slots (product-film's ending): the closing tagline is laid out as a
// punchline card with kept slots — every word, and a 0.82 em logo box before each logo's word, has its place from the
// first frame. Each logo is a traveller: a magic move from where it sat in the previous (proof) scene to its slot,
// on a spring (stiffness 150, damping 20), started so it lands on its word; the words themselves blur-rise in place
// (text never flies). Then the CTA / URL lands as a final word group and the brand logo locks up under it. Logos are
// the scene's own logo slots when it has them (cloned, so the vector stays sharp at every size); missing ones are
// drawn as simple look-coloured marks entering from the frame edge. Ending budget ≈ 2 bars.
// Source: Rieranthony/product-film-skill, templates/kit/move.ts + punchlines.tsx, ingredients.md "Ending and loop",
// "Partner logos" (MIT).
ML.define({
  id: "kinetic.tagline-logo-slots",
  category: "kinetic",
  name: "Tagline with logos landing in slots",
  does: "The closing tagline builds word by word while partner logos fly in from the previous scene and land in reserved slots in the line as their words land.",
  says: ["brand", "connection", "result", "trust"],
  energy: 3,
  targets: ["headline", "logo"],
  duration: [2.5, 5],
  params: {
    logos: { type: "number", range: [1, 5], default: 3 },
    cta: { type: "bool", default: true },
    cta_text: { type: "text", default: "" },
    spring_stiffness: { type: "number", range: [100, 250], default: 150 },
    spring_damping: { type: "number", range: [12, 30], default: 20 },
    size: { type: "number", range: [100, 160], default: 130, unit: "px" },
    bpm: { type: "number", range: [80, 140], default: 120 },
  },
  pairs: ["kinetic.punchline-card", "transition.magic-move"],
  avoid: ["problem"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "land",
  source: { from: "product-film-skill:templates/kit/move.ts", license: "MIT", note: "with punchlines.tsx kept slots; ingredients.md Ending and loop, Partner logos" },
  setup(ctx) {
    const { el, p, at, end, stage, f, rtl } = ctx;
    const host = ctx.scene || stage;
    const k = stage.getBoundingClientRect().width / (stage.offsetWidth || 1) || 1;
    // the tagline: a headline target's text, else the scene's headline (a logo target brings its own logo)
    const isLogoTarget = el && el.matches && el.matches('[data-slot="logo"]');
    const src = el && !isLogoTarget && el !== stage ? el : host.querySelector(".ml-title");
    const text = ((src && src.textContent) || "").trim().replace(/\s+/g, " ");
    if (!text) return null;
    const words = text.split(" ");
    // logo sources: the scene's logo slots (the target first), then drawn marks
    const found = [...new Set([...(isLogoTarget ? [el] : []), ...host.querySelectorAll('[data-slot="logo"], [data-slot-sample="logo"], [data-logo]')])];
    const L = Math.max(1, Math.min(Math.round(p.logos), 5, words.length));
    const beat = 60 / p.bpm, kSize = Math.min(f.W, f.H) / 1080, maxW = f.W - f.m * 2;

    const card = document.createElement("div");
    Object.assign(card.style, { position: "absolute", inset: "0", zIndex: "7", background: "var(--x-ground)", pointerEvents: "none", overflow: "hidden" });
    card.setAttribute("dir", rtl ? "rtl" : "ltr");
    host.append(card);
    const block = document.createElement("div");
    Object.assign(block.style, { position: "absolute", left: "0", right: "0", top: (f.H * 0.42).toFixed(1) + "px", translate: "0 -50%", display: "grid", justifyItems: "center", rowGap: "0.18em", font: `var(--x-head-weight) ${(p.size * kSize).toFixed(1)}px / 1.08 var(--x-head-font)`, letterSpacing: "var(--x-head-track)", color: "var(--x-ink)" });
    card.append(block);
    const mkLine = () => { const d = document.createElement("div"); Object.assign(d.style, { display: "flex", alignItems: "center", gap: "0.26em", whiteSpace: "nowrap" }); return d; };
    // which words carry a logo: spread evenly through the line
    const withLogo = new Map();
    for (let i = 0; i < L; i++) withLogo.set(Math.min(words.length - 1, Math.floor(((i + 0.5) * words.length) / L)), i);
    const items = words.map((w, i) => {
      const s = document.createElement("span");
      Object.assign(s.style, { display: "inline-flex", alignItems: "center", gap: "0.2em" });
      let slot = null;
      if (withLogo.has(i)) { slot = document.createElement("span"); Object.assign(slot.style, { display: "inline-flex", width: "0.82em", height: "0.82em", flex: "none" }); s.append(slot); }
      const tx = document.createElement("span"); tx.textContent = w; s.append(tx);
      return { s, tx, slot, logo: withLogo.has(i) ? withLogo.get(i) : -1 };
    });
    // lines: one, or two balanced ones when one would shrink below 70 %
    const probe = mkLine(); items.forEach((it) => probe.append(it.s)); block.append(probe);
    const wOf = (a, b) => { if (b <= a) return 0; const r = items[b - 1].s.getBoundingClientRect(), l = items[a].s.getBoundingClientRect(); return (Math.max(r.right, l.right) - Math.min(r.left, l.left)) / k; };
    let cut = 0;
    if (items.length > 1 && wOf(0, items.length) > maxW / 0.7) { let best = Infinity; for (let i = 1; i < items.length; i++) { const m = Math.max(wOf(0, i), wOf(i, items.length)); if (m < best) { best = m; cut = i; } } }
    probe.remove();
    const rows = cut ? [items.slice(0, cut), items.slice(cut)] : [items];
    const lineEls = rows.map((r) => { const d = mkLine(); r.forEach((it) => d.append(it.s)); block.append(d); return d; });
    // the CTA: a final word group (pill) and the brand lockup under it
    let ctaEl = null, lock = null;
    const ctaText = (p.cta_text || (host.querySelector(".ml-sub") && host.querySelector(".ml-sub") !== src ? host.querySelector(".ml-sub").textContent : "") || "").trim();
    if (p.cta && ctaText) {
      ctaEl = document.createElement("div");
      ctaEl.textContent = ctaText;
      Object.assign(ctaEl.style, { marginTop: "0.5em", font: `600 0.3em / 1 var(--x-body-font)`, letterSpacing: "0", padding: "0.55em 1.1em", borderRadius: "var(--x-radius-s)", background: "var(--x-accent)", color: "var(--x-accent-ink)", whiteSpace: "nowrap" });
      block.append(ctaEl);
    }
    if (found[0]) {
      lock = found[0].cloneNode(true);
      lock.removeAttribute("data-slot"); lock.removeAttribute("data-slot-sample");
      const r = ctx.box(found[0]), h = 0.36;
      Object.assign(lock.style, { height: h + "em", width: ((r.w / Math.max(1, r.h)) * h).toFixed(3) + "em", marginTop: "0.45em", display: "block" });
      block.append(lock);
    }
    const widest = Math.max(...lineEls.map((d) => d.getBoundingClientRect().width / k));
    if (widest > maxW) block.style.fontSize = ((p.size * kSize * maxW) / widest).toFixed(1) + "px";

    // times: words on their spoken word, else on the beat
    const times = words.map((w, i) => Math.max(at + 0.25, ctx.word(w, at + 0.25 + i * beat)));
    for (let i = 1; i < times.length; i++) times[i] = Math.max(times[i], times[i - 1] + 0.12);
    const cfg = { stiffness: p.spring_stiffness, damping: p.spring_damping };
    // the spring's time to land (within 2 % of the gap): the traveller leaves that long before its word
    let settle = 0.2; for (let x = 0.05; x < 2; x += 0.01) if (Math.abs(1 - ML.step(x, cfg)) > 0.02) settle = x;
    const lastWord = times[times.length - 1] + 0.3;
    const tCta = Math.min(end - 0.6, lastWord + beat), tLock = Math.min(end - 0.4, tCta + beat * 0.75);

    // travellers: clones of the scene's logos (or drawn marks), from their rect in the scene to their slot
    const layer = document.createElement("div");
    Object.assign(layer.style, { position: "absolute", inset: "0", zIndex: "8", pointerEvents: "none" });
    host.append(layer);
    const travellers = items.filter((it) => it.slot).map((it, n) => {
      const srcLogo = found[n] || null;
      let node, from;
      if (srcLogo) {
        node = srcLogo.cloneNode(true);
        node.removeAttribute("data-slot"); node.removeAttribute("data-slot-sample");
        from = ctx.box(srcLogo);
      } else {
        node = document.createElement("div");
        const shapes = ["50%", "22%", "50% 50% 12% 50%", "30% 70% 70% 30% / 30% 30% 70% 70%", "8%"];
        Object.assign(node.style, { background: n % 2 ? "var(--x-accent-2)" : "var(--x-accent)", borderRadius: shapes[n % shapes.length], boxShadow: "inset 0 0 0 0.12em color-mix(in srgb, var(--x-accent-ink) 35%, transparent)" });
        const side = Math.min(f.W, f.H) * 0.12, row = f.H * 0.8;
        from = { x: f.W * (0.18 + 0.64 * (L > 1 ? n / (L - 1) : 0.5)) - side / 2, y: row - side / 2 + (n % 2) * side * 0.4, w: side, h: side };
      }
      Object.assign(node.style, { position: "absolute", left: "0", top: "0", display: "block", margin: "0", overflow: "visible" });
      layer.append(node);
      const slot = ctx.box(it.slot);
      const ar = from.w / Math.max(1, from.h);
      // fit the logo's aspect into the square slot
      const to = ar >= 1 ? { x: slot.x, y: slot.y + (slot.h - slot.w / ar) / 2, w: slot.w, h: slot.w / ar } : { x: slot.x + (slot.w - slot.h * ar) / 2, y: slot.y, w: slot.h * ar, h: slot.h };
      const land = times[items.indexOf(it)];
      return { node, from, to, start: land - settle, src: srcLogo, drawn: !srcLogo };
    });
    times.forEach((t, i) => ctx.sfx(t, items[i].slot ? "land" : "tap", items[i].slot ? 0.4 : 0.2));
    travellers.forEach((tr) => ctx.sfx(tr.start, "whoosh.soft", 0.2));
    if (ctaEl) ctx.sfx(tCta, "pop", 0.35);
    if (lock) ctx.sfx(tLock, "land.light", 0.3);
    const cardIn = at;

    return {
      draw(t) {
        const on = t >= cardIn;
        card.style.visibility = layer.style.visibility = on ? "visible" : "hidden";
        if (src) src.style.visibility = on ? "hidden" : "";
        for (const tr of travellers) if (tr.src) tr.src.style.visibility = on ? "hidden" : "";
        if (!on) return;
        // the card's ground comes up under the logos, which hold their old places until they leave
        card.style.opacity = ML.ease(t, cardIn, cardIn + 0.3).toFixed(4);
        const leave = ML.clamp((t - (end - 0.2)) / 0.18);
        block.style.opacity = (1 - leave).toFixed(4);
        layer.style.opacity = (1 - leave).toFixed(4);
        block.style.filter = layer.style.filter = leave > 0 ? `blur(${(leave * 12).toFixed(2)}px)` : "none";
        items.forEach((it, i) => {
          const u = ML.land(t, times[i], times[i] + 0.3);
          it.tx.style.opacity = u.toFixed(4);
          it.tx.style.filter = u < 1 ? `blur(${((1 - u) * 16).toFixed(2)}px)` : "none";
          it.tx.style.translate = `0 ${((1 - u) * 36 * kSize).toFixed(2)}px`;
        });
        for (const tr of travellers) {
          const r = ML.moveRect(t, tr.start, tr.from, tr.to, cfg);
          tr.node.style.opacity = tr.drawn ? ML.lin(t, tr.start - 0.25, tr.start).toFixed(4) : "1";
          Object.assign(tr.node.style, { width: r.w.toFixed(2) + "px", height: r.h.toFixed(2) + "px", translate: `${r.x.toFixed(2)}px ${r.y.toFixed(2)}px` });
        }
        if (ctaEl) {
          const u = ML.land(t, tCta, tCta + 0.35);
          ctaEl.style.opacity = u.toFixed(4);
          ctaEl.style.filter = u < 1 ? `blur(${((1 - u) * 12).toFixed(2)}px)` : "none";
          ctaEl.style.translate = `0 ${((1 - u) * 24 * kSize).toFixed(2)}px`;
        }
        if (lock) {
          const u = ML.land(t, tLock, tLock + 0.4);
          lock.style.opacity = u.toFixed(4);
          lock.style.translate = `0 ${((1 - u) * 16 * kSize).toFixed(2)}px`;
        }
      },
    };
  },
});
