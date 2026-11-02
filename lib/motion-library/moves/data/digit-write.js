// Digit write: a large currency figure writes itself in, each character flicking up 8 px (0.12 em) from transparent
// on a 0.04 s stagger in reading order (right to left on an RTL stage) — or, in "count" mode, the figure counts from 0
// to its value in 0.8 s (power2.out) keeping its own format (prefix, separators, decimals, suffix, Arabic-Indic digits). 0.2 s after the
// last digit a small delta chip ("+18.4%", green when up, red when down) pops beside it from 0.8×. Tabular digits so
// nothing shifts. Digits never join, so they are split in Arabic too; a word beside the figure ("٤٬٥٠٠ جنيه") stays whole.
// Source: prompt-motion:daniel-haida-claude-code-opus-5-5 (reference only — rebuilt as our own code).
ML.define({
  id: "data.digit-write",
  category: "data",
  name: "Figure writes in digit by digit",
  does: "A large currency figure appears with each digit flicking in, in reading order, then a small delta chip pops beside it.",
  says: ["proof", "money", "growth"],
  energy: 3,
  targets: ["number"],
  duration: [1, 3],
  params: {
    mode: { type: "choice", options: ["write", "count"], default: "write" },
    stagger: { type: "number", range: [0.02, 0.08], default: 0.04, unit: "s" },
    delta_chip: { type: "bool", default: true },
    delta_tone: { type: "choice", options: ["up", "down"], default: "up" },
    delta: { type: "text", default: "18.4%" },
    font: { type: "choice", options: ["mono", "keep"], default: "mono" },
  },
  pairs: ["data.data-point-step-highlight", "data.damage-number-stack"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key",
  source: { from: "prompt-motion:daniel-haida-claude-code-opus-5-5", license: "reference", note: "technique rebuilt as our own code" },
  setup(ctx) {
    const { el: el0, p, at, end, rtl, stage, f } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const u = Math.min(f.W, f.H) / 1080;
    // the figure: the target, or one built on the stage
    const el = el0 || mk("div", `position:absolute;left:${f.pic.x}px;top:${f.pic.y + f.pic.h * 0.4}px;width:${f.pic.w}px;text-align:center;font:var(--x-head-weight) ${Math.round(170 * u)}px var(--x-head-font);color:var(--x-ink)`, stage, "$48,250");
    const text = (el.textContent || "").trim();
    el.style.fontVariantNumeric = "tabular-nums";
    if (p.font === "mono") { el.style.fontFamily = "var(--x-mono-font)"; el.style.letterSpacing = "-0.04em"; }
    el.style.whiteSpace = "nowrap";

    // the number inside the text: prefix, digits (with its separators and decimals), suffix
    const m = text.match(/^(.*?)([\d٠-٩][\d٠-٩,.\s٫٬]*[\d٠-٩]|[\d٠-٩])(.*)$/);
    const pre = m ? m[1] : "", core0 = m ? m[2] : text, post = m ? m[3] : "";
    const indic = /[٠-٩]/.test(core0);
    const core = core0.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660)).replace(/٬/g, ",").replace(/٫/g, ".");
    const lastSep = Math.max(core.lastIndexOf("."), core.lastIndexOf(","));
    const decimals = lastSep >= 0 && core.length - lastSep - 1 <= 2 && !(core.split(core[lastSep]).length > 2) ? core.length - lastSep - 1 : 0;
    const decSep = decimals ? core[lastSep] : ".", thouSep = decimals ? (decSep === "." ? "," : ".") : (core.match(/[,.\s]/) || [","])[0];
    const value = parseFloat(decimals ? core.slice(0, lastSep).replace(/\D/g, "") + "." + core.slice(lastSep + 1) : core.replace(/\D/g, "")) || 0;
    const fmt = (v) => {
      const [i, d] = v.toFixed(decimals).split(".");
      const grouped = core.match(/[,.\s]\d{3}/) ? i.replace(/\B(?=(\d{3})+(?!\d))/g, thouSep) : i;
      const s = grouped + (decimals ? decSep + d : "");
      return indic ? s.replace(/\d/g, (x) => String.fromCharCode(0x660 + +x)).replace(/,/g, "٬").replace(/\./g, "٫") : s;
    };
    // a figure reads left to right even on an RTL stage; a word beside it keeps the stage's order
    const LETTER = /[\u0621-\u064A\u0671-\u06D3]/, mixed = rtl && LETTER.test(text);
    const holderDir = `direction:${mixed ? "rtl" : "ltr"};unicode-bidi:isolate`;

    let chars = [], num = null, numPre = "";
    el.textContent = "";
    if (p.mode === "count") {
      const holder = mk("span", holderDir, el);
      // a currency sign counts with the digits, so it stays beside them however few there are
      numPre = LETTER.test(pre) ? "" : pre;
      if (!numPre && pre) mk("span", "letter-spacing:0", holder, pre);
      num = mk("span", "direction:ltr;unicode-bidi:isolate", holder, numPre + fmt(value)); // measured at its widest, then counted
      num.style.display = "inline-block"; num.style.minWidth = num.offsetWidth + "px"; num.style.textAlign = "right";
      mk("span", LETTER.test(post) ? "letter-spacing:0" : "", holder, post);
    } else {
      // every digit on its own (digits never join, Arabic-Indic ones too); a word with letters stays whole
      const holder = mk("span", holderDir, el);
      for (const part of text.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) { holder.append(part); continue; }
        if (LETTER.test(part)) { chars.push(mk("span", "display:inline-block;white-space:pre;letter-spacing:0", holder, part)); continue; }
        const w = mk("span", "display:inline-block;white-space:pre;direction:ltr;unicode-bidi:isolate", holder);
        for (const ch of Array.from(part)) chars.push(mk("span", "display:inline-block", w, ch));
      }
    }
    // the figure and its chip fit the frame's width
    ML.fit(el, (f.W - 2 * f.m) * (p.delta_chip ? 0.74 : 1));
    // the delta chip, beside the figure (not split, not counted)
    const fs = parseFloat(getComputedStyle(el).fontSize) || 120;
    const up = p.delta_tone !== "down";
    const raw = String(p.delta || "18.4%").replace(/^[+\-−]/, "");
    const chip = p.delta_chip ? mk("span", `display:inline-block;vertical-align:middle;margin-inline-start:${(fs * 0.16).toFixed(1)}px;padding:${(fs * 0.06).toFixed(1)}px ${(fs * 0.12).toFixed(1)}px;border-radius:var(--x-radius-s);font:var(--x-label-weight) ${Math.max(20 * u, fs * 0.22).toFixed(1)}px/1.1 var(--x-mono-font);letter-spacing:0;color:var(--x-${up ? "good" : "bad"});background:color-mix(in srgb, var(--x-${up ? "good" : "bad"}) 14%, transparent);direction:ltr;unicode-bidi:isolate;transform-origin:${rtl ? "100%" : "0"} 50%`, el, (up ? "▲ +" : "▼ −") + raw) : null;

    // timing: reading order (RTL: from the right), all in before the chip
    const n = chars.length;
    const xs = chars.map((c) => c.getBoundingClientRect().left);
    const byX = chars.map((_, i) => i).sort((a, b) => (rtl ? xs[b] - xs[a] : xs[a] - xs[b]));
    const order = chars.map((_, i) => byX.indexOf(i));
    // the whole write, chip included, fits the span: the stagger and the count tighten on a short one
    const st = Math.min(ML.clamp(+p.stagger || 0.04, 0.01, 0.12), Math.max(0.012, (end - at - 0.9) / Math.max(1, n)));
    const cnt = Math.min(0.8, Math.max(0.3, end - at - 0.7));
    const last = p.mode === "count" ? at + cnt : at + Math.max(0, n - 1) * st + 0.2;
    const tChip = last + 0.2;
    if (p.mode === "count") { ctx.sfx(at, "key", 0.2); ctx.sfx(at + cnt / 2, "key", 0.18); }
    else for (let k = 0; k < n; k += 2) ctx.sfx(at + k * st, "key", 0.16);
    if (chip) ctx.sfx(tChip, "pop.soft", 0.3);

    return {
      draw(t) {
        const leave = ML.ease(t, end - 0.3, end - 0.05);
        el.style.opacity = (1 - leave).toFixed(4);
        if (p.mode === "count") {
          const x = ML.lin(t, at, at + cnt), e = 1 - (1 - x) * (1 - x); // power2.out
          num.textContent = numPre + fmt(value * e);
          el.style.visibility = t >= at - 1e-6 ? "visible" : "hidden";
        } else {
          el.style.visibility = "visible";
          chars.forEach((c, i) => {
            const ti = at + order[i] * st, e = ML.out(t, ti, ti + 0.2);
            c.style.opacity = e.toFixed(4);
            c.style.translate = e < 1 ? `0 ${((1 - e) * 0.12 * fs).toFixed(2)}px` : "none";
          });
        }
        if (chip) {
          const k = ML.back(t, tChip, tChip + 0.2, 2);
          chip.style.opacity = ML.clamp((t - tChip) / 0.1).toFixed(4);
          chip.style.scale = t < tChip + 0.2 ? Math.max(0, 0.8 + 0.2 * k).toFixed(4) : "none";
        }
      },
    };
  },
});
