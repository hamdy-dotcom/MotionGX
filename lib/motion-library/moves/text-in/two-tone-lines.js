// Two-tone lines: the headline is set as 2–4 lines that arrive one by one on the beat with the same move, one line (the
// last, the second, the middle, the first — or one keyword) in the brand accent, so the build carries the contrast.
// Moves: mask rise (y 100% → 0 inside a clip, cubic-bezier(.22,1,.36,1) 0.45 s), fade-up (y 10–30 px + opacity,
// 0.4 s power3.out), word-fade (per word grey → final tone, 0.3 s, 0.12 s apart), slide (x 20 px from the reading
// start, 0.4 s power3.out) and pop-stack (scale 0.9 → 1 + opacity, 0.25 s back.out(1.6), the stack re-centring as it
// grows, 0.3 s power3.out). Optional lead-in (eyebrow with a drawing rule, badge pill pop, a small mark, a mono
// kicker) and a 6 px-ish accent underline drawing under the last line from the reading start. Lines are whole words:
// Arabic stays joined; slides and the underline follow the reading direction.
// Source: prompt-motion references (rammanq, brainextends, thilina, aistocksavvy, ratheejaisal, blueoctopusai,
// motiondsgnr) — reference only, our own code.
ML.define({
  id: "text-in.two-tone-lines",
  category: "text-in",
  name: "Two-tone lines",
  does: "A headline arrives line by line on the beat, the second (or one middle) line in the brand accent, so the build itself carries the contrast.",
  says: ["story", "brand", "result", "step", "focus", "simplicity", "arrival"],
  energy: 3,
  targets: ["headline", "line"],
  duration: [1, 2.5],
  params: {
    lines: { type: "number", range: [2, 4], default: 2 },
    accent_line: { type: "choice", options: ["last", "2", "middle", "1", "keyword"], default: "last" },
    move: { type: "choice", options: ["mask-rise", "fade-up", "word-fade", "slide", "pop-stack"], default: "fade-up" },
    gap: { type: "number", range: [0.12, 0.6], default: 0.25, unit: "s" },
    distance: { type: "number", range: [10, 30], default: 20, unit: "px" },
    recentre: { type: "bool", default: false },
    underline: { type: "bool", default: false },
    lead: { type: "choice", options: ["none", "eyebrow", "badge", "mark", "kicker"], default: "none" },
    lead_text: { type: "text", default: "01" },
    sync: { type: "choice", options: ["stagger", "spoken"], default: "stagger" },
  },
  pairs: ["text-in.punchline", "text-emphasis.accent-word"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:rammanq-wow-just-tried-this", license: "reference", note: "our own rebuild of the two-tone line build seen across 7 references" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const words = (el.textContent || "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return null;
    const origH = el.offsetHeight, fsz0 = parseFloat(getComputedStyle(el).fontSize) || 100;
    // the stack may grow a little past the slot's own height, never far past the headline band; fewer lines rather than
    // a headline squeezed below half its size
    const maxH = Math.max(origH * 1.25, ctx.f.head.h * 0.66);
    const lh = parseFloat(getComputedStyle(el).lineHeight) || fsz0 * 1.12;
    const n = Math.max(1, Math.min(Math.round(p.lines), words.length, Math.max(2, Math.floor(maxH / (0.5 * lh)))));
    // balanced lines by character count, in reading order
    const total = words.join(" ").length, lines = [];
    let cur = [], acc = 0;
    words.forEach((w, i) => {
      cur.push(w); acc += w.length + 1;
      const left = words.length - i - 1, need = n - lines.length - 1;
      if (need > 0 && (acc >= (total * (lines.length + 1)) / n || left === need)) { lines.push(cur); cur = []; }
    });
    if (cur.length) lines.push(cur);
    const N = lines.length;
    const acc_i = p.accent_line === "last" ? N - 1 : p.accent_line === "1" ? 0 : p.accent_line === "2" ? Math.min(1, N - 1) : p.accent_line === "middle" ? (N >= 3 ? Math.floor(N / 2) : N - 1) : -1;
    const keyword = p.accent_line === "keyword" ? words.reduce((a, b) => (b.length > a.length ? b : a), "") : null;
    el.textContent = "";
    el.style.position = "relative";
    const fsz = parseFloat(getComputedStyle(el).fontSize) || 100;
    // the lead-in sits above the lines, in the label voice
    let lead = null, rule = null;
    if (p.lead !== "none") {
      lead = document.createElement("div");
      // tracking breaks Arabic joins: an Arabic label sets none
      const leadAr = rtl || ML.ARABIC.test(p.lead_text || "");
      lead.style.cssText = `display:flex;align-items:center;justify-content:inherit;gap:0.6em;margin-bottom:0.5em;font:var(--x-label-weight) ${Math.max(18, fsz * 0.22).toFixed(1)}px var(--x-label-font);letter-spacing:${leadAr ? "0" : "var(--x-label-track)"};text-transform:${leadAr ? "none" : "var(--x-label-case)"};color:var(--x-dim)`;
      const al = getComputedStyle(el).textAlign;
      lead.style.justifyContent = al === "center" ? "center" : al === "end" || (al === "right" && !rtl) || (al === "left" && rtl) ? "flex-end" : "flex-start";
      const txt = document.createElement("span"); txt.textContent = p.lead_text || "";
      if (p.lead === "eyebrow") { rule = document.createElement("span"); rule.style.cssText = "display:inline-block;width:1.4em;height:2px;background:var(--x-accent)"; lead.append(rule, txt); }
      else if (p.lead === "badge") { lead.append(txt); txt.style.cssText = "display:inline-block;padding:0.35em 0.9em;border-radius:var(--x-radius-s);background:var(--x-accent);color:var(--x-accent-ink)"; }
      else if (p.lead === "mark") { const m = document.createElement("span"); m.style.cssText = "display:inline-block;width:0.8em;height:0.8em;border-radius:calc(var(--x-radius) * 0.15);background:var(--x-accent);rotate:45deg"; lead.append(m); if (p.lead_text) lead.append(txt); }
      else { txt.textContent = "// " + (p.lead_text || ""); txt.style.color = "var(--x-accent)"; txt.style.fontFamily = "var(--x-mono-font)"; lead.append(txt); }
      el.append(lead);
    }
    const L = lines.map((ws, i) => {
      const wrap = document.createElement("span");
      wrap.style.cssText = "display:block;white-space:nowrap;padding-bottom:0.12em;margin-bottom:-0.12em";
      const inner = document.createElement("span");
      inner.style.cssText = "display:inline-block;transform-origin:50% 70%";
      const spans = ws.map((w, k) => {
        const s = document.createElement("span"); s.className = "ml-w"; s.style.display = "inline-block"; s.textContent = w;
        if (keyword && w === keyword) { s.style.color = "var(--x-accent)"; s.dataset.c = "var(--x-accent)"; }
        inner.append(s); if (k < ws.length - 1) inner.append(" ");
        return s;
      });
      if (i === acc_i) inner.style.color = "var(--x-accent)";
      wrap.append(inner); el.append(wrap);
      return { wrap, inner, spans, first: ws[0] };
    });
    ML.fit(el, el.clientWidth || ctx.f.head.w);
    { const h = el.offsetHeight;
      if (h > maxH) el.style.fontSize = ((parseFloat(getComputedStyle(el).fontSize) * maxH) / h).toFixed(1) + "px"; }
    const fs1 = parseFloat(getComputedStyle(el).fontSize) || fsz;
    const t0 = at + (lead ? 0.3 : 0);
    // every line lands before the leave starts, however short the scene
    const gap = N > 1 ? Math.min(p.gap, Math.max(0.08, (end - 0.25 - 0.45 - t0) / (N - 1))) : p.gap;
    L.forEach((l, i) => {
      const plan = t0 + i * gap;
      l.t = p.sync === "spoken" ? Math.max(plan, ctx.word(l.first, plan)) : plan;
      if (i > 0) l.t = Math.max(l.t, L[i - 1].t + 0.08);
      l.h = l.wrap.offsetHeight;
      ctx.sfx(l.t, "tap", 0.25);
    });
    const lastT = L[N - 1].t;
    // underline under the last line, from the reading start
    let bar = null;
    if (p.underline) {
      const eb = ctx.box(el), ib = ctx.box(L[N - 1].inner);
      bar = document.createElement("span");
      bar.style.cssText = `position:absolute;left:${(ib.x - eb.x).toFixed(1)}px;top:${(ib.y - eb.y + ib.h + fs1 * 0.02).toFixed(1)}px;width:${ib.w.toFixed(1)}px;height:${Math.max(4, fs1 * 0.06).toFixed(1)}px;background:var(--x-accent);border-radius:var(--x-radius-s);transform-origin:${rtl ? "100%" : "0%"} 50%;scale:0 1`;
      el.append(bar);
      ctx.sfx(lastT + 0.3, "whoosh.soft", 0.2);
    }
    const sx = rtl ? 1 : -1, recentre = p.recentre || p.move === "pop-stack";
    const grey = "var(--x-dim)";
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        el.style.opacity = (1 - leave).toFixed(4);
        el.style.filter = leave > 0 ? `blur(${(leave * 10).toFixed(2)}px)` : "none";
        if (lead) {
          const u = p.lead === "badge" ? ML.back(t, at, at + 0.3, 1.7) : ML.out(t, at + (rule ? 0.15 : 0), at + 0.4);
          lead.style.opacity = ML.lin(t, at, at + 0.2).toFixed(4);
          if (p.lead === "badge") lead.firstChild.style.scale = Math.max(0, u).toFixed(4);
          else lead.style.translate = `0 ${((1 - u) * 8).toFixed(2)}px`;
          if (rule) { rule.style.transformOrigin = rtl ? "100% 50%" : "0% 50%"; rule.style.scale = `${ML.out(t, at, at + 0.3).toFixed(4)} 1`; }
        }
        let shift = 0;
        L.forEach((l) => {
          const a = l.t, s = l.inner.style;
          if (recentre) shift += (l.h / 2) * (1 - ML.out(t, a, a + 0.3));
          let o = 1, x = 0, y = 0, sc = 1;
          // the mask reaches a little above the line, for Arabic's marks, and lifts once the line has landed
          if (p.move === "mask-rise") { const u = ML.land(t, a, a + 0.45); y = (1 - u) * l.h * 1.05; o = t >= a ? 1 : 0; l.wrap.style.clipPath = u >= 1 ? "none" : "inset(-0.2em -4% 0 -4%)"; }
          else if (p.move === "fade-up") { const u = ML.out(t, a, a + 0.4); y = (1 - u) * p.distance; o = u; }
          else if (p.move === "slide") { const u = ML.out(t, a, a + 0.4); x = (1 - u) * p.distance * sx; o = Math.min(1, u * 1.5); }
          else if (p.move === "pop-stack") { const u = ML.back(t, a, a + 0.25, 1.6); sc = 0.9 + 0.1 * u; o = ML.lin(t, a, a + 0.15); }
          if (p.move === "word-fade") {
            l.spans.forEach((w, k) => {
              const b = a + k * 0.12, u = ML.out(t, b, b + 0.3);
              w.style.opacity = u.toFixed(4);
              w.style.translate = `0 ${((1 - u) * p.distance * 0.6).toFixed(2)}px`;
              const tone = ML.lin(t, b, b + 0.45);
              w.style.color = tone >= 1 ? w.dataset.c || "" : `color-mix(in srgb, ${grey} ${((1 - tone) * 100).toFixed(1)}%, ${w.dataset.c || "currentColor"})`;
            });
          }
          s.opacity = o.toFixed(4);
          s.translate = x || y ? `${x.toFixed(2)}px ${y.toFixed(2)}px` : "none";
          s.scale = sc === 1 ? "none" : sc.toFixed(4);
        });
        // the stack shifts so the lines shown so far sit centred (lines not yet in still hold their room)
        el.style.translate = recentre && shift > 0.05 ? `0 ${shift.toFixed(2)}px` : "none";
        if (bar) bar.style.scale = `${ML.out(t, lastT + 0.3, lastT + 0.7).toFixed(4)} 1`;
      },
    };
  },
});
