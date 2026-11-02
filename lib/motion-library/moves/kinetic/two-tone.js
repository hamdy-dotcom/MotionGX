// Two-tone headline / number: one element, two spans — the lead in the dim second ink, the statement (or the key
// digits) in full ink, so the eye lands on what matters. Headline leads follow the explainer looks: inline; own line
// in italic at 0.72em (paper); an inverse chip (ink ground, ground text, .02em .16em padding — poster); a prompt
// ("$ " and the lead in the accent — terminal). Numbers: display digits in a light weight, letter-spacing −0.06em,
// line-height .9, baseline-aligned; part A ink, part B (after the last separator) dim, a trailing unit as small caps
// raised. Enter: opacity 0 + 20 px rise → 1 / 0 over 0.8 s easeOutQuart after 0.1 s; or "digit-roll": part B's digits
// roll down into place, and roll once more on each spoken beat. Hold.
// Source: MengTo/Skills media/html-explainer-video scripts/explainer.css (.x-head .x-lead, looks/*.css) and
// web-design/mesh-gradient-dark-blue-clean (MIT).
ML.define({
  id: "kinetic.two-tone",
  category: "kinetic",
  name: "Two-tone headline / number",
  does: "A headline or big number with its lead part in a dim second ink and the key part in full ink, so the eye lands on what matters.",
  says: ["story", "simplicity", "focus", "precision", "time"],
  energy: 2,
  targets: ["headline", "number"],
  duration: [1.5, 6],
  params: {
    target_kind: { type: "choice", options: ["headline", "number"], default: "headline" },
    lead: { type: "choice", options: ["inline", "block-italic", "inverse-chip", "prompt"], default: "inline" },
    split_at: { type: "text" },
    enter: { type: "choice", options: ["fade-rise", "digit-roll"], default: "fade-rise" },
    weight: { type: "number", range: [200, 900], default: 300 },
  },
  pairs: ["text-in.punchline", "data.count-up"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:media/html-explainer-video", license: "MIT", note: "scripts/explainer.css .x-head .x-lead + demo/looks/*.css; web-design/mesh-gradient-dark-blue-clean two-tone digits" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el || el === ctx.stage) return null;
    const doc = el.ownerDocument;
    const text = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return null;
    const kind = el.getAttribute("data-slot") === "number" ? "number" : p.target_kind === "number" && /\d/.test(text) ? "number" : "headline";
    const span = (cls, txt, css = {}) => { const s = doc.createElement("span"); s.className = cls; if (txt != null) s.textContent = txt; Object.assign(s.style, css); return s; };
    const rollers = []; // { col, digit }
    el.textContent = "";
    if (kind === "number") {
      // A ink, B dim (after the last separator, or split_at), a trailing unit as raised small caps
      const um = text.match(/^(.*?\d)\s*([^\d\s.,:]+)$/);
      const num = um ? um[1] : text, unit = um ? um[2] : "";
      let cut = p.split_at && num.includes(p.split_at) ? num.indexOf(p.split_at) : Math.max(num.lastIndexOf(","), num.lastIndexOf("."), num.lastIndexOf(":"));
      if (cut <= 0) cut = Math.max(1, num.length - 2);
      const A = num.slice(0, cut), B = num.slice(cut);
      Object.assign(el.style, { display: "flex", alignItems: "baseline", justifyContent: getComputedStyle(el).textAlign === "center" ? "center" : "flex-start", direction: "ltr", fontWeight: String(Math.round(p.weight)), letterSpacing: "-0.06em", lineHeight: "0.9", fontVariantNumeric: "tabular-nums" });
      el.append(span("x-a", A, { color: "var(--x-ink)" }));
      const b = span("x-b", null, { color: "var(--x-dim)", display: "inline-flex" });
      for (const ch of Array.from(B)) {
        if (p.enter === "digit-roll" && /\d/.test(ch)) {
          const win = span("x-roll", null, { display: "inline-block", height: "1em", lineHeight: "1em", overflow: "hidden", verticalAlign: "baseline" });
          const col = span("x-col", null, { display: "flex", flexDirection: "column" });
          for (let r = 0; r < 20; r++) col.append(span("", String(r % 10), { height: "1em", lineHeight: "1em", display: "block" }));
          win.append(col); b.append(win);
          rollers.push({ col, digit: +ch });
        } else b.append(span("", ch));
      }
      el.append(b);
      if (unit) el.append(span("x-unit", unit, { font: `600 0.13em var(--x-label-font)`, letterSpacing: rtl ? "0" : "0.08em", textTransform: rtl ? "none" : "uppercase", color: "var(--x-dim)", marginInlineStart: "0.12em", position: "relative", top: "-0.55em" }));
    } else {
      // lead | statement: at split_at when given, else the first half of the words
      let lead, key;
      if (p.split_at && text.includes(p.split_at) && text.indexOf(p.split_at) > 0) { const i = text.indexOf(p.split_at); lead = text.slice(0, i).trim(); key = text.slice(i).trim(); }
      else { const ws = text.split(" "); const n = Math.max(1, Math.floor(ws.length / 2)); lead = ws.slice(0, n).join(" "); key = ws.slice(n).join(" "); if (!key) { key = lead; lead = ""; } }
      if (lead) {
        if (p.lead === "block-italic") {
          el.append(span("x-lead", lead, { display: "block", color: "var(--x-dim)", fontSize: "0.72em", fontFamily: "var(--x-serif-font)", fontStyle: rtl ? "normal" : "italic", fontWeight: "400", letterSpacing: "0", lineHeight: "1.2" }));
        } else if (p.lead === "inverse-chip") {
          el.append(span("x-lead", lead, { background: "var(--x-ink)", color: "var(--x-ground)", padding: ".02em .16em", boxDecorationBreak: "clone", webkitBoxDecorationBreak: "clone" }), " ");
        } else if (p.lead === "prompt") {
          const pr = span("x-lead", null, { color: "var(--x-accent)" });
          pr.append(span("", "$ ", { fontFamily: "var(--x-mono-font)", direction: "ltr", unicodeBidi: "isolate" }), lead);
          el.append(pr, " ");
        } else el.append(span("x-lead", lead, { color: "var(--x-dim)" }), " ");
      }
      el.append(span("x-key", key, { color: "var(--x-ink)" }));
    }
    // beats for the roll: spoken words inside the run, at least 0.8 s apart
    const beats = [];
    if (rollers.length) for (const w of ctx.words || []) if (w.t > at + 1 && w.t < end - 0.8 && (!beats.length || w.t - beats[beats.length - 1] >= 0.8)) beats.push(w.t);
    ctx.sfx(at + 0.1, p.enter === "digit-roll" && rollers.length ? "blip" : "tap", 0.25);
    beats.slice(0, 3).forEach((b) => ctx.sfx(b, "blip", 0.15));
    const quart = (t, a, b) => 1 - Math.pow(1 - ML.lin(t, a, b), 4);
    return {
      draw(t) {
        const u = quart(t, at + 0.1, at + 0.9);
        const leave = ML.ease(t, end - 0.3, end);
        el.style.opacity = (Math.min(1, u * 1.4) * (1 - leave)).toFixed(4);
        el.style.translate = `0 ${((1 - u) * 20 - leave * 12).toFixed(2)}px`;
        rollers.forEach((r, i) => {
          // rolls in from ten digits above, staggered; each beat adds one more full turn
          let spin = 10 * (1 - quart(t, at + 0.1 + i * 0.08, at + 1.1 + i * 0.08));
          for (const b of beats) spin += 10 * (t >= b ? 1 - quart(t, b + i * 0.05, b + 0.6 + i * 0.05) : 0);
          const pos = r.digit + Math.min(10, spin);
          r.col.style.transform = `translateY(${(-pos).toFixed(4)}em)`;
        });
      },
    };
  },
});
