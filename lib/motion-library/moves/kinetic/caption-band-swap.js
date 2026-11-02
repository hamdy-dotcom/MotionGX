// Caption band blur-swap: one short caption line in a fixed band (top or bottom of the safe area, clear of the UI),
// on the top text layer with no panel behind it. On a calm beat the line swaps: the old line goes opacity 1 → 0 and
// blur 0 → 10–12 px in 0.14 s, the new one comes in opacity 0 → 1, blur → 0 in 0.18 s. Each line holds at least
// `hold_beats` beats (4 beats = one bar = 1.6 s at 150 BPM), so a line that would come sooner joins the one on screen
// as its second line (at most two) or waits. The words are what the voice says inside the run, else the slot's own
// text in short lines. An alternative to punchlines: the scene shows only its UI text plus this band. Arabic: whole
// words, right to left.
// Source: Rieranthony/product-film-skill reference/ingredients.md (Captions) + templates/kit/move.ts swapIn (MIT);
// prompt-motion tak3sh8-since-everyone-seems-to (reference: small light sans under the board, cross-fade per sentence).
ML.define({
  id: "kinetic.caption-band-swap",
  category: "kinetic",
  name: "Caption band blur-swap",
  does: "A single short caption line sits in a fixed band over the scene and blur-swaps to the next line on a calm beat.",
  says: ["story", "step", "calm"],
  energy: 2,
  targets: ["line", "label"],
  duration: [1.6, 30],
  params: {
    band: { type: "choice", options: ["top", "bottom"], default: "bottom" },
    hold_beats: { type: "number", range: [4, 16], default: 4 },
    blur: { type: "number", range: [6, 14], default: 10, unit: "px" },
  },
  pairs: ["ui.type-into-field", "camera.push-in", "kinetic.big-type-drift"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "product-film-skill:reference/ingredients.md", license: "MIT", note: "Captions + templates/kit/move.ts blur swap; prompt-motion tak3sh8-since-everyone-seems-to as reference" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const host = ctx.scene || ctx.stage, doc = host.ownerDocument;
    const k = Math.min(f.W, f.H) / 1080;
    const BEAT = 60 / 150, minHold = Math.round(ML.clamp(p.hold_beats, 4, 16)) * BEAT;
    const maxChars = f.tall ? 30 : 42;
    // ── the lines: the voice inside the run, else the slot's text ──
    const said = (ctx.words || []).filter((w) => w.t >= at - 0.05 && w.t < end - 0.2);
    const chunk = (ws) => { const out = []; let cur = []; for (const w of ws) { const len = cur.join(" ").length; if (cur.length && len + w.length + 1 > maxChars) { out.push(cur); cur = []; } cur.push(w); if (/[.!?؟:]$/.test(w)) { out.push(cur); cur = []; } } if (cur.length) out.push(cur); return out; };
    let raw = [];
    if (said.length) {
      let cur = [];
      for (const w of said) { const len = cur.reduce((n, x) => n + x.w.length + 1, 0); if (cur.length && len + w.w.length > maxChars) { raw.push(cur); cur = []; } cur.push(w); if (/[.!?؟:]$/.test(w.w)) { raw.push(cur); cur = []; } }
      if (cur.length) raw.push(cur);
      raw = raw.map((ws) => ({ t: ws[0].t, text: ws.map((x) => x.w).join(" ") }));
    } else {
      const text = ((el && el.textContent) || "").replace(/\s+/g, " ").trim();
      if (!text) return null;
      raw = chunk(text.split(" ")).map((ws, i) => ({ t: at + i * minHold, text: ws.join(" ") }));
    }
    // each line holds at least minHold: a line arriving sooner becomes the second line of the one up, else waits
    const lines = [];
    for (const r of raw) {
      const prev = lines[lines.length - 1];
      if (prev && r.t < prev.t + minHold) {
        if (prev.rows.length < 2) { prev.rows.push(r.text); continue; }
        r.t = prev.t + minHold;
      }
      if (r.t >= end - 0.3) { if (prev && prev.rows.length < 2) prev.rows.push(r.text); continue; }
      lines.push({ t: Math.max(at, r.t), rows: [r.text] });
    }
    if (!lines.length) return null;
    lines.forEach((l, i) => i > 0 && ctx.sfx(l.t, "whoosh.soft", 0.12));
    // ── the band ──
    // the band: two rows tall, on the inner edge of the safe area (9:16's own top and bottom belong to the phone UI)
    const bandH = 30 * k * 1.35 * 2 + 8 * k;
    const y = p.band === "top" ? f.safe.y : f.safe.y + f.safe.h - bandH;
    const band = doc.createElement("div");
    Object.assign(band.style, { position: "absolute", left: f.m + "px", width: f.W - f.m * 2 + "px", top: y.toFixed(1) + "px", height: bandH.toFixed(1) + "px", zIndex: "8", pointerEvents: "none", display: "grid", justifyItems: "center", alignItems: p.band === "top" ? "start" : "end", direction: rtl ? "rtl" : "ltr" });
    const els = lines.map((l) => {
      const e = doc.createElement("div");
      Object.assign(e.style, { gridArea: "1 / 1", textAlign: "center", font: `var(--x-body-weight) ${(30 * k).toFixed(1)}px / 1.35 var(--x-body-font)`, color: "var(--x-dim)", maxWidth: "100%" });
      e.innerHTML = l.rows.map((r) => `<div>${r.replace(/[<&]/g, (c) => (c === "<" ? "&lt;" : "&amp;"))}</div>`).join("");
      band.append(e);
      return e;
    });
    host.append(band);
    const blurMax = ML.clamp(p.blur, 6, 14);
    return {
      draw(t) {
        if (el && el !== ctx.stage) el.style.opacity = t >= at - 1e-6 && t < end ? "0" : "";
        const on = t >= at - 1e-6 && t < end;
        band.style.display = on ? "grid" : "none"; // display, not visibility: its lines set themselves visible
        if (!on) return;
        els.forEach((e, i) => {
          const a = lines[i].t, b = i + 1 < lines.length ? lines[i + 1].t : end - 0.05;
          // in: 0.18 s from blur; out: 0.14 s into blur, finishing as the next arrives
          const inn = ML.out(t, a, a + 0.18), gone = ML.lin(t, b - 0.14, b);
          const v = inn * (1 - gone);
          e.style.visibility = t >= a && t < b ? "visible" : "hidden";
          e.style.opacity = v.toFixed(4);
          const bl = (1 - inn) * blurMax + gone * blurMax;
          e.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : "none";
        });
      },
    };
  },
});
