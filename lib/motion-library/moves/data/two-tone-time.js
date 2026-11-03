// Two-tone big time numerals: a huge thin clock time (light weight, tracking −0.06em, line-height .9) with one part in
// ink and the other in the dim tone ("07" ink, ":15" grey), a small sub line under it with a bold ink span counting
// down ("rings in 2h 15m"). Enters with a short rise: y 20 → 0, opacity 0 → 1, 0.8 s easeOutQuart (1 − (1 − x)^4)
// after a 0.1 s delay. Then the time changes to `to`: each digit that differs rolls odometer-style through the digits
// between (a strip sliding −100% per step, 0.3 s power3.inOut, digits 0.05 s apart; a cut when `roll` is off) and the
// countdown steps down by the same minutes. A time that was given (`time`, or the slot already reads as one) only
// changes when `to` says so: with neither, the sample 07:15 demonstrates the roll. A small size with `suffix` is the
// source's card (48 px-class digits, uppercase am / pm). The sub line runs in the slot's flow at the look's body size,
// so it never lands on what follows. Digits stay Latin and LTR in Arabic; the sub line reads in its own direction.
// Source: MengTo/Skills web-design framed-grid-layout demo (MIT; the alarm hero: two-tone 07:15, easeOutQuart entry),
// with the dither-background demo's clock card.
ML.define({
  id: "data.two-tone-time",
  category: "data",
  name: "Two-tone big time numerals",
  does: "A huge thin clock time shows its first part in ink and the rest in grey, settling in with a short rise, its digits rolling on change, a small countdown line under it.",
  says: ["time", "precision", "simplicity"],
  energy: 2,
  targets: ["number"],
  duration: [1, 4],
  params: {
    accent_segment: { type: "choice", options: ["hours", "minutes"], default: "hours" },
    roll: { type: "bool", default: true },
    size: { type: "number", range: [48, 160], default: 96, unit: "px" },
    sub_line: { type: "bool", default: true },
    time: { type: "text", default: "" },
    to: { type: "text", default: "" },
    sub: { type: "text", default: "" },
    countdown: { type: "number", range: [1, 1440], default: 135, unit: "min" },
    suffix: { type: "text", default: "" },
  },
  pairs: ["data.timecode-hud", "text-in.punchline"],
  avoid: ["energy", "urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:framed-grid-layout (demo/index.html alarm hero)", license: "MIT", note: "with MengTo/Skills:dither-background's clock card" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const parse = (s) => { const m = String(s || "").match(/(\d{1,2})\s*:\s*(\d{2})/); return m ? [+m[1] % 24, +m[2] % 60] : null; };
    const own = el ? parse(el.textContent) : null;
    const A = parse(p.time) || own || [7, 15];
    const B0 = parse(p.to);
    const mins = (x) => x[0] * 60 + x[1];
    const given = !!(parse(p.time) || own);
    const span = end - at, rollAt = at + Math.max(1.0, span * 0.5), fits = rollAt + 0.45 < end - 0.25; // no roll cut off by the exit
    const B = !fits ? A : B0 || (given ? A : [Math.floor(((mins(A) + 15) % 1440) / 60), (mins(A) + 15) % 60]); // never a time nobody asked for
    const delta = ((mins(B) - mins(A)) % 1440 + 1440) % 1440;
    const pad = (n) => String(n).padStart(2, "0");
    const sA = pad(A[0]) + pad(A[1]), sB = pad(B[0]) + pad(B[1]);
    // `size` is on a 96 px reference: on a slot that is the slot's own type size (so the layout keeps its height),
    // with no slot it is the stage's short side / 540
    const own0 = el && el !== stage ? parseFloat(getComputedStyle(el).fontSize) : 0;
    const u = own0 ? (own0 * 1.1) / 96 : Math.min(f.W, f.H) / 540;
    const size = ML.clamp(p.size, 48, 160) * u;

    // the host: the slot itself (its text replaced), else a block over the picture region
    let wrap;
    if (el && el !== stage) { el.textContent = ""; wrap = el; }
    else { const R = f.pic; wrap = mk("div", `position:absolute;left:${R.x}px;top:${R.y + R.h / 2}px;width:${R.w}px;translate:0 -50%;text-align:center;z-index:20`, ctx.scene || stage); }
    const box = mk("div", "display:inline-flex;flex-direction:column;align-items:flex-start", wrap);
    const row = mk("div", `display:flex;align-items:baseline;direction:ltr;unicode-bidi:isolate;font:300 ${size.toFixed(1)}px/0.9 var(--x-head-font);letter-spacing:-0.06em;font-variant-numeric:tabular-nums;white-space:nowrap`, box);
    const inkH = p.accent_segment !== "minutes";
    const hSeg = mk("span", `display:inline-flex;color:${inkH ? "var(--x-ink)" : "var(--x-dim)"}`, row);
    const mSeg = mk("span", `display:inline-flex;color:${inkH ? "var(--x-dim)" : "var(--x-ink)"}`, row);
    // one column per digit: a strip of the digits it passes through, clipped to one line
    const cols = [];
    for (let d = 0; d < 4; d++) {
      if (d === 2) mk("span", "line-height:1em", mSeg, ":");
      const a = +sA[d], b = +sB[d];
      const steps = p.roll ? (b - a + 10) % 10 : 0;
      // clipped above and below only: the tight tracking would shave a digit's side under overflow:hidden
      const col = mk("span", "display:inline-block;height:1em;line-height:1em;clip-path:inset(0 -0.2em);vertical-align:baseline", d < 2 ? hSeg : mSeg);
      const strip = mk("span", "display:flex;flex-direction:column", col);
      for (let s = 0; s <= steps; s++) mk("span", "display:block;height:1em", strip, String((a + s) % 10));
      if (!p.roll && a !== b) mk("span", "display:block;height:1em", strip, String(b));
      cols.push({ strip, steps: p.roll ? steps : a !== b ? 1 : 0, at: rollAt + cols.filter((c) => c.steps > 0).length * 0.05 });
    }
    if (p.suffix) mk("sup", `font:var(--x-label-weight) 0.25em var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:${rtl ? "none" : "uppercase"};color:var(--x-dim);margin-inline-start:0.3em;align-self:flex-start`, row, p.suffix);
    let cd = null;
    if (p.sub_line) {
      const sub = mk("div", `margin-top:${(size * 0.12).toFixed(1)}px;font:500 var(--x-body-size) var(--x-body-font);color:var(--x-dim);letter-spacing:${rtl ? 0 : "0.02em"};white-space:nowrap`, box);
      mk("span", "", sub, (p.sub || (rtl ? "المنبّه يرنّ بعد" : "The next alert rings in")) + " ");
      cd = mk("span", "color:var(--x-ink);font-weight:600", sub);
    }
    const fmtCd = (m) => { m = Math.max(0, m); const h = Math.floor(m / 60), mm = m % 60; return rtl ? `${h ? h + " س " : ""}${mm} د` : `${h ? h + "h " : ""}${mm}m`; };
    ML.fit(row, Math.min(ctx.box(wrap).w, f.W - f.m * 2));
    const p3 = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const quart = (x) => 1 - Math.pow(1 - x, 4);
    ctx.sfx(at + 0.1, "pop.soft", 0.25);
    if (delta) ctx.sfx(rollAt, "tap", 0.3);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        const e = quart(ML.lin(t, at + 0.1, at + 0.9));
        box.style.opacity = (t < at - 1e-6 ? 0 : e * (1 - leave)).toFixed(4);
        box.style.transform = `translateY(${((1 - e) * 20 * u).toFixed(2)}px)`;
        for (const c of cols) {
          if (!c.steps) { c.strip.style.transform = "none"; continue; }
          const dur = 0.3 + 0.04 * (c.steps - 1);
          const x = p.roll ? p3(ML.lin(t, c.at, c.at + dur)) : t >= c.at ? 1 : 0;
          c.strip.style.transform = `translateY(${(-x * c.steps * 100 / (c.steps + 1)).toFixed(3)}%)`;
        }
        if (cd) cd.textContent = fmtCd(p.countdown - (t >= rollAt + 0.15 ? delta : 0));
      },
    };
  },
});
