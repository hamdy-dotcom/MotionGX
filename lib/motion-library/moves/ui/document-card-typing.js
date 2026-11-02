// Document card with typed notes: a white form card (small radius, soft shadow) fades in from a 6 px blur over 0.4 s;
// a tiny mono meta row ("WO-24011 · K. Byrne · Aug 28"), a spaced label ("WHAT THE TECHNICIAN WROTE"), then the note
// types in mono at ~25 chars/s behind a narrow accent block caret (solid while typing, blinking after), set against a
// thin rule on the reading side. The card's height is measured with the whole note first, so it never grows as it types.
// Source: prompt-motion visheshbaghell "opus 5.5 is cooking" (reference only — our own rebuild).
ML.define({
  id: "ui.document-card-typing",
  category: "ui",
  name: "Document card with typed notes",
  does: "A white form card fades in with a header row and a typed note appearing in mono with a blue block caret.",
  says: ["story", "proof", "step"],
  energy: 2,
  targets: ["card", "screen"],
  duration: [1.5, 4],
  params: {
    chars_per_s: { type: "number", range: [15, 40], default: 25 },
    caret_colour: { type: "text", default: "var(--x-accent)" },
    label: { type: "text", default: "WHAT THE TECHNICIAN WROTE" },
    meta: { type: "text", default: "WO-24011 · K. Byrne · Aug 28" },
    note: { type: "text" },
    width: { type: "number", range: [0.5, 1], default: 0.86 },
  },
  pairs: ["ui.cursor-glide-click", "text-emphasis.accent-word"],
  avoid: ["energy", "celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key",
  source: { from: "prompt-motion:visheshbaghell-opus-5-5-is-cooking", license: "reference", note: "our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const own = !ctx.el || ctx.el === ctx.stage;
    const host = own ? ctx.scene || ctx.stage : ctx.el;
    if (!own && getComputedStyle(host).position === "static") host.style.position = "relative";
    const R = own ? f.pic : { x: 0, y: 0, w: host.clientWidth, h: host.clientHeight };
    const DEF_LABEL = "WHAT THE TECHNICIAN WROTE", DEF_META = "WO-24011 · K. Byrne · Aug 28";
    const label = rtl && p.label === DEF_LABEL ? "ما كتبه الفنّي" : p.label || DEF_LABEL;
    const meta = rtl && p.meta === DEF_META ? "WO-24011 · ك. برن · ٢٨ أغسطس" : p.meta || DEF_META;
    const note = p.note || (rtl ? "الضاغط بيفصل كل عشر دقايق. غيّرت الفلتر وراجعت الضغط، لسه محتاج قطعة غيار." : "Compressor trips every ten minutes. Swapped the filter and checked pressure; still needs a replacement relay.");

    // the card, sized to its region (360 × 130 reference at ~2.4×)
    const w = Math.min(R.w * p.width, 900 * k);
    // Arabic has no mono face: its notes use the look's body face (letters stay joined, never stretched)
    const mono = rtl ? "var(--x-body-font)" : "var(--x-mono-font)", labFont = rtl ? "var(--x-body-font)" : "var(--x-label-font)";
    const card = mk("div", `position:absolute;left:${(R.x + (R.w - w) / 2).toFixed(1)}px;top:0;width:${w.toFixed(1)}px;box-sizing:border-box;padding:${(30 * k).toFixed(1)}px ${(36 * k).toFixed(1)}px ${(34 * k).toFixed(1)}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * 0.22);box-shadow:var(--x-shadow);display:flex;flex-direction:column;gap:${(14 * k).toFixed(1)}px;z-index:6;pointer-events:none;`, host);
    const head = mk("div", `display:flex;align-items:center;justify-content:space-between;gap:${(16 * k).toFixed(1)}px;font:500 ${(20 * k).toFixed(1)}px ${mono};color:var(--x-dim);`, card);
    mk("span", "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;", head, meta);
    const dots = mk("span", `display:flex;gap:${(6 * k).toFixed(1)}px;flex:none;`, head);
    for (let i = 0; i < 3; i++) mk("span", `width:${(8 * k).toFixed(1)}px;height:${(8 * k).toFixed(1)}px;border-radius:50%;background:var(--x-line);`, dots);
    mk("div", `height:${Math.max(1, k).toFixed(1)}px;background:var(--x-line);`, card);
    mk("div", `font:var(--x-label-weight) ${(18 * k).toFixed(1)}px ${labFont};letter-spacing:${rtl ? "0" : "var(--x-label-track)"};text-transform:var(--x-label-case);color:var(--x-dim);`, card, label);
    const body = mk("div", `position:relative;font:500 ${(28 * k).toFixed(1)}px/1.55 ${mono};color:var(--x-ink);border-inline-start:${Math.max(1, 2 * k).toFixed(1)}px solid var(--x-line);padding-inline-start:${(20 * k).toFixed(1)}px;white-space:pre-wrap;word-break:break-word;`, card);
    // measure the whole note, then fix the body's height
    body.textContent = note;
    body.style.minHeight = body.offsetHeight + "px";
    body.textContent = "";
    const typed = mk("span", "", body), caret = mk("span", `display:inline-block;width:${Math.max(3, 4 * k).toFixed(1)}px;height:1.1em;vertical-align:-0.2em;margin-inline-start:${(2 * k).toFixed(1)}px;background:${p.caret_colour || "var(--x-accent)"};`, body);
    const ch = card.offsetHeight;
    card.style.top = (R.y + Math.max(0, (R.h - ch) / 2)).toFixed(1) + "px";

    // timing: card in over 0.4 s, typing from +0.45 at chars_per_s (squeezed if the scene is short)
    const chars = Array.from(note).length;
    const t0 = at + 0.45, room = Math.max(0.6, end - 0.5 - t0), dur = Math.min(chars / p.chars_per_s, room), t1 = t0 + dur;
    for (let s = t0; s < t1; s += 0.45) ctx.sfx(s, "key", 0.22);
    ctx.sfx(t0, "card", 0.18);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.22);
        const u = ML.out(t, at, at + 0.4);
        card.style.opacity = (t < at ? 0 : u * (1 - leave)).toFixed(4);
        const bl = (1 - u) * 6 * k + leave * 6 * k;
        card.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : "none";
        card.style.translate = `0 ${((1 - u) * 14 * k).toFixed(2)}px`;
        typed.textContent = ML.typed(note, t, t0, t1);
        caret.style.opacity = t < t0 - 0.1 ? "0" : t < t1 ? "1" : String(ML.blink(t - t1, 1));
      },
    };
  },
});
