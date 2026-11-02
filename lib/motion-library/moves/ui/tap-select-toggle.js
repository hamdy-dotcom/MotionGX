// Tap to select, previous deselects (studio S.kinds): on each spoken option a pointer glide-clicks to the card's centre
// (+40, +30 px), and the card tweens to the brand fill with accent-ink text and scale 1.06 over 0.25 s back.out(2) while
// the previously selected card goes back to panel / ink at scale 1 over the same 0.25 s. Multi-select (S.plansetup):
// chips in a row are switched on — the first by a full glide-click, the rest by quick 0.16 s pointer hops, a click each,
// chip → ink fill with ground text over 0.15 s — and the selections stay on. The cards are the target's items (or the
// targets), else a grid of option cards / chips of our own in the picture region.
// Source: MotionGX lib/studio-engine/assets/scenes.js S.kinds + S.plansetup (own: cursor / moveClick / tl.to).
ML.define({
  id: "ui.tap-select-toggle",
  category: "ui",
  name: "Tap to select, previous deselects",
  does: "A pointer taps one option card after another; each lights up in the brand colour while the last goes back.",
  says: ["choice", "step", "simplicity"],
  energy: 2,
  targets: ["card", "label", "list", "cursor"],
  duration: [0.5, 3],
  params: {
    mode: { type: "choice", options: ["single", "multi"], default: "single" },
    highlight: { type: "choice", options: ["brand-fill", "ink-fill"], default: "brand-fill" },
    scale: { type: "number", range: [1, 1.06], default: 1.06 },
    picks: { type: "number", range: [1, 6], default: 3 },
    cursor: { type: "bool", default: true },
  },
  pairs: ["ui.cursor-glide-click", "ui.tab-stage-swap", "ui.cta-button-rise"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "click",
  source: { from: "own:lib/studio-engine/assets/scenes.js", license: "own", note: "S.kinds (single select: brand fill + scale 1.06 back.out(2), previous returns) and S.plansetup (multi: glide then 0.16 s hops, ink chips)" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); parent.append(e); return e; };
    const multi = p.mode === "multi";
    const host = ctx.scene || ctx.stage;

    // the options: several targets, or one target's items, else our own
    let cards = [];
    if (ctx.els.length > 1) cards = ctx.els.filter((e) => e !== ctx.stage);
    else if (ctx.el && ctx.el !== ctx.stage && ctx.el.children.length > 1) cards = [...ctx.el.children];
    let built = null;
    if (cards.length < 2) {
      const R = f.pic;
      if (multi) {
        const words = rtl ? ["إنستقرام", "تيك توك", "سناب", "يوتيوب", "إكس", "لينكدإن"] : ["Instagram", "TikTok", "Snapchat", "YouTube", "X", "LinkedIn"];
        built = mk("div", `position:absolute;left:${(R.x + R.w * 0.06).toFixed(1)}px;top:${R.y}px;width:${(R.w * 0.88).toFixed(1)}px;height:${R.h}px;display:flex;flex-wrap:wrap;align-content:center;justify-content:center;gap:${(18 * k).toFixed(1)}px;`, host);
        cards = words.map((w) => mk("span", `padding:${(18 * k).toFixed(1)}px ${(34 * k).toFixed(1)}px;border-radius:var(--x-radius-s);background:var(--x-panel);color:var(--x-ink);border:var(--x-edge) solid var(--x-edge-color);font:600 ${(36 * k).toFixed(1)}px/1.1 var(--x-body-font);white-space:nowrap;`, built, w));
      } else {
        const K = rtl ? ["فيديو", "بوست", "كاروسيل", "ستوري", "غلاف", "نص"] : ["Video", "Post", "Carousel", "Story", "Cover", "Text"];
        const cols = f.wide ? 3 : 2, w = Math.min(R.w, (f.wide ? 1000 : 880) * k);
        built = mk("div", `position:absolute;left:${(R.x + (R.w - w) / 2).toFixed(1)}px;top:${R.y}px;width:${w.toFixed(1)}px;height:${R.h}px;display:grid;grid-template-columns:repeat(${cols},1fr);align-content:center;gap:${(28 * k).toFixed(1)}px;`, host);
        const icons = [
          (s) => { sv("rect", { x: 3, y: 5, width: 18, height: 14, rx: 3, fill: "none", stroke: "currentColor", "stroke-width": 1.8 }, s); sv("path", { d: "M10 9.5 L15 12 L10 14.5 Z", fill: "currentColor" }, s); },
          (s) => { sv("rect", { x: 4, y: 3, width: 16, height: 18, rx: 3, fill: "none", stroke: "currentColor", "stroke-width": 1.8 }, s); sv("circle", { cx: 12, cy: 10, r: 3, fill: "currentColor" }, s); },
          (s) => { sv("rect", { x: 6, y: 4, width: 12, height: 16, rx: 2.5, fill: "none", stroke: "currentColor", "stroke-width": 1.8 }, s); sv("path", { d: "M3 7 V17 M21 7 V17", stroke: "currentColor", "stroke-width": 1.8, "stroke-linecap": "round" }, s); },
          (s) => { sv("rect", { x: 7, y: 2, width: 10, height: 20, rx: 3, fill: "none", stroke: "currentColor", "stroke-width": 1.8 }, s); sv("path", { d: "M10 5 H14", stroke: "currentColor", "stroke-width": 1.8, "stroke-linecap": "round" }, s); },
          (s) => { sv("rect", { x: 2, y: 7, width: 20, height: 10, rx: 2.5, fill: "none", stroke: "currentColor", "stroke-width": 1.8 }, s); },
          (s) => { sv("path", { d: "M5 7 H19 M5 12 H19 M5 17 H13", stroke: "currentColor", "stroke-width": 1.8, "stroke-linecap": "round" }, s); },
        ];
        cards = K.map((l, i) => {
          const c = mk("div", `box-sizing:border-box;padding:${(38 * k).toFixed(1)}px ${(32 * k).toFixed(1)}px;border-radius:var(--x-radius);background:var(--x-panel);color:var(--x-ink);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);display:flex;flex-direction:column;align-items:flex-start;gap:${(18 * k).toFixed(1)}px;`, built);
          c.dir = rtl ? "rtl" : "ltr";
          const s = sv("svg", { viewBox: "0 0 24 24", width: (74 * k).toFixed(1), height: (74 * k).toFixed(1) }, c);
          icons[i](s);
          mk("div", `font:600 ${(40 * k).toFixed(1)}px/1.1 var(--x-head-font);`, c, l);
          return c;
        });
      }
    }
    cards.forEach((c) => { if (getComputedStyle(c).position === "static") c.style.position = "relative"; c.style.transformOrigin = "50% 50%"; });
    const bg0 = cards.map((c) => getComputedStyle(c).backgroundColor), fg0 = cards.map((c) => c.style.color);
    const centres = cards.map((c) => { const b = ctx.box(c); return { x: b.x + b.w / 2, y: b.y + b.h / 2, w: b.w, h: b.h }; });
    const fill = p.highlight === "ink-fill" ? "var(--x-ink)" : "var(--x-accent)";
    const fillInk = fill === "var(--x-ink)" ? "var(--x-ground)" : "var(--x-accent-ink)";

    // which cards and when: one after another on their spoken names (single), or a glide then quick hops (multi)
    const nPick = Math.max(1, Math.min(cards.length, Math.round(p.picks)));
    const order = Array.from({ length: nPick }, (_, i) => i);
    const glide = 0.45, hop = 0.16;
    const times = [];
    const first = at + 0.25 + glide;
    if (multi) order.forEach((_, n) => times.push(first + n * 0.18));
    else {
      const gap = ML.clamp((end - first - 0.4) / Math.max(1, nPick - 1), 0.55, 1.1);
      order.forEach((ci, n) => {
        const fb = first + n * gap, w = (cards[ci].textContent || "").trim().split(/\s+/)[0];
        times.push(n === 0 ? Math.max(first, Math.min(fb + 0.3, ctx.word(w, fb))) : Math.max(times[n - 1] + glide + 0.1, ctx.word(w, fb)));
      });
    }
    while (times.length > 1 && times[times.length - 1] > end - 0.3) { times.pop(); order.pop(); }
    times.forEach((s) => ctx.sfx(s - 0.011, "click", multi ? 0.45 : 0.55));
    const off = { x: 40 * k * (rtl ? -1 : 1) * 0.6, y: 30 * k * 0.6 };
    const start = { x: rtl ? f.W * 0.18 : f.W * 0.82, y: f.H * 0.95 };
    const aim = order.map((ci) => ({ x: centres[ci].x + Math.min(off.x, centres[ci].w * 0.3), y: centres[ci].y + Math.min(off.y, centres[ci].h * 0.3) }));
    const inOut = (x) => (x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2); // power3.inOut
    const backOut = (x, c = 2) => { const y = x - 1; return 1 + (c + 1) * y * y * y + c * y * y; };

    // the pointer (mac arrow, tip anchored)
    const cs = 56 * k;
    const cur = p.cursor ? mk("div", "position:absolute;left:0;top:0;z-index:9;pointer-events:none;", host) : null;
    let arrow = null;
    if (cur) {
      arrow = sv("svg", { viewBox: "0 0 24 24", width: cs.toFixed(1), height: cs.toFixed(1) }, cur);
      arrow.style.cssText = `position:absolute;left:${(-(5 / 24) * cs).toFixed(1)}px;top:${(-(2 / 24) * cs).toFixed(1)}px;overflow:visible;transform-origin:${((5 / 24) * cs).toFixed(1)}px ${((2 / 24) * cs).toFixed(1)}px;filter:drop-shadow(0 ${(4 * k).toFixed(1)}px ${(7 * k).toFixed(1)}px color-mix(in srgb, var(--x-ink) 30%, transparent));`;
      sv("path", { d: "M5 2 L5 19 L9.5 15.5 L12.5 22 L15.5 20.5 L12.5 14 L18.5 14 Z", fill: "var(--x-pointer)", stroke: "var(--x-pointer-edge)", "stroke-width": 1.6, "stroke-linejoin": "round" }, arrow);
    }
    const pointerAt = (t) => {
      let from = start, to = aim[0], a = times[0] - glide, b = times[0];
      for (let n = 1; n < times.length; n++) if (t >= times[n - 1]) { from = aim[n - 1]; to = aim[n]; b = times[n]; a = b - (multi ? hop : glide); }
      const u = inOut(ML.lin(t, a, b));
      return { x: from.x + (to.x - from.x) * u, y: from.y + (to.y - from.y) * u };
    };

    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.25, end);
        if (built) built.style.opacity = (ML.lin(t, at - 0.2, at + 0.15) * (1 - leave)).toFixed(4);
        // selection state per card
        cards.forEach((c, ci) => {
          const n = order.indexOf(ci);
          let a = 0, s = 1;
          if (n >= 0 && t >= times[n]) {
            if (multi) a = ML.lin(t, times[n], times[n] + 0.15);
            else {
              const u = ML.lin(t, times[n], times[n] + 0.25), bo = backOut(u);
              const next = times[n + 1];
              const back = next != null && t >= next ? ML.ease(t, next, next + 0.25) : 0;
              a = Math.min(1, u * 1.6) * (1 - back);
              s = 1 + (p.scale - 1) * bo * (1 - back);
            }
          }
          c.style.backgroundColor = a > 0 ? `color-mix(in srgb, ${fill} ${(a * 100).toFixed(1)}%, ${bg0[ci]})` : "";
          c.style.color = a > 0.5 ? fillInk : fg0[ci];
          c.style.scale = s === 1 ? "none" : s.toFixed(4);
          c.style.zIndex = s > 1 ? "2" : "";
        });
        if (cur) {
          const q = pointerAt(t);
          const lastT = times[times.length - 1];
          const vis = ML.lin(t, times[0] - glide - 0.2, times[0] - glide) * (1 - ML.lin(t, lastT + 0.5, lastT + 0.8)) * (1 - leave);
          cur.style.opacity = vis.toFixed(4);
          cur.style.transform = `translate(${q.x.toFixed(2)}px, ${q.y.toFixed(2)}px)`;
          let squash = 1;
          for (const s of times) if (t >= s && t < s + 0.14) squash = 1 - 0.12 * Math.sin((Math.PI * (t - s)) / 0.14);
          arrow.style.transform = squash === 1 ? "none" : `scale(${squash.toFixed(4)})`;
        }
      },
    };
  },
});
