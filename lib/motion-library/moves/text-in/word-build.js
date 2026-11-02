// Word-by-word build: a sentence builds one word per spoken beat. Every word is laid out at its final place from the
// first frame (kept slot, opacity only — nothing reflows; align "start" makes the line grow toward its end
// edge and wraps). Each word snaps on almost instantly: a cut-on (opacity in 0.03–0.25 s with a tiny scale 1.04 → 1),
// a plain fade, a blur-rise (y +0.1 em → 0, blur 6 → 0 over ≥ 0.22 s, power3.out) or a pop (scale 0.9 → 1 + y 6 px
// over 0.2 s). The newest word can flash heavier for two frames (a stroke, so its width never changes). The key (last)
// word can wait pending — at 45 % dim, as an outline, or held back hidden for a later beat. Optional: a section pill
// ('THE SETUP') lands first above the line; a tiny mono caption fades in at 40 % 0.2 s after the line completes.
// Source: our own rebuild of prompt-motion sudo-kiran-i-have-asked-opus (also sudo-kiran-built-a-product-demo,
// lexnlin-f9b3bd8, 0xnfrith-opus-5-5-animation-created) — reference only.
ML.define({
  id: "text-in.word-build",
  category: "text-in",
  name: "Word-by-word build",
  does: "A sentence builds one word per spoken beat, each word snapping on almost instantly into a pre-laid-out line that grows and wraps without reflowing.",
  says: ["story", "urgency", "focus", "problem", "step", "reveal"],
  energy: 3,
  targets: ["line", "headline"],
  duration: [1, 5],
  params: {
    appear: { type: "choice", options: ["cut", "fade", "blur-rise", "pop"], default: "cut" },
    appear_time: { type: "number", range: [0.03, 0.25], default: 0.08, unit: "s" },
    sync: { type: "choice", options: ["spoken", "beat", "fixed"], default: "spoken" },
    interval: { type: "number", range: [0.2, 0.6], default: 0.4, unit: "s" },
    scale_from: { type: "number", range: [0.9, 1.05], default: 1.04 },
    weight_pop: { type: "bool", default: false },
    pending_last: { type: "choice", options: ["none", "grey", "outline", "held"], default: "none" },
    align: { type: "choice", options: ["keep", "start"], default: "keep" },
    caption: { type: "bool", default: false },
    caption_text: { type: "text", default: "" },
    section_pill: { type: "bool", default: false },
    pill_text: { type: "text", default: "" },
  },
  pairs: ["text-emphasis.accent-word", "camera.push-in"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:sudo-kiran-i-have-asked-opus", license: "reference", note: "also sudo-kiran-built-a-product-demo, lexnlin-f9b3bd8, 0xnfrith-opus-5-5-animation-created — rebuilt as our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const doc = el.ownerDocument;
    const fs = parseFloat(getComputedStyle(el).fontSize) || 64;
    if (p.align === "start") el.style.textAlign = "start";
    const words = ML.split(el, "words");
    const n = words.length;
    if (!n) return null;

    // the section pill (above) and the mono caption (below) live inside the target, so nothing outside moves
    let pill = null, cap = null;
    if (p.section_pill) {
      const row = doc.createElement("div");
      pill = doc.createElement("span");
      pill.textContent = p.pill_text || (rtl ? "البداية" : "THE SETUP");
      const pfs = Math.max(14, fs * 0.22);
      Object.assign(pill.style, { display: "inline-block", font: `var(--x-label-weight) ${pfs.toFixed(1)}px/1 ${rtl ? "var(--x-arabic)" : "var(--x-label-font)"}`, letterSpacing: rtl ? "0" : "var(--x-label-track)", textTransform: rtl ? "none" : "var(--x-label-case)", color: "var(--x-accent)", border: `${Math.max(1, pfs / 12).toFixed(1)}px solid var(--x-accent)`, borderRadius: "999px", padding: `${(pfs * 0.45).toFixed(1)}px ${(pfs * 0.9).toFixed(1)}px`, marginBottom: `${(fs * 0.3).toFixed(1)}px`, background: "var(--x-panel)" });
      Object.assign(row.style, { display: "block", lineHeight: "1" });
      row.append(pill);
      el.prepend(row);
    }
    if (p.caption) {
      cap = doc.createElement("div");
      cap.textContent = p.caption_text || (rtl ? "اتفتح ٠ مرة" : "opened 0 times");
      Object.assign(cap.style, { display: "block", font: `500 ${Math.max(14, fs * 0.2).toFixed(1)}px/1.3 var(--x-mono-font)`, letterSpacing: "0.04em", textTransform: "none", color: "var(--x-ink)", marginTop: `${(fs * 0.3).toFixed(1)}px`, opacity: "0" });
      el.append(cap);
    }

    // the times: each word on its spoken word, else on a steady beat, else spread evenly over the room it has
    const start = at + (pill ? 0.3 : 0);
    const room = Math.max(0.3, (end - start) * 0.75);
    const step = p.sync === "fixed" ? Math.min(0.6, Math.max(0.12, room / Math.max(1, n))) : p.interval;
    let prev = -Infinity;
    const times = words.map((w, i) => {
      const fb = start + i * step;
      const x = p.sync === "spoken" ? Math.max(start, ctx.word(w.textContent, fb)) : fb;
      prev = Math.max(x, prev + 0.06);
      return prev;
    });
    // the key word held back: it waits a couple of beats after the rest
    if (p.pending_last === "held" && n > 1) times[n - 1] = Math.max(times[n - 1], Math.min(end - 0.4, times[n - 2] + step * 2.5));
    // never past the scene: squeeze the whole build into the window if the voice runs long
    const last = end - 0.35;
    if (times[n - 1] > last && n > 1) { const k = Math.max(0, last - start) / (times[n - 1] - start || 1); times.forEach((x, i) => { times[i] = start + (x - start) * k; }); }
    const done = times[n - 1];

    // sound: about one per beat
    let lastSfx = -Infinity;
    if (pill) { ctx.sfx(at, "blip", 0.2); lastSfx = at; }
    times.forEach((x, i) => {
      const key = i === n - 1 && p.pending_last !== "none";
      if (key) ctx.sfx(x, "pop", 0.32);
      else if (x - lastSfx >= 0.18) { ctx.sfx(x, "tap", 0.22); lastSfx = x; }
    });

    const dur = p.appear === "blur-rise" ? Math.max(0.22, p.appear_time) : p.appear === "pop" ? Math.max(0.2, p.appear_time) : p.appear_time;
    const out3 = (t, a, b) => ML.out(t, a, b);
    const frame = 1 / 30;
    const pend = p.pending_last;
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.22)) / 0.18);
        el.style.opacity = leave > 0 ? String(1 - leave) : "";
        if (pill) {
          const u = out3(t, at, at + 0.25);
          pill.style.opacity = u.toFixed(4);
          pill.style.translate = `0 ${((1 - u) * fs * 0.12).toFixed(2)}px`;
        }
        words.forEach((w, i) => {
          const ti = times[i];
          const keyPending = i === n - 1 && n > 1 && (pend === "grey" || pend === "outline");
          let o = 0, y = 0, s = 1, blur = 0;
          if (p.appear === "cut") { o = ML.lin(t, ti, ti + dur); s = p.scale_from + (1 - p.scale_from) * ML.out(t, ti, ti + Math.max(dur, 0.12)); }
          else if (p.appear === "fade") { o = ML.ease(t, ti, ti + dur); }
          else if (p.appear === "blur-rise") { const u = out3(t, ti, ti + dur); o = u; y = (1 - u) * fs * 0.12; blur = (1 - u) * 6; }
          else { const u = out3(t, ti, ti + dur); o = ML.lin(t, ti, ti + dur * 0.6); s = 0.9 + 0.1 * u; y = (1 - u) * fs * 0.09; }
          if (keyPending) {
            // shown pending from the start of the build, filled in on its beat
            const vis = ML.lin(t, start, start + 0.15);
            const fill = ML.lin(t, ti, ti + Math.max(dur, 0.1));
            w.style.opacity = (vis * (pend === "grey" ? 0.45 + 0.55 * fill : 1)).toFixed(4);
            if (pend === "grey") w.style.color = fill >= 1 ? "" : "var(--x-dim)";
            else {
              w.style.webkitTextStroke = fill >= 1 ? "" : `${Math.max(1, fs / 40).toFixed(1)}px var(--x-ink)`;
              w.style.color = fill <= 0 ? "transparent" : fill >= 1 ? "" : `color-mix(in srgb, var(--x-ink) ${(fill * 100).toFixed(1)}%, transparent)`;
            }
            w.style.scale = s === 1 || fill <= 0 ? "none" : s.toFixed(4);
            w.style.translate = "none";
            w.style.filter = "none";
            return;
          }
          w.style.opacity = o.toFixed(4);
          w.style.scale = s === 1 ? "none" : s.toFixed(4);
          w.style.translate = y ? `0 ${y.toFixed(2)}px` : "none";
          w.style.filter = blur > 0.01 ? `blur(${blur.toFixed(2)}px)` : "none";
          // the newest word, heavier for two frames (a stroke — the width never changes, so nothing reflows)
          if (p.weight_pop) w.style.webkitTextStroke = t >= ti && t < ti + frame * 2 ? `${(fs * 0.025).toFixed(2)}px currentColor` : "";
        });
        if (cap) {
          const u = ML.ease(t, done + 0.2, done + 0.4);
          cap.style.opacity = (u * 0.4).toFixed(4);
        }
      },
    };
  },
});
