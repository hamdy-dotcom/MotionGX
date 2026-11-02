// Code editor types line by line: mono code types at chars_per_s (seeded ±20% jitter) beside dim line numbers (40%)
// in the gutter, a new numbered line appearing every 0.12–0.2 s pause; a 2 px caret is solid while typing and blinks
// on 0.5 s otherwise. Indents 0–3. Themes: teal-dark (one teal-tinted grey on the device dark, comments dimmer),
// syntax-dark (keywords, strings, numbers and comments in the look's accent-2 / good / amber / dim) or light. The
// abstract variant draws rounded coloured bars instead of glyphs, growing at the same pace. Follow: smooth — the code
// block starts with line 1 centred and slides up as lines arrive, then keeps the caret near 60% height (an eased
// glide per new line); jump — it scrolls one line height when the view is full (0.15 s power2.out). Code is always
// set left to right (it is code), its comments may be Arabic.
// Sources: prompt-motion "rames-jusso-creating-videos-with-opus" and "kamstudiolabs-opus-5-5-second-prompt"
// (reference only: rebuilt as our own code).
ML.define({
  id: "ui.code-editor-type",
  category: "ui",
  name: "Code editor types line by line",
  does: "Code types line by line beside dim line numbers inside an editor or screen, the view scrolling to keep the cursor in frame.",
  says: ["tech", "step", "precision", "speed", "time"],
  energy: 2,
  targets: ["screen"],
  duration: [1.5, 6],
  params: {
    content: { type: "choice", options: ["real-code", "abstract-bars"], default: "real-code" },
    chars_per_s: { type: "number", range: [30, 60], default: 40 },
    follow: { type: "choice", options: ["smooth", "jump"], default: "smooth" },
    line_numbers: { type: "bool", default: true },
    theme: { type: "choice", options: ["teal-dark", "syntax-dark", "light"], default: "syntax-dark" },
    code: { type: "text", default: "" },
    file: { type: "text", default: "" },
  },
  pairs: ["ui.log-stream-advance", "camera.push-in"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key",
  source: { from: "prompt-motion:rames-jusso-creating-videos-with-opus", license: "reference", note: "with kamstudiolabs-opus-5-5-second-prompt; our own rebuild of the technique" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k0 = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const target = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    // the host: a screen target (filled), else an editor window over the picture region
    let host;
    if (target) { const w = target.offsetWidth, h = target.offsetHeight; host = target; host.replaceChildren(); host.style.boxSizing = "border-box"; host.style.width = w + "px"; host.style.height = h + "px"; if (getComputedStyle(host).position === "static") host.style.position = "relative"; }
    else {
      const R = f.pic;
      host = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;z-index:5`, ctx.scene || ctx.stage);
    }
    // type follows the box: about 44 characters always fit, in a small screen target as on the stage
    const k = k0 * Math.min(1, host.clientWidth / 900);
    const luma = (v) => { const e = mk("i", `display:none;color:${v}`, host), c = doc.createElement("canvas"); c.width = c.height = 1; const g = c.getContext("2d"); g.fillStyle = getComputedStyle(e).color; e.remove(); g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; return 0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]; };
    // what reads on the device's dark, in any look: a dark look's panel is dark, a light look's ink is dark
    const devL = luma("var(--x-device)");
    const ON = Math.abs(luma("var(--x-ink)") - devL) >= Math.abs(luma("var(--x-panel)") - devL) ? "var(--x-ink)" : "var(--x-panel)";
    const TH = {
      "teal-dark": { bg: "var(--x-device)", bar: `color-mix(in srgb, var(--x-device) 88%, ${ON})`, text: `color-mix(in srgb, var(--x-good) 22%, color-mix(in srgb, ${ON} 62%, var(--x-device)))`, kw: null, str: null, num: null, com: `color-mix(in srgb, ${ON} 36%, var(--x-device))`, gutter: ON, caret: "var(--x-good)" },
      "syntax-dark": { bg: "var(--x-device)", bar: `color-mix(in srgb, var(--x-device) 88%, ${ON})`, text: `color-mix(in srgb, ${ON} 78%, var(--x-device))`, kw: "var(--x-accent-2)", str: "var(--x-good)", num: "var(--x-light-2)", com: `color-mix(in srgb, ${ON} 42%, var(--x-device))`, gutter: ON, caret: "var(--x-accent-2)" },
      light: { bg: "var(--x-panel)", bar: "var(--x-panel-2)", text: "var(--x-ink)", kw: "var(--x-accent)", str: "var(--x-good)", num: "var(--x-bad)", com: "var(--x-dim)", gutter: "var(--x-ink)", caret: "var(--x-accent)" },
    }[p.theme] || null;
    const win = mk("div", `position:absolute;inset:0;display:flex;flex-direction:column;overflow:hidden;background:${TH.bg};border-radius:calc(var(--x-radius) * 0.6);box-shadow:var(--x-shadow);border:var(--x-edge) solid var(--x-edge-color)`, host);
    win.dir = "ltr";
    // the chrome: three lights and the file's tab
    const fsz = Math.max(12, (f.wide ? 28 : 30) * k);
    const bar = mk("div", `flex:none;display:flex;align-items:center;gap:${(12 * k).toFixed(1)}px;padding:${(18 * k).toFixed(1)}px ${(22 * k).toFixed(1)}px;background:${TH.bar}`, win);
    for (const c of ["--x-light-1", "--x-light-2", "--x-light-3"]) mk("i", `width:${(16 * k).toFixed(1)}px;height:${(16 * k).toFixed(1)}px;border-radius:50%;background:var(${c});opacity:var(--x-lights)`, bar);
    mk("span", `margin-inline-start:${(18 * k).toFixed(1)}px;font:500 ${(fsz * 0.75).toFixed(1)}px var(--x-mono-font);color:${TH.com}`, bar, p.file || "checkout.ts");
    const view = mk("div", "position:relative;flex:1;overflow:hidden", win);
    // the code: lines of [kind, text] tokens
    const SAMPLE = [
      'import { pay } from "./wallet";',
      rtl ? "// قسّطها على ٤ دفعات" : "// split it into 4 easy parts",
      "const plan = { total: 4500, parts: 4 };",
      "",
      "export async function start(user) {",
      "  const each = plan.total / plan.parts;",
      "  for (let i = 0; i < plan.parts; i++) {",
      "    await pay(user, each, { month: i + 1 });",
      "  }",
      '  return { ok: true, next: "30 days" };',
      "}",
    ];
    const src = p.code ? String(p.code).replace(/\\n/g, "\n").split("\n") : SAMPLE;
    const KW = /^(import|from|export|const|let|var|function|async|await|return|for|if|else|while|new|class|true|false|null|def|in|of)$/;
    const tokenize = (line) => {
      const out = [];
      const re = /(\/\/.*$|#.*$)|("[^"]*"?|'[^']*'?|`[^`]*`?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|(\s+)|([^\sA-Za-z_$\d"'`]+)|(.)/g; // the last catches what no other takes ("10px"'s 1), so no character is ever lost
      let m;
      while ((m = re.exec(line))) {
        const kind = m[1] ? "com" : m[2] ? "str" : m[3] ? "num" : m[4] && KW.test(m[4]) ? "kw" : "text";
        out.push([kind, m[0]]);
      }
      return out;
    };
    const lines = src.map(tokenize);
    const lh = fsz * 1.6;
    const pad = 26 * k;
    const block = mk("div", `position:absolute;left:0;right:0;top:0;padding:0 ${pad.toFixed(1)}px;font:500 ${fsz.toFixed(1)}px/${lh.toFixed(1)}px var(--x-mono-font);color:${TH.text};white-space:pre;will-change:transform`, view);
    const gutW = p.line_numbers ? fsz * 2.2 : 0;
    const abstract = p.content === "abstract-bars";
    const colourOf = (kind) => (kind === "com" ? TH.com : TH[kind] || TH.text);
    const rows = lines.map((toks, li) => {
      const row = mk("div", `display:flex;height:${lh.toFixed(1)}px;align-items:center`, block);
      const num = p.line_numbers ? mk("span", `flex:none;width:${gutW.toFixed(1)}px;text-align:right;padding-right:${(fsz * 0.9).toFixed(1)}px;box-sizing:content-box;color:${TH.gutter};opacity:.4;font-variant-numeric:tabular-nums`, row, String(li + 1)) : null;
      const code = mk("span", "position:relative;display:flex;align-items:center;unicode-bidi:plaintext", row);
      const spans = toks.map(([kind, text]) => {
        if (abstract) {
          if (/^\s+$/.test(text)) return { kind, text, el: mk("span", `display:inline-block;width:${(text.length * 0.6).toFixed(2)}em`, code), ws: true };
          const e = mk("span", `display:inline-block;height:${(fsz * 0.62).toFixed(1)}px;border-radius:${fsz}px;margin-right:${(fsz * 0.18).toFixed(1)}px;background:${colourOf(kind)};opacity:${kind === "com" ? 0.55 : 0.9}`, code);
          return { kind, text, el: e, w: Math.max(0.6, text.length * 0.6) };
        }
        return { kind, text, el: mk("span", `color:${colourOf(kind)}${kind === "com" && !ML.ARABIC.test(text) ? ";font-style:italic" : ""}`, code, "") };
      });
      const caret = mk("span", `display:inline-block;width:${Math.max(2, 3 * k).toFixed(1)}px;height:${(fsz * 1.15).toFixed(1)}px;margin-left:1px;background:${TH.caret}`, code);
      return { row, num, spans, caret, len: toks.reduce((n, [, x]) => n + Array.from(x).length, 0) };
    });
    // the clock: each line starts after the last (a 0.12–0.2 s pause per new line), its chars at the typing pace
    const t0 = at + 0.3;
    const starts = [], ends = [];
    let x = t0;
    rows.forEach((r, i) => {
      starts.push(x);
      // each character's own seeded beat, kept as a share of the line so a compressed clock keeps the rhythm
      let d = 0;
      const beats = [];
      for (let c = 0; c < r.len; c++) { d += (1 / p.chars_per_s) * (0.8 + 0.4 * ML.rnd(i * 97 + c, 3)); beats.push(d); }
      r.beats = beats.map((v) => v / (d || 1));
      x += d; ends.push(x);
      x += 0.12 + 0.08 * ML.rnd(i, 9);
    });
    // fit the whole listing before the end
    const budget = Math.max(0.8, end - 0.4 - t0);
    if (x - t0 > budget) { const s = budget / (x - t0); for (let i = 0; i < rows.length; i++) { starts[i] = t0 + (starts[i] - t0) * s; ends[i] = t0 + (ends[i] - t0) * s; } }
    const typedAt = (r, i, t) => {
      if (t < starts[i]) return -1;
      const u = (t - starts[i]) / Math.max(1e-3, ends[i] - starts[i]);
      let n = 0;
      while (n < r.len && u >= r.beats[n]) n++;
      return n;
    };
    // the follow: the block's top for a caret on line L (0-based)
    const VH = view.clientHeight || host.clientHeight * 0.85;
    const topFor = (L) => (p.follow === "jump"
      ? Math.min(pad, VH - pad - (L + 1) * lh)
      : Math.min(VH / 2 - ((L + 1) * lh) / 2, VH * 0.6 - (L + 0.5) * lh));
    const glide = p.follow === "jump" ? 0.15 : 0.35;
    // keys: about one per beat while typing
    rows.forEach((r, i) => { if (r.len && ends[i] > starts[i]) for (let tt = starts[i]; tt < ends[i]; tt += 0.3) ctx.sfx(tt, "key", 0.2); });
    return {
      draw(t) {
        const vis = ML.out(t, at - 0.1, at + 0.3) * (1 - ML.clamp((t - (end - 0.25)) / 0.22));
        win.style.opacity = vis.toFixed(4);
        let live = 0;
        rows.forEach((r, i) => {
          const n = typedAt(r, i, t);
          if (n >= 0) live = i;
          r.row.style.visibility = n < 0 ? "hidden" : "visible";
          let left = Math.max(0, n);
          for (const s of r.spans) {
            const L = Array.from(s.text).length, take = Math.min(L, left);
            left -= take;
            if (abstract) { if (!s.ws) { s.el.style.width = ((s.w * take) / L).toFixed(3) + "em"; s.el.style.display = take ? "inline-block" : "none"; } else s.el.style.display = take ? "inline-block" : "none"; }
            else s.el.textContent = Array.from(s.text).slice(0, take).join("");
          }
        });
        // the caret: on the live line, solid while typing, blinking 0.5 s otherwise
        rows.forEach((r, i) => {
          const on = i === live && t >= starts[0];
          const typing = t >= starts[i] && t < ends[i] + 0.05;
          r.caret.style.opacity = on ? (typing ? "1" : String(ML.blink(t, 1))) : "0";
        });
        // the follow: an eased glide to each new line's position
        let y = topFor(0);
        for (let i = 1; i < rows.length; i++) {
          const d = topFor(i) - topFor(i - 1);
          if (p.follow === "jump") y += d * (1 - Math.pow(1 - ML.clamp((t - starts[i]) / glide), 2));
          else y += d * ML.out(t, starts[i], starts[i] + glide);
        }
        block.style.transform = `translateY(${y.toFixed(2)}px)`;
      },
    };
  },
});
