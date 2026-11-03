// Letter insert: a word turns into another by one letter (ask? → task, MOTION → EMOTION). A leaving glyph shrinks to 0
// with a 20° turn in 0.2 s and its room closes; a new letter in the accent enters — growing from 20 % beside the word
// while its room opens, or flying in from 200 px out at full size on expo.out (dropping in from above instead when
// other letters or words lie in its path, so it never crosses them) — and the other letters slide over
// (their room eased 0.35–0.5 s power3.out) so the word recentres; a small squash on contact. At the start, the end or
// inside the word. Room is real layout (each letter's width is set from t), so centred lines recentre themselves.
// Letters are split, so Arabic (whose letters join) is not offered this move.
// Source: prompt-motion:lexnlin-claude-opus-5-5-made + zaqailo-the-consistency-of-opus (reference) — our own rebuild.
ML.define({
  id: "text-emphasis.letter-insert",
  category: "text-emphasis",
  name: "A letter slides in and changes the word",
  does: "A new (accent) letter grows or slides into the word — or one drops out — and the word reflows into a new word (ask? -> task, MOTION -> EMOTION).",
  says: ["change", "playful", "story", "reveal"],
  energy: 3,
  targets: ["word"],
  duration: [0.8, 2],
  params: {
    position: { type: "choice", options: ["prefix", "suffix", "insert"], default: "prefix" },
    action: { type: "choice", options: ["add", "remove", "both"], default: "add" },
    entry: { type: "choice", options: ["grow", "slide"], default: "slide" },
    colour: { type: "text", default: "accent" },
    add: { type: "text", default: "" },
    index: { type: "number", range: [0, 12], default: 2 },
    pick: { type: "choice", options: ["longest", "first", "last"], default: "longest" },
  },
  pairs: ["text-emphasis.letter-flip-correction", "text-in.punchline"],
  avoid: ["luxury", "trust"],
  rtl: false,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "snap",
  source: { from: "prompt-motion:lexnlin-claude-opus-5-5-made", license: "reference", note: "also zaqailo-the-consistency-of-opus; our own rebuild" },
  setup(ctx) {
    const { el, p, at, stage } = ctx;
    if (!el) return null;
    const VARS = ["accent", "accent-2", "accent-ink", "ink", "dim", "ground", "panel", "panel-2", "good", "bad", "line", "ring"];
    const col = (v, d) => { v = String(v || d).trim(); if (v.startsWith("var(")) return v; if (v.startsWith("--")) return `var(${v})`; v = v.replace(/^x-/, ""); return `var(--x-${VARS.includes(v) ? v : d})`; };
    ML.split(el, "chars");
    const words = [...el.querySelectorAll(".ml-w")].filter((w) => w.querySelector(".ml-c"));
    if (!words.length) return null;
    const isL = (c) => /[\p{L}\p{N}]/u.test(c.textContent);
    const count = (w) => [...w.querySelectorAll(".ml-c")].filter(isL).length;
    const word = p.pick === "first" ? words[0] : p.pick === "last" ? words[words.length - 1] : words.reduce((a, b) => (count(b) > count(a) ? b : a));
    const all = [...word.querySelectorAll(".ml-c")];
    const ls = all.filter(isL);
    if (!ls.length) return null;
    const fs = parseFloat(getComputedStyle(el).fontSize) || 56;
    const u = fs / 72;
    const k = (stage.getBoundingClientRect().width / (stage.offsetWidth || 1)) || 1;
    const widthOf = (c) => c.getBoundingClientRect().width / k;
    const caps = ls.every((c) => c.textContent === c.textContent.toUpperCase());
    const at0 = Math.max(0, Math.min(ls.length - 1, Math.round(p.index)));
    const doAdd = p.action !== "remove", doRemove = p.action !== "add";
    // what leaves: the trailing mark / last letter (prefix add pairs with a suffix leave, like ask? → task), the first
    // letter for a suffix, the letter at `index` inside
    let gone = null;
    if (doRemove) {
      const removeAt = p.action === "both" ? (p.position === "suffix" ? "prefix" : "suffix") : p.position;
      gone = removeAt === "prefix" ? ls[0] : removeAt === "suffix" ? all[all.length - 1] : ls[at0];
    }
    // what arrives
    let neu = null, glyph = null;
    if (doAdd) {
      let ch = p.add ? Array.from(p.add)[0] : p.position === "prefix" ? "e" : p.position === "suffix" ? "s" : ls[at0].textContent.toLowerCase();
      ch = caps ? ch.toUpperCase() : ch;
      neu = document.createElement("span");
      neu.className = "ml-c ml-new";
      Object.assign(neu.style, { display: "inline-block", position: "relative", whiteSpace: "pre", overflow: "visible", verticalAlign: "bottom" });
      glyph = document.createElement("span");
      glyph.textContent = ch;
      Object.assign(glyph.style, { display: "inline-block", color: col(p.colour, "accent"), transformOrigin: "50% 100%" });
      neu.append(glyph);
      if (p.position === "prefix") word.insertBefore(neu, all[0]);
      else if (p.position === "suffix") { const tail = !isL(all[all.length - 1]) && gone !== all[all.length - 1] ? all[all.length - 1] : null; word.insertBefore(neu, tail); }
      else word.insertBefore(neu, ls[at0]);
    }
    const NW = neu ? widthOf(neu) : 0;
    // a line that fits on one row must stay on one row while the word's width changes (no re-wrap mid-move)
    const rows = new Set(words.map((w) => Math.round(w.getBoundingClientRect().top)));
    if (rows.size === 1 && [...el.querySelectorAll(".ml-w")].length === words.length) el.style.whiteSpace = "nowrap";
    // something in the way of a sideways entry: a word on that side, or letters when it lands inside the word
    const side = p.position === "suffix" ? word.nextElementSibling : word.previousElementSibling;
    const drop = p.entry === "slide" && (p.position === "insert" || !!side);
    const GW = gone ? widthOf(gone) : 0;
    let gInner = null;
    if (gone) {
      gInner = document.createElement("span");
      gInner.textContent = gone.textContent; gone.textContent = "";
      Object.assign(gInner.style, { display: "inline-block", transformOrigin: "50% 60%" });
      gone.append(gInner);
      Object.assign(gone.style, { overflow: "visible", whiteSpace: "pre", verticalAlign: "bottom" });
    }
    const tGo = at, tIn = at + (gone && neu ? 0.25 : 0);
    const OPEN = p.entry === "slide" ? 0.5 : 0.45;
    const contact = p.entry === "slide" ? tIn + 0.3 : tIn + OPEN;
    const from = (p.position === "suffix" ? 1 : -1) * 200 * u, above = -0.9 * fs;
    if (gone) ctx.sfx(tGo, "pop.soft", 0.25);
    if (neu) ctx.sfx(contact, "snap", 0.45);
    return {
      draw(t) {
        if (gone) {
          const s = ML.ease(t, tGo, tGo + 0.2);
          gInner.style.scale = (1 - s).toFixed(4);
          gInner.style.rotate = `${(20 * s).toFixed(2)}deg`;
          gInner.style.opacity = (1 - s).toFixed(4);
          const w = 1 - Math.pow(1 - ML.lin(t, tGo + 0.05, tGo + 0.45), 3);
          gone.style.width = t <= tGo ? "" : (GW * (1 - w)).toFixed(2) + "px";
        }
        if (neu) {
          const r = 1 - Math.pow(1 - ML.lin(t, tIn, tIn + OPEN), 3); // the room opens (power3.out)
          neu.style.width = (NW * r).toFixed(2) + "px";
          const sq = t < contact ? 0 : ML.pulse(t, contact, 0.03, 0.12);
          if (p.entry === "slide") {
            const x = ML.expo(t, tIn, tIn + 0.5);
            glyph.style.translate = drop ? `0 ${(above * (1 - x)).toFixed(2)}px` : `${(from * (1 - x)).toFixed(2)}px 0`;
            glyph.style.opacity = ML.lin(t, tIn, tIn + 0.08).toFixed(4);
            glyph.style.scale = `${(1 + 0.08 * sq).toFixed(4)} ${(1 - 0.12 * sq).toFixed(4)}`;
          } else {
            const g = 0.2 + 0.8 * (1 - Math.pow(1 - ML.lin(t, tIn, tIn + OPEN), 3));
            glyph.style.translate = `${((p.position === "suffix" ? 1 : -1) * (1 - r) * NW * 0.4).toFixed(2)}px 0`;
            glyph.style.opacity = ML.lin(t, tIn, tIn + 0.08).toFixed(4);
            glyph.style.scale = `${(g * (1 + 0.08 * sq)).toFixed(4)} ${(g * (1 - 0.12 * sq)).toFixed(4)}`;
          }
        }
      },
    };
  },
});
