// Working state: while the app works, an 11 px-class spinner (1.5 px ring at 25 % accent, accent top) turns at
// rotate(t × 450°) beside a mono status chip "Generating 0:0n" (n = floor(t − RUN), capped); the button reads
// Generate → Generating (busy) → Add; the helper line "Usually under a minute" → "Last run · 0:04 · 7 credits"; the
// result draws in from the top under a scan line and settles with a glint; the balance ticks 2,400 → 2,393 at
// done + 0.15 s and the inspector swaps before → after at done + 0.3 s. All of it from t, so scrubbing is exact.
//   build "card": the whole working UI rebuilt in the target (a screen) or the picture region.
//   build "inline": just the spinner + elapsed chip beside the target's own label, the label stepping through labels
//     (a number keeps its figure and ticks down by the cost when the work is done).
//   build "auto": inline on a target too small to hold the UI (a label, a number), else the card.
// Source: MengTo/Skills html-demo demo/index.html, the GENERATE step (MIT) — ported to our look variables.
ML.define({
  id: "ui.working-state",
  category: "ui",
  name: "Working state: spinner, elapsed counter and button labels",
  does: "While the app works, a tiny spinner turns next to an elapsed-time label, the button says it is working, then flips to the finished label and stats.",
  says: ["time", "tech", "trust"],
  energy: 2,
  targets: ["screen", "label", "number"],
  duration: [1, 4],
  params: {
    spinner_speed: { type: "number", range: [300, 600], default: 450, unit: "deg/s" },
    labels: { type: "text", default: "Generate|Generating|Add" },
    build: { type: "choice", options: ["auto", "card", "inline"], default: "auto" },
    work: { type: "number", range: [0.8, 4], default: 3.2, unit: "s" },
    cost: { type: "number", range: [1, 50], default: 7 },
    balance: { type: "number", range: [10, 99999], default: 2400 },
  },
  pairs: ["ui.workflow-node-chain", "ui.cursor-glide-click", "ui.workflow-state-stepper"],
  avoid: ["celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "click",
  source: { from: "MengTo/Skills:web-design/html-demo/demo/index.html#GENERATE", license: "MIT", note: "spinner 11 px / 1.5 px, rotate(t*450deg), status chip, button + helper + balance + inspector cues, reveal under a scan line" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const U = (n) => `calc(var(--u) * ${n})`;
    const AR = "٠١٢٣٤٥٦٧٨٩";
    const dg = (s) => (rtl ? String(s).replace(/\d/g, (d) => AR[+d]).replace(/,/g, "٬") : String(s));
    const tm = (s) => (rtl ? "\u2066" + dg(s) + "\u2069" : String(s)); // a time stays one LTR run inside Arabic
    const comma = (v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const DEF = rtl ? ["أنشئ", "جاري الإنشاء", "أضف"] : ["Generate", "Generating", "Add"];
    const given = String(p.labels || "").split("|").map((s) => s.trim()).filter(Boolean);
    const LB = given.length === 3 && !(rtl && p.labels === "Generate|Generating|Add") ? given : DEF;
    const T = rtl
      ? { usual: "عادةً أقل من دقيقة", last: (s, c) => `آخر تشغيل · ${tm("0:0" + s)} · ${dg(c)} رصيد`, title: "صورة", model: "النموذج", status: "الحالة", not: "لم تُنشأ بعد", made: "تم الإنشاء", runs: "مرات التشغيل", left: "الرصيد المتبقي", time: "الوقت", cost: "التكلفة", details: "التفاصيل", ask: "فارس على حصان أبيض، ضوء الغروب، ستوديو", empty: "الصور هتظهر هنا", node: "فارس" }
      : { usual: "Usually under a minute", last: (s, c) => `Last run · 0:0${s} · ${c} credits`, title: "Image", model: "Model", status: "Status", not: "Not generated yet", made: "Generated", runs: "Runs", left: "Credits left", time: "Time", cost: "Cost", details: "Details", ask: "A knight on a white horse, golden hour, studio light", empty: "Images will appear here", node: "Knight" };

    // ── times (the source: RUN 0.45, reveal 1.15 → 4.35; squeezed to fit the move) ──
    const RUN = at + Math.min(0.45, (end - at) * 0.15);
    const work = Math.max(0.6, Math.min(ML.clamp(p.work, 0.8, 4), end - 0.75 - RUN));
    const REV0 = RUN + work * 0.22, DONE = RUN + work;
    const secs = Math.max(1, Math.min(9, Math.round(work * 1.25)));
    const elapsedAt = (t) => Math.min(secs, Math.floor(Math.max(0, (t - RUN) * (secs / work))));
    const speed = ML.clamp(p.spinner_speed, 300, 600);
    const cost = Math.round(ML.clamp(p.cost, 1, 50)), bal0 = Math.round(ML.clamp(p.balance, 10, 99999));
    ctx.sfx(RUN - 0.03, "click", 0.35);
    ctx.sfx(DONE, "pop.soft", 0.35);
    ctx.sfx(DONE + 0.15, "blip", 0.2);

    // ── inline: a spinner + elapsed chip beside the target's own label ──
    const hasEl = ctx.el && ctx.el !== ctx.stage, big = hasEl && ctx.box(ctx.el).w > f.W * 0.4 && ctx.box(ctx.el).h > f.H * 0.2;
    if (hasEl && (p.build === "inline" || (p.build === "auto" && !big))) {
      // the spinner and the chip stay UI-sized and readable, beside a big figure or a small label
      const el = ctx.el, em = ML.clamp(parseFloat(getComputedStyle(el).fontSize) || 24, Math.min(f.W, f.H) * 0.026, Math.min(f.W, f.H) * 0.04);
      const orig = el.textContent.trim();
      // a number keeps its figure, then ticks down by the cost (digits and separators kept)
      const nm = orig.match(/^(\D*?)([\d٠-٩][\d٠-٩,٬]*)(\D*)$/);
      const ticked = nm ? (() => { const ar = /[٠-٩]/.test(nm[2]), sep = /[,٬]/.test(nm[2]), v = Math.max(0, parseInt(nm[2].replace(/[٠-٩]/g, (d) => String(AR.indexOf(d))).replace(/[,٬]/g, ""), 10) - cost); let s = sep ? comma(v) : String(v); if (ar) s = s.replace(/\d/g, (d) => AR[+d]).replace(/,/g, "٬"); return nm[1] + s + nm[3]; })() : "";
      const txt = doc.createElement("span"); txt.textContent = orig; txt.style.whiteSpace = "nowrap";
      el.textContent = ""; el.append(txt);
      el.style.display = el.style.display || "inline-flex";
      el.style.alignItems = "center";
      el.style.gap = em * 0.45 + "px";
      const spin = mk("span", `display:inline-block;flex:none;width:${em * 0.62}px;height:${em * 0.62}px;box-sizing:border-box;border-radius:50%;border:${Math.max(1.5, em * 0.085)}px solid color-mix(in srgb, var(--x-accent) 25%, transparent);border-top-color:var(--x-accent);`, el);
      const chip = mk("span", `display:inline-flex;align-items:center;flex:none;height:${em * 1.3}px;padding:0 ${em * 0.45}px;border-radius:${em * 0.34}px;font:500 ${em * 0.6}px/1 var(--x-mono-font);letter-spacing:0;text-transform:none;color:var(--x-panel);background:color-mix(in srgb, var(--x-ink) 82%, transparent);white-space:nowrap;font-variant-numeric:tabular-nums;`, el);
      return {
        draw(t) {
          const running = t >= RUN && t < DONE, done = t >= DONE;
          const s = nm ? (t >= DONE + 0.15 ? ticked : orig) : done ? LB[2] : running ? LB[1] : t >= at ? LB[0] : orig;
          if (txt.textContent !== s) txt.textContent = s;
          spin.style.display = running ? "inline-block" : "none";
          spin.style.rotate = `${(((t - RUN) * speed) % 360).toFixed(1)}deg`;
          chip.style.display = t >= RUN ? "inline-flex" : "none";
          const c = done ? T.last(secs, cost) : `${LB[1]} ${tm("0:0" + elapsedAt(t))}`;
          if (chip.textContent !== c) chip.textContent = c;
          el.style.opacity = (1 - ML.clamp((t - (end - 0.25)) / 0.22)).toFixed(4);
        },
      };
    }

    // ── card: the working UI rebuilt ──
    const host = ctx.scene || ctx.stage;
    const R = big ? ctx.box(ctx.el) : f.pic;
    const W = R.w, H = R.h, wide = W > H * 1.35, withInsp = !wide || W > H * 2; // a squarer wide region gives its room to the node alone
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${W}px;height:${H}px;pointer-events:none;z-index:6;font-family:var(--x-body-font);color:var(--x-ink);`, host);
    const back = mk("div", `position:absolute;inset:0;border-radius:var(--x-radius);background:var(--x-ground);`, layer);
    // one unit: the node card is 100 units wide; u is measured below so the whole build fills the region (it must read on a phone)
    let u = 5;
    layer.style.setProperty("--u", u + "px");
    const app = mk("div", `position:absolute;left:0;top:0;width:max-content;display:flex;flex-direction:${wide ? "row" : "column"};align-items:${wide ? "center" : "stretch"};justify-content:center;gap:${U(wide ? 8 : 5)};`, layer);

    // the node: name, card (head, prompt, preview, last-run line, footer with button)
    const node = mk("div", `flex:none;width:${U(100)};display:flex;flex-direction:column;gap:${U(2)};`, app);
    const topRow = mk("div", `display:flex;align-items:center;justify-content:space-between;font:var(--x-head-weight) ${U(4.6)}/1 var(--x-head-font);`, node);
    mk("span", "", topRow, T.node);
    const balChip = mk("span", `position:relative;display:inline-flex;align-items:center;gap:${U(1.2)};height:${U(6)};padding:0 ${U(2.2)};border-radius:var(--x-radius-s);background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);font:600 ${U(3.4)}/1 var(--x-mono-font);color:var(--x-ink);font-variant-numeric:tabular-nums;`, topRow);
    mk("span", `width:0;height:0;border-style:solid;border-width:${U(1.6)} ${U(1)} ${U(1.6)} ${U(1)};border-color:var(--x-accent) transparent transparent transparent;transform:skewX(-14deg);`, balChip);
    const bal = mk("span", "", balChip, dg(comma(bal0)));
    const spend = mk("span", `position:absolute;${rtl ? "left" : "right"}:${U(1)};top:100%;font:600 ${U(3)}/1 var(--x-mono-font);color:var(--x-accent);white-space:nowrap;visibility:hidden;`, balChip, (rtl ? "-" : "−") + dg(cost));
    const card = mk("div", `box-sizing:border-box;padding:${U(3)};border-radius:calc(var(--x-radius) * 0.55);background:var(--x-panel);border:var(--x-edge) solid color-mix(in srgb, var(--x-accent) 45%, var(--x-edge-color));box-shadow:var(--x-shadow);display:flex;flex-direction:column;gap:${U(2.4)};`, node);
    const head = mk("div", `display:flex;align-items:center;gap:${U(1.6)};font:600 ${U(3.2)}/1 var(--x-body-font);color:var(--x-dim);`, card);
    mk("span", `width:${U(3.6)};height:${U(3.6)};border-radius:${U(0.9)};border:${U(0.5)} solid currentColor;box-sizing:border-box;`, head);
    mk("span", "", head, T.title);
    mk("span", `margin-inline-start:auto;padding:${U(0.9)} ${U(1.8)};border-radius:var(--x-radius-s);background:var(--x-panel-2);font:500 ${U(2.8)}/1 var(--x-mono-font);color:var(--x-dim);`, head, "Nano 2.1");
    mk("div", `font:var(--x-body-weight) ${U(3.4)}/1.35 var(--x-body-font);color:var(--x-ink);`, card, T.ask);
    const pre = mk("div", `position:relative;aspect-ratio:${wide ? "2 / 1" : "16 / 10"};border-radius:calc(var(--x-radius) * 0.35);overflow:hidden;background:var(--x-panel-2);`, card);
    const empty = mk("div", `position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:${U(1.4)};font:500 ${U(3)}/1 var(--x-body-font);color:var(--x-dim);`, pre, T.empty);
    const shimmer = mk("div", `position:absolute;inset:0;background:linear-gradient(115deg, transparent 35%, color-mix(in srgb, var(--x-panel) 70%, transparent) 50%, transparent 65%) 0 0 / 250% 100%, color-mix(in srgb, var(--x-accent) 10%, var(--x-panel-2));`, pre);
    // the made picture: our own drawn scene (gradients only — no photo), revealed top-down
    const art = mk("div", `position:absolute;inset:0;background:radial-gradient(circle at 68% 34%, color-mix(in srgb, var(--x-panel) 85%, transparent) 0 11%, transparent 11.5%), radial-gradient(ellipse at 30% 115%, color-mix(in srgb, var(--x-ink) 55%, var(--x-accent)) 0 34%, transparent 34.5%), radial-gradient(ellipse at 85% 120%, color-mix(in srgb, var(--x-ink) 35%, var(--x-accent-2)) 0 38%, transparent 38.5%), linear-gradient(180deg, color-mix(in srgb, var(--x-accent-2) 70%, var(--x-panel)) 0%, color-mix(in srgb, var(--x-accent) 85%, var(--x-ink)) 100%);`, pre);
    const dev = mk("div", `position:absolute;inset:0;background:inherit;`, pre);
    dev.style.background = art.style.background;
    const scan = mk("i", `position:absolute;left:0;right:0;height:${U(0.5)};margin-top:${U(-0.25)};background:var(--x-panel);box-shadow:0 0 ${U(3)} ${U(1)} color-mix(in srgb, var(--x-accent-2) 70%, transparent);`, pre);
    const glint = mk("i", `position:absolute;inset:0;background:linear-gradient(105deg, transparent 38%, color-mix(in srgb, var(--x-panel) 45%, transparent) 50%, transparent 62%);`, pre);
    const status = mk("div", `position:absolute;${rtl ? "right" : "left"}:${U(1.8)};top:${U(1.8)};display:flex;align-items:center;gap:${U(1.5)};height:${U(5.6)};padding:0 ${U(2)};border-radius:${U(1.5)};font:500 ${U(2.7)}/1 var(--x-mono-font);color:var(--x-panel);background:color-mix(in srgb, var(--x-ink) 82%, transparent);box-shadow:inset 0 0 0 0.5px var(--x-line);white-space:nowrap;font-variant-numeric:tabular-nums;`, pre);
    const spin = mk("span", `flex:none;width:${U(2.8)};height:${U(2.8)};box-sizing:border-box;border-radius:50%;border:${U(0.38)} solid color-mix(in srgb, var(--x-accent-2) 25%, transparent);border-top-color:var(--x-accent-2);`, status);
    const elapsed = mk("span", "", status, `${LB[1]} ${tm("0:00")}`);
    const lastLine = mk("div", `min-height:1.2em;font:500 ${U(2.9)}/1.2 var(--x-mono-font);color:var(--x-dim);`, card, "");
    const foot = mk("div", `display:flex;align-items:center;gap:${U(1.4)};`, card);
    for (const tag of rtl ? ["قالب", "٢:٣", "2K"] : ["Template", "2:3", "2K"]) mk("span", `padding:${U(1)} ${U(1.8)};border-radius:var(--x-radius-s);background:var(--x-panel-2);font:500 ${U(2.7)}/1 var(--x-body-font);color:var(--x-dim);`, foot, tag);
    const btn = mk("div", `margin-inline-start:auto;display:inline-flex;align-items:center;gap:${U(1.4)};height:${U(7.4)};padding:0 ${U(2.8)};border-radius:var(--x-radius-s);font:var(--x-head-weight) ${U(3.3)}/1 var(--x-body-font);white-space:nowrap;`, foot);
    const btnIcon = mk("span", `display:inline-block;width:${U(2.8)};height:${U(2.8)};box-sizing:border-box;border-radius:50%;`, btn);
    const btnLabel = mk("span", "", btn, LB[0]);
    const btnCost = mk("small", `font:500 ${U(2.6)}/1 var(--x-mono-font);opacity:0.75;`, btn, `· ${dg(cost)}`);

    // the button keeps one width through its three labels, so nothing beside it moves (or re-rasters) as it changes
    btn.style.justifyContent = "center";
    const fixBtn = () => { btn.style.width = ""; let w = 0; for (const l of LB) { btnLabel.textContent = l; w = Math.max(w, btn.getBoundingClientRect().width); } btnLabel.textContent = LB[0]; btn.style.width = Math.ceil(w + 1) + "px"; };
    // the inspector: before → after
    const insp = mk("div", `flex:none;width:${U(wide ? 82 : 100)};box-sizing:border-box;padding:${U(3.4)};border-radius:calc(var(--x-radius) * 0.55);background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);display:flex;flex-direction:column;gap:${U(1.6)};font:var(--x-body-weight) ${U(3.1)}/1.25 var(--x-body-font);`, app);
    mk("div", `font:var(--x-label-weight) ${U(2.7)}/1 ${rtl ? "var(--x-body-font)" : "var(--x-label-font)"};letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:var(--x-label-case);color:var(--x-dim);margin-bottom:${U(0.8)};`, insp, T.details);
    const rowsBefore = [[T.status, T.not, "st"], [T.model, "Nano 2.1"], [T.runs, dg(0), "runs"], [T.cost, `${dg(cost)}`], [T.left, dg(comma(bal0)), "left"]];
    const rowsAfter = [[T.status, T.made], [T.model, "Nano 2.1"], [T.time, tm("0:0" + secs)], [T.cost, `${dg(cost)}`], [T.runs, dg(1)]];
    const mkRows = (rows) => {
      const box = mk("div", `display:grid;grid-template-columns:auto 1fr;gap:${U(1.5)} ${U(3)};`, insp);
      const keys = {};
      for (const [a, b, k] of rows) { mk("span", "color:var(--x-dim);white-space:nowrap;", box, a); const d = mk("span", "text-align:end;white-space:nowrap;", box, b); if (k) keys[k] = d; }
      return { box, keys };
    };
    // tall frames show a compact inspector (three rows)
    const before = mkRows(wide ? rowsBefore : rowsBefore.slice(0, 3));
    const after = mkRows(wide ? rowsAfter : rowsAfter.slice(0, 3));
    after.box.style.display = "none";
    if (!wide) insp.style.padding = `${U(2.6)} ${U(3.4)}`;
    if (!withInsp) insp.style.display = "none";
    // the size that fills the region (twice: text wraps a little differently at the new size)
    for (let k = 0; k < 2; k++) {
      u *= Math.min((H * 0.98) / app.offsetHeight, (W * 0.98) / app.offsetWidth);
      layer.style.setProperty("--u", u.toFixed(4) + "px");
    }
    // centred on whole pixels: text on a half pixel rasters differently once it has been redrawn
    app.style.left = Math.round((W - app.offsetWidth) / 2) + "px";
    app.style.top = Math.round((H - app.offsetHeight) / 2) + "px";

    fixBtn();
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.22);
        layer.style.opacity = ((1 - leave) * ML.out(t, at, at + 0.3)).toFixed(4);
        const running = t >= RUN && t < DONE, done = t >= DONE;
        const lin = ML.lin(t, REV0, DONE);
        // making: shimmer, then the picture from the top down under a scan line, then a settle and a glint
        empty.style.visibility = t < RUN ? "visible" : "hidden";
        shimmer.style.visibility = t >= RUN && t < REV0 + 0.4 ? "visible" : "hidden";
        shimmer.style.backgroundPosition = `${(100 - (((t - RUN) * 70) % 100)).toFixed(2)}% 0, 0 0`;
        dev.style.visibility = t >= REV0 && !done ? "visible" : "hidden";
        dev.style.opacity = (0.4 * Math.min(1, Math.max(0, (t - REV0) / 0.4))).toFixed(4);
        art.style.visibility = t >= REV0 ? "visible" : "hidden";
        art.style.clipPath = `inset(0 0 ${((1 - lin) * 100).toFixed(2)}% 0)`;
        const settle = done ? ML.ease(t, DONE, DONE + 0.9) : 0;
        art.style.filter = done && settle < 1 ? `brightness(${(1.3 - 0.3 * settle).toFixed(3)})` : "none";
        scan.style.visibility = t >= REV0 && !done ? "visible" : "hidden";
        scan.style.top = `${(lin * 100).toFixed(2)}%`;
        glint.style.visibility = done && t < DONE + 0.9 ? "visible" : "hidden";
        glint.style.translate = `${(-100 + 200 * ML.ease(t, DONE, DONE + 0.9)).toFixed(2)}% 0`;
        status.style.visibility = running ? "visible" : "hidden";
        spin.style.rotate = `${(((t - RUN) * speed) % 360).toFixed(1)}deg`;
        const es = `${LB[1]} ${tm("0:0" + elapsedAt(t))}`;
        if (elapsed.textContent !== es) elapsed.textContent = es;
        // the button: Generate → Generating (busy) → Add, a press punch on RUN
        const lb = done ? LB[2] : running ? LB[1] : LB[0];
        btnLabel.textContent = lb;
        btn.style.background = running ? "var(--x-panel-2)" : "var(--x-accent)";
        btn.style.color = running ? "var(--x-dim)" : "var(--x-accent-ink)";
        const bp = ML.pulse(t, RUN, 0.06, 0.14); // press punch
        btn.style.scale = bp > 0.002 ? (1 - 0.05 * bp).toFixed(4) : "none";
        btnIcon.style.border = running ? `${0.38 * u}px solid color-mix(in srgb, currentColor 30%, transparent)` : "none";
        btnIcon.style.borderTopColor = running ? "currentColor" : "";
        btnIcon.style.background = running ? "transparent" : done ? "none" : "currentColor";
        btnIcon.style.clipPath = running ? "none" : done ? "polygon(40% 0, 60% 0, 60% 40%, 100% 40%, 100% 60%, 60% 60%, 60% 100%, 40% 100%, 40% 60%, 0 60%, 0 40%, 40% 40%)" : rtl ? "polygon(100% 0, 0 50%, 100% 100%)" : "polygon(0 0, 100% 50%, 0 100%)";
        if (done) btnIcon.style.background = "currentColor";
        btnIcon.style.rotate = running ? `${(((t - RUN) * speed) % 360).toFixed(1)}deg` : "0deg";
        btnCost.style.visibility = running ? "hidden" : "visible";
        // helper line, balance, inspector
        const ll = done ? T.last(secs, cost) : running ? T.usual : "";
        if (lastLine.textContent !== ll) lastLine.textContent = ll;
        const b = dg(comma(t >= DONE + 0.15 ? bal0 - cost : bal0));
        bal.textContent = b; // set every frame: the chip repaints the same way whichever moment came before
        const cp = ML.pulse(t, DONE + 0.15, 0.05, 0.25);
        // the spend floats off the balance ("−7" rises and fades) — the chip itself only changes its digits
        const fl = ML.lin(t, DONE + 0.15, DONE + 0.95);
        spend.style.visibility = fl > 0 && fl < 1 ? "visible" : "hidden";
        spend.style.opacity = (fl < 0.2 ? fl / 0.2 : 1 - (fl - 0.2) / 0.8).toFixed(4);
        spend.style.translate = `0 ${(-fl * 5 * u).toFixed(2)}px`;
        const swapped = t >= DONE + 0.3;
        before.box.style.display = swapped ? "none" : "grid";
        after.box.style.display = swapped ? "grid" : "none";
        const sw = ML.out(t, DONE + 0.3, DONE + 0.6);
        after.box.style.opacity = sw.toFixed(4);
        if (before.keys.st) { const s = running ? LB[1] : T.not; if (before.keys.st.textContent !== s) before.keys.st.textContent = s; }
        if (before.keys.runs) { const s = dg(t >= RUN ? 1 : 0); if (before.keys.runs.textContent !== s) before.keys.runs.textContent = s; }
      },
    };
  },
});
