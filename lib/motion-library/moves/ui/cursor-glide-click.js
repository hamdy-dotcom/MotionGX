// Cursor glide + click: a pointer (macOS arrow, a hand, or the product's own accent arrow — anchored at its tip, soft
// drop shadow) fades in, glides over `glide` s on an eased curve with a perpendicular bulge sin(π·u)·min(arc, 0.09·dist)
// (product-film's hand-like arc), arriving exactly on the spoken word, and presses: the cursor squashes
// (1 − (1 − depth)·sin(π·(t − k)/0.16)) while the target reacts on the same frame — a 0.96 dip and back.out (press),
// a lift and +15 % brightness, a count increment, a colour change or a state change. Feedback: a ring (scale 0.3 → 1.4,
// 0.9 → 0, 0.5 s power2.out) or a burst of 10 rays + dashed ring (0.35 s). Hover-only lifts the target 1.04 instead.
// The target is measured on the stage (every frame in world space, so it follows a moving camera); the pointer fades
// out 0.6 s after the click. Click SFX 11 ms before the press frame.
// Sources: MotionGX lib/studio-engine/assets/scenes.js (cursor, moveClick) + live-engine kit.js K.tap (own);
// MengTo/Skills html-explainer-video explainer.js pointer + html-demo step-window glide (MIT);
// Rieranthony/product-film-skill templates/kit/cursor.tsx (MIT); prompt-motion twoclipping, demonugc, l3d1c, hqmank,
// spearwtf (reference only).
ML.define({
  id: "ui.cursor-glide-click",
  category: "ui",
  name: "Cursor glides and clicks",
  does: "A mouse pointer glides on a gentle eased arc to a real button, arrives exactly on the spoken word, presses (the cursor squashes, the button dips) and the result happens.",
  says: ["step", "focus", "simplicity", "tech", "precision", "flow", "result", "proof", "choice"],
  energy: 2,
  targets: ["cursor", "card", "label", "screen", "shape", "word"],
  duration: [1, 2.5],
  params: {
    glide: { type: "number", range: [0.4, 1], default: 0.5, unit: "s" },
    arc: { type: "number", range: [0, 70], default: 30, unit: "px" },
    ease: { type: "choice", options: ["power3.inOut", "power2.inOut", "cubic-bezier(0.42,0,0.12,1)", "cubic-bezier(0.55,0,0.25,1)"], default: "power3.inOut" },
    start: { type: "choice", options: ["off-frame-corner", "last-position", "bottom"], default: "off-frame-corner" },
    click: { type: "choice", options: ["press", "press+ring", "press+rays", "hover-only", "none"], default: "press+ring" },
    press_depth: { type: "number", range: [0.8, 0.98], default: 0.88 },
    reaction: { type: "choice", options: ["press", "lift-brighten", "count", "colour", "state-change"], default: "press" },
    cursor: { type: "choice", options: ["mac-arrow", "hand", "product"], default: "mac-arrow" },
    space: { type: "choice", options: ["screen", "world"], default: "screen" },
    hide_after: { type: "bool", default: true },
    button: { type: "text" },
  },
  pairs: ["ui.container-morph", "ui.cta-button-rise", "camera.push-in"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "click",
  source: { from: "own:lib/studio-engine/assets/scenes.js", license: "own", note: "cursor/moveClick + live-engine K.tap; MengTo/Skills explainer pointer + html-demo glide (MIT); product-film-skill kit/cursor.tsx (MIT); prompt-motion videos as reference" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const layer = mk("div", "position:absolute;inset:0;pointer-events:none;z-index:9;", host);

    // what it clicks: the director's target, else a button of our own in the picture region
    let target = ctx.el && ctx.el !== ctx.stage ? ctx.el : null, built = false, label = null;
    const doneText = rtl ? "تم" : "Done";
    if (!target) {
      built = true;
      const R = f.pic;
      const wrap = mk("div", `position:absolute;left:${R.x}px;top:${(R.y + R.h * 0.42).toFixed(1)}px;width:${R.w}px;display:flex;justify-content:center;`, host);
      target = mk("div", `position:relative;display:flex;align-items:center;gap:0.4em;padding:${(30 * k).toFixed(1)}px ${(64 * k).toFixed(1)}px;border-radius:var(--x-radius-s);font:600 ${(46 * k).toFixed(1)}px var(--x-body-font);background:var(--x-accent);color:var(--x-accent-ink);box-shadow:var(--x-shadow);white-space:nowrap;`, wrap);
      label = mk("span", "display:inline-block;", target, p.button || (rtl ? "ابدأ الآن" : "Get started"));
      host.insertBefore(wrap, layer);
    }
    if (getComputedStyle(target).position === "static") target.style.position = "relative";
    // the press goes through `transform`, which stacks with the individual translate / scale an entrance on the same
    // target animates (ui.cta-button-rise, text-in.*): the click never cancels another move
    const tf0 = target.style.transform;
    target.style.transformOrigin = "50% 50%";
    const center = () => { const b = ctx.box(target); return { x: b.x + b.w / 2, y: b.y + b.h / 2, w: b.w, h: b.h }; };
    const c0 = center();

    // the reaction's extra pieces
    let badge = null, badgeN = null, check = null, alt = null;
    if (p.reaction === "count") {
      badge = mk("div", `position:absolute;top:0;${rtl ? "left" : "right"}:0;translate:${rtl ? "-35%" : "35%"} -35%;min-width:1.5em;height:1.5em;padding:0 0.35em;box-sizing:border-box;border-radius:999px;background:var(--x-bad);color:var(--x-accent-ink);font:700 ${(26 * k).toFixed(1)}px/1.5em var(--x-body-font);text-align:center;box-shadow:0 0 0 ${(4 * k).toFixed(1)}px var(--x-ground);`, target);
      badgeN = 2 + Math.floor(ML.rnd(3, 5) * 7);
    }
    if (p.reaction === "state-change") {
      if (label) {
        const sw = mk("span", "display:inline-grid;", target); sw.append(label); label.style.gridArea = "1/1";
        alt = mk("span", "grid-area:1/1;display:inline-flex;align-items:center;gap:0.35em;justify-content:center;", sw);
        const s = sv("svg", { viewBox: "0 0 24 24", width: "1em", height: "1em" }, alt);
        sv("path", { d: "M5 12.5 L10 17 L19 7", fill: "none", stroke: "currentColor", "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }, s);
        alt.append(doneText);
      } else {
        check = mk("div", `position:absolute;top:0;${rtl ? "left" : "right"}:0;translate:${rtl ? "-35%" : "35%"} -35%;width:${(46 * k).toFixed(1)}px;height:${(46 * k).toFixed(1)}px;border-radius:50%;background:var(--x-good);display:grid;place-items:center;`, target);
        const s = sv("svg", { viewBox: "0 0 24 24", width: (28 * k).toFixed(1), height: (28 * k).toFixed(1) }, check);
        sv("path", { d: "M5 12.5 L10 17 L19 7", fill: "none", stroke: "var(--x-accent-ink)", "stroke-width": 3.2, "stroke-linecap": "round", "stroke-linejoin": "round" }, s);
      }
    }
    const bg0 = getComputedStyle(target).backgroundColor, bs0 = target.style.boxShadow;

    // timing: arrive on the target's spoken word (or after a short entry), never past the end
    const first = (target.textContent || "").trim().split(/\s+/)[0] || "";
    const glide = Math.min(p.glide, Math.max(0.3, end - at - 0.65)); // a short scene shortens the glide so the click still lands
    const earliest = at + 0.2 + glide;
    let T = built ? earliest : Math.max(earliest, ctx.word(first, earliest));
    T = Math.min(T, Math.max(earliest, end - 0.45));
    const g0 = T - glide;
    const start = p.start === "off-frame-corner" ? { x: rtl ? -60 * k : f.W + 60 * k, y: f.H + 60 * k } : p.start === "bottom" ? { x: f.W * (rtl ? 0.42 : 0.58), y: f.H * 0.94 } : { x: f.W * (rtl ? 0.28 : 0.72), y: f.H * 0.9 };
    const EASE = {
      "power3.inOut": (x) => (x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2),
      "power2.inOut": (x) => (x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2),
      "cubic-bezier(0.42,0,0.12,1)": ML.bezier(0.42, 0, 0.12, 1),
      "cubic-bezier(0.55,0,0.25,1)": ML.bezier(0.55, 0, 0.25, 1),
    }[p.ease] || ML.bezier(0.42, 0, 0.12, 1);
    const presses = p.click !== "hover-only" && p.click !== "none";
    if (presses) ctx.sfx(T - 0.011, "click", 0.55);
    else if (p.click === "hover-only") ctx.sfx(T, "tap", 0.25);
    const hideAt = p.hide_after ? T + 0.6 : Infinity;

    // feedback: a ring built at its largest size (so it only ever scales down) and the ray burst
    const ringD = 90 * k * 1.4;
    const ring = p.click === "press+ring" ? mk("div", `position:absolute;left:0;top:0;width:${ringD.toFixed(1)}px;height:${ringD.toFixed(1)}px;margin:${(-ringD / 2).toFixed(1)}px 0 0 ${(-ringD / 2).toFixed(1)}px;border-radius:50%;box-sizing:border-box;border:${(5 * k * 1.4).toFixed(1)}px solid var(--x-accent-2);`, layer) : null;
    let rays = null;
    if (p.click === "press+rays") {
      const rs = 2 * k;
      rays = sv("svg", { width: (80 * rs).toFixed(1), height: (80 * rs).toFixed(1), viewBox: "-40 -40 80 80", style: `position:absolute;left:0;top:0;margin:${(-40 * rs).toFixed(1)}px 0 0 ${(-40 * rs).toFixed(1)}px;overflow:visible;` }, layer);
      rays._lines = Array.from({ length: 10 }, (_, i) => sv("line", { stroke: "var(--x-accent-2)", "stroke-width": 1.5, "stroke-linecap": "round" }, rays));
      rays._ring = sv("circle", { cx: 0, cy: 0, r: 20, fill: "none", stroke: "var(--x-accent-2)", "stroke-width": 1.2, "stroke-dasharray": "3 3" }, rays);
    }

    // the pointer, anchored at its tip
    const cs = 56 * k;
    const shapes = {
      "mac-arrow": { d: "M5 2 L5 19 L9.5 15.5 L12.5 22 L15.5 20.5 L12.5 14 L18.5 14 Z", tip: [5, 2], fill: "var(--x-pointer)", edge: "var(--x-pointer-edge)" },
      product: { d: "M5 2 L5 19 L9.5 15.5 L12.5 22 L15.5 20.5 L12.5 14 L18.5 14 Z", tip: [5, 2], fill: "var(--x-accent)", edge: "var(--x-accent-ink)" },
      hand: { d: "M9 2.5c.9 0 1.6.7 1.6 1.6V10l.6-.1c.9-.1 1.7.5 1.8 1.4l.1.3.4-.1c.9-.2 1.8.4 1.9 1.3l.1.4.3-.1c.9-.1 1.7.5 1.8 1.4.2 2.4.1 4.1-.6 5.6-.8 1.7-2.4 2.7-4.4 2.7h-2.3c-1.5 0-2.9-.7-3.8-1.9L3.6 16c-.5-.7-.4-1.7.3-2.2.7-.5 1.6-.4 2.1.2l1.4 1.6V4.1C7.4 3.2 8.1 2.5 9 2.5z", tip: [9, 2.5], fill: "var(--x-pointer-edge)", edge: "var(--x-pointer)" },
    };
    const sh = shapes[p.cursor] || shapes["mac-arrow"];
    const cur = mk("div", "position:absolute;left:0;top:0;", layer);
    const tipX = (sh.tip[0] / 24) * cs, tipY = (sh.tip[1] / 24) * cs;
    const svg = sv("svg", { viewBox: "0 0 24 24", width: cs.toFixed(1), height: cs.toFixed(1) }, cur);
    svg.style.cssText = `position:absolute;left:${(-tipX).toFixed(1)}px;top:${(-tipY).toFixed(1)}px;overflow:visible;transform-origin:${tipX.toFixed(1)}px ${tipY.toFixed(1)}px;filter:drop-shadow(0 ${(4 * k).toFixed(1)}px ${(7 * k).toFixed(1)}px color-mix(in srgb, var(--x-ink) 32%, transparent));`;
    sv("path", { d: sh.d, fill: sh.fill, stroke: sh.edge, "stroke-width": 1.6, "stroke-linejoin": "round", "stroke-linecap": "round" }, svg);

    const power2out = (x) => 1 - (1 - x) * (1 - x);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        const to = p.space === "world" ? center() : c0;
        // glide on an arc, like a hand, never a ruler line
        const u = ML.lin(t, g0, T), e = EASE(u);
        const dx = to.x - start.x, dy = to.y - start.y, len = Math.hypot(dx, dy) || 1;
        const bulge = Math.sin(Math.PI * u) * Math.min(p.arc * k, len * 0.09) * (rtl ? -1 : 1);
        const x = start.x + dx * e - (dy / len) * bulge, y = start.y + dy * e + (dx / len) * bulge;
        const vis = t < at ? 0 : ML.clamp((t - Math.max(at, g0 - 0.2)) / 0.2) * (1 - ML.clamp((t - hideAt) / 0.3)) * (1 - leave);
        cur.style.opacity = vis.toFixed(4);
        let squash = 1;
        if (presses && t >= T && t < T + 0.16) squash = 1 - (1 - p.press_depth) * Math.sin((Math.PI * (t - T)) / 0.16);
        cur.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
        svg.style.transform = squash === 1 ? "none" : `scale(${squash.toFixed(4)})`;

        // the target answers on the same frame
        let sc = 1, bright = 1, lift = 0;
        if (presses) {
          if (t >= T && t < T + 0.09) sc = 1 - 0.04 * ML.out(t, T, T + 0.09);
          else if (t >= T + 0.09) sc = 0.96 + 0.04 * ML.back(t, T + 0.09, T + 0.39);
          if (p.reaction === "lift-brighten") { const q = power2out(ML.lin(t, T, T + 0.3)); bright = 1 + 0.15 * q; lift = -6 * k * q; }
        } else if (p.click === "hover-only") { const q = power2out(ML.lin(t, T - 0.05, T + 0.25)); sc = 1 + 0.04 * q; bright = 1 + 0.08 * q; lift = -3 * k * q; target.style.boxShadow = q > 0 ? `var(--x-shadow), 0 ${(18 * k * q).toFixed(1)}px ${(40 * k * q).toFixed(1)}px color-mix(in srgb, var(--x-ink) ${(18 * q).toFixed(1)}%, transparent)` : bs0; }
        target.style.transform = sc === 1 && !lift ? tf0 : `${tf0} translateY(${lift.toFixed(2)}px) scale(${sc.toFixed(4)})`;
        if (p.reaction === "lift-brighten" || p.click === "hover-only") target.style.filter = bright === 1 ? "none" : `brightness(${bright.toFixed(4)})`;
        if (built) target.parentElement.style.opacity = String(1 - leave);
        if (presses && (p.reaction === "colour" || p.reaction === "state-change")) {
          const q = ML.lin(t, T, T + 0.2);
          target.style.backgroundColor = q <= 0 ? bg0 : `color-mix(in srgb, var(--x-good) ${(q * 100).toFixed(1)}%, ${bg0})`;
        }
        if (badge) { const on = presses && t >= T; badge.textContent = String(badgeN + (on ? 1 : 0)); badge.style.scale = on ? (1 + 0.25 * Math.sin(Math.PI * ML.lin(t, T, T + 0.2))).toFixed(4) : "1"; }
        if (alt) { const q = presses ? ML.lin(t, T + 0.05, T + 0.25) : 0; label.style.opacity = (1 - q).toFixed(4); alt.style.opacity = q.toFixed(4); alt.style.translate = `0 ${((1 - q) * 10 * k).toFixed(2)}px`; label.style.translate = `0 ${(-q * 10 * k).toFixed(2)}px`; }
        if (check) { const q = presses ? ML.back(t, T + 0.05, T + 0.3) : 0; check.style.opacity = ML.clamp(q).toFixed(4); check.style.scale = Math.max(0, Math.min(1, q)).toFixed(4); }

        // feedback
        if (ring) {
          const q = power2out(ML.lin(t, T, T + 0.5)), live = t >= T && t < T + 0.5;
          ring.style.opacity = live ? (0.9 * (1 - q)).toFixed(4) : "0";
          ring.style.transform = `translate(${to.x.toFixed(2)}px, ${to.y.toFixed(2)}px) scale(${((0.3 + 1.1 * q) / 1.4).toFixed(4)})`;
        }
        if (rays) {
          const q = ML.out(t, T, T + 0.35), live = t >= T && t < T + 0.35;
          rays.style.opacity = live ? (1 - q * q).toFixed(4) : "0";
          rays.style.transform = `translate(${to.x.toFixed(2)}px, ${to.y.toFixed(2)}px)`;
          const r0 = 14 + 14 * q;
          rays._lines.forEach((l, i) => { const a = (i / 10) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); l.setAttribute("x1", (c * r0).toFixed(2)); l.setAttribute("y1", (s * r0).toFixed(2)); l.setAttribute("x2", (c * (r0 + 8)).toFixed(2)); l.setAttribute("y2", (s * (r0 + 8)).toFixed(2)); });
          rays._ring.setAttribute("r", (20 + 12 * q).toFixed(2));
        }
      },
    };
  },
});
