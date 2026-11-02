// Counting timecode HUD: a narrative accent framing the screen. A mono corner label counts a timecode down (or up)
// frame by frame ("LAST LIGHT IN 00:27:04") beside a small pulsing dot (opacity 1 → 0.4 each second); bottom-start
// reads "BAR n / N" over a row of dashes filled one per bar; bottom-end shows the section name, swapping with a 0.2 s
// fade on each section change; thin corner brackets frame the screen. The digits swap instantly (no roll), in a
// "frame" tick (every frame at 30 fps) or a "jump" tick (fast-forwarded: a new value every 0.35 s). On a number slot
// the slot itself reads the timecode; on a label slot its text becomes the corner caption. Sizes are on a 360 px
// reference (mono 10 px) scaled to the stage; everything mirrors in Arabic (caption top-right, bar counter
// bottom-right), the digits stay Latin and LTR.
// Source: prompt-motion samaote-that-is-so-crazy + xelandre-wtf-avec-ce-prompt (reference only: rebuilt as our own code).
ML.define({
  id: "data.timecode-hud",
  category: "data",
  name: "Counting timecode HUD",
  does: "A corner label counts a timecode down frame by frame while a bar counter and section name tick at the bottom.",
  says: ["time", "urgency", "tech"],
  energy: 1,
  targets: ["label", "number"],
  duration: [2, 15],
  params: {
    count: { type: "choice", options: ["down", "up"], default: "down" },
    format: { type: "choice", options: ["mm:ss:ff", "hh:mm:ss", "ss.ff"], default: "mm:ss:ff" },
    bar_counter: { type: "bool", default: true },
    brackets: { type: "bool", default: true },
    start: { type: "number", range: [0, 86400], default: 1624, unit: "s" },
    tick: { type: "choice", options: ["frame", "jump"], default: "frame" },
    speed: { type: "number", range: [1, 600], default: 1 },
    bars: { type: "number", range: [4, 32], default: 13 },
    sections: { type: "text", default: "" },
    caption: { type: "text", default: "" },
    dot: { type: "bool", default: true },
  },
  pairs: ["data.timeline-playhead-markers", "data.two-tone-time"],
  avoid: ["playful", "celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:xelandre-wtf-avec-ce-prompt", license: "reference", note: "with prompt-motion:samaote-that-is-so-crazy; our own rebuild of the technique" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    const host = ctx.scene || stage;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const k = Math.min(f.W, f.H) / 360;
    const fs = 10 * k;
    const gx = Math.round(0.045 * Math.min(f.W, f.H)), gy = f.tall ? Math.round(f.H * 0.075) : gx;
    const soft = "color-mix(in srgb, var(--x-ink) 55%, transparent)";
    const span = Math.max(0.5, end - at);

    // the number slot reads the timecode itself; a label slot lends its text to the corner caption
    const isNum = !!(el && el.childElementCount === 0 && /\d/.test(el.textContent || "") && !(el.classList && el.classList.contains("ml-label")));
    const caption = p.caption || (el && !isNum ? (el.textContent || "").trim() : "") || (rtl ? "آخر ضوء بعد" : "Last light in");
    if (isNum) { el.style.fontVariantNumeric = "tabular-nums"; el.style.direction = "ltr"; el.style.unicodeBidi = "isolate"; }

    const hud = mk("div", `position:absolute;inset:0;pointer-events:none;z-index:25;visibility:hidden;font:var(--x-label-weight) ${fs.toFixed(1)}px/1.2 var(--x-mono-font);color:${soft}`, host);
    hud.dir = rtl ? "rtl" : "ltr";
    // corner brackets
    if (p.brackets) {
      const L = 0.06 * Math.min(f.W, f.H), w = Math.max(1.5, k * 0.6);
      for (const [v, h] of [["top", "left"], ["top", "right"], ["bottom", "left"], ["bottom", "right"]]) {
        mk("i", `position:absolute;${v}:${gy * 0.55}px;${h}:${gx * 0.55}px;width:${L}px;height:${L}px;border-${v}:${w}px solid ${soft};border-${h}:${w}px solid ${soft}`, hud);
      }
    }
    // the timecode caption, top-start
    const top = mk("div", `position:absolute;top:${gy}px;inset-inline-start:${gx}px;display:flex;align-items:center;gap:${(fs * 0.7).toFixed(1)}px;white-space:nowrap;text-transform:var(--x-label-case);letter-spacing:var(--x-label-track)`, hud);
    const dot = p.dot ? mk("i", `width:${(4 * k).toFixed(1)}px;height:${(4 * k).toFixed(1)}px;border-radius:50%;background:var(--x-bad);flex:none`, top) : null;
    mk("span", rtl ? "letter-spacing:0;text-transform:none" : "", top, caption);
    const code = mk("span", "direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums;color:var(--x-ink);letter-spacing:0.04em", top);

    // bar counter, bottom-start
    const N = Math.round(ML.clamp(p.bars, 4, 32));
    let barTxt = null, dashes = [];
    if (p.bar_counter) {
      const bot = mk("div", `position:absolute;bottom:${gy}px;inset-inline-start:${gx}px;display:flex;flex-direction:column;gap:${(fs * 0.5).toFixed(1)}px;white-space:nowrap`, hud);
      const barRow = mk("div", `letter-spacing:${rtl ? 0 : "var(--x-label-track)"}`, bot);
      mk("span", "", barRow, (rtl ? "مقطع" : "BAR") + " ");
      barTxt = mk("span", "direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums", barRow);
      const row = mk("div", `display:flex;gap:${(1.5 * k).toFixed(1)}px`, bot);
      dashes = Array.from({ length: N }, () => mk("i", `width:${(5 * k).toFixed(1)}px;height:${Math.max(2, 0.7 * k).toFixed(1)}px;background:var(--x-ink)`, row));
    }
    // section label, bottom-end
    const names = (p.sections || "").split(/\s*[|,]\s*/).filter(Boolean);
    const secs = names.length ? names : ["01", "02", "03"];
    const sec = mk("div", `position:absolute;bottom:${gy}px;inset-inline-end:${gx}px;white-space:nowrap;letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:${rtl ? "none" : "var(--x-label-case)"}`, hud);

    const pad = (n, w = 2) => String(Math.max(0, Math.floor(n))).padStart(w, "0");
    const fmt = (v) => {
      v = Math.max(0, v);
      const ff = Math.floor((v % 1) * 30);
      if (p.format === "hh:mm:ss") return `${pad(v / 3600)}:${pad((v / 60) % 60)}:${pad(v % 60)}`;
      if (p.format === "ss.ff") return `${pad(v)}.${pad(ff)}`;
      return `${pad(v / 60)}:${pad(v % 60)}:${pad(ff)}`;
    };
    const secLen = span / secs.length, barLen = span / N;
    ctx.sfx(at, "blip", 0.22);
    for (let i = 1; i < secs.length; i++) ctx.sfx(at + i * secLen, "tap", 0.18);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        if (t < at - 1e-6) { hud.style.visibility = "hidden"; if (isNum) el.style.opacity = ""; return; }
        hud.style.visibility = "visible";
        hud.style.opacity = (ML.lin(t, at, at + 0.3) * (1 - leave)).toFixed(4);
        let el2 = Math.max(0, t - at);
        if (p.tick === "jump") el2 = Math.floor(el2 / 0.35) * 0.35;
        const v = p.start + (p.count === "up" ? 1 : -1) * el2 * p.speed;
        const s = fmt(v);
        code.textContent = s;
        if (isNum) el.textContent = s;
        if (dot) dot.style.opacity = (0.7 + 0.3 * Math.cos(2 * Math.PI * (t - at))).toFixed(4);
        if (barTxt) {
          const n = Math.min(N, Math.floor((t - at) / barLen) + 1);
          barTxt.textContent = `${pad(n)} / ${pad(N)}`;
          dashes.forEach((d, i) => { d.style.opacity = i < n ? "0.85" : "0.2"; });
        }
        const si = Math.min(secs.length - 1, Math.floor((t - at) / secLen));
        sec.textContent = secs[si];
        const c0 = at + si * secLen, c1 = at + (si + 1) * secLen;
        const fo = si < secs.length - 1 ? ML.lin(t, c1 - 0.1, c1) : 0;
        sec.style.opacity = ((si === 0 ? 1 : ML.lin(t, c0, c0 + 0.1)) * (1 - fo)).toFixed(4);
      },
    };
  },
});
