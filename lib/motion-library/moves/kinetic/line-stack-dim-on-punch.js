// Lines stack, then dim when the punch lands: a statement builds line by line from the top-left (top-right in RTL) in
// a neutral grotesk (~5.5 % of the frame height, the look's ink, line-height 1.05); each line enters on its spoken
// phrase by fade + y 14 px → 0 (0.35 s, power3.out) and the block drifts up 6–10 px as lines are added. The punch — a
// giant figure (~16 % of the height, tracking −0.04em) or a word — enters below by fade + y 20 px (0.4 s, expo.out);
// on that frame the earlier lines tween toward grey (`dim` of the way from ink to ground, 0.3 s), and 0.3 s later a tiny
// grey footnote (the source / fact line) fades in under the figure. The layer owns the frame on the look's ground.
// The punch: punch_text, else the scene's number (punch "number"), else the statement's last word.
// Source: prompt-motion:davidmarcus-opus-5-5-got-quite (reference only — our own rebuild).
ML.define({
  id: "kinetic.line-stack-dim-on-punch",
  category: "kinetic",
  name: "Lines stack, then dim when the punch lands",
  does: "A statement builds line by line top-left; when a huge figure lands below, the earlier lines dim to grey so the punch owns the frame.",
  says: ["proof", "focus", "story"],
  energy: 2,
  targets: ["line", "number", "headline"],
  duration: [2, 6],
  params: {
    punch: { type: "choice", options: ["number", "word"], default: "number" },
    dim: { type: "number", range: [0.3, 0.7], default: 0.55 },
    words_per_line: { type: "number", range: [1, 4], default: 2 },
    punch_text: { type: "text", default: "" },
    footnote: { type: "text", default: "" },
  },
  pairs: ["data.counter-roll", "transition.hard-cut"],
  avoid: ["playful", "urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "land.light",
  source: { from: "prompt-motion:davidmarcus-opus-5-5-got-quite", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    if (!el) return null;
    const host = ctx.scene || ctx.stage, doc = host.ownerDocument;
    let text = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return null;
    // the punch
    let punch = (p.punch_text || "").trim();
    if (!punch && p.punch === "number") {
      const own = text.match(/[\d][\d.,]*\s?[%+]?/);
      const slot = host.querySelector('[data-slot="number"]');
      const numeric = [...host.querySelectorAll("*")].find((e) => e !== el && !e.children.length && /^\s*[$€£¥]?\s?[\d٠-٩][\d٠-٩.,،%+×]*\s*$/.test(e.textContent || ""));
      if (own) { punch = own[0].trim(); text = text.replace(own[0], "").replace(/\s+/g, " ").trim(); }
      else punch = ((slot && slot.textContent) || (numeric && numeric.textContent) || "").trim();
    }
    let words = text.split(" ").filter(Boolean);
    if (!punch) { punch = words.pop() || text; }
    if (!words.length) words = [""];
    const per = Math.max(1, Math.round(p.words_per_line));
    const lines = [];
    for (let i = 0; i < words.length; i += per) lines.push(words.slice(i, i + per).join(" "));
    const isNum = /\d/.test(punch);
    // the layer owns the frame
    const layer = doc.createElement("div");
    Object.assign(layer.style, { position: "absolute", inset: "0", zIndex: "6", background: "var(--x-ground)", backgroundImage: "var(--x-ground-image)", pointerEvents: "none", visibility: "hidden", direction: rtl ? "rtl" : "ltr" });
    const col = doc.createElement("div");
    Object.assign(col.style, { position: "absolute", top: f.safe.y + "px", [rtl ? "right" : "left"]: f.m + "px", width: f.W - f.m * 2 + "px", textAlign: "start" });
    layer.append(col);
    const lineSize = f.H * 0.055 * (f.wide ? 1.15 : 1);
    const lineEls = lines.map((l) => {
      const d = doc.createElement("div");
      d.textContent = l;
      Object.assign(d.style, { font: `500 ${lineSize.toFixed(1)}px / 1.05 var(--x-body-font)`, letterSpacing: rtl ? "0" : "-0.02em", color: "var(--x-ink)", whiteSpace: "nowrap", width: "max-content" });
      col.append(d);
      return d;
    });
    const big = doc.createElement("div");
    big.textContent = punch;
    const bigSize = f.H * 0.16 * (f.wide ? 1.25 : 1);
    Object.assign(big.style, { font: `500 ${bigSize.toFixed(1)}px / 1 var(--x-head-font)`, letterSpacing: rtl ? "0" : "-0.04em", color: "var(--x-ink)", whiteSpace: "nowrap", width: "max-content", marginTop: (lineSize * 1.1).toFixed(1) + "px", fontVariantNumeric: "tabular-nums", direction: isNum ? "ltr" : undefined });
    col.append(big);
    const sub = host.querySelector(".ml-sub");
    const noteText = (p.footnote || (sub && sub !== el && !el.contains(sub) ? sub.textContent : "") || "").trim();
    const note = doc.createElement("div");
    note.textContent = noteText;
    Object.assign(note.style, { font: `400 ${Math.max(14, lineSize * 0.26).toFixed(1)}px / 1.3 var(--x-body-font)`, color: "var(--x-dim)", marginTop: (lineSize * 0.3).toFixed(1) + "px", display: noteText ? "block" : "none" });
    col.append(note);
    host.append(layer);
    // fit: every line and the figure inside the width; the column inside the safe height
    const room = f.W - f.m * 2;
    layer.style.visibility = "visible";
    const wl = Math.max(...lineEls.map((d) => d.offsetWidth)), wb = big.offsetWidth;
    if (wl > room) lineEls.forEach((d) => (d.style.fontSize = ((lineSize * room) / wl).toFixed(1) + "px"));
    if (wb > room) big.style.fontSize = ((bigSize * room) / wb).toFixed(1) + "px";
    if (col.offsetHeight > f.safe.h) { const s = f.safe.h / col.offsetHeight; lineEls.forEach((d) => (d.style.fontSize = (parseFloat(d.style.fontSize) * s).toFixed(1) + "px")); big.style.fontSize = (parseFloat(big.style.fontSize) * s).toFixed(1) + "px"; }
    layer.style.visibility = "hidden";
    // times: each line on its first spoken word, else a steady build; the punch after the last line
    const step = Math.min(0.55, Math.max(0.25, (end - at - 1.6) / (lines.length + 1)));
    const lt = lines.map((l, i) => Math.max(at + i * 0.2, ctx.word(l.split(" ")[0], at + i * step)));
    for (let i = 1; i < lt.length; i++) lt[i] = Math.max(lt[i], lt[i - 1] + 0.2);
    const tp = Math.min(end - 0.9, Math.max(lt[lt.length - 1] + 0.45, ctx.word(punch, lt[lt.length - 1] + step + 0.2)));
    const tn = tp + 0.3;
    lt.forEach((x) => ctx.sfx(x, "tap", 0.12));
    ctx.sfx(tp, "land", 0.4);
    const drift = 8 * Math.min(f.W, f.H) / 1080;
    const ink2dim = (u) => `color-mix(in srgb, var(--x-ground) ${(p.dim * u * 100).toFixed(1)}%, var(--x-ink))`;
    return {
      draw(t) {
        const on = t >= at - 1e-6 && t < end;
        layer.style.visibility = on ? "visible" : "hidden";
        el.style.opacity = on ? "0" : "";
        if (!on) return;
        const gone = ML.ease(t, end - 0.3, end - 0.05);
        col.style.opacity = (1 - gone).toFixed(4);
        let shown = 0;
        const dimU = ML.out(t, tp, tp + 0.3);
        lineEls.forEach((d, i) => {
          const u = 1 - Math.pow(1 - ML.lin(t, lt[i], lt[i] + 0.35), 4);
          if (t >= lt[i]) shown += ML.out(t, lt[i], lt[i] + 0.4);
          d.style.opacity = u.toFixed(4);
          d.style.translate = `0 ${((1 - u) * 14).toFixed(2)}px`;
          d.style.color = dimU > 0 ? ink2dim(dimU) : "var(--x-ink)";
        });
        // the block drifts up a little with each added line
        col.style.translate = `0 ${(-Math.max(0, shown - 1) * drift).toFixed(2)}px`;
        const b = ML.expo(t, tp, tp + 0.4);
        big.style.opacity = (t >= tp ? Math.min(1, b * 1.4) : 0).toFixed(4);
        big.style.translate = `0 ${((1 - b) * 20).toFixed(2)}px`;
        note.style.opacity = ML.ease(t, tn, tn + 0.3).toFixed(4);
      },
    };
  },
});
