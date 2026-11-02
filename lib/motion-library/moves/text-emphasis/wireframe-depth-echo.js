// Wireframe depth echo: behind a bold word, 6–14 outline copies (a 1 px stroke of the ink at 40 %, no fill) recede to
// a vanishing point — copy i scaled 0.92^i (never above 1) and offset i steps toward the point (left-below,
// right-below, or straight back for centre) — like a wireframe tunnel. They slide in from depth (from deeper than
// their tunnel place, staggered, power3.out), hold a beat, then collapse onto the front word over 0.6 s power3.out,
// fading as they merge — or hold as a tunnel. The front word carries a slight glow of the accent. In RTL the
// vanishing side mirrors. A logo copies as outlined strokes; a picture copies as faint plates.
// Source: prompt-motion m1n9-k7-this-is-insane-opus (reference) — our own code.
ML.define({
  id: "text-emphasis.wireframe-depth-echo",
  category: "text-emphasis",
  name: "Wireframe copies recede and collapse onto the word",
  does: "Behind a bold word, outline copies recede to a vanishing point like a wireframe tunnel, then collapse onto the front word.",
  says: ["tech", "energy", "scale"],
  energy: 4,
  targets: ["word", "headline", "logo"],
  duration: [0.8, 3],
  params: {
    copies: { type: "number", range: [6, 14], default: 10 },
    vanish: { type: "choice", options: ["left-below", "right-below", "centre"], default: "left-below" },
    end: { type: "choice", options: ["collapse", "hold"], default: "collapse" },
    glow: { type: "bool", default: true },
    hold: { type: "number", range: [0, 1.2], default: 0.4, unit: "s" },
  },
  pairs: ["text-in.punchline", "camera.push-in"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:m1n9-k7-this-is-insane-opus", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl, stage } = ctx;
    if (!el) return null;
    const host = el.parentElement;
    if (!host) return null;
    const svg = el instanceof SVGElement, pic = el.tagName === "IMG";
    const b = ctx.box(el);
    const sk = stage.getBoundingClientRect().width / (stage.offsetWidth || 1) || 1;
    // the ink box of the text (a block slot is wider than its words)
    let ib = { x: 0, y: 0, w: b.w, h: b.h };
    if (!svg && !pic) { const r = document.createRange(); r.selectNodeContents(el); const rr = r.getBoundingClientRect(), eb = el.getBoundingClientRect(); ib = { x: (rr.left - eb.left) / sk, y: (rr.top - eb.top) / sk, w: rr.width / sk, h: rr.height / sk }; }
    const fs = svg || pic ? ib.h * 0.8 : parseFloat(getComputedStyle(el).fontSize) || 80;
    let vx = p.vanish === "left-below" ? -1 : p.vanish === "right-below" ? 1 : 0;
    if (rtl) vx = -vx;
    const vy = p.vanish === "centre" ? 0 : 0.62;
    const step = fs * 0.2;
    const n = Math.round(p.copies);
    if (getComputedStyle(el).position === "static" && !svg) el.style.position = "relative";
    el.style.zIndex = "1";
    const copies = [];
    for (let i = 1; i <= n; i++) {
      const c = el.cloneNode(true);
      c.removeAttribute("data-slot"); c.removeAttribute("id");
      c.querySelectorAll?.("[data-slot],[id]").forEach((x) => { x.removeAttribute("data-slot"); x.removeAttribute("id"); });
      c.setAttribute("aria-hidden", "true");
      Object.assign(c.style, { position: "absolute", left: "0px", top: "0px", width: b.w.toFixed(2) + "px", height: b.h.toFixed(2) + "px", margin: "0", pointerEvents: "none", zIndex: "0", boxSizing: "border-box", opacity: "0", textShadow: "none" });
      const line = "color-mix(in srgb, var(--x-ink) 40%, transparent)";
      if (svg) c.querySelectorAll("*").forEach((x) => { x.style.fill = "none"; x.style.stroke = line; x.style.strokeWidth = "1px"; x.setAttribute("vector-effect", "non-scaling-stroke"); });
      else if (pic) c.style.filter = "grayscale(1)";
      else Object.assign(c.style, { color: "transparent", webkitTextStroke: `1px ${line}` });
      c.querySelectorAll?.("*").forEach((x) => { if (!svg) { x.style.color = "transparent"; x.style.background = "none"; } });
      host.insertBefore(c, el);
      const cb = c.getBoundingClientRect(), eb = el.getBoundingClientRect();
      c.style.left = ((eb.left - cb.left) / sk).toFixed(2) + "px"; c.style.top = ((eb.top - cb.top) / sk).toFixed(2) + "px";
      // scale round the ink's centre so the tunnel recedes from the word itself
      c.style.transformOrigin = `${(ib.x + ib.w / 2).toFixed(2)}px ${(ib.y + ib.h / 2).toFixed(2)}px`;
      copies.push(c);
    }
    const inStart = at, inEach = 0.45, lag = 0.035;
    const formed = inStart + (n - 1) * lag + inEach;
    const cStart = Math.min(formed + p.hold, end - 0.75);
    const p3 = (t, a, z) => 1 - Math.pow(1 - ML.lin(t, a, z), 3);
    ctx.sfx(inStart, "whoosh.soft", 0.3);
    if (p.end === "collapse") ctx.sfx(cStart + 0.45, "land.light", 0.35);
    return {
      draw(t) {
        const leave = ML.ease(t, end - 0.25, end - 0.05);
        // the front word: a slight glow while the tunnel is up
        const g = p.glow ? ML.lin(t, at, at + 0.3) * (1 - leave) : 0;
        if (!svg && !pic) el.style.textShadow = g > 0.001 ? `0 0 ${(fs * 0.12).toFixed(1)}px color-mix(in srgb, var(--x-accent) ${(40 * g).toFixed(1)}%, transparent)` : "";
        else el.style.filter = g > 0.001 && !pic ? `drop-shadow(0 0 ${(fs * 0.08).toFixed(1)}px color-mix(in srgb, var(--x-accent) ${(40 * g).toFixed(1)}%, transparent))` : "";
        const col = p.end === "collapse" ? p3(t, cStart, cStart + 0.6) : 0;
        copies.forEach((c, k) => {
          const i = k + 1;
          // slide in from depth: from 1.7× its place (smaller, further) to its tunnel place
          const s0 = inStart + (n - i) * lag; // the deepest arrive first
          const u = p3(t, s0, s0 + inEach);
          if (u <= 0) { c.style.opacity = "0"; return; }
          const depth = i * (1 + 0.7 * (1 - u)) * (1 - col);
          const sc = Math.pow(0.92, depth);
          const dx = vx * step * depth, dy = vy * step * depth;
          c.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${sc.toFixed(4)})`;
          const fade = 1 - (0.6 * (i - 1)) / n;
          c.style.opacity = (u * fade * (1 - col) * (1 - leave)).toFixed(4);
        });
      },
    };
  },
});
