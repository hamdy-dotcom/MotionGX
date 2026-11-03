// Ball lands as the full stop: a glossy ball (radial highlight at 30 % / 30 %, soft shadow; sized cap height × 0.35, so its gloss and squash read on screen)
// drops from above (or rises from below the baseline) onto the full-stop slot after the last letter — 0.08 em past
// the line's end, on the baseline (the left end of the last line in Arabic) — falling on power2.in in 0.3 s, then
// bouncing 2 decaying times (18 px then 6 px of a 104 px headline, 0.18 s then 0.12 s), squashing 1.2 × 0.8 on each
// contact, its ground shadow tracking its height. It ends exactly where the period would sit, and stays there to the
// move's end: the sentence keeps its full stop. A trailing full stop in
// the text gives its place to the ball. The object can be a flat dot or the logo mark
// (the target's or the scene's logo, its lettering left out; the look's accent tile when there is none).
// Source: prompt-motion "melvynx-this-is-insane-with" (reference only — rebuilt as our own code).
ML.define({
  id: "element.ball-becomes-period",
  category: "element",
  name: "Ball lands as the full stop",
  does: "A glossy ball drops in and bounces into the period slot at the end of a word.",
  says: ["playful", "result", "brand", "arrival"],
  energy: 3,
  targets: ["headline", "word", "shape", "logo"],
  duration: [0.6, 1.4],
  params: {
    object: { type: "choice", options: ["ball", "dot", "logo-mark"], default: "ball" },
    bounces: { type: "number", range: [1, 3], default: 2 },
    drop: { type: "number", range: [60, 200], default: 120, unit: "px" },
    from: { type: "choice", options: ["above", "below"], default: "above" },
    on: { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "text-emphasis.accent-word"],
  avoid: ["luxury", "problem"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "land.light",
  source: { from: "prompt-motion:melvynx-this-is-insane-with", license: "reference", note: "technique rebuilt as our own code: gravity drop, decaying bounces with squash, shadow tracking height, ends in the period slot" },
  setup(ctx) {
    const { p, at, end, f, rtl, el } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = el && el !== ctx.stage ? el : null;
    const textual = own && !/^(svg|img|canvas)$/i.test(own.tagName) && (own.textContent || "").trim().length > 0;
    // the period slot: a zero-size inline-block at the end of the text sits with its top on the baseline
    let slot = null, fs = Math.min(f.W, f.H) * 0.1, X, Y;
    if (textual) {
      // a full stop already there gives its place to the ball
      const walker = doc.createTreeWalker(own, NodeFilter.SHOW_TEXT);
      let last = null; while (walker.nextNode()) if (walker.currentNode.textContent.trim()) last = walker.currentNode;
      if (last) last.textContent = last.textContent.replace(/[.。۔]\s*$/, "");
      fs = parseFloat(getComputedStyle(last ? last.parentElement : own).fontSize) || fs;
      slot = doc.createElement("span");
      slot.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline;";
      (last ? last.parentElement : own).append(slot);
      const b = ctx.box(slot);
      X = b.x + (rtl ? -1 : 1) * fs * 0.08; Y = b.y;
    } else {
      const b = own ? ctx.box(own) : { x: f.pic.x + f.pic.w * 0.3, y: f.pic.y + f.pic.h * 0.4, w: f.pic.w * 0.4, h: f.pic.h * 0.2 };
      fs = Math.max(40, b.h * 0.8); X = rtl ? b.x - fs * 0.08 : b.x + b.w + fs * 0.08; Y = b.y + b.h * 0.85;
    }
    const cap = fs * 0.7, d = Math.max(10, cap * 0.35), r = d / 2;
    const cx = X + (rtl ? -r : r), k = fs / 104;
    const layer = mk("div", `position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;z-index:7;`, host);
    const shadow = mk("div", `position:absolute;left:${cx - r * 1.1}px;top:${Y - r * 0.18}px;width:${r * 2.2}px;height:${r * 0.36}px;border-radius:50%;background:radial-gradient(closest-side, color-mix(in srgb, var(--x-ink) 35%, transparent), transparent);will-change:transform;`, layer);
    const look = p.object === "dot" ? "background:var(--x-ink);border-radius:50%;"
      : p.object === "logo-mark" ? "background:linear-gradient(140deg, var(--x-accent), var(--x-accent-2));border-radius:28%;"
      : "background:radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--x-panel) 85%, var(--x-accent)) 0%, var(--x-accent) 38%, color-mix(in srgb, var(--x-accent) 65%, var(--x-ink)) 100%);border-radius:50%;box-shadow:0 ${r * 0.25}px ${r * 0.6}px -${r * 0.2}px color-mix(in srgb, var(--x-ink) 35%, transparent);";
    // laid out at its widest (1.25×), every pose a scale down from there: the squash really widens, and stays sharp
    const K = 1.25, D = d * K;
    const markOf = p.object === "logo-mark" ? (own && /^(svg|img)$/i.test(own.tagName) ? own : host.querySelector('[data-slot="logo"]')) : null;
    const ball = mk("div", `position:absolute;left:${cx - D / 2}px;top:${Y - D}px;width:${D}px;height:${D}px;${markOf ? "" : look}transform-origin:50% 100%;will-change:transform;`, layer);
    if (markOf) {
      const m = markOf.cloneNode(true); m.removeAttribute("data-slot"); m.removeAttribute("width"); m.removeAttribute("height"); m.style.cssText = "width:100%;height:100%;display:block;object-fit:contain;overflow:visible;"; ball.append(m);
      if (m.tagName.toLowerCase() === "svg") { m.querySelectorAll("text").forEach((x) => x.remove()); try { const b = m.getBBox(); if (b.width > 0 && b.height > 0) { const s = Math.max(b.width, b.height); m.setAttribute("viewBox", `${b.x + b.width / 2 - s / 2} ${b.y + b.height / 2 - s / 2} ${s} ${s}`); } } catch (e) { /* not laid out: keep its viewBox */ } }
    }

    // the path: one fall, then n decaying bounces (closed form: a parabola each)
    const n = Math.round(ML.clamp(p.bounces, 1, 3));
    const t0 = p.on ? Math.max(at, ctx.word(p.on, at)) : at;
    const drop = ML.clamp(p.drop, 60, 200) * k, below = p.from === "below";
    const segs = [];
    let tt = t0 + 0.3; const fallEnd = tt;
    const hs = [18, 6, 2.5], ds = [0.18, 0.12, 0.08];
    for (let i = 0; i < n; i++) { segs.push({ a: tt, b: tt + ds[i], h: hs[i] * k * (drop / (120 * k)) }); tt += ds[i]; }
    const rest = tt;
    const contacts = [fallEnd, ...segs.map((s) => s.b)];
    contacts.forEach((c, i) => ctx.sfx(c, i === 0 ? "land.light" : "tap", i === 0 ? 0.45 : 0.18 / i));

    return {
      draw(t) {
        const leave = ML.clamp((t - Math.max(end, rest)) / 0.15);
        const on = t >= t0;
        layer.style.visibility = on ? "visible" : "hidden";
        layer.style.opacity = (1 - leave).toFixed(4);
        // height above the baseline (negative: below it, when rising from below)
        let h = 0;
        if (t < fallEnd) { const u = ML.lin(t, t0, fallEnd); h = below ? -drop * (1 - u) * (1 - u) * 0.66 : drop * (1 - u * u); }
        else for (const s of segs) if (t >= s.a && t < s.b) { const u = (t - s.a) / (s.b - s.a); h = 4 * s.h * u * (1 - u); }
        // squash on each contact (a quick 0.07 s pulse), stretch while falling fast
        let sq = 0; for (const c of contacts) { const x = (t - c) / 0.07; if (x >= 0 && x < 1) sq = Math.max(sq, Math.sin(Math.PI * x) * (c === fallEnd ? 1 : 0.6)); }
        const falling = t < fallEnd && !below ? ML.lin(t, t0 + 0.1, fallEnd) : 0;
        const sx = 1 + 0.2 * sq - 0.08 * falling, sy = 1 - 0.2 * sq + 0.12 * falling;
        ball.style.transform = `translateY(${(-h).toFixed(2)}px) scale(${(sx / K).toFixed(4)}, ${(sy / K).toFixed(4)})`;
        ball.style.opacity = below ? ML.lin(t, t0, t0 + 0.12).toFixed(4) : ML.lin(t, t0, t0 + 0.06).toFixed(4);
        const hh = Math.max(0, h), sh = 1 - Math.min(1, hh / (drop || 1));
        shadow.style.opacity = (0.25 + 0.75 * sh).toFixed(4);
        shadow.style.transform = `scale(${(0.45 + 0.55 * sh).toFixed(4)})`;
      },
    };
  },
});
