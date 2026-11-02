// Relay line swap on one baseline: the previous line and the new one share a baseline. A soft gradient mask sweeps the
// outgoing line away in the reading direction (its first letters go transparent first) while the incoming line writes
// on behind the same kind of soft front, starting `overlap` seconds later — so mid-way the frame shows the new line's
// start and the old line's tail, a relay. Both on a sine in-out. The previous line is `previous`; without one, the
// target's nearest text sibling lends its text: that sibling then stays out of sight until the relay is over, so the
// same words are never on the frame twice. The outgoing line is shrunk to fit if it must, and always sits on the
// incoming line's baseline.
// Source: prompt-motion ismailfahmi "bikin showreel 15 detik" (reference only — our own rebuild).
ML.define({
  id: "text-in.relay-line-swap",
  category: "text-in",
  name: "Relay line swap on one baseline",
  does: "The old line fades away in the reading direction while the new one is already writing in behind it on the same baseline.",
  says: ["flow", "story", "change"],
  energy: 2,
  targets: ["line"],
  duration: [0.8, 2],
  params: {
    previous: { type: "text", default: "" },
    overlap: { type: "number", range: [0.1, 0.3], default: 0.2, unit: "s" },
    sweep: { type: "number", range: [0.4, 1.2], default: 0.7, unit: "s" },
    direction: { type: "choice", options: ["auto", "ltr", "rtl"], default: "auto" },
  },
  pairs: ["text-in.wipe-on", "text-in.lower-third"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:ismailfahmi-bikin-showreel-15-detik", license: "reference", note: "our own rebuild (gradient masks on one baseline)" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    let prev = (p.previous || "").trim(), sib = null;
    if (!prev && el.parentElement) {
      sib = [el.previousElementSibling, el.nextElementSibling, ...el.parentElement.children].find((s) => s && s !== el && (s.textContent || "").trim());
      prev = sib ? sib.textContent.trim() : "";
      if (!prev) sib = null;
    }
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    const inc = document.createElement("div");
    inc.append(...el.childNodes); el.append(inc);
    const out = document.createElement("div");
    Object.assign(out.style, { position: "absolute", left: "0", right: "0", top: "0", whiteSpace: "nowrap", pointerEvents: "none" });
    out.textContent = prev;
    el.append(out);
    // keep the outgoing line inside the target's width (shrink, never wrap)
    const ew = el.clientWidth || 1;
    if (prev && out.scrollWidth > ew) out.style.fontSize = ((parseFloat(getComputedStyle(out).fontSize) * ew) / out.scrollWidth).toFixed(2) + "px";
    // text extents inside each layer (px), so the soft front sweeps over the letters, not empty margin
    const sc = el.getBoundingClientRect().width / (el.offsetWidth || 1) || 1; // the stage may be scaled on the page
    // one baseline, even when the outgoing line was shrunk: a zero-size inline box sits on its line's baseline
    const baseline = (n) => { const q = document.createElement("span"); q.style.cssText = "display:inline-block;width:0;height:0"; n.prepend(q); const y = q.getBoundingClientRect().bottom; q.remove(); return y; };
    if (prev) out.style.top = ((baseline(inc) - baseline(out)) / sc).toFixed(2) + "px";
    const ext = (n) => { const r = document.createRange(); r.selectNodeContents(n); const a = r.getBoundingClientRect(), b = n.getBoundingClientRect(); return a.width ? [(a.left - b.left) / sc, (a.right - b.left) / sc] : [0, b.width / sc]; };
    const eo = ext(out), ei = ext(inc);
    const back = p.direction === "auto" ? rtl : p.direction === "rtl";
    const ang = back ? "270deg" : "90deg";
    const sine = (t, a, b) => -(Math.cos(Math.PI * ML.lin(t, a, b)) - 1) / 2;
    // front position (px from the gradient's start side) for progress u over a layer's text extent
    const front = (e, w, u, soft) => { const s = back ? w - e[1] : e[0], len = e[1] - e[0]; return s - soft + (len + soft * 2) * u; };
    const mask = (n, g) => { n.style.maskImage = g; n.style.webkitMaskImage = g; };
    const T2 = at + p.overlap;
    if (prev) ctx.sfx(at, "whoosh.soft", 0.18);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        el.style.opacity = (1 - leave).toFixed(4);
        if (sib) sib.style.opacity = ML.ease(t, at + p.sweep, at + p.sweep + 0.25).toFixed(4);
        const wo = out.offsetWidth || 1, wi = inc.offsetWidth || 1;
        const so = (eo[1] - eo[0]) * 0.18, si = (ei[1] - ei[0]) * 0.18;
        const uo = sine(t, at, at + p.sweep), ui = sine(t, T2, T2 + p.sweep);
        if (!prev || uo >= 1) out.style.visibility = "hidden";
        else {
          out.style.visibility = "visible";
          const x = front(eo, wo, uo, so);
          mask(out, uo <= 0 ? "none" : `linear-gradient(${ang}, transparent ${x.toFixed(1)}px, #000 ${(x + so).toFixed(1)}px)`);
        }
        if (ui >= 1) { mask(inc, "none"); inc.style.visibility = "visible"; }
        else if (t < T2) inc.style.visibility = "hidden";
        else {
          inc.style.visibility = "visible";
          const x = front(ei, wi, ui, si);
          mask(inc, `linear-gradient(${ang}, #000 ${x.toFixed(1)}px, transparent ${(x + si).toFixed(1)}px)`);
        }
      },
    };
  },
});
