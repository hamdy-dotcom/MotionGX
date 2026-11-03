// Dotted progress bar with a rolling percent: a long bar of dot columns (2 rows, up to ~70 columns) fills in the
// accent from the reading-start side while a large serif percentage rolls up beside it. Unfilled dots are a pale tint
// of the accent; the leading 3 columns burn brighter with a glow. Progress follows a believable uneven curve (fast to
// 13%, a stall, a jump 43 → 83, slow near 100) as power2.inOut keyframe segments, or a straight line. The counter's
// digits roll vertically per slot (each slot turns over in the last 20% of its lower slot's step), or tween as plain
// text. A small tracked kicker sits above (an optional serif title with it). On completion a good-coloured dot pops at
// the bar end (scale 0 → 1, back.out(3)). Styles: dots, a solid track, or segments.
// On a number slot the slot becomes the bar, keeping its height so the scene around it never moves; with no target it
// is built in the picture region.
// Source: prompt-motion "manuelogomigo-i-gave-claude-opus" (reference only: rebuilt as our own code).
ML.define({
  id: "data.dot-progress-bar",
  category: "data",
  name: "Dotted progress bar with rolling percent",
  does: "A long bar of dots fills in the accent at an uneven pace while a large serif percentage rolls up beside it.",
  says: ["time", "step", "result", "speed"],
  energy: 2,
  targets: ["number", "chart", "screen"],
  duration: [1.5, 4],
  params: {
    style: { type: "choice", options: ["dots", "solid", "segments"], default: "dots" },
    counter: { type: "choice", options: ["roll", "tween"], default: "roll" },
    curve: { type: "choice", options: ["uneven", "linear"], default: "uneven" },
    duration: { type: "number", range: [1.2, 4], default: 2, unit: "s" },
    done_dot: { type: "bool", default: true },
    kicker: { type: "text", default: "" },
    title: { type: "text", default: "" },
  },
  pairs: ["data.odometer", "ui.type-into-field"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "success",
  source: { from: "prompt-motion:manuelogomigo-i-gave-claude-opus", license: "reference", note: "our own rebuild: keyframed progress curve, per-slot digit roll" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const u = Math.min(f.W, f.H) / 1080;

    // the host: the slot itself, else a block in the picture region
    let wrapHost, ww, centred = false;
    if (el) {
      const h0 = el.offsetHeight;
      el.textContent = "";
      Object.assign(el.style, { display: "block", position: "relative" });
      if (h0 >= 60 * u) { el.style.height = h0 + "px"; centred = true; }
      wrapHost = el;
      ww = el.clientWidth || f.pic.w * 0.8;
    } else {
      ww = Math.min(f.pic.w * 0.86, 1100 * u);
      wrapHost = mk("div", `position:absolute;left:${f.pic.x + (f.pic.w - ww) / 2}px;top:${f.pic.y + f.pic.h / 2}px;translate:0 -50%;width:${ww}px;z-index:20;will-change:transform`, ctx.scene || stage);
    }
    const wrap = mk("div", `display:flex;flex-direction:column;gap:${14 * u}px;direction:${rtl ? "rtl" : "ltr"};text-align:start${centred ? ";position:absolute;left:0;right:0;top:50%" : ""}`, wrapHost);
    const kick = mk("div", `font:var(--x-label-weight) ${(f.tall ? 28 : 22) * u}px/1.2 var(--x-label-font);letter-spacing:var(--x-label-track);text-transform:var(--x-label-case);color:var(--x-accent)`, wrap, p.kicker || (rtl ? "جاري الرفع" : "UPLOADING"));
    if (rtl) kick.style.letterSpacing = "0";
    let title = null;
    if (p.title) title = mk("div", `font:400 ${Math.min(64 * u, ww * 0.07)}px/1.15 var(--x-serif-font);color:var(--x-ink)`, wrap, p.title);
    const row = mk("div", `display:flex;align-items:center;gap:${18 * u}px`, wrap);
    const bar = mk("div", `flex:1;min-width:0;position:relative`, row);
    const done = mk("div", `flex:none;width:${20 * u}px;height:${20 * u}px;border-radius:50%;background:var(--x-good);scale:0`, row);
    if (!p.done_dot) done.style.display = "none";
    const cs = ML.clamp(ww * 0.13, 56 * u, 140 * u);
    const counter = mk("div", `flex:none;display:flex;align-items:baseline;justify-content:flex-end;direction:ltr;font:400 ${cs}px/1 var(--x-serif-font);color:var(--x-ink);font-variant-numeric:tabular-nums lining-nums;min-width:2.75em`, row); // room for "100%" from the start: the bar never shifts
    const slots = [];
    let tweenText = null;
    if (p.counter === "roll") {
      for (let i = 2; i >= 0; i--) {
        const mask = mk("span", `display:inline-block;height:1.2em;overflow:hidden;position:relative;text-align:center`, counter); // taller than the type: descending figures are not cut
        const strip = mk("span", "display:block", mask);
        for (let d = 0; d <= 10; d++) mk("span", "display:block;height:1.2em;line-height:1.2", strip, String(d % 10));
        slots.push({ i, mask, strip });
      }
    } else tweenText = mk("span", "", counter, "0");
    mk("span", `color:var(--x-accent);font-size:0.62em;margin-inline-start:${4 * u}px`, counter, "%");

    // a slot keeps its height: the counter shrinks to fit it, and the kicker gives way if a title needs the room
    if (centred) {
      const room = () => el.offsetHeight + 16 * u - (wrap.offsetHeight - counter.offsetHeight);
      if (room() / 1.2 < 56 * u) kick.style.display = "none";
      counter.style.fontSize = Math.max(40 * u, Math.min(cs, room() / 1.2)).toFixed(1) + "px";
    }

    // the bar: measured after layout so the columns fill it exactly
    const barW = ctx.box(bar).w || ww * 0.6;
    const cells = [];
    let fillEl = null;
    const tint = "color-mix(in srgb, var(--x-accent) 16%, var(--x-panel))";
    let cols = 0;
    if (p.style === "dots") {
      cols = Math.round(ML.clamp(barW / (14 * u), 24, 70));
      const colW = barW / cols, d = colW * 0.62;
      const grid = mk("div", `display:grid;grid-template-columns:repeat(${cols}, ${colW.toFixed(3)}px);row-gap:${(colW * 0.38).toFixed(2)}px;justify-items:center`, bar);
      for (let r = 0; r < 2; r++) for (let c = 0; c < cols; c++) cells.push({ c, e: mk("i", `display:block;width:${d.toFixed(2)}px;height:${d.toFixed(2)}px;border-radius:50%;background:${tint}`, grid) });
    } else if (p.style === "segments") {
      cols = 20;
      const grid = mk("div", `display:grid;grid-template-columns:repeat(${cols}, 1fr);gap:${6 * u}px;height:${18 * u}px`, bar);
      for (let c = 0; c < cols; c++) {
        const s = mk("i", `display:block;position:relative;border-radius:${4 * u}px;background:${tint};overflow:hidden`, grid);
        cells.push({ c, e: s, fill: mk("b", `position:absolute;inset-block:0;inset-inline-start:0;width:0;background:var(--x-accent)`, s) });
      }
    } else {
      const track = mk("div", `position:relative;height:${16 * u}px;border-radius:var(--x-radius-s);background:${tint};overflow:hidden`, bar);
      fillEl = mk("div", `position:absolute;inset-block:0;inset-inline-start:0;width:0;border-radius:var(--x-radius-s);background:var(--x-accent);box-shadow:0 0 ${10 * u}px var(--x-accent)`, track);
    }

    // the progress curve
    const dur = Math.max(0.8, Math.min(p.duration, end - at - 0.9));
    const t0 = at + 0.25, t1 = t0 + dur;
    const KEYS = [[0, 0], [0.18, 0.13], [0.42, 0.16], [0.58, 0.43], [0.72, 0.83], [0.9, 0.95], [1, 1]];
    const io2 = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    const prog = (t) => {
      const x = ML.lin(t, t0, t1);
      if (p.curve === "linear") return x;
      for (let i = 1; i < KEYS.length; i++) if (x <= KEYS[i][0]) { const [a, va] = KEYS[i - 1], [b, vb] = KEYS[i]; return va + (vb - va) * io2((x - a) / (b - a)); }
      return 1;
    };
    ctx.sfx(t0, "tap", 0.25);
    if (p.curve !== "linear") ctx.sfx(t0 + dur * 0.58, "blip", 0.25);
    ctx.sfx(t1, "success", 0.4);
    const backOut = (x, c = 3) => { const y = ML.clamp(x) - 1; return 1 + (c + 1) * y * y * y + c * y * y; };

    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        const enter = ML.out(t, at, at + 0.35);
        wrap.style.opacity = (enter * (1 - leave)).toFixed(4);
        wrap.style.translate = `0 calc(${centred ? "-50%" : "0px"} + ${((1 - enter) * 14 * u).toFixed(2)}px)`;
        const pr = prog(t), v = pr * 100;
        if (p.style === "dots") {
          const pc = pr * cols, full = Math.floor(pc + 1e-6);
          for (const { c, e } of cells) {
            const on = c < full, lead = on && c >= full - 3 && pr < 1;
            e.style.background = on ? (lead ? "color-mix(in srgb, var(--x-accent) 70%, var(--x-accent-ink))" : "var(--x-accent)") : tint;
            e.style.boxShadow = lead ? `0 0 ${(8 * u).toFixed(1)}px var(--x-accent)` : "none";
          }
        } else if (p.style === "segments") {
          for (const { c, fill } of cells) fill.style.width = (ML.clamp(pr * cols - c) * 100).toFixed(2) + "%";
        } else fillEl.style.width = (pr * 100).toFixed(3) + "%";
        if (tweenText) tweenText.textContent = String(Math.round(v));
        for (const s of slots) {
          const q = Math.pow(10, s.i), base = Math.floor(v / q + 1e-9) % 10, lower = v - Math.floor(v / q + 1e-9) * q;
          let pos = base + ML.clamp((lower - (q - 0.2)) / 0.2);
          if (s.i === 2) pos = v >= 99.8 ? ML.clamp((v - 99.8) / 0.2) : 0;
          s.strip.style.transform = `translateY(${(-pos * 1.2).toFixed(4)}em)`;
          const shown = s.i === 0 || v >= q - 0.2;
          s.mask.style.width = shown ? "0.62em" : "0";
        }
        done.style.scale = p.done_dot ? backOut((t - t1) / 0.35).toFixed(4) : "0";
      },
    };
  },
});
