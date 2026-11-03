// Word slot cycles: one slot of a line rolls through a list (words, currencies, cities, count phrases), each new item
// replacing the last in place inside a masked slot anchored on its centre, so the line stays balanced while the slot's
// width eases to the new item. Swaps: roll (out 0 → −100% on power2.in 0.18 s, in +100% → 0 on power3.out 0.25 s with a
// 1.04 → 1 settle), blur-slide (out −25% blurring 6 px and fading, in from +30% unblurring), a hard cut, or a fade.
// Optional: a fixed lead line above (condensed caps) or a claim line (the slot then sits at 55% grey), an accent full
// stop, an underline whose width follows the item, the last item in the accent, a count-phrase item whose number sits in
// the accent gradient and counts up from 0. Items land on their spoken words when the voice says them all, else on a
// steady hold. Arabic items stay whole; "up" / "down" are vertical, so RTL needs no mirror.
// Source: prompt-motion rammanq-wow-just-tried-this, safarkhanshuvo-this-is-insane-claude, davidmarcus-opus-5-5-got-quite,
// agonaliu-opus-5-5-one-shotted-this (reference only — our own rebuild).
ML.define({
  id: "kinetic.word-slot-cycle",
  category: "kinetic",
  name: "Word slot cycles",
  does: "One slot in a headline cycles through a list (words, currencies, count phrases), each new one replacing the last in place, optionally under a fixed lead line.",
  says: ["list", "choice", "energy", "scale", "problem"],
  energy: 3,
  targets: ["word", "headline", "number"],
  duration: [1.5, 6],
  params: {
    swap: { type: "choice", options: ["roll", "blur-slide", "cut", "fade"], default: "roll" },
    direction: { type: "choice", options: ["up", "down"], default: "up" },
    hold: { type: "number", range: [0.3, 1], default: 0.5, unit: "s" },
    lead_line: { type: "choice", options: ["none", "above", "claim"], default: "none" },
    lead: { type: "text", default: "" },
    underline: { type: "bool", default: false },
    accent_dot: { type: "bool", default: true },
    last_accent: { type: "bool", default: false },
    count_up: { type: "bool", default: false },
    items: { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "kinetic.feature-word-period"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:rammanq-wow-just-tried-this", license: "reference", note: "our own code; also safarkhanshuvo-this-is-insane-claude, davidmarcus-opus-5-5-got-quite, agonaliu-opus-5-5-one-shotted-this" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const doc = el.ownerDocument, f = ctx.f, k = Math.min(f.W, f.H) / 1080;
    const own = (el.textContent || "").replace(/\s+/g, " ").trim();
    // the list: items split on | or new lines, or on a comma that isn't inside a number ("1,000 users"); with none given, the target's own words
    let items = String(p.items || "").split(/[|\n]+|[,،](?!\d)/).map((x) => x.trim()).filter(Boolean);
    if (!items.length) items = own.split(" ").map((w) => w.replace(/[.,،؛؟!?…:]+$/u, "")).filter(Boolean);
    items = items.slice(0, 10);
    if (!items.length) return null;
    const n = items.length;
    // the lead line: its own text, else the scene's headline when the slot is another element
    const title = ctx.scene && ctx.scene.querySelector(".ml-title");
    let leadText = String(p.lead || "").trim();
    if (!leadText && p.lead_line !== "none" && title && title !== el && !el.contains(title)) leadText = (title.textContent || "").replace(/\s+/g, " ").trim();
    const lead = p.lead_line !== "none" && leadText;
    if (lead && title && title !== el && !el.contains(title) && !p.lead) title.style.display = "none"; // the lead line is the headline now: its band is free
    // ── build: [lead] / [mask with items][dot], underline under the mask ──
    el.textContent = "";
    Object.assign(el.style, { textAlign: "center", color: "var(--x-ink)" });
    let leadEl = null;
    if (lead) {
      leadEl = doc.createElement("div");
      Object.assign(leadEl.style, p.lead_line === "above"
        ? { font: `700 ${(80 * k).toFixed(1)}px / 1 var(--x-head-font)`, fontStretch: "condensed", textTransform: rtl ? "none" : "uppercase", letterSpacing: rtl ? "0" : "-0.01em", color: "var(--x-ink)", marginBottom: (14 * k).toFixed(1) + "px" }
        : { font: `var(--x-head-weight) ${(120 * k).toFixed(1)}px / 1.05 var(--x-head-font)`, letterSpacing: rtl ? "0" : "-0.04em", color: "var(--x-ink)" });
      leadEl.textContent = leadText;
      el.append(leadEl);
    }
    const line = doc.createElement("div");
    Object.assign(line.style, { whiteSpace: "nowrap", direction: rtl ? "rtl" : "ltr", font: `var(--x-head-weight) ${(150 * k).toFixed(1)}px / 1.1 var(--x-head-font)`, letterSpacing: rtl ? "0" : "-0.04em", color: p.lead_line === "claim" && lead ? "color-mix(in srgb, var(--x-ink) 45%, var(--x-ground))" : "var(--x-ink)" });
    el.append(line);
    const wrap = doc.createElement("span");
    Object.assign(wrap.style, { position: "relative", display: "inline-block", verticalAlign: "bottom" });
    line.append(wrap);
    const mask = doc.createElement("span");
    Object.assign(mask.style, { position: "relative", display: "block", clipPath: "inset(0 -100%)", height: "1.18em" }); // the roll's mask: vertical only, so a wider item's sides are never cut while the slot eases to its width
    wrap.append(mask);
    const bar = doc.createElement("span");
    Object.assign(bar.style, { position: "absolute", left: "0", right: "0", bottom: "-0.04em", height: Math.max(3, 6 * k).toFixed(1) + "px", background: "var(--x-accent)", borderRadius: "var(--x-radius-s)", transformOrigin: rtl ? "right" : "left", display: p.underline ? "block" : "none" });
    wrap.append(bar);
    if (p.accent_dot) { const dot = doc.createElement("span"); dot.textContent = "."; dot.style.color = "var(--x-accent)"; line.append(dot); }
    // items: centred in the mask; a count phrase splits into a number (gradient) and its noun
    const NUM = /^([0-9][0-9.,]*)(.*)$/u;
    const parts = items.map((txt, i) => {
      const s = doc.createElement("span");
      Object.assign(s.style, { position: "absolute", left: "50%", top: "0", whiteSpace: "pre", direction: rtl ? "rtl" : "ltr", lineHeight: "1.18em" });
      const m = p.count_up ? txt.match(NUM) : null;
      let num = null, target = 0, dec = 0, comma = false;
      if (m) {
        num = doc.createElement("span");
        Object.assign(num.style, { backgroundImage: "linear-gradient(100deg, var(--x-accent), var(--x-accent-2))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" });
        num.textContent = m[1];
        const rest = doc.createElement("span"); rest.textContent = m[2];
        s.append(num, rest);
        comma = m[1].includes(","); target = parseFloat(m[1].replace(/,/g, "")) || 0; dec = (m[1].split(".")[1] || "").length;
      } else s.textContent = txt;
      if (p.last_accent && i === n - 1 && n > 1) s.style.color = "var(--x-accent)";
      mask.append(s);
      return { s, num, raw: m ? m[1] : "", target, dec, comma, w: 0 };
    });
    // fit: the widest item must leave room in the slot's line
    const room = (el.clientWidth || f.safe.w) * 0.94;
    let widest = Math.max(...parts.map((x) => x.s.offsetWidth));
    const dotW = p.accent_dot ? line.lastChild.offsetWidth : 0;
    // …and the height its band leaves (less what else sits in it), so it never slides under the next region
    const par = el.parentElement, band = (par && par.clientHeight) || f.head.h;
    const others = par ? [...par.children].filter((c) => c !== el && c.offsetHeight).reduce((a, c) => a + c.offsetHeight + 18, 0) : 0;
    // the slot is the hero: a lead line takes a share of the height and never outgrows it
    const availH = Math.max(band - others, band * 0.4) * (leadEl ? 0.62 : 1);
    const sz = Math.min(150 * k, widest + dotW > room ? (150 * k * room) / (widest + dotW) : Infinity, Math.max(availH, 76 * k) / 1.2);
    line.style.fontSize = sz.toFixed(1) + "px";
    if (leadEl) { leadEl.style.fontSize = Math.min(parseFloat(leadEl.style.fontSize) || sz, sz * (p.lead_line === "claim" ? 0.85 : 0.6)).toFixed(1) + "px"; ML.fit(leadEl, room); }
    parts.forEach((x) => (x.w = x.s.offsetWidth));
    // ── times: spoken when every item is said inside the run, else hold + swap per item ──
    const swapD = p.swap === "cut" ? 0 : 0.26;
    const stepD = Math.max(0.25, Math.min(p.hold + swapD, (end - at - 0.4) / n));
    let times = items.map((_, i) => at + i * stepD);
    const said = items.map((w) => ctx.word(w.split(" ")[0], NaN));
    if (n > 1 && said.every((x, i) => Number.isFinite(x) && x >= at && x < end - 0.3 && (i === 0 || x > said[i - 1] + 0.25))) times = said;
    times.forEach((t, i) => i > 0 && ctx.sfx(t, "tap", 0.22));
    const sgn = p.direction === "down" ? -1 : 1;
    const fmt = (x, v) => { let s = v.toFixed(x.dec); if (x.comma) { const [a, b] = s.split("."); s = a.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (b ? "." + b : ""); } return s; };
    const P2in = (u) => u * u, P3out = (u) => 1 - Math.pow(1 - u, 3);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        const enter = ML.out(t, at - 0.05, at + 0.3);
        el.style.opacity = (enter * (1 - leave)).toFixed(4);
        el.style.translate = `0 ${((1 - enter) * 20 * k - leave * 14 * k).toFixed(2)}px`;
        let cur = 0;
        for (let j = 0; j < n; j++) if (t >= times[j]) cur = j;
        // the slot's width eases from the last item to this one
        const prev = cur > 0 ? cur - 1 : 0, wu = cur > 0 ? ML.ease(t, times[cur], times[cur] + 0.28) : 1;
        const w = parts[prev].w + (parts[cur].w - parts[prev].w) * wu;
        mask.style.width = w.toFixed(2) + "px";
        bar.style.transform = `scaleX(${(p.underline ? ML.out(t, at + 0.1, at + 0.45) : 0).toFixed(4)})`;
        parts.forEach((x, i) => {
          let y = 0, o = 0, b = 0, sc = 1;
          const s0 = times[i], next = i < n - 1 ? times[i + 1] : Infinity;
          if ((t >= s0 || i === 0) && t < next) {
            // incoming (the first item simply holds; the line's own entrance brings it)
            const u = i === 0 ? 1 : ML.lin(t, s0 + 0.04, s0 + 0.04 + 0.24);
            const e = P3out(u);
            if (p.swap === "roll") { y = (1 - e) * 100 * sgn; o = 1; sc = 1.04 - 0.04 * e; }
            else if (p.swap === "blur-slide") { y = (1 - e) * 30 * sgn; o = e; b = (1 - e) * 6; }
            else if (p.swap === "fade") { o = ML.ease(t, s0, s0 + 0.2) * (i === 0 ? 0 : 1) + (i === 0 ? 1 : 0); }
            else o = 1;
          } else if (t >= next && t < next + 0.2 && p.swap !== "cut") {
            // outgoing
            const e = P2in(ML.lin(t, next, next + 0.18));
            if (p.swap === "roll") { y = -e * 100 * sgn; o = 1; }
            else if (p.swap === "blur-slide") { y = -e * 25 * sgn; o = 1 - e; b = e * 6; }
            else o = 1 - ML.ease(t, next, next + 0.2);
          }
          x.s.style.visibility = o > 0.004 ? "visible" : "hidden";
          x.s.style.opacity = o.toFixed(4);
          x.s.style.transform = `translate(-50%, ${y.toFixed(2)}%) scale(${sc.toFixed(4)})`;
          x.s.style.filter = b > 0.05 ? `blur(${(b * k).toFixed(2)}px)` : "none";
          if (x.num) { const c = ML.out(t, s0, s0 + 0.5); const txt = fmt(x, x.target * c); if (x.num.textContent !== txt) x.num.textContent = txt; }
        });
      },
    };
  },
});
