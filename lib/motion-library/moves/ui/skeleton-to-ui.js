// Stepped skeleton blocks resolve into page UI: a website hero builds — the nav fades in first, dark placeholder bars
// wipe in from the reading edge (0.3 s each, stepped rows each 8 px shorter in "stepped"), the headline decodes out of
// code glyphs (]_*01<>{}[ — Latin letter by letter; Arabic word by word, a word never broken into its letters), then
// the bars resolve: the CTA bar shrinks / grows to the button's width (scaleX-like, 0.3 s power3.out) and becomes the
// real button, and the paragraph's block gives way to the real copy line by line (stagger 0.08 s).
// Styles: stepped (one accent-dark block whose trailing edge is a coarse stair, each step 2.5 % of the page shorter; its edge sweeps along
// the lines, the copy appearing behind it), shimmer (bars carry a moving light band), solid (even flat bars); those two
// crossfade into the copy.
// Rebuilt as our own code from a prompt-motion reference (jayscambler "credit to opus" — FundMyCompute hero).
ML.define({
  id: "ui.skeleton-to-ui",
  category: "ui",
  name: "Stepped skeleton blocks resolve into page UI",
  does: "A website hero appears with its headline decoding and dark stair-stepped placeholder bars that turn into the real button and body copy.",
  says: ["tech", "reveal", "step"],
  energy: 2,
  targets: ["screen"],
  duration: [1, 2.5],
  params: {
    style: { type: "choice", options: ["stepped", "shimmer", "solid"], default: "stepped" },
    headline: { type: "text" },
    body: { type: "text" },
    cta: { type: "text" },
    brand: { type: "text" },
    decode: { type: "number", range: [0.3, 1.2], default: 0.6, unit: "s" },
  },
  pairs: ["text-in.scramble", "ui.cta-button-rise", "ui.skeleton-shimmer"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:jayscambler-credit-to-opus-5-5", license: "reference", note: "our own rebuild of the skeleton-to-hero beat" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;

    // the page: inside the screen target, else a browser-like panel in the picture region
    let page, W;
    if (el) {
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      W = el.clientWidth || f.pic.w;
      page = mk("div", `position:absolute;inset:0;overflow:hidden;background:var(--x-panel);border-radius:inherit;z-index:4;`, el);
    } else {
      const R = f.pic, w = Math.round(Math.min(R.w, f.wide ? 1300 : R.w)), h = Math.round(Math.min(R.h * 0.92, w * (f.wide ? 0.6 : 1.1)));
      W = w;
      page = mk("div", `position:absolute;left:${Math.round(R.x + (R.w - w) / 2)}px;top:${Math.round(R.y + (R.h - h) / 2)}px;width:${w}px;height:${h}px;overflow:hidden;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * 0.6);box-shadow:0 0 0 1px var(--x-line);z-index:4;`, ctx.scene || ctx.stage);
    }
    page.dir = rtl ? "rtl" : "ltr";
    const k = (W / 1000) * (W < 1100 ? 1.5 : 1); // a narrow page reads bigger: small type dies on a phone
    const px = (v) => Math.round(v * k) + "px";
    const pad = 54;

    // nav
    const nav = mk("div", `position:absolute;left:${px(pad)};right:${px(pad)};top:${px(30)};display:flex;align-items:center;gap:${px(28)};font:500 ${px(17)} var(--x-body-font);color:var(--x-dim);`, page);
    const logo = mk("div", `display:flex;align-items:center;gap:${px(10)};font:700 ${px(20)} var(--x-head-font);color:var(--x-ink);margin-inline-end:${px(18)};white-space:nowrap;`, nav);
    mk("span", `width:${px(22)};height:${px(20)};background:var(--x-accent);clip-path:polygon(0 30%,20% 0,50% 20%,80% 0,100% 30%,100% 55%,50% 100%,0 55%);`, logo);
    logo.append(p.brand || (rtl ? "ادعمني" : "FundMyCompute"));
    const links = (rtl ? ["اكتشف", "ابنِ", "النماذج", "القصّة"] : ["Discover", "Building", "Models", "Story"]).map((x) => mk("span", "white-space:nowrap;", nav, x));
    mk("span", "flex:1;", nav);
    mk("span", `padding:${px(8)} ${px(14)};border-radius:${px(6)};background:var(--x-ink);color:var(--x-panel);white-space:nowrap;`, nav, rtl ? "أنشئ مشروع" : "Create Project");
    while (links.length && nav.scrollWidth > nav.clientWidth + 1) links.pop().remove();

    // headline (decodes)
    const headText = p.headline || (rtl ? "ادعم فكرتك من أول يوم" : "Get supported for your ideas");
    const head = mk("div", `position:absolute;left:${px(pad)};right:${px(pad)};top:${px(110)};font:var(--x-head-weight) ${px(W < 1100 ? 62 : 74)}/1.08 var(--x-head-font);letter-spacing:var(--x-head-track);color:var(--x-ink);`, page);
    const GLYPH = "]_*01<>{}[/";
    const units = []; // Latin: one unit per letter; Arabic: one unit per word
    for (const [wi, w] of headText.split(/\s+/).filter(Boolean).entries()) {
      if (wi) head.append(" ");
      const ws = mk("span", "display:inline-block;white-space:pre;", head);
      if (ML.ARABIC.test(w)) units.push({ el: mk("span", "", ws, w), real: w, len: Math.max(2, Math.round(Array.from(w).length * 0.8)), word: true });
      else for (const ch of Array.from(w)) units.push({ el: mk("span", "display:inline-block;", ws, ch), real: ch, len: 1, word: false });
    }
    units.forEach((u) => { u.el.style.display = "inline-block"; u.el.style.whiteSpace = "pre"; u.w = u.el.offsetWidth; u.el.style.width = u.w + "px"; u.el.style.overflow = "visible"; u.el.style.textAlign = "center"; });
    const headBottom = head.offsetTop + head.offsetHeight;

    // the body copy and its bars
    const bodyText = p.body || (rtl ? "اربط مشروعك بأقوى النماذج من مكان واحد. شارك اللي بتبنيه وخلّي الناس تساعدك في تكلفة الحوسبة." : "Connect your project to AI models through one AI router. Share what you're building and let people help cover the compute.");
    const bodyTop = Math.round(headBottom + 28 * k);
    const lineH = Math.round(19 * 1.5 * k);
    const bodyW = Math.min(W - pad * 2 * k, (W < 1100 ? 640 : 520) * k);
    const body = mk("div", `position:absolute;${rtl ? "right" : "left"}:${px(pad)};top:${bodyTop.toFixed(1)}px;width:${bodyW.toFixed(1)}px;font:400 ${px(19)}/${lineH}px var(--x-body-font);color:var(--x-dim);`, page);
    // split the copy into its laid-out lines (words measured where they land)
    const words = bodyText.split(/\s+/).filter(Boolean).map((w, i) => { if (i) body.append(" "); return mk("span", "", body, w); });
    const lines = [];
    words.forEach((w) => { const y = Math.round(w.offsetTop); let L = lines.find((l) => Math.abs(l.y - y) < 3); if (!L) { L = { y, words: [] }; lines.push(L); } L.words.push(w); });
    body.textContent = "";
    const lineEls = lines.map((L) => mk("div", "white-space:nowrap;", body, L.words.map((w) => w.textContent).join(" ")));

    // CTA row
    const ctaTop = Math.round(bodyTop + lineEls.length * lineH + 26 * k);
    const row = mk("div", `position:absolute;${rtl ? "right" : "left"}:${px(pad)};top:${ctaTop}px;height:${px(46)};display:flex;align-items:stretch;gap:${px(22)};`, page);
    const btnWrap = mk("div", `position:relative;height:${px(46)};`, row);
    const ctaText = (p.cta || (rtl ? "أنا ببني حاجة" : "I'm Building Something")) + (rtl ? " ←" : " →");
    // the button: one element that is first the placeholder bar, then morphs into the button (width, colour, radius)
    const btn = mk("div", `position:absolute;top:0;bottom:0;${rtl ? "right" : "left"}:0;display:flex;align-items:center;justify-content:center;overflow:hidden;color:transparent;font:600 ${px(17)} var(--x-body-font);white-space:nowrap;`, btnWrap);
    const btnLabel = mk("span", `padding:0 ${px(20)};`, btn, ctaText);
    const btnW = Math.ceil(btnLabel.offsetWidth);
    btnWrap.style.width = btnW + "px";
    const second = mk("span", `display:flex;align-items:center;font:500 ${px(17)} var(--x-body-font);color:var(--x-ink);white-space:nowrap;`, row, rtl ? "دوّر على مشروع" : "Find a Project");

    // our own page hugs its content
    if (!el) {
      const R = f.pic, h = Math.round(Math.min(R.h, ctaTop + 46 * k + 64 * k));
      page.style.height = h + "px";
      page.style.top = Math.round(R.y + (R.h - h) / 2) + "px";
    }

    // placeholder bars, one layer over the copy + button
    const dark = "color-mix(in srgb, var(--x-accent) 55%, var(--x-device))";
    const barColor = p.style === "solid" ? "color-mix(in srgb, var(--x-ink) 14%, var(--x-panel))" : dark;
    const shimmer = p.style === "shimmer";
    const barBg = shimmer ? `linear-gradient(110deg, ${barColor} 30%, color-mix(in srgb, ${barColor} 55%, var(--x-panel)) 50%, ${barColor} 70%) 0 0 / 300% 100%` : barColor;
    const stepped = p.style === "stepped";
    // the copy's widest line: the block covers it, and each line's reveal runs the block's whole width
    const inkW = (le) => { le.style.display = "inline-block"; const w = le.offsetWidth; le.style.display = "block"; return w; };
    const blockW = Math.max(...lineEls.map(inkW));
    lineEls.forEach((le) => { le.style.width = blockW + "px"; });
    const bars = lineEls.map((le, i) => {
      const b = mk("div", `position:absolute;${rtl ? "right" : "left"}:${px(pad)};top:${(bodyTop + i * lineH).toFixed(1)}px;width:${blockW}px;height:${lineH}px;`, page);
      b.fills = stepped
        ? [0, 1].map((j) => mk("div", `width:${Math.max(blockW * 0.4, blockW - (i * 2 + j) * W * 0.025).toFixed(1)}px;height:${(lineH / 2 + (j < 1 ? 0.5 : 0)).toFixed(2)}px;margin-bottom:${j < 1 ? "-0.5px" : 0};background:${barBg};`, b))
        : [mk("div", `position:relative;top:${(lineH * 0.18).toFixed(1)}px;width:${(blockW * (0.92 - (i % 2) * 0.12)).toFixed(1)}px;height:${(lineH * 0.64).toFixed(1)}px;background:${barBg};border-radius:${px(4)};`, b)];
      return b;
    });
    // the CTA bar starts wider than the button, a stair of blocks in "stepped"
    const ctaBarW = Math.round(Math.max(btnW * 1.35, 240 * k));
    const stairClip = rtl ? "polygon(0 0,100% 0,100% 100%,30% 100%,30% 66%,15% 66%,15% 33%,0 33%)" : "polygon(0 0,100% 0,100% 33%,85% 33%,85% 66%,70% 66%,70% 100%,0 100%)";
    btn.style.zIndex = "1";

    // timing
    const span = Math.max(1, end - at);
    const tNav = at, tBars = at + 0.12;
    const tDec0 = at + 0.2, tDec1 = Math.min(tDec0 + p.decode, at + span * 0.55);
    const tRes = tDec1 + 0.05;
    
    const doneAt = units.map((u, i) => tDec0 + ((i + 1) / units.length) * (tDec1 - tDec0));
    ctx.sfx(tBars, "tap", 0.2);
    ctx.sfx(tRes, "pop.soft", 0.35);
    const step = 0.06;
    const sweep = Math.min(0.35, Math.max(0.15, end - 0.2 - tRes - lineEls.length * 0.08));
    const glyph = (i, n, t) => { let s = ""; for (let j = 0; j < n; j++) s += GLYPH[Math.floor(ML.rnd(i * 7 + j, Math.floor(t * 18)) * GLYPH.length)]; return s; };
    const ctaRes = tRes + Math.min(0.12, lineEls.length * 0.08);

    // opacity without leftovers: hidden at 0, unset at 1 (so a settled frame is drawn the same whatever came before)
    const op = (e, v) => { e.style.visibility = v <= 0.0001 ? "hidden" : "visible"; e.style.opacity = v >= 0.9999 ? "" : v.toFixed(4); };
    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.2, end);
        const po = t < at ? 0 : ML.lin(t, at, at + 0.12) * (1 - leave);
        page.style.visibility = po <= 0 ? "hidden" : "visible";
        page.style.opacity = po >= 1 ? "" : po.toFixed(4);
        // repaint the whole page every frame (a settled frame then rasters the same whatever frame came before)
        page.style.backgroundImage = "linear-gradient(transparent, transparent)";
        page.style.backgroundPosition = `${(t * 1000 % 7).toFixed(3)}px 0`;
        // nav first
        const n = ML.out(t, tNav, tNav + 0.3);
        op(nav, n);
        nav.style.translate = `0 ${((1 - n) * -8 * k).toFixed(2)}px`;
        // headline: unresolved units show code glyphs, resolve in reading order
        units.forEach((u, i) => {
          const txt = t < tDec0 - 0.05 + i * 0.004 ? "" : t >= doneAt[i] ? u.real : glyph(i, u.len, t);
          if (u.el.textContent !== txt) u.el.textContent = txt;
          u.el.style.color = t >= doneAt[i] ? "" : "var(--x-accent)";
        });
        // body bars wipe in, then give way to the copy line by line
        bars.forEach((b, i) => {
          const w = ML.out(t, tBars + i * step, tBars + i * step + 0.3);
          const g = stepped ? ML.ease(t, tRes + i * 0.08, tRes + i * 0.08 + sweep) : ML.out(t, tRes + i * 0.08, tRes + i * 0.08 + 0.25);
          const tail = ((1 - w) * 100).toFixed(2), head = ((stepped ? g : 0) * 100).toFixed(2);
          b.style.clipPath = rtl ? `inset(0 ${head}% 0 ${tail}%)` : `inset(0 ${tail}% 0 ${head}%)`;
          op(b, w <= 0 || g >= 1 ? 0 : stepped ? 1 : 1 - g);
          if (shimmer) b.fills[0].style.backgroundPosition = `${(100 - ((t * 70) % 100)).toFixed(2)}% 0`;
          if (stepped) {
            // the copy appears behind the block's sweeping edge
            op(lineEls[i], g > 0 ? 1 : 0);
            const r = ((1 - g) * 100).toFixed(2);
            lineEls[i].style.clipPath = g >= 1 ? "none" : rtl ? `inset(-20% 0 -20% ${r}%)` : `inset(-20% ${r}% -20% 0)`;
          } else {
            op(lineEls[i], g);
            lineEls[i].style.translate = `0 ${((1 - g) * 6 * k).toFixed(2)}px`;
          }
        });
        // CTA bar: wipes in, then its width goes to the button's (power3.out 0.3 s) and it hands over to the button
        const cw = ML.out(t, tBars + 0.1, tBars + 0.4);
        const m = ML.out(t, tRes, tRes + 0.3);
        const width = ctaBarW + (btnW - ctaBarW) * m;
        btn.style.width = Math.round(width) + "px";
        btn.style.clipPath = m > 0 || p.style !== "stepped" ? (cw >= 1 ? "none" : (rtl ? `inset(0 0 0 ${((1 - cw) * 100).toFixed(2)}%)` : `inset(0 ${((1 - cw) * 100).toFixed(2)}% 0 0)`)) : cw >= 1 ? stairClip : (rtl ? `inset(0 0 0 ${((1 - cw) * 100).toFixed(2)}%)` : `inset(0 ${((1 - cw) * 100).toFixed(2)}% 0 0)`);
        btn.style.borderRadius = p.style === "stepped" ? `${Math.round(6 * k * m)}px` : px(6);
        const hand = ML.lin(t, tRes + 0.1, tRes + 0.3);
        btn.style.background = hand >= 1 ? "var(--x-accent)" : shimmer && hand <= 0 ? barBg : `color-mix(in srgb, var(--x-accent) ${(hand * 100).toFixed(1)}%, ${barColor})`;
        if (shimmer && hand <= 0) btn.style.backgroundPosition = `${(100 - ((t * 70) % 100)).toFixed(2)}% 0`;
        btn.style.color = hand >= 1 ? "var(--x-accent-ink)" : `color-mix(in srgb, var(--x-accent-ink) ${(ML.lin(t, tRes + 0.2, tRes + 0.34) * 100).toFixed(1)}%, transparent)`;
        btn.style.visibility = cw <= 0 ? "hidden" : "visible";
        const s2 = ML.out(t, ctaRes + 0.1, ctaRes + 0.4);
        op(second, s2);
      },
    };
  },
});
