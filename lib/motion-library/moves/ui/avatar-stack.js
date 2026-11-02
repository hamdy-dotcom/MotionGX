// Avatar stack: small round avatars (grayscale at 80% by default) slide together into an overlapping cluster — each
// from 12 px toward the reading end, opacity 0, staggered 0.06 s on back.out(1.6) over 0.35 s — tucking behind the
// one before (ring in the ground colour, soft drop shadow). From a list the avatars carry the items' initials; from a
// picture they are crops of it set in the corner (shrunk, never enlarged); alone they use the look's colours.
// Source: MengTo/Skills web-design/high-contrast-skeuomorphic-clean demo (32 px ring-2 avatars, -space-x-2, MIT).
ML.define({
  id: "ui.avatar-stack",
  category: "ui",
  name: "Overlapping avatar stack",
  does: "Small grayscale avatars slide together into an overlapping cluster.",
  says: ["connection", "trust", "proof"],
  energy: 1,
  targets: ["image", "list"],
  duration: [0.5, 3],
  params: {
    count: { type: "number", range: [2, 6], default: 4 },
    overlap: { type: "number", range: [4, 14], default: 8, unit: "px" },
    grayscale: { type: "bool", default: true },
    more: { type: "text", default: "" },
  },
  pairs: ["ui.floating-ui-card", "ui.chip-row-pop"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "MengTo/Skills:web-design/high-contrast-skeuomorphic-clean", license: "MIT" },
  setup(ctx) {
    const { p, at, end, rtl, f } = ctx;
    const doc = document;
    const mk = (tag, css, text, parent) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const el = ctx.el;
    const pic = el ? (el.tagName === "IMG" ? el : el.querySelector("img")) : null; // never wipe a picture its slot holds
    const isImg = !!pic;
    const S = Math.round(ML.clamp(Math.min(f.W, f.H) * 0.06, 40, 80)); // 32 web px on our stage
    const k = S / 32;
    let holder, initials = [], fromList = 0;
    if (isImg) {
      const b = ctx.box(pic), pad = S * 0.35;
      holder = mk("div", `position:absolute;top:${(b.y + b.h - S - pad).toFixed(1)}px;${rtl ? `left:${(b.x + b.w - pad).toFixed(1)}px;translate:-100% 0` : `left:${(b.x + pad).toFixed(1)}px`};display:flex;z-index:5`, null, ctx.scene || ctx.stage);
    } else if (el) {
      initials = [...el.children].map((c) => c.textContent.trim()).filter(Boolean).map((s) => Array.from(s)[0].toUpperCase());
      if (!initials.length && el.textContent.trim()) initials = [Array.from(el.textContent.trim())[0].toUpperCase()];
      fromList = initials.length;
      el.replaceChildren();
      holder = mk("div", "display:flex", null, el);
    } else {
      const host = mk("div", "position:absolute;left:var(--pic-x);top:var(--pic-y);width:var(--pic-w);height:var(--pic-h);display:flex;align-items:center;justify-content:center;z-index:4;background:var(--x-ground)", null, ctx.scene || ctx.stage);
      holder = mk("div", "display:flex", null, host);
    }
    if (!initials.length) initials = rtl ? ["س", "م", "ن", "ع", "ل", "ه"] : ["S", "M", "N", "A", "L", "H"];
    const n = Math.round(ML.clamp(fromList ? Math.min(p.count, fromList) : p.count, fromList ? 1 : 2, 6)); // one avatar per item, no repeats
    const fills = ["var(--x-accent)", "var(--x-accent-2)", "var(--x-dim)", "var(--x-ink)", "var(--x-good)", "var(--x-panel-2)"];
    const src = isImg ? pic.currentSrc || pic.src : "";
    // real crops, not the whole picture again: zoomed in as far as its pixels allow, never past them
    const cropH = isImg ? Math.min(S * 2.6, Math.max(S, pic.naturalHeight || S)) : S, cropW = isImg ? cropH * ((pic.naturalWidth || 1) / (pic.naturalHeight || 1)) : S;
    // the 80% is the cluster's (each avatar's own would let its neighbour show through the overlap)
    const group = mk("div", `display:flex;opacity:${p.grayscale ? 0.8 : 1}`, null, holder);
    const avs = Array.from({ length: n }, (_, i) => {
      const a = mk("div", `position:relative;flex:none;width:${S}px;height:${S}px;border-radius:50%;box-sizing:border-box;border:${(2 * k).toFixed(1)}px solid var(--x-ground);box-shadow:var(--x-shadow);overflow:hidden;z-index:${n - i};display:flex;align-items:center;justify-content:center;font:var(--x-head-weight) ${(S * 0.4).toFixed(1)}px var(--x-head-font);${i ? `margin-inline-start:-${(p.overlap * k).toFixed(1)}px;` : ""}`, null, group);
      if (src) { a.style.backgroundImage = `url("${src}")`; a.style.backgroundSize = `${Math.max(cropW, S).toFixed(1)}px auto`; a.style.backgroundPosition = `${(10 + ML.rnd(i, 3) * 80).toFixed(0)}% ${(10 + ML.rnd(i, 5) * 80).toFixed(0)}%`; }
      else { a.style.background = fills[i % fills.length]; a.style.color = i % fills.length === 5 ? "var(--x-ink)" : "var(--x-accent-ink)"; a.textContent = initials[i % initials.length]; }
      return a;
    });
    let more = null;
    if (p.more) {
      more = mk("div", `flex:none;height:${S}px;padding:0 ${(S * 0.3).toFixed(1)}px;margin-inline-start:${(S * 0.2).toFixed(1)}px;display:flex;align-items:center;border-radius:${S}px;background:var(--x-panel);color:var(--x-ink);font:600 ${(S * 0.34).toFixed(1)}px var(--x-body-font);white-space:nowrap`, p.more, holder);
    }
    const sx = rtl ? -1 : 1;
    ctx.sfx(at, "pop.soft", 0.35);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        avs.forEach((a, i) => {
          const s = at + i * 0.06;
          const u = t < s ? 0 : ML.back(t, s, s + 0.35, 1.6);
          const o = ML.lin(t, s, s + 0.15) * (1 - leave);
          a.style.opacity = o.toFixed(4);
          a.style.translate = `${(sx * 12 * k * (1 - u)).toFixed(2)}px 0`;
          a.style.filter = p.grayscale ? "grayscale(1)" : "none";
        });
        if (more) { const s = at + n * 0.06; more.style.opacity = (ML.lin(t, s, s + 0.2) * (1 - leave)).toFixed(4); }
      },
    };
  },
});
