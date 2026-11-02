// Run → building → ready: the product-proof SaaS demo played as a film. A product window (app bar "Launch brief / v03"
// with a status dot and status text; a composer with an input label, a heading, the prompt and a run button; an output
// side with its cards and a 3 px progress line). The cursor glides to the run button and presses it: scale
// 1 → 0.97 → 1 over 0.18 s with a 3 px focus ring (accent at 35 %, offset 3). The stage is "running": the status text
// (idle until now; the source's rest state read "Draft ready" before anything had run) turns accent and rolls (0.2 s,
// vertically) to "Building sample…", the progress line fills scaleX 0.08 → 1 over
// `duration` s ease-in-out from its reading start, the button dims as disabled. At the end the label rolls to
// "Draft ready", the button comes back, and the output cards fade-rise (y 12 → 0, 0.45 s power3.out) 60 ms apart,
// the selected one last, growing from one column to the full width (0.5 s power3.inOut). No fake typing; replayable.
// Tall shapes stack the composer above the output, as the demo's narrow layout does.
// Source: MengTo/Skills web-design/product-proof-saas (demo markup, CSS and the click handler's states, MIT).
ML.define({
  id: "ui.generate-run",
  category: "ui",
  name: "Run → building → ready",
  does: "A run button is pressed, the status turns accent and reads 'Building…', a progress line fills, then 'Draft ready' and the output cards settle in one by one.",
  says: ["tech", "speed", "result", "proof"],
  energy: 3,
  targets: ["screen", "card", "cursor"],
  duration: [2.4, 4],
  params: {
    duration: { type: "number", range: [0.8, 2], default: 1, unit: "s" },
    outputs: { type: "number", range: [2, 4], default: 3 },
    cursor: { type: "bool", default: true },
    status_words: { type: "text", default: "Building sample…|Draft ready" },
  },
  pairs: ["ui.cursor-glide-click", "camera.push-in", "ui.frame-stepped-spinner"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "success",
  source: { from: "MengTo/Skills:web-design/product-proof-saas", license: "MIT", note: "demo/index.html: .stage.is-running, .progress i scaleX(.08→1) 1s ease-in-out, status swap; timings ours on one clock" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); parent.append(e); return e; };
    const U = (n) => `calc(var(--u) * ${n})`;
    const host = ctx.scene || ctx.stage;
    const inEl = ctx.el && ctx.el !== ctx.stage;
    const R = inEl ? ctx.box(ctx.el) : f.pic;
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;display:grid;place-items:center;pointer-events:none;z-index:6;`, host);
    const stack = R.h > R.w * 0.9;
    const L = rtl
      ? { idle: "في الانتظار", bar: "ملخص الإطلاق / ٠٣", input: "المدخل", h2: "ابنِ قصة الإطلاق", prompt: "حوّل ملاحظات المقابلات إلى قصة إطلاق واضحة، واحتفظ بكلام المؤسس، واقترح ثلاث زوايا للبداية.", run: "أنشئ مسودة تجريبية", out: "مخرجات قابلة للتعديل", sample: "عيّنة · غير منشورة",
          cards: [["٠١ · المدخل", "الميزة بدأت كحل مؤقت.", "ابدأ بالتوتر قبل شرح المنتج."], ["٠٢ · الدليل", "اعرض طريقة العمل.", "استخدم نص المقابلة كدليل."], ["٠٣ · الزاوية", "قصة يفهمها الجميع.", "جملة واحدة لكل فكرة."], ["٠٤ · الاتجاه المختار", "قصة إطلاق يقدر الفريق يعدّلها.", "كل جزء قابل للمراجعة والتراجع."]] }
      : { idle: "Idle", bar: "Launch brief / v03", input: "Input", h2: "Build the launch story", prompt: "Turn these interview notes into a clear launch narrative. Keep the founder quote and propose three opening angles.", run: "Generate sample draft", out: "Editable output", sample: "Sample · not published",
          cards: [["01 · Hook", "The feature began as a workaround.", "Lead with the tension before the product."], ["02 · Proof", "Show the workflow.", "Use the transcript as evidence."], ["03 · Angle", "A story anyone can retell.", "One sentence per idea."], ["04 · Selected direction", "A launch story the team can still edit.", "Every block stays reviewable and reversible."]] };
    const words = (p.status_words === "Building sample…|Draft ready" && rtl ? "جاري بناء العيّنة…|المسودة جاهزة" : p.status_words || "Building sample…|Draft ready").split("|");
    const busyW = words[0] || "…", doneW = words[1] || words[0] || "";
    const n = Math.round(ML.clamp(p.outputs, 2, 4));

    const LABEL = `font:var(--x-label-weight) ${U(10)} var(--x-label-font);letter-spacing:${rtl ? 0 : "0.1em"};text-transform:var(--x-label-case);color:var(--x-dim);`;
    const app = mk("div", `--u:1px;width:${U(stack ? 440 : 820)};box-sizing:border-box;padding:${U(10)};border-radius:var(--x-radius);background:color-mix(in srgb, var(--x-panel) 64%, transparent);border:1px solid var(--x-line);box-shadow:var(--x-shadow);font-family:var(--x-body-font);color:var(--x-ink);`, layer);
    const win = mk("div", `overflow:hidden;border-radius:calc(var(--x-radius) * 0.75);border:1px solid var(--x-line);background:var(--x-panel);`, app);
    const bar = mk("div", `display:flex;align-items:center;justify-content:space-between;padding:${U(12)} ${U(16)};border-bottom:1px solid var(--x-line);${LABEL}color:var(--x-ink);`, win);
    mk("span", "", bar, L.bar);
    const st = mk("span", `display:flex;align-items:center;gap:${U(8)};`, bar);
    mk("i", `width:${U(6)};height:${U(6)};border-radius:50%;background:var(--x-accent);box-shadow:0 0 0 ${U(4)} color-mix(in srgb, var(--x-accent) 12%, transparent);`, st);
    const roll = mk("span", `position:relative;display:inline-grid;overflow:hidden;height:1.3em;line-height:1.3em;`, st);
    const s0 = mk("span", "grid-area:1/1;white-space:nowrap;", roll, L.idle), s1 = mk("span", "grid-area:1/1;white-space:nowrap;", roll, busyW), s2 = mk("span", "grid-area:1/1;white-space:nowrap;", roll, doneW);
    const ws = mk("div", `display:grid;grid-template-columns:${stack ? "1fr" : ".62fr 1fr"};`, win);
    const comp = mk("div", `padding:${U(20)};${stack ? "border-bottom" : "border-inline-end"}:1px solid var(--x-line);`, ws);
    mk("div", LABEL, comp, L.input);
    mk("div", `margin:${U(8)} 0 ${U(16)};font-size:${U(20)};font-weight:700;letter-spacing:-0.03em;`, comp, L.h2);
    mk("div", `border:1px solid var(--x-line);border-radius:calc(var(--x-radius) * 0.6);padding:${U(12)};background:var(--x-panel-2);color:var(--x-dim);font-size:${U(12)};line-height:1.5;`, comp, L.prompt);
    const run = mk("div", `margin-top:${U(12)};border-radius:calc(var(--x-radius) * 0.5);padding:${U(11)};text-align:center;background:var(--x-accent);color:var(--x-accent-ink);font-size:${U(13)};font-weight:600;outline-offset:${U(3)};`, comp, L.run);
    const out = mk("div", `display:flex;flex-direction:column;padding:${U(20)};background:linear-gradient(145deg, var(--x-panel), var(--x-panel-2));`, ws);
    const oh = mk("div", "display:flex;justify-content:space-between;", out);
    mk("span", LABEL, oh, L.out); mk("span", LABEL, oh, L.sample);
    const grid = mk("div", `display:grid;grid-template-columns:1fr 1fr;gap:${U(10)};margin:${U(16)} 0 ${U(16)};align-items:start;`, out);
    const picks = L.cards.slice(0, n - 1).concat([L.cards[3]]);
    const cards = picks.map(([lab, h, d], i) => {
      const sel = i === n - 1;
      const c = mk("div", `box-sizing:border-box;min-height:${U(stack ? 96 : 110)};border:1px solid ${sel ? "color-mix(in srgb, var(--x-accent) 40%, transparent)" : "var(--x-line)"};border-radius:calc(var(--x-radius) * 0.6);padding:${U(13)};background:${sel ? "color-mix(in srgb, var(--x-accent) 8%, var(--x-panel))" : "var(--x-panel)"};${sel ? "grid-column:1/-1;justify-self:start;" : ""}`, grid);
      mk("span", LABEL, c, lab);
      mk("strong", `display:block;margin:${U(9)} 0 ${U(6)};font-size:${U(13)};`, c, h);
      mk("p", `margin:0;color:var(--x-dim);font-size:${U(10.5)};line-height:1.45;`, c, d);
      return c;
    });
    const prog = mk("div", `height:${U(3)};overflow:hidden;border-radius:${U(2)};background:color-mix(in srgb, var(--x-ink) 10%, var(--x-panel));`, out);
    const pi = mk("i", `display:block;width:100%;height:100%;background:var(--x-accent);transform-origin:${rtl ? "100%" : "0"} 50%;`, prog);

    // fit to the room, measured with the selected card at its narrow start (its tallest)
    const sel = cards[n - 1];
    sel.style.width = `calc((100% - ${U(10)}) / 2)`;
    const u = Math.min((R.w * 0.96) / app.offsetWidth, (R.h * 0.96) / app.offsetHeight);
    app.style.setProperty("--u", u.toFixed(4) + "px");
    const selFull = grid.clientWidth, selCol = (selFull - 10 * u) / 2;
    sel.style.width = selCol.toFixed(1) + "px";
    grid.style.minHeight = grid.offsetHeight + "px"; // the window keeps its size while the card grows and its text rewraps

    // the cursor (product-film arc, anchored at its tip)
    let cur = null;
    const rb = ctx.box(run), target = { x: rb.x + rb.w * 0.62, y: rb.y + rb.h * 0.55 };
    const k = Math.min(f.W, f.H) / 1080, csz = 52 * k;
    if (p.cursor) {
      cur = sv("svg", { viewBox: "0 0 24 24", width: csz.toFixed(1), height: csz.toFixed(1) }, host);
      cur.style.cssText = `position:absolute;left:0;top:0;overflow:visible;z-index:9;pointer-events:none;transform-origin:${((5 / 24) * csz).toFixed(1)}px ${((2 / 24) * csz).toFixed(1)}px;`;
      sv("path", { d: "M5 2 L5 19 L9.5 15.5 L12.5 22 L15.5 20.5 L12.5 14 L18.5 14 Z", fill: "var(--x-pointer)", stroke: "var(--x-pointer-edge)", "stroke-width": 1.6, "stroke-linejoin": "round" }, cur);
    }

    // timing
    const span = end - at;
    const P = at + Math.min(0.8, Math.max(0.35, span * 0.25));
    const D = Math.max(0.5, Math.min(p.duration, end - 1.5 - P)); // room left for the cards to settle before the leave
    const ready = P + D;
    const cardT = cards.map((_, i) => ready + 0.1 + i * 0.06);
    const growA = cardT[n - 1] + 0.25;
    ctx.sfx(P - 0.011, "click", 0.5);
    ctx.sfx(ready, "success", 0.45);
    const start = { x: rtl ? -60 * k : f.W + 60 * k, y: f.H * 0.92 };
    const p3o = (t, a, b) => 1 - Math.pow(1 - ML.lin(t, a, b), 3);
    const p3io = (t, a, b) => { const x = ML.lin(t, a, b); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
    const sine = (t, a, b) => { const x = ML.lin(t, a, b); return (1 - Math.cos(Math.PI * x)) / 2; };
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.22);
        const e = p3o(t, at, at + 0.45);
        app.style.opacity = (ML.lin(t, at, at + 0.3) * (1 - leave)).toFixed(4);
        app.style.translate = `0 ${((1 - e) * 20 * u).toFixed(2)}px`;
        // press + focus ring
        let sc = 1;
        if (t >= P && t < P + 0.18) sc = 1 - 0.03 * Math.sin((Math.PI * (t - P)) / 0.18);
        run.style.scale = sc === 1 ? "none" : sc.toFixed(4);
        const ringA = ML.lin(t, P, P + 0.12) * (1 - ML.lin(t, P + 0.5, P + 0.7));
        run.style.outline = ringA > 0.004 ? `${(3 * u).toFixed(2)}px solid color-mix(in srgb, var(--x-accent) ${(35 * ringA).toFixed(1)}%, transparent)` : "none";
        const running = t >= P && t < ready;
        run.style.opacity = running ? "0.6" : "1";
        // status: done → busy → done, each a 0.2 s vertical roll
        const r1 = p3io(t, P, P + 0.2), r2 = p3io(t, ready, ready + 0.2);
        s0.style.translate = `0 ${(-r1 * 130).toFixed(1)}%`;
        s1.style.translate = `0 ${((1 - r1) * 130 - r2 * 130).toFixed(1)}%`;
        s2.style.translate = `0 ${((1 - r2) * 130).toFixed(1)}%`;
        roll.style.color = running ? "var(--x-accent)" : "";
        // progress
        pi.style.transform = `scaleX(${(t < P ? 0.08 : 0.08 + 0.92 * sine(t, P, ready)).toFixed(4)})`;
        pi.style.opacity = t < P ? "0.35" : "1";
        // outputs
        cards.forEach((c, i) => { const x = p3o(t, cardT[i], cardT[i] + 0.45); c.style.opacity = ML.lin(t, cardT[i], cardT[i] + 0.3).toFixed(4); c.style.translate = `0 ${((1 - x) * 12 * u).toFixed(2)}px`; });
        sel.style.width = (selCol + (selFull - selCol) * p3io(t, growA, growA + 0.5)).toFixed(2) + "px";
        // cursor
        if (cur) {
          const g0 = at + 0.15, u2 = ML.lin(t, g0, P), ee = p3io(t, g0, P);
          const dx = target.x - start.x, dy = target.y - start.y, len = Math.hypot(dx, dy) || 1, bulge = Math.sin(Math.PI * u2) * Math.min(30 * k, len * 0.09) * (rtl ? -1 : 1);
          const x = start.x + dx * ee - (dy / len) * bulge, y = start.y + dy * ee + (dx / len) * bulge;
          const tipX = (5 / 24) * csz, tipY = (2 / 24) * csz;
          cur.style.translate = `${(x - tipX).toFixed(2)}px ${(y - tipY).toFixed(2)}px`;
          cur.style.opacity = (ML.lin(t, g0, g0 + 0.2) * (1 - ML.lin(t, P + 0.5, P + 0.8)) * (1 - leave)).toFixed(4);
          cur.style.scale = t >= P && t < P + 0.16 ? (1 - 0.12 * Math.sin((Math.PI * (t - P)) / 0.16)).toFixed(4) : "none";
        }
      },
    };
  },
});
