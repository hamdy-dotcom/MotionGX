// Parallel agent windows: a grid of app / chat windows, each with its title row (project · task), streaming its work
// at once — prompts, a grey "Thinking…" shimmer, replies and red / green code-diff lines typed char by char — with
// each window starting a beat after the last so it reads as concurrent. Long logs scroll up inside their window.
// Source: prompt-motion "amol909s-opus-5-5-on-medium" (reference only: rebuilt as our own code).
ML.define({
  id: "ui.agent-windows-streaming",
  category: "ui",
  name: "Parallel windows stream work",
  does: "Several app / chat windows each stream text and code at once, showing parallel agents working.",
  says: ["speed", "tech", "proof", "scale"],
  energy: 3,
  targets: ["screen", "list"],
  duration: [2.5, 6],
  params: {
    windows: { type: "number", range: [2, 6], default: 4 },
    content: { type: "choice", options: ["chat", "code-diff", "mixed"], default: "mixed" },
    start_offset: { type: "number", range: [0.1, 0.4], default: 0.2, unit: "s" },
    chars_per_s: { type: "number", range: [40, 90], default: 66 },
    chrome: { type: "bool", default: true },
  },
  pairs: ["ui.code-editor-type", "ui.chat-prompt-typing"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key",
  source: { from: "prompt-motion:amol909s-opus-5-5-on-medium", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { p, at, end, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, text, parent) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    let host = ctx.el;
    if (host) host.replaceChildren();
    else host = mk("div", "position:absolute;left:var(--pic-x);top:var(--pic-y);width:var(--pic-w);height:var(--pic-h);z-index:4;background:var(--x-ground)", null, ctx.scene || ctx.stage);
    const W = host.clientWidth || ctx.f.pic.w, H = host.clientHeight || ctx.f.pic.h;
    const n = Math.round(ML.clamp(p.windows, 2, 6));
    const cols = W / H > 1.3 ? Math.min(n, 3) : n <= 2 ? 1 : 2, rowsN = Math.ceil(n / cols);
    const gapPx = Math.min(W, H) * 0.025;
    const cellW = (W - gapPx * (cols - 1)) / cols, cellH = (H - gapPx * (rowsN - 1)) / rowsN;
    const fs = Math.round(ML.clamp(Math.min(cellW / 24, cellH / 10.5), 12, 30));
    const px = (x) => Math.round(fs * x) + "px"; // whole pixels: line edges land the same however the frame is reached
    const grid = mk("div", `position:${ctx.el ? "relative" : "absolute"};inset:0;width:100%;height:100%;display:grid;grid-template-columns:repeat(${cols}, 1fr);grid-template-rows:repeat(${rowsN}, 1fr);gap:${gapPx}px;font-size:${fs}px`, null, host);
    const T = rtl
      ? { proj: ["المتجر", "الدفع", "الموقع", "التطبيق", "البيانات", "الدعم"], task: ["صفحة المنتج", "إصلاح الفاتورة", "ترجمة الصفحات", "شاشة الدخول", "تقرير الشهر", "ردود العملا"],
          user: ["رتّب صفحة المنتج", "صلّح خطأ الفاتورة", "ترجم الصفحات للعربي", "اعمل شاشة دخول", "طلّع تقرير الشهر", "جاوب على التذاكر"],
          ai: ["بقرأ ١٤ ملف…", "لقيت المشكلة في الحساب", "خلّصت ٣ تعديلات", "الاختبارات كلها عدّت", "جاهز للمراجعة"], think: "بفكّر…" }
      : { proj: ["storefront", "billing", "website", "mobile", "analytics", "support"], task: ["product page", "fix invoice bug", "translate pages", "login screen", "monthly report", "answer tickets"],
          user: ["Refactor the product page", "Fix the invoice rounding bug", "Translate every page", "Build the login screen", "Draft the monthly report", "Reply to open tickets"],
          ai: ["Reading 14 files…", "Found it in the tax calc", "Applied 3 edits", "All tests pass", "Ready for review"], think: "Thinking…" };
    const CODE = [
      [["ctx", "function total(items) {"], ["del", "  return sum * 1.2"], ["add", "  return round(sum * TAX, 2)"], ["ctx", "}"]],
      [["ctx", "export const Login = () => ("], ["add", "  <Form onSubmit={signIn}>"], ["add", "    <Field name=\"email\" />"], ["del", "  <OldForm />"]],
      [["del", "const lang = 'en'"], ["add", "const lang = user.locale"], ["add", "dir = lang === 'ar' ? 'rtl' : 'ltr'"]],
      [["ctx", "query(`select * from orders`)"], ["add", "  .where('month', now)"], ["add", "  .groupBy('region')"], ["del", "  .limit(10)"]],
    ];
    const cps = p.chars_per_s;
    const wins = [];
    for (let i = 0; i < n; i++) {
      const kind = p.content === "mixed" ? (i % 2 ? "code-diff" : "chat") : p.content;
      const win = mk("div", `position:relative;display:flex;flex-direction:column;overflow:hidden;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * 0.5);box-shadow:var(--x-shadow);min-height:0`, null, grid);
      if (p.chrome) {
        const bar = mk("div", `display:flex;align-items:center;gap:0.45em;padding:0.55em 0.8em;background:var(--x-bar);color:var(--x-bar-ink);border-bottom:var(--x-edge) solid var(--x-line);flex:none;font-size:0.8em;white-space:nowrap`, null, win);
        const lights = mk("span", "display:flex;gap:0.35em;opacity:var(--x-lights)", null, bar);
        for (let k = 1; k <= 3; k++) mk("i", `width:0.6em;height:0.6em;border-radius:50%;background:var(--x-light-${k})`, null, lights);
        mk("b", "font-weight:600;color:var(--x-ink);margin-inline-start:0.4em", T.proj[i % 6], bar);
        mk("span", "overflow:hidden;text-overflow:ellipsis", "· " + T.task[i % 6], bar);
      }
      const body = mk("div", "position:relative;flex:1;overflow:hidden;min-height:0", null, win);
      const log = mk("div", `position:absolute;inset-inline:0;top:0;padding:${px(0.6)} ${px(0.8)};display:flex;flex-direction:column;gap:${px(0.35)}`, null, body);
      // the script this window streams
      const script = [];
      script.push({ k: "user", s: T.user[i % 6] });
      script.push({ k: "think", s: T.think, d: 0.55 + ML.rnd(i, 3) * 0.4 });
      if (kind === "chat") { for (let j = 0; j < 3; j++) script.push({ k: "ai", s: T.ai[(i + j) % T.ai.length] }); }
      else { script.push({ k: "ai", s: T.ai[i % T.ai.length] }); for (const [k, s] of CODE[i % CODE.length]) script.push({ k, s }); script.push({ k: "ai", s: T.ai[(i + 2) % T.ai.length] }); }
      const t0 = at + i * p.start_offset + 0.25;
      let tt = t0;
      const lines = script.map((x) => {
        const code = x.k === "add" || x.k === "del" || x.k === "ctx";
        const css = x.k === "user"
          ? "align-self:flex-end;max-width:85%;background:var(--x-accent);color:var(--x-accent-ink);padding:0.3em 0.7em;border-radius:0.9em"
          : x.k === "think" ? "background:linear-gradient(90deg, var(--x-dim) 0%, var(--x-dim) 35%, var(--x-ink) 50%, var(--x-dim) 65%, var(--x-dim) 100%);background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;font-style:italic"
          : code ? `font-family:var(--x-mono-font);font-size:${px(0.86)};line-height:${px(1.3)};padding:${px(0.05)} ${px(0.4)};border-radius:${px(0.25)};${x.k === "add" ? "color:var(--x-good);background:color-mix(in srgb, var(--x-good) 12%, transparent)" : x.k === "del" ? "color:var(--x-bad);background:color-mix(in srgb, var(--x-bad) 12%, transparent);text-decoration:line-through" : "color:var(--x-dim)"}`
          : "color:var(--x-ink)";
        const e = mk("div", `white-space:pre;overflow:hidden;text-overflow:clip;flex:none;${css}`, "", log);
        if (code) e.dir = "ltr";
        if (code) e.dataset.pre = x.k === "add" ? "+ " : x.k === "del" ? "- " : "  ";
        const dur = x.d ?? Array.from(x.s).length / cps;
        const line = { e, s: (code ? e.dataset.pre : "") + x.s, a: tt, b: tt + dur, think: x.k === "think" };
        tt = line.b + 0.12;
        return line;
      });
      // line heights (one line each, nowrap) to scroll the log up when it overflows
      lines.forEach((l) => { l.e.textContent = l.s; });
      const hs = lines.map((l) => l.e.offsetHeight), gap = Math.round(fs * 0.35), bodyH = body.clientHeight;
      lines.forEach((l) => { l.e.textContent = ""; });
      wins.push({ win, lines, hs, gap, bodyH, log, t0, i });
      ctx.sfx(t0, "key", 0.3);
    }
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        grid.style.opacity = (1 - leave).toFixed(4);
        for (const w of wins) {
          const a = at + w.i * p.start_offset;
          const u = ML.expo(t, a, a + 0.45);
          w.win.style.opacity = ML.clamp(u * 1.5).toFixed(4);
          w.win.style.translate = `0 ${((1 - u) * fs * 1.2).toFixed(2)}px`;
          let shown = 0;
          w.lines.forEach((l, k) => {
            const on = t >= l.a;
            l.e.style.display = on ? "block" : "none";
            if (!on) return;
            shown += w.hs[k] + (k ? w.gap : 0);
            if (l.think) {
              l.e.textContent = l.s;
              const active = t < l.b;
              l.e.style.backgroundPosition = `${active ? (100 - (((t - l.a) * 120) % 200)).toFixed(1) : 0}% 0`;
              l.e.style.opacity = active ? "1" : "0.55";
            } else l.e.textContent = ML.typed(l.s, t, l.a, l.b);
          });
          const over = Math.round(Math.max(0, shown + fs * 1.2 - w.bodyH));
          w.log.style.translate = `0 ${(-over).toFixed(2)}px`;
        }
      },
    };
  },
});
