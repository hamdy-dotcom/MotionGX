// Animation timeline scrubber strip: a hairline runs across the bottom of the frame with small keyframe markers
// (diamonds or dots) at section fractions; a playhead — a small triangle over a 1 px tick — travels it linearly with
// scene time (x = progress through the move), the markers it has passed light in the accent, and the current section's
// name rides beside it in small mono ("spacing", "type"). An optional mono timecode sits top-right. It says "this is
// being animated". In RTL the strip reads right to left.
// Source: prompt-motion chatgptastra-opus-5-5-15, himanshutwtxs-this-is-insane-opus (reference only: our own code).
ML.define({
  id: "ui.timeline-scrubber",
  category: "ui",
  name: "Animation timeline scrubber strip",
  does: "A thin animation timeline runs along the bottom with keyframe diamonds and a playhead advancing with scene time, labelled with the current section.",
  says: ["time", "step", "precision", "tech"],
  energy: 1,
  targets: ["stage"],
  duration: [2, 60],
  params: {
    markers: { type: "number", range: [3, 12], default: 8 },
    label: { type: "bool", default: true },
    timecode: { type: "bool", default: true },
    marker_shape: { type: "choice", options: ["diamond", "dot"], default: "diamond" },
    sections: { type: "text", default: "" },
    fps: { type: "number", range: [24, 60], default: 30 },
  },
  pairs: ["background.grid-paper", "accent.corner-brackets"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:chatgptastra-opus-5-5-15", license: "reference", note: "also himanshutwtxs-this-is-insane-opus; our own rebuild of the technique" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const n = Math.round(ML.clamp(p.markers, 3, 12));
    const DEF = rtl ? ["المقدمة", "الخط", "المسافات", "الألوان", "الحركة", "التفاصيل", "الصوت", "الختام"] : ["intro", "type", "spacing", "colour", "motion", "detail", "sound", "outro"];
    const given = String(p.sections || "").split(/[,،|]/).map((s) => s.trim()).filter(Boolean);
    const names = Array.from({ length: n }, (_, i) => given[i] || DEF[i % DEF.length]);

    // geometry: a strip near the bottom (clear of a phone's own buttons on 9:16), inset by the side margin
    const x0 = f.m, len = f.W - f.m * 2;
    const y = f.H - (f.tall ? f.H * 0.12 : f.H * 0.06) - 20 * k;
    const ms = Math.max(8, 14 * k), fs = Math.max(12, 20 * k);
    const strip = mk("div", `position:absolute;left:${x0}px;top:${y.toFixed(1)}px;width:${len}px;height:0;z-index:7;pointer-events:none;`, host);
    mk("div", `position:absolute;left:0;right:0;top:${(-Math.max(1, 1.5 * k) / 2).toFixed(1)}px;height:${Math.max(1, 1.5 * k).toFixed(1)}px;background:var(--x-dim);opacity:.45;`, strip);
    const fill = mk("div", `position:absolute;${rtl ? "right" : "left"}:0;top:${(-Math.max(1, 1.5 * k) / 2).toFixed(1)}px;height:${Math.max(1, 1.5 * k).toFixed(1)}px;width:0;background:var(--x-accent);`, strip);
    // markers at section fractions (a little in from both ends)
    const fr = names.map((_, i) => 0.04 + (0.92 * i) / (n - 1));
    // each marker an SVG shape (no rotated boxes: their edges must raster the same every frame)
    const SH = p.marker_shape === "dot" ? '<circle cx="12" cy="12" r="9"/>' : '<polygon points="12,2.5 21.5,12 12,21.5 2.5,12"/>';
    const marks = fr.map(() => { const m = mk("div", `position:absolute;line-height:0;`, strip); m.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%" stroke-width="${(24 * Math.max(1, 1.5 * k) / ms).toFixed(2)}">${SH}</svg>`; return m; });
    // the playhead: a triangle above a thin vertical tick, the section name beside it
    const head = mk("div", `position:absolute;${rtl ? "right" : "left"}:0;top:0;width:0;height:0;`, strip);
    mk("div", `position:absolute;left:${(-Math.max(1, 1.5 * k) / 2).toFixed(1)}px;top:${(-ms * 2.2).toFixed(1)}px;width:${Math.max(1, 1.5 * k).toFixed(1)}px;height:${(ms * 3.4).toFixed(1)}px;background:var(--x-accent);`, head);
    mk("div", `position:absolute;left:${(-ms * 0.7).toFixed(1)}px;top:${(-ms * 2.2 - ms * 0.9).toFixed(1)}px;width:0;height:0;border-left:${(ms * 0.7).toFixed(1)}px solid transparent;border-right:${(ms * 0.7).toFixed(1)}px solid transparent;border-top:${(ms * 0.95).toFixed(1)}px solid var(--x-accent);`, head);
    const lab = p.label ? mk("div", `position:absolute;${rtl ? "right" : "left"}:${(ms * 0.9).toFixed(1)}px;top:${(-ms * 2.2 - fs * 1.15).toFixed(1)}px;font:500 ${fs.toFixed(1)}px var(--x-mono-font);color:var(--x-ink);white-space:nowrap;letter-spacing:0.04em;`, head) : null;
    const tc = p.timecode ? mk("div", `position:absolute;${rtl ? "left" : "right"}:${f.m}px;top:${(f.safe.y * (f.tall ? 0.7 : 0.6)).toFixed(1)}px;font:500 ${fs.toFixed(1)}px var(--x-mono-font);color:var(--x-dim);letter-spacing:0.06em;z-index:7;pointer-events:none;direction:ltr;`, host) : null;

    // a soft tick each time the playhead passes a marker (no closer than half a second)
    const span = Math.max(0.5, end - at);
    let last = -1;
    fr.forEach((u) => { const tk = at + u * span; if (tk - last >= 0.5 && tk < end) { ctx.sfx(tk, "blip", 0.1); last = tk; } });
    const pad = (v, d = 2) => String(Math.floor(v)).padStart(d, "0");

    return {
      draw(t) {
        const o = ML.ease(t, at - 0.1, at + 0.35) * (1 - ML.lin(t, end - 0.3, end));
        strip.style.opacity = o.toFixed(4);
        if (tc) tc.style.opacity = o.toFixed(4);
        const u = ML.lin(t, at, end);
        head.style[rtl ? "right" : "left"] = (u * len).toFixed(1) + "px";
        fill.style.width = (u * len).toFixed(1) + "px";
        let cur = 0;
        marks.forEach((m, i) => {
          const on = u >= fr[i] - 1e-4;
          if (on) cur = i;
          const hit = ML.pulse(t, at + fr[i] * span, 0.04, 0.25);
          const sz = ms * (1 + 0.35 * (on ? hit : 0));
          m.style.width = m.style.height = sz.toFixed(1) + "px";
          m.style[rtl ? "right" : "left"] = (fr[i] * len - sz / 2).toFixed(1) + "px";
          m.style.top = (-sz / 2).toFixed(1) + "px";
          m.firstChild.style.fill = on ? "var(--x-accent)" : "var(--x-ground)";
          m.firstChild.style.stroke = on ? "var(--x-accent)" : "var(--x-dim)";
        });
        if (lab) {
          lab.textContent = names[cur];
          // near the far end the name moves to the near side of the playhead so it never leaves the frame
          const flip = u > 0.72, near = rtl ? "right" : "left", far = rtl ? "left" : "right";
          lab.style[flip ? near : far] = "auto";
          lab.style[flip ? far : near] = (ms * 0.9).toFixed(1) + "px";
        }
        if (tc) { const s = Math.max(0, t - at), fps = Math.round(ML.clamp(p.fps, 24, 60)); tc.textContent = `${pad(s / 60)}:${pad(s % 60)}:${pad((s * fps) % fps)}`; }
      },
    };
  },
});
