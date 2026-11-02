// Grid clears to one hero card with a multiplier: a grid of content cards (thumbnail, title, meta row) sits on the
// stage; the non-winners fade out (0.3 s); the winner flies from its slot to centre-left (FLIP, 0.6 s expo.inOut)
// growing ~1.6×; beside it a large light-weight counter at 40 % ink counts up (0.8 s) — "1x" → "12x", or views, or a
// percent — and a caption line fades in above with word contrast (lead words dim, the last words full ink).
// Sharp: the card is laid out at its hero size and scaled down in the grid (never above 1).
// Source: prompt-motion "reyzostyle-opus-5-5-literally-one" (reference only — rebuilt as our own code).
ML.define({
  id: "ui.winner-isolate",
  category: "ui",
  name: "Grid clears to one hero card with multiplier",
  does: "Everything else fades away; a single winning card sits centre-left with a big '1x'-style multiplier counting beside it and a caption above.",
  says: ["result", "proof", "focus"],
  energy: 3,
  targets: ["card", "number"],
  duration: [1.8, 3],
  params: {
    counter: { type: "choice", options: ["multiplier", "views", "percent"], default: "multiplier" },
    side: { type: "choice", options: ["left", "center"], default: "left" },
    value: { type: "number", range: [2, 100], default: 12 },
    winner: { type: "number", range: [0, 7], default: 4 },
    grow: { type: "number", range: [1.3, 1.8], default: 1.6 },
    caption: { type: "text", default: "" },
  },
  pairs: ["data.count-up", "camera.push-in", "text-emphasis.accent-word"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "prompt-motion:reyzostyle-opus-5-5-literally-one", license: "reference", note: "technique rebuilt as our own code: fade 0.3 s, FLIP 0.6 s expo.inOut ×1.6, light counter 0.8 s, caption word contrast" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const inEl = ctx.el && ctx.el !== ctx.stage && ctx.box(ctx.el).w > f.W * 0.4 && ctx.box(ctx.el).h > f.H * 0.2;
    const R = inEl ? ctx.box(ctx.el) : f.pic;
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;`, host);
    // a ground under the grid: whatever the region held clears away with the other cards
    const back = mk("div", `position:absolute;inset:0;border-radius:var(--x-radius);background:var(--x-ground);`, layer);
    const W = R.w, H = R.h, tall = H > W * 0.95;
    const expoIO = (t, a, b) => { const x = ML.lin(t, a, b); return x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2; };

    // the grid
    const cols = tall ? 2 : 4, rows = tall ? 3 : 2, n = cols * rows, g = Math.min(W, H) * 0.03;
    const capH = H * (tall ? 0.12 : 0.16);
    const gw = (W - g * (cols - 1)) / cols, gh = (H - g * (rows - 1)) / rows;
    const cardAspect = 0.78; // width / height of a card (thumbnail + text)
    const cw = Math.min(gw, gh * cardAspect), ch = cw / cardAspect;
    const slot = (i) => { const c = i % cols, r = Math.floor(i / cols); const ox = (W - (cols * cw + (cols - 1) * g)) / 2, x = ox + c * (cw + g); return { x: rtl ? W - x - cw : x, y: r * (gh + g) + (gh - ch) / 2, w: cw, h: ch }; };
    // the hero rect: ~grow× the grid card, centre-left (or centre), under the caption band
    const grow = ML.clamp(p.grow, 1.3, 1.8);
    let hw = cw * grow, hh = ch * grow;
    // centred, the counter sits under the card: its band comes out of the card's room
    const center = p.side === "center", band = center ? H * 0.16 * 1.41 : 0, roomH = H - capH - g - band;
    const fitK = Math.min(1, roomH / hh, (p.side === "center" ? W * 0.9 : W * (tall ? 0.62 : 0.5)) / hw);
    hw *= fitK; hh *= fitK;
    const heroY = capH + (roomH + g - hh) / 2;
    let heroX = p.side === "center" ? (W - hw) / 2 : W * (tall ? 0.04 : 0.1);
    if (rtl && p.side !== "center") heroX = W - heroX - hw;
    const hero = { x: heroX, y: Math.max(capH, heroY), w: hw, h: hh };

    // card content, laid out at hero size, scaled down to its rect
    const titles = rtl ? ["كيف ضاعفت مبيعاتي", "روتين الصباح", "خمس أدوات مجانية", "سر الفيديو الناجح", "أسهل وصفة في ١٠ دقائق", "جولة في المكتب", "قبل وبعد", "أخطاء المبتدئين"]
      : ["How I doubled sales", "My morning routine", "5 free tools", "Why this one worked", "The 10-minute recipe", "Studio tour", "Before and after", "Beginner mistakes"];
    const views = rtl ? ["١٢ ألف", "٨ آلاف", "١٥ ألف", "٩ آلاف", "١٫٤ مليون", "١١ ألف", "٧ آلاف", "١٣ ألف"] : ["12K", "8.1K", "15K", "9.4K", "1.4M", "11K", "7.2K", "13K"];
    const winner = Math.round(ML.clamp(p.winner, 0, n - 1));
    // the counter: its kind's format, or the target's own number (prefix, digits and suffix kept)
    const kind = p.counter;
    const V = Math.round(ML.clamp(p.value, 2, 100));
    const AR = "٠١٢٣٤٥٦٧٨٩";
    const digits = (s) => (rtl ? String(s).replace(/\d/g, (d) => AR[+d]).replace(/\./g, "٫") : String(s));
    const own = ctx.el && ctx.el !== ctx.stage && !ctx.el.children.length ? ctx.el.textContent.trim().match(/^(\D*?)([\d٠-٩][\d٠-٩,٬.٫]*)(\D*)$/) : null;
    const ownV = own ? own[2].replace(/[٠-٩]/g, (d) => String(AR.indexOf(d))).replace(/٫/g, ".").replace(/[,٬]/g, "") : "";
    const fmtV = (u) => {
      if (own) {
        const dec = (ownV.split(".")[1] || "").length, s = (parseFloat(ownV) * u).toFixed(dec);
        const c = /[,٬]/.test(own[2]) ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : s;
        return own[1] + (/[٠-٩]/.test(own[2]) ? c.replace(/\d/g, (d) => AR[+d]).replace(/,/g, "٬").replace(/\./g, "٫") : c) + own[3];
      }
      if (kind === "views") { const m = 0.1 + (V / 10 - 0.1) * u; return digits(m.toFixed(1)) + (rtl ? " مليون" : "M"); }
      if (kind === "percent") return "+" + digits(Math.round(V * 10 * u)) + (rtl ? "٪" : "%");
      return digits(Math.max(1, Math.round(1 + (V - 1) * u))) + (rtl ? "×" : "x");
    };
    // the winner shows the winning title and the top views, whichever slot it takes (and the counter's own views)
    [titles[winner], titles[4]] = [titles[4], titles[winner]];
    [views[winner], views[4]] = [views[4], views[winner]];
    if (kind === "views" && !own) views[winner] = fmtV(1);
    const cards = Array.from({ length: n }, (_, i) => {
      const w = mk("div", `position:absolute;left:0;top:0;width:calc(var(--u) * 100);height:calc(var(--u) * ${(100 * hh / hw).toFixed(3)});--u:${hw / 100}px;`, layer);
      const c = mk("div", `position:absolute;inset:0;box-sizing:border-box;padding:calc(var(--u) * 3.5);border-radius:calc(var(--x-radius) * 0.6);background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);display:flex;flex-direction:column;gap:calc(var(--u) * 3.0);font-family:var(--x-body-font);color:var(--x-ink);overflow:hidden;`, w);
      const th = mk("div", `position:relative;flex:none;aspect-ratio:4 / 3;border-radius:calc(var(--x-radius) * 0.4);background:linear-gradient(${110 + i * 41}deg, color-mix(in srgb, var(--x-accent) ${30 + ML.rnd(i, 2) * 50}%, var(--x-panel-2)), color-mix(in srgb, var(--x-accent-2) ${30 + ML.rnd(i, 5) * 50}%, var(--x-panel)));overflow:hidden;`, c);
      mk("i", `position:absolute;left:50%;top:50%;width:calc(var(--u) * 14.0);height:calc(var(--u) * 14.0);margin:calc(var(--u) * -7.0) 0 0 calc(var(--u) * -7.0);border-radius:50%;background:color-mix(in srgb, var(--x-panel) 85%, transparent);`, th);
      mk("i", `position:absolute;left:50%;top:50%;width:0;height:0;margin:calc(var(--u) * -3.0) 0 0 calc(var(--u) * -1.5);border-style:solid;border-width:calc(var(--u) * 3.0) 0 calc(var(--u) * 3.0) calc(var(--u) * 5.0);border-color:transparent transparent transparent var(--x-accent);`, th);
      mk("div", `font:var(--x-head-weight) calc(var(--u) * 7.2)/1.2 var(--x-head-font);letter-spacing:-0.01em;`, c, titles[i % titles.length]);
      const meta = mk("div", `display:flex;align-items:center;gap:calc(var(--u) * 3.0);font-size:calc(var(--u) * 5.2);color:var(--x-dim);margin-top:auto;`, c);
      mk("i", `width:calc(var(--u) * 7.0);height:calc(var(--u) * 7.0);border-radius:50%;flex:none;background:color-mix(in srgb, var(--x-accent) ${40 + i * 7}%, var(--x-panel-2));`, meta);
      mk("span", "", meta, (rtl ? "مشاهدة " : "") + views[i % views.length] + (rtl ? "" : " views"));
      return { w, slot: slot(i) };
    });

    // the counter and the caption
    let numSize = center ? H * 0.16 : Math.min(hh * 0.55, W * (tall ? 0.24 : 0.2));
    const num = mk("div", `position:absolute;font:300 ${numSize}px/1 var(--x-head-font);letter-spacing:-0.04em;color:color-mix(in srgb, var(--x-ink) 40%, transparent);white-space:nowrap;font-variant-numeric:tabular-nums;will-change:opacity, translate;`, layer, fmtV(1));
    // shrinks to the room beside (or under) the card, so a long counter never runs over it
    const numRoom = center ? W : rtl ? hero.x - g * 1.5 : W - hero.x - hw - g * 1.5;
    if (num.offsetWidth > numRoom) { numSize *= numRoom / num.offsetWidth; num.style.fontSize = numSize + "px"; }
    const numW = Math.ceil(num.offsetWidth), numH = num.offsetHeight;
    // its box keeps the final width: while it counts, the figure stays anchored on the card's side
    num.style.width = numW + "px"; num.style.textAlign = center ? "center" : "start";
    if (center) { num.style.left = (W - numW) / 2 + "px"; num.style.top = hero.y + hh + g * 0.4 + "px"; }
    else { num.style.left = (rtl ? hero.x - g * 1.5 - numW : hero.x + hw + g * 1.5) + "px"; num.style.top = hero.y + (hh - numH) / 2 + "px"; }
    const sub = mk("div", `position:absolute;font:var(--x-label-weight) ${numSize * 0.16}px ${rtl ? "var(--x-body-font)" : "var(--x-label-font)"};letter-spacing:${rtl ? 0 : "0.14em"};text-transform:var(--x-label-case);color:var(--x-dim);white-space:nowrap;`, layer, own ? "" : rtl ? (kind === "views" ? "مشاهدة" : kind === "percent" ? "نمو" : "فوق المتوسط") : kind === "views" ? "views" : kind === "percent" ? "growth" : "above average");
    sub.style.left = (p.side === "center" ? (W - sub.offsetWidth) / 2 : rtl ? parseFloat(num.style.left) + numW - sub.offsetWidth : parseFloat(num.style.left)) + "px";
    sub.style.top = parseFloat(num.style.top) + numH + "px";
    const capText = p.caption || (rtl ? "نتائج مثبتة، مش تخمين." : "Proven outliers, not guesses.");
    const cap = mk("div", `position:absolute;left:0;top:0;width:${W}px;height:${capH}px;display:flex;align-items:center;justify-content:${p.side === "center" ? "center" : "flex-start"};padding-inline-start:${p.side === "center" ? 0 : hero.x * (rtl ? 0 : 1)}px;box-sizing:border-box;font:var(--x-head-weight) ${Math.min(capH * 0.42, W * 0.05)}px/1.1 var(--x-head-font);letter-spacing:-0.02em;color:var(--x-ink);`, layer);
    const capIn = mk("span", "", cap, capText);
    if (rtl && p.side !== "center") cap.style.paddingInlineStart = W - hero.x - hw + "px";
    const cw2 = ML.split(capIn, "words");
    const lead = Math.max(1, Math.ceil(cw2.length / 2));
    cw2.forEach((w, i) => { if (i < lead) w.style.color = "var(--x-dim)"; });

    // times
    // the grid holds long enough to be read, the counter finishes before the leave at end − 0.25
    const T0 = at, clear = at + ML.clamp((end - 0.25 - at) * 0.28, 0.35, 0.9), gridStag = Math.max(0, Math.min(0.03, (clear - at - 0.3) / n));
    const fly = clear + 0.12, land = fly + 0.6, countA = land - 0.1, capA = land - 0.05, countD = ML.clamp(end - 0.35 - countA, 0.3, 0.8);
    ctx.sfx(clear, "whoosh.soft", 0.3);
    ctx.sfx(land - 0.04, "hit", 0.5);
    ctx.sfx(countA + countD, "blip", 0.25);

    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.22);
        layer.style.opacity = (1 - leave).toFixed(4);
        if (own && !inEl) ctx.el.style.opacity = t >= at ? "0" : "1"; // the target's number moved into the counter
        back.style.opacity = ML.out(t, T0, T0 + 0.3).toFixed(4);
        cards.forEach((c, i) => {
          const s = c.slot;
          let r = s, o = ML.out(t, T0 + i * gridStag, T0 + i * gridStag + 0.3), z = 1;
          if (i === winner) { const u = expoIO(t, fly, land); r = { x: s.x + (hero.x - s.x) * u, y: s.y + (hero.y - s.y) * u, w: s.w + (hero.w - s.w) * u }; z = 3; }
          else o *= 1 - ML.ease(t, clear, clear + 0.3);
          const sc = Math.min(1, r.w / hw);
          c.w.style.translate = `${r.x.toFixed(2)}px ${r.y.toFixed(2)}px`;
          c.w.style.setProperty("--u", ((hw / 100) * sc).toFixed(4) + "px");
          c.w.style.opacity = o.toFixed(4);
          c.w.style.zIndex = String(z);
          c.w.style.visibility = o < 0.002 ? "hidden" : "visible";
        });
        const cu = ML.out(t, countA, countA + countD);
        const s = fmtV(cu);
        if (num.textContent !== s) num.textContent = s;
        const no = ML.lin(t, countA - 0.05, countA + 0.2);
        num.style.opacity = no.toFixed(4);
        num.style.translate = `0 ${((1 - ML.out(t, countA - 0.05, countA + 0.4)) * numSize * 0.12).toFixed(2)}px`;
        sub.style.opacity = ML.lin(t, countA + 0.3, countA + 0.6).toFixed(4);
        cw2.forEach((w, i) => { const a = capA + i * 0.06, u = ML.out(t, a, a + 0.4); w.style.opacity = u.toFixed(4); w.style.translate = `0 ${((1 - u) * capH * 0.18).toFixed(2)}px`; });
      },
    };
  },
});
