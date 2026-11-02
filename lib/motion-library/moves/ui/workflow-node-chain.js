// Workflow nodes light up in order: step cards sit at 40 % with a hollow status dot; per step (on its spoken word, or
// 0.35 s apart) the card goes .4 → 1 and its edge to the signal at 50 % over 0.22 s, the status dot pops 0 → 1
// back.out(2) in 0.25 s with a mint ring pulse (0 → 6 px, fading), and the connector into the next card draws from its
// out-port 0.4 s power2.inOut while its end circle pops (0.2 s).
// Graph mode (operational trace / film flows): every step starts once all its inputs are done + HOP (the result rides
// the thread as a bead), depth = 1 + the deepest input groups steps into waves (columns on wide, rows on tall), and
// states idle / wait / run / done drive the styling (a spinner while it works, then the reveal). The run starts after
// "Generate all" is pressed; times come from the graph, so another node retimes everything after it.
// A list target with items gives the step titles; otherwise sample titles. Built over the target or the picture region.
// Source: MengTo/Skills operational-enterprise-ai demo (node / connector / status dot) + html-demo film.md "Flows
// scheduled from their graph" (MIT) — ported as a pure function of t.
ML.define({
  id: "ui.workflow-node-chain",
  category: "ui",
  name: "Workflow nodes light up in order",
  does: "Workflow step cards switch on one after another — status dot fills, title brightens — while connectors draw between them, passing results along in waves.",
  says: ["step", "flow", "tech", "trust", "connection", "speed"],
  energy: 2,
  targets: ["card", "list", "shape", "chart"],
  duration: [1.2, 6],
  params: {
    direction: { type: "choice", options: ["horizontal", "vertical", "graph"], default: "horizontal" },
    steps: { type: "number", range: [3, 10], default: 4 },
    timing: { type: "choice", options: ["per-spoken-step", "fixed-interval", "graph-waves"], default: "per-spoken-step" },
    hop: { type: "number", range: [0.2, 0.5], default: 0.3, unit: "s" },
    status: { type: "choice", options: ["dot", "check", "spinner-check"], default: "dot" },
    interval: { type: "number", range: [0.25, 0.8], default: 0.35, unit: "s" },
  },
  pairs: ["ui.workflow-state-stepper", "ui.working-state", "camera.push-in"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "MengTo/Skills:web-design/operational-enterprise-ai", license: "MIT", note: "node + connector + status dot from its demo; graph scheduling (inputs done + HOP, depth waves) from html-demo references/film.md" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, SVG = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(SVG, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const inEl = ctx.el && ctx.el !== ctx.stage && ctx.box(ctx.el).w > f.W * 0.4 && ctx.box(ctx.el).h > f.H * 0.15;
    const R = inEl ? ctx.box(ctx.el) : f.pic;
    const W = R.w, H = R.h, tall = H > W * 1.1;
    const graph = p.direction === "graph";
    const waves = graph || p.timing === "graph-waves";
    const hop = ML.clamp(p.hop, 0.2, 0.5);
    const p2io = (t, a, b) => { const x = ML.lin(t, a, b); return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };

    // ── titles: the target list's items, else sample steps ──
    const sample = rtl
      ? [["استلام", "تم رصد فاتورة مختلفة"], ["السياسة", "المورد والمبلغ اتراجعوا"], ["الإجراء", "تجهيز تعديل الدفع"], ["التدقيق", "إرفاق ملف الإثباتات"], ["المراجعة", "تنبيه المسؤول"], ["الاعتماد", "توقيع الإفراج"], ["المزامنة", "تحديث الدفاتر"], ["الإبلاغ", "إخطار الفريق"], ["الأرشفة", "تسجيل التشغيل"], ["التقرير", "إرسال الملخص"]]
      : [["Intake", "Invoice exception detected"], ["Policy", "Vendor and amount checked"], ["Action", "Payment change prepared"], ["Audit", "Evidence packet attached"], ["Review", "Owner notified"], ["Approve", "Release signed"], ["Sync", "Ledger updated"], ["Notify", "Team informed"], ["Archive", "Run recorded"], ["Report", "Summary sent"]];
    let items = null;
    if (ctx.el && ctx.el !== ctx.stage) {
      const kids = [...ctx.el.children].map((c) => c.textContent.trim()).filter(Boolean);
      if (kids.length >= 3) items = kids.slice(0, 10);
    }
    const n = items ? items.length : Math.round(ML.clamp(p.steps, 3, 10));
    const AR = "٠١٢٣٤٥٦٧٨٩";
    const num = (i) => { const s = String(i + 1).padStart(2, "0"); return rtl ? s.replace(/\d/g, (d) => AR[+d]) : s; };
    const titleOf = (i) => (items ? [sample[i % sample.length][0], items[i]] : sample[i % sample.length]);

    // ── the graph: inputs per node ──
    // linear chain unless direction is graph: waves of 2,2,1… (≤ 2 inputs each, every node of a wave fed by the last wave)
    let waveOf = [], inputs = [];
    if (graph) {
      const sizes = []; let left = n, k = 0;
      while (left > 0) { const s = Math.min(left, [2, 2, 1][k % 3]); sizes.push(s); left -= s; k++; }
      if (sizes.length > 1 && sizes[sizes.length - 1] === 2 && sizes[sizes.length - 2] === 1) sizes.reverse();
      let idx = 0; const byWave = [];
      sizes.forEach((s, w) => { byWave.push([]); for (let j = 0; j < s; j++) { waveOf[idx] = w; byWave[w].push(idx); inputs[idx] = w ? byWave[w - 1].slice() : []; idx++; } });
    } else for (let i = 0; i < n; i++) { waveOf[i] = i; inputs[i] = i ? [i - 1] : []; }
    const depth = []; for (let i = 0; i < n; i++) depth[i] = 1 + Math.max(0, ...inputs[i].map((j) => depth[j]));

    // ── layout: rects for every node, in region px ──
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${W}px;height:${H}px;pointer-events:none;z-index:6;font-family:var(--x-body-font);`, host);
    const back = mk("div", `position:absolute;inset:0;border-radius:var(--x-radius);background:var(--x-ground);`, layer);
    const padTop = waves ? Math.min(W, H) * 0.12 : 0; // room for "Generate all"
    const AW = W, AH = H - padTop;
    const rects = [];
    let flowAxis = "x"; // the axis connectors leave along
    if (graph) {
      const nW = Math.max(...waveOf) + 1;
      const per = (w) => waveOf.filter((x) => x === w).length;
      if (tall) {
        flowAxis = "y";
        const gy = AH * 0.07, nh = Math.min((AH - gy * (nW - 1)) / nW, W * 0.3), gx = W * 0.06, nw = Math.min((W - gx) / 2, nh * 2.4);
        const total = nW * nh + (nW - 1) * gy, oy = padTop + (AH - total) / 2;
        const seen = {};
        for (let i = 0; i < n; i++) { const w = waveOf[i], c = per(w), j = (seen[w] = (seen[w] ?? -1) + 1); const rowW = c * nw + (c - 1) * gx, ox = (W - rowW) / 2; let x = ox + j * (nw + gx); if (rtl) x = W - x - nw; rects[i] = { x, y: oy + w * (nh + gy), w: nw, h: nh }; }
      } else {
        const gx = W * 0.05, nw = Math.min((W - gx * (nW - 1)) / nW, W * 0.26), nh = Math.min(nw * 0.5, (AH - AH * 0.08) / 2);
        const gy = Math.min(AH * 0.08, nh * 0.4);
        const total = nW * nw + (nW - 1) * gx, ox = (W - total) / 2;
        const seen = {};
        for (let i = 0; i < n; i++) { const w = waveOf[i], c = per(w), j = (seen[w] = (seen[w] ?? -1) + 1); const colH = c * nh + (c - 1) * gy, oy = padTop + (AH - colH) / 2; let x = ox + w * (nw + gx); if (rtl) x = W - x - nw; rects[i] = { x, y: oy + j * (nh + gy), w: nw, h: nh }; }
      }
    } else {
      const vertical = p.direction === "vertical";
      flowAxis = vertical ? "y" : "x";
      const maxPer = vertical ? (tall ? 6 : 4) : tall ? 2 : W / H > 1.5 ? 5 : 3;
      const lines = Math.ceil(n / maxPer), per = Math.ceil(n / lines);
      if (!vertical) {
        const gx = W * (per > 3 ? 0.045 : 0.07), nw = Math.min((W - gx * (per - 1)) / per, W * 0.34), gy = AH * 0.1;
        const nh = Math.min(nw * (tall ? 0.7 : 0.48), (AH - gy * (lines - 1)) / lines);
        const totalW = per * nw + (per - 1) * gx, totalH = lines * nh + (lines - 1) * gy, ox = (W - totalW) / 2, oy = padTop + (AH - totalH) / 2;
        for (let i = 0; i < n; i++) { const r = Math.floor(i / per), c0 = i % per, c = r % 2 ? per - 1 - c0 : c0; let x = ox + c * (nw + gx); if (rtl) x = W - x - nw; rects[i] = { x, y: oy + r * (nh + gy), w: nw, h: nh, row: r }; }
      } else {
        const gy = AH * (per > 4 ? 0.04 : 0.06), nh = Math.min((AH - gy * (per - 1)) / per, AH * 0.2), gx = W * 0.08;
        const nw = Math.min((W - gx * (lines - 1)) / lines, nh * 4.2);
        const totalW = lines * nw + (lines - 1) * gx, totalH = per * nh + (per - 1) * gy, ox = (W - totalW) / 2, oy = padTop + (AH - totalH) / 2;
        for (let i = 0; i < n; i++) { const c0 = Math.floor(i / per), r0 = i % per, r = c0 % 2 ? per - 1 - r0 : r0; let x = ox + c0 * (nw + gx); if (rtl) x = W - x - nw; rects[i] = { x, y: oy + r * (nh + gy), w: nw, h: nh, col: c0 }; }
      }
    }

    // ── nodes ──
    const nodes = rects.map((r, i) => {
      const [lab, title] = titleOf(i);
      const u = Math.min(r.w * 0.5, r.h * 0.95);
      const box = mk("div", `position:absolute;left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;box-sizing:border-box;padding:${u * 0.13}px ${u * 0.15}px;border-radius:calc(var(--x-radius) * 0.45);background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);overflow:hidden;display:flex;flex-direction:column;justify-content:center;gap:${u * 0.06}px;`, layer);
      const small = mk("div", `font:var(--x-label-weight) ${u * 0.11}px/1.1 ${rtl ? "var(--x-body-font)" : "var(--x-label-font)"};letter-spacing:${rtl ? 0 : "0.08em"};text-transform:var(--x-label-case);color:var(--x-dim);white-space:nowrap;padding-inline-end:${u * 0.24}px;`, box, `${num(i)} · ${lab}`);
      const strong = mk("div", `font:var(--x-head-weight) ${u * 0.17}px/1.18 var(--x-head-font);letter-spacing:-0.01em;color:var(--x-ink);`, box, title);
      // shrink the title until the card holds it
      let fs = u * 0.17;
      for (let k = 0; k < 12 && box.scrollHeight > box.clientHeight + 1; k++) { fs *= 0.9; strong.style.fontSize = fs + "px"; }
      // status, top end corner
      const sd = u * 0.13, sx = rtl ? u * 0.12 : r.w - u * 0.12 - sd, sy = u * 0.12;
      const ring = mk("div", `position:absolute;left:${sx}px;top:${sy}px;width:${sd}px;height:${sd}px;box-sizing:border-box;border-radius:50%;border:${Math.max(1, sd * 0.12)}px solid var(--x-line);`, box);
      const dot = mk("div", `position:absolute;left:${sx}px;top:${sy}px;width:${sd}px;height:${sd}px;border-radius:50%;background:var(--x-good);`, box);
      const spin = mk("div", `position:absolute;left:${sx}px;top:${sy}px;width:${sd}px;height:${sd}px;box-sizing:border-box;border-radius:50%;border:${Math.max(1, sd * 0.14)}px solid color-mix(in srgb, var(--x-accent) 25%, transparent);border-top-color:var(--x-accent);visibility:hidden;`, box);
      const chk = doc.createElementNS(SVG, "svg"); chk.setAttribute("viewBox", "0 0 12 12");
      chk.style.cssText = `position:absolute;left:${sx}px;top:${sy}px;width:${sd}px;height:${sd}px;overflow:visible;`;
      const path = sv("path", { d: "M3 6.3l2 2 4-4.6", fill: "none", stroke: "var(--x-accent-ink)", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": "10", "stroke-dashoffset": "10" }, chk);
      box.append(chk);
      return { box, small, strong, ring, dot, spin, path, r };
    });

    // ── connectors: SVG paths from out-port to in-port, a faint track always, the signal drawn over it ──
    const svg = doc.createElementNS(SVG, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("width", W); svg.setAttribute("height", H);
    svg.style.cssText = "position:absolute;left:0;top:0;overflow:visible;";
    layer.insertBefore(svg, nodes[0].box);
    const sw = Math.max(1.5, Math.min(W, H) * 0.0035), pr = Math.max(3, Math.min(W, H) * 0.008);
    const port = (r, side) => side === "r" ? { x: r.x + r.w, y: r.y + r.h / 2 } : side === "l" ? { x: r.x, y: r.y + r.h / 2 } : side === "b" ? { x: r.x + r.w / 2, y: r.y + r.h } : { x: r.x + r.w / 2, y: r.y };
    const edges = [];
    for (let b = 0; b < n; b++) for (const a of inputs[b]) {
      const A = rects[a], B = rects[b];
      let s, e, d;
      if (flowAxis === "x" && (A.row === undefined || A.row === B.row)) {
        const fwd = B.x + B.w / 2 > A.x + A.w / 2;
        s = port(A, fwd ? "r" : "l"); e = port(B, fwd ? "l" : "r");
        const mx = (s.x + e.x) / 2; d = `M${s.x} ${s.y} C${mx} ${s.y} ${mx} ${e.y} ${e.x} ${e.y}`;
      } else if (flowAxis === "y" && (A.col === undefined || A.col === B.col)) {
        const down = B.y > A.y; s = port(A, down ? "b" : "t"); e = port(B, down ? "t" : "b");
        const my = (s.y + e.y) / 2; d = `M${s.x} ${s.y} C${s.x} ${my} ${e.x} ${my} ${e.x} ${e.y}`;
      } else if (flowAxis === "x") {
        // snake turn: down from the bottom of A into the top of B
        s = port(A, "b"); e = port(B, "t"); const my = (s.y + e.y) / 2; d = `M${s.x} ${s.y} C${s.x} ${my} ${e.x} ${my} ${e.x} ${e.y}`;
      } else {
        // column turn: out the end side of A into the start side of B
        const fwd = B.x > A.x; s = port(A, fwd ? "r" : "l"); e = port(B, fwd ? "l" : "r"); const mx = (s.x + e.x) / 2; d = `M${s.x} ${s.y} C${mx} ${s.y} ${mx} ${e.y} ${e.x} ${e.y}`;
      }
      const track = sv("path", { d, fill: "none", stroke: "var(--x-line)", "stroke-width": sw }, svg);
      const line = sv("path", { d, fill: "none", stroke: "var(--x-accent)", "stroke-width": sw, "stroke-linecap": "round" }, svg);
      const L = line.getTotalLength();
      line.setAttribute("stroke-dasharray", `${L} ${L + 2}`);
      const c0 = sv("circle", { cx: s.x, cy: s.y, r: pr, fill: "var(--x-ground)", stroke: "var(--x-accent)", "stroke-width": sw }, svg);
      const c1 = sv("circle", { cx: e.x, cy: e.y, r: pr, fill: "var(--x-ground)", stroke: "var(--x-accent)", "stroke-width": sw }, svg);
      const bead = sv("circle", { cx: s.x, cy: s.y, r: pr * 0.9, fill: "var(--x-accent)" }, svg);
      const pts = Array.from({ length: 41 }, (_, k) => line.getPointAtLength((L * k) / 40));
      edges.push({ a, b, track, line, L, c0, c1, bead, pts });
    }

    // ── "Generate all" (graph runs) ──
    let go = null, goLabel = null;
    const L10 = rtl ? { idle: "شغّل الكل", run: "شغّال…", done: "تم" } : { idle: "Generate all", run: "Running…", done: "Done" };
    if (waves) {
      const gh = padTop * 0.62;
      go = mk("div", `position:absolute;top:${padTop * 0.12}px;${rtl ? "right" : "left"}:${rects.reduce((m, r) => Math.min(m, rtl ? W - r.x - r.w : r.x), W)}px;height:${gh}px;display:flex;align-items:center;gap:${gh * 0.3}px;padding:0 ${gh * 0.45}px;border-radius:var(--x-radius-s);background:var(--x-accent);color:var(--x-accent-ink);font:var(--x-head-weight) ${gh * 0.42}px/1 var(--x-body-font);white-space:nowrap;box-shadow:var(--x-shadow);`, layer);
      mk("i", `width:0;height:0;border-style:solid;border-width:${gh * 0.16}px 0 ${gh * 0.16}px ${gh * 0.26}px;border-color:transparent transparent transparent currentColor;${rtl ? "transform:scaleX(-1);" : ""}`, go);
      goLabel = mk("span", "", go, L10.idle);
    }

    // ── times ──
    const S = new Array(n), D = new Array(n); // run start, done
    const intv = ML.clamp(p.interval, 0.25, 0.8);
    const lead = at + 0.3;
    let runAt = lead;
    if (waves) {
      runAt = at + Math.min(2.2, Math.max(0.45, (end - at) * 0.18));
      const dur = (i) => 0.45 + ML.rnd(i, 7) * 0.35;
      for (let i = 0; i < n; i++) { S[i] = inputs[i].length ? Math.max(...inputs[i].map((j) => D[j])) + hop : runAt; D[i] = S[i] + dur(i); }
      const last = Math.max(...D), room = end - 0.45 - runAt;
      if (last - runAt > room) { const k = room / (last - runAt); for (let i = 0; i < n; i++) { S[i] = runAt + (S[i] - runAt) * k; D[i] = runAt + (D[i] - runAt) * k; } }
    } else {
      let gap = intv; const room = end - 0.5 - lead;
      if (gap * (n - 1) > room) gap = Math.max(0.12, room / (n - 1));
      for (let i = 0; i < n; i++) D[i] = lead + i * gap;
      if (p.timing === "per-spoken-step") {
        const spoken = (ctx.words || []).filter((w) => w.t >= at + 0.1 && w.t <= end - 0.45).map((w) => w.t);
        if (spoken.length >= n) for (let i = 0; i < n; i++) D[i] = spoken[Math.round((i * (spoken.length - 1)) / Math.max(1, n - 1))];
        else spoken.forEach((t, i) => { D[i] = t; });
        for (let i = 1; i < n; i++) D[i] = Math.max(D[i], D[i - 1] + 0.12);
      }
      const runLen = p.status === "spinner-check" ? 0.3 : 0;
      for (let i = 0; i < n; i++) S[i] = Math.max(at + 0.25, D[i] - runLen);
    }
    for (const e of edges) {
      if (waves) { e.t0 = D[e.a]; e.t1 = Math.max(D[e.a] + 0.05, S[e.b]); }
      else { e.t1 = S[e.b]; e.t0 = Math.max(D[e.a], e.t1 - 0.4); }
    }
    // sound: one blip per step done (about one per beat), a click on Generate all
    if (go) ctx.sfx(runAt - 0.05, "click", 0.35);
    let lastS = -1;
    D.slice().sort((a, b) => a - b).forEach((t) => { if (t - lastS >= 0.18) { ctx.sfx(t, "blip", 0.25); lastS = t; } });

    const enterA = at, enterB = at + 0.3;
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.22);
        layer.style.opacity = ((1 - leave) * ML.out(t, enterA, enterB)).toFixed(4);
        back.style.opacity = "1";
        nodes.forEach((nd, i) => {
          const lit = ML.out(t, D[i], D[i] + 0.22);
          // wait: an input of mine is running; run: I am running
          const running = t >= S[i] && t < D[i];
          const waiting = waves && !running && t < S[i] && inputs[i].some((j) => t >= S[j]);
          const base = running ? 0.8 : waiting ? 0.55 : 0.4;
          nd.box.style.opacity = (base + (1 - base) * lit).toFixed(4);
          const edgeMix = Math.max(lit * 50, running ? 30 + 20 * (0.5 + 0.5 * Math.sin((t - S[i]) * 9)) : 0);
          nd.box.style.borderColor = edgeMix > 0.5 ? `color-mix(in srgb, var(--x-accent) ${edgeMix.toFixed(1)}%, var(--x-edge-color))` : "";
          nd.strong.style.color = `color-mix(in srgb, var(--x-ink) ${(70 + 30 * lit).toFixed(1)}%, var(--x-dim))`;
          // status
          const pop = t < D[i] ? 0 : Math.max(0, ML.back(t, D[i], D[i] + 0.25, 2));
          nd.dot.style.scale = pop.toFixed(4);
          nd.dot.style.background = p.status === "dot" ? "var(--x-good)" : "var(--x-accent)";
          const pu = ML.lin(t, D[i], D[i] + 0.45);
          nd.dot.style.boxShadow = pu > 0 && pu < 1 ? `0 0 0 ${(pu * nd.r.h * 0.06).toFixed(2)}px color-mix(in srgb, var(--x-good) ${((1 - pu) * 55).toFixed(1)}%, transparent)` : "none";
          const showSpin = (p.status === "spinner-check" || waves) && running;
          nd.spin.style.visibility = showSpin ? "visible" : "hidden";
          nd.spin.style.rotate = `${(((t - S[i]) * 450) % 360).toFixed(1)}deg`;
          nd.ring.style.opacity = showSpin ? "0" : "1";
          const draw = p.status === "dot" ? 0 : ML.out(t, D[i] + 0.08, D[i] + 0.33);
          nd.path.setAttribute("stroke-dashoffset", (10 * (1 - draw)).toFixed(3));
        });
        for (const e of edges) {
          const u = p2io(t, e.t0, e.t1);
          e.line.setAttribute("stroke-dashoffset", (e.L * (1 - u)).toFixed(2));
          e.line.style.opacity = u > 0 ? "1" : "0";
          const s0 = ML.back(t, e.t0 - 0.05, e.t0 + 0.15, 2), s1 = t < e.t1 ? 0 : ML.back(t, e.t1, e.t1 + 0.2, 2);
          e.c0.setAttribute("r", (pr * (0.55 + 0.45 * Math.max(0, s0))).toFixed(2));
          e.c0.setAttribute("stroke", t >= e.t0 ? "var(--x-accent)" : "var(--x-line)");
          e.c1.setAttribute("r", (pr * (0.55 + 0.45 * Math.max(0, s1))).toFixed(2));
          e.c1.setAttribute("stroke", t >= e.t1 ? "var(--x-accent)" : "var(--x-line)");
          // the result riding the thread (graph runs)
          const on = waves && t > e.t0 && t < e.t1;
          e.bead.style.visibility = on ? "visible" : "hidden";
          if (on) { const k = Math.min(40, Math.round(u * 40)), q = e.pts[k]; e.bead.setAttribute("cx", q.x.toFixed(2)); e.bead.setAttribute("cy", q.y.toFixed(2)); }
        }
        if (go) {
          const press = ML.pulse(t, runAt, 0.06, 0.16);
          go.style.scale = (1 - 0.06 * press).toFixed(4);
          const done = t >= Math.max(...D) + 0.1;
          const s = t < runAt ? L10.idle : done ? L10.done : L10.run;
          if (goLabel.textContent !== s) goLabel.textContent = s;
          go.style.background = t >= runAt && !done ? "var(--x-panel-2)" : "var(--x-accent)";
          go.style.color = t >= runAt && !done ? "var(--x-dim)" : "var(--x-accent-ink)";
        }
      },
    };
  },
});
