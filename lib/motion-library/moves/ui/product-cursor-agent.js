// The product's own cursor does the work: the user's macOS arrow glides in and clicks "Run" — then a second, branded
// cursor (the product's automation overlay: the look's accent arrow with a name chip) takes over and glides through the
// task's steps on even beats, clicking each (every row ticks on its click), and hands back: the user's cursor clicks
// "Approve". Both cursors run on product-film's cursorAt: glides of up to 0.46 s on cubic-bezier(0.42, 0, 0.12, 1) with
// a hand-like bulge sin(π·u)·min(70, 0.09·dist) and a 0.16 s squash 1 − 0.2·sin on each click. Layer order: the
// product cursor under everything the user does, the user's cursor topmost.
// Source: Rieranthony/product-film-skill templates/kit/cursor.tsx + reference/ingredients.md "Cursors" (MIT).
ML.define({
  id: "ui.product-cursor-agent",
  category: "ui",
  name: "The product's own cursor does the work",
  does: "A second, branded cursor (the product's automation overlay) carries out the task while the user's cursor only sets it up and approves.",
  says: ["tech", "speed", "relief"],
  energy: 3,
  targets: ["cursor"],
  duration: [2, 6],
  params: {
    label_chip: { type: "bool", default: true },
    label: { type: "text" },
    steps: { type: "number", range: [2, 5], default: 3 },
    beat: { type: "number", range: [0.3, 0.8], default: 0.5, unit: "s" },
    approve: { type: "bool", default: true },
  },
  pairs: ["ui.approval-gate", "camera.push-in"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "click",
  source: { from: "product-film-skill:templates/kit/cursor.tsx", license: "MIT", note: "cursorAt glide + squash; ingredients.md Cursors (user cursor + product cursor)" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const px = (v) => (v * k).toFixed(1) + "px";
    const host = ctx.scene || ctx.stage;
    const N = Math.round(ML.clamp(p.steps, 2, 5));
    const L = rtl
      ? { title: "مهمة · تجهيز الحملة", run: "شغّل", approve: "وافق", agent: "الوكيل", steps: ["اسحب صور المنتج", "اكتب النص", "اختار المقاسات", "جهّز الصوت", "صدّر النسخ"] }
      : { title: "Task · Prepare the campaign", run: "Run", approve: "Approve", agent: "Agent", steps: ["Pull product shots", "Write the copy", "Pick the sizes", "Set the voice", "Export the cuts"] };

    // the app surface the work happens on
    const R = f.pic, w = Math.min(R.w, 860 * k);
    const panel = mk("div", `position:absolute;left:${(R.x + (R.w - w) / 2).toFixed(1)}px;top:0;width:${w.toFixed(1)}px;box-sizing:border-box;padding:${px(34)};display:flex;flex-direction:column;gap:${px(18)};background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * 0.8);box-shadow:var(--x-shadow);color:var(--x-ink);font:var(--x-body-weight) ${px(32)} var(--x-body-font);z-index:5;`, host);
    const head = mk("div", `display:flex;align-items:center;justify-content:space-between;gap:${px(18)};`, panel);
    mk("div", `font:var(--x-head-weight) ${px(34)} var(--x-head-font);`, head, L.title);
    const run = mk("div", `padding:${px(14)} ${px(34)};border-radius:var(--x-radius-s);background:var(--x-accent);color:var(--x-accent-ink);font-weight:600;white-space:nowrap;`, head, L.run);
    const rows = L.steps.slice(0, N).map((s) => {
      const r = mk("div", `display:flex;align-items:center;gap:${px(18)};padding:${px(18)} ${px(20)};border-radius:calc(var(--x-radius) * 0.4);background:var(--x-panel-2);`, panel);
      const box = mk("div", `flex:none;width:${px(38)};height:${px(38)};border-radius:${px(10)};box-sizing:border-box;border:${px(3)} solid var(--x-line);display:grid;place-items:center;`, r);
      box.innerHTML = `<svg viewBox="0 0 24 24" width="${(26 * k).toFixed(1)}" height="${(26 * k).toFixed(1)}" fill="none" stroke="var(--x-accent-ink)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
      mk("div", "flex:1;", r, s);
      return { r, box, mark: box.querySelector("svg") };
    });
    const foot = mk("div", `display:flex;justify-content:flex-end;`, panel);
    const appr = p.approve ? mk("div", `padding:${px(14)} ${px(34)};border-radius:var(--x-radius-s);background:var(--x-ink);color:var(--x-ground);font-weight:600;`, foot, L.approve) : null;
    panel.style.top = (R.y + Math.max(0, (R.h - panel.offsetHeight) / 2)).toFixed(1) + "px";
    const cOf = (e) => { const b = ctx.box(e); return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; };
    const cRun = cOf(run), cRows = rows.map((r) => cOf(r.box)), cAppr = appr ? cOf(appr) : null;

    // the choreography: user clicks Run, the product cursor walks the steps on beats, the user approves
    const tRun = at + 0.9;
    const span = Math.max(0.3, Math.min(p.beat, (end - 0.9 - (tRun + 0.5) - (appr ? 0.9 : 0)) / N));
    const tSteps = rows.map((_, i) => tRun + 0.5 + span * (i + 0.5));
    const tAppr = appr ? tSteps[N - 1] + 0.75 : Infinity;
    const offX = rtl ? -60 * k : f.W + 60 * k;
    const userKeys = [{ t: at, x: offX, y: f.H * 0.92 }, { t: tRun, x: cRun.x, y: cRun.y, click: true }, { t: tRun + 0.5, x: cRun.x + (rtl ? -1 : 1) * 120 * k, y: cRun.y + 260 * k }];
    if (appr) userKeys.push({ t: tAppr, x: cAppr.x, y: cAppr.y, click: true });
    const agentKeys = [{ t: tRun + 0.2, x: cRun.x, y: cRun.y + 40 * k }, ...cRows.map((c, i) => ({ t: tSteps[i], x: c.x, y: c.y, click: true }))];
    ctx.sfx(tRun - 0.011, "click", 0.55);
    tSteps.forEach((t) => ctx.sfx(t - 0.011, "tap", 0.35));
    if (appr) ctx.sfx(tAppr - 0.011, "click.confirm", 0.55);

    // product-film cursorAt (closed form)
    const glide = ML.bezier(0.42, 0, 0.12, 1);
    function cursorAt(t, keys) {
      let x = keys[0].x, y = keys[0].y;
      for (let i = 1; i < keys.length; i++) {
        const to = keys[i];
        if (t >= to.t) { x = to.x; y = to.y; continue; }
        const from = keys[i - 1], d = Math.min(0.46, (to.t - from.t) * 0.82), u = ML.clamp((t - (to.t - d)) / d), e = glide(u);
        const dx = to.x - from.x, dy = to.y - from.y, len = Math.hypot(dx, dy) || 1, bulge = Math.sin(Math.PI * u) * Math.min(70 * k, len * 0.09);
        x = from.x + dx * e - (dy / len) * bulge; y = from.y + dy * e + (dx / len) * bulge;
        break;
      }
      let squash = 1;
      for (const key of keys) if (key.click && t >= key.t && t - key.t < 0.16) squash = Math.min(squash, 1 - 0.2 * Math.sin((Math.PI * (t - key.t)) / 0.16));
      return { x, y, squash };
    }

    // the cursors: the product's (accent, name chip) below, the user's on top
    const ARROW = "M5 2 L5 19 L9.5 15.5 L12.5 22 L15.5 20.5 L12.5 14 L18.5 14 Z", cs = 54 * k, tip = [(5 / 24) * cs, (2 / 24) * cs];
    const cursorEl = (fill, edge, z, chip) => {
      const c = mk("div", `position:absolute;left:0;top:0;z-index:${z};pointer-events:none;opacity:0;`, host);
      const s = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
      s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("width", cs.toFixed(1)); s.setAttribute("height", cs.toFixed(1));
      s.style.cssText = `position:absolute;left:${(-tip[0]).toFixed(1)}px;top:${(-tip[1]).toFixed(1)}px;overflow:visible;transform-origin:${tip[0].toFixed(1)}px ${tip[1].toFixed(1)}px;filter:drop-shadow(0 ${px(4)} ${px(7)} color-mix(in srgb, var(--x-ink) 30%, transparent));`;
      s.innerHTML = `<path d="${ARROW}" fill="${fill}" stroke="${edge}" stroke-width="1.5" stroke-linejoin="round"/>`;
      c.append(s);
      if (chip) mk("div", `position:absolute;left:${px(30)};top:${px(40)};padding:${px(6)} ${px(16)};border-radius:var(--x-radius-s);background:var(--x-accent);color:var(--x-accent-ink);font:600 ${px(24)} var(--x-body-font);white-space:nowrap;box-shadow:var(--x-shadow);`, c, chip);
      return { c, s };
    };
    const agent = cursorEl("var(--x-accent)", "var(--x-accent-ink)", 8, p.label_chip ? p.label || L.agent : null);
    const user = cursorEl("var(--x-pointer)", "var(--x-pointer-edge)", 10, null);
    const press = (el, T, t) => { if (!el) return; let s = 1; if (t >= T && t < T + 0.09) s = 1 - 0.05 * ML.out(t, T, T + 0.09); else if (t >= T + 0.09) s = 0.95 + 0.05 * ML.back(t, T + 0.09, T + 0.39); el.style.scale = s === 1 ? "none" : s.toFixed(4); };
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        const u = ML.out(t, at, at + 0.4);
        panel.style.opacity = (t < at ? 0 : u * (1 - leave)).toFixed(4);
        panel.style.translate = `0 ${((1 - u) * 24 * k).toFixed(2)}px`;
        const us = cursorAt(t, userKeys), ag = cursorAt(t, agentKeys);
        user.c.style.opacity = (t < at ? 0 : ML.lin(t, at, at + 0.2) * (1 - leave)).toFixed(4);
        user.c.style.transform = `translate(${us.x.toFixed(2)}px, ${us.y.toFixed(2)}px)`;
        user.s.style.transform = us.squash === 1 ? "none" : `scale(${us.squash.toFixed(4)})`;
        const agOn = ML.lin(t, tRun + 0.05, tRun + 0.25) * (1 - ML.lin(t, tSteps[N - 1] + 0.35, tSteps[N - 1] + 0.6));
        agent.c.style.opacity = (agOn * (1 - leave)).toFixed(4);
        agent.c.style.transform = `translate(${ag.x.toFixed(2)}px, ${ag.y.toFixed(2)}px) scale(${(0.7 + 0.3 * ML.out(t, tRun + 0.05, tRun + 0.3)).toFixed(4)})`;
        agent.s.style.transform = ag.squash === 1 ? "none" : `scale(${ag.squash.toFixed(4)})`;
        press(run, tRun, t);
        run.style.filter = t >= tRun ? `brightness(${(1 + 0.12 * (1 - ML.lin(t, tRun, tRun + 0.4))).toFixed(4)})` : "none";
        rows.forEach((r, i) => {
          const q = ML.out(t, tSteps[i], tSteps[i] + 0.2);
          r.box.style.background = q > 0 ? `color-mix(in srgb, var(--x-accent) ${(q * 100).toFixed(1)}%, transparent)` : "transparent";
          r.box.style.borderColor = q > 0 ? "var(--x-accent)" : "var(--x-line)";
          r.mark.style.opacity = q.toFixed(4);
          r.r.style.background = `color-mix(in srgb, var(--x-accent) ${(ML.pulse(t, tSteps[i], 0.06, 0.35) * 14).toFixed(2)}%, var(--x-panel-2))`;
        });
        if (appr) { press(appr, tAppr, t); appr.style.background = t >= tAppr ? "var(--x-good)" : "var(--x-ink)"; }
      },
    };
  },
});
