// Blur rise into focus: items rise from y +distance while coming into focus from blur(blur px), one after another.
// Group (MengTo initScrollReveals): fromTo { y 36, autoAlpha 0, blur(8px) } → { y 0, autoAlpha 1, blur(0) }, 0.95 s
// power4.out, stagger 0.075 s. Card content: the card shape settles first (0.3 s), then its rows come in top to bottom
// at y 6, blur 10 px, 0.35 s power2.out, stagger 0.05 s — the same params scaled down for the small scope. Exit
// "reverse": the items go back down into blur in 0.2 s, last first. Pictures never blur (they rise and fade only); the
// last frame is fully sharp (filter none).
// Source: MengTo/Skills web-design/cinematic-gsap-lenis-motion-system SKILL.md initScrollReveals (MIT) + prompt-motion
// "twoclipping-opus-5-5-is-f-cking" (the in-card variant, reference only).
ML.define({
  id: "element.blur-rise",
  category: "element",
  name: "Blur rise into focus",
  does: "Items rise while coming into focus from a blur, one after another; also used for a card's content after the card shape settles.",
  says: ["luxury", "reveal", "calm"],
  energy: 2,
  targets: ["card", "list", "image", "headline", "line"],
  duration: [0.5, 2],
  params: {
    distance: { type: "number", range: [0, 40], default: 24, unit: "px" },
    blur: { type: "number", range: [4, 12], default: 8, unit: "px" },
    duration: { type: "number", range: [0.3, 1], default: 0.9, unit: "s" },
    stagger: { type: "number", range: [0.04, 0.12], default: 0.075, unit: "s" },
    scope: { type: "choice", options: ["group", "card-content"], default: "group" },
    exit: { type: "choice", options: ["reverse", "none"], default: "none" },
  },
  pairs: ["text-in.punchline", "element.glass-panel-in", "camera.slow-push"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:agent-skills/web-design/cinematic-gsap-lenis-motion-system", license: "MIT", note: "initScrollReveals group reveal; card-content variant rebuilt from prompt-motion twoclipping-opus-5-5-is-f-cking (reference only)" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const inCard = p.scope === "card-content";

    // the items: the target's children, its words (a line of text), the target alone (a picture), or a built group / card
    let items = [], shell = null, layer = null, back = null;
    if (own) {
      const kids = [...own.children].filter((c) => c.getBoundingClientRect().width > 0);
      if (own.tagName === "IMG" || own.tagName === "svg") items = [own];
      else if (kids.length > 1) items = kids;
      else items = ML.split(own, "words");
      if (inCard && own.classList.contains("ml-panel")) shell = own;
    } else {
      const cx0 = Math.max(0, f.pic.x - 48 * k), cy0 = f.pic.y, cw0 = Math.min(f.W - cx0, f.pic.w + 96 * k), ch0 = Math.min(f.H - cy0, f.pic.h + 72 * k);
    back = mk("div", `position:absolute;left:${cx0}px;top:${cy0}px;width:${cw0}px;height:${ch0}px;background:var(--x-ground);background-image:var(--x-ground-image);background-size:${f.W}px ${f.H}px;background-position:${-cx0}px ${-cy0}px;pointer-events:none;z-index:5;opacity:0;`, host); // clears the region the built piece takes, shadows included
      const R = f.pic, w = Math.min(R.w, 860 * k);
      layer = mk("div", `position:absolute;left:${R.x + (R.w - w) / 2}px;top:${R.y}px;width:${w}px;height:${R.h}px;display:flex;flex-direction:column;justify-content:center;pointer-events:none;z-index:6;`, host);
      const T = rtl
        ? { label: "الخطة الشهرية", title: "قسّط على ٦ شهور", rows: [["القسط", "٧٥٠ ج"], ["الفايدة", "صفر"], ["أول دفعة", "النهارده"]], cta: "ابدأ دلوقتي" }
        : { label: "Monthly plan", title: "Split it over 6 months", rows: [["Each month", "$75"], ["Interest", "Zero"], ["First payment", "Today"]], cta: "Start now" };
      const box = inCard
        ? (shell = mk("div", `display:flex;flex-direction:column;gap:${22 * k}px;padding:${44 * k}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:var(--x-radius);box-shadow:var(--x-shadow);`, layer))
        : mk("div", `display:flex;flex-direction:column;gap:${24 * k}px;`, layer);
      const it = [];
      it.push(mk("div", `align-self:flex-start;padding:${10 * k}px ${22 * k}px;border-radius:var(--x-radius-s);background:color-mix(in srgb, var(--x-accent) 14%, transparent);color:var(--x-accent);font:var(--x-label-weight) ${22 * k}px var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:${rtl ? "none" : "var(--x-label-case)"};`, box, T.label));
      it.push(mk("div", `font:var(--x-head-weight) ${64 * k}px/1.12 var(--x-head-font);letter-spacing:var(--x-head-track);color:var(--x-ink);`, box, T.title));
      T.rows.forEach(([a, b]) => {
        const r = mk("div", `display:flex;justify-content:space-between;align-items:baseline;padding:${20 * k}px ${inCard ? 0 : 28 * k}px;${inCard ? "border-top:var(--x-edge) solid var(--x-line);" : "background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * 0.6);box-shadow:var(--x-shadow);"}`, box);
        mk("span", `font:var(--x-body-weight) ${32 * k}px var(--x-body-font);color:var(--x-dim);`, r, a);
        mk("span", `font:var(--x-head-weight) ${34 * k}px var(--x-head-font);color:var(--x-ink);`, r, b);
        it.push(r);
      });
      it.push(mk("div", `align-self:stretch;text-align:center;padding:${24 * k}px;border-radius:var(--x-radius-s);background:var(--x-accent);color:var(--x-accent-ink);font:var(--x-head-weight) ${32 * k}px var(--x-head-font);`, box, T.cta));
      items = it;
    }

    // timing: a card settles first, then its content; a group starts at once
    const settle = inCard && shell ? 0.3 : 0;
    const dur = inCard ? Math.min(p.duration, 0.35 + (p.duration - 0.9) * 0.2) : p.duration;
    const dist = (inCard ? p.distance * 0.25 : p.distance) * k;
    const blur = inCard ? Math.min(12, p.blur + 2) : p.blur;
    const stag = inCard ? p.stagger * 0.67 : p.stagger;
    const start = at + settle;
    const times = items.map((_, i) => start + i * stag);
    const ease = inCard ? (t, a, b) => 1 - Math.pow(1 - ML.lin(t, a, b), 3) : (t, a, b) => 1 - Math.pow(1 - ML.lin(t, a, b), 5);
    const lastIn = times[times.length - 1] + dur;
    const outStag = Math.min(0.03, stag);
    const exitAt = p.exit === "reverse" ? Math.max(lastIn + 0.2, end - 0.22 - outStag * (items.length - 1)) : Infinity;
    const leaves = items.map((_, i) => exitAt + (items.length - 1 - i) * outStag);
    ctx.sfx(start, "whoosh.soft", 0.25);
    const isPic = (e) => e.tagName === "IMG" || !!(e.querySelector && e.querySelector("img"));

    return {
      draw(t) {
        if (layer) layer.style.visibility = t < at - 0.1 ? "hidden" : "visible";
        if (back) back.style.opacity = (ML.out(t, at - 0.15, at + 0.15) * (Number.isFinite(exitAt) ? 1 - ML.out(t, exitAt + 0.05, exitAt + 0.3) : 1)).toFixed(4);
        if (shell) {
          const s = ML.out(t, at, at + 0.3), q = p.exit === "reverse" ? ML.out(t, leaves[0], leaves[0] + 0.2) : 0;
          shell.style.opacity = (s * (1 - q)).toFixed(4);
          shell.style.translate = `0 ${((1 - s) * 16 * k).toFixed(2)}px`;
          const sc = 0.97 + 0.03 * s;
          shell.style.scale = sc >= 0.9999 ? "none" : sc.toFixed(4);
        }
        items.forEach((e, i) => {
          const u = ease(t, times[i], times[i] + dur);
          const q = Number.isFinite(leaves[i]) ? ML.out(t, leaves[i], leaves[i] + 0.2) : 0;
          const v = u * (1 - q);
          e.style.opacity = v.toFixed(4);
          e.style.visibility = v < 0.001 ? "hidden" : "visible";
          e.style.translate = `0 ${((1 - u) * dist + q * dist).toFixed(2)}px`;
          const b = isPic(e) ? 0 : (1 - v) * blur * k;
          e.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : "none";
        });
      },
    };
  },
});
