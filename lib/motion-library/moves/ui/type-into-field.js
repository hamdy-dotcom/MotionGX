// Type into a field (typewriter): a seekable count n runs 0 → the text's graphemes (ease none) and the field shows the
// first round(n) of them (Intl.Segmenter graphemes, so emoji and Arabic marks never split; Arabic types letter by
// letter and its letters keep joining). Rates 0.02–0.1 s/char at a fixed rate, on musical sixteenths, or fitted to the
// span (a URL caps at 1.4 s, a brief at 2.6 s). The placeholder shows in the dim colour until the first char. Caret: a
// thin accent bar ~1 em tall (or a block, or an inline "|"), solid while typing, blinking after (t % 1 < 0.55). Sound:
// min(14, floor(d / 0.09)) key presses spread evenly at 0.22; key-return on send. Send: the button presses to 0.94 for
// 0.16 s at done + 0.28 with a ring from press − 0.2. Multi-line: up to four script lines one after another, each a
// share of the span, the current line carrying the caret. A text target keeps its size from the first frame (the full
// text holds the box, invisible, under the typed layer), so a centred line never re-centres while it types.
// Sources: MotionGX lib/studio-engine/assets/scenes.js type() and lib/live-engine/worker/vendor/kit.js K.type /
// K.typeInto (own); MengTo/Skills html-explainer-video film.js + scripts/explainer.js typed, html-demo PROMPT step
// (MIT); product-film-skill reference/ingredients.md Cursors (MIT).
ML.define({
  id: "ui.type-into-field",
  category: "ui",
  name: "Type into a field (typewriter)",
  does: "Text types itself into a field character by character with a blinking caret and key clicks, optionally ending with the send button pressed.",
  says: ["tech", "step", "precision", "time", "simplicity"],
  energy: 2,
  targets: ["line", "label", "word", "screen"],
  duration: [0.5, 3],
  params: {
    rate: { type: "number", range: [0.02, 0.1], default: 0.06, unit: "s/char" },
    timing: { type: "choice", options: ["fixed-rate", "per-sixteenth", "fit-duration"], default: "fixed-rate" },
    caret: { type: "choice", options: ["blink-bar", "block", "inline-pipe", "none"], default: "blink-bar" },
    placeholder: { type: "bool", default: true },
    sound: { type: "bool", default: true },
    send_press: { type: "bool", default: false },
    multi_line: { type: "bool", default: false },
    frame: { type: "choice", options: ["field", "address-bar", "none"], default: "field" },
    bpm: { type: "number", range: [80, 160], default: 120 },
    text: { type: "text" },
    placeholder_text: { type: "text" },
  },
  pairs: ["ui.cursor-glide-click", "ui.input-type-submit", "ui.caret-blink"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key",
  source: { from: "own:lib/studio-engine/assets/scenes.js", license: "own", note: "type() + live-engine kit K.type / K.typeInto; MengTo/Skills explainer typed + html-demo prompt step (MIT); product-film ingredients (MIT)" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const isText = el && el.children.length === 0 && (el.textContent || "").trim().length > 0;
    const seg = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
    const graphemes = (s) => (seg ? [...seg.segment(s)].map((x) => x.segment) : Array.from(s));

    // what it types
    const addr = p.frame === "address-bar";
    const DEF = addr ? "yourbrand.com/launch" : rtl ? "اعمل لي إعلان قصير لمتجري" : "Make a short ad for my shop";
    const raw = String(p.text || (isText ? el.textContent.trim() : "") || DEF);
    let lines = raw.split(/\n|\s\|\s/).map((s) => s.trim()).filter(Boolean);
    if (p.multi_line && lines.length === 1) {
      const ws = raw.split(/\s+/), per = Math.max(1, Math.ceil(ws.length / Math.min(4, Math.max(2, Math.ceil(ws.length / 3)))));
      lines = []; for (let i = 0; i < ws.length; i += per) lines.push(ws.slice(i, i + per).join(" "));
    }
    if (!p.multi_line) lines = [lines.join(" ")];
    lines = lines.slice(0, 4);
    const PH = p.placeholder_text || (addr ? (rtl ? "ابحث أو اكتب رابطًا" : "Search or type a URL") : rtl ? "اكتب هنا…" : "Type here…");

    // the host: the text target itself (its box held by the full text), else a field over the picture region
    let box, fs;
    if (isText) {
      el.textContent = "";
      fs = parseFloat(getComputedStyle(el).fontSize) || 40;
      box = mk("span", `position:relative;display:inline-block;max-width:100%;text-align:start;vertical-align:top;`, el);
    } else {
      const host = el && el.clientWidth > 360 && el.clientHeight > 120 ? el : ctx.scene || ctx.stage;
      if (host === el && getComputedStyle(el).position === "static") el.style.position = "relative";
      const R = host === el ? { x: 0, y: 0, w: el.clientWidth, h: el.clientHeight } : f.pic;
      fs = Math.max(18, (lines.length > 1 ? 34 : 40) * k);
      const W = Math.min(R.w * 0.92, 900 * k * (f.wide ? 1.1 : 1));
      const est = (lines.length * 1.5 + 1.4) * fs;
      box = mk("div", `position:absolute;left:${(R.x + (R.w - W) / 2).toFixed(1)}px;top:${(R.y + Math.max(0, R.h * 0.45 - est / 2)).toFixed(1)}px;width:${W.toFixed(1)}px;font:400 ${fs.toFixed(1)}px var(--x-body-font);color:var(--x-ink);z-index:6;`, host);
      box.dir = rtl ? "rtl" : "ltr";
    }
    const framed = p.frame !== "none";
    if (framed) {
      box.style.boxSizing = "border-box";
      box.style.padding = addr ? "0.45em 0.7em" : "0.55em 0.75em";
      box.style.background = "var(--x-panel)";
      box.style.border = "var(--x-edge) solid var(--x-edge-color)";
      box.style.borderRadius = addr ? "var(--x-radius-s)" : "min(var(--x-radius), 0.6em)";
      box.style.boxShadow = "var(--x-shadow)";
    }
    const inner = mk("div", `position:relative;display:flex;align-items:center;gap:0.5em;`, box);
    if (addr) mk("span", `flex:none;width:0.8em;height:0.8em;color:var(--x-dim);display:inline-flex;`, inner).innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>`;
    const area = mk("div", `position:relative;flex:1;min-width:0;${addr ? "direction:ltr;text-align:left;font-family:var(--x-mono-font);" : ""}`, inner);
    const rows = lines.map((ln) => {
      const r = mk("div", `position:relative;`, area);
      // the sizing text keeps room for the caret too, so the typed layer never wraps where the held box did not
      mk("span", `visibility:hidden;white-space:pre-wrap;padding-inline-end:${p.caret === "block" ? "0.7em" : "0.25em"};`, r, ln || " ");
      const live = mk("span", `position:absolute;inset:0;white-space:pre-wrap;`, r);
      const typedEl = mk("span", "", live);
      const caret = p.caret === "none" ? null : p.caret === "inline-pipe" ? mk("span", `color:var(--x-accent);margin-inline-start:0.04em;`, live, "|")
        : mk("span", p.caret === "block"
          ? `display:inline-block;width:0.55em;height:1em;vertical-align:-0.12em;margin-inline-start:0.06em;background:color-mix(in srgb, var(--x-accent) 70%, transparent);`
          : `display:inline-block;width:max(2px, ${lines.length > 1 ? "0.05em" : "0.07em"});height:0.95em;vertical-align:-0.12em;margin-inline-start:0.06em;background:var(--x-accent);`, live);
      return { chars: graphemes(ln), typedEl, caret };
    });
    const ph = p.placeholder ? mk("div", `position:absolute;inset-inline-start:0;top:0;color:var(--x-dim);white-space:nowrap;overflow:hidden;max-width:100%;`, area, PH) : null;
    const send = p.send_press && framed ? mk("div", `position:relative;flex:none;width:1.5em;height:1.5em;border-radius:var(--x-radius-s);background:var(--x-accent);color:var(--x-accent-ink);display:flex;align-items:center;justify-content:center;align-self:flex-end;`, inner) : null;
    let sendRing = null;
    if (send) {
      send.innerHTML = `<svg viewBox="0 0 24 24" width="60%" height="60%" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/></svg>`;
      sendRing = mk("div", `position:absolute;inset:-0.18em;border-radius:inherit;border:max(2px, 0.08em) solid var(--x-accent);opacity:0;`, send);
    }

    // timing: each line gets its share; the whole run starts just after `at` and ends before the send / end
    const total = rows.reduce((a, r) => a + r.chars.length, 0) || 1;
    const t0 = at + 0.1;
    const room = Math.max(0.3, end - t0 - (send ? 0.75 : 0.35));
    let d;
    if (p.timing === "fit-duration") d = room;
    else if (p.timing === "per-sixteenth") d = total * (60 / ML.clamp(p.bpm, 80, 160) / 4);
    else d = total * ML.clamp(p.rate, 0.02, 0.1);
    d = Math.min(d, room, addr ? 1.4 : 2.6 * Math.max(1, lines.length / 2));
    const per = d / total;
    const spans = []; let acc = t0;
    rows.forEach((r) => { const dd = p.multi_line ? d / rows.length : r.chars.length * per; spans.push([acc, acc + dd]); acc += dd; });
    const tDone = t0 + d, tPress = tDone + 0.28;
    if (p.sound) {
      const nk = Math.min(14, Math.floor(d / 0.09));
      for (let i = 0; i < nk; i++) ctx.sfx(t0 + (i * d) / nk, "key", 0.22);
      if (send) ctx.sfx(tPress, "key.return", 0.35);
    }

    return {
      draw(t) {
        if (!isText) { const o = ML.out(t, at - 0.15, at + 0.15); box.style.opacity = o.toFixed(4); box.style.translate = `0 ${((1 - o) * 14 * k).toFixed(2)}px`; }
        // the line with the caret: the first one not finished yet (else the last)
        let current = spans.findIndex(([, b]) => t < b);
        if (current < 0) current = rows.length - 1;
        rows.forEach((r, i) => {
          const [a, b] = spans[i];
          // n tweens 0 → length with ease none; for a sixteenth grid the count steps on the beat
          const nf = r.chars.length * ML.lin(t, a, b);
          const nn = p.timing === "per-sixteenth" ? Math.floor(nf + 1e-6) : Math.round(nf);
          r.typedEl.textContent = r.chars.slice(0, nn).join("");
        });
        rows.forEach((r, i) => {
          if (!r.caret) return;
          const [a, b] = spans[i];
          const on = i === current && t >= at - 0.05;
          const typing = t >= a && t < b + 0.04;
          r.caret.style.opacity = !on ? "0" : typing ? "1" : String(ML.blink(Math.max(0, t - (t < a ? at : b)), 1));
        });
        if (ph) ph.style.opacity = t < spans[0][0] + per * 0.5 ? "1" : "0";
        if (send) {
          const pr = t < tPress ? 0 : t < tPress + 0.05 ? ML.lin(t, tPress, tPress + 0.05) : 1 - ML.lin(t, tPress + 0.08, tPress + 0.16);
          send.style.scale = (1 - 0.06 * pr).toFixed(4);
          const rg = ML.lin(t, tPress - 0.2, tPress + 0.3);
          sendRing.style.opacity = (rg > 0 && rg < 1 ? 1 - rg : 0).toFixed(4);
          sendRing.style.scale = (0.9 + 0.1 * rg).toFixed(4);
        }
      },
    };
  },
});
