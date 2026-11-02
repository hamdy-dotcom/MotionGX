// Hand card lifts and enlarges to inspect: a hand row of five small cards (56 × 70 in the reference); the hovered card
// rises 30 px and scales to ~1.9 from its foot, above its neighbours, with a 2 px accent border — smoothly (power2.out
// 0.2 s) or in three hard steps (steps(3) over 0.15 s, the pixel-art feel); a description panel (paper ground, 2 px ink
// border) appears inside, above or beside it; then it drops back (reverse, 0.12 s).
// Source: prompt-motion aisongman "this is insane i" (reference only — our own rebuild).
ML.define({
  id: "ui.card-hover-inspect",
  category: "ui",
  name: "Hand card lifts and enlarges to inspect",
  does: "A card in a hand row lifts up, scales to ~2x with a tooltip panel showing its details, then drops back.",
  says: ["choice", "focus", "playful"],
  energy: 3,
  targets: ["card", "list"],
  duration: [0.6, 1.5],
  params: {
    motion: { type: "choice", options: ["smooth", "stepped"], default: "smooth" },
    tooltip_side: { type: "choice", options: ["inside", "right", "left", "above"], default: "above" },
    scale: { type: "number", range: [1.5, 2.2], default: 1.9 },
    card: { type: "number", range: [1, 5], default: 3 },
    drop_back: { type: "bool", default: true },
    title: { type: "text" },
    detail: { type: "text" },
  },
  pairs: ["ui.card-drop-to-slot"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "card",
  source: { from: "prompt-motion:aisongman-this-is-insane-i", license: "reference", note: "our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const R = f.pic;
    const k = Math.min(f.W, f.H) / 1080;
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;`, host);
    const N = 5, S = ML.clamp(p.scale, 1.5, 2.2);
    const hi = Math.round(ML.clamp(p.card, 1, 5)) - 1;
    const side0 = p.tooltip_side;
    const side = rtl && side0 === "left" ? "right" : rtl && side0 === "right" ? "left" : side0; // beside = toward the reading end
    // size: the lifted card (and an "above" panel) must fit the region
    const cw = Math.min((R.w * 0.9) / (N + (N - 1) * 0.15), (R.h * 0.62) / (1.25 * S + 0.55), 190 * k), ch = cw * 1.25;
    const gap = cw * 0.15, lift = (30 / 70) * ch;
    const rowW = N * cw + (N - 1) * gap, x0 = (R.w - rowW) / 2, baseY = R.h * 0.88;
    const bw = Math.max(2, (2 / 56) * cw);
    const GLYPH = ["M50 14 L86 50 L50 86 L14 50 Z", "M50 12 A38 38 0 1 0 50.1 12 Z", "M50 12 L88 84 L12 84 Z", "M22 22 H78 V78 H22 Z", "M50 10 L61 38 L92 40 L68 60 L76 90 L50 73 L24 90 L32 60 L8 40 L39 38 Z"];
    const cards = [];
    for (let i = 0; i < N; i++) {
      const j = rtl ? N - 1 - i : i;
      const c = mk("div", `position:absolute;left:${x0 + j * (cw + gap)}px;top:${baseY - ch}px;width:${cw}px;height:${ch}px;box-sizing:border-box;border-radius:${(cw * 0.1).toFixed(1)}px;background:var(--x-panel);border:${bw}px solid var(--x-ink);transform-origin:50% 100%;overflow:hidden;`, layer);
      const face = mk("div", `position:absolute;left:10%;right:10%;top:8%;height:60%;border-radius:${(cw * 0.06).toFixed(1)}px;background:color-mix(in srgb, var(--x-accent) ${Math.round(50 + ML.rnd(i, 3) * 50)}%, var(--x-accent-2));display:grid;place-items:center;`, c);
      face.innerHTML = `<svg viewBox="0 0 100 100" width="${(cw * 0.45).toFixed(1)}" height="${(cw * 0.45).toFixed(1)}"><path d="${GLYPH[i]}" fill="var(--x-accent-ink)"/></svg>`;
      mk("div", `position:absolute;left:0;right:0;bottom:6%;text-align:center;font:700 ${(cw * 0.16).toFixed(1)}px var(--x-label-font);color:var(--x-ink);`, c, String(i + 1));
      c.__veil = mk("div", "position:absolute;inset:0;background:var(--x-ground);opacity:0;", c);
      cards.push(c);
    }
    const card = cards[hi], jHi = rtl ? N - 1 - hi : hi;
    card.style.zIndex = "3";
    // the highlight border sits on top of the card's own (accent, 2 px)
    const ringEl = mk("div", `position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 ${bw}px var(--x-accent);`, card);

    // tooltip: in layer coordinates around the lifted card's box
    const title = p.title || (rtl ? "ضربة سريعة" : "Swift strike");
    const detail = p.detail || (rtl ? "تسحب بطاقة وتضاعف النقاط" : "Draw a card. Double your points.");
    const cx = x0 + jHi * (cw + gap) + cw / 2;
    const bigW = cw * S, bigH = ch * S, bigTop = baseY - lift - bigH;
    const tipW = side === "inside" ? bigW * 0.86 : Math.min(R.w * 0.86, Math.max(bigW * 1.2, cw * 3));
    const fs = Math.max(14 * k, cw * 0.17);
    const tip = mk("div", `position:absolute;width:${tipW}px;box-sizing:border-box;padding:${fs * 0.6}px ${fs * 0.75}px;background:var(--x-panel-2);border:${bw}px solid var(--x-ink);border-radius:${(cw * 0.06).toFixed(1)}px;color:var(--x-ink);z-index:4;`, layer);
    mk("div", `font:700 ${(fs * 1.05).toFixed(1)}px/1.2 ${rtl ? "var(--x-body-font)" : "var(--x-label-font)"};text-transform:var(--x-label-case);letter-spacing:${rtl ? 0 : 0.04}em;margin-bottom:${fs * 0.3}px;`, tip, title);
    mk("div", `font:400 ${fs.toFixed(1)}px/1.35 var(--x-body-font);color:var(--x-dim);`, tip, detail);
    const th = tip.offsetHeight;
    let tx, ty;
    if (side === "inside") { tx = cx - tipW / 2; ty = baseY - lift - th - bigH * 0.06; }
    else if (side === "above") { tx = cx - tipW / 2; ty = bigTop - th - fs * 0.6; }
    else if (side === "right") { tx = cx + bigW / 2 + fs * 0.6; ty = bigTop + bigH * 0.1; }
    else { tx = cx - bigW / 2 - fs * 0.6 - tipW; ty = bigTop + bigH * 0.1; }
    tx = ML.clamp(tx, 0, R.w - tipW); ty = ML.clamp(ty, 0, R.h - th);
    tip.style.left = tx + "px"; tip.style.top = ty + "px";

    // timing
    const tUp = at + 0.15, upDur = p.motion === "stepped" ? 0.15 : 0.2;
    const tDown = p.drop_back ? Math.max(tUp + upDur + 0.35, end - 0.5) : Infinity;
    const stepped = (t, a, b) => Math.min(1, Math.floor(ML.lin(t, a, b) * 3 + 1e-6) / 3);
    const curve = (t, a, b) => (p.motion === "stepped" ? stepped(t, a, b) : 1 - Math.pow(1 - ML.lin(t, a, b), 2));
    ctx.sfx(tUp, "card", 0.4);
    if (Number.isFinite(tDown)) ctx.sfx(tDown, "tap", 0.25);

    return {
      draw(t) {
        const appear = ML.show(layer, t, at - 0.05, end - 0.15, { kind: "fade", dur: 0.12 });
        if (!appear && t < at) return;
        const u = curve(t, tUp, tUp + upDur) * (1 - (Number.isFinite(tDown) ? curve(t, tDown, tDown + 0.12) : 0));
        card.style.transform = `translateY(${(-lift * u).toFixed(2)}px) scale(${(1 + (S - 1) * u).toFixed(4)})`;
        ringEl.style.opacity = u > 0 ? "1" : "0";
        cards.forEach((c, i) => { if (i !== hi) c.__veil.style.opacity = (0.4 * u).toFixed(4); });
        const tipU = p.motion === "stepped" ? (u >= 1 ? 1 : 0) : ML.lin(u, 0.6, 1);
        tip.style.opacity = tipU.toFixed(4);
        tip.style.translate = `0 ${((1 - tipU) * fs * 0.4).toFixed(2)}px`;
      },
    };
  },
});
