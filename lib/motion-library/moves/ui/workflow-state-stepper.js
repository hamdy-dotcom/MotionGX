// Workflow state stepper: the prompt-to-output states (Input, Processing, Draft, Edit, Approval, Publish) as chips on a
// line; an active marker (a signal pill with accent-ink text, a dot, or an underline) slides chip to chip in
// 0.42–0.6 s power3.inOut, holding on each state as it is spoken; completed chips get a check (stroke draw 0.25 s) and
// ink colour, upcoming ones stay muted, and the line fills up to the marker. Approval can hold longer with a "waiting"
// pulse, or stop there for good (never auto-publishing).
// A list target with 3+ items is stepped in place (its items become the chips; the chips keep their own look, the
// marker slides under their text); otherwise a stepper is built in a panel on the picture region.
// Source: MengTo/Skills product-proof-saas (prompt → output with explicit approval and publish states, MIT) — the
// motion is our own on one clock.
ML.define({
  id: "ui.workflow-state-stepper",
  category: "ui",
  name: "Workflow state stepper",
  does: "A row of state chips — Input, Processing, Draft, Edit, Approval, Publish — advances one by one with a marker sliding along.",
  says: ["step", "flow", "trust"],
  energy: 2,
  targets: ["list", "label"],
  duration: [1.5, 6],
  params: {
    states: { type: "number", range: [3, 7], default: 6 },
    orientation: { type: "choice", options: ["horizontal", "vertical"], default: "horizontal" },
    marker: { type: "choice", options: ["pill", "dot", "underline"], default: "pill" },
    approval: { type: "choice", options: ["advance", "hold-longer", "wait"], default: "hold-longer" },
    slide: { type: "number", range: [0.42, 0.6], default: 0.5, unit: "s" },
    sync: { type: "choice", options: ["spoken", "even"], default: "spoken" },
  },
  pairs: ["ui.workflow-node-chain", "ui.working-state", "text-in.punchline"],
  avoid: ["playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "click.confirm",
  source: { from: "MengTo/Skills:web-design/product-proof-saas", license: "MIT", note: "its prompt-to-output state model (input, processing, draft, edit, approval, publish); stepper motion rebuilt on one clock" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, SVG = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const p3io = (t, a, b) => { const x = ML.lin(t, a, b); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
    const vertical = p.orientation === "vertical";

    // ── the chips: the target list's own items, or a built stepper ──
    const NAMES = {
      en: { 3: ["Input", "Draft", "Publish"], 4: ["Input", "Processing", "Draft", "Publish"], 5: ["Input", "Processing", "Draft", "Approval", "Publish"], 6: ["Input", "Processing", "Draft", "Edit", "Approval", "Publish"], 7: ["Input", "Processing", "Draft", "Edit", "Review", "Approval", "Publish"] },
      ar: { 3: ["إدخال", "مسودة", "نشر"], 4: ["إدخال", "معالجة", "مسودة", "نشر"], 5: ["إدخال", "معالجة", "مسودة", "موافقة", "نشر"], 6: ["إدخال", "معالجة", "مسودة", "تعديل", "موافقة", "نشر"], 7: ["إدخال", "معالجة", "مسودة", "تعديل", "مراجعة", "موافقة", "نشر"] },
    };
    const list = ctx.el && ctx.el !== ctx.stage && ctx.el.children.length >= 3 ? ctx.el : null;
    let wrap, chips, built = !list, panel = null;
    if (list) {
      wrap = list;
      if (getComputedStyle(wrap).position === "static") wrap.style.position = "relative";
      if (vertical) { wrap.style.flexDirection = "column"; wrap.style.alignItems = rtl ? "flex-end" : "flex-start"; }
      chips = [...wrap.children].slice(0, 7);
    } else {
      const n = Math.round(ML.clamp(p.states, 3, 7));
      const names = NAMES[rtl ? "ar" : "en"][n];
      const R = f.pic, tall = f.H > f.W * 1.2;
      const fs = Math.min(f.W, f.H) * (vertical ? 0.034 : tall ? 0.03 : 0.024);
      panel = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:6;`, ctx.scene || ctx.stage);
      const back = mk("div", `position:absolute;inset:0;border-radius:var(--x-radius);background:var(--x-ground);`, panel);
      const card = mk("div", `position:relative;box-sizing:border-box;max-width:100%;padding:${fs * 1.4}px ${fs * 1.3}px;border-radius:var(--x-radius);background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);font-family:var(--x-body-font);`, panel);
      mk("div", `font:var(--x-label-weight) ${fs * 0.62}px/1 ${rtl ? "var(--x-body-font)" : "var(--x-label-font)"};letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:var(--x-label-case);color:var(--x-dim);margin-bottom:${fs * 1.1}px;`, card, rtl ? "حالة التشغيل" : "Run status");
      // horizontal on a tall frame wraps into two rows; vertical is one column
      const twoRows = !vertical && tall && n > 4;
      wrap = mk("div", `position:relative;display:flex;${vertical ? "flex-direction:column;align-items:flex-start;" : `flex-wrap:${twoRows ? "wrap" : "nowrap"};align-items:center;`}gap:${fs * (vertical ? 0.55 : 0.45)}px ${fs * 0.55}px;font-size:${fs}px;${twoRows ? `max-width:${R.w * 0.86}px;justify-content:center;` : ""}`, card);
      chips = names.map((nm) => mk("span", `padding:${fs * 0.5}px ${fs * 0.85}px;border-radius:var(--x-radius-s);background:var(--x-panel-2);border:var(--x-edge) solid var(--x-edge-color);font:var(--x-head-weight) ${fs}px/1.1 var(--x-body-font);white-space:nowrap;`, wrap, nm));
      panel.__back = back;
    }
    const n = chips.length;
    const names = chips.map((c) => c.textContent.trim());

    // every chip: a fixed status mark before its text (hollow ring → check), so nothing reflows as states change
    const marks = chips.map((c) => {
      const em = parseFloat(getComputedStyle(c).fontSize) || 24;
      const s = doc.createElementNS(SVG, "svg"); s.setAttribute("viewBox", "0 0 16 16");
      s.style.cssText = `width:${em * 0.8}px;height:${em * 0.8}px;flex:none;overflow:visible;vertical-align:-0.1em;margin-inline-end:${em * 0.35}px;`;
      const ring = doc.createElementNS(SVG, "circle"); ring.setAttribute("cx", 8); ring.setAttribute("cy", 8); ring.setAttribute("r", 6.6); ring.setAttribute("fill", "none"); ring.setAttribute("stroke-width", 1.6);
      const fill = doc.createElementNS(SVG, "circle"); fill.setAttribute("cx", 8); fill.setAttribute("cy", 8); fill.setAttribute("r", 7.4);
      const tick = doc.createElementNS(SVG, "path"); tick.setAttribute("d", "M4.6 8.3l2.3 2.3 4.5-5"); tick.setAttribute("fill", "none"); tick.setAttribute("stroke-width", 1.9); tick.setAttribute("stroke-linecap", "round"); tick.setAttribute("stroke-linejoin", "round"); tick.setAttribute("stroke-dasharray", "10"); tick.setAttribute("stroke-dashoffset", "10");
      s.append(ring, fill, tick);
      // keep the chip's text in one span so its colour can change alone
      const txt = doc.createElement("span"); txt.append(...[...c.childNodes]);
      c.style.display = "inline-flex"; c.style.alignItems = "center"; c.style.position = "relative"; c.style.zIndex = "2";
      c.append(s, txt);
      return { ring, fill, tick, txt };
    });

    // under the chips: their own faces copied onto slots (so the marker can pass under the text), the line, the marker
    const rectOf = (el) => { const a = el.getBoundingClientRect(), b = wrap.getBoundingClientRect(), k = b.width / (wrap.offsetWidth || 1) || 1; return { x: (a.left - b.left) / k, y: (a.top - b.top) / k, w: a.width / k, h: a.height / k }; };
    const rects = chips.map(rectOf);
    const under = mk("div", "position:absolute;left:0;top:0;width:0;height:0;z-index:1;", wrap);
    wrap.prepend(under);
    const lineW = Math.max(2, rects[0].h * 0.06);
    // the line through the chip centres (straight runs only; a wrapped row draws its own segment)
    const segs = [];
    for (let i = 0; i < n - 1; i++) {
      const a = rects[i], b = rects[i + 1];
      const sameRow = Math.abs(a.y - b.y) < a.h * 0.5;
      if (vertical || !sameRow) {
        if (!vertical) { segs.push(null); continue; }
        const x = (rtl ? a.x + a.w - a.h / 2 : a.x + a.h / 2);
        const seg = mk("i", `position:absolute;left:${x - lineW / 2}px;top:${a.y + a.h}px;width:${lineW}px;height:${b.y - a.y - a.h}px;transform-origin:50% 0;`, under);
        segs.push({ seg, axis: "y" });
      } else {
        const x0 = Math.min(a.x + a.w, b.x + b.w), x1 = Math.max(a.x, b.x), from = Math.min(x0, x1), len = Math.abs(x1 - x0);
        const seg = mk("i", `position:absolute;left:${from}px;top:${a.y + a.h / 2 - lineW / 2}px;width:${len}px;height:${lineW}px;transform-origin:${rtl ? "100%" : "0"} 50%;`, under);
        segs.push({ seg, axis: "x" });
      }
    }
    segs.forEach((s) => s && (s.seg.style.background = "var(--x-line)"));
    const fills = segs.map((s) => { if (!s) return null; const e = s.seg.cloneNode(); e.style.background = "var(--x-accent)"; under.append(e); return e; });
    const slots = chips.map((c, i) => {
      const cs = getComputedStyle(c), r = rects[i];
      const sl = mk("i", `position:absolute;left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;box-sizing:border-box;border-radius:${cs.borderRadius};background:${cs.backgroundColor};border:${cs.borderWidth} ${cs.borderStyle} ${cs.borderColor};box-shadow:${cs.boxShadow};`, under);
      c.style.background = "transparent"; c.style.borderColor = "transparent"; c.style.boxShadow = "none";
      return sl;
    });
    const radius = getComputedStyle(chips[0]).borderRadius;
    const marker = mk("i", `position:absolute;left:0;top:0;box-sizing:border-box;background:var(--x-accent);`, under);
    const halo = mk("i", `position:absolute;left:0;top:0;box-sizing:border-box;border:${lineW}px solid var(--x-accent);border-radius:${radius};`, under);

    // ── times: each state lands on its spoken word, else evenly (approval weighted) ──
    const isApproval = (s) => /approv|review|موافق|اعتماد/i.test(s);
    const isLast = (i) => i === n - 1;
    const approvalAt = names.findIndex(isApproval);
    const stopAt = p.approval === "wait" && approvalAt > 0 ? approvalAt : n - 1;
    const weight = names.map((s, i) => (i === 0 ? 0 : p.approval !== "advance" && i - 1 === approvalAt ? 1.8 : 1));
    const span0 = at + 0.25, span1 = end - 0.75;
    const sumW = weight.slice(1, stopAt + 1).reduce((a, b) => a + b, 0) || 1;
    const A = []; let acc = 0;
    for (let i = 0; i <= stopAt; i++) { acc += weight[i]; A[i] = span0 + ((span1 - span0) * acc) / sumW; }
    A[0] = span0;
    if (p.sync === "spoken") for (let i = 1; i <= stopAt; i++) { const w = ctx.word(names[i], -1); if (w >= at && w <= end - 0.4) A[i] = w; }
    for (let i = 1; i <= stopAt; i++) A[i] = Math.max(A[i], A[i - 1] + 0.45);
    const slideD = ML.clamp(p.slide, 0.42, 0.6);
    // the marker sets off at A[i] − slide so it arrives on the word
    const go = A.map((a, i) => (i === 0 ? a : Math.max(A[i - 1] + 0.05, a - slideD)));
    for (let i = 0; i <= stopAt; i++) ctx.sfx(A[i], i === 0 ? "tap" : "click.confirm", 0.3);

    const box = (i) => rects[i];
    const lerp = (a, b, u) => a + (b - a) * u;
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.22);
        if (panel) { panel.style.opacity = ((1 - leave) * ML.out(t, at, at + 0.3)).toFixed(4); }
        else wrap.style.opacity = (1 - leave).toFixed(4);
        // where the marker is: chip k, sliding towards k + 1
        let k = 0, u = 0;
        for (let i = 1; i <= stopAt; i++) if (t >= go[i]) { k = i - 1; u = p3io(t, go[i], go[i] + slideD); if (u >= 1) { k = i; u = 0; } }
        const a = box(k), b = box(Math.min(n - 1, k + (u > 0 ? 1 : 0)));
        const r = { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), w: lerp(a.w, b.w, u), h: lerp(a.h, b.h, u) };
        const appear = ML.back(t, A[0] - 0.1, A[0] + 0.25, 1.6), vis = t >= A[0] - 0.1;
        marker.style.visibility = vis ? "visible" : "hidden";
        if (p.marker === "pill") {
          marker.style.cssText += `left:${r.x.toFixed(2)}px;top:${r.y.toFixed(2)}px;width:${r.w.toFixed(2)}px;height:${r.h.toFixed(2)}px;border-radius:${radius};`;
        } else if (p.marker === "underline") {
          const uh = Math.max(3, r.h * 0.08);
          marker.style.cssText += `left:${(r.x + r.w * 0.12).toFixed(2)}px;top:${(r.y + r.h + uh * 1.2).toFixed(2)}px;width:${(r.w * 0.76).toFixed(2)}px;height:${uh.toFixed(2)}px;border-radius:${uh}px;`;
        } else {
          const d = Math.max(6, r.h * 0.22);
          // under the chip on a row; beside its end on a column
          const dx = vertical ? (rtl ? r.x - d * 1.6 : r.x + r.w + d * 0.6) : r.x + r.w / 2 - d / 2, dy = vertical ? r.y + r.h / 2 - d / 2 : r.y + r.h + d * 0.5;
          marker.style.cssText += `left:${dx.toFixed(2)}px;top:${dy.toFixed(2)}px;width:${d}px;height:${d}px;border-radius:50%;`;
        }
        marker.style.scale = Math.max(0, appear).toFixed(4);
        // "waiting" pulse on approval while held
        const holding = approvalAt >= 0 && k === approvalAt && u === 0 && t >= A[approvalAt] && p.approval !== "advance";
        const ph = holding ? ((t - A[approvalAt]) % 1.1) / 1.1 : 0;
        halo.style.visibility = holding ? "visible" : "hidden";
        if (holding) { const ex = ph * r.h * 0.35; halo.style.cssText += `left:${(r.x - ex).toFixed(2)}px;top:${(r.y - ex).toFixed(2)}px;width:${(r.w + 2 * ex).toFixed(2)}px;height:${(r.h + 2 * ex).toFixed(2)}px;opacity:${((1 - ph) * 0.6).toFixed(3)};`; }
        // chips: done / active / upcoming
        chips.forEach((c, i) => {
          // a chip is done when the marker leaves it (the last one a beat after it is reached; a held approval never)
          const doneAt = i < stopAt ? go[i + 1] : i === stopAt && isLast(i) ? A[i] + 0.4 : Infinity;
          const done = t >= doneAt;
          const activeAmt = p.marker === "pill" ? Math.max(0, 1 - Math.abs(i - (k + u))) * (vis ? 1 : 0) : 0;
          const reached = i <= stopAt && t >= A[i];
          const m = marks[i];
          // text: accent-ink under the pill, ink once reached, dim before
          const base = reached || done ? "var(--x-ink)" : "var(--x-dim)";
          m.txt.style.color = activeAmt > 0.01 ? `color-mix(in srgb, var(--x-accent-ink) ${(activeAmt * 100).toFixed(1)}%, ${base})` : base;
          c.style.opacity = reached || activeAmt > 0.3 ? "1" : "0.62";
          m.tick.setAttribute("stroke-dashoffset", (10 * (1 - (done ? ML.out(t, doneAt, doneAt + 0.25) : 0))).toFixed(3));
          m.fill.setAttribute("r", (7.4 * (done ? Math.max(0, ML.back(t, doneAt, doneAt + 0.2, 1.8)) : 0)).toFixed(3));
          const onPill = activeAmt > 0.5;
          m.fill.setAttribute("fill", onPill ? "var(--x-accent-ink)" : "var(--x-accent)");
          m.tick.setAttribute("stroke", onPill ? "var(--x-accent)" : "var(--x-accent-ink)");
          m.ring.setAttribute("stroke", onPill ? "var(--x-accent-ink)" : reached ? "var(--x-accent)" : "var(--x-dim)");
          m.ring.setAttribute("opacity", onPill ? "0.9" : reached ? "1" : "0.55");
        });
        // the line fills behind the marker
        fills.forEach((e, i) => {
          if (!e) return;
          const v = i < k ? 1 : i === k ? u : 0;
          e.style.scale = segs[i].axis === "x" ? `${v.toFixed(4)} 1` : `1 ${v.toFixed(4)}`;
        });
      },
    };
  },
});
