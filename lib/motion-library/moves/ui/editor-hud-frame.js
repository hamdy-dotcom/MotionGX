// Motion-editor HUD frame: persistent editor chrome around the picture — four thin corner brackets, a "● TITLE" mark
// with a record dot on the reading-side top, a running timecode (HH:MM:SS:FF, from the film's own seconds) on the far
// top with a section tag under it, and along the bottom a hairline timeline with diamond ticks every ~8 %, a coloured
// progress bar with a playhead, and a "BAR n ●●●○" beat counter. All tiny mono at ~50 % ink, so it frames without
// competing; keep it on every scene for continuity. The brackets draw out from the corners when it arrives.
// Source: prompt-motion grace-sunnyy-opus5-5-15 (reference only — our own rebuild).
ML.define({
  id: "ui.editor-hud-frame",
  category: "ui",
  name: "Motion-editor HUD frame",
  does: "Persistent editor chrome around the picture: corner brackets, a record-dot title, a running timecode, a section label and a ticked timeline with a progress bar at the bottom.",
  says: ["tech", "precision"],
  energy: 1,
  targets: ["stage"],
  duration: [3, 60],
  params: {
    title: { type: "text", default: "MOTION REEL" },
    section: { type: "text", default: "01 / KINETIC TYPE" },
    colour: { type: "choice", options: ["bad", "accent", "accent-2", "good", "ink"], default: "bad" },
    timecode: { type: "bool", default: true },
    fps: { type: "number", range: [24, 60], default: 30 },
    ticks: { type: "number", range: [6, 20], default: 12 },
    bpm: { type: "number", range: [60, 180], default: 120 },
    intro: { type: "choice", options: ["draw", "none"], default: "draw" },
  },
  pairs: ["ui.duration-badge-progress", "ui.dot-tab-switch"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "prompt-motion:grace-sunnyy-opus5-5-15", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const u = Math.min(f.W, f.H) / 540; // the source's 9 px type and 16 px brackets, at our size
    const mk = (tag, css, parent, html) => { const e = doc.createElement(tag); e.style.cssText = css; if (html != null) e.innerHTML = html; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const C = `var(--x-${p.colour})`;
    const start = rtl ? "right" : "left", far = rtl ? "left" : "right";

    // the frame: inside the phone's own chrome on 9:16, close to the edges elsewhere
    // (whole pixels: the counter repaints every bar, and a fractional box would re-rasterise what lies under it differently)
    const top = Math.round(f.tall ? f.safe.y * 0.55 : f.m * 0.45), bottom = Math.round(f.tall ? (f.H - f.safe.y - f.safe.h) * 0.45 : f.m * 0.45), side = Math.round(f.m * 0.45);
    const hud = mk("div", `position:absolute;left:${side.toFixed(1)}px;right:${side.toFixed(1)}px;top:${top.toFixed(1)}px;bottom:${bottom.toFixed(1)}px;pointer-events:none;z-index:9;color:var(--x-ink);will-change:transform;`, host); // own layer: its per-frame repaints never touch the scene under it
    const fs = 9 * u, L = 16 * u, w = Math.max(1, u);
    const type = (txt) => (ML.ARABIC.test(txt) ? `font:500 ${(fs * 1.1).toFixed(1)}px var(--x-body-font);letter-spacing:0;` : `font:500 ${fs.toFixed(1)}px var(--x-mono-font);letter-spacing:0.14em;text-transform:uppercase;`);

    // corner brackets (each an L of two arms that grow out from its corner)
    const arms = [];
    for (const [v, h] of [["top", "left"], ["top", "right"], ["bottom", "left"], ["bottom", "right"]]) {
      const a = mk("i", `position:absolute;${v}:0;${h}:0;height:${w.toFixed(1)}px;width:${L.toFixed(1)}px;background:currentColor;opacity:.55;transform-origin:${h} center;`, hud);
      const b = mk("i", `position:absolute;${v}:0;${h}:0;width:${w.toFixed(1)}px;height:${L.toFixed(1)}px;background:currentColor;opacity:.55;transform-origin:center ${v};`, hud);
      arms.push([a, "x"], [b, "y"]);
    }
    const pad = Math.round(L * 0.9);
    // top, reading side: ● TITLE
    const head = mk("div", `position:absolute;top:${pad.toFixed(1)}px;${start}:${pad.toFixed(1)}px;display:flex;align-items:center;gap:${(fs * 0.7).toFixed(1)}px;`, hud);
    const rec = mk("i", `width:${(fs * 0.75).toFixed(1)}px;height:${(fs * 0.75).toFixed(1)}px;border-radius:50%;background:${C};flex:none;`, head);
    mk("span", type(p.title) + `opacity:.55;white-space:nowrap;unicode-bidi:isolate;direction:${ML.ARABIC.test(p.title || "") ? "rtl" : "ltr"};`, head, "").textContent = p.title || "";
    // top, far side: timecode + section tag
    const tc = mk("div", `position:absolute;top:${pad.toFixed(1)}px;${far}:${pad.toFixed(1)}px;display:flex;flex-direction:column;align-items:${rtl ? "flex-start" : "flex-end"};gap:${(fs * 0.5).toFixed(1)}px;`, hud);
    const clock = p.timecode ? mk("span", type("0") + "opacity:.55;direction:ltr;font-variant-numeric:tabular-nums;white-space:nowrap;", tc) : null;
    const sec = mk("span", type(p.section || "") + `opacity:.4;white-space:nowrap;unicode-bidi:isolate;direction:${ML.ARABIC.test(p.section || "") ? "rtl" : "ltr"};`, tc);
    sec.textContent = p.section || "";
    // bottom: hairline timeline with diamond ticks, progress bar, playhead, beat counter
    const line = mk("div", `position:absolute;left:${pad.toFixed(1)}px;right:${pad.toFixed(1)}px;bottom:${pad.toFixed(1)}px;height:${w.toFixed(1)}px;background:color-mix(in srgb, currentColor 35%, transparent);`, hud);
    const n = Math.round(p.ticks), D = fs * 0.55;
    for (let i = 0; i <= n; i++) mk("i", `position:absolute;${start}:${((i / n) * 100).toFixed(3)}%;top:50%;width:${D.toFixed(1)}px;height:${D.toFixed(1)}px;margin:${(-D / 2).toFixed(1)}px ${(-D / 2).toFixed(1)}px;background:currentColor;opacity:.4;rotate:45deg;`, line);
    const prog = mk("div", `position:absolute;${start}:0;top:${(-w).toFixed(1)}px;height:${(w * 3).toFixed(1)}px;width:0;background:${C};`, line);
    const head2 = mk("i", `position:absolute;${start}:0;top:50%;width:${(D * 1.5).toFixed(1)}px;height:${(D * 1.5).toFixed(1)}px;margin:${(-D * 0.75).toFixed(1)}px ${(-D * 0.75).toFixed(1)}px;background:${C};rotate:45deg;`, line);
    const beat = mk("div", `position:absolute;bottom:${Math.round(pad + fs * 1.2)}px;${far}:${Math.round(pad)}px;display:flex;align-items:center;gap:${Math.round(fs * 0.6)}px;`, hud);
    // fixed-width label and whole-pixel dots: the counter's text changes every bar, and must not nudge the dots by a sub-pixel
    // the counter is re-written whole each frame (text + dots), so the same frame always repaints the same box the same way
    const barCss = type("BAR") + `opacity:.55;direction:ltr;white-space:nowrap;display:inline-block;width:${Math.round(fs * 5.2)}px;text-align:${rtl ? "left" : "right"};`;
    const DD = Math.max(2, Math.round(fs * 0.55));
    const dotCss = `display:block;width:${DD}px;height:${DD}px;border-radius:50%;flex:none;`;
    if (rtl) beat.style.flexDirection = "row-reverse";

    const two = (x) => String(x).padStart(2, "0");
    const fps = Math.round(p.fps);
    const intro = p.intro === "draw" ? 0.5 : 0;
    const spb = 60 / p.bpm;
    return {
      draw(t) {
        const on = intro ? ML.out(t, at, at + intro) : t >= at ? 1 : 0;
        hud.style.opacity = (intro ? ML.clamp((t - at) / 0.2) : on).toFixed(4);
        for (const [a, ax] of arms) a.style.scale = on >= 1 ? "none" : ax === "x" ? `${on.toFixed(4)} 1` : `1 ${on.toFixed(4)}`;
        // record dot blinks once a second
        rec.style.opacity = String(0.35 + 0.65 * ML.blink(Math.max(0, t), 1));
        if (clock) {
          const fr = Math.max(0, Math.floor(t * fps + 1e-6)), s = Math.floor(fr / fps);
          clock.textContent = `${two(Math.floor(s / 3600))}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}:${two(fr % fps)}`;
        }
        const g = ML.lin(t, at, end);
        prog.style.width = (g * 100).toFixed(3) + "%";
        head2.style[start] = (g * 100).toFixed(3) + "%";
        const b = Math.max(0, Math.floor((t - at) / spb + 1e-6));
        const html = `<span style="${barCss}">BAR ${Math.floor(b / 4) + 1}</span>` +
          [0, 1, 2, 3].map((i) => `<i style="${dotCss}background:color-mix(in srgb, ${C} ${i <= b % 4 ? 90 : 20}%, transparent)"></i>`).join("");
        if (beat.innerHTML !== html) beat.innerHTML = html;
      },
    };
  },
});
