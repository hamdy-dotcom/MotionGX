// Processing overlay: a dark veil (the look's ink at `veil` strength, 0.72 by default — scenes.js's rgba(10,10,16,.72))
// fades over the preview in 0.25 s; a ring spinner (64 px at 1080, 6 px border, one bright quarter) pops from 0.6 → 1 in
// 0.2 s (R.replay) and turns at 720° / 1.4 s, linear, under a status line. At +`duration` the veil lifts in 0.3 s and
// the picture behind has changed in that same instant (S.editroom's glow jumps from one side to the other); a success
// chip pops 0.1 s later with the success cue. Without a screen of its own it builds a small preview in the picture region.
// Sources: MotionGX lib/studio-engine/assets/scenes.js S.editroom (overlay, spin, swap, chip) and
// lib/live-engine/worker/vendor/recipes.js R.replay (spinner pop) — own.
ML.define({
  id: "ui.processing-overlay",
  category: "ui",
  name: "Processing spinner overlay",
  does: "A dark veil with a spinning loader covers the preview while it 'renders', then lifts to show the new version.",
  says: ["time", "tech", "change"],
  energy: 2,
  targets: ["screen", "card"],
  duration: [0.6, 1.5],
  params: {
    duration: { type: "number", range: [0.6, 1.5], default: 1.15, unit: "s" },
    veil: { type: "number", range: [0.4, 0.85], default: 0.72 },
    status: { type: "text" },
    chip: { type: "bool", default: true },
  },
  pairs: ["ui.cursor-glide-click", "ui.request-bubble-send"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "success",
  source: { from: "own:lib/studio-engine/assets/scenes.js", license: "own", note: "S.editroom overlay + live-engine recipes.js R.replay spinner" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const px = (v) => (v * k).toFixed(1) + "px";

    // the screen under the veil: the director's, else a small preview of our own (before → after)
    let screen = ctx.el && ctx.el !== ctx.stage ? ctx.el : null, frame = null, before = null, after = null;
    if (screen) {
      if (getComputedStyle(screen).position === "static") screen.style.position = "relative";
      screen.style.overflow = "hidden";
    } else {
      const R = f.pic, w = Math.min(R.w, 920 * k), h = Math.min(R.h * 0.8, w * (f.tall ? 0.78 : 0.56));
      frame = mk("div", `position:absolute;left:${(R.x + (R.w - w) / 2).toFixed(1)}px;top:${(R.y + (R.h - h) / 2).toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;border-radius:calc(var(--x-radius) * 0.7);overflow:hidden;background:var(--x-panel-2);box-shadow:var(--x-shadow);z-index:5;`, ctx.scene || ctx.stage);
      screen = frame;
      before = mk("div", "position:absolute;inset:0;background:radial-gradient(circle at 25% 60%, color-mix(in srgb, var(--x-accent) 70%, transparent), transparent 58%);", frame);
      after = mk("div", "position:absolute;inset:0;opacity:0;background:radial-gradient(circle at 75% 38%, color-mix(in srgb, var(--x-accent-2) 80%, transparent), transparent 58%);", frame);
      const title = mk("div", `position:absolute;${rtl ? "left" : "right"}:7%;top:16%;max-width:60%;font:var(--x-head-weight) ${px(f.tall ? 64 : 56)}/1.1 var(--x-head-font);color:var(--x-ink);text-align:${rtl ? "left" : "right"};`, frame, rtl ? "النسخة الأولى" : "First cut");
      const art = mk("div", `position:absolute;${rtl ? "right" : "left"}:7%;bottom:9%;width:32%;aspect-ratio:1;border-radius:50%;background:var(--x-panel);box-shadow:var(--x-shadow);`, frame);
      before._title = title; before._art = art;
    }

    // the veil, the spinner, the status line
    const veil = mk("div", `position:absolute;inset:0;z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${px(22)};background:color-mix(in srgb, var(--x-ink) ${(p.veil * 100).toFixed(1)}%, transparent);color:var(--x-ground);opacity:0;pointer-events:none;`, screen);
    const spin = mk("div", `width:${px(64)};height:${px(64)};box-sizing:border-box;border-radius:50%;border:${px(6)} solid color-mix(in srgb, var(--x-ground) 25%, transparent);border-top-color:var(--x-ground);`, veil);
    const status = p.status || (rtl ? "بنجهّز النسخة الجديدة…" : "Rendering the new version…");
    mk("div", `font:500 ${px(34)}/1.2 var(--x-head-font);text-align:center;padding:0 ${px(24)};`, veil, status);

    // the success chip, above the screen's corner (inside it when the screen is the director's)
    let chip = null;
    if (p.chip) {
      const host = frame ? ctx.scene || ctx.stage : screen;
      chip = mk("div", `position:absolute;z-index:21;display:flex;align-items:center;gap:${px(12)};padding:${px(14)} ${px(26)};border-radius:var(--x-radius-s);background:var(--x-panel);color:var(--x-ink);box-shadow:var(--x-shadow);font:600 ${px(32)} var(--x-body-font);white-space:nowrap;opacity:0;`, host);
      chip.innerHTML = `<svg viewBox="0 0 24 24" width="${(30 * k).toFixed(1)}" height="${(30 * k).toFixed(1)}" fill="none" stroke="var(--x-good)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
      mk("span", "", chip, rtl ? "نسخة جديدة" : "New version");
      if (frame) {
        const b = ctx.box(frame);
        chip.style.top = (b.y - 30 * k).toFixed(1) + "px";
        chip.style[rtl ? "right" : "left"] = (rtl ? f.W - (b.x + b.w) + 32 * k : b.x + 32 * k).toFixed(1) + "px";
      } else { chip.style.top = px(24); chip.style[rtl ? "right" : "left"] = px(24); }
    }

    // timing: the veil from at + 0.15, lifting `duration` later, never past the end
    const T0 = at + (frame ? 0.45 : 0.15);
    const D = Math.max(0.5, Math.min(p.duration, end - 0.75 - T0));
    const T1 = T0 + D;
    ctx.sfx(T0, "whoosh.soft", 0.2);
    if (chip) ctx.sfx(T1 + 0.1, "success", 0.5);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        if (frame) { const u = ML.out(t, at, at + 0.4); frame.style.opacity = (t < at ? 0 : u * (1 - leave)).toFixed(4); frame.style.translate = `0 ${((1 - u) * 30 * k).toFixed(2)}px`; }
        const v = ML.lin(t, T0, T0 + 0.25) * (1 - ML.lin(t, T1, T1 + 0.3));
        veil.style.opacity = v.toFixed(4);
        const sp = ML.lin(t, T0 - 0.05, T0 + 0.15), spOut = ML.lin(t, T1 - 0.05, T1 + 0.1);
        spin.style.opacity = (sp * (1 - spOut)).toFixed(4);
        spin.style.transform = `rotate(${(Math.max(0, t - T0 + 0.05) * (720 / 1.4)).toFixed(2)}deg) scale(${(0.6 + 0.4 * ML.out(t, T0 - 0.05, T0 + 0.15)).toFixed(4)})`;
        if (after) {
          const swapped = t >= T1 ? 1 : 0;
          after.style.opacity = String(swapped);
          before.style.opacity = String(1 - swapped);
          before._title.textContent = swapped ? (rtl ? "النسخة الجديدة" : "New cut") : (rtl ? "النسخة الأولى" : "First cut");
          before._art.style.background = swapped ? "var(--x-accent)" : "var(--x-panel)";
        }
        if (chip) {
          const q = ML.back(t, T1 + 0.1, T1 + 0.45, 2.2);
          chip.style.opacity = (t < T1 + 0.1 ? 0 : ML.clamp(q * 3) * (1 - leave)).toFixed(4);
          chip.style.scale = (t < T1 + 0.1 ? 0.6 : 0.6 + 0.4 * q).toFixed(4);
        }
      },
    };
  },
});
