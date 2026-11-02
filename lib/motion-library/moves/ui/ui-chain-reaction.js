// UI components set each other off in a chain: one tall world (a dark ground with a 24 px dot grid at 6 %) and a
// camera that pans down after the ball (its y followed with a 0.12 lerp a frame, recomputed from the start each frame
// so it stays a function of t). Beat 1: a pointer clicks a toggle — the track fills in the accent and its knob pops out
// as a white ball (scale 1.1 in flight). Beat 2: the ball lands on a slider and rolls along it pushing the thumb; the
// fill grows, the value bubble counts 10 → 100 and the ticks light in turn. Beat 3: the ball hops off the end and
// falls onto an iOS-style notification stack ("Slider · Reached 100"); each landing knocks the top card down and away
// (it blurs and slides) as the next drops in, the last with a "Reply" chip. Beat 4: a keyboard rises from below and the
// ball lands on its keys. Every contact squashes the ball and shakes what it hits by 2–3 px.
// Source: prompt-motion rossaxbt-94583b (reference only: rebuilt as our own code).
ML.define({
  id: "ui.ui-chain-reaction",
  category: "ui",
  name: "UI components set each other off in a chain",
  does: "A toggle's knob pops out as a ball, rolls onto a slider and pushes it to 100, then drops onto a notification stack, knocking cards down onto a keyboard as the camera follows down.",
  says: ["connection", "flow", "playful", "tech"],
  energy: 4,
  targets: ["screen", "stage"],
  duration: [5, 12],
  params: {
    theme: { type: "choice", options: ["dark", "light"], default: "dark" },
    cursor: { type: "bool", default: true },
    follow: { type: "number", range: [0.06, 0.25], default: 0.12 },
  },
  pairs: ["ui.toggle-switch", "camera.follow-pan", "rhythm.hit-cut"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "prompt-motion:rossaxbt-94583b", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    let host, VW, VH;
    if (el && el.clientWidth > 500 && el.clientHeight > 500) { if (getComputedStyle(el).position === "static") el.style.position = "relative"; host = el; VW = el.clientWidth; VH = el.clientHeight; }
    else { host = ctx.scene || ctx.stage; VW = f.W; VH = f.H; }
    const k = Math.min(VW, VH) / 1080;
    const dark = p.theme !== "light";
    const C = dark
      ? { ground: "color-mix(in srgb, var(--x-ink) 96%, var(--x-accent))", grid: "color-mix(in srgb, var(--x-panel) 6%, transparent)", surf: "color-mix(in srgb, var(--x-panel) 9%, var(--x-ink))", surf2: "color-mix(in srgb, var(--x-panel) 16%, var(--x-ink))", ink: "var(--x-panel)", dim: "color-mix(in srgb, var(--x-panel) 55%, transparent)", line: "color-mix(in srgb, var(--x-panel) 14%, transparent)" }
      : { ground: "var(--x-ground)", grid: "color-mix(in srgb, var(--x-ink) 8%, transparent)", surf: "var(--x-panel)", surf2: "var(--x-panel-2)", ink: "var(--x-ink)", dim: "var(--x-dim)", line: "var(--x-line)" };

    // ── the world (laid out left to right; mirrored for RTL) ──
    const cx = VW / 2, CW = Math.min(VW * 0.8, 760 * k), L = cx - CW / 2;
    const mx = (x) => (rtl ? 2 * cx - x : x);
    const r = 42 * k; // the ball = the toggle's knob
    const Y_T = VH * 0.42, Y_S = Y_T + 420 * k, Y_N = Y_S + 470 * k, NH = 150 * k, Y_K = Y_N + 600 * k, KH = 330 * k;
    const viewport = mk("div", `position:absolute;left:0;top:0;width:${VW}px;height:${VH}px;overflow:hidden;z-index:6;pointer-events:none;background:${C.ground};`, host);
    const world = mk("div", `position:absolute;left:0;top:0;width:${VW}px;height:${(Y_K + KH + VH).toFixed(0)}px;background-image:radial-gradient(circle, ${C.grid} ${(1.6 * k).toFixed(2)}px, transparent ${(2.2 * k).toFixed(2)}px);background-size:${(24 * k).toFixed(1)}px ${(24 * k).toFixed(1)}px;font-family:var(--x-body-font);color:${C.ink};`, viewport);
    world.dir = rtl ? "rtl" : "ltr";
    const place = (e, x, y, w, h) => { e.style.left = (Math.min(mx(x), mx(x + w))).toFixed(1) + "px"; e.style.top = y.toFixed(1) + "px"; e.style.width = w.toFixed(1) + "px"; e.style.height = h.toFixed(1) + "px"; };

    // beat 1: the toggle (the ball is its knob)
    const TW = 190 * k, TH = 2 * r + 16 * k, TX = cx - TW / 2;
    const track = mk("div", `position:absolute;border-radius:var(--x-radius-s);background:${C.surf2};box-shadow:inset 0 ${(2 * k).toFixed(1)}px ${(5 * k).toFixed(1)}px color-mix(in srgb, var(--x-device) 35%, transparent);`, world);
    place(track, TX, Y_T - TH / 2, TW, TH);
    const knobOff = TX + 8 * k + r, knobOn = TX + TW - 8 * k - r;
    const tLabel = mk("div", `position:absolute;font:600 ${(30 * k).toFixed(1)}px var(--x-body-font);color:${C.dim};text-align:center;white-space:nowrap;`, world, rtl ? "التشغيل التلقائي" : "Auto-run");
    place(tLabel, cx - 200 * k, Y_T - TH / 2 - 60 * k, 400 * k, 40 * k);

    // beat 2: the slider (ends short of the right so the ball can drop past it)
    const SX0 = L, SX1 = cx + CW * 0.25, SW = SX1 - SX0, STH = 14 * k, tR = 26 * k;
    const sTrack = mk("div", `position:absolute;border-radius:var(--x-radius-s);background:${C.surf2};`, world);
    place(sTrack, SX0, Y_S - STH / 2, SW, STH);
    const sFill = mk("div", `position:absolute;top:0;${rtl ? "right" : "left"}:0;height:100%;border-radius:var(--x-radius-s);background:var(--x-accent);`, sTrack);
    const thumb = mk("div", `position:absolute;width:${(tR * 2).toFixed(1)}px;height:${(tR * 2).toFixed(1)}px;border-radius:50%;background:${C.ink};box-shadow:0 0 0 ${(5 * k).toFixed(1)}px var(--x-accent);`, world);
    const ticks = Array.from({ length: 11 }, (_, i) => { const e = mk("div", `position:absolute;border-radius:min(var(--x-radius), 2px);background:${C.line};`, world); place(e, SX0 + (SW * i) / 10 - 1.5 * k, Y_S + 34 * k, 3 * k, (i % 5 === 0 ? 22 : 14) * k); return e; });
    const bubble = mk("div", `position:absolute;height:${(54 * k).toFixed(1)}px;width:${(116 * k).toFixed(1)}px;border-radius:min(var(--x-radius), ${(14 * k).toFixed(1)}px);background:var(--x-accent);color:var(--x-accent-ink);font:700 ${(30 * k).toFixed(1)}px var(--x-mono-font);display:flex;align-items:center;justify-content:center;font-variant-numeric:tabular-nums;`, world, "10");
    const thumbX = (u) => SX0 + SW * (0.1 + 0.9 * u);

    // beat 3: the notification stack (one slot; knocked cards slide down and away)
    const NOTES = rtl
      ? [["سلايدر", "وصل ١٠٠", "الآن", false], ["الرسائل", "دحرجة حلوة!", "الآن", false], ["الكرة", "جاية لك…", "الآن", true]]
      : [["Slider", "Reached 100", "now", false], ["Messages", "Nice roll!", "now", false], ["Ball", "Incoming…", "now", true]];
    const notes = NOTES.map(([app, title, when, chip], i) => {
      const n = mk("div", `position:absolute;box-sizing:border-box;padding:${(22 * k).toFixed(1)}px ${(26 * k).toFixed(1)}px;border-radius:min(var(--x-radius), ${(34 * k).toFixed(1)}px);background:${C.surf};box-shadow:0 0 0 var(--x-edge) ${C.line}, 0 ${(14 * k).toFixed(1)}px ${(30 * k).toFixed(1)}px color-mix(in srgb, var(--x-device) 28%, transparent);display:flex;gap:${(20 * k).toFixed(1)}px;align-items:center;opacity:0;`, world);
      place(n, L, Y_N, CW, NH);
      mk("div", `flex:none;width:${(64 * k).toFixed(1)}px;height:${(64 * k).toFixed(1)}px;border-radius:min(var(--x-radius), ${(16 * k).toFixed(1)}px);background:${i === 0 ? "var(--x-accent)" : i === 1 ? "var(--x-good)" : "var(--x-accent-2)"};`, n);
      const col = mk("div", `flex:1;min-width:0;display:flex;flex-direction:column;gap:${(6 * k).toFixed(1)}px;`, n);
      const top = mk("div", `display:flex;justify-content:space-between;font:500 ${(24 * k).toFixed(1)}px var(--x-body-font);color:${C.dim};`, col);
      mk("span", "", top, app); mk("span", "", top, when);
      mk("div", `font:600 ${(32 * k).toFixed(1)}px var(--x-body-font);color:${C.ink};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`, col, title);
      if (chip) mk("div", `flex:none;padding:${(10 * k).toFixed(1)}px ${(22 * k).toFixed(1)}px;border-radius:var(--x-radius-s);background:var(--x-accent);color:var(--x-accent-ink);font:600 ${(24 * k).toFixed(1)}px var(--x-body-font);`, n, rtl ? "رد" : "Reply");
      return n;
    });

    // beat 4: the keyboard
    const kb = mk("div", `position:absolute;box-sizing:border-box;padding:${(18 * k).toFixed(1)}px;border-radius:min(var(--x-radius), ${(30 * k).toFixed(1)}px);background:${C.surf};box-shadow:0 0 0 var(--x-edge) ${C.line};display:flex;flex-direction:column;gap:${(12 * k).toFixed(1)}px;opacity:0;direction:ltr;`, world);
    place(kb, L, Y_K, CW, KH);
    const ROWS = [10, 9, 7];
    const keys = [];
    ROWS.forEach((nk) => {
      const row = mk("div", `flex:1;display:flex;gap:${(10 * k).toFixed(1)}px;justify-content:center;`, kb);
      for (let i = 0; i < nk; i++) keys.push(mk("div", `flex:0 0 ${((CW - 36 * k - 9 * 10 * k) / 10).toFixed(1)}px;border-radius:min(var(--x-radius), ${(10 * k).toFixed(1)}px);background:${C.surf2};box-shadow:0 ${(3 * k).toFixed(1)}px 0 color-mix(in srgb, var(--x-device) 25%, transparent);`, row));
    });
    const spaceRow = mk("div", `flex:1;display:flex;justify-content:center;`, kb);
    mk("div", `width:46%;border-radius:min(var(--x-radius), ${(10 * k).toFixed(1)}px);background:${C.surf2};box-shadow:0 ${(3 * k).toFixed(1)}px 0 color-mix(in srgb, var(--x-device) 25%, transparent);`, spaceRow);

    // the ball (an SVG so its rolling mark turns inside it) and the pointer
    const ball = mk("div", `position:absolute;left:0;top:0;width:${(2 * r).toFixed(1)}px;height:${(2 * r).toFixed(1)}px;transform-origin:50% 100%;z-index:3;filter:drop-shadow(0 ${(6 * k).toFixed(1)}px ${(8 * k).toFixed(1)}px color-mix(in srgb, var(--x-device) 30%, transparent));`, world);
    ball.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="12" fill="${C.ink}"/><g><circle cx="12" cy="5.2" r="2" fill="var(--x-accent)" opacity=".55"/></g></svg>`;
    const mark = ball.querySelector("g");
    const ptr = p.cursor ? mk("div", `position:absolute;left:0;top:0;width:${(58 * k).toFixed(1)}px;height:${(58 * k).toFixed(1)}px;z-index:4;`, world) : null;
    if (ptr) ptr.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M4 2l16 9.5-7 1.6 4.2 7.4-3 1.7-4.2-7.4L5 20z" fill="var(--x-pointer)" stroke="var(--x-pointer-edge)" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

    // ── the score (base seconds; scaled to the span) ──
    const sc = ML.clamp((end - at - 0.4) / 7.2, 0.6, 1.6);
    const T = (b) => at + b * sc;
    const yS = Y_S - STH / 2 - r, yN = Y_N - r;
    const x2 = SX1 + r + 70 * k, x3 = cx + CW * 0.16, x4 = cx + CW * 0.06, x5 = cx - CW * 0.02;
    const keyRow0 = keys.slice(0, 10);
    const yK = Y_K + 18 * k - r; // on the top row of keys
    // a projectile between two points in time T0→T1 that rises h above its start before falling
    const arc = (b, b0, b1, xa, ya, xb, yb, h) => {
      const Tt = b1 - b0, dt = ML.clamp(b - b0, 0, Tt), dy = yb - ya;
      const s = (Math.sqrt(2 * h) * Tt + Math.sqrt(2 * h * Tt * Tt + 2 * Tt * Tt * Math.max(dy, -h * 0.99))) / (Tt * Tt), g = s * s, vy = -Math.sqrt(2 * g * h);
      return { x: xa + (xb - xa) * (dt / Tt), y: ya + vy * dt + 0.5 * g * dt * dt };
    };
    const hop = (b, b0, b1, xa, xb, y, h) => { const u = ML.lin(b, b0, b1); return { x: xa + (xb - xa) * u, y: y - h * 4 * u * (1 - u) }; };
    const B = { arrive: 0.65, click: 0.85, pop: 1.0, land1: 1.65, roll0: 1.75, roll1: 3.35, land2: 4.3, land3: 4.85, land4: 5.3, kbIn: 5.15, land5: 6.1, land6: 6.42, land7: 6.62 };
    const xL = thumbX(0) - r - tR, xE = thumbX(1) - r - tR;
    /** the ball's centre in world px (LTR) at base second b */
    function ballAt(b) {
      if (b < B.click) return { x: knobOff, y: Y_T };
      if (b < B.pop) return { x: knobOff + (knobOn - knobOff) * ML.out(b, B.click, B.click + 0.15), y: Y_T };
      if (b < B.land1) return arc(b, B.pop, B.land1, knobOn, Y_T, xL, yS, 200 * k);
      if (b < B.roll0) return { x: xL, y: yS };
      if (b < B.roll1) return { x: xL + (xE - xL) * ML.ease(b, B.roll0, B.roll1), y: yS };
      if (b < B.land2) return arc(b, B.roll1, B.land2, xE, yS, x2, yN, 110 * k);
      if (b < B.land3) return hop(b, B.land2, B.land3, x2, x3, yN, 150 * k);
      if (b < B.land4) return hop(b, B.land3, B.land4, x3, x4, yN, 80 * k);
      if (b < B.land5) return arc(b, B.land4, B.land5, x4, yN, x5, yK, 40 * k);
      if (b < B.land6) return hop(b, B.land5, B.land6, x5, x5, yK, 60 * k);
      if (b < B.land7) return hop(b, B.land6, B.land7, x5, x5, yK, 20 * k);
      return { x: x5, y: yK };
    }
    const contacts = [B.land1, B.roll1, B.land2, B.land3, B.land4, B.land5, B.land6, B.land7];
    // the camera: follow the ball's y with a lerp per 60 fps frame, precomputed once from the start
    const follow = ML.clamp(p.follow, 0.06, 0.25);
    const camTarget = (t) => Math.max(0, ballAt((t - at) / sc).y - VH * 0.42);
    const cams = []; { let c = camTarget(at); const nF = Math.ceil((end - at + 0.6) * 60) + 2; for (let i = 0; i < nF; i++) { c += (camTarget(at + i / 60) - c) * follow; cams.push(c); } }
    const camAt = (t) => { const fi = (t - at) * 60; if (fi <= 0) return cams[0]; const i = Math.min(cams.length - 2, Math.floor(fi)), u = Math.min(1, fi - i); return cams[i] + (cams[i + 1] - cams[i]) * u; };
    // notification times: appear, knocked
    const NT = [[3.4, B.land2 + 0.08], [B.land2 + 0.14, B.land3 + 0.08], [B.land3 + 0.14, B.land4 + 0.08]];
    const shake = (t, th) => (t < th ? 0 : 3 * k * Math.sin((t - th) * 70) * Math.exp(-(t - th) * 14));
    // the key under the ball when it lands on the keyboard
    const keyIdx = Math.round(ML.clamp((mx(x5) - L - 18 * k) / ((CW - 36 * k) / 10) - 0.5, 0, 9));
    const hitKey = keyRow0[keyIdx];

    // sound: about one a beat
    ctx.sfx(T(B.click), "click", 0.45);
    ctx.sfx(T(B.pop), "pop", 0.3);
    ctx.sfx(T(B.land1), "hit", 0.35);
    ctx.sfx(T(B.roll1), "pop", 0.35);
    ctx.sfx(T(3.4), "pop.soft", 0.2);
    [B.land2, B.land3, B.land4].forEach((b) => ctx.sfx(T(b), "hit", 0.32));
    ctx.sfx(T(B.kbIn), "whoosh.soft", 0.18);
    ctx.sfx(T(B.land5), "land", 0.4);

    return {
      draw(t) {
        const b = (t - at) / sc;
        const o = ML.lin(t, at - 0.2, at + 0.1) * (1 - ML.lin(t, end - 0.3, end));
        viewport.style.opacity = o.toFixed(4);
        world.style.translate = `0 ${(-camAt(t)).toFixed(1)}px`;
        // ball
        const q = ballAt(b);
        let lastC = -1; for (const c of contacts) if (b >= c) lastC = c;
        const sq = lastC >= 0 ? Math.exp(-(b - lastC) / 0.06) * (lastC === B.roll1 ? 0.4 : 1) : 0;
        const fly = b >= B.pop && b < B.land1 ? Math.sin(Math.PI * ML.lin(b, B.pop, B.land1)) : 0;
        const sz = 1 + 0.1 * fly;
        ball.style.translate = `${(mx(q.x) - r).toFixed(1)}px ${(q.y - r).toFixed(1)}px`;
        ball.style.scale = `${(sz * (1 + 0.22 * sq)).toFixed(4)} ${(sz * (1 - 0.22 * sq)).toFixed(4)}`;
        mark.setAttribute("transform", `rotate(${((((q.x - knobOff) / r) * 180) / Math.PI * (rtl ? -1 : 1)).toFixed(1)} 12 12)`);
        // toggle: accent on the click, a shake as the knob leaves
        const on = ML.lin(t, T(B.click), T(B.click) + 0.2);
        track.style.background = on > 0.001 ? `color-mix(in srgb, var(--x-accent) ${(on * 100).toFixed(1)}%, ${C.surf2})` : C.surf2;
        track.style.translate = `${shake(b, B.pop).toFixed(2)}px 0`;
        // slider: thumb pushed by the ball, fill, value, ticks
        const u = ML.clamp((q.x + r + tR - thumbX(0)) / (thumbX(1) - thumbX(0)));
        const su = b < B.roll0 ? 0 : b >= B.roll1 ? 1 : u;
        const tx = thumbX(su);
        place(thumb, tx - tR, Y_S - tR, tR * 2, tR * 2);
        thumb.style.translate = `0 ${(shake(b, B.land1)).toFixed(2)}px`;
        sTrack.style.translate = `0 ${(shake(b, B.land1)).toFixed(2)}px`;
        sFill.style.width = (((tx - SX0) / SW) * 100).toFixed(2) + "%";
        bubble.textContent = String(Math.round(10 + 90 * su));
        place(bubble, tx - 58 * k, Y_S + 76 * k, 116 * k, 54 * k);
        bubble.style.scale = (1 + 0.12 * ML.pulse(b, B.roll1, 0.03, 0.2)).toFixed(4);
        ticks.forEach((e, i) => { e.style.background = i / 10 <= 0.1 + 0.9 * su + 1e-6 ? "var(--x-accent)" : C.line; });
        // notifications: drop in, shake on the hit, get knocked down and away (blur + slide)
        notes.forEach((n, i) => {
          const [a, kn] = NT[i];
          const inn = ML.out(b, a, a + 0.25), gone = ML.ease(b, kn, kn + 0.45);
          n.style.opacity = (inn * (1 - gone)).toFixed(4);
          const hitT = i === 0 ? B.land2 : i === 1 ? B.land3 : B.land4;
          n.style.translate = `${shake(b, hitT).toFixed(2)}px ${(-(1 - inn) * 24 * k + gone * NH * 1.1).toFixed(1)}px`;
          n.style.scale = (1 - 0.06 * gone).toFixed(4);
          n.style.filter = gone > 0.01 ? `blur(${(gone * 8 * k).toFixed(2)}px)` : "none";
          n.style.zIndex = String(10 - i);
        });
        // keyboard rises from below, a key goes down under the ball
        const kin = ML.out(b, B.kbIn, B.kbIn + 0.6);
        kb.style.opacity = kin.toFixed(4);
        kb.style.translate = `${shake(b, B.land5).toFixed(2)}px ${((1 - kin) * 260 * k).toFixed(1)}px`;
        const kp = b >= B.land5 ? Math.max(ML.pulse(b, B.land5, 0.02, 0.2), b >= B.land7 ? 0.6 : 0) : 0;
        hitKey.style.translate = `0 ${(kp * 3 * k).toFixed(2)}px`;
        hitKey.style.background = kp > 0.01 ? `color-mix(in srgb, var(--x-accent) ${(kp * 70).toFixed(1)}%, ${C.surf2})` : C.surf2;
        // pointer: in, click the toggle, drift off
        if (ptr) {
          const sx = cx + CW * 0.42, sy = Y_T + 320 * k, ex = knobOff + 6 * k, ey = Y_T + 6 * k;
          let x, y;
          if (b < B.arrive) { const g = ML.out(b, 0, B.arrive); x = sx + (ex - sx) * g; y = sy + (ey - sy) * g; }
          else if (b < B.click + 0.15) { x = ex; y = ey; }
          else { const g = ML.ease(b, B.click + 0.15, B.click + 0.8); x = ex + CW * 0.3 * g; y = ey + 160 * k * g; }
          const pr = b < B.click - 0.05 ? 0 : b < B.click ? 1 : 1 - ML.lin(b, B.click + 0.05, B.click + 0.15);
          ptr.style.translate = `${(mx(x) - 10 * k).toFixed(1)}px ${(y - 5 * k).toFixed(1)}px`;
          ptr.style.scale = (1 - 0.1 * pr).toFixed(4);
          ptr.style.opacity = (1 - ML.lin(b, B.click + 0.5, B.click + 0.8)).toFixed(4);
        }
      },
    };
  },
});
