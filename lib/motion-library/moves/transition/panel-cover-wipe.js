// Panel cover wipe: a full-frame panel of the next ground (the dark ink by default, or --x-next-ground when the film
// sets it) travels in from off the frame — translateX 100% -> 0 or yPercent 100 -> 0 — over 0.5-0.9 s on power4.inOut,
// covering the previous scene, which stays perfectly still beneath it (no flash, no fade). The panel's leading edge can
// carry a 2 px accent bar, or a small tracking mark (a period dot) that rides the edge on the old ground and, once the
// panel owns the frame, settles as the full stop of the new title in the accent. When the panel has covered the frame
// the next chapter reads in on it from masks: its label, then the title word by word, then the line under it.
// Source: MengTo/Skills editorial-portfolio-chapters ARTICLE.md, "Full-Screen Chapter Wipe With a Timed Ledger" (MIT:
// the previous chapter preserved underneath, the ink panel sweeping over it, lines revealed from masks once it owns the
// viewport) and prompt-motion souravbhar871-my-first-experiment-with (reference only: our own rebuild).
ML.define({
  id: "transition.panel-cover-wipe",
  category: "transition",
  name: "Panel cover wipe",
  does: "A solid panel sweeps across (or rises over) the frame, covering the previous scene, which stays still underneath until covered.",
  says: ["transition", "change", "focus"],
  energy: 3,
  targets: ["scene"],
  duration: [0.5, 1],
  params: {
    direction: { type: "choice", options: ["left", "right", "up", "down"], default: "up" },
    duration: { type: "number", range: [0.5, 0.9], default: 0.7, unit: "s" },
    leading_edge: { type: "choice", options: ["none", "accent-bar", "tracking-mark"], default: "none" },
  },
  pairs: ["text-in.mask-rise", "transition.colour-field-cut"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:agent-skills/web-design/editorial-portfolio-chapters/ARTICLE.md", license: "MIT", note: "with prompt-motion souravbhar871-my-first-experiment-with (reference, our own rebuild)" },
  async setup(ctx) {
    const { p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, k = Math.min(W, H) / 1080;
    const dur = ML.clamp(+p.duration || 0.7, 0.5, 0.9);
    // the travel: "left" moves leftwards (enters from the right); Arabic mirrors the horizontal ones
    let dir = p.direction;
    if (ctx.rtl && dir === "left") dir = "right"; else if (ctx.rtl && dir === "right") dir = "left";
    const axis = dir === "up" || dir === "down" ? "y" : "x";
    const from = dir === "left" || dir === "up" ? 1 : -1; // where it starts, in panel lengths along the axis
    const p4 = (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2);

    const ground = "var(--x-next-ground, var(--x-ink))", ink = "var(--x-next-ink, var(--x-ground))";
    const panel = document.createElement("div");
    panel.setAttribute("aria-hidden", "true");
    panel.style.cssText = `position:absolute;inset:0;z-index:6;pointer-events:none;visibility:hidden;background:${ground};color:${ink};will-change:transform`;
    host.append(panel);
    // leading edge: a 2 px accent bar on the edge that comes first
    if (p.leading_edge === "accent-bar") {
      const bar = document.createElement("div");
      const bw = Math.max(2, 2 * k).toFixed(1) + "px";
      const side = axis === "y" ? (from > 0 ? `top:0;left:0;right:0;height:${bw}` : `bottom:0;left:0;right:0;height:${bw}`) : from > 0 ? `left:0;top:0;bottom:0;width:${bw}` : `right:0;top:0;bottom:0;width:${bw}`;
      bar.style.cssText = `position:absolute;${side};background:var(--x-accent)`;
      panel.append(bar);
    }

    // the next chapter on the panel: its label, the title (the scene's headline), the line under it
    const head = host.querySelector(".ml-title") || host.querySelector(".ml-hero");
    const subEl = host.querySelector(".ml-sub");
    const labEl = host.querySelector(".ml-label");
    const text = head ? head.textContent.trim() : "";
    const wrap = document.createElement("div");
    wrap.setAttribute("dir", ctx.rtl ? "rtl" : "ltr");
    const hb = host === stage ? { x: 0, y: 0 } : ctx.box(host);
    const b = head ? ctx.box(head) : { x: f.safe.x, y: f.H * 0.38, w: f.safe.w, h: 0 };
    wrap.style.cssText = `position:absolute;left:${(b.x - hb.x).toFixed(1)}px;top:${(b.y - hb.y).toFixed(1)}px;width:${b.w.toFixed(1)}px;display:flex;flex-direction:column;gap:${(18 * k).toFixed(1)}px;text-align:${head ? getComputedStyle(head).textAlign : "center"}`;
    const mk = (cls, txt) => { const d = document.createElement("div"); d.className = cls; d.textContent = txt; return d; };
    const label = mk("ml-label", labEl ? labEl.textContent.trim() : "");
    label.style.color = `color-mix(in srgb, ${ink} 62%, transparent)`;
    const title = mk(head ? head.className : "ml-title", text);
    title.removeAttribute("data-slot");
    const sub = mk("ml-sub", subEl ? subEl.textContent.trim() : "");
    sub.style.color = `color-mix(in srgb, ${ink} 70%, transparent)`;
    if (label.textContent) wrap.append(label);
    wrap.append(title);
    if (sub.textContent) wrap.append(sub);
    panel.append(wrap);
    if (head) { try { const cs = getComputedStyle(head); await document.fonts.load(`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, text || "A"); } catch (e) { /* measure as is */ } }
    // every word (and the label and the line) rises inside its own mask
    const masked = (el) => { const m = document.createElement("span"); m.style.cssText = "display:inline-block;overflow:hidden;vertical-align:top;padding:0.06em 0.03em 0.16em;margin:-0.06em -0.03em -0.16em"; el.replaceWith(m); m.append(el); return el; };
    const words = ML.split(title, "words").map(masked);
    const inner = (box) => { const s = document.createElement("span"); s.textContent = box.textContent; s.style.display = "inline-block"; box.textContent = ""; box.append(s); return masked(s); };
    const labWord = label.textContent ? inner(label) : null;
    const subLine = sub.textContent ? inner(sub) : null;

    const covered = at + dur;
    const tLab = covered + 0.05, tWords = covered + 0.14, tSub = tWords + words.length * 0.07 + 0.12;
    // the tracking mark: a dot riding the edge, then the title's full stop
    let dot = null, dotEnd = null;
    if (p.leading_edge === "tracking-mark") {
      const s = Math.max(10, 26 * k);
      dot = document.createElement("div");
      dot.style.cssText = `position:absolute;left:0;top:0;width:${s.toFixed(1)}px;height:${s.toFixed(1)}px;margin:${(-s / 2).toFixed(1)}px 0 0 ${(-s / 2).toFixed(1)}px;border-radius:var(--x-radius-s);z-index:7;pointer-events:none;visibility:hidden`;
      host.append(dot);
      const last = words[words.length - 1];
      if (last) {
        const r = ctx.box(last), gap = s * 0.9;
        dotEnd = { x: (ctx.rtl ? r.x - gap : r.x + r.w + gap) - hb.x, y: r.y + r.h * 0.74 - hb.y };
      } else dotEnd = { x: W / 2, y: H / 2 };
    }
    ctx.sfx(at, "whoosh.soft", 0.45);
    if (text) ctx.sfx(tWords, "tap", 0.2);
    return {
      draw(t) {
        const on = t >= at;
        panel.style.visibility = on ? "visible" : "hidden";
        if (dot) dot.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        const u = p4(ML.lin(t, at, covered));
        const off = (1 - u) * from * 100; // % of the panel
        panel.style.transform = axis === "y" ? `translate3d(0, ${off.toFixed(3)}%, 0)` : `translate3d(${off.toFixed(3)}%, 0, 0)`;
        if (labWord) labWord.style.transform = `translateY(${((1 - ML.expo(t, tLab, tLab + 0.5)) * 110).toFixed(2)}%)`;
        words.forEach((w, i) => { const a = tWords + i * 0.07; w.style.transform = `translateY(${((1 - ML.expo(t, a, a + 0.6)) * 110).toFixed(2)}%)`; });
        if (subLine) subLine.style.transform = `translateY(${((1 - ML.expo(t, tSub, tSub + 0.55)) * 110).toFixed(2)}%)`;
        if (dot) {
          // on the edge (just ahead of it, on the old ground) while it travels; then into the title as its full stop
          const s = parseFloat(dot.style.width);
          const ex = axis === "x" ? (from > 0 ? W * (1 - u) - s * 0.9 : W * u + s * 0.9) : W / 2;
          const ey = axis === "y" ? (from > 0 ? H * (1 - u) - s * 0.9 : H * u + s * 0.9) : H / 2;
          const base = { x: ML.clamp(ex, s * 1.6, W - s * 1.6), y: ML.clamp(ey, s * 1.6, H - s * 1.6) };
          const settle = ML.expo(t, covered - 0.12, tWords + words.length * 0.07 + 0.2);
          const x = base.x + (dotEnd.x - base.x) * settle, y = base.y + (dotEnd.y - base.y) * settle;
          dot.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
          const onNew = ML.lin(t, covered - 0.15, covered + 0.05);
          dot.style.background = `color-mix(in srgb, var(--x-accent) ${(onNew * 100).toFixed(1)}%, var(--x-ink))`;
        }
        void end;
      },
    };
  },
});
