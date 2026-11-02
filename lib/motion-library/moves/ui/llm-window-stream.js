// LLM window: prompt then streamed answer. A brutalist app window (panel ground, 2 px ink border, hard offset ink
// shadow, ink title bar with small caps labels "FRONTIER LLM · AGENT LOOP" and a right-aligned "OUTPUT N TOKENS" chip)
// enters scale 0.96 -> 1 + opacity in 0.3 s. A prompt "> question" types at 20 chars/s behind an accent block caret,
// then a long mono answer in dim ink streams word by word (~12 words/s), wrapping naturally and scrolling when it
// fills the window, while the token chip climbs (words x 1.3) on every word. It ends on an accent answer pill
// ("yes.") popping 0.8 -> 1 on back.out in 0.2 s. A "clean" theme swaps the brutal chrome for the look's own window.
// Source: prompt-motion "polydao-claude-opus-5-5-is" (reference only: rebuilt as our own code).
ML.define({
  id: "ui.llm-window-stream",
  category: "ui",
  name: "LLM window: prompt then streamed answer",
  does: "An app window types a question, then a long answer streams in word by word while the token counter in the header climbs, ending with a highlighted answer pill.",
  says: ["tech", "proof", "time", "step"],
  energy: 3,
  targets: ["screen", "line"],
  duration: [2.5, 6],
  params: {
    words_per_s: { type: "number", range: [8, 16], default: 12 },
    answer_pill: { type: "bool", default: true },
    theme: { type: "choice", options: ["brutalist", "clean"], default: "brutalist" },
    prompt: { type: "text", default: "" },
    answer: { type: "text", default: "" },
    verdict: { type: "text", default: "" },
    chars_per_s: { type: "number", range: [12, 40], default: 20 },
    title: { type: "text", default: "" },
  },
  pairs: ["ui.agent-windows-streaming", "camera.push-in"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key",
  source: { from: "prompt-motion:polydao-claude-opus-5-5-is", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { p, at, end, rtl, f } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    // the question: a line target gives it, else the prompt param / a default
    const lineEl = ctx.el && ctx.el.dataset.slot === "line" ? ctx.el : null;
    // a screen slot big enough hosts the window; otherwise it takes the picture region
    const own = !(ctx.el && !lineEl && ctx.el !== ctx.stage && ctx.el.clientWidth > 300 && ctx.el.clientHeight > 300);
    if (!own) ctx.el.replaceChildren();
    const host = own
      ? mk("div", "position:absolute;left:var(--pic-x);top:var(--pic-y);width:var(--pic-w);height:var(--pic-h);z-index:4;display:flex;align-items:center;justify-content:center;background:var(--x-ground)", ctx.scene || ctx.stage)
      : mk("div", "position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center", ctx.el);
    const W = host.clientWidth || f.pic.w, H = host.clientHeight || f.pic.h;
    const brutal = p.theme === "brutalist";
    const fs = ML.clamp(Math.min(W / 30, H / 22), 16, 40), k = fs / 12; // the source's 11-12 px mono
    const ww = W * (W / H > 1.4 ? 0.82 : 0.94), wh = Math.min(H * 0.9, ww * 1.15);
    const sh = (rtl ? -6 : 6) * k;
    const win = mk("div", `position:relative;width:${ww.toFixed(1)}px;height:${wh.toFixed(1)}px;display:flex;flex-direction:column;overflow:hidden;background:var(--x-panel);${brutal ? `border:${(2 * k / 1.5).toFixed(1)}px solid var(--x-ink);box-shadow:${sh.toFixed(1)}px ${(6 * k).toFixed(1)}px 0 var(--x-ink);border-radius:0` : "border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);border-radius:calc(var(--x-radius) * 0.5)"};opacity:0`, host);
    const bar = mk("div", `display:flex;align-items:center;gap:0.8em;padding:0.7em 1em;flex:none;font:var(--x-label-weight) ${(fs * 0.78).toFixed(1)}px var(--x-label-font), var(--x-arabic);letter-spacing:${rtl ? "0" : "0.12em"};text-transform:uppercase;white-space:nowrap;${brutal ? "background:var(--x-ink);color:var(--x-ground)" : "background:var(--x-bar);color:var(--x-bar-ink);border-bottom:var(--x-edge) solid var(--x-line)"}`, win);
    if (!brutal) { const l = mk("span", "display:flex;gap:0.4em;opacity:var(--x-lights)", bar); for (let i = 1; i <= 3; i++) mk("i", `width:0.75em;height:0.75em;border-radius:50%;background:var(--x-light-${i})`, l); }
    mk("span", "overflow:hidden;text-overflow:ellipsis", bar, p.title || (rtl ? "نموذج لغوي · حلقة الوكيل" : "Frontier LLM · Agent loop"));
    const chip = mk("span", `margin-inline-start:auto;padding:0.25em 0.6em;${brutal ? "background:var(--x-ground);color:var(--x-ink)" : "background:var(--x-panel-2);color:var(--x-ink);border-radius:var(--x-radius-s)"};font-variant-numeric:tabular-nums`, bar, "");
    const body = mk("div", `position:relative;flex:1;overflow:hidden;min-height:0`, win);
    const inner = mk("div", `position:absolute;inset-inline:0;top:0;padding:1.1em 1.2em;display:flex;flex-direction:column;gap:0.9em;font:var(--x-body-weight) ${fs.toFixed(1)}px/1.55 var(--x-mono-font), var(--x-arabic)`, body);
    const q = p.prompt || (lineEl && lineEl.textContent.trim()) || (rtl ? "هل يقدر يخلّص الشغل لوحده؟" : "can it finish the job on its own?");
    const qLine = mk("div", "color:var(--x-ink);font-weight:var(--x-head-weight);white-space:pre-wrap", inner);
    const qText = mk("span", null, qLine, "");
    const caret = mk("span", `display:inline-block;width:0.6em;height:1.15em;vertical-align:-0.2em;background:var(--x-accent);margin-inline:0.1em -0.7em`, null); // takes no room: the caret never re-wraps a line
    const ans = mk("div", "color:var(--x-dim);opacity:0.85", inner);
    const A = p.answer || (rtl
      ? "خليني أفكّر خطوة بخطوة. أول حاجة بقرأ الملفات وأفهم المطلوب، بعدين بقسّم الشغل لمهام صغيرة، وكل مهمة بجرّبها وأتأكد إن الاختبارات بتعدّي قبل ما أكمّل. لو حاجة وقعت برجع أصلّحها لوحدي من غير ما أستنى حد. في الآخر بكتب ملخص باللي اتعمل وباللي محتاج مراجعة. الحلقة دي بتلف لحد ما كل حاجة تبقى جاهزة فعلاً."
      : "Let me think step by step. First I read the files and work out what is being asked, then I split the work into small tasks, and I run each one and check the tests pass before moving on. When something breaks I go back and fix it myself without waiting for anyone. At the end I write a short summary of what changed and what still needs a human look. The loop keeps turning until everything is actually done.");
    const words = A.split(/\s+/).filter(Boolean).map((w, i) => { const s = mk("span", "visibility:hidden", ans, w); if (i) s.before(" "); return s; });
    const verdict = p.verdict || (rtl ? "أيوه." : "yes.");
    const pill = p.answer_pill ? mk("div", `align-self:flex-start;padding:0.25em 0.9em;background:var(--x-accent);color:var(--x-accent-ink);font-weight:var(--x-head-weight);font-size:1.25em;border-radius:${brutal ? "0" : "var(--x-radius-s)"};${brutal ? `border:${(2 * k / 1.5).toFixed(1)}px solid var(--x-ink);` : ""}opacity:0;transform-origin:${rtl ? "right" : "left"} center`, inner, verdict) : null;
    // timing: window, typed prompt, streamed answer (trimmed to fit the run), pill
    const tq0 = at + 0.35, qChars = Array.from(q).length;
    let tq1 = tq0 + qChars / p.chars_per_s;
    const room = end - 0.45 - (p.answer_pill ? 0.45 : 0);
    if (tq1 > at + (room - at) * 0.4) tq1 = at + (room - at) * 0.4;
    const ta0 = tq1 + 0.25;
    const rate = Math.max(p.words_per_s, words.length / Math.max(0.5, room - ta0));
    const wt = words.map((w, i) => ta0 + i / rate);
    const tp = (wt[wt.length - 1] || ta0) + 0.2;
    ctx.sfx(tq0, "key", 0.3); ctx.sfx(tq0 + (tq1 - tq0) / 2, "key", 0.25); ctx.sfx(tq1, "key.return", 0.3);
    for (let s = ta0 + 0.5; s < tp - 0.3; s += 1) ctx.sfx(s, "key", 0.18);
    if (pill) ctx.sfx(tp, "pop", 0.35);
    const fmtN = (n) => (rtl ? `المخرجات ${n} توكن` : `Output ${n} tokens`);
    const bodyH = () => body.clientHeight;
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        const u = ML.out(t, at, at + 0.3);
        win.style.opacity = u.toFixed(4);
        host.style.opacity = ((own ? ML.lin(t, at, at + 0.15) : 1) * (1 - leave)).toFixed(4);
        win.style.scale = (0.96 + 0.04 * u).toFixed(4);
        qText.textContent = "> " + ML.typed(q, t, tq0, tq1);
        let shown = 0;
        for (let i = 0; i < words.length; i++) { const v = t >= wt[i]; words[i].style.visibility = v ? "visible" : "hidden"; if (v) shown = i + 1; }
        chip.textContent = fmtN(Math.round(shown * 1.3));
        // the caret rides the active line
        const where = t < ta0 ? qLine : shown < words.length ? ans : null;
        if (where && caret.parentElement !== where) where.append(caret);
        if (!where && caret.parentElement) caret.remove();
        if (where === ans && shown) words[shown - 1].after(caret);
        caret.style.opacity = t < tq1 && t >= tq0 ? "1" : String(ML.blink(t - at, 0.9));
        if (pill) {
          const pu = ML.back(t, tp, tp + 0.2, 1.7);
          pill.style.opacity = t >= tp ? "1" : "0";
          pill.style.scale = (0.8 + 0.2 * pu).toFixed(4);
        }
        // scroll so the newest line stays in view
        const last = pill && t >= tp ? pill : shown ? words[shown - 1] : qLine;
        const bottom = last.offsetTop + last.offsetHeight + fs * 1.2;
        inner.style.translate = `0 ${(-Math.max(0, bottom - bodyH())).toFixed(2)}px`;
      },
    };
  },
});
