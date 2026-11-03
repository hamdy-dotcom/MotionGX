// Price split: on the split word the full price shrinks to 0.86 and fades to 0.45 (origin on its reading-start side,
// 0.4 s power2.out), and its parts (instalments, a discount, a bundle) pop in underneath from scale 0.6 and y −40, one
// every `part_stagger` from split + 0.12 s, each on a card-place sound: a grid repeat(n, 1fr) gap 16, each part a
// panel-2 tile (radius 22, 2 px hair border) with its amount in heavy accent type and a small label. An optional good-
// coloured badge sticker slams onto the card's corner on its own word. Parts default to the price divided evenly.
// Ported from MotionGX's studio engine S.deal (lib/studio-engine/assets/scenes.js).
ML.define({
  id: "data.price-split",
  category: "data",
  name: "Price splits into parts",
  does: "The full price shrinks and fades back while its parts (instalments, discount) drop in underneath.",
  says: ["money", "simplicity", "change"],
  energy: 3,
  targets: ["number", "card"],
  duration: [1.6, 3],
  params: {
    parts: { type: "number", range: [2, 5], default: 3 },
    origin: { type: "choice", options: ["auto", "right", "left"], default: "auto" },
    part_stagger: { type: "number", range: [0.1, 0.25], default: 0.16, unit: "s" },
    badge: { type: "bool", default: false },
    amounts: { type: "text", default: "" },
    labels: { type: "text", default: "" },
    split_word: { type: "text", default: "" },
    badge_text: { type: "text", default: "" },
    badge_word: { type: "text", default: "" },
  },
  pairs: ["data.odometer", "data.falling-price-card"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "card",
  source: { from: "own:lib/studio-engine/assets/scenes.js#S.deal", license: "own", note: "ported from the studio engine's deal scene" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    if (!el) return null;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, text, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const n = Math.round(ML.clamp(p.parts, 2, 5));
    const card = el.querySelector && el.children.length && el.offsetHeight > 200 * k ? el : null; // a card target: split its biggest number
    const priceEl = card ? [...card.querySelectorAll("*")].filter((e) => /\d/.test(e.textContent) && !e.children.length).sort((a, b) => parseFloat(getComputedStyle(b).fontSize) - parseFloat(getComputedStyle(a).fontSize))[0] || card : el;
    const fs = parseFloat(getComputedStyle(priceEl).fontSize) || 88 * k;
    const txt = priceEl.textContent.trim();
    // amounts: given, else the price divided evenly in the same digits and grouping
    const AR = "٠١٢٣٤٥٦٧٨٩", arDigits = /[٠-٩]/.test(txt);
    let amounts = String(p.amounts || "").split("|").map((s) => s.trim()).filter(Boolean);
    if (!amounts.length) {
      // only the first number is the price; whatever stands around it (a currency) stays on every part
      const chunk = txt.match(/[\d٠-٩](?:[\d٠-٩,.٬٫]*[\d٠-٩])?/);
      const num = chunk ? parseFloat(chunk[0].replace(/[٠-٩]/g, (d) => String(AR.indexOf(d))).replace(/٫/g, ".").replace(/[,٬]/g, "")) : NaN;
      if (Number.isFinite(num) && num > 0) {
        const each = num / n, dec = each % 1 ? 2 : 0;
        let s = each.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: /[,٬]/.test(txt) || each >= 10000 });
        if (arDigits) s = s.replace(/\d/g, (d) => AR[+d]).replace(/,/g, "٬").replace(/\./g, "٫");
        amounts = Array.from({ length: n }, () => txt.replace(chunk[0], s));
      } else amounts = Array.from({ length: n }, (_, i) => `${i + 1}/${n}`);
    }
    amounts = Array.from({ length: n }, (_, i) => amounts[i % amounts.length]);
    const given = String(p.labels || "").split("|").map((s) => s.trim()).filter(Boolean);
    const labels = Array.from({ length: n }, (_, i) => given[i] || (rtl ? `الدفعة ${i + 1}` : `Part ${i + 1}`));
    const side = p.origin === "auto" ? (rtl ? "right" : "left") : p.origin;
    // the parts grid, under the price (in the card when the target is one)
    const grid = mk("div", `display:grid;grid-template-columns:repeat(${n},1fr);gap:${(16 * k).toFixed(1)}px;margin-top:${(18 * k).toFixed(1)}px;width:100%;box-sizing:border-box`, null, null);
    if (card) card.append(grid); else el.after(grid);
    const tiles = amounts.map((a, i) => {
      const tile = mk("div", `padding:${(22 * k).toFixed(1)}px ${(10 * k).toFixed(1)}px;border-radius:min(var(--x-radius), ${(22 * k).toFixed(1)}px);background:var(--x-panel-2);border:${Math.max(1, 2 * k).toFixed(1)}px solid var(--x-line);text-align:center;min-width:0;opacity:0`, null, grid);
      const amt = mk("div", `font:var(--x-head-weight) ${(fs * 0.48).toFixed(1)}px/1.1 var(--x-head-font);color:var(--x-accent);white-space:nowrap;direction:${ML.ARABIC.test(a) ? "rtl" : "ltr"};unicode-bidi:isolate`, a, tile);
      mk("div", `font:var(--x-body-weight) ${(fs * 0.28).toFixed(1)}px/1.2 var(--x-body-font);color:var(--x-dim);margin-top:${(6 * k).toFixed(1)}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis`, labels[i], tile);
      return { tile, amt };
    });
    const cellW = (grid.clientWidth - (n - 1) * 16 * k) / n - 20 * k;
    tiles.forEach(({ amt }) => ML.fit(amt, Math.max(40, cellW)));
    // the split time: on its word, else 0.55 s in
    const tSplit = Math.max(at, p.split_word ? ctx.word(p.split_word, at + 0.55) : at + 0.55);
    const times = tiles.map((_, i) => tSplit + 0.12 + i * p.part_stagger);
    times.forEach((tt, i) => ctx.sfx(tt, "card", 0.4 - (i % 2) * 0.05));
    if (getComputedStyle(priceEl).display === "inline") priceEl.style.display = "inline-block"; // scale does nothing on an inline box
    priceEl.style.transformOrigin = `${side} center`;
    let badge = null, tb = 0;
    if (p.badge) {
      const holder = card || el.parentElement || el;
      if (getComputedStyle(holder).position === "static") holder.style.position = "relative";
      badge = mk("div", `position:absolute;top:${(-34 * k).toFixed(1)}px;${side === "right" ? "left" : "right"}:${(30 * k).toFixed(1)}px;padding:${(14 * k).toFixed(1)}px ${(30 * k).toFixed(1)}px;border-radius:var(--x-radius-s);background:var(--x-good);color:var(--x-accent-ink);font:var(--x-head-weight) ${(36 * k).toFixed(1)}px var(--x-head-font);white-space:nowrap;z-index:3;visibility:hidden`, p.badge_text || (rtl ? "من غير فوايد" : "0% interest"), holder);
      const after = times[times.length - 1] + 0.35;
      tb = Math.max(after, p.badge_word ? ctx.word(p.badge_word, after) : after);
      ctx.sfx(tb, "sub", 0.45);
    }
    return {
      draw(t) {
        const u = ML.out(t, tSplit, tSplit + 0.4), gone = 1 - ML.lin(t, end - 0.22, end); // power2.out; everything it added leaves at the end
        priceEl.style.scale = u > 0 ? (1 - 0.14 * u).toFixed(4) : "none";
        priceEl.style.opacity = ((1 - 0.55 * u) * gone).toFixed(4);
        tiles.forEach(({ tile }, i) => {
          const a = times[i], o = ML.lin(t, a, a + 0.15), s = t < a ? 0.6 : 0.6 + 0.4 * ML.back(t, a, a + 0.45, 1.4), e = ML.out(t, a, a + 0.4);
          tile.style.opacity = (o * gone).toFixed(4);
          tile.style.scale = s.toFixed(4);
          tile.style.translate = `0 ${(-40 * k * (1 - e)).toFixed(2)}px`;
        });
        if (badge) {
          const b = ML.out(t, tb, tb + 0.35);
          badge.style.visibility = t >= tb ? "visible" : "hidden";
          badge.style.opacity = (ML.lin(t, tb, tb + 0.12) * gone).toFixed(4);
          badge.style.scale = (1.6 - 0.6 * b).toFixed(4);
          badge.style.rotate = `${(-6 * (1 - b)).toFixed(2)}deg`;
        }
      },
    };
  },
});
