// Card plays into an empty slot: a hand of cards waits at the foot of the board; the played card lifts out and travels
// to the highlighted empty slot along a slight arc (or straight) in `travel` s power2.inOut, scaling 1 → 0.8; the slot's
// outline and its ellipse glow brighten as it nears; on landing a two-frame squash (scaleY 0.9) and a few dust specks
// puff from its foot. The rest of the hand closes the gap.
// Source: prompt-motion aisongman "this is insane i" (reference only — our own rebuild).
ML.define({
  id: "ui.card-drop-to-slot",
  category: "ui",
  name: "Card plays into an empty slot",
  does: "A card from the hand glides to a highlighted empty slot on the board and settles.",
  says: ["step", "result"],
  energy: 2,
  targets: ["card"],
  duration: [0.8, 2],
  params: {
    path: { type: "choice", options: ["arc", "straight"], default: "arc" },
    dust: { type: "bool", default: true },
    travel: { type: "number", range: [0.2, 0.6], default: 0.3, unit: "s" },
    hand: { type: "number", range: [1, 5], default: 4 },
  },
  pairs: ["ui.card-hover-inspect"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "card",
  source: { from: "prompt-motion:aisongman-this-is-insane-i", license: "reference", note: "our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const own = !ctx.el || ctx.el === ctx.stage || ctx.el.namespaceURI !== "http://www.w3.org/1999/xhtml" || ctx.el.tagName === "IMG" || ctx.el.clientWidth < 300 || ctx.el.clientHeight < 300;
    const picSlot = own && ctx.scene ? ctx.scene.querySelector(".ml-pic") : null; // the board takes over the picture band
    const host = own ? ctx.scene || ctx.stage : ctx.el;
    if (!own && getComputedStyle(host).position === "static") host.style.position = "relative";
    const R = own ? f.pic : { x: 0, y: 0, w: host.clientWidth, h: host.clientHeight };
    const k = Math.min(f.W, f.H) / 1080;
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;`, host);
    const n = Math.round(ML.clamp(p.hand, 1, 5));

    // card size: the hand row fits the width, the slot + hand fit the height
    const cw = Math.min((R.w * 0.86) / (n + (n - 1) * 0.12), R.h / 2.5 / 1.4, 240 * k), ch = cw * 1.4;
    const gap = cw * 0.12, cardR = `calc(min(var(--x-radius), ${(cw * 0.12).toFixed(1)}px))`;
    const handY = R.h - ch - R.h * 0.04;
    const rowW = n * cw + (n - 1) * gap;
    const xAt = (i, count) => { const w = count * cw + (count - 1) * gap, x0 = (R.w - w) / 2; const j = rtl ? count - 1 - i : i; return x0 + j * (cw + gap); };

    // the board's slots: one empty slot (target) with neighbours
    const sw = cw * 0.8, sh = ch * 0.8;
    const slotY = Math.max(R.h * 0.06, handY - sh - Math.max(R.h * 0.12, ch * 0.35));
    const slotX = (R.w - sw) / 2;
    const glow = mk("div", `position:absolute;left:${slotX - sw * 0.25}px;top:${slotY + sh - sh * 0.12}px;width:${sw * 1.5}px;height:${sh * 0.3}px;border-radius:50%;background:radial-gradient(closest-side, color-mix(in srgb, var(--x-accent) 55%, transparent), transparent);`, layer);
    const ell = mk("div", `position:absolute;left:${slotX - sw * 0.1}px;top:${slotY + sh - sh * 0.07}px;width:${sw * 1.2}px;height:${sh * 0.16}px;border-radius:50%;box-sizing:border-box;border:${Math.max(2, 3 * k)}px solid var(--x-accent);`, layer);
    const slot = mk("div", `position:absolute;left:${slotX}px;top:${slotY}px;width:${sw}px;height:${sh}px;box-sizing:border-box;border-radius:${cardR};border:${Math.max(2, 3 * k)}px dashed var(--x-accent);background:color-mix(in srgb, var(--x-accent) 6%, transparent);`, layer);
    for (const side of [-1, 1]) {
      const x = slotX + side * (sw + gap * 2);
      if (x < 0 || x + sw > R.w) continue;
      const nb = mk("div", `position:absolute;left:${x}px;top:${slotY}px;width:${sw}px;height:${sh}px;box-sizing:border-box;border-radius:${cardR};border:${Math.max(1, 2 * k)}px solid var(--x-line);background:var(--x-panel-2);`, layer);
      mk("div", `position:absolute;inset:18%;border-radius:50%;background:color-mix(in srgb, var(--x-ink) 8%, transparent);`, nb);
    }

    // the hand
    const GLYPH = ["M50 14 L86 50 L50 86 L14 50 Z", "M50 12 A38 38 0 1 0 50.1 12 Z", "M50 12 L88 84 L12 84 Z", "M20 20 H80 V80 H20 Z", "M50 10 L61 38 L92 40 L68 60 L76 90 L50 73 L24 90 L32 60 L8 40 L39 38 Z"];
    const card = (i) => {
      const c = mk("div", `position:absolute;left:0;top:0;width:${cw}px;height:${ch}px;box-sizing:border-box;border-radius:${cardR};background:var(--x-panel);border:${Math.max(1, 2 * k)}px solid var(--x-edge-color);box-shadow:var(--x-shadow);overflow:hidden;transform-origin:50% 100%;`, layer);
      const face = mk("div", `position:absolute;left:8%;right:8%;top:6%;height:62%;border-radius:calc(${cardR} * 0.7);background:linear-gradient(160deg, var(--x-accent), color-mix(in srgb, var(--x-accent-2) ${Math.round(40 + ML.rnd(i, 2) * 60)}%, var(--x-ink)));display:grid;place-items:center;position:absolute;`, c);
      face.innerHTML = `<svg viewBox="0 0 100 100" width="${(cw * 0.42).toFixed(1)}" height="${(cw * 0.42).toFixed(1)}"><path d="${GLYPH[i % GLYPH.length]}" fill="var(--x-accent-ink)" opacity=".92"/></svg>`;
      mk("div", `position:absolute;left:10%;right:10%;bottom:16%;height:${(ch * 0.04).toFixed(1)}px;border-radius:99px;background:color-mix(in srgb, var(--x-ink) 18%, transparent);`, c);
      mk("div", `position:absolute;left:10%;width:50%;bottom:8%;height:${(ch * 0.04).toFixed(1)}px;border-radius:99px;background:color-mix(in srgb, var(--x-ink) 10%, transparent);`, c);
      mk("div", `position:absolute;top:6%;inset-inline-start:8%;font:700 ${(cw * 0.12).toFixed(1)}px/1 var(--x-label-font);color:var(--x-accent-ink);`, face, String(i + 2));
      return c;
    };
    const played = Math.floor((n - 1) / 2);
    const hand = Array.from({ length: n }, (_, i) => card(i));
    hand[played].style.zIndex = "2";

    // timing
    const D = end - at, tGo = at + Math.min(0.12, D * 0.1), tLand = tGo + Math.min(p.travel, D * 0.42), tSquash = tLand + 2 / 30; // the card always lands and rests before the leave
    const p2 = (t, a, b) => { const x = ML.lin(t, a, b); return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
    const from = { x: xAt(played, n), y: handY }, to = { x: slotX - (cw - sw) / 2, y: slotY - (ch - sh) };
    const lift = ch * 0.08;
    const DUST = p.dust ? Array.from({ length: 10 }, (_, i) => {
      const s = (3 + ML.rnd(i, 4) * 5) * k * 1.6;
      return { el: mk("div", `position:absolute;left:0;top:0;width:${s}px;height:${s}px;border-radius:50%;background:var(--x-dim);`, layer), side: i % 2 ? 1 : -1, sp: 0.4 + ML.rnd(i, 8), up: 0.2 + ML.rnd(i, 6) * 0.8 };
    }) : [];
    ctx.sfx(tGo, "tap", 0.2);
    ctx.sfx(tLand, "card", 0.5);

    return {
      draw(t) {
        const appear = ML.show(layer, t, at - 0.05, end - 0.22, { kind: "fade", dur: 0.12 });
        if (picSlot) picSlot.style.opacity = t >= at - 0.05 && t < end ? (1 - ML.lin(t, at - 0.05, at + 0.07) * (1 - ML.lin(t, end - 0.22, end))).toFixed(4) : "";
        if (!appear && t < at) return;
        const u = p2(t, tGo, tLand);
        const arc = p.path === "arc" ? Math.sin(Math.PI * u) * Math.min(R.w * 0.12, cw * 0.8) * (rtl ? 1 : -1) : 0;
        const pre = ML.out(t, at, tGo) * (1 - u);
        const x = from.x + (to.x - from.x) * u + arc * 0.6, y = from.y + (to.y - from.y) * u - lift * pre - Math.sin(Math.PI * u) * ch * 0.12;
        const sq = t >= tLand && t < tSquash ? 0.9 : 1;
        const s = 1 - 0.2 * u;
        const c = hand[played];
        c.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${(arc / cw * 8).toFixed(2)}deg) scale(${s.toFixed(4)}, ${(s * sq).toFixed(4)})`;
        // the rest close the gap after the card leaves
        const close = ML.ease(t, tGo + 0.05, tLand + 0.2);
        let j = 0;
        hand.forEach((h, i) => {
          if (i === played) return;
          const a = xAt(i, n), b = xAt(j++, Math.max(1, n - 1));
          h.style.transform = `translate(${(a + (b - a) * close).toFixed(2)}px, ${handY.toFixed(2)}px)`;
        });
        // the slot brightens as the card nears, then settles under it
        const near = ML.lin(t, tGo, tLand) * (1 - 0.5 * ML.lin(t, tLand + 0.1, tLand + 0.5));
        slot.style.opacity = (0.45 + 0.55 * near).toFixed(4);
        ell.style.opacity = (0.3 + 0.7 * near).toFixed(4);
        glow.style.opacity = near.toFixed(4);
        glow.style.scale = (0.85 + 0.15 * near).toFixed(4);
        // dust from the card's foot
        const d = ML.lin(t, tLand, tLand + 0.4);
        DUST.forEach((q) => {
          const on = t >= tLand && d < 1;
          q.el.style.opacity = on ? ((1 - d) * 0.8).toFixed(4) : "0";
          if (!on) return;
          const dx = q.side * (sw * 0.45 + d * sw * 0.5 * q.sp), dy = -d * sh * 0.18 * q.up + d * d * sh * 0.08;
          q.el.style.transform = `translate(${(slotX + sw / 2 + dx).toFixed(2)}px, ${(slotY + sh + dy - 6 * k).toFixed(2)}px)`;
        });
      },
    };
  },
});
