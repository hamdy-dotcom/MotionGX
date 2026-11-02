// Wipe-synced text swap: one wipe line crosses the frame; it erases the old title just ahead of itself and writes the
// new one in right behind it, so the two titles never share the screen. Ported from MengTo's horizontal-scroll-scenes
// burn wipe (demo.html, the chapter masks): L is the line's place as a share of the frame, running −0.08 → 1.16 over
// the move. Outgoing: mask linear-gradient(a, transparent (L−0.010), #000 (L+0.016)) — erased behind the line, hidden
// once L > 1.07. Incoming: linear-gradient(a, #000 (L−0.062), transparent (L−0.048)) — written in behind the line,
// trailing it by the trail gap. a = 90deg left → right, 270deg right → left (Arabic reads the other way, so the
// direction param is the reading direction and flips in RTL). On a tall frame where both titles share one slot the
// incoming holds until the line clears: opacity × smoothstep(1.00, 1.14, L), unmasked (the source's mobile rule).
// burn-off: only the outgoing half — the line burns an opening title off. Shares are frame shares, converted to the
// element's own gradient box every frame. The line itself: a hairline in the accent with a soft glow, or the source's
// burn (a hot band + a screen glow + a trailing veil) in the look's accents.
// Source: MengTo/Skills agent-skills/web-design/horizontal-scroll-scenes (demo.html burn masks + .fx flame/glow/veil, MIT).
ML.define({
  id: "mask.wipe-synced-text",
  category: "mask",
  name: "Wipe-synced text swap",
  does: "As a wipe line crosses the frame it erases the old title and writes the new one in right behind it, so two titles never share the screen.",
  says: ["transition", "change", "story"],
  energy: 2,
  targets: ["headline", "line", "scene"],
  duration: [0.6, 1.4],
  params: {
    direction: { type: "choice", options: ["ltr", "rtl"], default: "ltr" },
    trail_gap: { type: "number", range: [3, 8], default: 5, unit: "%" },
    softness: { type: "number", range: [1, 3], default: 1.5, unit: "%" },
    duration: { type: "number", range: [0.6, 1.4], default: 0.9, unit: "s" },
    mode: { type: "choice", options: ["swap", "burn-off"], default: "swap" },
    text: { type: "text", default: "" },
    line: { type: "choice", options: ["hairline", "burn", "none"], default: "hairline" },
  },
  pairs: ["text-in.punchline", "transition.paper-burn"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:agent-skills/web-design/horizontal-scroll-scenes", license: "MIT", note: "demo.html burn wipe chapter masks (L−0.010/L+0.016 out, L−0.062/L−0.048 in, 1.07 hide, smoothstep(1,1.14) mobile hold)" },
  setup(ctx) {
    const { el, p, at, end, stage } = ctx;
    if (!el) return null;
    const host = ctx.scene || stage;
    const W = ctx.f.W, H = ctx.f.H;
    // the reading direction, mirrored in Arabic
    const rtl = ctx.rtl ? p.direction === "ltr" : p.direction === "rtl";
    const ang = rtl ? 270 : 90;
    const span = Math.min(ML.clamp(+p.duration, 0.6, 1.4), Math.max(0.4, end - at - 0.05));
    const gap = ML.clamp(+p.trail_gap, 3, 8) / 100, soft = ML.clamp(+p.softness, 1, 3) / 100;
    const swap = p.mode !== "burn-off";
    const tall = !!ctx.f.tall;
    const isStage = el === stage;
    const target = isStage ? host : el;
    const b = ctx.box(target);

    // the incoming title: a twin of the outgoing in the same slot, its own words
    let inc = null;
    if (swap && !isStage) {
      const sib = el.nextElementSibling;
      const text = String(p.text || "").trim() || el.dataset.next || (sib && sib.textContent.trim()) || el.textContent.trim();
      inc = el.cloneNode(false);
      ["data-slot", "id", "data-ml-split"].forEach((a) => inc.removeAttribute(a));
      inc.setAttribute("aria-hidden", "true");
      inc.textContent = text;
      inc.style.cssText = (el.getAttribute("style") || "") + `;position:absolute;left:${el.offsetLeft}px;top:${el.offsetTop}px;width:${el.offsetWidth}px;margin:0;visibility:hidden;pointer-events:none`;
      el.parentElement.append(inc);
    }

    // the line across the frame
    let fx = null, line = null, glow = null, veil = null;
    if (p.line !== "none") {
      const k = Math.min(W, H) / 1080;
      fx = document.createElement("div");
      fx.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden;visibility:hidden;z-index:5";
      if (p.line === "burn") {
        const vw = W * 0.34;
        veil = document.createElement("div");
        veil.style.cssText = `position:absolute;top:0;bottom:0;left:0;width:${vw}px;background:linear-gradient(${rtl ? 270 : 90}deg, color-mix(in srgb, var(--x-ground) 88%, transparent), color-mix(in srgb, var(--x-ground) 52%, transparent) 40%, transparent)`;
        glow = document.createElement("div");
        glow.style.cssText = `position:absolute;top:0;bottom:0;left:0;width:${240 * k}px;margin-left:${-120 * k}px;mix-blend-mode:screen;background:linear-gradient(90deg, transparent, color-mix(in srgb, var(--x-accent-2) 10%, transparent) 30%, color-mix(in srgb, var(--x-accent-2) 34%, transparent) 50%, color-mix(in srgb, var(--x-accent-2) 10%, transparent) 70%, transparent)`;
        line = document.createElement("div");
        line.style.cssText = `position:absolute;top:0;bottom:0;left:0;width:${36 * k}px;margin-left:${-18 * k}px;background:linear-gradient(90deg, transparent, color-mix(in srgb, var(--x-accent) 70%, transparent) 30%, var(--x-accent-2) 50%, color-mix(in srgb, var(--x-accent) 70%, transparent) 70%, transparent)`;
        fx.append(veil, glow, line);
      } else {
        line = document.createElement("div");
        line.style.cssText = `position:absolute;top:0;bottom:0;left:0;width:${Math.max(2, 2 * k)}px;margin-left:${-Math.max(1, k)}px;background:linear-gradient(180deg, transparent, var(--x-accent) 18%, var(--x-accent) 82%, transparent);box-shadow:0 0 ${14 * k}px ${3 * k}px color-mix(in srgb, var(--x-accent) 45%, transparent)`;
        fx.append(line);
      }
      (isStage ? stage : host).append(fx);
    }

    // frame share L → a gradient stop in the element's own box (its gradient runs along a, from its own edge)
    // a stop at frame share s along the travel → a % of the element's own gradient box (which starts at its own edge)
    const start = rtl ? W - b.x - b.w : b.x;
    const local = (L, off) => (((L + off) * W - start) / b.w) * 100;
    const k = soft / 0.015; // softness scales the source's edge widths (1.5 % = the source)
    const pct = (v) => v.toFixed(3) + "%";
    const setMask = (node, m) => { node.style.maskImage = m; node.style.webkitMaskImage = m; };
    const sstep = (a, c, x) => { const u = ML.clamp((x - a) / (c - a)); return u * u * (3 - 2 * u); };

    ctx.sfx(at, "whoosh.soft", 0.35);
    return {
      draw(t) {
        const started = t >= at - 1e-6;
        const L = -0.08 + 1.24 * ML.ease(t, at, at + span);
        // the outgoing: erased behind the line, gone once the line has cleared
        if (!started) { setMask(target, "none"); target.style.visibility = ""; }
        else if (L > 1.07) { setMask(target, "none"); target.style.visibility = "hidden"; }
        else {
          target.style.visibility = "";
          setMask(target, `linear-gradient(${ang}deg, transparent ${pct(local(L, -0.01 * k))}, #000 ${pct(local(L, 0.016 * k))})`);
        }
        // the incoming: written in behind the line, trailing it by the gap
        if (inc) {
          if (!started || L - gap < -0.02) { inc.style.visibility = "hidden"; }
          else if (tall) {
            const o = sstep(1.0, 1.14, L);
            inc.style.visibility = o > 0.002 ? "visible" : "hidden";
            inc.style.opacity = o.toFixed(4);
            setMask(inc, "none");
          } else {
            inc.style.visibility = "visible";
            inc.style.opacity = "1";
            setMask(inc, `linear-gradient(${ang}deg, #000 ${pct(local(L, -gap - 0.012 * k))}, transparent ${pct(local(L, -gap + 0.002 * k))})`);
          }
        }
        // the line
        if (fx) {
          const on = started && L > -0.06 && L < 1.12;
          fx.style.visibility = on ? "visible" : "hidden";
          if (on) {
            const x = (rtl ? 1 - L : L) * W;
            line.style.translate = `${x.toFixed(2)}px 0`;
            if (glow) glow.style.translate = `${x.toFixed(2)}px 0`;
            if (veil) veil.style.translate = `${(rtl ? x : x - W * 0.34).toFixed(2)}px 0`;
          }
        }
      },
    };
  },
});
