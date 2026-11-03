// Redaction block: a solid bar of the key word's colour grows over its box (scaleX 0 → 1 from the reading edge in
// 0.15 s) and the word is gone beneath it; the line around it — every sibling of the word — blurs 8 px and lifts 20 px
// away in 0.3 s, staggered. Then the block either stays, or becomes the next element: an input field (it widens and
// pales to a panel with an edge and a blinking caret) or a button (it pills, and the word comes back on it in the
// accent ink).
// Source: prompt-motion:twoclipping-wow-motion-designers-are (reference) — our own rebuild.
ML.define({
  id: "text-emphasis.redaction-block",
  category: "text-emphasis",
  name: "Key word becomes a solid block",
  does: "The coloured key word turns into a solid bar of its colour, the line around it blurs away, and the block becomes the next element.",
  says: ["focus", "transition", "change"],
  energy: 3,
  targets: ["word"],
  duration: [0.6, 1.5],
  params: {
    colour: { type: "text", default: "accent" },
    becomes: { type: "choice", options: ["field", "button", "nothing"], default: "nothing" },
  },
  pairs: ["ui.type-into-field", "text-emphasis.dim-out"],
  avoid: ["playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "snap",
  source: { from: "prompt-motion:twoclipping-wow-motion-designers-are", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, rtl } = ctx;
    if (!el) return null;
    // the colour: a look variable by name (accent, ink, good, bad, accent-2…)
    const name = String(p.colour || "accent").trim().replace(/^--x-/, "");
    const col = /^[a-z0-9-]+$/.test(name) ? `var(--x-${name}, var(--x-accent))` : "var(--x-accent)";
    const fs = parseFloat(getComputedStyle(el).fontSize) || 56, k = Math.max(0.4, Math.min(2.5, fs / 56));
    // the word in a box the block can cover exactly
    const word = document.createElement("span");
    while (el.firstChild) word.append(el.firstChild);
    Object.assign(word.style, { display: "inline-block", position: "relative", maxWidth: "100%" });
    el.append(word);
    const block = document.createElement("span");
    block.setAttribute("aria-hidden", "true");
    Object.assign(block.style, { position: "absolute", left: "50%", top: "50%", background: col, transformOrigin: rtl ? "100% 50%" : "0% 50%", pointerEvents: "none", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", whiteSpace: "nowrap" });
    word.append(block);
    const label = document.createElement("span");
    label.textContent = (el.textContent || "").trim();
    Object.assign(label.style, { color: "var(--x-accent-ink)", fontWeight: "600", fontSize: "0.8em", opacity: "0" });
    const caret = document.createElement("span");
    Object.assign(caret.style, { position: "absolute", width: Math.max(2, 3 * k).toFixed(1) + "px", height: "46%", top: "27%", background: "var(--x-ink)", opacity: "0", [rtl ? "right" : "left"]: (22 * k).toFixed(1) + "px" });
    block.append(label, caret);
    const W0 = word.offsetWidth, H0 = word.offsetHeight * 0.86;
    // the neighbours: every sibling of the word (loose text wrapped so it can move)
    const par = el.parentElement;
    const sibs = [];
    if (par) {
      for (const n of [...par.childNodes]) {
        if (n === el) continue;
        // loose text goes word by word: the line keeps its wrapping, the stagger is real, and Arabic words stay whole
        if (n.nodeType === 3 && n.textContent.trim()) {
          const frag = document.createDocumentFragment();
          for (const part of n.textContent.split(/(\s+)/)) {
            if (!part) continue;
            if (/^\s+$/.test(part)) { frag.append(part); continue; }
            const s = document.createElement("span");
            s.style.display = "inline-block"; s.textContent = part;
            frag.append(s); sibs.push(s);
          }
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !/^(SCRIPT|STYLE)$/.test(n.tagName)) sibs.push(n);
      }
    }
    const pics = sibs.map((s) => s.matches("img,video,canvas,picture") || !!s.querySelector("img,video,canvas,picture")); // pictures lift and fade, never blur
    const room = par ? par.clientWidth : W0 * 2;
    const grow = at + 0.15, gone = grow + 0.05, morph = gone + 0.3 + 0.1, settled = morph + 0.4;
    ctx.sfx(at, "snap", 0.4);
    if (p.becomes !== "nothing") ctx.sfx(morph + 0.3, p.becomes === "button" ? "pop.soft" : "tap", 0.3);
    const tw = p.becomes === "field" ? Math.min(room, Math.max(W0 * 1.6, room * 0.7)) : p.becomes === "button" ? Math.min(room, W0 * 1.15 + 48 * k) : W0;
    const th = p.becomes === "field" ? H0 * 1.25 : p.becomes === "button" ? H0 * 1.15 : H0;
    return {
      draw(t) {
        const g = ML.out(t, at, grow);
        block.style.opacity = t >= at ? "1" : "0";
        const m = p.becomes === "nothing" ? 0 : ML.ease(t, morph, settled);
        const w = W0 + (tw - W0) * m, h = H0 + (th - H0) * m;
        block.style.width = w.toFixed(1) + "px";
        block.style.height = h.toFixed(1) + "px";
        block.style.transform = `translate(-50%, -50%) scaleX(${g.toFixed(4)})`;
        block.style.transformOrigin = `${rtl ? w : 0}px 50%`;
        if (p.becomes === "field") {
          block.style.background = m > 0 ? `color-mix(in srgb, ${col} ${((1 - m) * 100).toFixed(1)}%, var(--x-panel))` : col;
          block.style.border = m > 0 ? `${Math.max(1, 2 * k * m).toFixed(1)}px solid var(--x-edge-color)` : "none";
          block.style.borderRadius = `calc(var(--x-radius) * ${(m * 0.6).toFixed(3)})`;
          block.style.boxShadow = m > 0.5 ? "var(--x-shadow)" : "none";
          caret.style.opacity = t >= settled ? String(ML.blink(t - settled, 0.9)) : "0";
        } else if (p.becomes === "button") {
          block.style.borderRadius = `${(m * h / 2).toFixed(1)}px`;
          block.style.boxShadow = m > 0.5 ? "var(--x-shadow)" : "none";
          label.style.opacity = ML.lin(t, settled - 0.15, settled + 0.1).toFixed(4);
        }
        // the word itself hides once covered
        for (const c of word.childNodes) if (c !== block && c.style) c.style.visibility = t >= grow ? "hidden" : "visible";
        word.style.color = t >= grow ? "transparent" : "";
        sibs.forEach((s, i) => {
          const u = ML.ease(t, gone + i * 0.06, gone + i * 0.06 + 0.3);
          s.style.filter = u > 0.01 && !pics[i] ? `blur(${(8 * u).toFixed(2)}px)` : "none";
          s.style.translate = u > 0 ? `0 ${(-20 * k * u).toFixed(2)}px` : "none";
          s.style.opacity = (1 - u).toFixed(4);
        });
      },
    };
  },
});
