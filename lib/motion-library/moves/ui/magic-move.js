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
//   custom: the target itself travels to a header place at the top of its region (scaled down, never up) while the
//     rest of the scene blurs out.
// Source: Rieranthony/product-film-skill templates/kit/move.ts (move, swapIn) + reference/ingredients.md (MIT).
ML.define({
  id: "ui.magic-move",
  category: "ui",
  name: "Magic move (shared element)",
  does: "A clicked element (a row's thumbnail and title, or a button) travels and reshapes into its place in the next view while everything else blur-swaps.",
  says: ["focus", "step", "flow", "choice", "change"],
  energy: 3,
  targets: ["card", "image", "screen", "shape", "label"],
  duration: [0.6, 1.2],
  params: {
    pair: { type: "choice", options: ["row-to-detail-header", "button-to-toggle-half", "custom"], default: "row-to-detail-header" },
    stiffness: { type: "number", range: [100, 250], default: 150 },
    damping: { type: "number", range: [14, 30], default: 20 },
    blur_swap_delay: { type: "number", range: [0.1, 0.3], default: 0.18, unit: "s" },
    click: { type: "bool", default: true },
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
    const setBlur = (e, o, blur) => { e.style.opacity = o.toFixed(4); e.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none"; e.style.visibility = o > 0.001 ? "visible" : "hidden"; };

    // ── custom: the target travels to a header place at the top of its region ──
    if (pair === "custom") {
      const scene = ctx.scene || ctx.stage;
      const a = ctx.box(el);
      const s = Math.min(1, (f.safe.w * 0.42) / a.w, (f.safe.h * 0.22) / a.h);
      const b = { w: a.w * s, h: a.h * s, y: f.safe.y, x: rtl ? f.safe.x + f.safe.w - a.w * s : f.safe.x };
      const others = [...scene.querySelectorAll("*")].filter((e) => e !== el && !e.contains(el) && !el.contains(e) && e.children.length === 0);
      const T = at + 0.1;
      ctx.sfx(T, "whoosh.soft", 0.35);
      el.style.transformOrigin = "0 0";
      return {
        draw(t) {
          const u = ML.step(t - T, cfg);
          const x = (b.x - a.x) * u, y = (b.y - a.y) * u, sc = 1 + (s - 1) * u;
          el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${sc.toFixed(4)})`;
          const g = blurOut(t, T);
          others.forEach((e) => { e.style.opacity = g.o.toFixed(4); e.style.filter = g.blur > 0.05 ? `blur(${g.blur.toFixed(2)}px)` : "none"; });
        },
      };
    }

    // ── a host in the picture region with two views stacked: A (before) and B (after) ──
    const R = f.pic;
    const host = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;z-index:6;pointer-events:none;`, ctx.scene || ctx.stage);
    host.dir = rtl ? "rtl" : "ltr";
    const W = Math.min(R.w * 0.92, (f.wide ? 980 : 900) * k);
    const card = mk("div", `position:absolute;left:${((R.w - W) / 2).toFixed(1)}px;top:50%;width:${W.toFixed(1)}px;box-sizing:border-box;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:var(--x-radius);box-shadow:var(--x-shadow);color:var(--x-ink);overflow:hidden;`, host);
    const viewA = mk("div", `position:relative;padding:${px(30)};display:flex;flex-direction:column;gap:${px(14)};`, card);
    const viewB = mk("div", `position:absolute;inset:0;padding:${px(30)};display:flex;flex-direction:column;gap:${px(20)};`, card);
    const layer = mk("div", "position:absolute;inset:0;pointer-events:none;", card); // travellers ride on top
    const rel = (e) => { const c = card.getBoundingClientRect(), sc = c.width / (card.offsetWidth || 1) || 1, r = e.getBoundingClientRect(); return { x: (r.left - c.left) / sc, y: (r.top - c.top) / sc, w: r.width / sc, h: r.height / sc }; };
    const fills = ["linear-gradient(140deg, var(--x-accent), var(--x-accent-2))", "linear-gradient(140deg, var(--x-accent-2), var(--x-good))", "linear-gradient(140deg, var(--x-good), var(--x-accent))"];
    const T = at + 0.55; // the click; the move starts on it
    const swapA = [], swapB = [];
    let draws;

    if (pair === "row-to-detail-header") {
      const rows = rtl ? [["الخطة الشهرية", "ادفع على ٤ شهور"], ["الخطة السنوية", "وفّر ٢٠٪"], ["خطة الشركات", "حتى ٥٠ مستخدم"]]
        : [["Monthly plan", "Pay over 4 months"], ["Yearly plan", "Save 20%"], ["Team plan", "Up to 50 seats"]];
      const pick = 1, titleSize = 34, headSize = 60; // header title: same line-height ratio (1.15) → a pure scale
      mk("div", `font:var(--x-label-weight) ${px(20)} ${rtl ? "var(--x-body-font)" : "var(--x-label-font)"};letter-spacing:${rtl ? "0" : "var(--x-label-track)"};text-transform:var(--x-label-case);color:var(--x-dim);padding-bottom:${px(6)};`, viewA, rtl ? "الخطط" : "Plans");
      const rowEls = rows.map(([a1, a2], i) => {
        const r = mk("div", `display:flex;align-items:center;gap:${px(22)};padding:${px(14)};border-radius:calc(var(--x-radius) * 0.5);background:color-mix(in srgb, var(--x-ink) 3%, transparent);`, viewA);
        const th = mk("div", `width:${px(96)};height:${px(96)};flex:none;border-radius:calc(var(--x-radius) * 0.45);background:${fills[i]};`, r);
        const col = mk("div", "display:flex;flex-direction:column;", r);
        const ti = mk("div", `font:600 ${px(titleSize)}/1.15 var(--x-head-font);white-space:nowrap;`, col, a1);
        const su = mk("div", `font:400 ${px(24)}/1.3 var(--x-body-font);color:var(--x-dim);`, col, a2);
        return { r, th, ti, su };
      });
      // detail view
      const hero = mk("div", `height:${px(f.tall ? 360 : 250)};border-radius:calc(var(--x-radius) * 0.7);background:${fills[pick]};flex:none;`, viewB);
      const hTitle = mk("div", `font:var(--x-head-weight) ${px(headSize)}/1.15 var(--x-head-font);letter-spacing:var(--x-head-track);white-space:nowrap;align-self:flex-start;`, viewB, rows[pick][0]);
      const body = mk("div", `display:flex;flex-direction:column;gap:${px(14)};`, viewB);
      mk("div", `font:400 ${px(28)}/1.4 var(--x-body-font);color:var(--x-dim);`, body, rows[pick][1]);
      for (let j = 0; j < 3; j++) mk("div", `height:${px(14)};width:${(88 - j * 18)}%;border-radius:99px;background:color-mix(in srgb, var(--x-ink) ${12 - j * 2}%, transparent);`, body);
      const btn = mk("div", `align-self:flex-start;margin-top:${px(8)};padding:${px(18)} ${px(36)};border-radius:var(--x-radius-s);background:var(--x-accent);color:var(--x-accent-ink);font:600 ${px(28)} var(--x-body-font);`, body, rtl ? "اشترك" : "Choose plan");
      // card height: the taller of the two views
      card.style.height = Math.max(viewA.offsetHeight, viewB.scrollHeight).toFixed(1) + "px";
      card.style.translate = `0 -50%`;
      const src = rowEls[pick];
      const rI0 = rel(src.th), rI1 = rel(hero), rT0 = rel(src.ti), rT1 = rel(hTitle);
      // travellers in the destination's style
      const tImg = mk("div", `position:absolute;left:0;top:0;border-radius:calc(var(--x-radius) * 0.6);background:${fills[pick]};`, layer);
      const tTitle = mk("div", `position:absolute;left:0;top:0;transform-origin:0 0;font:var(--x-head-weight) ${px(headSize)}/1.15 var(--x-head-font);letter-spacing:var(--x-head-track);white-space:nowrap;color:var(--x-ink);`, layer, rows[pick][0]);
      const sT0 = rT0.h / rT1.h; // the title only scales
      swapA.push(...rowEls.filter((_, i) => i !== pick).map((x) => x.r), viewA.firstChild, src.r);
      swapB.push(body);
      // the pointer that clicks the row
      const cur = p.click ? (() => { const c = mk("div", "position:absolute;left:0;top:0;z-index:3;", card); const s = doc.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("width", (54 * k).toFixed(1)); s.setAttribute("height", (54 * k).toFixed(1)); s.style.cssText = `position:absolute;left:${(-5 * k * 54 / 24).toFixed(1)}px;top:${(-3 * k * 54 / 24).toFixed(1)}px;overflow:visible;transform-origin:20% 10%;filter:drop-shadow(0 ${px(4)} ${px(6)} color-mix(in srgb, var(--x-ink) 30%, transparent));`; const pa = doc.createElementNS(NS, "path"); pa.setAttribute("d", "M5 3l14 8-6.2 1.6L10 19z"); pa.setAttribute("fill", "var(--x-pointer)"); pa.setAttribute("stroke", "var(--x-pointer-edge)"); pa.setAttribute("stroke-width", "1.6"); pa.setAttribute("stroke-linejoin", "round"); s.append(pa); c.append(s); return { c, s }; })() : null;
      const rr = rel(src.r), tip = { x: rr.x + rr.w * (rtl ? 0.3 : 0.7), y: rr.y + rr.h * 0.55 };
      const stops = [{ t: at, x: tip.x + (rtl ? -1 : 1) * W * 0.25, y: tip.y + 260 * k }, { t: T - 0.08, x: tip.x, y: tip.y }];
      ctx.sfx(T, "click", 0.4);
      ctx.sfx(T + 0.02, "whoosh.soft", 0.3);
      draws = (t) => {
        const sq = t >= T - 0.04 && t < T + 0.16 ? 1 - 0.06 * Math.sin(Math.PI * ML.lin(t, T - 0.04, T + 0.16)) : 1;
        src.r.style.scale = sq === 1 ? "none" : (1 - (1 - sq) * 0.5).toFixed(4);
        if (cur) {
          const q = ML.pathAt(stops, t);
          cur.c.style.translate = `${q.x.toFixed(2)}px ${q.y.toFixed(2)}px`;
          cur.s.style.scale = sq === 1 ? "none" : sq.toFixed(4);
          setBlur(cur.c, ML.lin(t, at, at + 0.15) * (1 - ML.lin(t, T + 0.2, T + 0.4)), 0);
        }
        const moving = t >= T;
        const u = ML.step(t - T, cfg);
        // image: rect lerp (a drawn mark, so its size may change freely)
        const im = { x: rI0.x + (rI1.x - rI0.x) * u, y: rI0.y + (rI1.y - rI0.y) * u, w: rI0.w + (rI1.w - rI0.w) * u, h: rI0.h + (rI1.h - rI0.h) * u };
        tImg.style.visibility = moving ? "visible" : "hidden";
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
      const btnLabel = rtl ? "اختار خطتك" : "Choose billing";
      mk("div", `font:var(--x-head-weight) ${px(44)}/1.2 var(--x-head-font);text-align:center;`, viewA, rtl ? "خطة واحدة. كل المزايا." : "One plan. Everything in.");
      mk("div", `font:400 ${px(26)}/1.4 var(--x-body-font);color:var(--x-dim);text-align:center;`, viewA, rtl ? "اختار طريقة الدفع اللي تناسبك" : "Pick the way you like to pay");
      const btn = mk("div", `align-self:center;margin-top:${px(18)};padding:${px(22)} ${px(52)};border-radius:var(--x-radius-s);background:var(--x-accent);color:var(--x-accent-ink);font:600 ${px(30)} var(--x-body-font);white-space:nowrap;`, viewA, btnLabel);
      mk("div", `height:${px(30)};`, viewA);
      viewB.style.justifyContent = "center"; viewB.style.alignItems = "center";
      const head = mk("div", `font:var(--x-head-weight) ${px(40)}/1.2 var(--x-head-font);`, viewB, rtl ? "الدفع" : "Billing");
      const track = mk("div", `position:relative;display:flex;padding:${px(8)};border-radius:var(--x-radius-s);background:color-mix(in srgb, var(--x-ink) 7%, var(--x-panel));`, viewB);
      const halves = labels.map((l) => mk("div", `width:${px(250)};padding:${px(22)} 0;text-align:center;border-radius:var(--x-radius-s);font:600 ${px(30)} var(--x-body-font);color:var(--x-ink);`, track, l));
      const price = mk("div", `font:var(--x-head-weight) ${px(64)} var(--x-head-font);`, viewB, rtl ? "٤٩ ج/شهر" : "$49 / mo");
      card.style.height = Math.max(viewA.offsetHeight, viewB.scrollHeight).toFixed(1) + "px";
      card.style.translate = `0 -50%`;
      const r0 = rel(btn), r1 = rel(halves[0]);
      const tB = mk("div", `position:absolute;left:0;top:0;border-radius:var(--x-radius-s);display:flex;align-items:center;justify-content:center;overflow:hidden;`, layer);
      const lab0 = mk("div", `position:absolute;font:600 ${px(30)} var(--x-body-font);color:var(--x-accent-ink);white-space:nowrap;`, tB, btnLabel);
      const lab1 = mk("div", `position:absolute;font:600 ${px(30)} var(--x-body-font);color:var(--x-panel);white-space:nowrap;`, tB, labels[0]);
      swapA.push(...[...viewA.children].filter((c) => c !== btn));
      swapB.push(head, halves[1], price, track);
      ctx.sfx(T, "click", 0.4);
      ctx.sfx(T + 0.02, "whoosh.soft", 0.3);
      draws = (t) => {
        const sq = t >= T - 0.04 && t < T + 0.16 ? 1 - 0.04 * Math.sin(Math.PI * ML.lin(t, T - 0.04, T + 0.16)) : 1;
        btn.style.scale = sq === 1 ? "none" : sq.toFixed(4);
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
        const inA = ML.out(t, at - 0.05, at + 0.3);
        card.style.opacity = (inA * (1 - leave)).toFixed(4);
        card.style.visibility = t < at - 0.05 ? "hidden" : "visible";
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
