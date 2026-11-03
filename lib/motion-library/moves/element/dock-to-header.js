// Shrink and dock: a centred title, prompt, pill or hero icon shrinks and travels to a header or logo-lockup place,
// making room for what comes next. A FLIP from its own laid-out box to the dock box (one transform, power3.inOut over
// `duration`): title → top, its centre at ~12 % of the height, × end_scale (0.55); corner → the top start / centre /
// end corner 28 px in (at 720p, scaled), the reading direction swapping start and end; lockup → the hero icon goes to
// the lockup place, × 0.4-ish with a slight blur on the way, and the wordmark (its `wordmark` or aria-label; none is made
// up, and a logo already carrying its lettering adds none) enters from the icon's side. chip_bg: a
// typed prompt gains a dark rounded chip behind it as it docks. index: a small accent mono "01" and a 20 px hairline
// fade in above the docked title 0.2 s after it lands. Nothing scales up; a picture never blurs.
// Source: prompt-motion "ror-fly-opus-5-5-rendered-this", "steventey-claude-opus-5-5-feels", "thilina-a-i-also-tried-it",
// "0xfemyn-wtf-nah-opus-5-5", "miskinho-que-maravilla-opus-5-5", "fionntobin-the-new-opus-5-5" (reference only —
// rebuilt as our own code).
ML.define({
  id: "element.dock-to-header",
  category: "element",
  name: "Shrink and dock",
  does: "A centred title, prompt, pill or hero icon shrinks and travels to a header or logo-lockup position, making room for what comes next.",
  says: ["step", "flow", "brand"],
  energy: 2,
  targets: ["headline", "card", "logo", "label", "line", "word"],
  duration: [0.5, 1.2],
  params: {
    dock: { type: "choice", options: ["top", "top-left", "corner", "lockup"], default: "top" },
    end_scale: { type: "number", range: [0.3, 0.75], default: 0.55 },
    duration: { type: "number", range: [0.35, 0.7], default: 0.5, unit: "s" },
    chip_bg: { type: "bool", default: false },
    index: { type: "bool", default: false },
    index_text: { type: "text", default: "01" },
    corner: { type: "choice", options: ["top-left", "top", "top-right"], default: "top-left" },
    wordmark: { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "element.content-lift-header", "element.corner-mark"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:miskinho-que-maravilla-opus-5-5", license: "reference", note: "with ror-fly, steventey, thilina, 0xfemyn and fionntobin; technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, f, el, rtl } = ctx;
    if (!el || el === ctx.stage) return null;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 720;
    const isImg = el.tagName === "IMG";
    // the element's own box: measured on its content (a block-level title is as wide as its band, its words are not)
    let r = ctx.box(el);
    if (!isImg && el.tagName.toLowerCase() !== "svg") {
      const rg = doc.createRange(); rg.selectNodeContents(el);
      const rr = rg.getBoundingClientRect(), sr = ctx.stage.getBoundingClientRect(), kk = sr.width / (ctx.stage.offsetWidth || 1) || 1;
      if (rr.width > 0) r = { x: (rr.left - sr.left) / kk, y: (rr.top - sr.top) / kk, w: rr.width / kk, h: rr.height / kk };
    }
    const elBox = ctx.box(el);
    if (!(r.w > 0 && r.h > 0)) return null;
    const lockup = p.dock === "lockup";
    let s = ML.clamp(p.end_scale, 0.3, 0.75);
    if (lockup) s = Math.min(s, 0.45);
    const pad = Math.max(28 * k, f.m * 0.6);
    const topY = f.tall ? f.safe.y : Math.max(28 * k, f.safe.y * 0.6);
    // where its centre lands
    const bw = r.w * s, bh = r.h * s;
    let cx, cy, wm = null, gap = 14 * k;
    const corner = p.dock === "top-left" ? "top-left" : p.dock === "corner" ? p.corner : null;
    if (corner) {
      const side = corner === "top" ? "mid" : (corner === "top-left") !== rtl ? "start-left" : "start-right";
      cx = side === "mid" ? f.W / 2 : side === "start-left" ? pad + bw / 2 : f.W - pad - bw / 2;
      cy = topY + bh / 2 + (p.index ? 26 * k : 0);
    } else if (lockup) {
      // the icon steps to the lockup place, the wordmark beside it on the reading side
      const name = (p.wordmark || (el.querySelector("text") ? "" : el.getAttribute("aria-label")) || "").trim();
      cy = f.H * 0.5;
      cx = f.W / 2;
      if (name) {
        wm = doc.createElement("div");
        wm.textContent = name;
        wm.style.cssText = `position:absolute;white-space:nowrap;font:var(--x-head-weight) ${(bh * 0.62).toFixed(1)}px/1 var(--x-head-font);letter-spacing:var(--x-head-track);color:var(--x-ink);z-index:7;pointer-events:none;visibility:hidden;`;
        host.append(wm);
        const ww = Math.min(wm.offsetWidth, f.W - pad * 2 - bw - gap);
        const left = (f.W - (bw + gap + ww)) / 2;
        cx = rtl ? left + ww + gap + bw / 2 : left + bw / 2;
        wm.style.top = `${(cy - wm.offsetHeight / 2).toFixed(1)}px`;
        wm.style.left = `${(rtl ? left : left + bw + gap).toFixed(1)}px`;
      }
    } else {
      cx = f.W / 2;
      cy = Math.max(topY + bh / 2, f.H * 0.12);
    }
    // keep it in the frame
    cx = ML.clamp(cx, pad + bw / 2, f.W - pad - bw / 2);
    const ox = r.x + r.w / 2 - elBox.x, oy = r.y + r.h / 2 - elBox.y; // its content's centre in its own box
    const dx = cx - (r.x + r.w / 2), dy = cy - (r.y + r.h / 2);

    // a dark chip behind a typed prompt as it docks; an index above a docked title
    let chip = null, idx = null;
    if (p.chip_bg) {
      chip = doc.createElement("div");
      chip.style.cssText = `position:absolute;left:${cx - bw / 2 - 18 * k * s}px;top:${cy - bh / 2 - 10 * k * s}px;width:${bw + 36 * k * s}px;height:${bh + 20 * k * s}px;border-radius:var(--x-radius-s);background:var(--x-ink);z-index:5;pointer-events:none;visibility:hidden;`;
      host.append(chip);
      el.style.position = el.style.position || "relative";
      el.style.zIndex = "6";
    }
    if (p.index) {
      idx = doc.createElement("div");
      idx.style.cssText = `position:absolute;top:${cy - bh / 2 - 26 * k}px;left:${(cx - bw / 2).toFixed(1)}px;width:${bw.toFixed(1)}px;display:flex;align-items:center;gap:${8 * k}px;justify-content:${corner === "top" || !corner || lockup ? "center" : "flex-start"};z-index:7;pointer-events:none;visibility:hidden;font:var(--x-label-weight) ${((f.tall ? 14 : 11) * k).toFixed(1)}px var(--x-mono-font);color:var(--x-accent);`;
      const n = doc.createElement("span"); n.textContent = p.index_text || "01";
      const line = doc.createElement("span"); line.style.cssText = `display:block;width:${20 * k}px;height:1px;background:var(--x-accent);`;
      idx.append(n, line);
      host.append(idx);
    }
    const dur = ML.clamp(p.duration, 0.35, 0.7);
    const a = at, b = at + dur;
    ctx.sfx(a, "whoosh.soft", 0.3);
    if (lockup) ctx.sfx(b + 0.05, "tap", 0.2);
    // power3.inOut
    const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    return {
      draw(t) {
        const u = io(ML.lin(t, a, b));
        if (u <= 0) {
          el.style.transform = "none";
          if (lockup) el.style.filter = "none";
        } else {
          el.style.transformOrigin = `${ox.toFixed(1)}px ${oy.toFixed(1)}px`;
          el.style.transform = `translate(${(dx * u).toFixed(2)}px, ${(dy * u).toFixed(2)}px) scale(${(1 - (1 - s) * u).toFixed(4)})`;
          if (lockup) { // a slight blur on the way (never on a picture); other docks leave the filter to the moves on it
            const bl = !isImg ? Math.sin(Math.PI * u) * 3 * k : 0;
            el.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : "none";
          }
        }
        if (chip) {
          const c = ML.ease(t, b - dur * 0.35, b + 0.1);
          chip.style.visibility = c > 0 ? "visible" : "hidden";
          chip.style.opacity = c.toFixed(4);
          chip.style.transform = `scale(${(0.9 + 0.1 * c).toFixed(4)})`;
          el.style.color = c > 0 ? `color-mix(in srgb, var(--x-ground) ${(c * 100).toFixed(1)}%, var(--x-ink))` : "";
        }
        if (idx) {
          const c = ML.ease(t, b + 0.2, b + 0.5);
          idx.style.visibility = c > 0 ? "visible" : "hidden";
          idx.style.opacity = c.toFixed(4);
        }
        if (wm) {
          // the wordmark slides out from behind the icon's side
          const c = ML.expo(t, b - 0.05, b + 0.5);
          wm.style.visibility = c > 0 ? "visible" : "hidden";
          wm.style.opacity = Math.min(1, c * 1.4).toFixed(4);
          wm.style.clipPath = rtl ? `inset(-20% 0 -20% ${((1 - c) * 100).toFixed(2)}%)` : `inset(-20% ${((1 - c) * 100).toFixed(2)}% -20% 0)`;
          wm.style.transform = `translateX(${((1 - c) * -24 * k * (rtl ? -1 : 1)).toFixed(2)}px)`;
        }
      },
    };
  },
});
