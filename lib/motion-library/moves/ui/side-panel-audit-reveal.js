// Side panel opens an audit mode: a vertical gradient panel wipes in from the reading-side edge (x −100 % → 0, 0.4 s
// power3.out) carrying a red "AUDIT" tag and a mono counter "AUDIT FINDINGS 00"; the scene takes a faint red tint and
// the headline steps back (shifts and fades). Then, finding by finding, the counter ticks up, a red pill label
// ("CONFLICT") pops onto a card (scale 0.7 → 1 with a −4° tilt, 0.2 s) and a thin red connector line draws to the card
// it clashes with (0.3 s). Cards are the target and its sibling cards, else a small board of cards built beside the panel.
// RTL: the panel comes from the right and the tilt mirrors.
// Source: prompt-motion theviableedge "getting in on the" (reference only — our own rebuild).
ML.define({
  id: "ui.side-panel-audit-reveal",
  category: "ui",
  name: "Side panel opens an audit mode",
  does: "A panel wipes in from the left edge, the scene tints, a counter 'audit findings 00' counts up and red labels tag cards with connector lines.",
  says: ["proof", "problem", "precision"],
  energy: 3,
  targets: ["card", "label", "number"],
  duration: [2, 5],
  params: {
    findings: { type: "number", range: [1, 6], default: 3 },
    label: { type: "text", default: "CONFLICT" },
    title: { type: "text", default: "AUDIT" },
    panel_width: { type: "number", range: [0.2, 0.4], default: 0.3 },
  },
  pairs: ["ui.scan-highlight-filter", "ui.approval-gate"],
  avoid: ["calm", "luxury", "celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:theviableedge-getting-in-on-the", license: "reference", note: "our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const scene = ctx.scene || ctx.stage;
    const layer = mk("div", "position:absolute;inset:0;z-index:8;pointer-events:none;overflow:hidden;", scene);
    const lf = rtl ? "var(--x-body-font)" : "var(--x-label-font)", track = rtl ? "0" : "var(--x-label-track)";
    const nF = Math.round(ML.clamp(p.findings, 1, 6));

    // the tint over the scene
    const tint = mk("div", "position:absolute;inset:0;background:color-mix(in srgb, var(--x-bad) 9%, transparent);opacity:0;", layer);

    // the panel
    const PW = Math.round(f.W * ML.clamp(p.panel_width, 0.2, 0.4));
    const panel = mk("div", `position:absolute;top:0;bottom:0;${rtl ? "right" : "left"}:0;width:${PW}px;box-sizing:border-box;padding:${(f.safe.y).toFixed(0)}px ${(28 * k).toFixed(1)}px ${(40 * k).toFixed(1)}px;background:linear-gradient(180deg, var(--x-ink), color-mix(in srgb, var(--x-ink) 82%, var(--x-bad)));color:var(--x-panel);display:flex;flex-direction:column;gap:${(22 * k).toFixed(1)}px;box-shadow:var(--x-shadow);`, layer);
    panel.dir = rtl ? "rtl" : "ltr";
    const DEF_T = "AUDIT", DEF_L = "CONFLICT";
    const title = rtl && p.title === DEF_T ? "مراجعة" : p.title || DEF_T;
    const label = rtl && p.label === DEF_L ? "تعارض" : p.label || DEF_L;
    mk("div", `align-self:flex-start;padding:${(6 * k).toFixed(1)}px ${(14 * k).toFixed(1)}px;border-radius:${(6 * k).toFixed(1)}px;background:var(--x-bad);color:var(--x-accent-ink);font:700 ${(24 * k).toFixed(1)}px ${lf};letter-spacing:${track};`, panel, title);
    mk("div", `font:var(--x-label-weight) ${(18 * k).toFixed(1)}px ${lf};letter-spacing:${track};text-transform:var(--x-label-case);color:color-mix(in srgb, var(--x-panel) 60%, transparent);`, panel, rtl ? "نتائج المراجعة" : "audit findings");
    const counter = mk("div", `font:600 ${(Math.min(96, PW * 0.36 / k) * k).toFixed(1)}px/1 var(--x-mono-font);color:var(--x-panel);direction:ltr;text-align:${rtl ? "right" : "left"};`, panel, "00");
    const list = mk("div", `display:flex;flex-direction:column;gap:${(10 * k).toFixed(1)}px;margin-top:${(10 * k).toFixed(1)}px;`, panel);
    const rows = [];
    for (let i = 0; i < nF; i++) {
      const r = mk("div", `display:flex;align-items:center;gap:${(10 * k).toFixed(1)}px;font:500 ${(18 * k).toFixed(1)}px var(--x-body-font);color:color-mix(in srgb, var(--x-panel) 80%, transparent);opacity:0;`, list);
      mk("i", `flex:none;width:${(10 * k).toFixed(1)}px;height:${(10 * k).toFixed(1)}px;border-radius:50%;background:var(--x-bad);`, r);
      mk("span", `height:${(9 * k).toFixed(1)}px;flex:1;max-width:${(40 + ML.rnd(i, 4) * 50).toFixed(0)}%;border-radius:99px;background:color-mix(in srgb, var(--x-panel) 25%, transparent);`, r);
      rows.push(r);
    }

    // the cards: the target with its sibling cards, else a board beside the panel
    let cards = [];
    if (el) {
      const sib = el.parentElement ? [...el.parentElement.children].filter((c) => c.offsetWidth > 0 && c.offsetHeight > 0) : [];
      cards = sib.length >= 2 ? sib : [el];
    }
    const n = Math.max(2, Math.min(6, nF + 1));
    if (cards.length < 2) {
      cards = [];
      const x0 = rtl ? f.m : PW + 32 * k, x1 = rtl ? f.W - PW - 32 * k : f.W - f.m;
      const R = { x: x0, y: f.pic.y, w: x1 - x0, h: f.pic.h };
      const cols = f.wide ? 3 : 2, rowsN = Math.ceil(n / cols), gap = 24 * k;
      const cw = (R.w - gap * (cols - 1)) / cols, ch = Math.min((R.h - gap * (rowsN - 1)) / rowsN, cw * 0.8);
      const gh = ch * rowsN + gap * (rowsN - 1);
      const board = mk("div", `position:absolute;left:${R.x.toFixed(1)}px;top:${(R.y + (R.h - gh) / 2).toFixed(1)}px;width:${R.w.toFixed(1)}px;display:grid;grid-template-columns:repeat(${cols}, 1fr);gap:${gap.toFixed(1)}px;z-index:6;pointer-events:none;`, scene);
      board.dir = rtl ? "rtl" : "ltr";
      for (let i = 0; i < n; i++) {
        const c = mk("div", `height:${ch.toFixed(1)}px;box-sizing:border-box;padding:${(20 * k).toFixed(1)}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * 0.5);box-shadow:var(--x-shadow);display:flex;flex-direction:column;gap:${(12 * k).toFixed(1)}px;`, board);
        mk("div", `width:${(36 * k).toFixed(1)}px;height:${(36 * k).toFixed(1)}px;border-radius:${(10 * k).toFixed(1)}px;background:color-mix(in srgb, var(--x-accent) ${(20 + ML.rnd(i, 2) * 40).toFixed(0)}%, var(--x-panel-2));`, c);
        mk("div", `height:${(12 * k).toFixed(1)}px;width:${(55 + ML.rnd(i, 3) * 40).toFixed(0)}%;border-radius:99px;background:color-mix(in srgb, var(--x-ink) 70%, transparent);`, c);
        mk("div", `height:${(10 * k).toFixed(1)}px;width:${(35 + ML.rnd(i, 5) * 45).toFixed(0)}%;border-radius:99px;background:var(--x-line);`, c);
        cards.push(c);
      }
    }
    const boxes = cards.map((c) => ctx.box(c));

    // each finding: a label on a card and a line to the card it clashes with
    const NS = "http://www.w3.org/2000/svg";
    const svg = doc.createElementNS(NS, "svg");
    svg.setAttribute("width", f.W); svg.setAttribute("height", f.H); svg.setAttribute("viewBox", `0 0 ${f.W} ${f.H}`);
    svg.style.cssText = "position:absolute;left:0;top:0;overflow:visible;";
    layer.insertBefore(svg, panel);
    const lw = Math.max(1.5, 2.5 * k);
    const t0 = at + 0.55, t1 = end - 0.7, gapT = nF > 1 ? Math.max(0.35, (t1 - t0) / (nF - 1)) : 0;
    const finds = [];
    for (let j = 0; j < nF; j++) {
      const a = j % cards.length, b = (j + 1 + (cards.length > 3 && j % 2 ? 1 : 0)) % cards.length;
      const A = boxes[a], Bx = boxes[b];
      const ax = A.x + A.w / 2, ay = A.y + A.h / 2, bx = Bx.x + Bx.w / 2, by = Bx.y + Bx.h / 2;
      const line = doc.createElementNS(NS, "line");
      line.setAttribute("x1", ax); line.setAttribute("y1", ay); line.setAttribute("x2", bx); line.setAttribute("y2", by);
      line.setAttribute("stroke", "var(--x-bad)"); line.setAttribute("stroke-width", lw); line.setAttribute("stroke-linecap", "round");
      const len = Math.hypot(bx - ax, by - ay) || 1;
      line.setAttribute("stroke-dasharray", `${len} ${len}`);
      svg.append(line);
      const dots = [[ax, ay], [bx, by]].map(([x, y]) => { const c = doc.createElementNS(NS, "circle"); c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", 5 * k); c.setAttribute("fill", "var(--x-bad)"); svg.append(c); return c; });
      // the pill sits on the card's top edge, offset by finding so two never stack
      const pill = mk("div", `position:absolute;left:0;top:0;white-space:nowrap;padding:${(6 * k).toFixed(1)}px ${(14 * k).toFixed(1)}px;border-radius:${(6 * k).toFixed(1)}px;background:var(--x-bad);color:var(--x-accent-ink);font:700 ${(20 * k).toFixed(1)}px ${lf};letter-spacing:${rtl ? "0" : "0.12em"};box-shadow:var(--x-shadow);opacity:0;`, layer, label);
      const pw = pill.offsetWidth, phh = pill.offsetHeight;
      const px = ML.clamp(A.x + (rtl ? A.w - pw - 12 * k : 12 * k), 8, f.W - pw - 8), py = Math.max(8, A.y - phh * 0.5 + (j >= cards.length ? phh + 6 * k : 0));
      pill.style.left = px.toFixed(1) + "px"; pill.style.top = py.toFixed(1) + "px";
      finds.push({ t: t0 + j * gapT, line, len, dots, pill });
      ctx.sfx(t0 + j * gapT, "blip", 0.3);
    }
    layer.append(panel);
    ctx.sfx(at, "whoosh.soft", 0.28);

    const head = scene.querySelector(".ml-head");
    const headBase = head ? { o: head.style.opacity, tr: head.style.translate } : null;
    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.3, end);
        const u = ML.out(t, at, at + 0.4);
        panel.style.translate = `${((1 - u) * (rtl ? 1 : -1) * 102).toFixed(3)}% 0`;
        panel.style.opacity = (t < at ? 0 : 1 - leave).toFixed(4);
        tint.style.opacity = (u * (1 - leave)).toFixed(4);
        if (head) {
          if (t < at) { head.style.opacity = headBase.o; head.style.translate = headBase.tr; }
          else { const h = ML.ease(t, at, at + 0.45) * (1 - leave); head.style.opacity = (1 - 0.65 * h).toFixed(4); head.style.translate = `${(h * PW * 0.12 * (rtl ? -1 : 1)).toFixed(2)}px 0`; }
        }
        let count = 0;
        finds.forEach((F, j) => {
          if (t >= F.t) count++;
          const pop = ML.back(t, F.t, F.t + 0.2, 1.6), seen = t >= F.t ? Math.min(1, ML.lin(t, F.t, F.t + 0.08)) : 0;
          F.pill.style.opacity = (seen * (1 - leave)).toFixed(4);
          F.pill.style.scale = (0.7 + 0.3 * pop).toFixed(4);
          F.pill.style.rotate = `${(rtl ? 4 : -4)}deg`;
          const d = ML.out(t, F.t + 0.1, F.t + 0.4);
          F.line.setAttribute("stroke-dashoffset", (F.len * (1 - d)).toFixed(2));
          F.line.style.opacity = (d > 0 ? 1 - leave : 0).toFixed(4);
          F.dots[0].style.opacity = (seen * (1 - leave)).toFixed(4);
          F.dots[1].style.opacity = (d >= 1 ? 1 - leave : d).toFixed(4);
          rows[j].style.opacity = (seen * (1 - leave)).toFixed(4);
          rows[j].style.translate = `${((1 - ML.out(t, F.t, F.t + 0.25)) * (rtl ? -12 : 12) * k).toFixed(2)}px 0`;
        });
        counter.textContent = String(count).padStart(2, "0");
      },
    };
  },
});
