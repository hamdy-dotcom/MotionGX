// Text replaced: the selected copy swaps to new copy in a single beat — a thin selection box with corner handles
// (the editor's own selection) marks the text just before, then on the beat the copy is set to the new words and comes
// up from 20% opacity to full in ~0.3 s, with one keypress. Both copies keep their own layout (the old one is hidden,
// never removed), so the frame is a pure function of t. With no new copy given, it takes the words the voice says over
// the move that are not already on screen.
// Source: MotionGX's own studio engine, lib/studio-engine/assets/scenes.js S.editroom (tl.set innerHTML at t, fromTo
// opacity 0.2 → 1 over 0.3 s, keypress SFX).
ML.define({
  id: "ui.text-replace",
  category: "ui",
  name: "Text replaced",
  does: "The selected text swaps to new copy with a quick fade.",
  says: ["change"],
  energy: 2,
  targets: ["headline", "line", "word"],
  duration: [0.2, 0.5],
  params: {
    fade: { type: "number", range: [0.2, 0.4], default: 0.3, unit: "s" },
    from: { type: "number", range: [0, 0.6], default: 0.2 },
    text: { type: "text", default: "" },
    select: { type: "bool", default: true },
    lead: { type: "number", range: [0, 0.6], default: 0.35, unit: "s" },
  },
  pairs: ["ui.selection-handles", "ui.cursor-glide-click", "ui.live-edit-apply"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key",
  source: { from: "own:lib/studio-engine/assets/scenes.js#S.editroom", license: "own" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const doc = document;
    const mk = (tag, css, parent) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (parent) parent.append(e); return e; };
    // the new copy: given, or what the voice says over the move that the slot does not already say
    const have = new Set((el.textContent || "").split(/\s+/).map(ML.plain).filter(Boolean));
    const n = Math.max(2, (el.textContent || "").trim().split(/\s+/).length + 1);
    const heard = (ctx.words || []).filter((w) => w.t >= ctx.from && w.t <= Math.max(end, at + 4) && !have.has(ML.plain(w.w))).map((w) => w.w);
    const next = (p.text || heard.slice(0, n).join(" ")).trim();
    if (!next) return null;
    // the slot keeps its box; inside it one inline-block holds both copies (and the selection, hugging the text)
    const wrap = mk("span", "position:relative;display:inline-block;max-width:100%;vertical-align:top");
    const oldE = mk("span", "display:inline", wrap);
    while (el.firstChild) oldE.append(el.firstChild);
    const newE = mk("span", "display:none", wrap);
    newE.textContent = next;
    el.append(wrap);
    let sel = null, hs = [];
    if (p.select) {
      sel = mk("span", "position:absolute;inset:-0.06em -0.14em;border:var(--x-ring-w) solid var(--x-ring);border-radius:calc(var(--x-ring-w) * 3);background:color-mix(in srgb, var(--x-accent) 12%, transparent);pointer-events:none;opacity:0", wrap);
      hs = [["top", "left"], ["bottom", "right"], ["top", "right"], ["bottom", "left"]].map(([v, h]) => mk("i", `position:absolute;${v}:-0.09em;${h}:-0.09em;width:0.14em;height:0.14em;min-width:8px;min-height:8px;translate:${h === "left" ? "-25%" : "25%"} ${v === "top" ? "-25%" : "25%"};background:var(--x-panel);border:var(--x-ring-w) solid var(--x-ring);box-sizing:border-box`, sel));
    }
    const swap = at, selIn = Math.max(ctx.from, swap - p.lead), selOut = swap + 0.6;
    if (p.select) ctx.sfx(selIn, "click", 0.2);
    ctx.sfx(swap, "key", 0.4);
    return {
      draw(t) {
        const on = t >= swap;
        oldE.style.display = on ? "none" : "inline";
        newE.style.display = on ? "inline" : "none";
        // tl.fromTo(opacity 0.2 → 1, 0.3 s) — eased out like GSAP's default power1.out
        const u = ML.lin(t, swap, swap + p.fade);
        wrap.style.opacity = on ? (p.from + (1 - p.from) * (1 - (1 - u) * (1 - u))).toFixed(4) : "1";
        if (sel) {
          const s = ML.ease(t, selIn, selIn + 0.15) * (1 - ML.ease(t, selOut, selOut + 0.15));
          sel.style.opacity = s.toFixed(4);
          hs.forEach((h) => (h.style.scale = (0.4 + 0.6 * ML.back(t, selIn, selIn + 0.25, 2)).toFixed(4)));
        }
      },
    };
  },
});
