// Email typed, button pressed, checks run: a soft card (the look's panel, its radius and shadow) holds an input and a
// Verify button. The address types in at 50 ms a char behind a blinking caret; a pointer glides to the button on an
// arc (0.5 s) and clicks — the button presses to 0.95 for 0.1 s and its label swaps to "Checking…". A stepper of
// checks on a line (syntax, disposable, dns, smtp, score) lights node by node: each fills in the accent with a ring
// pulse and a check mark while the line fills to it (0.25 s), 0.3 s a step. It ends with a "valid" pill in the good
// colour fading in and a big score counting up to n / 100 — or, failing, the last check turns the bad colour with a
// cross and the pill reads "invalid".
// Source: prompt-motion kmasiff-prompt-opus-5-5-high (reference only: rebuilt as our own code).
ML.define({
  id: "ui.typed-form-submit-check",
  category: "ui",
  name: "Email typed, button pressed, checks run",
  does: "An input types an address, a cursor clicks Verify, the button turns 'Checking...' and a stepper of checks lights up node by node, ending with a valid badge and score.",
  says: ["proof", "tech", "step", "result"],
  energy: 3,
  targets: ["screen", "card", "cursor", "number"],
  duration: [2.5, 5],
  params: {
    steps: { type: "number", range: [3, 6], default: 5 },
    result: { type: "choice", options: ["pass", "fail"], default: "pass" },
    score: { type: "number", range: [0, 100], default: 0 },
    email: { type: "text" },
    button: { type: "text" },
    cursor: { type: "bool", default: true },
  },
  pairs: ["ui.type-into-field", "data.count-up", "ui.approval-gate"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "success",
  source: { from: "prompt-motion:kmasiff-prompt-opus-5-5-high", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    let host, R;
    if (el && el.clientWidth > 520 && el.clientHeight > 300) { if (getComputedStyle(el).position === "static") el.style.position = "relative"; host = el; R = { x: 0, y: 0, w: el.clientWidth, h: el.clientHeight }; }
    else { host = ctx.scene || ctx.stage; R = f.pic; }

    const pass = p.result !== "fail";
    const n = Math.round(ML.clamp(p.steps, 3, 6));
    const ALL = rtl ? ["الصيغة", "مؤقت", "MX", "DNS", "SMTP", "النتيجة"] : ["syntax", "disposable", "mx", "dns", "smtp", "score"];
    const pick = { 3: [0, 3, 5], 4: [0, 1, 3, 5], 5: [0, 1, 3, 4, 5], 6: [0, 1, 2, 3, 4, 5] }[n];
    const labels = pick.map((i) => ALL[i]);
    const email = String(p.email || "hello@yourbrand.com");
    const btnTxt = p.button || (rtl ? "تحقّق" : "Verify");
    const busy = rtl ? "جارٍ الفحص…" : "Checking…";
    const score = Math.round(p.score || (pass ? 94 : 26));

    // the card
    const W = Math.min(R.w * 0.94, 920 * k * (f.wide ? 1.05 : 1));
    const fs = Math.max(16, 32 * k), pad = 40 * k;
    const card = mk("div", `position:absolute;left:${(R.x + (R.w - W) / 2).toFixed(1)}px;top:0;width:${W.toFixed(1)}px;box-sizing:border-box;padding:${pad.toFixed(1)}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:min(var(--x-radius), ${(24 * k).toFixed(1)}px);box-shadow:var(--x-shadow);display:flex;flex-direction:column;gap:${(36 * k).toFixed(1)}px;z-index:6;font:400 ${fs.toFixed(1)}px var(--x-body-font);color:var(--x-ink);pointer-events:none;`, host);
    card.dir = rtl ? "rtl" : "ltr";
    // input + button
    const row = mk("div", `display:flex;gap:${(16 * k).toFixed(1)}px;align-items:stretch;`, card);
    const input = mk("div", `flex:1;min-width:0;height:${(fs * 2.3).toFixed(1)}px;box-sizing:border-box;padding:0 ${(fs * 0.6).toFixed(1)}px;border:var(--x-edge) solid var(--x-edge-color);border-radius:min(var(--x-radius), ${(14 * k).toFixed(1)}px);background:var(--x-panel-2);display:flex;align-items:center;direction:ltr;font-family:var(--x-mono-font);font-size:${(fs * 0.9).toFixed(1)}px;overflow:hidden;white-space:nowrap;`, row);
    const ph = mk("span", `position:absolute;color:var(--x-dim);font-family:var(--x-body-font);`, input, rtl ? "بريدك الإلكتروني" : "you@company.com");
    input.style.position = "relative";
    const typedEl = mk("span", "", input);
    const caret = mk("span", `display:inline-block;width:max(2px, 0.08em);height:1.05em;margin-left:0.05em;background:var(--x-accent);`, input);
    const btn = mk("div", `position:relative;flex:none;min-width:${(fs * 5.6).toFixed(1)}px;padding:0 ${(fs * 0.8).toFixed(1)}px;border-radius:min(var(--x-radius), ${(14 * k).toFixed(1)}px);background:var(--x-accent);color:var(--x-accent-ink);display:grid;place-items:center;font-weight:600;`, row);
    const bA = mk("span", `grid-area:1/1;white-space:nowrap;`, btn, btnTxt);
    const bB = mk("span", `grid-area:1/1;white-space:nowrap;opacity:0;`, btn, busy);
    // the stepper
    const nodeD = Math.max(20, 46 * k), lineH = Math.max(2, 4 * k);
    const step = mk("div", `position:relative;height:${(nodeD + fs * 1.4).toFixed(1)}px;margin:0 ${(fs * 1.4).toFixed(1)}px;`, card);
    const base = mk("div", `position:absolute;left:0;right:0;top:${((nodeD - lineH) / 2).toFixed(1)}px;height:${lineH.toFixed(1)}px;border-radius:9px;background:var(--x-line);`, step);
    const fillL = mk("div", `position:absolute;${rtl ? "right" : "left"}:0;top:0;bottom:0;width:0;border-radius:9px;background:var(--x-accent);`, base);
    const CHECK = `<svg viewBox="0 0 24 24" width="62%" height="62%" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
    const CROSS = `<svg viewBox="0 0 24 24" width="56%" height="56%" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>`;
    const nodes = labels.map((lb, i) => {
      const u = i / (n - 1);
      const wrapN = mk("div", `position:absolute;${rtl ? "right" : "left"}:calc(${(u * 100).toFixed(2)}% - ${(nodeD / 2).toFixed(1)}px);top:0;width:${nodeD.toFixed(1)}px;`, step);
      const ringE = mk("div", `position:absolute;left:0;top:0;width:${nodeD.toFixed(1)}px;height:${nodeD.toFixed(1)}px;border-radius:50%;box-sizing:border-box;border:${Math.max(2, 3 * k).toFixed(1)}px solid var(--x-accent);opacity:0;`, wrapN);
      const dot = mk("div", `position:relative;width:${nodeD.toFixed(1)}px;height:${nodeD.toFixed(1)}px;border-radius:50%;box-sizing:border-box;border:${Math.max(2, 3 * k).toFixed(1)}px solid var(--x-line);background:var(--x-panel);display:grid;place-items:center;color:var(--x-accent-ink);`, wrapN);
      const ico = mk("div", `display:grid;place-items:center;width:100%;height:100%;opacity:0;`, dot);
      const fail = !pass && i === n - 1;
      ico.innerHTML = fail ? CROSS : CHECK;
      mk("div", `position:absolute;top:${(nodeD + fs * 0.3).toFixed(1)}px;left:50%;translate:-50% 0;font:500 ${(fs * 0.62).toFixed(1)}px var(--x-label-font);letter-spacing:0.06em;color:var(--x-dim);white-space:nowrap;`, wrapN, lb);
      return { ringE, dot, ico, fail };
    });
    // the result: pill + score
    const res = mk("div", `display:flex;align-items:center;justify-content:space-between;gap:${(20 * k).toFixed(1)}px;`, card);
    const pill = mk("div", `padding:0.3em 0.9em;border-radius:var(--x-radius-s);font-weight:600;font-size:${(fs * 0.85).toFixed(1)}px;background:color-mix(in srgb, var(${pass ? "--x-good" : "--x-bad"}) 16%, var(--x-panel));color:var(${pass ? "--x-good" : "--x-bad"});border:var(--x-edge) solid color-mix(in srgb, var(${pass ? "--x-good" : "--x-bad"}) 40%, transparent);opacity:0;`, res, pass ? (rtl ? "صالح" : "valid") : (rtl ? "غير صالح" : "invalid"));
    const num = mk("div", `display:flex;align-items:baseline;gap:0.15em;direction:ltr;opacity:0;`, res);
    const big = mk("span", `font:var(--x-head-weight) ${(fs * 2.6).toFixed(1)}px/1 var(--x-head-font);letter-spacing:var(--x-head-track);font-variant-numeric:tabular-nums;color:var(--x-ink);`, num, "0");
    mk("span", `font-size:${(fs * 0.9).toFixed(1)}px;color:var(--x-dim);`, num, "/100");
    // centre the card in its region now that it has its height
    const CH = card.offsetHeight;
    card.style.top = (R.y + Math.max(0, (R.h - CH) / 2)).toFixed(1) + "px";

    // the pointer
    const ptr = p.cursor ? mk("div", `position:absolute;left:0;top:0;width:${(52 * k).toFixed(1)}px;height:${(52 * k).toFixed(1)}px;z-index:9;pointer-events:none;`, card) : null;
    if (ptr) ptr.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M4 2l16 9.5-7 1.6 4.2 7.4-3 1.7-4.2-7.4L5 20z" fill="var(--x-pointer)" stroke="var(--x-pointer-edge)" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
    const bRect = { x: btn.offsetLeft + btn.offsetWidth * 0.55, y: btn.offsetTop + btn.offsetHeight * 0.6 };
    const from = { x: rtl ? -W * 0.08 : W * 1.04, y: CH * 1.05 };

    // timing (base plan ≈ 4.4 s, squeezed to the span)
    const chars = Array.from(email);
    const plan = { in: 0.35, type: Math.min(chars.length * 0.05, 1.1), glide: 0.5, settle: 0.12, step: 0.3, result: 0.7 };
    const base0 = plan.in + plan.type + 0.15 + plan.glide + plan.settle + 0.2 + n * plan.step + plan.result;
    const sc = Math.min(1, Math.max(0.45, (end - at - 0.3) / base0));
    const T = {}; let c = at;
    T.in = c; c += plan.in * sc;
    T.type = c; c += plan.type * sc; T.typed = c;
    T.glide = c + 0.15 * sc; T.click = T.glide + (plan.glide + plan.settle) * sc;
    T.steps = T.click + 0.2 * sc;
    T.done = T.steps + n * plan.step * sc;
    T.result = T.done + 0.05;
    const kc = Math.min(12, Math.floor((T.typed - T.type) / 0.09));
    for (let i = 0; i < kc; i++) ctx.sfx(T.type + (i * (T.typed - T.type)) / kc, "key", 0.18);
    ctx.sfx(T.click, "click", 0.45);
    for (let i = 0; i < n; i++) ctx.sfx(T.steps + (i + 0.85) * plan.step * sc, i === n - 1 && !pass ? "snap" : "tap", 0.2);
    ctx.sfx(T.result + 0.05, pass ? "success" : "hit", 0.4);

    return {
      draw(t) {
        const o = ML.out(t, T.in - 0.1, T.in + 0.35 * sc), leave = ML.lin(t, end - 0.25, end);
        card.style.opacity = (o * (1 - leave)).toFixed(4);
        card.style.translate = `0 ${((1 - o) * 26 * k).toFixed(2)}px`;
        // typing
        const nn = Math.round(chars.length * ML.lin(t, T.type, T.typed));
        typedEl.textContent = chars.slice(0, nn).join("");
        ph.style.opacity = nn > 0 ? "0" : "1";
        caret.style.opacity = t > T.click ? "0" : t < T.typed + 0.04 ? "1" : String(ML.blink(t - T.typed, 1));
        // pointer: an arc to the button, a press, then it rests
        if (ptr) {
          const g = ML.ease(t, T.glide, T.glide + plan.glide * sc);
          const x = from.x + (bRect.x - from.x) * g, y = from.y + (bRect.y - from.y) * g - Math.sin(Math.PI * g) * CH * 0.18;
          const pr = t < T.click - 0.03 ? 0 : t < T.click ? 1 : 1 - ML.lin(t, T.click + 0.05, T.click + 0.12);
          ptr.style.translate = `${(x - 9 * k).toFixed(1)}px ${(y - 4 * k).toFixed(1)}px`;
          ptr.style.scale = (1 - 0.1 * pr).toFixed(4);
          ptr.style.opacity = (ML.lin(t, T.glide - 0.05, T.glide + 0.1) * (1 - ML.lin(t, T.done, T.done + 0.3))).toFixed(4);
        }
        // the button
        const press = t < T.click ? 0 : t < T.click + 0.04 ? ML.lin(t, T.click, T.click + 0.04) : 1 - ML.lin(t, T.click + 0.06, T.click + 0.1);
        btn.style.scale = (1 - 0.05 * press).toFixed(4);
        const sw = ML.lin(t, T.click + 0.02, T.click + 0.14) * (1 - ML.lin(t, T.done, T.done + 0.15));
        bA.style.opacity = (1 - sw).toFixed(4); bB.style.opacity = sw.toFixed(4);
        btn.style.background = sw > 0.01 ? `color-mix(in srgb, var(--x-accent) ${(100 - 25 * sw).toFixed(1)}%, var(--x-panel))` : "var(--x-accent)";
        // the stepper: node i lights at the end of its step; the line fills toward it over 0.25 s
        let lineU = 0;
        nodes.forEach((nd, i) => {
          const s0 = T.steps + i * plan.step * sc, lit = s0 + plan.step * sc * 0.85;
          if (i > 0) lineU = Math.max(lineU, ((i - 1) + ML.ease(t, lit - 0.25 * sc, lit)) / (n - 1));
          const on = ML.lin(t, lit - 0.04, lit + 0.06);
          const col = nd.fail ? "var(--x-bad)" : "var(--x-accent)";
          nd.dot.style.background = on > 0.001 ? `color-mix(in srgb, ${nd.fail ? "var(--x-bad)" : "var(--x-accent)"} ${(on * 100).toFixed(1)}%, var(--x-panel))` : "var(--x-panel)";
          nd.dot.style.borderColor = on > 0.5 ? col : "var(--x-line)";
          nd.ico.style.opacity = on.toFixed(4);
          nd.ico.style.scale = (0.6 + 0.4 * ML.back(t, lit - 0.02, lit + 0.2)).toFixed(4);
          const rp = ML.lin(t, lit, lit + 0.45);
          nd.ringE.style.borderColor = col;
          nd.ringE.style.opacity = (rp > 0 && rp < 1 ? 0.7 * (1 - rp) : 0).toFixed(4);
          nd.ringE.style.scale = (1 + 0.6 * rp).toFixed(4);
        });
        fillL.style.width = (ML.clamp(lineU) * 100).toFixed(2) + "%";
        // the result
        const r = ML.out(t, T.result, T.result + 0.3);
        pill.style.opacity = r.toFixed(4);
        pill.style.translate = `0 ${((1 - r) * 10 * k).toFixed(2)}px`;
        num.style.opacity = ML.lin(t, T.result, T.result + 0.15).toFixed(4);
        big.textContent = String(Math.round(score * ML.out(t, T.result, T.result + 0.65 * sc + 0.1)));
      },
    };
  },
});
