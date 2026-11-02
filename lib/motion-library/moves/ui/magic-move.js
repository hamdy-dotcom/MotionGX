// Magic move (shared element). A clicked element travels and reshapes into its place in the next view while
// everything else blur-swaps. The traveller is drawn in the destination's style; its rect lerps from the source to
// the destination on product-film's closed-form glide spring (stiffness 150, damping 20: ~79 % at 0.2 s, 97 % at
// 0.3 s, a ~1 % overshoot, settled by 0.6 s), applied as translate + size (marks) or translate + scale with
// transform-origin 0 0 (titles: the traveller title shares the header's line-height ratio, so it only scales — and
// only ever scales down from the destination size, so type stays sharp). The source hides from the move's start and
// the destination shows when it lands. The rest of both views blur-swaps (kit swapIn: in `blur_swap_delay` after the
// move starts over 0.18 s from blur 10 px; out over the 0.1 s before). Text never flies across text: marks and
// pictures travel, words blur out and back in.
//   row-to-detail-header: a cursor clicks a list row (squash 0.16 s); its thumbnail and its title travel separately
//     to the detail header; the list blurs away and the detail body blurs in.
//   button-to-toggle-half: a button's rect lerps to the active half of a segmented toggle and its fill lerps to the
//     toggle's active colour; its label blur-swaps; the other half and the track blur in.
//   custom: the target itself (a copy of it, so no panel it sat in travels along) goes to a header place at the top of
//     its region (scaled down, never up) while the rest of the scene blurs out.
// The first two build their views from `items` / `label`; a target lends its short text and its picture (when the
// picture has the pixels for the header) and is hidden, so nothing shows twice.
// Source: Rieranthony/product-film-skill templates/kit/move.ts (move, swapIn) + reference/ingredients.md (MIT).
ML.define({
  id: "ui.magic-move",
  category: "ui",
  name: "Magic move (shared element)",
  does: "A clicked element (a row's thumbnail and title, or a button) travels and reshapes into its place in the next view while everything else blur-swaps.",
  says: ["focus", "step", "flow", "choice", "change"],
  energy: 3,
  targets: ["card", "image", "screen", "shape", "label"],
  duration: [1, 2.5], // the click comes up to 0.55 s in and the spring takes 0.6 s to settle
  params: {
    pair: { type: "choice", options: ["row-to-detail-header", "button-to-toggle-half", "custom"], default: "row-to-detail-header" },
    stiffness: { type: "number", range: [100, 250], default: 150 },
    damping: { type: "number", range: [14, 30], default: 20 },
    blur_swap_delay: { type: "number", range: [0.1, 0.3], default: 0.18, unit: "s" },
    click: { type: "bool", default: true },
    items: { type: "text" }, // rows "Title|sub; Title|sub; Title|sub", or the toggle's halves "Monthly; Yearly"
    label: { type: "text" }, // the button's words (button-to-toggle-half)
  },
  pairs: ["ui.cursor-glide-click", "camera.push-in"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "product-film-skill:templates/kit/move.ts", license: "MIT", note: "move() + swapIn(); the from→to pairs from reference/ingredients.md (Transitions table)" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, k = Math.min(f.W, f.H) / 1080, NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const px = (v) => (v * k).toFixed(1) + "px";
    const cfg = { stiffness: ML.clamp(p.stiffness, 100, 250), damping: ML.clamp(p.damping, 14, 30), mass: 1 };
    const delay = ML.clamp(p.blur_swap_delay, 0.1, 0.3);
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const pair = p.pair === "custom" && !el ? "row-to-detail-header" : p.pair;
    const blurOut = (t, s) => { const v = 1 - ML.clamp((t - s) / 0.1); return { o: v, blur: (1 - v) * 10 }; };
    const given = String(p.items || "").split(/[;\n]/).map((x) => x.trim()).filter(Boolean).map((x) => x.split("|").map((y) => y.trim()));
    const track = rtl ? "0" : "var(--x-head-track)"; // Arabic letters join: never tracked
    const setBlur = (e, o, blur) => { e.style.opacity = o.toFixed(4); e.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none"; e.style.visibility = o > 0.001 ? "visible" : "hidden"; };

    // ── custom: the target travels to a header place at the top of its region ──
    if (pair === "custom") {
      const scene = ctx.scene || ctx.stage;
      const a = ctx.box(el);
      const s = Math.min(1, (f.safe.w * 0.42) / a.w, (f.safe.h * 0.22) / a.h);
      const b = { w: a.w * s, h: a.h * s, y: f.safe.y, x: rtl ? f.safe.x + f.safe.w - a.w * s : f.safe.x };
      // the rest of the scene as it stands (later moves are not this move's to hide); a copy travels, so the panel the
      // target sat in stays behind and fades with the rest
      const rest = [...scene.children].map((e) => ({ e, pic: e.tagName === "IMG" || !!e.querySelector("img") }));
      const cs = getComputedStyle(el);
      const tr = el.cloneNode(true);
      tr.removeAttribute("data-slot");
      tr.style.cssText += `;position:absolute;left:0;top:0;margin:0;box-sizing:border-box;width:${a.w.toFixed(2)}px;height:${a.h.toFixed(2)}px;transform-origin:0 0;z-index:8;font:${cs.font};color:${cs.color};letter-spacing:${cs.letterSpacing};text-align:${cs.textAlign};visibility:hidden;`;
      scene.append(tr);
      const T = at + 0.1;
      ctx.sfx(T, "whoosh.soft", 0.35);
      return {
        draw(t) {
          const moving = t >= T, u = ML.step(t - T, cfg);
          const x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u, sc = 1 + (s - 1) * u;
          tr.style.visibility = moving ? "visible" : "hidden";
          tr.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${sc.toFixed(4)})`;
          el.style.visibility = moving ? "hidden" : "visible";
          const g = blurOut(t, T);
          // pictures only fade: no blur on a picture
          rest.forEach(({ e, pic }) => { e.style.opacity = g.o.toFixed(4); e.style.filter = !pic && g.blur > 0.05 ? `blur(${g.blur.toFixed(2)}px)` : "none"; });
        },
      };
    }

    // a target lends its words and its picture to the views, and steps aside
    const lentText = el ? (el.textContent || "").trim() : "";
    const lent = lentText.length <= 28 ? lentText : "";
    const pic = el ? (el.tagName === "IMG" ? el : el.querySelector("img")) : null;
    if (el) el.style.visibility = "hidden";

    // ── a host in the picture region with two views stacked: A (before) and B (after) ──
    const R = f.pic;
    const host = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;z-index:6;pointer-events:none;`, ctx.scene || ctx.stage);
    host.dir = rtl ? "rtl" : "ltr";
    const W = Math.min(R.w * 0.92, (f.wide ? 980 : 900) * k);
    const card = mk("div", `position:absolute;left:${((R.w - W) / 2).toFixed(1)}px;top:50%;width:${W.toFixed(1)}px;box-sizing:border-box;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:var(--x-radius);box-shadow:var(--x-shadow);color:var(--x-ink);overflow:hidden;`, host);
    const viewA = mk("div", `position:relative;padding:${px(30)};display:flex;flex-direction:column;gap:${px(14)};`, card);
    const viewB = mk("div", `position:absolute;left:0;right:0;top:0;padding:${px(30)};display:flex;flex-direction:column;gap:${px(20)};`, card);
    const layer = mk("div", "position:absolute;inset:0;pointer-events:none;", card); // travellers ride on top
    const rel = (e) => { const c = card.getBoundingClientRect(), sc = c.width / (card.offsetWidth || 1) || 1, r = e.getBoundingClientRect(); return { x: (r.left - c.left) / sc, y: (r.top - c.top) / sc, w: r.width / sc, h: r.height / sc }; };
    const fills = ["linear-gradient(140deg, var(--x-accent), var(--x-accent-2))", "linear-gradient(140deg, var(--x-accent-2), var(--x-good))", "linear-gradient(140deg, var(--x-good), var(--x-accent))"];
    const T = at + Math.min(0.55, Math.max(0.12, (end - at) * 0.3)); // the click; the move starts on it
    // the card is as tall as the taller view; B then fills it
    const sizeCard = () => { card.style.height = Math.max(viewA.offsetHeight, viewB.offsetHeight).toFixed(1) + "px"; viewB.style.bottom = "0"; };
    // the pointer that clicks: comes in from the reading side and below, presses on T, fades after
    const pointer = (tip) => {
      if (!p.click) return () => {};
      const c = mk("div", "position:absolute;left:0;top:0;z-index:3;", card);
      const s = doc.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("width", (54 * k).toFixed(1)); s.setAttribute("height", (54 * k).toFixed(1));
      s.style.cssText = `position:absolute;left:${(-5 * k * 54 / 24).toFixed(1)}px;top:${(-3 * k * 54 / 24).toFixed(1)}px;overflow:visible;transform-origin:20% 10%;filter:drop-shadow(0 ${px(4)} ${px(6)} color-mix(in srgb, var(--x-ink) 30%, transparent));`;
      const pa = doc.createElementNS(NS, "path"); pa.setAttribute("d", "M5 3l14 8-6.2 1.6L10 19z"); pa.setAttribute("fill", "var(--x-pointer)"); pa.setAttribute("stroke", "var(--x-pointer-edge)"); pa.setAttribute("stroke-width", "1.6"); pa.setAttribute("stroke-linejoin", "round"); s.append(pa); c.append(s);
      const stops = [{ t: at, x: tip.x + (rtl ? -1 : 1) * W * 0.25, y: Math.max(tip.y, Math.min(tip.y + 260 * k, card.offsetHeight - 30 * k)) }, { t: T - 0.08, x: tip.x, y: tip.y }];
      return (t, sq) => {
        const q = ML.pathAt(stops, t);
        c.style.translate = `${q.x.toFixed(2)}px ${q.y.toFixed(2)}px`;
        s.style.scale = sq === 1 ? "none" : sq.toFixed(4);
        setBlur(c, ML.lin(t, at, at + 0.15) * (1 - ML.lin(t, T + 0.2, T + 0.4)), 0);
      };
    };
    if (p.click) ctx.sfx(T, "click", 0.4);
    ctx.sfx(T + 0.02, "whoosh.soft", 0.3);
    const swapA = [], swapB = [];
    let draws;

    if (pair === "row-to-detail-header") {
      const rows = rtl ? [["الخطة الشهرية", "ادفع على ٤ شهور"], ["الخطة السنوية", "وفّر ٢٠٪"], ["خطة الشركات", "حتى ٥٠ مستخدم"]]
        : [["Monthly plan", "Pay over 4 months"], ["Yearly plan", "Save 20%"], ["Team plan", "Up to 50 seats"]];
      const pick = 1, titleSize = 34, headSize = 60; // header title: same face and line-height ratio (1.15) → a pure scale
      given.slice(0, 3).forEach((g, i) => { rows[i] = [g[0], g[1] || rows[i][1]]; });
      if (!given.length && lent) rows[pick][0] = lent;
      mk("div", `font:var(--x-label-weight) ${px(20)} ${rtl ? "var(--x-body-font)" : "var(--x-label-font)"};letter-spacing:${rtl ? "0" : "var(--x-label-track)"};text-transform:var(--x-label-case);color:var(--x-dim);padding-bottom:${px(6)};`, viewA, rtl ? "الخطط" : "Plans");
      const rowEls = rows.map(([a1, a2], i) => {
        const r = mk("div", `display:flex;align-items:center;gap:${px(22)};padding:${px(14)};border-radius:calc(var(--x-radius) * 0.5);background:color-mix(in srgb, var(--x-ink) 3%, transparent);`, viewA);
        const th = mk("div", `width:${px(96)};height:${px(96)};flex:none;border-radius:calc(var(--x-radius) * 0.45);background:${fills[i]};`, r);
        const col = mk("div", "display:flex;flex-direction:column;min-width:0;", r);
        const ti = mk("div", `font:var(--x-head-weight) ${px(titleSize)}/1.15 var(--x-head-font);letter-spacing:${track};white-space:nowrap;align-self:flex-start;`, col, a1);
        const su = mk("div", `font:400 ${px(24)}/1.3 var(--x-body-font);color:var(--x-dim);`, col, a2);
        return { r, th, ti, su };
      });
      // detail view
      const hero = mk("div", `height:${px(f.tall ? 360 : 250)};border-radius:calc(var(--x-radius) * 0.7);background:${fills[pick]};flex:none;`, viewB);
      const hTitle = mk("div", `font:var(--x-head-weight) ${px(headSize)}/1.15 var(--x-head-font);letter-spacing:${track};white-space:nowrap;align-self:flex-start;`, viewB, rows[pick][0]);
      const body = mk("div", `display:flex;flex-direction:column;gap:${px(14)};`, viewB);
      mk("div", `font:400 ${px(28)}/1.4 var(--x-body-font);color:var(--x-dim);`, body, rows[pick][1]);
      for (let j = 0; j < 3; j++) mk("div", `height:${px(14)};width:${(88 - j * 18)}%;border-radius:99px;background:color-mix(in srgb, var(--x-ink) ${12 - j * 2}%, transparent);`, body);
      const btn = mk("div", `align-self:flex-start;margin-top:${px(8)};padding:${px(18)} ${px(36)};border-radius:var(--x-radius-s);background:var(--x-accent);color:var(--x-accent-ink);font:600 ${px(28)} var(--x-body-font);`, body, rtl ? "اشترك" : "Choose plan");
      // long titles shrink to fit, in the row and in the header alike
      const headFit = ML.fit(hTitle, W - 60 * k);
      ML.fit(rowEls[pick].ti, W - (60 + 28 + 96 + 22) * k);
      sizeCard();
      card.style.translate = `0 -50%`;
      const src = rowEls[pick];
      const rI0 = rel(src.th), rI1 = rel(hero), rT0 = rel(src.ti), rT1 = rel(hTitle);
      // travellers in the destination's style
      const tImg = mk("div", `position:absolute;left:0;top:0;background:${fills[pick]};`, layer);
      // the target's picture rides as the mark, only when it has the pixels for the header (never enlarged)
      if (pic && pic.naturalWidth >= rI1.w && pic.naturalHeight >= rI1.h) { const bg = `center / cover no-repeat url("${pic.src.replace(/"/g, "%22")}")`; src.th.style.background = bg; tImg.style.background = bg; }
      const tTitle = mk("div", `position:absolute;left:0;top:0;transform-origin:0 0;font:var(--x-head-weight) ${headFit.toFixed(2)}px/1.15 var(--x-head-font);letter-spacing:${track};white-space:nowrap;color:var(--x-ink);`, layer, rows[pick][0]);
      const sT0 = rT0.h / rT1.h; // the title only scales
      swapA.push(...rowEls.filter((_, i) => i !== pick).map((x) => x.r), viewA.firstChild, src.r);
      swapB.push(body);
      const rr = rel(src.r), drawPointer = pointer({ x: rr.x + rr.w * (rtl ? 0.3 : 0.7), y: rr.y + rr.h * 0.55 });
      draws = (t) => {
        const sq = t >= T - 0.04 && t < T + 0.16 ? 1 - 0.06 * Math.sin(Math.PI * ML.lin(t, T - 0.04, T + 0.16)) : 1;
        src.r.style.scale = sq === 1 ? "none" : (1 - (1 - sq) * 0.5).toFixed(4);
        drawPointer(t, sq);
        const moving = t >= T;
        const u = ML.step(t - T, cfg);
        // image: rect lerp (a drawn mark, so its size may change freely)
        const im = { x: rI0.x + (rI1.x - rI0.x) * u, y: rI0.y + (rI1.y - rI0.y) * u, w: rI0.w + (rI1.w - rI0.w) * u, h: rI0.h + (rI1.h - rI0.h) * u };
        tImg.style.visibility = moving ? "visible" : "hidden";
        tImg.style.borderRadius = `calc(var(--x-radius) * ${(0.45 + 0.25 * ML.clamp(u)).toFixed(3)})`;
        tImg.style.transform = `translate(${im.x.toFixed(2)}px, ${im.y.toFixed(2)}px)`;
        tImg.style.width = im.w.toFixed(2) + "px"; tImg.style.height = im.h.toFixed(2) + "px";
        // title: pure scale from the row title's size up to the header's own size (≤ 1)
        const s = sT0 + (1 - sT0) * u;
        const tx = rT0.x + (rT1.x - rT0.x) * u, ty = rT0.y + (rT1.y - rT0.y) * u;
        tTitle.style.visibility = moving ? "visible" : "hidden";
        tTitle.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${s.toFixed(4)})`;
        src.th.style.visibility = moving ? "hidden" : "visible";
        src.ti.style.visibility = moving ? "hidden" : "visible";
        hero.style.visibility = "hidden"; hTitle.style.visibility = "hidden";
      };
    } else {
      // button → active half of a segmented toggle
      const labels = rtl ? ["شهري", "سنوي"] : ["Monthly", "Yearly"];
      given.slice(0, 2).forEach((g, i) => { labels[i] = g[0]; });
      const btnLabel = String(p.label || "").trim() || lent || (rtl ? "اختار خطتك" : "Choose billing");
      mk("div", `font:var(--x-head-weight) ${px(44)}/1.2 var(--x-head-font);text-align:center;`, viewA, rtl ? "خطة واحدة. كل المزايا." : "One plan. Everything in.");
      mk("div", `font:400 ${px(26)}/1.4 var(--x-body-font);color:var(--x-dim);text-align:center;`, viewA, rtl ? "اختار طريقة الدفع اللي تناسبك" : "Pick the way you like to pay");
      const btn = mk("div", `align-self:center;margin-top:${px(18)};padding:${px(22)} ${px(52)};border-radius:var(--x-radius-s);background:var(--x-accent);color:var(--x-accent-ink);font:600 ${px(30)} var(--x-body-font);white-space:nowrap;`, viewA, btnLabel);
      mk("div", `height:${px(30)};`, viewA);
      viewB.style.justifyContent = "center"; viewB.style.alignItems = "center";
      const head = mk("div", `font:var(--x-head-weight) ${px(40)}/1.2 var(--x-head-font);`, viewB, rtl ? "الدفع" : "Billing");
      const trackEl = mk("div", `position:relative;display:flex;padding:${px(8)};border-radius:var(--x-radius-s);background:color-mix(in srgb, var(--x-ink) 7%, var(--x-panel));`, viewB);
      const halves = labels.map((l) => mk("div", `width:${px(250)};padding:${px(22)} 0;text-align:center;border-radius:var(--x-radius-s);font:600 ${px(30)} var(--x-body-font);color:var(--x-ink);`, trackEl, l));
      const price = mk("div", `font:var(--x-head-weight) ${px(64)} var(--x-head-font);`, viewB, rtl ? "٤٩ ج/شهر" : "$49 / mo");
      sizeCard();
      card.style.translate = `0 -50%`;
      const r0 = rel(btn), r1 = rel(halves[0]);
      const tB = mk("div", `position:absolute;left:0;top:0;border-radius:var(--x-radius-s);display:flex;align-items:center;justify-content:center;overflow:hidden;`, layer);
      const lab0 = mk("div", `position:absolute;font:600 ${px(30)} var(--x-body-font);color:var(--x-accent-ink);white-space:nowrap;`, tB, btnLabel);
      const lab1 = mk("div", `position:absolute;font:600 ${px(30)} var(--x-body-font);color:var(--x-panel);white-space:nowrap;`, tB, labels[0]);
      swapA.push(...[...viewA.children].filter((c) => c !== btn));
      swapB.push(head, price, trackEl); // the other half blurs in with its track
      const drawPointer = pointer({ x: r0.x + r0.w * (rtl ? 0.35 : 0.65), y: r0.y + r0.h * 0.6 });
      draws = (t) => {
        const sq = t >= T - 0.04 && t < T + 0.16 ? 1 - 0.04 * Math.sin(Math.PI * ML.lin(t, T - 0.04, T + 0.16)) : 1;
        btn.style.scale = sq === 1 ? "none" : sq.toFixed(4);
        drawPointer(t, sq);
        const moving = t >= T, u = ML.step(t - T, cfg);
        const r = ML.moveRect(t, T, r0, r1, cfg);
        tB.style.visibility = moving ? "visible" : "hidden";
        tB.style.transform = `translate(${r.x.toFixed(2)}px, ${r.y.toFixed(2)}px)`;
        tB.style.width = r.w.toFixed(2) + "px"; tB.style.height = r.h.toFixed(2) + "px";
        const c = ML.clamp(u);
        tB.style.background = `color-mix(in srgb, var(--x-ink) ${(c * 100).toFixed(1)}%, var(--x-accent))`;
        // the label is text: it blurs out and the new one blurs in (never flies)
        const o0 = 1 - ML.clamp((t - T) / 0.12), o1 = ML.clamp((t - T - delay) / 0.18);
        setBlur(lab0, o0, (1 - o0) * 10); setBlur(lab1, o1, (1 - o1) * 10);
        btn.style.visibility = moving ? "hidden" : "visible";
        halves[0].style.visibility = "hidden";
      };
    }

    // the rest of both views: blur swap
    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.25, end);
        const inA = ML.out(t, at, at + 0.3);
        card.style.opacity = (inA * (1 - leave)).toFixed(4);
        card.style.visibility = t < at ? "hidden" : "visible";
        viewA.style.visibility = "visible";
        const g = blurOut(t, T);
        swapA.forEach((e) => setBlur(e, g.o, g.blur));
        const s = ML.swapIn(t, T, Infinity, delay, 0.1);
        swapB.forEach((e) => setBlur(e, s.o, s.blur));
        draws(t);
      },
    };
  },
});
