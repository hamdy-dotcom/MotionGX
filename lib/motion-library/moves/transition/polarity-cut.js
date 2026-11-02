// Polarity cut: on one frame the ground and the ink swap — a dark chapter cuts to a light one (or back) with no fade
// and no slide; the corner carriers (a chapter number, a small wordmark) flip on the same frame. The dark side is the
// look's own colours or their inversion, whichever is darker, so the cut works on light and dark looks alike. Optional
// punctuation on the cut: a one-frame inverted flash, or a 1-2 frame hairline rule / grid flash in the new ink.
// Optional pre-exit: the headline's lines leave their masks (yPercent 0 -> -110, or +110) in 0.35 s power3.in, 0.06 s
// apart top line first, and the cut comes on the frame after the last one leaves. Landing on the new ground: the
// headline rises back word by word from its masks (0.6 s expo.out); or a brand mark (~10% of the width) appears on the
// cut frame settling 1.06 -> 1 in 0.4 s expo.out with a short line fading and rising 10 px 0.3 s later; or a wordmark
// rises letter by letter (Arabic word by word) y 100% -> 0 in its line mask, dim -> ink, 0.45 s expo.out 0.04 s apart,
// with an accent square period popping 0 -> 1 on back.out. Lands on the asked time (a beat or the chapter's first word).
// Source: MengTo/Skills documentary-brutalist-agency demo/index.html (MIT: the black / bone chapter swap, hairline
// rules) and operational-enterprise-ai SKILL.md (MIT: dark cinematic hero to light proof, hairline grids), with
// prompt-motion palashbagchi11-claudeai-then-i-asked, davidmarcus-opus-5-5-got-quite, sudeepsd-opus-5-5-is-goated
// (reference only: our own rebuild).
ML.define({
  id: "transition.polarity-cut",
  category: "transition",
  name: "Polarity cut",
  does: "The frame cuts decisively from a dark chapter to a light one (or back), no fade, and the new chapter's words or mark land on the new ground.",
  says: ["transition", "change", "energy", "focus", "brand", "problem", "relief"],
  energy: 4,
  targets: ["scene", "headline", "logo"],
  duration: [0.5, 1.5],
  params: {
    direction: { type: "choice", options: ["dark-to-light", "light-to-dark"], default: "dark-to-light" },
    flash: { type: "choice", options: ["none", "invert-frame", "hairline", "grid"], default: "none" },
    pre_exit: { type: "choice", options: ["none", "mask-lines-up", "mask-lines-down"], default: "none" },
    landing: { type: "choice", options: ["headline-rise", "mark", "wordmark-rise"], default: "headline-rise" },
    carrier_flip: { type: "bool", default: true },
  },
  pairs: ["text-in.mask-rise", "transition.hard-cut"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "MengTo/Skills:agent-skills/web-design/documentary-brutalist-agency/demo/index.html", license: "MIT", note: "with operational-enterprise-ai/SKILL.md (MIT) and prompt-motion palashbagchi11-claudeai-then-i-asked, davidmarcus-opus-5-5-got-quite, sudeepsd-opus-5-5-is-goated (reference)" },
  async setup(ctx) {
    const { p, at, stage, f } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, k = Math.min(W, H) / 1080;
    const FR = 1 / 30;

    // ── the two polarities: the look's own colours and their inversion; the darker one is "dark" ──
    const cs = getComputedStyle(host);
    const v = (n) => cs.getPropertyValue(n).trim();
    const ground = v("--x-ground"), ink = v("--x-ink");
    const probe = document.createElement("div"); host.append(probe);
    const lum = (c) => { probe.style.color = c; const m = (getComputedStyle(probe).color.match(/[\d.]+/g) || [0, 0, 0]).map(Number); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
    const groundDark = lum(ground) < lum(ink);
    probe.remove();
    const own = null; // the look as it is
    const inverted = {
      "--x-ground": ink, "--x-ink": ground,
      "--x-dim": `color-mix(in srgb, ${ground} 62%, ${ink})`,
      "--x-panel": `color-mix(in srgb, ${ground} 7%, ${ink})`, "--x-panel-2": `color-mix(in srgb, ${ground} 12%, ${ink})`,
      "--x-line": `color-mix(in srgb, ${ground} 16%, transparent)`, "--x-edge-color": `color-mix(in srgb, ${ground} 16%, transparent)`,
      "--x-shadow": "none", "--x-pointer": ground, "--x-pointer-edge": ink,
    };
    const dark = groundDark ? own : inverted, light = groundDark ? inverted : own;
    const [before, after] = p.direction === "light-to-dark" ? [light, dark] : [dark, light];
    let applied;
    const apply = (set) => {
      if (applied === set) return;
      applied = set;
      for (const key of Object.keys(inverted)) { if (set && set[key]) host.style.setProperty(key, set[key]); else host.style.removeProperty(key); }
    };
    host.style.color = "var(--x-ink)";
    // the scene's ground, so the swap shows on it
    const bed = document.createElement("div");
    bed.setAttribute("aria-hidden", "true");
    bed.style.cssText = "position:absolute;inset:0;background:var(--x-ground);pointer-events:none";
    host.prepend(bed);

    // ── the headline, in masks (pre-exit and the headline landing) ──
    const head = ctx.el && ctx.el !== stage && ctx.el !== host && !ctx.el.matches("svg, img") ? ctx.el : host.querySelector(".ml-title") || host.querySelector(".ml-hero");
    if (head) { try { const hc = getComputedStyle(head); await document.fonts.load(`${hc.fontWeight} ${hc.fontSize} ${hc.fontFamily}`, head.textContent || "A"); } catch (e) { /* as is */ } }
    const needWords = head && (p.pre_exit !== "none" || p.landing === "headline-rise");
    const words = needWords ? ML.split(head, "words") : [];
    words.forEach((w) => { const m = document.createElement("span"); m.style.cssText = "display:inline-block;overflow:hidden;vertical-align:top;padding:0.06em 0.03em 0.16em;margin:-0.06em -0.03em -0.16em"; w.replaceWith(m); m.append(w); });
    // lines: words grouped by where they sit
    const tops = [...new Set(words.map((w) => Math.round(w.parentElement.offsetTop)))].sort((a, b) => a - b);
    const lineOf = words.map((w) => tops.indexOf(Math.round(w.parentElement.offsetTop)));
    const L = Math.max(1, tops.length);
    const exitDur = 0.35, exitSign = p.pre_exit === "mask-lines-down" ? 1 : -1;
    const tc = p.pre_exit !== "none" && words.length ? at + (L - 1) * 0.06 + exitDur + FR : at;
    const p3in = (x) => x * x * x;

    // ── carriers: a chapter number and a small wordmark in the corners, flipping with the cut ──
    const logoSrc = host.querySelector('[data-slot="logo"], [data-slot-sample="logo"]') || stage.querySelector('[data-slot="logo"], [data-slot-sample="logo"]');
    const brandText = (logoSrc && logoSrc.textContent.trim()) || "";
    let num = null;
    if (p.carrier_flip) {
      const m = Math.round(Math.min(W, H) * 0.05), fs = Math.max(14, Math.round(22 * k));
      num = document.createElement("div");
      num.className = "ml-label"; num.setAttribute("dir", "ltr");
      num.style.cssText = `position:absolute;top:${m}px;${ctx.rtl ? "right" : "left"}:${m}px;font-size:${fs}px;color:var(--x-ink);z-index:7;pointer-events:none`;
      host.append(num);
      if (brandText) {
        const wm = document.createElement("div");
        wm.setAttribute("dir", "ltr");
        wm.textContent = brandText;
        wm.style.cssText = `position:absolute;top:${m}px;${ctx.rtl ? "left" : "right"}:${m}px;font:var(--x-head-weight) ${Math.round(fs * 1.4)}px var(--x-head-font);letter-spacing:var(--x-head-track);color:var(--x-ink);z-index:7;pointer-events:none`;
        host.append(wm);
      }
    }

    // ── the landing layer for mark / wordmark: the new chapter on its own ground ──
    let land = null, markEl = null, lineEl = null, chars = [], period = null;
    if (p.landing !== "headline-rise") {
      land = document.createElement("div");
      land.setAttribute("aria-hidden", "true");
      land.style.cssText = `position:absolute;inset:0;z-index:6;pointer-events:none;visibility:hidden;background:var(--x-ground);color:var(--x-ink);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${Math.round(28 * k)}px`;
      host.append(land);
      const subText = (host.querySelector(".ml-sub") || {}).textContent || (head ? head.textContent : "");
      if (p.landing === "mark") {
        const size = W * 0.1 * (f.tall ? 1.6 : 1);
        if (logoSrc) {
          // the brand's mark: its first shape (the logo's symbol), at ~10% of the width
          const sym = logoSrc.matches("svg") ? logoSrc.cloneNode(true) : null;
          if (sym) { sym.removeAttribute("data-slot"); sym.removeAttribute("data-slot-sample"); sym.querySelectorAll("text").forEach((x) => x.remove()); const r0 = logoSrc.querySelector("rect, circle, path"); if (r0) { const bb = r0.getBBox(); sym.setAttribute("viewBox", `${bb.x} ${bb.y} ${bb.width} ${bb.height}`); } sym.setAttribute("width", size); sym.setAttribute("height", size); markEl = sym; }
        }
        if (!markEl) { markEl = document.createElement("div"); markEl.style.cssText = `width:${size}px;height:${size}px;border-radius:calc(var(--x-radius) * ${(size / 120).toFixed(2)});background:var(--x-accent)`; }
        land.append(markEl);
        lineEl = document.createElement("div");
        lineEl.className = "ml-sub"; lineEl.textContent = subText.trim();
        lineEl.style.cssText = "color:var(--x-dim);text-align:center;max-width:80%";
        land.append(lineEl);
      } else {
        const wm = document.createElement("div");
        wm.className = "ml-hero"; wm.setAttribute("dir", brandText ? "ltr" : ctx.rtl ? "rtl" : "ltr");
        wm.textContent = brandText || (head ? head.textContent.trim() : "");
        wm.style.cssText = `display:flex;align-items:baseline;white-space:nowrap;max-width:${(W * 0.86).toFixed(0)}px`;
        land.append(wm);
        ML.fit(wm, W * 0.8);
        chars = ML.split(wm, "chars");
        chars.forEach((c) => { const m = document.createElement("span"); m.style.cssText = "display:inline-block;overflow:hidden;vertical-align:bottom;padding:0.04em 0.01em 0.12em;margin:-0.04em -0.01em -0.12em"; c.replaceWith(m); m.append(c); });
        period = document.createElement("span");
        const ps = 0.16;
        period.style.cssText = `display:inline-block;width:${ps}em;height:${ps}em;margin-inline-start:0.06em;background:var(--x-accent);border-radius:calc(var(--x-radius) * 0.06)`;
        wm.append(period);
      }
    }
    // ── the flash ──
    let flash = null;
    if (p.flash !== "none") {
      flash = document.createElement("div");
      flash.setAttribute("aria-hidden", "true");
      const hw = Math.max(2, Math.round(2 * k));
      const css = {
        "invert-frame": "background:var(--x-ink)",
        hairline: `background:linear-gradient(var(--x-ink), var(--x-ink)) 0 50% / 100% ${hw}px no-repeat`,
        grid: `background-image:linear-gradient(to right, var(--x-ink) ${hw / 2}px, transparent ${hw / 2}px), linear-gradient(to bottom, var(--x-ink) ${hw / 2}px, transparent ${hw / 2}px);background-size:${(W / 6).toFixed(1)}px ${(W / 6).toFixed(1)}px;background-position:${(W / 12).toFixed(1)}px ${(H / 2 % (W / 6)).toFixed(1)}px;opacity:.55`,
      }[p.flash];
      flash.style.cssText = `position:absolute;inset:0;z-index:9;pointer-events:none;visibility:hidden;${css}`;
      host.append(flash);
    }
    const flashFrames = p.flash === "invert-frame" ? 1 : 2;
    ctx.sfx(tc, "hit", 0.5);
    if (p.landing === "wordmark-rise" && chars.length) ctx.sfx(tc + chars.length * 0.04 + 0.25, "pop.soft", 0.3);
    if (p.pre_exit !== "none") ctx.sfx(at, "whoosh.soft", 0.25);
    return {
      draw(t) {
        const cut = t >= tc;
        apply(cut ? after : before);
        if (num) num.textContent = cut ? "02" : "01";
        // the headline: out of its masks before the cut, back up after it (headline landing)
        words.forEach((w, i) => {
          let y = 0;
          if (!cut) { if (p.pre_exit !== "none") { const a = at + lineOf[i] * 0.06; y = exitSign * 110 * p3in(ML.lin(t, a, a + exitDur)); } }
          else if (p.landing === "headline-rise") { const a = tc + lineOf[i] * 0.08 + (i % 4) * 0.03; y = 110 * (1 - ML.expo(t, a, a + 0.6)); }
          else y = exitSign * 110;
          w.style.transform = y ? `translateY(${y.toFixed(2)}%)` : "none";
        });
        if (land) {
          land.style.visibility = cut ? "visible" : "hidden";
          if (cut && markEl) {
            const s = 1.06 - 0.06 * ML.expo(t, tc, tc + 0.4);
            markEl.style.transform = `scale(${s.toFixed(4)})`;
            const u = ML.out(t, tc + 0.3, tc + 0.6);
            lineEl.style.opacity = u.toFixed(4);
            lineEl.style.transform = `translateY(${((1 - u) * 10 * k).toFixed(2)}px)`;
          }
          if (cut && chars.length) {
            chars.forEach((c, i) => {
              const a = tc + i * 0.04, u = ML.expo(t, a, a + 0.45);
              c.style.transform = `translateY(${((1 - u) * 100).toFixed(2)}%)`;
              c.style.color = `color-mix(in srgb, var(--x-ink) ${(u * 100).toFixed(1)}%, var(--x-dim))`;
            });
            const pa = tc + chars.length * 0.04 + 0.2, pu = ML.back(t, pa, pa + 0.4, 2);
            period.style.transform = `scale(${Math.max(0, pu).toFixed(4)})`;
          }
        }
        if (flash) flash.style.visibility = t >= tc && t < tc + flashFrames * FR - 1e-6 ? "visible" : "hidden";
      },
    };
  },
});
