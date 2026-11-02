// Glow burst gather: a radial bloom (soft, blurred 40 px) scales 0 -> 1.5 at the centre over 0.6 s expo.out; 3-7
// cards (the look's panel, half its radius, an icon + a label) fly from scattered, tilted positions into a neat centred
// row (gap ~10 px at 1080), stagger 0.05 s power3.out, their tilt settling on a soft spring; then the bloom expands
// until its solid core fills the frame and becomes the next scene's ground (end colour), the cards staying on it as the
// bridge until the move ends. Labels come from the target list's items (or the scene's list), then its words; the row
// reads right to left in Arabic. End colour: a look name (white = the look's accent ink, panel, ground, accent…) or a
// --x- variable.
// Source: prompt-motion gabrielbuzziv-tutorial-o-mais-insano (reference only: our own rebuild).
ML.define({
  id: "transition.glow-burst-gather",
  category: "transition",
  name: "Glow burst gather",
  does: "A bright glow blooms in the centre, a few labelled cards fly out of the chaos into a neat row, then the scene washes to white.",
  says: ["relief", "simplicity", "transition"],
  energy: 4,
  targets: ["card", "list", "scene"],
  duration: [1, 1.8],
  params: {
    items: { type: "number", range: [3, 7], default: 5 },
    end_colour: { type: "text", default: "white" },
  },
  pairs: ["text-in.punchline", "element.card-stack"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "prompt-motion:gabrielbuzziv-tutorial-o-mais-insano", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, end, stage, f, el } = ctx;
    const scene = ctx.scene || null;
    const W = f.W, H = f.H, k = Math.min(W, H) / 1080, diag = Math.hypot(W, H);
    const C = (c, fb) => {
      c = String(c || "").trim();
      if (c.startsWith("--x-")) return `var(${c})`;
      if (c === "white" || c === "light") return "var(--x-accent-ink)";
      if (c === "black" || c === "dark") return "var(--x-device)";
      if (/^(accent|accent-2|accent-ink|ink|good|bad|panel|panel-2|ground|dim|device|glow-1|glow-2)$/.test(c)) return `var(--x-${c})`;
      return fb;
    };
    const endCol = C(p.end_colour, "var(--x-accent-ink)");
    const n = Math.round(ML.clamp(+p.items || 5, 3, 7));
    // labels: the target's items, else the scene's list, then words of the scene's text
    const host = scene || stage;
    const listEl = el && el !== stage ? el : host.querySelector('[data-slot="list"], [data-slot-sample="list"]');
    const labels = [];
    if (listEl) for (const c of listEl.children) { const s = c.textContent.trim(); if (s) labels.push(s); }
    const more = (host.querySelector(".ml-sub") || host.querySelector(".ml-title") || { textContent: "" }).textContent.trim().split(/\s+/).filter(Boolean);
    for (const w of more) if (labels.length < n) labels.push(w);
    while (labels.length < n) labels.push(labels[labels.length % Math.max(1, labels.length)] || "");
    // the bloom
    const D0 = Math.min(W, H) * 0.5;
    const bloom = document.createElement("div");
    bloom.style.cssText = `position:absolute;left:${W / 2 - D0 / 2}px;top:${H / 2 - D0 / 2}px;width:${D0}px;height:${D0}px;border-radius:50%;pointer-events:none;z-index:8;visibility:hidden;` +
      `background:radial-gradient(circle, ${endCol} 0%, ${endCol} 45%, color-mix(in srgb, ${endCol} 40%, transparent) 60%, transparent 71%);filter:blur(${(40 * k).toFixed(1)}px)`;
    // the cards
    const gap = 10 * k * 1.6;
    const cw = Math.min(250 * k, (f.safe.w - gap * (n - 1)) / n), ch = cw * 0.92;
    const rowW = n * cw + (n - 1) * gap;
    const icons = [
      '<circle cx="12" cy="12" r="8"/>',
      '<rect x="4" y="4" width="16" height="16" rx="4"/>',
      '<path d="M12 3 21 20H3Z"/>',
      '<path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8Z"/>',
      '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
      '<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>',
      '<path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11Z"/>',
    ];
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:9;display:none";
    const cards = labels.slice(0, n).map((label, i) => {
      const c = document.createElement("div");
      c.className = "ml-panel";
      c.setAttribute("dir", ctx.rtl ? "rtl" : "ltr");
      c.style.cssText = `position:absolute;left:0;top:0;width:${cw.toFixed(1)}px;height:${ch.toFixed(1)}px;box-sizing:border-box;border-radius:calc(var(--x-radius) * 0.5);` +
        `display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${(cw * 0.08).toFixed(1)}px;padding:${(cw * 0.08).toFixed(1)}px;text-align:center`;
      const ic = icons[i % icons.length];
      const stroke = ic.includes('fill="none"');
      c.innerHTML = `<svg viewBox="0 0 24 24" width="${(cw * 0.32).toFixed(1)}" height="${(cw * 0.32).toFixed(1)}" style="fill:${stroke ? "none" : "var(--x-accent)"};stroke:var(--x-accent)">${ic}</svg>`;
      const lb = document.createElement("div");
      lb.style.cssText = `font:600 ${(cw * 0.12).toFixed(1)}px/1.2 var(--x-body-font);color:var(--x-ink);max-width:100%;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical`;
      lb.textContent = label;
      c.append(lb);
      layer.append(c);
      const slot = ctx.rtl ? n - 1 - i : i;
      const x1 = W / 2 - rowW / 2 + slot * (cw + gap), y1 = H / 2 - ch / 2;
      // scattered start: around the centre, tilted
      const a = ML.rnd(i, 31) * Math.PI * 2, rr = Math.min(W, H) * (0.3 + 0.25 * ML.rnd(i, 32));
      const x0 = ML.clamp(W / 2 + Math.cos(a) * rr - cw / 2, -cw * 0.2, W - cw * 0.8), y0 = H / 2 + Math.sin(a) * rr * (H > W ? 1.3 : 0.8) - ch / 2;
      return { c, x0, y0, x1, y1, r0: (ML.rnd(i, 33) - 0.5) * 60, s0: 0.55 + 0.2 * ML.rnd(i, 34), t0: at + 0.15 + i * 0.05 };
    });
    stage.append(bloom, layer);
    const grow = at + 0.6, expA = at + 0.85, expB = at + 1.35;
    const sFull = diag / (0.45 * D0) * 1.05;
    const p3out = (x) => 1 - Math.pow(1 - x, 4);
    ctx.sfx(at, "swell", 0.45);
    ctx.sfx(cards[cards.length - 1].t0 + 0.35, "pop.soft", 0.3);
    return {
      draw(t) {
        const on = t >= at && t < end + 0.2;
        bloom.style.visibility = on ? "visible" : "hidden";
        layer.style.display = on ? "block" : "none";
        if (scene) scene.style.visibility = t >= expB ? "hidden" : "";
        if (!on) return;
        const s = t < expA ? 1.5 * ML.expo(t, at, grow) : 1.5 + (sFull - 1.5) * Math.pow(ML.lin(t, expA, expB), 3);
        bloom.style.transform = `scale(${Math.max(0.0001, s).toFixed(4)})`;
        const leave = ML.lin(t, end, end + 0.2);
        for (const q of cards) {
          const u = p3out(ML.lin(t, q.t0, q.t0 + 0.65)), sp = ML.step(t - q.t0, ML.SPRING.soft);
          const x = q.x0 + (q.x1 - q.x0) * u, y = q.y0 + (q.y1 - q.y0) * u, r = q.r0 * (1 - sp), sc = q.s0 + (1 - q.s0) * u;
          q.c.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${r.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
          q.c.style.opacity = (t < q.t0 ? 0 : Math.min(1, ML.lin(t, q.t0, q.t0 + 0.12)) * (1 - leave)).toFixed(4);
        }
        bloom.style.opacity = (1 - leave).toFixed(4);
      },
    };
  },
});
