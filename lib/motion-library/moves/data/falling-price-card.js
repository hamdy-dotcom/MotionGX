// Falling price card: a HUD card (dark translucent, 1 px border in the signal colour with a glow) shows a price that
// keeps dropping in irregular steps ($33.49 → $31.99 → $29.95 …) every ~`interval` s, each step with a one-frame
// flicker; a tiny mono header ("BUY BOX") and a chip ("28 SELLERS"); a mono line "▼ x% AND FALLING". Small price dots
// float around it. The card enters with a glitch flicker. The up variant rises in the good colour. When the target
// is a number, the card starts from that number and stands in its place.
// Source: prompt-motion ceowinkz-wtf-ai-just-made (reference only: our own rebuild).
ML.define({
  id: "data.falling-price-card",
  category: "data",
  name: "Price card ticks down",
  does: "A red HUD card shows a price that keeps dropping in steps, with a 'falling' indicator and a sellers count.",
  says: ["problem", "money", "urgency"],
  energy: 4,
  targets: ["number", "card"],
  duration: [1.5, 4],
  params: {
    direction: { type: "choice", options: ["down", "up"], default: "down" },
    interval: { type: "number", range: [0.25, 0.8], default: 0.4, unit: "s" },
    colour: { type: "choice", options: ["red", "green", "accent"], default: "red" },
    particles: { type: "bool", default: true },
    start: { type: "text", default: "" },
    currency: { type: "text", default: "$" },
    header: { type: "text", default: "" },
    chip: { type: "text", default: "" },
  },
  pairs: ["data.game-hud", "text-emphasis.accent-word"],
  avoid: ["calm", "luxury", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:ceowinkz-wtf-ai-just-made", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, end, stage, f } = ctx;
    const scene = ctx.scene || stage, rtl = ctx.rtl, up = p.direction === "up";
    const k = Math.min(f.W, f.H) / 1080;
    const C = p.colour === "green" ? "var(--x-good)" : p.colour === "accent" ? "var(--x-accent)" : up && p.colour === "red" ? "var(--x-good)" : "var(--x-bad)";
    const target = ctx.el && ctx.el !== stage && ctx.el !== ctx.scene ? ctx.el : null;
    // the starting price: the param, else the target's number, else 33.49
    const parse = (s) => { const m = String(s || "").replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).match(/\d[\d,]*(\.\d+)?/); return m ? { v: parseFloat(m[0].replace(/,/g, "")), dec: m[1] ? m[1].length - 1 : 0 } : null; };
    const got = parse(p.start) || (target ? parse(target.textContent) : null) || { v: 33.49, dec: 2 };
    const dec = got.dec || (got.v < 100 ? 2 : 0);
    const fmt = (v) => p.currency + v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
    // the steps: irregular intervals and drops, seeded
    const ticks = [{ t: at + 0.45, v: got.v }];
    for (let i = 1, t = at + 0.45; ; i++) {
      t += p.interval * (0.75 + 0.5 * ML.rnd(i, 9));
      if (t > end - 0.35) break;
      const prev = ticks[ticks.length - 1].v, step = 0.015 + 0.045 * ML.rnd(i, 4);
      let v = prev * (up ? 1 + step : 1 - step);
      v = dec ? Math.round(v * 100) / 100 : Math.round(v);
      if (dec && !up) v = Math.floor(v) + [0.99, 0.95, 0.49, 0.29, 0.79][i % 5] - (Math.floor(v) + 0.99 > prev ? 1 : 0);
      ticks.push({ t, v: Math.max(0.01, v) });
    }
    ticks.forEach((x, i) => i % 2 === 1 && ctx.sfx(x.t, "blip", 0.2));
    ctx.sfx(at, "tap", 0.25);

    // the card
    const card = document.createElement("div");
    const cw = Math.min(f.pic.w * 0.82, 600 * k);
    card.style.cssText = `position:absolute;z-index:9;width:${cw}px;box-sizing:border-box;padding:${26 * k}px ${30 * k}px;visibility:hidden;direction:${rtl ? "rtl" : "ltr"};
      background:color-mix(in srgb, var(--x-device) 84%, transparent);border:1px solid ${C};border-radius:min(calc(var(--x-radius) * 0.6), ${24 * k}px);
      box-shadow:0 0 ${28 * k}px color-mix(in srgb, ${C} 45%, transparent), inset 0 0 ${18 * k}px color-mix(in srgb, ${C} 18%, transparent);color:${C};font-family:var(--x-mono-font)`;
    const lab = `font:600 ${(18 * k).toFixed(1)}px var(--x-mono-font);${rtl ? "" : "letter-spacing:0.16em;"}text-transform:${rtl ? "none" : "uppercase"}`;
    const head = document.createElement("div");
    head.style.cssText = `display:flex;justify-content:space-between;align-items:center;gap:${12 * k}px;margin-bottom:${14 * k}px`;
    const h1 = document.createElement("span"); h1.style.cssText = lab + ";opacity:0.75"; h1.textContent = p.header || (rtl ? "أفضل سعر" : "Buy box");
    const chip = document.createElement("span"); chip.style.cssText = lab + `;padding:${5 * k}px ${12 * k}px;border:1px solid color-mix(in srgb, ${C} 60%, transparent);border-radius:999px;background:color-mix(in srgb, ${C} 14%, transparent)`;
    chip.textContent = p.chip || (rtl ? "28 بائع" : "28 sellers");
    head.append(h1, chip);
    const price = document.createElement("div");
    price.style.cssText = `font:800 ${(112 * k).toFixed(1)}px/1.05 var(--x-head-font);letter-spacing:-0.02em;color:color-mix(in srgb, ${C} 82%, var(--x-accent-ink));font-variant-numeric:tabular-nums;direction:ltr;text-align:${rtl ? "right" : "left"};white-space:nowrap`;
    const line = document.createElement("div");
    line.style.cssText = lab + `;margin-top:${12 * k}px;letter-spacing:${rtl ? 0 : "0.08em"}`;
    card.append(head, price, line);
    scene.append(card);
    // where it sits: over the target (which it stands in for), else centred in the picture region; kept in the safe frame
    price.textContent = fmt(Math.max(...ticks.map((x) => x.v)));
    ML.fit(price, cw - 60 * k);
    const ch = card.offsetHeight;
    let cx = f.pic.x + f.pic.w / 2, cy = f.pic.y + f.pic.h / 2;
    if (target) { const b = ctx.box(target); cx = b.x + b.w / 2; cy = b.y + b.h / 2; }
    const x0 = Math.max(f.safe.x, Math.min(f.safe.x + f.safe.w - cw, cx - cw / 2)), y0 = Math.max(f.safe.y, Math.min(f.safe.y + f.safe.h - ch, cy - ch / 2));
    card.style.left = x0 + "px"; card.style.top = y0 + "px";
    // the floating price dots around the card
    // the floating price dots: one canvas over the scene, cleared and repainted every frame
    const dots = [];
    let dc = null, dg = null, DOT = "";
    if (p.particles) {
      const probe = document.createElement("i"); probe.style.cssText = `display:none;color:${C}`; scene.append(probe); DOT = getComputedStyle(probe).color; probe.remove();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      dc = document.createElement("canvas"); dc.width = Math.round(f.W * dpr); dc.height = Math.round(f.H * dpr);
      dc.style.cssText = `position:absolute;left:0;top:0;width:${f.W}px;height:${f.H}px;z-index:8;pointer-events:none;visibility:hidden`;
      scene.append(dc); dg = dc.getContext("2d"); dc.dpr = dpr;
      for (let i = 0; i < 16; i++) {
        const a = ML.rnd(i, 22) * Math.PI * 2, rr = 0.6 + 0.5 * ML.rnd(i, 23);
        dots.push({ x: x0 + cw / 2 + Math.cos(a) * cw * 0.62 * rr, y: y0 + ch / 2 + Math.sin(a) * ch * 1.1 * rr, sp: (20 + 40 * ML.rnd(i, 24)) * k, ph: ML.rnd(i, 25) * 6.28, r: (2 + 3 * ML.rnd(i, 21)) * k });
      }
    }
    const hidden = target && target.style.visibility;
    const word = up ? (rtl ? "ومستمر في الصعود" : "and rising") : rtl ? "ومستمر في النزول" : "and falling";
    return {
      draw(t) {
        const vis = (t >= at ? 1 : 0) * (1 - ML.ease(t, end - 0.3, end));
        card.style.visibility = vis > 0.001 ? "visible" : "hidden";
        if (target) target.style.visibility = vis > 0.001 ? "hidden" : hidden || "";
        if (dc) dc.style.visibility = vis > 0.001 ? "visible" : "hidden";
        if (vis <= 0.001) return;
        // the glitch entrance: on/off flicker with a sideways jitter and a split edge, settling by 0.35 s
        const e = t - at, gl = e < 0.35, fr = Math.floor(e / 0.035);
        const on = !gl || ML.rnd(fr, 31) > 0.35 || e > 0.28;
        const jx = gl ? (ML.rnd(fr, 32) - 0.5) * 18 * k * (1 - e / 0.35) : 0;
        // the current step and its one-frame flicker
        let i = 0; while (i + 1 < ticks.length && t >= ticks[i + 1].t) i++;
        const flick = i > 0 && t - ticks[i].t < 1 / 30;
        card.style.opacity = (on ? (flick ? 0.55 : 1) * vis : 0.15 * vis).toFixed(3);
        card.style.translate = `${(jx + (flick ? 3 * k : 0)).toFixed(2)}px 0`;
        price.style.textShadow = gl || flick ? `${(2 * k).toFixed(1)}px 0 var(--x-accent-2), ${(-2 * k).toFixed(1)}px 0 ${C}` : "none";
        price.textContent = fmt(ticks[i].v);
        const pct = Math.abs(ticks[i].v - ticks[0].v) / ticks[0].v * 100;
        line.textContent = `${up ? "▲" : "▼"} ${pct.toFixed(pct < 10 ? 1 : 0)}% ${word}`;
        if (dg) {
          dg.reset(); dg.setTransform(dc.dpr, 0, 0, dc.dpr, 0, 0); dg.clearRect(0, 0, f.W, f.H);
          dots.forEach((x, j) => {
            const dy = (e * x.sp * (up ? -1 : 1)) % (60 * k), a = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(e * 3 + x.ph));
            const o = a * vis * ML.lin(t, at + 0.2 + j * 0.02, at + 0.5 + j * 0.02) * (1 - (Math.abs(dy) / (60 * k)) * 0.6);
            if (o <= 0.003) return;
            const px = x.x + Math.sin(e * 1.3 + x.ph) * 8 * k, py = x.y + dy;
            const glow = dg.createRadialGradient(px, py, 0, px, py, x.r * 3);
            glow.addColorStop(0, DOT); glow.addColorStop(1, "rgba(0,0,0,0)");
            dg.globalAlpha = o * 0.45; dg.fillStyle = glow; dg.beginPath(); dg.arc(px, py, x.r * 3, 0, Math.PI * 2); dg.fill();
            dg.globalAlpha = o; dg.fillStyle = DOT; dg.beginPath(); dg.arc(px, py, x.r, 0, Math.PI * 2); dg.fill();
          });
        }
      },
    };
  },
});
