// Card fan. "fan-in" (3–7 cards): each card ends on an arc around the centre card — for five, x −380/−200/0/200/380 px,
// y 80/20/0/20/80, rotate −22/−10/0/12/24°, scale 0.85/0.95/1.05/0.95/0.85 (generalised as u = (i − mid)/mid: x u·spread,
// y 80u², rotate ≈ 23u, scale 1.05 − 0.2|u|) — from x·1.5, y + 150, rotation·1.5, scale·0.8, opacity 0, over 1.4 s
// back.out(overshoot), 0.08 s apart. "spread" (2–3 small paper cards): back card at (−24, −8) rotate −3°, front at
// (16, 16) rotate 6°; on the cue, over 0.5 s ease-out, the front swings to rotate 12°, x +24, y −8 and the back to
// rotate −6°, x −32, y +8, a soft accent glow dot on the front card. Then an idle float (y ±5 px, ±1°, 3–5 s sine,
// seeded phase). Offsets scale with the card; Arabic mirrors the order and the swing.
// Source: MengTo/Skills web-design/orange-clean-paper-saas demo (the leaning pair) + web-design/gsap demo (the fan)
// (MIT).
ML.define({
  id: "element.card-fan",
  category: "element",
  name: "Card fan",
  does: "Cards rise from below and settle into a fanned arc around a centre card, or a leaning pair fans further apart, then bob gently.",
  says: ["arrival", "choice", "playful", "reveal"],
  energy: 3,
  targets: ["card", "image", "list", "shape"],
  duration: [1.2, 3],
  params: {
    mode: { type: "choice", options: ["fan-in", "spread"], default: "fan-in" },
    cards: { type: "number", range: [2, 7], default: 5 },
    spread: { type: "number", range: [150, 400], default: 380, unit: "px" },
    overshoot: { type: "number", range: [1, 1.7], default: 1.2 },
    idle: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "element.card-toss", "camera.slow-push"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "card.fan",
  source: { from: "MengTo/Skills:agent-skills/web-design/gsap", license: "MIT", note: "demo/index.html fan-in keyframes + orange-clean-paper-saas demo leaning card pair; every frame from t" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const spreadMode = p.mode === "spread";
    const R = f.pic;
    const cx0 = Math.max(0, f.pic.x - 48 * k), cy0 = f.pic.y, cw0 = Math.min(f.W - cx0, f.pic.w + 96 * k), ch0 = Math.min(f.H - cy0, f.pic.h + 72 * k);
    const back = mk("div", `position:absolute;left:${cx0}px;top:${cy0}px;width:${cw0}px;height:${ch0}px;background:var(--x-ground);background-image:var(--x-ground-image);background-size:${f.W}px ${f.H}px;background-position:${-cx0}px ${-cy0}px;pointer-events:none;z-index:5;opacity:0;`, host); // clears the region the built piece takes, shadows included
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;`, host);

    // what the cards show: the target's picture, its items' text, or built art + captions
    const pic = own && own.tagName === "IMG" ? own : own?.querySelector?.("img") || null;
    const mine = own && own.children.length > 1 ? [...own.children].map((c) => (c.textContent || "").trim()).filter(Boolean) : [];
    // a real list sets the count (no invented captions beside its items)
    const count = mine.length || p.cards;
    const n = spreadMode ? Math.round(ML.clamp(count, 2, 3)) : Math.round(ML.clamp(count, 3, 7));
    const DEF = rtl ? ["أساسي", "شهري", "سنوي", "عائلي", "للشركات", "طلاب", "مدى الحياة"] : ["Basic", "Monthly", "Yearly", "Family", "Business", "Student", "Lifetime"];
    const caps = Array.from({ length: n }, (_, i) => mine.length ? mine[i % mine.length] : DEF[i % DEF.length]);

    // card size from the region (and a smaller paper card for the spread)
    const cw = spreadMode ? Math.min(R.w * 0.42, R.h * 0.5, 360 * k) : Math.min(R.w * (f.tall ? 0.28 : 0.2), R.h * 0.52, 300 * k);
    const ch = cw * 1.36, kc = cw / 300;
    const mid = (n - 1) / 2;
    const order = (i) => (rtl ? n - 1 - i : i); // which slot a card takes, read from the reading start
    // the outer card, turned about its low origin, stays in the frame: the spread gives way before the card is cut
    const cx = R.x + R.w / 2, room = f.at === "side" ? R.w / 2 : Math.min(cx, f.W - cx), a24 = (24 * Math.PI) / 180;
    const outer = 0.85 * ((cw / 2) * Math.cos(a24) + 0.9 * ch * Math.sin(a24));
    const spr = Math.max(0, Math.min(p.spread * k, room - 16 * k - outer));

    const cards = caps.map((cap, i) => {
      const c = mk("div", `position:absolute;left:${R.w / 2 - cw / 2}px;top:${R.h / 2 - ch / 2}px;width:${cw}px;height:${ch}px;box-sizing:border-box;padding:${cw * 0.06}px;display:flex;flex-direction:column;gap:${cw * 0.05}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(min(var(--x-radius), ${(cw * 0.1).toFixed(1)}px));box-shadow:var(--x-shadow);transform-origin:50% 90%;opacity:0;`, layer);
      const art = mk("div", `position:relative;flex:1;overflow:hidden;border-radius:calc(min(var(--x-pic-radius), ${(cw * 0.07).toFixed(1)}px));background:linear-gradient(${150 + i * 37}deg, color-mix(in srgb, var(--x-accent) ${28 + ((i * 23) % 50)}%, var(--x-panel-2)), color-mix(in srgb, var(--x-accent-2) ${22 + ((i * 31) % 55)}%, var(--x-panel-2)));`, c);
      if (pic) { const im = pic.cloneNode(true); im.removeAttribute("data-slot"); im.style.cssText = `width:100%;height:100%;object-fit:cover;object-position:${(i * 37) % 100}% 50%;display:block;filter:var(--x-pic-filter);`; art.append(im); }
      else mk("div", `position:absolute;left:30%;top:24%;width:40%;aspect-ratio:1;border-radius:${["50%", "24%", "50% 50% 14% 14%"][i % 3]};background:color-mix(in srgb, var(--x-panel) 60%, transparent);`, art);
      // a fanned card's caption sits on its outer side, the one its inner neighbour doesn't cover
      const side = spreadMode ? 0 : Math.sign(order(i) - mid);
      const capAlign = spreadMode ? "start" : side < 0 ? "left" : side > 0 ? "right" : "center";
      const barPlace = spreadMode ? "" : side < 0 ? "margin-right:auto;" : side > 0 ? "margin-left:auto;" : "margin:0 auto;";
      mk("div", `flex:none;font:var(--x-head-weight) ${cw * 0.105}px/1.4 var(--x-head-font);color:var(--x-ink);text-align:${capAlign};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`, c, cap);
      mk("div", `flex:none;height:${cw * 0.035}px;width:55%;border-radius:99px;background:var(--x-line);${barPlace}`, c);
      return c;
    });

    // rest poses and the start each card rises from
    let rest, from, swing = null, glow = null;
    if (!spreadMode) {
      rest = cards.map((_, i) => {
        const u = mid ? (order(i) - mid) / mid : 0;
        return { x: u * spr, y: 80 * k * u * u, r: u < 0 ? u * 22 : u * 24, s: 1.05 - 0.2 * Math.abs(u), z: n - Math.round(Math.abs(order(i) - mid) * 2) };
      });
      from = rest.map((q) => ({ x: q.x * 1.5, y: q.y + 150 * k, r: q.r * 1.5, s: q.s * 0.8 }));
    } else {
      const m = rtl ? -1 : 1;
      const B = { x: -24 * kc * m, y: -8 * kc, r: -3 * m, s: 1, z: 1 }, F = { x: 16 * kc * m, y: 16 * kc, r: 6 * m, s: 1, z: 3 }, M = { x: -4 * kc * m, y: 4 * kc, r: 1.5 * m, s: 1, z: 2 };
      rest = n === 3 ? [B, M, F] : [B, F];
      swing = n === 3 ? [{ x: -32 * kc * m, y: 8 * kc, r: -6 * m }, { x: -4 * kc * m, y: 2 * kc, r: 3 * m }, { x: 24 * kc * m, y: -8 * kc, r: 12 * m }] : [{ x: -32 * kc * m, y: 8 * kc, r: -6 * m }, { x: 24 * kc * m, y: -8 * kc, r: 12 * m }];
      from = rest.map((q) => ({ x: q.x, y: q.y + 120 * k, r: q.r, s: 0.92 }));
      const front = cards[cards.length - 1];
      glow = mk("div", `position:absolute;${rtl ? "left" : "right"}:${cw * 0.08}px;top:${cw * 0.08}px;width:${cw * 0.11}px;height:${cw * 0.11}px;border-radius:50%;background:var(--x-accent);box-shadow:0 0 ${cw * 0.08}px ${cw * 0.03}px color-mix(in srgb, var(--x-accent) 55%, transparent);opacity:0;`, front);
    }
    cards.forEach((c, i) => (c.style.zIndex = String(rest[i].z)));

    // timing: the fan rises in 1.4 s, 0.08 s apart; the spread appears, then swings on its cue
    const D = spreadMode ? 0.5 : 1.4;
    const startAt = cards.map((_, i) => at + (spreadMode ? i * 0.08 : order(i) * 0.08));
    const cueAt = spreadMode ? Math.min(at + 0.75, Math.max(at + 0.55, end - 1)) : null;
    const settled = spreadMode ? cueAt + 0.5 : Math.max(...startAt) + D * 0.7;
    ctx.sfx(at + 0.1, "card.fan", 0.45);
    if (spreadMode) ctx.sfx(cueAt, "card", 0.35);
    const goA = Math.max(settled + 0.3, end - 0.25);

    return {
      draw(t) {
        layer.style.visibility = t < at - 1e-6 ? "hidden" : "visible";
        if (own) own.style.opacity = (1 - ML.lin(t, at - 0.15, at + 0.15)).toFixed(4); // the fan stands in for its target
        const leave = ML.clamp((t - goA) / 0.22);
        back.style.opacity = (ML.out(t, at - 0.15, at + 0.15) * (1 - leave)).toFixed(4);
        cards.forEach((c, i) => {
          const a = startAt[i];
          const e = spreadMode ? ML.out(t, a, a + D) : ML.back(t, a, a + D, p.overshoot);
          const F = from[i], Q = rest[i];
          let x = F.x + (Q.x - F.x) * e, y = F.y + (Q.y - F.y) * e, r = F.r + (Q.r - F.r) * e, s = F.s + (Q.s - F.s) * Math.min(1, e);
          if (spreadMode) { const w = ML.out(t, cueAt, cueAt + 0.5); x += (swing[i].x - Q.x) * w; y += (swing[i].y - Q.y) * w; r += (swing[i].r - Q.r) * w; }
          if (p.idle) {
            const on = ML.ease(t, settled, settled + 0.6), P = 3 + ML.rnd(i, 3) * 2, ph = ML.rnd(i, 5) * Math.PI * 2;
            const w = Math.sin((Math.PI * 2 * (t - settled)) / P + ph) * on;
            y += 5 * k * w; r += 1 * Math.sin((Math.PI * 2 * (t - settled)) / (P * 1.3) + ph * 1.7) * on;
          }
          c.style.opacity = (ML.lin(t, a, a + 0.25) * (1 - leave)).toFixed(4);
          c.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${r.toFixed(3)}deg) scale(${s.toFixed(4)})`;
        });
        if (glow) glow.style.opacity = ML.out(t, cueAt + 0.2, cueAt + 0.6).toFixed(4);
      },
    };
  },
});
