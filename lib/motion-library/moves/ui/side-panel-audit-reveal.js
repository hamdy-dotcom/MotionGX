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
  does: "A panel wipes in from the reading-side edge, the scene tints, the headline steps aside, a counter 'audit findings 00' counts up and red labels tag cards with connector lines.",
  says: ["proof", "problem", "precision"],
  energy: 3,
  targets: ["card", "list", "stage"],
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
    mk("div", `align-self:flex-start;padding:${(6 * k).toFixed(1)}px ${(14 * k).toFixed(1)}px;border-radius:${(6 * k).toFixed(1)}px;background:var(--x-bad);color:var(--x-accent-ink);font:700 ${(28 * k).toFixed(1)}px ${lf};letter-spacing:${track};`, panel, title);
    mk("div", `font:var(--x-label-weight) ${(22 * k).toFixed(1)}px ${lf};letter-spacing:${track};text-transform:var(--x-label-case);color:color-mix(in srgb, var(--x-panel) 60%, transparent);`, panel, rtl ? "نتائج المراجعة" : "audit findings");
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
      const pool = el.dataset.slot === "list" ? [...el.children] : el.parentElement ? [...el.parentElement.children] : [el];
      // a card under the panel can't be tagged: only those at least half clear of it
      const clear = (c) => { const b = ctx.box(c), left = rtl ? f.W - PW : 0, right = rtl ? f.W : PW, over = Math.max(0, Math.min(b.x + b.w, right) - Math.max(b.x, left)); return b.w > 0 && b.h > 0 && over < b.w / 2; };
      cards = pool.filter(clear);
    }
    let board = null;
    const n = Math.max(2, Math.min(6, nF + 1));
    if (cards.length < 2) {
      cards = [];
      const x0 = rtl ? f.m : PW + 32 * k, x1 = rtl ? f.W - PW - 32 * k : f.W - f.m;
      const R = { x: x0, y: f.pic.y, w: x1 - x0, h: f.pic.h };
      const cols = f.wide && n !== 4 ? Math.min(3, n) : 2, rowsN = Math.ceil(n / cols), gap = 24 * k;
      const cw = (R.w - gap * (cols - 1)) / cols, ch = Math.min((R.h - gap * (rowsN - 1)) / rowsN, cw * 0.8);
      const gh = ch * rowsN + gap * (rowsN - 1);
      board = mk("div", `position:absolute;left:${R.x.toFixed(1)}px;top:${(R.y + (R.h - gh) / 2).toFixed(1)}px;width:${R.w.toFixed(1)}px;display:grid;grid-template-columns:repeat(${cols}, 1fr);gap:${gap.toFixed(1)}px;z-index:6;pointer-events:none;`, scene);
      board.dir = rtl ? "rtl" : "ltr";
      for (let i = 0; i < n; i++) {
        const c = mk("div", `height:${ch.toFixed(1)}px;box-sizing:border-box;padding:${(20 * k).toFixed(1)}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * 0.5);box-shadow:var(--x-shadow);display:flex;flex-direction:column;gap:${(12 * k).toFixed(1)}px;`, board);
        mk("div", `flex:1;min-height:0;border-radius:${(10 * k).toFixed(1)}px;background:color-mix(in srgb, var(--x-accent) ${(20 + ML.rnd(i, 2) * 40).toFixed(0)}%, var(--x-panel-2));`, c);
        mk("div", `flex:none;height:${(12 * k).toFixed(1)}px;width:${(55 + ML.rnd(i, 3) * 40).toFixed(0)}%;border-radius:99px;background:color-mix(in srgb, var(--x-ink) 70%, transparent);`, c);
        mk("div", `flex:none;height:${(10 * k).toFixed(1)}px;width:${(35 + ML.rnd(i, 5) * 45).toFixed(0)}%;border-radius:99px;background:var(--x-line);`, c);
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
    // findings evenly up to 1.2 s before the end, so the last one is read before the panel goes; never slower than 1 s each
    const t0 = at + 0.55, t1 = Math.max(t0, end - 1.2), gapT = nF > 1 ? Math.min(1, (t1 - t0) / (nF - 1)) : 0;
    const finds = [], placed = [];
    // each finding links a card to its nearest neighbour it isn't linked to yet: short lines that rarely cross
    const centre = (i) => [boxes[i].x + boxes[i].w / 2, boxes[i].y + boxes[i].h / 2];
    const linked = new Set();
    const partner = (a) => {
      const [x, y] = centre(a), others = cards.map((_, i) => i).filter((i) => i !== a).sort((i, j) => Math.hypot(centre(i)[0] - x, centre(i)[1] - y) - Math.hypot(centre(j)[0] - x, centre(j)[1] - y) || i - j);
      const b = others.find((i) => !linked.has(`${Math.min(a, i)}-${Math.max(a, i)}`)) ?? others[0];
      linked.add(`${Math.min(a, b)}-${Math.max(a, b)}`);
      return b;
    };
    for (let j = 0; j < nF; j++) {
      const a = j % cards.length, b = partner(a);
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
      const pill = mk("div", `position:absolute;left:0;top:0;white-space:nowrap;padding:${(6 * k).toFixed(1)}px ${(14 * k).toFixed(1)}px;border-radius:${(6 * k).toFixed(1)}px;background:var(--x-bad);color:var(--x-accent-ink);font:700 ${(24 * k).toFixed(1)}px ${lf};letter-spacing:${rtl ? "0" : "0.12em"};box-shadow:var(--x-shadow);opacity:0;`, layer, label);
      const pw = pill.offsetWidth, phh = pill.offsetHeight;
      // on the card's reading-side corner, but always clear of the panel
      const px = ML.clamp(A.x + (rtl ? A.w - pw - 12 * k : 12 * k), rtl ? 8 : PW + 12 * k, rtl ? f.W - PW - pw - 12 * k : f.W - pw - 8);
      // two pills never stack: a later one lifts clear of any it would land on (small cards, or more findings than cards)
      let py = Math.max(8, A.y - phh * 0.5);
      while (placed.some((q) => Math.abs(q.x - px) < pw + 6 * k && Math.abs(q.y - py) < phh + 6 * k) && py > phh) py -= phh + 6 * k;
      placed.push({ x: px, y: py });
      pill.style.left = px.toFixed(1) + "px"; pill.style.top = py.toFixed(1) + "px";
      finds.push({ t: t0 + j * gapT, line, len, dots, pill });
      ctx.sfx(t0 + j * gapT, "blip", 0.3);
    }
    layer.append(panel);
    ctx.sfx(at, "whoosh.soft", 0.28);

    const head = scene.querySelector(".ml-head");
    const headBase = head ? { o: head.style.opacity, tr: head.style.translate, sc: head.style.scale, or: head.style.transformOrigin } : null;
    // the headline steps aside: its ink centred in the room the panel leaves, smaller if it would run under the panel
    let aside = { dx: 0, s: 1, or: "50% 50%" };
    if (head) {
      const r = doc.createRange(); r.selectNodeContents(head);
      const st = ctx.stage.getBoundingClientRect(), sk = st.width / (ctx.stage.offsetWidth || 1) || 1, ink = r.getBoundingClientRect(), hb = head.getBoundingClientRect();
      if (ink.width > 0) {
        const x = (ink.left - st.left) / sk, w = ink.width / sk, roomL = rtl ? 32 * k : PW + 32 * k, roomW = f.W - PW - 64 * k, cx = x + w / 2;
        aside = { dx: roomL + roomW / 2 - cx, s: Math.min(1, roomW / w), or: `${((ink.left + ink.width / 2 - hb.left) / sk).toFixed(1)}px ${((ink.top + ink.height / 2 - hb.top) / sk).toFixed(1)}px` };
      }
    }
    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.3, end);
        const u = ML.out(t, at, at + 0.4);
        panel.style.translate = `${((1 - u) * (rtl ? 1 : -1) * 102).toFixed(3)}% 0`;
        panel.style.opacity = (t < at ? 0 : 1 - leave).toFixed(4);
        tint.style.opacity = (u * (1 - leave)).toFixed(4);
        // a board we built comes and goes with the panel; the target's own cards stay
        if (board) { board.style.opacity = (t < at ? 0 : ML.out(t, at + 0.1, at + 0.45) * (1 - leave)).toFixed(4); board.style.translate = `${((1 - ML.out(t, at + 0.1, at + 0.45)) * (rtl ? -24 : 24) * k).toFixed(2)}px 0`; }
        if (head) {
          if (t < at) { head.style.opacity = headBase.o; head.style.translate = headBase.tr; head.style.scale = headBase.sc; head.style.transformOrigin = headBase.or; }
          else { const h = ML.ease(t, at, at + 0.45) * (1 - leave); head.style.opacity = (1 - 0.65 * h).toFixed(4); head.style.translate = `${(h * aside.dx).toFixed(2)}px 0`; head.style.scale = (1 + (aside.s - 1) * h).toFixed(4); head.style.transformOrigin = aside.or; }
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
