// Framed grid assemble (MengTo/Skills web-design/framed-grid-layout): a 12-column parent grid (16 px gap) of framed
// boxes. A faint 135° diagonal hatch fades in first under everything; then, frame by frame (0.08 s apart in reading
// order — right to left in Arabic — or centre-out), the four 1 px border sides scale 0 → 1 (top and left grow from the
// top-left corner, bottom and right from the bottom-right) in 0.45 s power2.inOut; the L-shaped corner brackets thicken
// in (line → line-strong) at +0.3 s; the surface fill rises 0 → .62 at +0.35 s; the content rises 10 px and fades in at
// +0.45 s. One border colour, one bracket colour, one spacing scale.
// Source: MengTo/Skills agent-skills/web-design/framed-grid-layout/SKILL.md (MIT): tokens (--fg-surface .62, --fg-line,
// --fg-line-strong, --fg-texture, 16 px gap, 18 px corner), the parent grid and hatch — mapped onto look variables.
ML.define({
  id: "element.framed-bento-assemble",
  category: "element",
  name: "Framed grid assemble",
  does: "Bordered boxes draw their outlines and corner brackets one by one, snapping into a grid layout before content fades in.",
  says: ["precision", "list", "simplicity", "tech"],
  energy: 2,
  targets: ["card", "stage"],
  duration: [1.4, 3.5],
  params: {
    order: { type: "choice", options: ["reading", "center-out"], default: "reading" },
    stagger: { type: "number", range: [0.05, 0.15], default: 0.08, unit: "s" },
    frames: { type: "number", range: [3, 9], default: 5 },
    hatch: { type: "bool", default: true },
    items: { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "element.glass-panel-in"],
  avoid: ["playful", "celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:agent-skills/web-design/framed-grid-layout/SKILL.md", license: "MIT", note: "tokens, parent grid, hatch and corner brackets mapped onto look variables; the assemble timing is ours" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const ob = own ? ctx.box(own) : null;
    const big = ob && ob.w > f.W * 0.4 && ob.h > f.H * 0.18;
    const R = big ? ob : f.pic;
    const k = Math.min(f.W, f.H) / 1080;
    const gap = 16 * k, pad = Math.max(16, 26 * k), corner = 24 * k;
    // the outlines ARE the move, so they must read on video: the source's .14 / .34 ink lifted to .26 / .6, at 1.5 px
    const lw = Math.max(1.5, 1.5 * k);
    const LINE = "color-mix(in srgb, var(--x-ink) 26%, transparent)", STRONG = "color-mix(in srgb, var(--x-ink) 60%, transparent)";
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;`, host);
    const ground = mk("div", "position:absolute;inset:0;background:var(--x-ground);", layer);
    const hatch = p.hatch ? mk("div", `position:absolute;inset:0;background:repeating-linear-gradient(135deg, transparent 0 ${11 * k}px, color-mix(in srgb, var(--x-ink) 5%, transparent) ${11 * k}px ${12 * k}px);`, layer) : null;

    // the layout: rows of 12-column spans, cycling a few bento rhythms; the last row shares what's left
    const n = Math.round(ML.clamp(p.frames, 3, 9));
    const RHYTHM = f.tall ? [[12], [6, 6], [7, 5], [5, 7], [4, 8], [12]] : [[7, 5], [4, 4, 4], [5, 7], [6, 6], [8, 4], [4, 8]];
    const rows = [];
    let left = n, ri = 0;
    while (left > 0) {
      let r = RHYTHM[ri % RHYTHM.length];
      if (r.length > left) r = left === 1 ? [12] : left === 2 ? [6, 6] : [4, 4, 4];
      rows.push(r); left -= r.length; ri++;
    }
    const nr = rows.length;
    const rh = (R.h - gap * (nr + 1)) / nr, colW = (R.w - gap * 13) / 12;
    const DEF = rtl
      ? [["٠١", "الخطة"], ["٠٢", "الدفعات"], ["٠٣", "التقارير"], ["٠٤", "الفريق"], ["٠٥", "الأمان"], ["٠٦", "التكامل"], ["٠٧", "الدعم"], ["٠٨", "السرعة"], ["٠٩", "النمو"]]
      : [["01", "Plan"], ["02", "Payments"], ["03", "Reports"], ["04", "Team"], ["05", "Security"], ["06", "Integrations"], ["07", "Support"], ["08", "Speed"], ["09", "Growth"]];
    const mine = String(p.items || "").split(/[,،|]/).map((s) => s.trim()).filter(Boolean);
    const ownText = own && !big ? (own.textContent || "").trim() : "";
    const boxes = [];
    rows.forEach((r, y) => {
      let col = 0;
      r.forEach((span) => {
        const c0 = rtl ? 12 - col - span : col; // reading order runs right to left in Arabic
        boxes.push({ x: gap + c0 * (colW + gap), y: gap + y * (rh + gap), w: span * colW + (span - 1) * gap, h: rh, row: y });
        col += span;
      });
    });
    const frames = boxes.map((b, i) => {
      const fr = mk("div", `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;`, layer);
      const surf = mk("div", "position:absolute;inset:0;background:var(--x-panel);", fr);
      // four sides: top / leading side from the leading top corner, bottom / trailing side from the opposite corner
      const sides = [
        mk("div", `position:absolute;left:0;top:0;width:100%;height:${lw}px;background:${LINE};transform-origin:${rtl ? "100%" : "0"} 50%;`, fr),
        mk("div", `position:absolute;${rtl ? "right" : "left"}:0;top:0;width:${lw}px;height:100%;background:${LINE};transform-origin:50% 0;`, fr),
        mk("div", `position:absolute;left:0;bottom:0;width:100%;height:${lw}px;background:${LINE};transform-origin:${rtl ? "0" : "100%"} 50%;`, fr),
        mk("div", `position:absolute;${rtl ? "left" : "right"}:0;top:0;width:${lw}px;height:100%;background:${LINE};transform-origin:50% 100%;`, fr),
      ];
      // L-shaped corner brackets (drawn as two bars each), just outside the box corners
      const br = [];
      for (const [h, v] of [["left", "top"], ["right", "top"], ["left", "bottom"], ["right", "bottom"]]) {
        const a = mk("div", `position:absolute;${h}:${-lw}px;${v}:${-lw}px;width:${corner}px;height:${corner}px;box-sizing:border-box;border-${h}:${lw}px solid ${STRONG};border-${v}:${lw}px solid ${STRONG};`, fr);
        br.push(a);
      }
      // content
      const wide = b.w > R.w * 0.45;
      const [num, title] = mine[i] ? [DEF[i][0], mine[i]] : i === 0 && ownText ? [DEF[0][0], ownText] : DEF[i % DEF.length];
      const cont = mk("div", `position:absolute;inset:${pad}px;display:flex;flex-direction:column;justify-content:space-between;direction:${rtl ? "rtl" : "ltr"};text-align:${rtl ? "right" : "left"};`, fr);
      mk("div", `font:var(--x-label-weight) ${Math.max(18, 22 * k)}px/1 var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};color:var(--x-dim);`, cont, num);
      const tSize = Math.min(b.h * 0.24, (wide ? 60 : 44) * k, b.w * 0.16);
      const body = mk("div", "display:flex;flex-direction:column;gap:" + tSize * 0.35 + "px;", cont);
      ML.fit(mk("div", `font:var(--x-head-weight) ${tSize}px/1.1 var(--x-head-font);letter-spacing:${rtl ? 0 : "var(--x-head-track)"};color:var(--x-ink);white-space:nowrap;`, body, title), b.w - pad * 2);
      if (b.h > 150 * k) {
        // a quiet detail row: thin bars in the grid's rhythm (the first frame gets an accent bar)
        const bars = mk("div", `display:flex;gap:${gap * 0.5}px;align-items:flex-end;height:${Math.min(b.h * 0.22, 60 * k)}px;`, body);
        const m = wide ? 7 : 4;
        for (let j = 0; j < m; j++) mk("div", `flex:1;height:${(30 + ML.rnd(i * 9 + j, 3) * 70).toFixed(1)}%;background:${i === 0 && j === m - 2 ? "var(--x-accent)" : "var(--x-line)"};`, bars);
      }
      return { fr, surf, sides, br, cont, b };
    });

    // order: reading (row by row; the boxes are already in reading order) or centre-out
    const cx = R.w / 2, cy = R.h / 2;
    const rank = frames.map((_, i) => i);
    if (p.order === "center-out") rank.sort((a, c) => Math.hypot(boxes[a].x + boxes[a].w / 2 - cx, boxes[a].y + boxes[a].h / 2 - cy) - Math.hypot(boxes[c].x + boxes[c].w / 2 - cx, boxes[c].y + boxes[c].h / 2 - cy));
    const st = ML.clamp(p.stagger, 0.05, 0.15);
    const tH = at, t0s = [];
    rank.forEach((fi, j) => { t0s[fi] = at + 0.18 + j * st; });
    const last = Math.max(...t0s);
    const leaveA = Math.max(last + 0.9, end - 0.3);
    ctx.sfx(at + 0.18, "tap", 0.3);
    if (n > 4) ctx.sfx(at + 0.18 + Math.floor(n / 2) * st + 0.3, "tap", 0.2);
    ctx.sfx(last + 0.45, "snap", 0.3);
    // power2.inOut
    const p2 = (t, a, b) => { const x = ML.lin(t, a, b); return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };

    return {
      draw(t) {
        const leave = ML.clamp((t - leaveA) / 0.28);
        layer.style.visibility = t < at - 0.1 ? "hidden" : "visible";
        layer.style.opacity = (1 - leave).toFixed(4);
        if (own && own.style) { const o = t >= at ? "0" : ""; if (own.style.opacity !== o) own.style.opacity = o; }
        ground.style.opacity = ML.out(t, at - 0.1, at + 0.15).toFixed(4);
        if (hatch) hatch.style.opacity = ML.ease(t, tH, tH + 0.4).toFixed(4);
        frames.forEach((F, i) => {
          const a = t0s[i];
          const s = p2(t, a, a + 0.45);
          F.sides[0].style.transform = `scaleX(${s.toFixed(4)})`;
          F.sides[1].style.transform = `scaleY(${s.toFixed(4)})`;
          F.sides[2].style.transform = `scaleX(${s.toFixed(4)})`;
          F.sides[3].style.transform = `scaleY(${s.toFixed(4)})`;
          const bk = ML.out(t, a + 0.3, a + 0.55);
          // line → line-strong: the brackets fade and thicken in
          const bw = (lw * (1 + bk)).toFixed(2) + "px";
          F.br.forEach((e, j) => { e.style.opacity = bk.toFixed(4); const h = j % 2 ? "Right" : "Left", v = j < 2 ? "Top" : "Bottom"; e.style["border" + h + "Width"] = bw; e.style["border" + v + "Width"] = bw; });
          F.surf.style.opacity = (0.62 * ML.out(t, a + 0.35, a + 0.7)).toFixed(4);
          const c = ML.out(t, a + 0.45, a + 0.85);
          F.cont.style.opacity = c.toFixed(4);
          F.cont.style.translate = `0 ${((1 - c) * 10 * k).toFixed(2)}px`;
        });
      },
    };
  },
});
