// Circle iris: a circle grows from a meaningful point already on screen until its colour (or the next scene) fills the
// frame. r goes 0 (or a dot's 12-40 px) -> the farthest corner x 1.05 over 0.35-0.7 s on expo.inOut (a wipe) or
// power3.in / expo.in (the object swells toward you); "close" runs it backwards, the frame shrinking into the point.
// Origin: the centre, a full stop after the headline (dot), the target element (a button pulses 0.9 -> 1 first),
// a letter's counter (an o / 0 / a / e… or, in Arabic, a ه / و / م), the reading-side edge, or the reading-side bottom
// corner. Edges: hard; soft-glow (an 8% feathered rim, the old colour lingering as a fringe); ring (a thin accent
// outline leading the fill); glow (an accent halo, box-shadow 0 0 40px at 60%). Pre-pop: the dot pops to a disc
// (4 -> 140 px, 0.35 s back.out(1.4)), holds, then the iris opens. Other elements fade in over the first 0.15 s; the
// outgoing eases 1 -> .96 under the flood; the next scene's title starts moving when the iris is ~70% open.
// Source: prompt-motion (15 references: stephanlivera-opus-5-5-on-max, listudio-tell-opus-5-5-prompt, macrohou-rip-
// motion-designers-absolutely and others) — reference only: our own rebuild.
ML.define({
  id: "transition.circle-iris",
  category: "transition",
  name: "Circle iris",
  does: "A circle grows from a point (the centre, a dot, a button, a letter's counter) until its colour or the next scene fills the frame.",
  says: ["transition", "reveal", "energy", "change", "focus", "arrival", "calm", "story"],
  energy: 3,
  targets: ["scene", "shape", "image"],
  duration: [0.35, 1.2],
  params: {
    origin: { type: "choice", options: ["centre", "dot", "element", "letter-counter", "edge", "corner"], default: "centre" },
    edge: { type: "choice", options: ["hard", "soft-glow", "ring", "glow"], default: "hard" },
    fill: { type: "choice", options: ["colour", "scene"], default: "colour" },
    direction: { type: "choice", options: ["open", "close"], default: "open" },
    pre_pop: { type: "bool", default: false },
    hold: { type: "number", range: [0, 0.3], default: 0.15, unit: "s" },
    duration: { type: "number", range: [0.35, 0.7], default: 0.5, unit: "s" },
    ease: { type: "choice", options: ["expo.inOut", "power3.in", "expo.in"], default: "expo.inOut" },
    colour: { type: "choice", options: ["accent", "accent-2", "ink", "panel", "device"], default: "accent" },
    next: { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "transition.blob-circle-wipe"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:stephanlivera-opus-5-5-on-max", license: "reference", note: "our own rebuild; with listudio-tell-opus-5-5-prompt (button window), macrohou, levabashidze and 11 more" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const scene = ctx.scene || stage;
    const W = scene.offsetWidth || f.W, H = scene.offsetHeight || f.H, k = Math.min(W, H) / 1080;
    const D = ML.clamp(p.duration, 0.35, 0.7), hold = ML.clamp(p.hold, 0, 0.3);
    const EASE = {
      "expo.inOut": (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2),
      "power3.in": (x) => x * x * x * x,
      "expo.in": (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
    };
    const ez = EASE[p.ease] || EASE["expo.inOut"];
    const el = ctx.el && ctx.el !== stage && ctx.el !== scene ? ctx.el : null;
    const sb = (node) => ctx.box(node);
    // ── the origin ──
    const head = scene.querySelector(".ml-title");
    let cx = W / 2, cy = H / 2, r0 = 0, button = null;
    const textEnd = (node) => {
      // the end of the node's last line, in reading direction
      const rg = document.createRange(); rg.selectNodeContents(node);
      const rects = [...rg.getClientRects()]; if (!rects.length) return null;
      const s = stage.getBoundingClientRect(), kk = s.width / (stage.offsetWidth || 1) || 1, last = rects[rects.length - 1];
      return { x: ((ctx.rtl ? last.left : last.right) - s.left) / kk, y: (last.bottom - s.top) / kk, h: last.height / kk };
    };
    const counter = (node) => {
      const LAT = /[oOaedbpqg0689QDR]/, AR = /[هوةمقفصض]/;
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      const s = stage.getBoundingClientRect(), kk = s.width / (stage.offsetWidth || 1) || 1;
      let tn;
      while ((tn = walker.nextNode())) {
        const txt = tn.textContent;
        for (let i = 0; i < txt.length; i++) {
          if (!(LAT.test(txt[i]) || AR.test(txt[i]))) continue;
          const rg = document.createRange(); rg.setStart(tn, i); rg.setEnd(tn, i + 1);
          const r = rg.getBoundingClientRect(); if (!r.width) continue;
          // an Arabic letter's box is its joined glyph: aim a little below the middle where the loop sits
          return { x: (r.left + r.width / 2 - s.left) / kk, y: (r.top + r.height * (AR.test(txt[i]) ? 0.6 : 0.62) - s.top) / kk, w: r.width / kk };
        }
      }
      return null;
    };
    if (p.origin === "dot" && head) {
      const e = textEnd(head);
      if (e) { r0 = Math.max(6 * k, e.h * 0.09); const gap = p.pre_pop ? 70 * k * 1.15 : r0 * 1.8; cx = e.x + (ctx.rtl ? -1 : 1) * gap; cy = p.pre_pop ? e.y - e.h / 2 : e.y - e.h * 0.22 - r0; }
    } else if (p.origin === "element") {
      const node = el || scene.querySelector('[data-slot="logo"], [data-slot-sample="logo"], .ml-panel');
      if (node) { const b = sb(node); cx = b.x + b.w / 2; cy = b.y + b.h / 2; r0 = Math.min(b.w, b.h) / 2; button = node; }
    } else if (p.origin === "letter-counter") {
      const node = el || head || scene.querySelector('[data-slot-sample="number"]');
      const c = node && counter(node);
      if (c) { cx = c.x; cy = c.y; r0 = c.w * 0.12; }
    } else if (p.origin === "edge") { cx = ctx.rtl ? W : 0; cy = H / 2; }
    else if (p.origin === "corner") { cx = ctx.rtl ? W : 0; cy = H; }
    else if (el) { const b = sb(el); cx = b.x + b.w / 2; cy = b.y + b.h / 2; }
    const far = Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy));
    const R = far * (p.origin === "centre" ? 1.05 : 1.12);
    // ── layers ──
    const COL = { accent: ["var(--x-accent)", "var(--x-accent-ink)"], "accent-2": ["var(--x-accent-2)", "var(--x-ink)"], ink: ["var(--x-ink)", "var(--x-ground)"], panel: ["var(--x-panel)", "var(--x-ink)"], device: ["var(--x-device)", "var(--x-ground)"] };
    const [col, onCol] = p.fill === "scene" ? ["var(--x-panel-2)", "var(--x-ink)"] : COL[p.colour] || COL.accent;
    const wrap = document.createElement("div");
    wrap.style.cssText = `position:absolute;inset:0;transform-origin:${cx.toFixed(1)}px ${cy.toFixed(1)}px`;
    [...scene.children].forEach((c) => wrap.append(c));
    scene.append(wrap);
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:6;overflow:hidden";
    scene.append(layer);
    const flood = document.createElement("div");
    flood.style.cssText = `position:absolute;inset:0;background:${col}`;
    layer.append(flood);
    let words = [];
    const sub = wrap.querySelector(".ml-sub");
    const text = (p.next || "").trim() || (p.fill === "scene" ? (sub ? sub.textContent.trim() : head ? head.textContent.trim() : "") : "");
    if (text) {
      const fs = Math.min(parseFloat(getComputedStyle(scene).getPropertyValue("--x-head-size")) || 104, W * 0.085);
      const title = document.createElement("div");
      title.setAttribute("dir", ctx.rtl ? "rtl" : "ltr");
      title.style.cssText = `position:absolute;left:${f.m}px;right:${f.m}px;top:0;bottom:0;display:flex;align-items:center;justify-content:center;text-align:center;font:var(--x-head-weight) ${fs.toFixed(1)}px/var(--x-head-line) var(--x-head-font);letter-spacing:var(--x-head-track);color:${onCol};text-wrap:balance`;
      const line = document.createElement("div"); line.textContent = text; title.append(line); // a block inside the flex box keeps the spaces between split words
      flood.append(title);
      words = ML.split(line, "words");
    }
    // the leading ring / halo
    const halo = document.createElement("div");
    halo.style.cssText = "position:absolute;left:0;top:0;border-radius:50%;pointer-events:none;visibility:hidden";
    if (p.edge === "ring") halo.style.boxShadow = `0 0 0 ${(2.5 * k).toFixed(2)}px var(--x-accent)`;
    if (p.edge === "glow") halo.style.boxShadow = `0 0 ${(40 * k).toFixed(0)}px ${(8 * k).toFixed(0)}px color-mix(in srgb, var(--x-accent) 60%, transparent)`;
    if (p.edge === "ring" || p.edge === "glow") layer.append(halo);
    // the pre-pop disc
    const disc = document.createElement("div");
    disc.style.cssText = `position:absolute;left:${cx.toFixed(1)}px;top:${cy.toFixed(1)}px;width:0;height:0;border-radius:50%;background:${col};visibility:hidden;z-index:2`;
    layer.append(disc);
    const pop = p.pre_pop && p.direction === "open";
    const pr = 70 * k; // 140 px disc
    const t0 = pop ? at + 0.35 + hold : at + (button ? 0.15 : 0);
    const backOut = (x) => { const c = 1.4, y = x - 1; return x <= 0 ? 0 : x >= 1 ? 1 : 1 + (c + 1) * y * y * y + c * y * y; };
    if (pop) ctx.sfx(at, "pop.soft", 0.35);
    ctx.sfx(t0 + D * 0.15, "whoosh.soft", 0.45);
    const feather = (r) => (p.edge === "soft-glow" ? Math.max(6 * k, r * 0.08) : 0.75);
    return {
      draw(t) {
        layer.style.visibility = t < at ? "hidden" : "visible";
        const x = ML.lin(t, t0, t0 + D), e = ez(x);
        const start = pop ? pr : r0;
        let r = p.direction === "close" ? R + (r0 - R) * e : start + (R - start) * e;
        if (p.direction === "close" && x >= 1) r = 0;
        const fe = feather(r);
        if (p.direction === "close") {
          // the old frame shrinks into the point: the flood covers everything outside the circle
          flood.style.maskImage = flood.style.webkitMaskImage = t < t0 ? "linear-gradient(transparent, transparent)" : `radial-gradient(circle at ${cx.toFixed(1)}px ${cy.toFixed(1)}px, transparent ${Math.max(0, r - fe).toFixed(2)}px, #000 ${r.toFixed(2)}px)`;
        } else if (x >= 1) flood.style.maskImage = flood.style.webkitMaskImage = "none";
        else flood.style.maskImage = flood.style.webkitMaskImage = t < t0 ? "linear-gradient(transparent, transparent)" : `radial-gradient(circle at ${cx.toFixed(1)}px ${cy.toFixed(1)}px, #000 ${Math.max(0, r - fe).toFixed(2)}px, transparent ${r.toFixed(2)}px)`;
        // halo rides the edge while it travels
        const moving = t >= t0 && x < 1;
        halo.style.visibility = moving && r > 1 ? "visible" : "hidden";
        if (moving) { halo.style.width = halo.style.height = `${(2 * r).toFixed(2)}px`; halo.style.transform = `translate(${(cx - r).toFixed(2)}px, ${(cy - r).toFixed(2)}px)`; }
        // pre-pop disc: 4 -> 140 px, holds, then hands over to the iris
        if (pop) {
          const d = 2 + (pr - 2) * backOut(ML.lin(t, at, at + 0.35));
          disc.style.visibility = t >= at && t < t0 + 0.02 ? "visible" : "hidden";
          disc.style.width = disc.style.height = `${(2 * d).toFixed(2)}px`;
          disc.style.transform = `translate(${(-d).toFixed(2)}px, ${(-d).toFixed(2)}px)`;
        }
        // a button origin pulses 0.9 -> 1 on the click
        if (button) { const b = t < at ? 1 : 0.9 + 0.1 * ML.out(t, at + 0.05, at + 0.2); button.style.scale = b === 1 ? "none" : b.toFixed(4); }
        // the outgoing settles back a hair under the flood
        const sc = 1 - 0.04 * ML.ease(t, t0, t0 + D);
        wrap.style.scale = sc === 1 ? "none" : sc.toFixed(4);
        // the next scene's content: fades in the first 0.15 s of its run, starting when ~70% open
        const ta = t0 + D * 0.62;
        words.forEach((w, i) => { const v = ML.land(t, ta + i * 0.05, ta + 0.35 + i * 0.05); w.style.opacity = (p.direction === "close" ? 0 : v).toFixed(4); w.style.translate = `0 ${((1 - v) * 26 * k).toFixed(2)}px`; });
      },
    };
  },
});
