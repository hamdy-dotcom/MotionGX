// Input bar: type and submit. A field in the look's style (prompt, URL with a grey prefix, email capsule, @handle or
// search) arrives — rising (opacity 0, y 30, scale 0.94 → 1, 0.4 s back.out(1.8)) or fading up from 0.95 — takes
// focus (an accent ring, or a gradient border with a soft coloured glow under it), the placeholder fades and the value
// types in at chars_per_s with seeded jitter and a small pause at commas (mono for URLs / emails / handles), the caret
// solid while typing and blinking on a 0.5 s period after; long text scrolls inside the field. The button reacts —
// press (scale 0.92 for 0.1 s), enable-then-press (grey → accent as the text completes), glow-then-press, pulse, or a
// flash — and the submitted state dims the bar to 40 % or turns the button into a spinner. Optional chip tags rise
// 8 px with a 0.06 s stagger after the submit, and an optional camera push 1 → 1.15 with a slight blur. The bar
// leaves y −30 / opacity 0 in 0.3 s at the end (recipes.js R.fake timing).
// Sources: MotionGX lib/live-engine/worker/vendor/recipes.js R.fake (own); MengTo/Skills orange-clean-paper-saas
// capsule email input (MIT); prompt-motion miskinho, listudio, paulo-kombucha, tstfully, ratheejaisal, en-ra,
// quickdesignio, lester-tyy, twoclipping (reference only — our own code).
ML.define({
  id: "ui.input-type-submit",
  category: "ui",
  name: "Input bar: type and submit",
  does: "An input bar (prompt, URL, email, handle or search) appears, a value types into it, and the submit button lights up and is pressed.",
  says: ["simplicity", "step", "tech", "speed", "focus"],
  energy: 2,
  targets: ["screen", "line", "card"],
  duration: [1.5, 4],
  params: {
    content: { type: "choice", options: ["prompt", "url", "email", "handle", "query"], default: "prompt" },
    theme: { type: "choice", options: ["light", "dark"], default: "light" },
    enter: { type: "choice", options: ["rise", "fade-scale", "none"], default: "rise" },
    focus: { type: "choice", options: ["none", "accent-ring", "gradient-glow"], default: "accent-ring" },
    chars_per_s: { type: "number", range: [12, 40], default: 18 },
    caret: { type: "choice", options: ["bar", "block"], default: "bar" },
    button_reaction: { type: "choice", options: ["press", "enable-then-press", "glow-then-press", "pulse", "flash"], default: "press" },
    after: { type: "choice", options: ["dim", "spinner", "none"], default: "dim" },
    chips_after: { type: "number", range: [0, 6], default: 0 },
    camera_push_after: { type: "bool", default: false },
    value: { type: "text" },
    button: { type: "text" },
  },
  pairs: ["ui.cursor-glide-click", "ui.generate-run", "camera.push-in"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key",
  source: { from: "own:lib/live-engine/worker/vendor/recipes.js", license: "own", note: "R.fake; MengTo/Skills orange-clean-paper-saas capsule input (MIT); prompt-motion videos as reference" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, html) => { const e = doc.createElement(tag); e.style.cssText = css; if (html != null) e.innerHTML = html; parent.append(e); return e; };
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const hasText = el && el.children.length === 0 && (el.textContent || "").trim().length > 0;
    const own = hasText ? el.textContent.trim() : "";
    const isLine = hasText && el.clientWidth >= 480 * k; // a line wide enough to become the bar; a short one only lends its words

    // what it types
    const C = p.content;
    const DEF = {
      prompt: rtl ? "اعمل لي فيديو إعلان لمتجري، ٣٠ ثانية" : "Make a 30s launch video for my shop, bold and warm",
      url: "yourbrand",
      email: "you@studio.com",
      handle: "motiongx",
      query: rtl ? "أفضل كاميرا للسفر" : "best camera for travel",
    };
    const value = String(p.value || (C === "prompt" || C === "query" ? own : "") || DEF[C]);
    const latin = C === "url" || C === "email" || C === "handle";
    const PH = { prompt: rtl ? "اوصف اللي في بالك…" : "Describe what you want…", url: rtl ? "الصق الرابط" : "Paste your link", email: rtl ? "بريدك الإلكتروني" : "Your email", handle: "username", query: rtl ? "ابحث…" : "Search…" }[C];
    const BTN = p.button || { prompt: "", url: rtl ? "احجز" : "Claim", email: rtl ? "اشترك" : "Join", handle: rtl ? "احجز" : "Claim", query: "" }[C];

    // the host
    let host, R;
    if (isLine) { el.textContent = ""; if (getComputedStyle(el).position === "static") el.style.position = "relative"; host = el; R = { x: 0, y: 0, w: el.clientWidth || f.pic.w, h: 0 }; }
    else if (el && el.clientWidth > 300 && el.clientHeight > 120) { if (getComputedStyle(el).position === "static") el.style.position = "relative"; host = el; R = { x: 0, y: 0, w: el.clientWidth, h: el.clientHeight }; }
    else { host = ctx.scene || ctx.stage; R = f.pic; }

    const dark = p.theme === "dark";
    const bg = dark ? "color-mix(in srgb, var(--x-ink) 92%, var(--x-panel))" : "var(--x-panel)";
    const fg = dark ? "var(--x-panel)" : "var(--x-ink)";
    const dim = dark ? "color-mix(in srgb, var(--x-panel) 50%, transparent)" : "var(--x-dim)";
    const edge = dark ? "color-mix(in srgb, var(--x-panel) 14%, transparent)" : "var(--x-edge-color)";
    const W = Math.min(R.w * 0.94, 960 * k * (f.wide ? 1.1 : 1)), H = Math.max(56, 104 * k), fs = H * 0.31;
    const top = isLine ? 0 : R.y + Math.max(0, R.h * 0.42 - H / 2);
    const wrap = mk("div", `position:${isLine ? "relative" : "absolute"};${isLine ? "margin:0 auto;" : `left:${(R.x + (R.w - W) / 2).toFixed(1)}px;top:${top.toFixed(1)}px;`}width:${W.toFixed(1)}px;height:${H.toFixed(1)}px;z-index:6;pointer-events:none;`, host);
    wrap.dir = rtl ? "rtl" : "ltr";
    // the glow under a gradient focus (a soft shape, never a picture)
    const glow = p.focus === "gradient-glow" ? mk("div", `position:absolute;inset:${(H * 0.12).toFixed(1)}px ${(H * 0.4).toFixed(1)}px;border-radius:var(--x-radius-s);background:linear-gradient(90deg, var(--x-accent), var(--x-accent-2), var(--x-accent));filter:blur(${(26 * k).toFixed(1)}px);`, wrap) : null;
    const pillCss = p.focus === "gradient-glow"
      ? `border:${Math.max(2, 3 * k).toFixed(1)}px solid transparent;background:linear-gradient(${bg}, ${bg}) padding-box, linear-gradient(90deg, var(--x-accent), var(--x-accent-2), var(--x-accent)) border-box;`
      : `border:var(--x-edge) solid ${edge};background:${bg};`;
    const pill = mk("div", `position:absolute;inset:0;box-sizing:border-box;border-radius:var(--x-radius-s);${pillCss}box-shadow:${dark ? "0 -10px 40px -16px color-mix(in srgb, var(--x-accent) 50%, transparent)" : "0 ${(10 * k).toFixed(1)}px ${(30 * k).toFixed(1)}px color-mix(in srgb, var(--x-ink) 8%, transparent)"};display:flex;align-items:center;gap:${(H * 0.2).toFixed(1)}px;padding:0 ${(H * 0.12).toFixed(1)}px;padding-inline-start:${(H * 0.34).toFixed(1)}px;`, wrap);
    const ringEl = mk("div", `position:absolute;inset:${(-5 * k).toFixed(1)}px;border-radius:var(--x-radius-s);border:${Math.max(2, 5 * k).toFixed(1)}px solid color-mix(in srgb, var(--x-accent) 22%, transparent);box-sizing:border-box;`, wrap);
    if (p.focus !== "accent-ring") ringEl.style.display = "none";
    const ICON = {
      prompt: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
      url: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
      email: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3.5 7l8.5 6 8.5-6"/>',
      handle: '<circle cx="12" cy="12" r="4"/><path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7.1"/>',
      query: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>',
    }[C];
    mk("span", `flex:none;width:${(H * 0.34).toFixed(1)}px;height:${(H * 0.34).toFixed(1)}px;color:${C === "prompt" ? "var(--x-accent)" : dim};`, pill,
      `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON}</svg>`);
    const field = mk("div", `position:relative;flex:1;min-width:0;height:100%;overflow:hidden;display:flex;align-items:center;`, pill);
    const ph = mk("div", `position:absolute;inset-inline-start:0;top:50%;translate:0 -50%;font:400 ${fs.toFixed(1)}px var(--x-body-font);color:${dim};white-space:nowrap;`, field);
    ph.textContent = PH;
    // the typed line on its own layer: its text changes every frame, and sharing a layer with the bar's curves made
    // Chrome raster those a hair differently depending on the frame before (same t must give the same pixels)
    const line = mk("div", `will-change:transform;display:flex;align-items:center;white-space:nowrap;font:500 ${fs.toFixed(1)}px ${latin ? "var(--x-mono-font)" : "var(--x-body-font)"};color:${fg};${latin ? "direction:ltr;" : ""}`, field);
    const prefix = C === "url" && !/[./]/.test(value) ? "site.page/" : C === "handle" && value[0] !== "@" ? "@" : "";
    const pre = prefix ? mk("span", `color:${dim};`, line) : null;
    if (pre) pre.textContent = prefix;
    const typedEl = mk("span", "", line);
    const caret = mk("span", p.caret === "block"
      ? `display:inline-block;width:0.55em;height:1.1em;margin-inline-start:${(2 * k).toFixed(1)}px;background:color-mix(in srgb, var(--x-accent) 70%, transparent);`
      : `display:inline-block;width:${Math.max(2, 3 * k).toFixed(1)}px;height:1.15em;margin-inline-start:${(3 * k).toFixed(1)}px;background:var(--x-accent);`, line);

    // the button: a round send arrow, or a labelled pill
    const bH = H * 0.74;
    const btn = mk("div", `position:relative;flex:none;height:${bH.toFixed(1)}px;${BTN ? `padding:0 ${(bH * 0.45).toFixed(1)}px;` : `width:${bH.toFixed(1)}px;`}border-radius:var(--x-radius-s);display:flex;align-items:center;justify-content:center;gap:0.4em;font:600 ${(fs * 0.95).toFixed(1)}px var(--x-body-font);color:var(--x-accent-ink);overflow:hidden;`, pill);
    const arrow = `<svg viewBox="0 0 24 24" width="${(bH * 0.46).toFixed(1)}" height="${(bH * 0.46).toFixed(1)}" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="${C === "prompt" ? "" : rtl ? "rotate:-90deg" : "rotate:90deg"}"><path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/></svg>`;
    const btnLabel = mk("span", "display:flex;align-items:center;gap:0.4em;", btn, BTN ? `<span>${BTN.replace(/[<>&]/g, "")}</span>${C === "email" ? arrow : ""}` : arrow);
    const spinner = mk("div", `position:absolute;left:50%;top:50%;width:${(bH * 0.46).toFixed(1)}px;height:${(bH * 0.46).toFixed(1)}px;margin:${(-bH * 0.23).toFixed(1)}px 0 0 ${(-bH * 0.23).toFixed(1)}px;border-radius:50%;box-sizing:border-box;border:${Math.max(2, 3 * k).toFixed(1)}px solid color-mix(in srgb, var(--x-accent-ink) 30%, transparent);border-top-color:var(--x-accent-ink);opacity:0;`, btn);
    const flash = mk("div", `position:absolute;inset:0;border-radius:var(--x-radius-s);background:var(--x-accent-ink);opacity:0;`, btn);

    // the submitted state: a veil of the bar's own colour over it (the bar itself never changes opacity)
    const dimmer = mk("div", `position:absolute;inset:0;border-radius:var(--x-radius-s);background:${bg};display:none;`, wrap);

    // chips that rise after the submit
    const nChips = Math.round(ML.clamp(p.chips_after, 0, 6));
    const CH = rtl ? ["إعلان ١", "قصة", "منشور", "فيديو قصير", "بانر", "ريلز"] : ["12 ads", "Story", "Post", "Short", "Banner", "Reel"];
    const chipRow = nChips ? mk("div", `position:absolute;top:${(H + 22 * k).toFixed(1)}px;left:0;right:0;display:flex;flex-wrap:wrap;justify-content:center;gap:${(12 * k).toFixed(1)}px;`, wrap) : null;
    const chips = Array.from({ length: nChips }, (_, i) => mk("span", `padding:${(10 * k).toFixed(1)}px ${(20 * k).toFixed(1)}px;border-radius:var(--x-radius-s);background:${bg};border:var(--x-edge) solid ${edge};box-shadow:var(--x-shadow);font:500 ${(fs * 0.8).toFixed(1)}px var(--x-body-font);color:${fg};`, chipRow, CH[i]));

    // timing (R.fake): enter at `at`, type from +0.35, press after the last char, flash, leave at the end
    const chars = Array.from(value);
    const tType = at + 0.35;
    const cps = ML.clamp(p.chars_per_s, 12, 40);
    const gaps = chars.map((c, i) => (1 / cps) * (0.6 + 0.8 * ML.rnd(i, 7)) + (/[,،.]/.test(c) ? 0.14 : 0));
    const room = Math.max(0.4, end - 1.1 - tType - (nChips ? 0.4 : 0));
    const total = gaps.reduce((a, b) => a + b, 0), kT = total > room ? room / total : 1;
    const times = []; let acc = tType; for (const g of gaps) { acc += g * kT; times.push(acc); }
    const tDone = times.length ? times[times.length - 1] : tType;
    const tPress = tDone + (p.button_reaction === "press" || p.button_reaction === "flash" ? 0.18 : 0.42);
    const tSub = tPress + 0.25;
    for (let i = 0, last = -1; i < times.length; i++) if (times[i] - last > 0.24) { ctx.sfx(times[i], "key", 0.2); last = times[i]; }
    ctx.sfx(at, "whoosh.soft", 0.16);
    ctx.sfx(tPress - 0.01, "click", 0.45);
    if (nChips) ctx.sfx(tSub + 0.1, "pop.soft", 0.2);
    // how far the line must scroll for each typed count (measured once here, so a frame never reads layout)
    const over = chars.map(() => 0);
    if (chars.length) {
      const fw = field.clientWidth;
      typedEl.textContent = value;
      if (line.scrollWidth > fw) for (let i = 0; i <= chars.length; i++) { typedEl.textContent = chars.slice(0, i).join(""); over[i] = Math.max(0, line.scrollWidth - fw); }
      typedEl.textContent = "";
    }
    const backOut = (x, c = 1.8) => { const y = x - 1; return 1 + (c + 1) * y * y * y + c * y * y; };
    // LTR scrolls left; Arabic in an RTL bar scrolls right; a Latin value in an RTL bar hangs from the right edge, its
    // newest letters already in view, so it needs no scroll at all
    const sign = !rtl ? -1 : latin ? 0 : 1;
    return {
      draw(t) {
        // enter / leave
        const ex = ML.lin(t, end - 0.3, end);
        const u = ML.lin(t, at, at + 0.4);
        let o = 1, y = 0, s = 1;
        if (p.enter === "rise") { o = Math.min(1, u * 1.8); y = (1 - backOut(u)) * 30 * k * 1.6; s = 0.94 + 0.06 * backOut(u); }
        else if (p.enter === "fade-scale") { const v = ML.out(t, at, at + 0.38); o = v; s = 0.95 + 0.05 * v; }
        else o = t >= at ? 1 : 0;
        const push = p.camera_push_after ? ML.ease(t, tPress + 0.05, tPress + 0.9) : 0;
        wrap.style.opacity = (o * (1 - ex)).toFixed(4);
        wrap.style.translate = `0 ${(y - ex * 30 * k * 1.6).toFixed(2)}px`;
        const ws = s * (1 + 0.15 * push);
        wrap.style.scale = Math.abs(ws - 1) < 1e-4 ? "none" : ws.toFixed(4);
        const pb = push * (1 - push) * 4 * 2.5 * k;
        wrap.style.filter = pb > 0.05 ? `blur(${pb.toFixed(2)}px)` : "none";
        // focus
        const fo = ML.lin(t, at + 0.3, at + 0.6) * (1 - ML.lin(t, tSub, tSub + 0.3));
        ringEl.style.borderColor = `color-mix(in srgb, var(--x-accent) ${(22 * fo).toFixed(2)}%, transparent)`;
        if (glow) glow.style.opacity = (0.6 * fo).toFixed(4);
        // typing
        let n = 0; while (n < times.length && t >= times[n]) n++;
        typedEl.textContent = chars.slice(0, n).join("");
        ph.style.opacity = (1 - ML.lin(t, tType - 0.28, tType - 0.14)).toFixed(4);
        if (pre) pre.style.opacity = ML.lin(t, tType - 0.14, tType).toFixed(4); // the placeholder clears, then the prefix takes its place
        const typing = t >= tType && t < tDone + 0.05;
        caret.style.opacity = t < tType - 0.05 || t > tSub ? "0" : typing ? "1" : String(ML.blink(t - tDone, 0.5));
        const overflow = over[n] || 0;
        line.style.translate = `${(sign * overflow).toFixed(1)}px 0`;
        // the button
        const R2 = p.button_reaction;
        const en = R2 === "enable-then-press" ? ML.lin(t, tDone, tDone + 0.25) : 1;
        btn.style.background = en >= 1 ? "var(--x-accent)" : `color-mix(in srgb, var(--x-accent) ${(en * 100).toFixed(1)}%, ${dark ? "color-mix(in srgb, var(--x-panel) 22%, transparent)" : "var(--x-line)"})`;
        const gl = R2 === "glow-then-press" ? ML.lin(t, tDone, tDone + 0.25) * (1 - ML.lin(t, tSub, tSub + 0.4)) : 0;
        btn.style.boxShadow = gl > 0.01 ? `0 0 ${(22 * k).toFixed(1)}px ${(4 * k).toFixed(1)}px color-mix(in srgb, var(--x-accent) ${(gl * 70).toFixed(1)}%, transparent)` : "none";
        let bs = 1;
        if (R2 === "pulse") bs += 0.06 * Math.max(0, Math.sin(Math.PI * 2 * ML.clamp((t - tDone) / 0.42 * 1, 0, 1)));
        bs -= 0.08 * (t < tPress ? 0 : t < tPress + 0.04 ? ML.lin(t, tPress, tPress + 0.04) : 1 - ML.out(t, tPress + 0.1, tPress + 0.24));
        btn.style.scale = Math.abs(bs - 1) < 1e-4 ? "none" : bs.toFixed(4);
        flash.style.opacity = R2 === "flash" ? (0.7 * ML.pulse(t, tPress + 0.02, 0.03, 0.15)).toFixed(4) : (0.25 * ML.pulse(t, tPress + 0.02, 0.03, 0.12)).toFixed(4);
        // submitted
        const sub = ML.lin(t, tSub, tSub + 0.3);
        if (p.after === "spinner") {
          btnLabel.style.opacity = (1 - sub).toFixed(4);
          spinner.style.opacity = sub.toFixed(4);
          spinner.style.display = sub > 0 ? "block" : "none";
          spinner.style.rotate = `${(((t - tSub) * 360 * 1.4) % 360).toFixed(1)}deg`;
        } else {
          btnLabel.style.opacity = "1"; spinner.style.opacity = "0"; spinner.style.display = "none";
        }
        const dv = p.after === "dim" ? 0.6 * sub : 0;
        dimmer.style.display = dv > 0 ? "block" : "none";
        dimmer.style.opacity = dv.toFixed(4);
        chips.forEach((c, i) => {
          const s0 = tSub + 0.05 + i * 0.06, q = ML.out(t, s0, s0 + 0.3);
          c.style.opacity = q.toFixed(4);
          c.style.translate = `0 ${((1 - q) * 8 * k * 1.6).toFixed(2)}px`;
        });
      },
    };
  },
});
