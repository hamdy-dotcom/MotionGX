// Lower third: a thin accent bar grows up from the bottom beside the subject, then a small label (accent index +
// name), the title and a subtitle stack in next to it; the exit plays it back. Two more builds of the same caption:
// "numbered" (a mono accent index over a two-line medium caption rising out of a 6 px blur, lines 0.08 s apart) and
// a slanted plate (a skewed dark plate with a colour tab wiping in, the name in the tab's colour).
// The target's text is the title; a label / subtitle come from params, data-label / data-sub on the target, or a
// "title | subtitle" split in its text. Mirrored for RTL (side "left" sits on the right in Arabic).
// Source: our own rebuild of prompt-motion references (gorden-sun, mengto-a7f4679, allforbigfire) — reference only.
ML.define({
  id: "text-in.lower-third",
  category: "text-in",
  name: "Lower third",
  does: "A small accent bar or index number appears beside the subject, then a label, title and subtitle stack in next to it.",
  says: ["story", "brand", "focus", "step", "list", "proof"],
  energy: 2,
  targets: ["label", "headline", "line"],
  duration: [1, 4],
  params: {
    style: { type: "choice", options: ["bar", "numbered"], default: "bar" },
    plate: { type: "choice", options: ["bar", "slanted-plate"], default: "bar" },
    side: { type: "choice", options: ["left", "right"], default: "left" },
    lines: { type: "number", range: [2, 3], default: 3 },
    colour: { type: "choice", options: ["accent", "accent-2", "good", "bad", "ink"], default: "accent" },
    stagger: { type: "number", range: [0.08, 0.2], default: 0.15, unit: "s" },
    index: { type: "text", default: "01" },
    label: { type: "text", default: "" },
    sub: { type: "text", default: "" },
    skew: { type: "number", range: [0, 20], default: 12, unit: "deg" },
    exit: { type: "bool", default: true },
  },
  pairs: ["text-in.mask-rise", "camera.push-in"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:allforbigfire-3-3d-cg-claude-opus-5-5-bgm-python", license: "reference", note: "also gorden-sun-opus-5-5-3d-blender-3d-3d-three-js, mengto-a7f4679; our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    if (!el) return null;
    const doc = el.ownerDocument;
    const mk = (tag, css, text) => { const n = doc.createElement(tag); Object.assign(n.style, css); if (text != null) n.textContent = text; return n; };
    const colour = `var(--x-${["accent", "accent-2", "good", "bad", "ink"].includes(p.colour) ? p.colour : "accent"})`;

    // the words: the target's text is the title; label and subtitle from params, data-*, or a "title | sub" split
    const raw = (el.textContent || "").trim();
    const [t0, s0] = raw.includes("|") ? raw.split("|").map((x) => x.trim()) : [raw, ""];
    const title = t0;
    const sub = p.lines >= 3 ? p.sub || el.dataset.sub || s0 || "" : "";
    const name = p.label || el.dataset.label || "";
    const index = p.index || "";

    // sizes relative to the target and the stage
    const base = parseFloat(getComputedStyle(el).fontSize) || 30;
    const numbered = p.style === "numbered";
    const slanted = !numbered && p.plate === "slanted-plate";
    const titleSize = numbered ? Math.max(base * 0.8, f.W * 0.04) : Math.max(base, f.W * 0.028);
    const physLeft = (p.side === "left") !== !!rtl; // "left" mirrors to the right in a right-to-left film
    const away = physLeft ? -1 : 1; // the side the text slides in from (towards the bar)

    el.textContent = "";
    el.style.direction = "ltr"; // a physical row; the text inside keeps its own direction
    el.style.display = "flex";
    el.style.flexDirection = physLeft ? "row" : "row-reverse";
    el.style.justifyContent = "flex-start";
    el.style.alignItems = "stretch";
    el.style.textAlign = physLeft ? "left" : "right";
    el.style.letterSpacing = "normal";
    el.style.textTransform = "none";
    el.style.color = "var(--x-ink)";
    const dir = rtl ? "rtl" : "ltr";
    const parts = { bar: null, tab: null, plate: null, label: null, title: null, sub: null, index: null };

    if (numbered) {
      const stack = mk("div", { direction: dir, display: "flex", flexDirection: "column", gap: `${(titleSize * 0.18).toFixed(1)}px`, maxWidth: "100%" });
      parts.index = mk("div", { font: `var(--x-label-weight) ${(titleSize * 0.28).toFixed(1)}px var(--x-mono-font)`, letterSpacing: "var(--x-label-track)", color: colour, textTransform: "var(--x-label-case)" }, index || "01");
      parts.title = mk("div", { font: `500 ${titleSize.toFixed(1)}px/1.12 var(--x-head-font)`, letterSpacing: "var(--x-head-track)", color: "var(--x-ink)", textWrap: "balance" }, title);
      stack.append(parts.index, parts.title);
      if (sub) { parts.sub = mk("div", { font: `500 ${titleSize.toFixed(1)}px/1.12 var(--x-head-font)`, letterSpacing: "var(--x-head-track)", color: "var(--x-dim)" }, sub); stack.append(parts.sub); }
      el.append(stack);
    } else if (slanted) {
      const h = titleSize * 2.1;
      parts.plate = mk("div", { position: "relative", display: "flex", flexDirection: physLeft ? "row" : "row-reverse", alignItems: "stretch", minHeight: `${h.toFixed(1)}px`, transform: `skewX(${(-p.skew * (physLeft ? 1 : -1)).toFixed(2)}deg)`, background: "color-mix(in srgb, var(--x-ink) 92%, transparent)", borderRadius: "calc(var(--x-radius) * 0.12)", overflow: "hidden", maxWidth: "100%" });
      parts.tab = mk("div", { width: `${(titleSize * 0.62).toFixed(1)}px`, flex: "none", background: colour, transformOrigin: physLeft ? "left center" : "right center" });
      const inner = mk("div", { direction: dir, display: "flex", flexDirection: "column", justifyContent: "center", padding: `${(titleSize * 0.3).toFixed(1)}px ${(titleSize * 0.9).toFixed(1)}px ${(titleSize * 0.3).toFixed(1)}px ${(titleSize * 0.55).toFixed(1)}px`, transform: `skewX(${(p.skew * (physLeft ? 1 : -1)).toFixed(2)}deg)` });
      parts.label = mk("div", { font: `var(--x-label-weight) ${(titleSize * 0.36).toFixed(1)}px var(--x-label-font)`, letterSpacing: "var(--x-label-track)", textTransform: "var(--x-label-case)", color: "var(--x-ground)", opacity: "0.85" }, [index, name].filter(Boolean).join("  "));
      parts.title = mk("div", { font: `var(--x-head-weight) ${titleSize.toFixed(1)}px/1.08 var(--x-head-font)`, letterSpacing: "var(--x-head-track)", color: colour === "var(--x-ink)" ? "var(--x-ground)" : colour, whiteSpace: "nowrap" }, title);
      inner.append(parts.label, parts.title);
      if (sub) { parts.sub = mk("div", { font: `italic var(--x-body-weight) ${(titleSize * 0.42).toFixed(1)}px var(--x-body-font)`, color: "var(--x-ground)", opacity: "0.7" }, sub); inner.append(parts.sub); }
      parts.plate.append(parts.tab, inner);
      el.append(parts.plate);
    } else {
      const barW = Math.max(3, titleSize * 0.1);
      parts.bar = mk("div", { width: `${barW.toFixed(1)}px`, flex: "none", alignSelf: "stretch", minHeight: `${(titleSize * 1.9).toFixed(1)}px`, background: colour, borderRadius: "var(--x-radius-s)", transformOrigin: "50% 100%" });
      const stack = mk("div", { direction: dir, display: "flex", flexDirection: "column", justifyContent: "center", gap: `${(titleSize * 0.12).toFixed(1)}px`, [physLeft ? "marginLeft" : "marginRight"]: `${Math.max(12, titleSize * 0.4).toFixed(1)}px`, minWidth: "0" });
      const lab = mk("div", { font: `var(--x-label-weight) ${(titleSize * 0.36).toFixed(1)}px var(--x-label-font)`, letterSpacing: "var(--x-label-track)", textTransform: "var(--x-label-case)", color: "var(--x-dim)" });
      if (index) lab.append(mk("span", { color: colour, marginInlineEnd: "0.8em" }, index));
      if (name) lab.append(mk("span", {}, name));
      parts.label = lab;
      parts.title = mk("div", { font: `var(--x-head-weight) ${titleSize.toFixed(1)}px/1.08 var(--x-head-font)`, letterSpacing: "var(--x-head-track)", color: "var(--x-ink)" }, title);
      stack.append(lab, parts.title);
      if (sub) { parts.sub = mk("div", { font: `italic var(--x-body-weight) ${(titleSize * 0.42).toFixed(1)}px var(--x-body-font)`, color: "var(--x-dim)" }, sub); stack.append(parts.sub); }
      el.append(parts.bar, stack);
    }

    // timings; the exit plays the entrance back, never before it has landed
    const st = p.stagger;
    const inDone = at + (numbered ? 0.4 + 0.08 * 2 : slanted ? 0.45 : 0.35 + 0.2 + st);
    const outAt = p.exit ? Math.max(inDone + 0.3, end - 0.45) : Infinity;
    ctx.sfx(at, "tap", 0.3);
    ctx.sfx(at + (numbered ? 0.08 : 0.2), "pop.soft", 0.18);
    const o3 = (x) => 1 - Math.pow(1 - x, 3), i3 = (x) => x * x * x;
    // a part comes in over [a, a+d] on power3.out and leaves (reversed order) on power3.in
    const phase = (t, a, d, k) => {
      const inn = o3(ML.lin(t, a, a + d));
      if (t < outAt) return inn;
      const o = outAt + k * 0.05;
      return inn * (1 - i3(ML.lin(t, o, o + 0.28)));
    };
    const set = (n, o, x, y, blur) => {
      if (!n) return;
      n.style.opacity = o.toFixed(4);
      n.style.translate = x || y ? `${x.toFixed(2)}px ${y.toFixed(2)}px` : "none";
      n.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
    };
    return {
      draw(t) {
        if (numbered) {
          [parts.index, parts.title, parts.sub].forEach((n, i) => {
            const u = phase(t, at + i * 0.08, 0.4, 2 - i);
            set(n, u, 0, (1 - u) * titleSize * 0.3, (1 - u) * 6);
          });
        } else if (slanted) {
          const tab = phase(t, at, 0.15, 2);
          parts.tab.style.scale = `${tab.toFixed(4)} 1`;
          const pl = phase(t, at + 0.05, 0.3, 1);
          const cut = ((1 - pl) * 100).toFixed(2);
          parts.plate.style.clipPath = physLeft ? `inset(0 ${cut}% 0 0)` : `inset(0 0 0 ${cut}%)`;
          parts.plate.style.visibility = tab > 0.001 ? "visible" : "hidden";
          [parts.label, parts.title, parts.sub].forEach((n, i) => {
            const u = phase(t, at + 0.15 + i * 0.05, 0.25, 0);
            if (n) { n.style.translate = `${(away * (1 - u) * titleSize * 0.7).toFixed(2)}px 0`; n.style.visibility = u > 0.001 ? "visible" : "hidden"; }
          });
        } else {
          const b = phase(t, at, 0.3, 3);
          parts.bar.style.scale = `1 ${b.toFixed(4)}`;
          parts.bar.style.visibility = b > 0.001 ? "visible" : "hidden";
          const l = phase(t, at + 0.15, 0.3, 2);
          set(parts.label, l, 0, 0, 0);
          const ti = phase(t, at + 0.2, 0.35, 1);
          set(parts.title, ti, away * (1 - ti) * titleSize * 0.35, 0, 0);
          const s = phase(t, at + 0.2 + st, 0.35, 0);
          set(parts.sub, s, away * (1 - s) * titleSize * 0.25, 0, 0);
        }
      },
    };
  },
});
