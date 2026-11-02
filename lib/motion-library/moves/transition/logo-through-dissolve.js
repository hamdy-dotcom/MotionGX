// Logo through dissolve: at t0 the question (the headline block and the steps around it) fades out over 0.4 s, its
// text blurring 0 -> 4 px (pictures only fade, never blur); `overlap` seconds later the brand mark fades in on top,
// centred where the headline was (opacity 0 -> 1, scale 0.96 -> 1, 0.4 s ease-out), so both overlap for a few frames.
// The wordmark beside it fades in whole (or letter by letter, 0.05 s apart, for a Latin wordmark; Arabic stays whole)
// while its colour settles from 40% grey to its own ink over 0.4 s; an optional lighter second word lands last. Then
// it holds on the lockup. The logo is drawn at its lockup size (an SVG re-rendered, a picture never past its pixels).
// Source: prompt-motion ai-baymax-tried-opus-5-5-for (reference only: our own rebuild).
ML.define({
  id: "transition.logo-through-dissolve",
  category: "transition",
  name: "Logo through dissolve",
  does: "As the question fades out, the brand mark fades in on top at the same spot so both overlap for a few frames, then the wordmark settles from grey to ink.",
  says: ["brand", "reveal", "relief"],
  energy: 2,
  targets: ["logo"],
  duration: [0.8, 1.5],
  params: {
    overlap: { type: "number", range: [0.05, 0.3], default: 0.1, unit: "s" },
    wordmark: { type: "choice", options: ["whole", "letter-stagger"], default: "whole" },
    second: { type: "text", default: "" },
    size: { type: "number", range: [0.3, 0.8], default: 0.55 },
  },
  pairs: ["text-in.punchline", "background.glow-drift"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "prompt-motion:ai-baymax-tried-opus-5-5-for", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, stage, f } = ctx;
    if (!el) return null;
    const W = f.W, H = f.H;
    const host = ctx.scene || stage;
    const hb = host === stage ? { x: 0, y: 0 } : ctx.box(host);
    const head = host.querySelector(".ml-title");
    const headBlock = head && head.parentElement && head.parentElement.classList.contains("ml-head") ? head.parentElement : head;
    // where the lockup lands: the headline's centre (else the frame's)
    const hbx = head ? ctx.box(head) : { x: W * 0.2, y: H * 0.4, w: W * 0.6, h: H * 0.1 };
    const cx = hbx.x + hbx.w / 2, cy = hbx.y + hbx.h / 2;
    const b0 = ctx.box(el);
    const aspect = b0.h / Math.max(1, b0.w);
    let tw = Math.min(f.safe.w, Math.max(hbx.w, W * 0.5)) * ML.clamp(p.size, 0.3, 0.8);
    if (el.tagName === "IMG" && el.naturalWidth) tw = Math.min(tw, el.naturalWidth); // never past its pixels
    const th = tw * aspect;
    // the logo leaves its place for a holder of its own above the scene
    const holder = document.createElement("div");
    holder.style.cssText = `position:absolute;left:${(cx - tw / 2 - hb.x).toFixed(1)}px;top:${(cy - th / 2 - hb.y).toFixed(1)}px;width:${tw.toFixed(1)}px;height:${th.toFixed(1)}px;z-index:7;pointer-events:none;transform-origin:50% 50%;display:flex;align-items:center;justify-content:center`;
    host.append(holder);
    holder.append(el);
    el.style.width = tw.toFixed(1) + "px"; el.style.height = th.toFixed(1) + "px"; el.style.maxWidth = "none";
    // mark and wordmark: in an SVG, the text is the wordmark and the shapes the mark; otherwise the whole is the mark
    const svg = el.tagName.toLowerCase() === "svg" ? el : el.querySelector("svg");
    let texts = svg ? [...svg.querySelectorAll("text")] : [];
    let marks = svg ? [...svg.children].filter((c) => !texts.includes(c) && !["defs", "title", "style"].includes(c.tagName.toLowerCase())) : [el];
    if (!texts.length) { marks = [el]; texts = []; }
    const NS = "http://www.w3.org/2000/svg";
    const letters = [];
    const inkOf = new Map();
    for (const tx of texts) {
      inkOf.set(tx, getComputedStyle(tx).fill);
      const s = tx.textContent;
      if (p.wordmark === "letter-stagger" && !ML.ARABIC.test(s)) {
        tx.textContent = "";
        for (const ch of Array.from(s)) { const sp = document.createElementNS(NS, "tspan"); sp.textContent = ch; tx.append(sp); letters.push(sp); }
      } else letters.push(tx);
    }
    // the optional lighter second word, after the wordmark
    const second = String(p.second || "").trim();
    let secondEl = null;
    if (second && texts.length) {
      secondEl = document.createElementNS(NS, "tspan");
      secondEl.textContent = (ML.ARABIC.test(second) ? " " : " ") + second;
      secondEl.setAttribute("font-weight", "300");
      texts[texts.length - 1].append(secondEl);
      // widen the drawing so the second word fits
      const vb = svg.viewBox && svg.viewBox.baseVal;
      if (vb && vb.width) {
        const bb = texts[texts.length - 1].getBBox(), need = bb.x + bb.width + 4;
        if (need > vb.width) { const k = need / vb.width; svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${need} ${vb.height}`); el.style.width = (tw * k).toFixed(1) + "px"; holder.style.width = (tw * k).toFixed(1) + "px"; holder.style.left = (cx - (tw * k) / 2 - hb.x).toFixed(1) + "px"; }
      }
    }
    // everything else in the scene fades (text blurs, pictures only fade)
    const outs = [...host.children].filter((c) => c !== holder && c.tagName !== "svg" && c !== el);
    const t0 = at, markA = at + p.overlap, markB = markA + 0.4;
    const wmA = markA + 0.1;
    const lt = letters.map((_, i) => wmA + (letters.length > texts.length ? i * 0.05 : 0));
    const wmEnd = (lt[lt.length - 1] ?? wmA) + 0.4;
    const secA = wmEnd - 0.1;
    const easeOut = (x) => 1 - Math.pow(1 - x, 2);
    ctx.sfx(markA, "swell", 0.35);
    void headBlock;
    return {
      draw(t) {
        const fo = ML.lin(t, t0, t0 + 0.4);
        for (const o of outs) {
          o.style.opacity = (1 - fo).toFixed(4);
          const textOnly = o.classList.contains("ml-head");
          o.style.filter = textOnly && fo > 0 ? `blur(${(fo * 4).toFixed(2)}px)` : "none";
        }
        const m = easeOut(ML.lin(t, markA, markB));
        holder.style.visibility = t >= markA ? "visible" : "hidden";
        for (const mk of marks) { mk.style.opacity = m.toFixed(4); }
        holder.style.transform = `scale(${(0.96 + 0.04 * m).toFixed(4)})`;
        letters.forEach((l, i) => {
          const u = easeOut(ML.lin(t, lt[i], lt[i] + 0.4));
          l.style.opacity = u.toFixed(4);
        });
        for (const tx of texts) {
          const g = ML.ease(t, wmA, wmEnd);
          tx.style.fill = g >= 1 ? "" : `color-mix(in srgb, ${inkOf.get(tx)} ${(40 + 60 * g).toFixed(1)}%, var(--x-dim))`;
        }
        if (secondEl) secondEl.style.opacity = easeOut(ML.lin(t, secA, secA + 0.4)).toFixed(4);
      },
    };
  },
});
