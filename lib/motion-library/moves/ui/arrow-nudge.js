// Arrow nudge: the arrow in a link or button steps toward where it points (right 0 → 4 px, or up-right +x / −y) on
// power3.out and back, while its cell darkens / its circle fills / its underline brightens. Five forms — bare icon in
// a link, 34 px circle, split CTA (label block + dark arrow cell inside a 1 px gradient wrapper), underlined link with
// an up-right arrow, and a pill with a chevron at 70% — plus a duplicate-swap variant (the arrow slides out and fades
// while a fresh copy slides in from behind). Directions mirror in RTL. Distances are web px scaled to the type size.
// Sources: MengTo/Skills web-design/container-lines, editorial-tech, globe-particles demos and the hover recipes in
// cinematic-gsap-lenis-motion-system/SKILL.md (MIT).
ML.define({
  id: "ui.arrow-nudge",
  category: "ui",
  name: "Arrow nudge (link / split CTA)",
  does: "The arrow in a link or button steps toward its target, or slides out as a fresh copy slides in, while its cell or circle darkens or fills.",
  says: ["step", "focus", "flow", "choice", "urgency", "precision", "arrival", "simplicity"],
  energy: 2,
  targets: ["shape", "label", "cursor", "card"],
  duration: [0.3, 3],
  params: {
    form: { type: "choice", options: ["bare-icon", "circle", "split-block", "underlined-link", "pill"], default: "split-block" },
    direction: { type: "choice", options: ["right", "up-right", "left"], default: "right" },
    distance: { type: "number", range: [2, 16], default: 4, unit: "px" },
    duplicate_swap: { type: "bool", default: false },
    circle_fill: { type: "bool", default: false },
    duration: { type: "number", range: [0.15, 0.6], default: 0.35, unit: "s" },
    repeat: { type: "number", range: [1, 3], default: 2 },
    text: { type: "text", default: "" },
    word: { type: "text", default: "" },
  },
  pairs: ["ui.cursor-glide-click", "ui.cta-button-rise", "ui.button-fill"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/container-lines", license: "MIT", note: "forms also from editorial-tech, globe-particles and cinematic-gsap-lenis-motion-system hover recipes" },
  setup(ctx) {
    const { p, at, end, rtl, f } = ctx;
    const doc = document;
    const mk = (tag, css, html, parent) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (html != null) e.innerHTML = html; if (parent) parent.append(e); return e; };
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    const own = ctx.el ? ctx.el.textContent.trim() : "";
    const label = p.text || own || (rtl ? (p.form === "underlined-link" ? "شوف المجموعات" : "ابدأ الآن") : p.form === "underlined-link" ? "View collections" : "Get started");
    let host = ctx.el, fs;
    if (host) { fs = parseFloat(getComputedStyle(host).fontSize) || 28; host.replaceChildren(); }
    else {
      host = mk("div", "position:absolute;left:var(--pic-x);top:var(--pic-y);width:var(--pic-w);height:var(--pic-h);display:flex;align-items:center;justify-content:center;z-index:4;background:var(--x-ground)", null, ctx.scene || ctx.stage);
      fs = ML.clamp(Math.min(f.W, f.H) * 0.04, 22, 52);
    }
    const k = fs / 16; // web px → our px
    // direction in screen space (RTL mirrors the horizontal)
    const dir = p.form === "underlined-link" && p.direction === "right" ? "up-right" : p.direction;
    let vx = dir === "left" ? -1 : 1, vy = dir === "up-right" ? -1 : 0;
    if (rtl) vx = -vx;
    const flip = vx < 0 ? "transform:scaleX(-1);" : "";
    const pathD = p.form === "pill" ? "M9 6l6 6-6 6" : dir === "up-right" ? "M7 17L17 7M8 7h9v9" : "M5 12h14M13 6l6 6-6 6";
    const svg = (c) => `<svg viewBox="0 0 24 24" style="display:block;width:1em;height:1em;${flip}" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${pathD}"/></svg>`;
    const root = mk("div", `display:inline-flex;align-items:stretch;font-size:${fs}px;font-family:var(--x-body-font);color:var(--x-ink);white-space:nowrap`, null, host);
    let cell, labelEl, underline = null, circle = null, arrowColor = "currentColor";
    if (p.form === "split-block") {
      root.style.cssText += ";padding:1px;background:linear-gradient(to right, color-mix(in srgb, var(--x-ink) 30%, transparent), color-mix(in srgb, var(--x-ink) 5%, transparent));border-radius:calc(var(--x-radius) * 0.15)";
      labelEl = mk("span", `display:flex;align-items:center;background:var(--x-panel);color:var(--x-ink);padding:0.6em 1.3em;font-weight:500;text-transform:uppercase;letter-spacing:${rtl ? 0 : "-0.01em"}`, esc(label), root);
      cell = mk("span", `display:flex;align-items:center;justify-content:center;padding:0 0.9em;background:var(--x-ink);border-inline-start:1px solid color-mix(in srgb, var(--x-panel) 10%, transparent);overflow:hidden;position:relative`, null, root);
      arrowColor = "var(--x-accent)";
    } else if (p.form === "circle") {
      root.style.alignItems = "center"; root.style.gap = "0.6em";
      labelEl = mk("span", "font-weight:500", esc(label), root);
      cell = circle = mk("span", "position:relative;display:flex;align-items:center;justify-content:center;width:2.1em;height:2.1em;border-radius:50%;border:1px solid currentColor;overflow:hidden", null, root);
    } else if (p.form === "underlined-link") {
      root.style.alignItems = "center"; root.style.gap = "0.35em";
      labelEl = mk("span", "position:relative;font-weight:500;padding-bottom:0.15em", esc(label), root);
      underline = mk("span", "position:absolute;inset-inline:0;bottom:0;height:2px", null, labelEl);
      cell = mk("span", "position:relative;display:flex;align-items:center;justify-content:center;width:1.2em;height:1.2em;overflow:hidden", null, root);
    } else if (p.form === "pill") {
      root.style.cssText += ";align-items:center;gap:0.4em;padding:0.55em 1em 0.55em 1.3em;border-radius:var(--x-radius-s);background:var(--x-accent);color:var(--x-accent-ink)";
      if (rtl) root.style.padding = "0.55em 1.3em 0.55em 1em";
      labelEl = mk("span", "font-weight:600", esc(label), root);
      cell = mk("span", "position:relative;display:flex;align-items:center;justify-content:center;width:1.2em;height:1.2em;opacity:0.7;overflow:hidden", null, root);
    } else {
      root.style.alignItems = "center"; root.style.gap = "0.4em";
      labelEl = mk("span", "font-weight:500", esc(label), root);
      cell = mk("span", "position:relative;display:flex;align-items:center;justify-content:center;width:1.2em;height:1.2em;overflow:visible", null, root);
      arrowColor = "var(--x-accent)";
    }
    if (p.duplicate_swap && cell.style.overflow !== "hidden") cell.style.overflow = "hidden";
    const A = mk("span", "display:flex", svg(arrowColor), cell);
    const B = p.duplicate_swap ? mk("span", "position:absolute;display:flex", svg(arrowColor), cell) : null;
    const strokeEls = [A, B].filter(Boolean).map((x) => x.querySelector("svg"));
    // press moments: on the spoken CTA word if given, then a second beat if there's room
    const first = Math.min(end - 0.45, Math.max(at + 0.45, p.word ? ctx.word(p.word, at + 0.45) : at + 0.45));
    const presses = [];
    for (let i = 0; i < Math.round(p.repeat); i++) { const tt = first + i * 1.3; if (tt < end - 0.35) presses.push(tt); }
    presses.forEach((tt) => ctx.sfx(tt, "tap", 0.35));
    const D = p.duration, d = p.distance * k;
    const p3 = ML.bezier(0.215, 0.61, 0.355, 1); // power3.out
    return {
      draw(t) {
        ML.show(root, t, at, end - 0.25);
        // u: how far into the current nudge (out and back); s: swap progress (stays swapped until the next press)
        let u = 0, s = 0, idx = -1;
        presses.forEach((tt, i) => { if (t >= tt) idx = i; });
        if (idx >= 0) {
          const tt = presses[idx];
          if (p.duplicate_swap) s = p3(ML.lin(t, tt, tt + D)), u = s;
          else u = p3(ML.lin(t, tt, tt + D)) * (1 - p3(ML.lin(t, tt + D + 0.2, tt + 2 * D + 0.2)));
        }
        if (p.duplicate_swap) {
          const out = Math.max(d, 6 * k);
          A.style.translate = `${(vx * out * s).toFixed(2)}px ${(vy * out * s).toFixed(2)}px`;
          A.style.opacity = (1 - s).toFixed(4);
          B.style.translate = `${(-vx * out * (1 - s)).toFixed(2)}px ${(-vy * out * (1 - s)).toFixed(2)}px`;
          B.style.opacity = s.toFixed(4);
          if (idx < 0) { B.style.opacity = "0"; A.style.opacity = "1"; }
        } else {
          A.style.translate = `${(vx * d * u).toFixed(2)}px ${(vy * d * u).toFixed(2)}px`;
        }
        // the cell / circle / underline answer on the same beat
        const h = idx >= 0 ? ML.out(t, presses[idx], presses[idx] + Math.max(D, 0.2)) * (1 - ML.out(t, presses[idx] + D + 0.2, presses[idx] + 2 * D + 0.4)) : 0;
        const hold = h;
        if (p.form === "split-block") cell.style.background = `color-mix(in srgb, var(--x-ink) ${(100 - 12 * hold).toFixed(1)}%, var(--x-panel))`;
        if (circle) {
          const fill = p.circle_fill ? hold : hold * 0.12;
          circle.style.background = `color-mix(in srgb, var(--x-ink) ${(fill * 100).toFixed(1)}%, transparent)`;
          const inv = p.circle_fill ? hold : 0;
          strokeEls.forEach((e) => e.setAttribute("stroke", inv > 0.5 ? "var(--x-ground)" : "currentColor"));
        }
        if (underline) underline.style.background = `color-mix(in srgb, currentColor ${(20 + 40 * hold).toFixed(1)}%, transparent)`;
        if (p.form === "pill") cell.style.opacity = (0.7 + 0.3 * hold).toFixed(4);
      },
    };
  },
});
