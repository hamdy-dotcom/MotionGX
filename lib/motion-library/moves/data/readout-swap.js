// Readout swap: a small mono code chip (panel ground, hairline edge, the look's small radius, 32 px mono at 1080)
// shows a live value from the first word, and on its own word the value swaps: a hard swap (textContent flips at the
// word, nothing eases) or the new value types in. In "code" format the values are computed from the film's real
// clock, like the explainer's `T.clock = 3.42` → `T.word = 4.10`; in "label" format the chip shows plain text.
// A slot's own text is the truth: with no first / second / key it is what the chip swaps TO (from zeros or "Computing"),
// so a move given no values never puts an invented figure on screen.
// On a label / number slot the slot itself becomes the chip; with no slot a chip is built in the picture region.
// Source: MengTo/Skills html-explainer-video demo/film.js, scene step3 (#s3-code) + film.css .s3-code (MIT).
ML.define({
  id: "data.readout-swap",
  category: "data",
  name: "Readout chip swaps on cue",
  does: "A small code chip shows a live value and swaps to a new one on its word.",
  says: ["precision", "tech", "proof"],
  energy: 2,
  targets: ["label", "number"],
  duration: [0.8, 4],
  params: {
    swap: { type: "choice", options: ["hard", "typed"], default: "hard" },
    format: { type: "choice", options: ["code", "label"], default: "code" },
    first: { type: "text", default: "" },
    second: { type: "text", default: "" },
    key: { type: "text", default: "" },
    word: { type: "text", default: "" },
  },
  pairs: ["data.spec-rows", "ui.caret-blink"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key",
  source: { from: "MengTo/Skills:html-explainer-video/demo/film.js#step3", license: "MIT" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    const u = Math.min(f.W, f.H) / 1080;
    const span = Math.max(0.6, end - at);
    // the swap lands on its word when one is named, else a little before the middle of the run
    const swapAt = Math.min(end - 0.3, Math.max(at + 0.35, p.word ? ctx.word(p.word, at + span * 0.42) : at + span * 0.42));
    const ARABIC = ML.ARABIC;
    const own = el ? (el.textContent || "").trim() : "";
    let first, second;
    const code = p.format === "code" && !!(p.key || p.first || p.second || !own);
    if (code) {
      const key = p.key || "T.clock";
      const key2 = p.key ? p.key : "T.word";
      first = p.first || `${key} = ${at.toFixed(2)}`;
      second = p.second || `${key2} = ${swapAt.toFixed(2)}`;
    } else {
      second = p.second || own || (rtl ? "تمّ ✓" : "Done ✓");
      first = p.first || (/\d/.test(second) ? second.replace(/\d/g, "0") : /[٠-٩]/.test(second) ? second.replace(/[٠-٩]/g, "٠") : rtl ? "جاري الحساب" : "Computing");
    }

    // the chip: the slot itself, or one built in the picture region
    let chip = el, built = false;
    if (!chip) {
      built = true;
      chip = document.createElement("div");
      chip.style.cssText = `position:absolute;left:${f.pic.x + f.pic.w / 2}px;top:${f.pic.y + f.pic.h / 2}px;translate:-50% -50%;z-index:20;white-space:nowrap`;
      (ctx.scene || stage).append(chip);
    }
    Object.assign(chip.style, {
      boxSizing: "border-box",
      display: built ? "block" : "inline-block",
      justifySelf: rtl ? "end" : "start",
      padding: `${(12 * u).toFixed(1)}px ${(18 * u).toFixed(1)}px`,
      borderRadius: "var(--x-radius-s)",
      background: "var(--x-panel)",
      border: "var(--x-edge) solid var(--x-edge-color)",
      font: `${code ? 500 : "var(--x-label-weight)"} ${(32 * u).toFixed(1)}px/1.25 var(--x-mono-font)`,
      color: "var(--x-ink)",
      letterSpacing: "0",
      textTransform: "none",
      whiteSpace: "nowrap",
      width: "max-content",
      fontVariantNumeric: "tabular-nums",
      direction: code ? "ltr" : rtl ? "rtl" : "ltr",
      unicodeBidi: "isolate",
    });
    // the chip holds the wider value's width from the first frame, so a hard swap never jumps the layout
    chip.textContent = first; const w1 = chip.getBoundingClientRect().width;
    chip.textContent = second; const w2 = chip.getBoundingClientRect().width;
    const k = chip.getBoundingClientRect().width / (chip.offsetWidth || 1) || 1;
    chip.style.minWidth = (Math.max(w1, w2) / k).toFixed(1) + "px";
    chip.style.textAlign = rtl && !code ? "right" : "left";
    chip.textContent = first;

    // typing: Latin by letters, Arabic by whole words (its letters join)
    const typeDur = Math.min(0.6, 0.04 * Array.from(second).length + 0.12);
    const pieces = ARABIC.test(second) ? second.split(/(\s+)/) : Array.from(second);
    const typedAt = (t) => pieces.slice(0, Math.round(pieces.length * ML.lin(t, swapAt, swapAt + typeDur))).join("");

    ctx.sfx(at, "tap", 0.18);
    if (p.swap === "typed") for (let i = 0; i < 3; i++) ctx.sfx(swapAt + (i * typeDur) / 3, "key", 0.3);
    else ctx.sfx(swapAt, "key", 0.4);

    return {
      draw(t) {
        const inn = ML.out(t, at, at + 0.3), leave = ML.clamp((t - (end - 0.25)) / 0.2);
        chip.style.visibility = t >= at - 1e-6 ? "visible" : "hidden";
        chip.style.opacity = (inn * (1 - leave)).toFixed(4);
        chip.style.translate = built ? `-50% calc(-50% + ${((1 - inn) * 14 * u).toFixed(2)}px)` : `0 ${((1 - inn) * 14 * u).toFixed(2)}px`;
        let text = first;
        if (t >= swapAt) text = p.swap === "typed" ? typedAt(t) || "​" : second;
        if (chip.textContent !== text) chip.textContent = text;
      },
    };
  },
});
