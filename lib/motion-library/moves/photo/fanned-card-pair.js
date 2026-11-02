// Fanned card pair with a glass card: photo cards spread from a stack and tilt apart like a fan — left -8 deg, right
// +8 deg, offset +-60 px (at a 240 px card; scaled to the card), overlapping in z — with a frosted glass card in front
// (the panel at 25 % over a backdrop blur of 14 px, a light icon) and pins on either side: a small accent asterisk and
// a label that fade in 0.15 s after the cards start spreading. Enter: the cards spread from stacked over 0.5 s on
// power3.out. The three-card variant adds an upright centre card. RTL: the first card sits on the right.
// Cards show the scene's pictures (different crops of one picture when there is only one), never past their pixels.
// Source: prompt-motion twoclipping d89be5 (reference only: rebuilt as our own code).
ML.define({
  id: "photo.fanned-card-pair",
  category: "photo",
  name: "Fanned card pair with glass card",
  does: "Photo cards spread from a stack and tilt apart like a fan, a frosted glass card in front and labels pinned on either side.",
  says: ["choice", "before-after", "luxury"],
  energy: 3,
  targets: ["image", "card"],
  duration: [1, 3],
  params: {
    cards: { type: "choice", options: ["2", "3"], default: "2" },
    spread_angle: { type: "number", range: [4, 16], default: 8, unit: "deg" },
    offset: { type: "number", range: [30, 120], default: 60, unit: "px" },
    glass: { type: "bool", default: true },
    labels: { type: "bool", default: true },
    label_1: { type: "text", default: "" },
    label_2: { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "photo.stack-fan"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "card.fan",
  source: { from: "prompt-motion:twoclipping-d89be5", license: "reference", note: "rebuilt as our own code" },
  async setup(ctx) {
    const { el, p, at, end, f } = ctx;
    if (!el) return null;
    const host = ctx.scene || ctx.stage;
    const pics = [...new Set([...(ctx.els || []), el].map((e) => (e.tagName === "IMG" ? e : e.querySelector && e.querySelector("img"))).filter(Boolean))];
    await Promise.all(pics.map((x) => x.decode().catch(() => null)));
    const mk = (tag, css, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (parent) parent.append(e); return e; };
    const b = ctx.box(el), k = f.W / 1080;
    // the fan sits on the target, sized from the picture region (cards 3:4)
    const region = f.pic;
    const cw = Math.min(region.w * (f.wide ? 0.24 : 0.36), region.h * 0.62 * 0.75), chh = cw / 0.75;
    const cx = b.x + b.w / 2, cy = ML.clamp(b.y + b.h / 2, chh / 2 + 20 * k, f.H - chh / 2 - 20 * k);
    const layer = mk("div", `position:absolute;left:0;top:0;width:${f.W}px;height:${f.H}px;pointer-events:none;visibility:hidden;z-index:4`, host);
    const three = p.cards === "3", n = three ? 3 : 2;
    const dirX = ctx.rtl ? -1 : 1, off = p.offset * (cw / 240);
    // poses: [x offset, rotation, z]; order of narrative = reading order
    const poses = three ? [[-off * 1.5, -p.spread_angle, 1], [0, 0, 2], [off * 1.5, p.spread_angle, 1]] : [[-off, -p.spread_angle, 1], [off, p.spread_angle, 2]];
    const cards = poses.map(([x, r, z], i) => {
      const card = mk("div", `position:absolute;left:${cx - cw / 2}px;top:${cy - chh / 2}px;width:${cw}px;height:${chh}px;border-radius:var(--x-pic-radius);overflow:hidden;box-shadow:var(--x-shadow);background:var(--x-panel-2);z-index:${z};border:${Math.max(2, 6 * k)}px solid var(--x-panel);box-sizing:border-box;transform-origin:50% 85%`, layer);
      if (pics.length) {
        const img = pics[i % pics.length].cloneNode(true);
        img.removeAttribute("data-slot"); img.removeAttribute("data-slot-sample");
        const pos = pics.length > 1 ? "50% 50%" : `${[22, 50, 78][three ? i : i * 2]}% 50%`;
        img.style.cssText = `position:absolute;inset:0;width:100%;height:100%;max-width:none;margin:0;border-radius:0;object-fit:cover;object-position:${pos};filter:var(--x-pic-filter)`;
        card.append(img);
      }
      return { card, x: x * dirX, r: r * dirX };
    });
    // the glass card in front, low on the stack
    let glass = null;
    if (p.glass) {
      const gw = cw * 0.5;
      glass = mk("div", `position:absolute;left:${cx - gw / 2}px;top:${cy + chh * 0.18}px;width:${gw}px;height:${gw * 0.78}px;border-radius:calc(var(--x-pic-radius) * 0.8);background:color-mix(in srgb, var(--x-panel) 25%, transparent);backdrop-filter:blur(${(14 * k * 1.4).toFixed(1)}px);-webkit-backdrop-filter:blur(${(14 * k * 1.4).toFixed(1)}px);border:${Math.max(1, 2 * k)}px solid color-mix(in srgb, var(--x-panel) 45%, transparent);box-shadow:var(--x-shadow);z-index:5;display:flex;align-items:center;justify-content:center`, layer);
      const ic = gw * 0.34;
      glass.innerHTML = `<svg viewBox="0 0 24 24" width="${ic}" height="${ic}" fill="none" stroke="var(--x-panel)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>`;
    }
    // pins either side: an accent asterisk + a label
    const pins = [];
    if (p.labels) {
      const names = [p.label_1 || (ctx.rtl ? "الأول" : "Option A"), p.label_2 || (ctx.rtl ? "التاني" : "Option B")];
      const fs = Math.max(18, 28 * k);
      [-1, 1].forEach((side, i) => {
        const pin = mk("div", `position:absolute;top:${cy - chh * 0.42}px;display:flex;align-items:center;gap:${fs * 0.4}px;padding:${fs * 0.45}px ${fs * 0.8}px;border-radius:var(--x-radius-s);background:var(--x-panel);box-shadow:var(--x-shadow);font:var(--x-label-weight) ${fs}px/1 var(--x-body-font);color:var(--x-ink);white-space:nowrap;z-index:6`, layer);
        const star = mk("span", `display:inline-flex;width:${fs}px;height:${fs}px`, pin);
        star.innerHTML = `<svg viewBox="0 0 20 20" width="100%" height="100%"><path d="M10 1.5v17M2.6 5.75l14.8 8.5M2.6 14.25l14.8-8.5" stroke="var(--x-accent)" stroke-width="3.2" stroke-linecap="round"/></svg>`;
        const txt = mk("span", "", pin); txt.textContent = names[i];
        const reach = Math.abs(poses[0][0]) + cw * 0.5;
        const sx = side * dirX; // reading order: the first label by the first card
        const pw = pin.offsetWidth;
        const x = sx < 0 ? cx - reach - pw * 0.55 : cx + reach - pw * 0.45;
        pin.style.left = ML.clamp(x, 12 * k, f.W - pw - 12 * k) + "px";
        if (i === 1) pin.style.top = cy + chh * 0.22 + "px";
        pins.push({ pin, sx });
      });
    }
    const spread = 0.5, t1 = at + 0.08;
    ctx.sfx(t1, "card.fan", 0.35);
    if (p.labels) ctx.sfx(t1 + 0.15 + 0.2, "pop.soft", 0.18);
    const sharp = el;
    return {
      draw(t) {
        const on = t >= at - 1e-6 && t < end;
        layer.style.visibility = on ? "visible" : "hidden";
        sharp.style.visibility = on ? "hidden" : "";
        if (!on) return;
        const leave = ML.lin(t, end - 0.25, end);
        layer.style.opacity = (1 - leave).toFixed(4);
        const appear = ML.ease(t, at, at + 0.16);
        const u = ML.out(t, t1, t1 + spread);
        for (const c of cards) {
          c.card.style.opacity = appear.toFixed(4);
          c.card.style.transform = `translate(${(c.x * u).toFixed(2)}px, ${((1 - appear) * 30 * k).toFixed(2)}px) rotate(${(c.r * u).toFixed(3)}deg)`;
        }
        if (glass) {
          const g = ML.out(t, t1 + 0.1, t1 + 0.1 + spread);
          glass.style.opacity = g.toFixed(4);
          glass.style.transform = `translateY(${((1 - g) * 24 * k).toFixed(2)}px)`;
        }
        for (const { pin, sx } of pins) {
          const l = ML.out(t, t1 + 0.15, t1 + 0.15 + 0.4);
          pin.style.opacity = l.toFixed(4);
          pin.style.transform = `translateX(${((1 - l) * -sx * 18 * k).toFixed(2)}px)`;
        }
      },
    };
  },
});
