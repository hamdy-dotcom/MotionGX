// Incoming-call card: a square call card focuses in (blur 10 → 0, scale 1.1 → 1, opacity, 0.6 s) with a phone icon in
// a circle and two concentric pulse rings (scale 1 → 1.6, opacity 0.5 → 0, a 1.2 s loop, offset 0.4 s), the number
// large at 600 weight, "Incoming call…" in the dim ink, red decline / green accept round buttons. After ~1.5 s the
// call resolves: missed — the rings stop, the icon circle crossfades to pink with a red crossed phone (0.3 s), the
// status swaps to red "Missed call · 11:47 PM" and the buttons fade to 30 %; answered — the circle turns green and a
// call timer starts. Then (relocate) the card travels to the side column, scale 0.85, 0.7 s power3.inOut, to make
// room for the headline. Every frame is a function of t (the ring loop is a modulo of t).
// Source: prompt-motion fractadev "wow made with claude" (reference only — our own code).
ML.define({
  id: "ui.incoming-call-card",
  category: "ui",
  name: "Incoming-call card rings, then becomes 'Missed call'",
  does: "A phone-call card focuses in with pulsing rings around the phone icon; the call goes unanswered (the icon turns red, the status reads 'Missed call · 11:47 PM') or is answered (a call timer starts).",
  says: ["problem", "urgency", "time"],
  energy: 3,
  targets: ["card", "screen"],
  duration: [2, 4],
  params: {
    outcome: { type: "choice", options: ["missed", "answered"], default: "missed" },
    relocate: { type: "bool", default: true },
    caller: { type: "text" },
    time: { type: "text", default: "11:47 PM" },
    ring_for: { type: "number", range: [0.8, 3], default: 1.5, unit: "s" },
  },
  pairs: ["text-in.punchline", "ui.notification-stack"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "bell",
  source: { from: "prompt-motion:fractadev-wow-made-with-claude", license: "reference", note: "our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, html) => { const e = doc.createElement(tag); e.style.cssText = css; if (html != null) e.innerHTML = html; parent.append(e); return e; };
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    let host, R;
    if (el && el.clientWidth > 300 && el.clientHeight > 300) { if (getComputedStyle(el).position === "static") el.style.position = "relative"; host = el; R = { x: 0, y: 0, w: el.clientWidth, h: el.clientHeight }; }
    else { host = ctx.scene || ctx.stage; R = f.pic; }

    // the card: square, white panel, radius, shadow
    const cw = Math.min(R.w * 0.62, R.h * 0.8, 560 * k * (f.wide ? 1.15 : 1));
    const u = cw / 220; // the source card is 220 px: everything scales from it
    const card = mk("div", `position:absolute;left:${(R.x + (R.w - cw) / 2).toFixed(1)}px;top:${(R.y + Math.max(0, (R.h - cw) * 0.3)).toFixed(1)}px;width:${cw.toFixed(1)}px;height:${cw.toFixed(1)}px;box-sizing:border-box;padding:${(16 * u).toFixed(1)}px;border-radius:calc(var(--x-radius) * 0.55);background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);display:flex;flex-direction:column;align-items:center;justify-content:space-between;z-index:6;pointer-events:none;`, host);
    card.dir = rtl ? "rtl" : "ltr";
    const PHONE = "M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z";
    const ic = 58 * u;
    const iconWrap = mk("div", `position:relative;width:${ic.toFixed(1)}px;height:${ic.toFixed(1)}px;margin-top:${(4 * u).toFixed(1)}px;flex:none;`, card);
    // pulse rings, built at their largest (1.6×) so they only scale down
    const rings = [0, 1].map(() => mk("div", `position:absolute;left:50%;top:50%;width:${(ic * 1.6).toFixed(1)}px;height:${(ic * 1.6).toFixed(1)}px;margin:${(-ic * 0.8).toFixed(1)}px 0 0 ${(-ic * 0.8).toFixed(1)}px;border-radius:50%;background:color-mix(in srgb, var(--x-good) 45%, transparent);`, iconWrap));
    const circA = mk("div", `position:absolute;inset:0;border-radius:50%;background:var(--x-good);color:var(--x-accent-ink);display:grid;place-items:center;`, iconWrap, `<svg viewBox="0 0 24 24" width="48%" height="48%"><path d="${PHONE}" fill="currentColor"/></svg>`);
    const circB = mk("div", `position:absolute;inset:0;border-radius:50%;background:color-mix(in srgb, var(--x-bad) 16%, var(--x-panel));display:grid;place-items:center;`, iconWrap,
      `<svg viewBox="0 0 24 24" width="48%" height="48%"><path d="${PHONE}" fill="var(--x-bad)"/><path d="M3.5 3.5l17 17" stroke="var(--x-panel)" stroke-width="4" stroke-linecap="round"/><path d="M3.5 3.5l17 17" stroke="var(--x-bad)" stroke-width="2" stroke-linecap="round"/></svg>`);
    const answered = p.outcome === "answered";
    if (answered) circB.innerHTML = `<svg viewBox="0 0 24 24" width="48%" height="48%"><path d="${PHONE}" fill="var(--x-good)"/></svg>`, (circB.style.background = "color-mix(in srgb, var(--x-good) 16%, var(--x-panel))");

    const mid = mk("div", `display:flex;flex-direction:column;align-items:center;gap:${(4 * u).toFixed(1)}px;text-align:center;`, card);
    const caller = p.caller || (rtl ? "+20 100 555 0142" : "+1 (415) 555-0142");
    const num = mk("div", `font:600 ${(17 * u).toFixed(1)}px/1.15 var(--x-head-font);color:var(--x-ink);white-space:nowrap;direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums;`, mid);
    num.textContent = caller;
    if (ML.ARABIC.test(caller)) num.style.direction = "rtl"; // a caller's name in Arabic reads from its own side
    ML.fit(num, cw - 32 * u); // a long name or number never leaves the card
    const statusBox = mk("div", `display:grid;font:400 ${(10.5 * u).toFixed(1)}px/1.3 var(--x-body-font);white-space:nowrap;`, mid);
    const st1 = mk("div", "grid-area:1/1;color:var(--x-dim);", statusBox);
    st1.textContent = rtl ? "مكالمة واردة…" : "Incoming call…";
    const st2 = mk("div", `grid-area:1/1;color:${answered ? "var(--x-good)" : "var(--x-bad)"};font-weight:600;`, statusBox);
    const when = rtl && (p.time === "11:47 PM" || !p.time) ? "11:47 م" : String(p.time || "11:47 PM");
    const bdi = (x) => { const b = doc.createElement("bdi"); b.dir = "ltr"; b.textContent = x; return b; };
    if (!answered) st2.append(rtl ? "مكالمة فائتة · " : "Missed call · ", bdi(when));
    else st2.style.willChange = "transform"; // its timer text changes each second: on its own layer (same t, same pixels)

    const btns = mk("div", `display:flex;gap:${(34 * u).toFixed(1)}px;margin-bottom:${(4 * u).toFixed(1)}px;`, card);
    const bD = 34 * u;
    const btnCss = (c) => `width:${bD.toFixed(1)}px;height:${bD.toFixed(1)}px;border-radius:50%;background:${c};color:var(--x-accent-ink);display:grid;place-items:center;`;
    const decline = mk("div", btnCss("var(--x-bad)"), btns, `<svg viewBox="0 0 24 24" width="50%" height="50%" style="rotate:135deg"><path d="${PHONE}" fill="currentColor"/></svg>`);
    const accept = mk("div", btnCss("var(--x-good)"), btns, `<svg viewBox="0 0 24 24" width="50%" height="50%"><path d="${PHONE}" fill="currentColor"/></svg>`);

    // timing
    const T = Math.min(at + 0.6 + p.ring_for, Math.max(at + 0.9, end - 1.2)); // the call resolves
    const M = T + 0.25; // the card makes room
    ctx.sfx(at + 0.05, "bell", 0.3);
    if (T - at > 1.4) ctx.sfx(at + 1.25, "bell", 0.22);
    ctx.sfx(T, answered ? "click.confirm" : "tap", 0.35);
    if (p.relocate) ctx.sfx(M, "whoosh.soft", 0.2);
    const pIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    // where it moves: the side away from the reading start, staying inside the region
    const shift = (R.w - cw * 0.85) / 2 - 8 * k;
    const dirX = rtl ? -1 : 1;
    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.25, end);
        const e = ML.out(t, at, at + 0.6);
        card.style.opacity = (ML.lin(t, at, at + 0.4) * (1 - leave)).toFixed(4);
        const bl = (1 - e) * 10 * k + leave * 8 * k;
        card.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : "none";
        const mv = p.relocate ? pIO(ML.lin(t, M, M + 0.7)) : 0;
        card.style.scale = ((1.1 - 0.1 * e) * (1 - 0.15 * mv)).toFixed(4);
        card.style.translate = `${(dirX * shift * mv).toFixed(2)}px 0px`;
        // rings: a 1.2 s loop, the second 0.4 s behind; they stop when the call resolves
        const stop = 1 - ML.lin(t, T, T + 0.2);
        rings.forEach((r, i) => {
          const s0 = t - at - 0.3 - i * 0.4;
          if (s0 < 0) { r.style.opacity = "0"; return; }
          const ph = (s0 % 1.2) / 1.2;
          r.style.scale = ((1 + 0.6 * ph) / 1.6).toFixed(4);
          r.style.opacity = (0.5 * (1 - ph) * stop).toFixed(4);
        });
        const x = ML.lin(t, T, T + 0.3);
        circB.style.opacity = x.toFixed(4);
        circA.style.opacity = (1 - x).toFixed(4);
        st1.style.opacity = (1 - x).toFixed(4);
        st2.style.opacity = x.toFixed(4);
        if (answered) {
          const secs = Math.max(0, Math.floor(t - T));
          st2.textContent = (rtl ? "متصل · " : "Connected · ") + `0:${String(secs).padStart(2, "0")}`;
          accept.style.opacity = (1 - 0.7 * x).toFixed(4);
          decline.style.opacity = "1";
        } else {
          accept.style.opacity = decline.style.opacity = (1 - 0.7 * x).toFixed(4);
        }
      },
    };
  },
});
