// Level builder → play: a little platform-game screen. "DESIGN IT": tiles fly from a palette at the side into the level
// one after another (scale 0 → 1 in 0.15 s, 0.08 s stagger) while the palette item being used is ringed; coins are
// dropped last. A "PLAY IT" pill pops, the palette dims, and a character runs the level along a precomputed path of
// walks and parabolic jumps, collecting coins — each leaves a "+100" that rises 20 px and fades in 0.5 s, the score
// counts up and the time counter top-right counts down. A dim pixel city stands behind it all. Mirrored for RTL.
// Canvas painted from t only (seeded city, path solved in setup). Source: prompt-motion ibrahimwasim240
// "opus 5.5 max effort" (reference only — our own code).
ML.define({
  id: "ui.level-builder-to-play",
  category: "ui",
  name: "Level gets built, then played",
  does: "A platform game level is assembled tile by tile from a palette ('DESIGN IT'), then a character runs and jumps through it collecting coins ('PLAY IT').",
  says: ["step", "playful", "result"],
  energy: 4,
  targets: ["screen", "stage"],
  duration: [4, 10],
  params: {
    tiles: { type: "number", range: [10, 40], default: 24 },
    coins: { type: "number", range: [2, 10], default: 5 },
    design_label: { type: "text", default: "DESIGN IT" },
    play_label: { type: "text", default: "PLAY IT" },
    city: { type: "bool", default: true },
    hud: { type: "bool", default: true },
  },
  pairs: ["ui.cursor-glide-click", "text-in.punchline"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop",
  source: { from: "prompt-motion:ibrahimwasim240-opus-5-5-max-effort", license: "reference", note: "our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    let host, R;
    if (el && el.clientWidth > 320 && el.clientHeight > 220) { if (getComputedStyle(el).position === "static") el.style.position = "relative"; host = el; R = { x: 0, y: 0, w: el.clientWidth, h: el.clientHeight }; }
    else { host = ctx.scene || ctx.stage; R = f.pic; }

    // the screen: 16:10 inside the region
    const SW = Math.round(Math.min(R.w, R.h * 1.6)), SH = Math.round(SW / 1.6);
    const screen = mk("div", `position:absolute;left:${(R.x + (R.w - SW) / 2).toFixed(1)}px;top:${(R.y + (R.h - SH) / 2).toFixed(1)}px;width:${SW}px;height:${SH}px;border-radius:var(--x-radius);overflow:hidden;background:var(--x-panel-2);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);box-sizing:border-box;z-index:6;pointer-events:none;`, host);
    const cv = mk("canvas", `position:absolute;left:0;top:0;width:${SW}px;height:${SH}px;`, screen);
    const dpr = Math.min(2, window.devicePixelRatio || 1); // sharp on any page density; every draw stays in CSS px
    cv.width = SW * dpr; cv.height = SH * dpr;
    const g = cv.getContext("2d");
    g.scale(dpr, dpr);
    g.direction = "ltr"; // "+100" and "?" read the same in both scripts; positions are mirrored by MX instead
    const cs = getComputedStyle(screen);
    const v = (n) => cs.getPropertyValue(n).trim() || cs.color;
    const C = { ink: v("--x-ink"), dim: v("--x-dim"), panel: v("--x-panel"), panel2: v("--x-panel-2"), accent: v("--x-accent"), accent2: v("--x-accent-2"), good: v("--x-good"), bad: v("--x-bad"), gold: v("--x-light-2"), line: v("--x-line") };
    const labelFont = cs.getPropertyValue("--x-label-font").trim() || "monospace";

    // the grid: 16 columns × 10 rows, a palette column on the reading side, a HUD row on top
    const COLS = 16, ROWS = 10;
    const s = Math.floor(Math.min(SW / (COLS + 2.8), (SH * 0.9) / ROWS));
    const palW = Math.round(s * 2.4), lx = palW + Math.round((SW - palW - COLS * s) / 2), ly = SH - ROWS * s;
    const MX = (x, w = 0) => (rtl ? SW - x - w : x); // mirror a logical x for RTL
    const cellX = (c) => lx + c * s, cellY = (r) => ly + r * s;

    // the level, in build priority (ground first so a short level is still playable)
    const want = [];
    for (let c = 0; c < COLS; c++) if (c !== 6 && c !== 7) want.push({ c, r: 9, k: 0 });
    [3, 4, 5].forEach((c) => want.push({ c, r: 6, k: 1 }));
    want.push({ c: 8, r: 6, k: 2 });
    [11, 12].forEach((c) => want.push({ c, r: 6, k: 1 }));
    want.push({ c: 13, r: 6, k: 2 });
    [[14, 8], [15, 8], [15, 7], [14, 7], [15, 6]].forEach(([c, r]) => want.push({ c, r, k: 1 }));
    const used = new Set(want.map((w) => w.c + "," + w.r));
    for (let i = 0; want.length < 40 && i < 200; i++) { // floating decor up high, seeded
      const c = Math.floor(ML.rnd(i, 3) * COLS), r = 1 + Math.floor(ML.rnd(i, 5) * 3);
      if (used.has(c + "," + r)) continue; used.add(c + "," + r); want.push({ c, r, k: ML.rnd(i, 7) < 0.35 ? 2 : 1 });
    }
    const tiles = want.slice(0, Math.round(ML.clamp(p.tiles, 10, 40))).sort((a, b) => a.c - b.c || b.r - a.r);
    // walkable surface per column: the top tile in the lower band (rows 5–9)
    const surf = Array.from({ length: COLS }, (_, c) => { const rs = tiles.filter((t) => t.c === c && t.r >= 5).map((t) => t.r); return rs.length ? Math.min(...rs) : null; });
    const nCoins = Math.round(ML.clamp(p.coins, 2, 10));
    const lastC = surf.reduce((m, r, c) => (r == null ? m : c), 0); // a short level: coins stay on the part that exists
    const coins = Array.from({ length: nCoins }, (_, i) => ({ c: Math.min(lastC, Math.round(((i + 0.6) * (lastC + 1)) / nCoins)), r: 0 }));

    // timing: build, PLAY pops, run
    const n = tiles.length;
    const buildWin = Math.max(1.2, (end - at) * 0.42);
    const stg = Math.min(0.08, (buildWin - 0.5) / (n + nCoins));
    tiles.forEach((t, i) => { t.t = at + 0.35 + i * stg; });
    coins.forEach((c, i) => { c.t = at + 0.35 + (n + i) * stg; });
    const buildEnd = at + 0.35 + (n + nCoins) * stg + 0.15;
    const playAt = buildEnd + 0.15, runAt = playAt + 0.4, runEnd = end - 0.45;

    // the run: walks between level columns, parabolic jumps over gaps and steps (in cell units)
    const segs = [];
    const cols = surf.map((r, c) => (r == null ? null : c)).filter((c) => c != null);
    let raw = 0;
    for (let i = 0; i < cols.length - 1; i++) {
      const a = cols[i], b = cols[i + 1], ya = surf[a], yb = surf[b];
      const jump = b - a > 1 || ya !== yb;
      const d = jump ? 0.24 + 0.07 * (b - a) + 0.03 * Math.abs(ya - yb) : 0.16 * (b - a);
      const h = jump ? Math.max(1.4, ya - yb + 1.2) : 0;
      segs.push({ x0: a, y0: ya, x1: b, y1: yb, h, t0: raw, t1: raw + d, jump });
      raw += d;
    }
    const k = raw > 0 ? Math.max(0.1, runEnd - runAt) / raw : 1;
    segs.forEach((S) => { S.t0 = runAt + S.t0 * k; S.t1 = runAt + S.t1 * k; });
    const startC = cols[0] ?? 0;
    const pos = (t) => {
      if (!segs.length || t <= segs[0].t0) return { x: startC, y: surf[startC] ?? 9, air: 0 };
      const S = segs.find((q) => t < q.t1) || segs[segs.length - 1];
      const u = ML.clamp((t - S.t0) / (S.t1 - S.t0));
      if (!S.jump) return { x: S.x0 + (S.x1 - S.x0) * u, y: S.y0, air: 0 };
      return { x: S.x0 + (S.x1 - S.x0) * u, y: S.y0 + (S.y1 - S.y0) * u - S.h * 4 * u * (1 - u), air: Math.sin(Math.PI * u) };
    };
    // each coin hangs on the runner's own path (also over a pit, inside the jump), so it is touched the moment it goes
    coins.forEach((cn) => {
      const S = segs.find((q) => q.x1 >= cn.c);
      cn.hit = S ? S.t0 + (S.t1 - S.t0) * ML.clamp((cn.c - S.x0) / Math.max(1, S.x1 - S.x0)) : runAt;
      cn.r = pos(cn.hit).y - 1.1;
    });

    // sound: a pop every few tiles, a confirm on PLAY, a blip per coin
    tiles.forEach((t, i) => i % 4 === 0 && ctx.sfx(t.t, "pop", 0.18));
    ctx.sfx(playAt, "click.confirm", 0.45);
    coins.forEach((c) => c.hit < end && ctx.sfx(c.hit, "blip", 0.3));

    // DOM HUD: the phase pill, score, time (text in DOM so Arabic shapes properly)
    const dl = p.design_label === "DESIGN IT" && rtl ? "صمّمها" : String(p.design_label || "");
    const pl = p.play_label === "PLAY IT" && rtl ? "العبها" : String(p.play_label || "");
    const hudFs = Math.max(14, s * 0.44);
    const pillCss = `position:absolute;top:${(s * 0.35).toFixed(1)}px;left:50%;translate:-50% 0;padding:${(hudFs * 0.35).toFixed(1)}px ${(hudFs * 0.9).toFixed(1)}px;border-radius:var(--x-radius-s);font:var(--x-label-weight) ${hudFs.toFixed(1)}px var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};white-space:nowrap;`;
    const pillD = mk("div", pillCss + "background:var(--x-panel);color:var(--x-ink);border:var(--x-edge) solid var(--x-edge-color);", screen, dl);
    const pillP = mk("div", pillCss + "background:var(--x-accent);color:var(--x-accent-ink);", screen, (rtl ? "" : "▶ ") + pl + (rtl ? " ◀" : ""));
    const side = rtl ? "left" : "right", other = rtl ? "right" : "left";
    const hudCss = `position:absolute;top:${(s * 0.42).toFixed(1)}px;font:var(--x-label-weight) ${(hudFs * 0.9).toFixed(1)}px var(--x-mono-font);color:var(--x-ink);white-space:nowrap;direction:${rtl ? "rtl" : "ltr"};`;
    const timeEl = p.hud ? mk("div", hudCss + `${side}:${(s * 0.5).toFixed(1)}px;`, screen) : null;
    const scoreEl = p.hud ? mk("div", hudCss + `${other}:${(palW + s * 0.2).toFixed(1)}px;`, screen) : null;
    const T_ = rtl ? "الوقت" : "TIME", S_ = rtl ? "النقاط" : "SCORE";

    // palette: ground, brick, block, coin
    const palItems = [0, 1, 2, 3].map((kind, i) => ({ kind, x: Math.round((palW - s * 1.1) / 2), y: Math.round(ly + s * 1.2 + i * s * 1.6) }));

    // the city: seeded blocks with windows
    const city = [];
    for (let x = 0, i = 0; x < SW && i < 80; i++) { const w = s * (1 + Math.floor(ML.rnd(i, 11) * 3)); const h = s * (2 + Math.floor(ML.rnd(i, 13) * 5)); city.push({ x, w, h, i }); x += w + s * 0.25; }

    const rect = (x, y, w, h) => g.fillRect(Math.round(MX(x, w)), Math.round(y), Math.round(w), Math.round(h));
    const drawTile = (kind, x, y, sz, a = 1) => {
      // x, y = logical top-left; sz = edge
      g.globalAlpha = a;
      if (kind === 0) { g.fillStyle = C.accent; rect(x, y, sz, sz); g.fillStyle = C.good; rect(x, y, sz, sz * 0.22); g.fillStyle = C.line; rect(x, y + sz - sz * 0.08, sz, sz * 0.08); }
      else if (kind === 1) { g.fillStyle = C.accent2; rect(x, y, sz, sz); g.fillStyle = C.panel2; g.globalAlpha = a * 0.7; rect(x, y + sz * 0.48, sz, sz * 0.06); rect(x + sz * 0.48, y, sz * 0.06, sz * 0.48); rect(x + sz * 0.22, y + sz * 0.54, sz * 0.06, sz * 0.46); rect(x + sz * 0.74, y + sz * 0.54, sz * 0.06, sz * 0.46); }
      else if (kind === 2) {
        g.fillStyle = C.gold; rect(x, y, sz, sz); g.fillStyle = C.ink; g.globalAlpha = a * 0.25; rect(x, y + sz * 0.88, sz, sz * 0.12);
        g.globalAlpha = a; g.fillStyle = C.ink; g.font = `700 ${(sz * 0.62).toFixed(1)}px ${labelFont}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("?", MX(x + sz / 2), y + sz * 0.5);
      } else if (kind === 3) { g.fillStyle = C.gold; g.beginPath(); g.ellipse(MX(x + sz / 2), y + sz / 2, sz * 0.3, sz * 0.38, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = C.ink; g.globalAlpha = a * 0.3; rect(x + sz * 0.46, y + sz * 0.3, sz * 0.08, sz * 0.4); }
      g.globalAlpha = 1;
    };

    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.25, end);
        const inn = ML.out(t, at, at + 0.3);
        screen.style.opacity = (inn * (1 - leave)).toFixed(4);
        screen.style.translate = `0 ${((1 - inn) * s * 0.6).toFixed(2)}px`;
        g.clearRect(0, 0, SW, SH);
        // city
        if (p.city) city.forEach((b) => {
          g.globalAlpha = 0.07; g.fillStyle = C.ink; rect(b.x, ly + ROWS * s - b.h, b.w, b.h);
          for (let wy = ly + ROWS * s - b.h + s * 0.4; wy < ly + ROWS * s - s * 0.6; wy += s * 0.7) for (let wx = b.x + s * 0.25; wx < b.x + b.w - s * 0.3; wx += s * 0.5) {
            const lit = ML.rnd(b.i * 31 + Math.round(wx + wy), 2) < 0.25;
            g.globalAlpha = lit ? 0.18 : 0.06; g.fillStyle = lit ? C.accent : C.ink; rect(wx, wy, s * 0.18, s * 0.22);
          }
        });
        g.globalAlpha = 1;
        // the level grid, faint, during build
        const gridA = 0.5 * ML.lin(t, at + 0.1, at + 0.4) * (1 - ML.lin(t, playAt, playAt + 0.3));
        if (gridA > 0) { g.globalAlpha = gridA; g.fillStyle = C.line; for (let c = 0; c <= COLS; c++) rect(cellX(c), ly, 1, ROWS * s); for (let r = 0; r <= ROWS; r++) rect(lx, cellY(r), COLS * s, 1); g.globalAlpha = 1; }
        // palette
        const palA = 1 - 0.65 * ML.lin(t, playAt, playAt + 0.3);
        const cur = [...tiles, ...coins.map((c) => ({ ...c, k: 3 }))].filter((q) => t >= q.t - 0.05 && t < buildEnd).pop();
        g.globalAlpha = palA * 0.9; g.fillStyle = C.panel; rect(0, ly, palW, ROWS * s); g.globalAlpha = palA * 0.5; g.fillStyle = C.line; rect(palW - 1, ly, 1, ROWS * s);
        palItems.forEach((it) => {
          const on = cur && cur.k === it.kind;
          if (on) { g.globalAlpha = palA; g.fillStyle = C.accent; rect(it.x - s * 0.12, it.y - s * 0.12, s * 1.34, s * 1.34); g.fillStyle = C.panel; rect(it.x - s * 0.06, it.y - s * 0.06, s * 1.22, s * 1.22); }
          drawTile(it.kind, it.x + s * 0.05, it.y + s * 0.05, s, palA);
        });
        // tiles fly from their palette item and snap in
        tiles.forEach((q) => {
          if (t < q.t) return;
          const u = ML.out(t, q.t, q.t + 0.15), it = palItems[q.k];
          const tx = cellX(q.c), ty = cellY(q.r), x = it.x + (tx - it.x) * u, y = it.y + (ty - it.y) * u, sz = s * (0.3 + 0.7 * u);
          drawTile(q.k, x + (s - sz) / 2, y + (s - sz) / 2, sz, 1);
        });
        // coins: spin, get collected, leave +100
        let score = 0;
        coins.forEach((cn, i) => {
          if (t < cn.t) return;
          const u = ML.out(t, cn.t, cn.t + 0.15), x = cellX(cn.c), y = cellY(cn.r);
          if (t < cn.hit) {
            const spin = Math.abs(Math.cos(t * 4 + i)) * 0.8 + 0.2, sz = s * u;
            g.fillStyle = C.gold; g.beginPath(); g.ellipse(MX(x + s / 2), y + s / 2, sz * 0.3 * spin, sz * 0.38, 0, 0, Math.PI * 2); g.fill();
          } else {
            score += 100;
            const a = 1 - ML.lin(t, cn.hit, cn.hit + 0.5);
            if (a > 0) { g.globalAlpha = a; g.fillStyle = C.ink; g.font = `700 ${(s * 0.45).toFixed(1)}px ${labelFont}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("+100", MX(x + s / 2), y + s / 2 - s * 0.4 * ML.out(t, cn.hit, cn.hit + 0.5)); g.globalAlpha = 1; }
          }
        });
        // the runner
        const ra = ML.out(t, playAt, playAt + 0.25);
        if (ra > 0) {
          const q = pos(t), bw = s * 0.72, bh = s * 0.86;
          const x = cellX(q.x) + (s - bw) / 2, y = cellY(q.y) - bh;
          const run = q.air === 0 && t > runAt && t < runEnd ? Math.floor(q.x * 4) % 2 : 0;
          g.globalAlpha = ra;
          g.fillStyle = C.ink; rect(x + bw * 0.12, y + bh * 0.82, bw * 0.28, bh * 0.18 - (run ? bh * 0.08 : 0)); rect(x + bw * 0.6, y + bh * 0.82, bw * 0.28, bh * 0.18 - (run ? 0 : bh * 0.08));
          g.fillStyle = C.bad; rect(x, y + (q.air > 0 ? -bh * 0.04 : 0), bw, bh * 0.84);
          g.fillStyle = C.panel; rect(x + bw * 0.52, y + bh * 0.18, bw * 0.3, bh * 0.26); g.fillStyle = C.ink; rect(x + bw * 0.66, y + bh * 0.24, bw * 0.12, bh * 0.16);
          g.globalAlpha = 1;
        }
        // HUD
        const pd = 1 - ML.lin(t, playAt - 0.1, playAt + 0.1);
        pillD.style.opacity = (ML.out(t, at + 0.15, at + 0.4) * pd).toFixed(4);
        const pp = ML.back(t, playAt, playAt + 0.3, 2);
        pillP.style.opacity = ML.lin(t, playAt, playAt + 0.08).toFixed(4);
        pillP.style.scale = Math.min(1, Math.max(0, t < playAt ? 0 : pp)).toFixed(4);
        if (scoreEl) { scoreEl.textContent = `${S_} ${String(score).padStart(6, "0")}`; scoreEl.style.opacity = ML.lin(t, at + 0.2, at + 0.5).toFixed(4); }
        if (timeEl) { timeEl.textContent = `${T_} ${String(Math.max(0, 300 - Math.floor(Math.max(0, t - at) * 9))).padStart(3, "0")}`; timeEl.style.opacity = ML.lin(t, at + 0.2, at + 0.5).toFixed(4); }
      },
    };
  },
});
