// Strike & replace: one word of the target (`word`, else the last word; the whole target when it is one word) is
// struck — an ink line (2 px at a 44 px word, it scales) draws across it in 0.22 s power2.inOut (or text-decoration line-through) while it drops to
// 35 % — then `gap` seconds later it is replaced. "fade" sets the new text in place at full opacity in `new-colour`
// with no decoration (studio S.livecheck). "collapse-rise" / "collapse-type": the old word squashes (scaleY 1 → 0)
// and fades in 0.15 s while its slot's width eases from the old word's width to the new one's over 0.3 s power3.inOut,
// so the neighbours close the gap and the line reflows smoothly (a FLIP done as a pure function of t); the new word
// then rises in (0.25 s) or types in, in its colour. "delete" collapses the word and its space with no replacement
// (e.g. "not"). "compare" keeps every listed word (`word` as "a | b | c", else all of them) struck in the alert colour
// with a small × at its corner, one after another, and replaces nothing. The new text is `with`; without it a number becomes ~80 % of itself, any other word is re-set as
// itself in the new colour. Lands on the struck word when the voice says it.
// Source: MotionGX lib/studio-engine/assets/scenes.js (S.livecheck: opacity .35 + line-through → set text, colour;
// S.compare) + prompt-motion:theviableedge-getting-in-on-the (reference) — our own code.
ML.define({
  id: "text-emphasis.strike-replace",
  category: "text-emphasis",
  name: "Strike a word and replace it in place",
  does: "A word is struck through and dimmed, then collapses away and a corrected word takes its place in a new colour.",
  says: ["change", "before-after", "precision", "focus"],
  energy: 3,
  targets: ["word", "number", "label", "line"],
  duration: [1, 3],
  params: {
    replace: { type: "choice", options: ["fade", "collapse-rise", "collapse-type", "delete", "compare"], default: "collapse-rise" },
    gap: { type: "number", range: [0.3, 0.6], default: 0.45, unit: "s" },
    "new-colour": { type: "text", default: "accent" },
    strike: { type: "choice", options: ["line", "decoration"], default: "line" },
    word: { type: "text", default: "" },
    with: { type: "text", default: "" },
  },
  pairs: ["text-emphasis.strike-through", "text-emphasis.accent-word"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "snap",
  source: { from: "own:lib/studio-engine/assets/scenes.js", license: "own", note: "S.livecheck / S.compare; collapse from prompt-motion:theviableedge-getting-in-on-the (reference)" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const COL = { accent: "var(--x-accent)", "accent-2": "var(--x-accent-2)", brand: "var(--x-accent)", gold: "var(--x-accent-2)", alert: "var(--x-bad)", bad: "var(--x-bad)", red: "var(--x-bad)", good: "var(--x-good)", green: "var(--x-good)", ink: "var(--x-ink)", dim: "var(--x-dim)" };
    const raw = String(p["new-colour"] || "accent").trim();
    const colour = COL[raw.toLowerCase()] || (/^var\(--x-[a-z0-9-]+\)$/.test(raw) ? raw : "var(--x-accent)");
    const words = ML.split(el, "words");
    if (!words.length) return null;
    if (p.replace === "compare") {
      const wanted = String(p.word || "").split("|").map((x) => ML.plain(x.trim())).filter(Boolean);
      const hit = words.filter((w) => wanted.includes(ML.plain(w.textContent)));
      const fsc = parseFloat(getComputedStyle(el).fontSize) || 56, lhc = Math.max(2, fsc * 0.045);
      const marks = (hit.length ? hit : words).map((w, i) => {
        const a = Math.min(at + i * 0.18, end - 0.3);
        w.style.position = "relative";
        const face = document.createElement("span");
        face.textContent = w.textContent;
        face.style.display = "inline-block";
        w.textContent = "";
        const ln = document.createElement("span");
        Object.assign(ln.style, { position: "absolute", left: "-4%", width: "108%", top: `calc(56% - ${(lhc / 2).toFixed(1)}px)`, height: lhc.toFixed(1) + "px", borderRadius: (lhc / 2).toFixed(1) + "px", background: "var(--x-bad)", transformOrigin: rtl ? "100% 50%" : "0% 50%", pointerEvents: "none" });
        const x = document.createElement("span");
        x.textContent = "×";
        Object.assign(x.style, { position: "absolute", top: "-0.1em", insetInlineEnd: "-0.3em", fontSize: "0.5em", lineHeight: "1", fontWeight: "800", color: "var(--x-bad)", pointerEvents: "none" });
        w.append(face, ln, x);
        ctx.sfx(a, "snap", 0.3);
        return { face, ln, x, a };
      });
      return {
        draw(t) {
          for (const m of marks) {
            const s = ML.ease(t, m.a, m.a + 0.22), b = ML.back(t, m.a + 0.14, m.a + 0.34, 2);
            m.face.style.opacity = (1 - 0.65 * s).toFixed(4);
            m.ln.style.scale = `${s.toFixed(4)} 1`;
            m.ln.style.opacity = s > 0.002 ? "1" : "0";
            m.x.style.opacity = t >= m.a + 0.14 ? "1" : "0";
            m.x.style.scale = t >= m.a + 0.14 ? Math.max(0, b).toFixed(4) : "0";
          }
        },
      };
    }
    const want = ML.plain(String(p.word || "").trim());
    const old = (want && words.find((w) => ML.plain(w.textContent) === want)) || words[words.length - 1];
    const oldText = old.textContent, lastWord = !old.nextElementSibling;
    // the new text: given, else a number at ~80 %, else the word itself re-set in the new colour
    let newText = String(p.with || "").trim();
    if (!newText) {
      const m = oldText.match(/^([^\d]*)([\d,.]+)(.*)$/);
      if (m) {
        const v = parseFloat(m[2].replace(/,/g, "")), dec = (m[2].split(".")[1] || "").length;
        const nv = Math.round(v * 0.8 * Math.pow(10, dec)) / Math.pow(10, dec);
        newText = m[1] + (m[2].includes(",") ? nv.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) : nv.toFixed(dec)) + m[3];
      } else newText = oldText;
    }
    const mode = p.replace;
    const fs = parseFloat(getComputedStyle(el).fontSize) || 56;
    // the slot: the old word inside a box whose width we drive; the new word sits in the same box
    const slot = document.createElement("span");
    Object.assign(slot.style, { display: "inline-block", position: "relative", whiteSpace: "pre", verticalAlign: "bottom" });
    old.replaceWith(slot);
    const oldEl = document.createElement("span");
    oldEl.textContent = oldText;
    Object.assign(oldEl.style, { display: "inline-block", whiteSpace: "pre", transformOrigin: "50% 60%" });
    slot.append(oldEl);
    const line = document.createElement("span");
    const lh = Math.max(2, fs * 0.045);
    Object.assign(line.style, { position: "absolute", left: "-4%", width: "108%", top: `calc(56% - ${(lh / 2).toFixed(1)}px)`, height: lh.toFixed(1) + "px", borderRadius: (lh / 2).toFixed(1) + "px", background: "var(--x-ink)", transformOrigin: rtl ? "100% 50%" : "0% 50%", scale: "0 1", pointerEvents: "none" });
    if (p.strike === "line") slot.append(line);
    const neu = document.createElement("span");
    neu.textContent = newText;
    Object.assign(neu.style, { position: "absolute", top: "0", [rtl ? "right" : "left"]: "0", whiteSpace: "pre", color: colour, visibility: "hidden" });
    slot.append(neu);
    // widths (stage px), measured with both laid out on one line
    const k = el.getBoundingClientRect().width / (el.offsetWidth || 1) || 1;
    const wOld = oldEl.getBoundingClientRect().width / k;
    neu.style.position = "static"; neu.style.display = "inline-block";
    const wNew = neu.getBoundingClientRect().width / k;
    neu.style.position = "absolute"; neu.style.display = "";
    const probe = document.createElement("span"); probe.textContent = " "; probe.style.whiteSpace = "pre"; slot.after(probe);
    const wSpace = probe.getBoundingClientRect().width / k; probe.remove();
    slot.style.width = wOld.toFixed(2) + "px";
    const tS = Math.max(at, Math.min(ctx.word(oldText, at), end - 1)), tR = tS + 0.22 + p.gap;
    ctx.sfx(tS, "snap", 0.4);
    if (mode !== "delete") ctx.sfx(tR + (mode === "fade" ? 0 : 0.15), "pop.soft", 0.35);
    const typedText = (t, a, b) => ML.typed(newText, t, a, b);
    return {
      draw(t) {
        const s = ML.ease(t, tS, tS + 0.22);
        oldEl.style.opacity = (1 - 0.65 * s).toFixed(4);
        line.style.scale = `${s.toFixed(4)} 1`;
        line.style.opacity = s > 0.002 ? "1" : "0";
        oldEl.style.textDecoration = p.strike === "decoration" && t >= tS ? "line-through" : "none";
        oldEl.style.textDecorationThickness = Math.max(2, fs * 0.045).toFixed(1) + "px";
        if (mode === "fade") {
          const on = t >= tR;
          oldEl.style.visibility = on ? "hidden" : "visible";
          line.style.visibility = on ? "hidden" : "visible";
          neu.style.visibility = on ? "visible" : "hidden";
          slot.style.width = (on ? wNew : wOld).toFixed(2) + "px";
          return;
        }
        // collapse: squash + fade the old word, ease the slot to its new width
        const c = ML.lin(t, tR, tR + 0.15);
        oldEl.style.scale = c > 0 ? `1 ${(1 - c).toFixed(4)}` : "none";
        oldEl.style.opacity = (c > 0 ? (1 - c) * 0.35 : 1 - 0.65 * s).toFixed(4);
        line.style.opacity = s > 0.002 ? (1 - c).toFixed(4) : "0";
        line.style.scale = `${s.toFixed(4)} ${(1 - c).toFixed(4)}`;
        const x = ML.lin(t, tR, tR + 0.3), f = x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; // power3.inOut
        const target = mode === "delete" ? 0 : wNew;
        slot.style.width = (wOld + (target - wOld) * f).toFixed(2) + "px";
        // "delete" takes one space with the word: the one after it, or the one before the line's last word
        slot.style[lastWord ? "marginInlineStart" : "marginInlineEnd"] = mode === "delete" ? (-wSpace * f).toFixed(2) + "px" : "0px";
        if (mode === "delete") { neu.style.visibility = "hidden"; return; }
        const a = tR + 0.15;
        if (t < a) { neu.style.visibility = "hidden"; return; }
        neu.style.visibility = "visible";
        if (mode === "collapse-rise") {
          const u = ML.land(t, a, a + 0.25);
          neu.style.opacity = u.toFixed(4);
          neu.style.translate = `0 ${((1 - u) * fs * 0.45).toFixed(2)}px`;
        } else {
          const n = Array.from(newText).length, b = a + Math.min(0.6, Math.max(0.25, n * 0.045));
          neu.textContent = typedText(t, a, b) || "​";
          neu.style.opacity = "1";
        }
      },
    };
  },
});
