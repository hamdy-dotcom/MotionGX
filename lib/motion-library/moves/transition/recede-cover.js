// Recede and cover: the current scene (or one picture, card or screen) shrinks back into a dimmed, softened card —
// scale 1 -> `recede_scale`, brightness 1 -> `darken`, blur 0 -> `blur`, corners 0 -> `radius` over 0.8 s
// power2.inOut, the ground showing as a margin around it — while the next one arrives over it ~0.15 s later:
//   plate  — a full plate slides in from `direction` (yPercent 100 -> 0, power3.inOut over `duration`), its crop
//            settling 1.08 -> 1 over 2 s and its statement words rising out of masks 0.3 s after it lands;
//   rise   — the plate rises 8 % (or settles from 1.06 with settle "scale") while fading in, 0.8 s power3.out;
//   mask   — the plate is revealed through an expanding inset, inset(20% round r) -> inset(0 round 0);
//   card   — a tall 9:16 card darts in from the reading end with a blur 20 -> 0 (0.5 s expo.out) while
//            the old scene slides 20 % toward the reading start and softens to 14 px; caption words blur in on a panel on the free side;
//   window — a rounded window with traffic lights fades in rising 20 px (0.4 s) while the old content dims to .25 and
//            softens 4 px, then leaves again before the scene ends.
// Pictures are never blurred (the library's sharp rule): they only dim with the card. Left / right follow RTL. The whole
// run compresses to fit when `end` leaves less room than it needs, so the handoff always completes on screen.
// Source: MengTo/Skills web-design/editorial-portfolio-chapters ARTICLE.md (MIT: sticky media chapters, "the covered
// plate scales back, darkens, and softens slightly") + gsap-scrolltrigger-storytelling; prompt-motion samuel-yostt-891f87
// and yunn260414 (reference only: the card and window variants are our own rebuild).
ML.define({
  id: "transition.recede-cover",
  category: "transition",
  name: "Recede and cover",
  does: "The current scene shrinks back into a dimmed, blurred card while the next plate, card or window slides in over it.",
  says: ["transition", "story", "change", "focus", "arrival", "step"],
  energy: 3,
  targets: ["scene", "image", "card", "screen"],
  duration: [0.6, 2.4],
  params: {
    incoming: { type: "choice", options: ["plate", "rise", "mask", "card", "window"], default: "plate" },
    direction: { type: "choice", options: ["up", "left", "right"], default: "up" },
    settle: { type: "choice", options: ["move", "scale"], default: "move" },
    recede_scale: { type: "number", range: [0.9, 0.97], default: 0.94 },
    darken: { type: "number", range: [0.25, 0.8], default: 0.55 },
    blur: { type: "number", range: [0, 14], default: 6, unit: "px" },
    radius: { type: "number", range: [0, 24], default: 16, unit: "px" },
    duration: { type: "number", range: [0.5, 1.2], default: 0.9, unit: "s" },
    next: { type: "text", default: "" },
  },
  pairs: ["transition.crossfade", "text-in.punchline"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:agent-skills/web-design/editorial-portfolio-chapters/ARTICLE.md", license: "MIT", note: "card / window variants rebuilt from prompt-motion samuel-yostt-891f87 and yunn260414 (reference only)" },
  setup(ctx) {
    const { p, at, end, stage } = ctx;
    const scene = ctx.scene || stage;
    const whole = !ctx.el || ctx.el === stage || ctx.el === scene;
    const rtl = !!ctx.rtl, dirX = rtl ? -1 : 1;
    const D = ML.clamp(p.duration, 0.5, 1.2), k = D / 0.9;
    const mk = (css, parent) => { const d = document.createElement("div"); d.style.cssText = css; parent.append(d); return d; };

    // the outgoing: the whole scene (its children wrapped once) or the target element; the incoming layer beside it
    let out, holder, R;
    if (whole) {
      out = mk("position:absolute;inset:0;transform-origin:50% 50%", scene);
      for (const c of [...scene.childNodes]) if (c !== out) out.append(c);
      holder = scene; R = { x: 0, y: 0, w: scene.offsetWidth || ctx.f.W, h: scene.offsetHeight || ctx.f.H };
    } else {
      out = ctx.el; holder = out.offsetParent || out.parentElement;
      if (getComputedStyle(holder).position === "static") holder.style.position = "relative";
      R = { x: out.offsetLeft, y: out.offsetTop, w: out.offsetWidth, h: out.offsetHeight };
    }
    const outWas = { bg: out.style.background, radius: out.style.borderRadius, tf: out.style.transform };
    const r0 = parseFloat(getComputedStyle(out).borderTopLeftRadius) || 0, rTo = Math.max(r0, p.radius);
    const back = mk(`position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;background:color-mix(in srgb, var(--x-ground) 78%, var(--x-ink));opacity:0;pointer-events:none`, holder);
    if (whole) holder.insertBefore(back, out); else back.style.display = "none"; // an element recedes over its own ground
    // pictures dim but never blur: split the outgoing into pictures and the rest
    const PIC = /^(IMG|VIDEO|CANVAS|PICTURE)$/i;
    const hasPic = (e) => PIC.test(e.tagName) || !!e.querySelector("img,video,canvas,picture") || getComputedStyle(e).backgroundImage.includes("url(");
    const soft = [];
    const walk = (n) => { for (const c of n.children) { if (PIC.test(c.tagName)) continue; if (!hasPic(c)) soft.push(c); else walk(c); } };
    if (PIC.test(out.tagName)) { /* a picture alone: no blur at all */ } else if (!hasPic(out)) soft.push(out); else walk(out);

    // the incoming
    const kind = p.incoming;
    const lay = mk(`position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;overflow:hidden`, holder);
    const fill = "radial-gradient(120% 90% at 72% 18%, var(--x-accent-2), transparent 60%), linear-gradient(160deg, var(--x-accent), color-mix(in srgb, var(--x-accent) 55%, var(--x-device)))";
    const sub = scene.querySelector(".ml-sub"), head = scene.querySelector(".ml-title");
    const text = (p.next || (ctx.el && ctx.el.dataset && ctx.el.dataset.next) || (sub && sub.textContent) || (head && head.textContent) || "").trim();
    const headSize = parseFloat(getComputedStyle(scene).getPropertyValue("--x-head-size")) || 104;
    const m = Math.max(16, Math.min(R.w, R.h) * 0.06);
    let plate = null, crop = null, words = [], card = null, cap = null, capIn = null, capWords = [], win = null;
    if (kind === "card") {
      const cw = Math.min(R.h * 0.66 * 9 / 16, R.w * 0.4), ch = cw * 16 / 9;
      const x1 = Math.min(R.w * 0.55, R.w - cw - m), xEnd = rtl ? R.w - x1 - cw : x1;
      card = mk(`position:absolute;top:${(R.h - ch) / 2}px;left:${xEnd}px;width:${cw}px;height:${ch}px;border-radius:calc(var(--x-radius) * .5);background:${fill};box-shadow:var(--x-shadow)`, lay);
      card.dataset.x = String(xEnd);
      const freeX = rtl ? xEnd + cw + m : m, freeW = rtl ? R.w - xEnd - cw - 2 * m : xEnd - 2 * m;
      cap = mk(`position:absolute;left:${freeX}px;width:${Math.max(40, freeW)}px;top:0;height:${R.h}px;display:flex;align-items:center;font:var(--x-head-weight) ${Math.min(headSize * 0.6, Math.max(20, freeW) * 0.16).toFixed(1)}px/1.12 var(--x-head-font);letter-spacing:var(--x-head-track);color:var(--x-ink);text-align:start`, lay);
      // the caption sits on its own panel: the dimmed, softened old scene behind it is no ground for type
      capIn = document.createElement("div"); capIn.style.cssText = "padding:.45em .65em;border-radius:calc(var(--x-radius) * .4);background:var(--x-panel);box-shadow:var(--x-shadow)"; capIn.textContent = text; if (text) cap.append(capIn); capWords = ML.split(capIn, "words");
      capWords.forEach((w) => (w.style.willChange = "filter, opacity")); // one raster path whether blurred or settled
    } else if (kind === "window") {
      const ww = R.w * (R.h > R.w * 1.2 ? 0.86 : 0.7), wh = R.h * (R.h > R.w * 1.2 ? 0.42 : 0.62);
      win = mk(`position:absolute;left:${(R.w - ww) / 2}px;top:${(R.h - wh) / 2}px;width:${ww}px;height:${wh}px;border-radius:calc(var(--x-radius) * .4);background:var(--x-panel);border:1px solid var(--x-edge-color);box-shadow:var(--x-shadow);overflow:hidden;display:flex;flex-direction:column`, lay);
      const bh = Math.max(28, wh * 0.08);
      const bar = mk(`flex:0 0 ${bh}px;background:var(--x-bar);border-bottom:1px solid var(--x-line);display:flex;align-items:center;gap:${bh * 0.25}px;padding:0 ${bh * 0.45}px;direction:ltr`, win);
      for (const c of ["--x-light-1", "--x-light-2", "--x-light-3"]) mk(`width:${bh * 0.36}px;height:${bh * 0.36}px;border-radius:50%;background:var(${c});opacity:var(--x-lights)`, bar);
      const body = mk(`flex:1;padding:${bh * 0.9}px;display:flex;flex-direction:column;gap:${bh * 0.45}px`, win);
      const t1 = mk(`font:var(--x-head-weight) ${Math.min(headSize * 0.55, ww * 0.07).toFixed(1)}px/1.15 var(--x-head-font);color:var(--x-ink);text-align:start`, body); t1.textContent = text;
      [0.92, 0.7, 0.8, 0.5].forEach((w, i) => mk(`height:${bh * 0.42}px;width:${(w * 100).toFixed(0)}%;border-radius:var(--x-radius-s);background:${i === 0 ? "color-mix(in srgb, var(--x-accent) 30%, var(--x-panel-2))" : "var(--x-panel-2)"}`, body));
    } else {
      plate = mk(`position:absolute;inset:0;overflow:hidden;background:var(--x-accent)`, lay);
      crop = mk(`position:absolute;inset:0;background:${fill};transform-origin:50% 50%`, plate);
      mk(`position:absolute;inset:0;background:radial-gradient(80% 60% at 20% 90%, color-mix(in srgb, var(--x-glow-2) 45%, transparent), transparent 70%)`, crop);
      const fs = Math.min(headSize, R.w * 0.085, R.h * 0.12);
      const line = mk(`position:absolute;left:${m}px;right:${m}px;bottom:${Math.max(m, R.h * 0.16)}px;font:var(--x-head-weight) ${fs.toFixed(1)}px/1.12 var(--x-head-font);letter-spacing:var(--x-head-track);color:var(--x-accent-ink);text-align:start;text-wrap:balance`, plate);
      line.textContent = text; words = ML.split(line, "words");
      // each word rises from its own mask
      words.forEach((w) => { const mask = document.createElement("span"); mask.style.cssText = "display:inline-block;overflow:hidden;vertical-align:bottom;padding:0.06em 0 0.14em;margin:-0.06em 0 -0.14em"; w.replaceWith(mask); mask.append(w); });
    }

    const io2 = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const io3 = (x) => (x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2);
    const o3 = (x) => 1 - Math.pow(1 - x, 4);
    const ex = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
    const inD0 = kind === "card" ? 0.5 : kind === "window" ? 0.4 : kind === "rise" ? 0.8 * k : D;
    const q = Math.min(1, Math.max(0.2, end - at) / (0.15 + inD0)); // the room it has before the scene ends
    const outD = (kind === "card" ? 0.5 : 0.8) * k * q, inA = at + 0.15 * q, inD = inD0 * q;
    const arrive = inA + inD;
    const lv = Math.min(0.4, Math.max(0.1, end - arrive)); // the window leaves before the scene ends
    const leaveA = kind === "window" ? Math.max(arrive, end - lv - 0.05) : Infinity;
    const dark = kind === "window" ? 0.25 : p.darken, blurMax = kind === "card" ? 14 : kind === "window" ? 4 : p.blur;
    const side = p.direction === "left" ? 1 : p.direction === "right" ? -1 : 0; // "left": travels leftward, from the right
    ctx.sfx(inA, "whoosh.soft", 0.4);
    if (kind === "window") ctx.sfx(leaveA, "whoosh.soft", 0.2);
    return {
      draw(t) {
        const back2 = kind === "window" ? 1 - io2(ML.lin(t, leaveA, leaveA + lv)) : 1;
        const u = io2(ML.lin(t, at, at + outD)) * back2;
        const sc = kind === "card" ? 1 - (1 - p.recede_scale) * 0.5 * u : 1 - (1 - p.recede_scale) * u;
        const slide = kind === "card" ? -20 * dirX * io3(ML.lin(t, at, at + outD)) : 0;
        out.style.transform = u > 0 || slide ? `translateX(${slide.toFixed(3)}%) scale(${sc.toFixed(4)})` : outWas.tf;
        out.style.filter = u > 0 ? `brightness(${(1 - (1 - dark) * u).toFixed(4)})` : "";
        out.style.borderRadius = u > 0 ? `${(r0 + (rTo - r0) * u).toFixed(2)}px` : outWas.radius;
        out.style.overflow = u > 0 && whole ? "hidden" : "";
        if (whole) out.style.background = u > 0 ? "var(--x-ground-image), var(--x-ground)" : outWas.bg;
        back.style.opacity = u.toFixed(4);
        soft.forEach((e) => (e.style.filter = u > 0.002 && blurMax > 0 ? `blur(${(blurMax * u).toFixed(2)}px)` : ""));
        lay.style.visibility = t < inA ? "hidden" : "visible";
        if (kind === "plate" || kind === "rise" || kind === "mask") {
          let tf = "", op = 1, clip = "none";
          if (kind === "plate") {
            const v = 1 - io3(ML.lin(t, inA, arrive));
            tf = side ? `translateX(${(side * dirX * v * 100).toFixed(3)}%)` : `translateY(${(v * 100).toFixed(3)}%)`;
          } else if (kind === "rise") {
            const v = o3(ML.lin(t, inA, arrive)); op = v;
            tf = p.settle === "scale" ? `scale(${(1.06 - 0.06 * v).toFixed(4)})` : side ? `translateX(${(side * dirX * (1 - v) * 8).toFixed(3)}%)` : `translateY(${((1 - v) * 8).toFixed(3)}%)`;
          } else {
            const v = io3(ML.lin(t, inA, arrive)), r = Math.min(R.w, R.h) * 0.022 * (1 - v);
            clip = `inset(${(20 * (1 - v)).toFixed(3)}% round ${r.toFixed(2)}px)`;
          }
          plate.style.transform = tf; plate.style.opacity = op.toFixed(4); plate.style.clipPath = clip;
          crop.style.transform = `scale(${(1.08 - 0.08 * o3(ML.lin(t, inA, inA + 2))).toFixed(4)})`;
          words.forEach((w, i) => { const v = ex(ML.lin(t, arrive + 0.3 + i * 0.05, arrive + 0.3 + i * 0.05 + 0.6)); w.style.transform = `translateY(${((1 - v) * 115).toFixed(2)}%)`; });
        } else if (kind === "card") {
          const v = ex(ML.lin(t, inA, arrive)), x0 = +card.dataset.x, from = rtl ? -card.offsetWidth - m : R.w + m;
          card.style.left = (from + (x0 - from) * v).toFixed(2) + "px";
          card.style.filter = v < 0.999 ? `blur(${(20 * (1 - v)).toFixed(2)}px)` : "none";
          capIn.style.opacity = ML.lin(t, inA + 0.2, inA + 0.4).toFixed(4);
          capWords.forEach((w, i) => { const c = ML.land(t, inA + 0.25 + i * 0.06, inA + 0.55 + i * 0.06); w.style.opacity = c.toFixed(4); w.style.filter = c < 1 ? `blur(${((1 - c) * 12).toFixed(2)}px)` : "none"; });
        } else {
          const v = o3(ML.lin(t, inA, arrive)), l = io2(ML.lin(t, leaveA, leaveA + lv));
          win.style.opacity = (v * (1 - l)).toFixed(4);
          win.style.transform = `translateY(${((1 - v) * 20 - l * 20).toFixed(2)}px)`;
        }
      },
    };
  },
});
