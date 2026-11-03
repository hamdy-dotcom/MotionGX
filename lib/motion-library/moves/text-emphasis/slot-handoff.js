// Slot handoff: successive headlines / words / numbered captions take the same place one after another. All items
// sit stacked in one grid cell (the box never re-flows); item k is shown from T_k + strip lag and leaves at
// T_{k+1} − 0.22 − gap, so it is gone (0.22 s leave) just before the next arrives — never overlapping; the last holds.
// T_k is the item's first spoken word (in order, so a repeated word lands on each saying), else an even split of the run. The look decides the motion (ML.show) unless a
// motion is named; "roll" is a slot-machine roll inside a clip. Several strips side by side (1–3) lag 0.05 s × index
// and, on "look", each takes its own motion so one cue reads three ways. One fitted size for every item:
// min(fit(item, strip width × 0.84)), capped (130 / 150 px on the 1080 stage for single words, the target's own size
// for headlines). Caption kind: '01 / Title' label + a muted sentence under a top hairline, 0 → 1 opacity and
// 12 px → 0 rise in 0.2 s, swapping on each stage's word. Items come from `items` ("a | b | c", a caption as
// "Title: sentence"), else the target's words split into `count` runs.
// Source: MengTo/Skills html-explainer-video demo/film.js (look + step2 scenes) and scroll-scrubbed-visual-sequence (MIT).
ML.define({
  id: "text-emphasis.slot-handoff",
  category: "text-emphasis",
  name: "Headline handoff in one slot",
  does: "Successive headlines, words or numbered captions take the same place one after another, each leaving before the next arrives, moving the way the look moves.",
  says: ["change", "step", "story", "choice"],
  energy: 2,
  targets: ["headline", "line", "word", "label"],
  duration: [1.5, 8],
  params: {
    count: { type: "number", range: [2, 5], default: 3 },
    gap: { type: "number", range: [0, 0.1], default: 0.04, unit: "s" },
    motion: { type: "choice", options: ["look", "rise", "fade", "snap", "wipe", "roll"], default: "look" },
    strips: { type: "number", range: [1, 3], default: 1 },
    "strip-lag": { type: "number", range: [0, 0.1], default: 0.05, unit: "s" },
    kind: { type: "choice", options: ["word", "headline", "caption"], default: "headline" },
    numbering: { type: "bool", default: false },
    items: { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "text-emphasis.dim-out"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:html-explainer-video/demo/film.js", license: "MIT", note: "the look and step2 scenes (show(item, t, T_k, T_{k+1} − 0.24)); caption variant from scroll-scrubbed-visual-sequence" },
  setup(ctx) {
    const { el, p, at, end, stage } = ctx;
    if (!el) return null;
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize) || 100;
    // the items: given, else the target's words in `count` even runs
    let items = String(p.items || "").split(/[|\n]/).map((s) => s.trim()).filter(Boolean);
    if (!items.length) {
      const ws = (el.textContent || "").trim().split(/\s+/).filter(Boolean);
      const n = Math.max(1, Math.min(Math.round(p.count), ws.length));
      let i = 0;
      items = Array.from({ length: n }, (_, k) => { const take = Math.floor(ws.length / n) + (k < ws.length % n ? 1 : 0); const s = ws.slice(i, i + take).join(" "); i += take; return s; });
    }
    items = items.slice(0, 5);
    const n = items.length;
    const caption = p.kind === "caption";
    const numbered = p.numbering || caption;
    const S = Math.round(ML.clamp(p.strips, 1, 3));
    // the motions: one per strip ("look" lets strip 0 follow the look and the others read it two more ways)
    const lookKind = ctx.look.kind;
    const ALT = ["fade", "snap", "wipe", "rise", "slide"].filter((x) => x !== lookKind);
    const kindOf = (s) => (p.motion === "look" ? (s === 0 ? lookKind : ALT[(s - 1) % ALT.length]) : p.motion);
    // build: the target keeps its box, its content becomes the strips
    const W = el.clientWidth || ctx.box(el).w;
    el.textContent = "";
    const row = document.createElement("div");
    Object.assign(row.style, { display: "flex", gap: S > 1 ? (fs * 0.4).toFixed(1) + "px" : "0", width: "100%", justifyContent: "center", alignItems: "start" });
    el.append(row);
    const stripW = (W - (S - 1) * fs * 0.4) / S;
    const strips = Array.from({ length: S }, (_, s) => {
      const box = document.createElement("div");
      Object.assign(box.style, { display: "grid", width: stripW.toFixed(1) + "px", position: "relative" });
      row.append(box);
      const kind = kindOf(s);
      if (kind === "roll") box.style.clipPath = "inset(-6% -40% -6% -40%)";
      const els = items.map((text, k) => {
        const it = document.createElement("div");
        Object.assign(it.style, { gridArea: "1 / 1", visibility: "hidden", minWidth: "0" });
        const num = String(k + 1).padStart(2, "0");
        if (caption) {
          const [title, ...rest] = text.split(/\s*[:：]\s*|\s+—\s+/);
          const sentence = rest.join(" ");
          Object.assign(it.style, { borderTop: "var(--x-edge) solid var(--x-edge-color)", paddingTop: (fs * 0.3).toFixed(1) + "px", textAlign: "start", display: "grid", gap: (fs * 0.12).toFixed(1) + "px" });
          const lab = document.createElement("div");
          lab.className = "ml-label";
          lab.textContent = numbered ? `${num} / ${title}` : title;
          Object.assign(lab.style, { fontSize: Math.max(16, fs * 0.3).toFixed(1) + "px", fontWeight: "700", color: "var(--x-ink)" });
          it.append(lab);
          if (sentence) { const sub = document.createElement("div"); sub.textContent = sentence; Object.assign(sub.style, { font: `var(--x-body-weight) ${Math.max(20, fs * 0.46).toFixed(1)}px/1.35 var(--x-body-font)`, color: "var(--x-dim)" }); it.append(sub); }
        } else {
          if (numbered) { const lab = document.createElement("div"); lab.className = "ml-label"; lab.textContent = num; Object.assign(lab.style, { fontSize: Math.max(12, fs * 0.2).toFixed(1) + "px", marginBottom: (fs * 0.08).toFixed(1) + "px" }); it.append(lab); }
          const w = document.createElement("div");
          w.className = "ml-handoff-text";
          w.textContent = text;
          Object.assign(w.style, { whiteSpace: p.kind === "word" ? "nowrap" : "normal" });
          it.append(w);
        }
        box.append(it);
        return it;
      });
      return { box, els, kind, lag: s * p["strip-lag"] };
    });
    // one fitted size for every item and strip
    if (!caption) {
      const texts = [...el.querySelectorAll(".ml-handoff-text")];
      const tall = stage.offsetHeight > stage.offsetWidth * 1.4;
      const cap = p.kind === "word" ? Math.max(fs, (tall ? 150 : 130) * (stage.offsetWidth / (tall ? 1080 : 1920))) : fs;
      for (const w of texts) { w.style.whiteSpace = "nowrap"; w.style.fontSize = cap.toFixed(2) + "px"; }
      const size = p.kind === "word" ? Math.min(cap, ...texts.map((w) => { w.style.display = "inline-block"; const r = ML.fit(w, stripW * 0.84); w.style.display = ""; return r; })) : Math.min(cap, ...texts.map((w) => { w.style.display = "inline-block"; const r = ML.fit(w, stripW * 0.98 * 2.2); w.style.display = ""; return r; }));
      for (const w of texts) { w.style.fontSize = size.toFixed(2) + "px"; w.style.whiteSpace = p.kind === "word" ? "nowrap" : "normal"; }
    }
    // each item on its own spoken word, in order (a word said twice lands on each saying); else an even split
    const said = (ctx.words || []).filter((x) => x.t >= at - 0.01 && x.t < end);
    let cursor = 0;
    const spokenAt = (w, fb) => {
      const q = ML.plain(w);
      for (let j = cursor; q && j < said.length; j++) { const s = ML.plain(said[j].w); if (s === q || (q.length > 2 && s.includes(q))) { cursor = j + 1; return said[j].t; } }
      return fb;
    };
    const span = Math.max(0.6 * n, end - at - 0.4);
    let T = items.map((text, k) => (k === 0 ? at : spokenAt(text.split(/[\s:]+/)[0], at + (k * span) / n)));
    for (let k = 1; k < n; k++) T[k] = Math.max(T[k], T[k - 1] + 0.5);
    if (T[n - 1] > end - 0.3) T = items.map((_, k) => at + (k * span) / n); // the voice runs past the move: every item still gets its turn
    T.forEach((x) => ctx.sfx(x, "tap", 0.3));
    const roll = (it, t, a, leave, dur) => {
      const h = it.offsetHeight || fs;
      if (t < a || t > leave + 0.22) { it.style.visibility = "hidden"; return; }
      it.style.visibility = "visible";
      const pin = ML.expo(t, a, a + dur), pout = ML.ease(t, leave, leave + 0.22);
      it.style.translate = `0 ${((1 - pin) * h * 1.05 - pout * h * 1.05).toFixed(2)}px`;
      it.style.opacity = "1";
    };
    const cap = (it, t, a, leave) => {
      if (t < a || t > leave + 0.2) { it.style.visibility = "hidden"; return; }
      it.style.visibility = "visible";
      const v = ML.ease(t, a, a + 0.2) * (1 - ML.ease(t, leave, leave + 0.2));
      it.style.opacity = v.toFixed(4);
      it.style.translate = `0 ${((1 - v) * fs * 0.12).toFixed(2)}px`;
    };
    return {
      draw(t) {
        for (const s of strips) {
          const dur = Math.min(0.3, ctx.look.dur);
          s.els.forEach((it, k) => {
            const a = T[k] + s.lag, leave = k + 1 < n ? T[k + 1] + s.lag - 0.22 - p.gap : Infinity;
            if (caption) cap(it, t, a, leave);
            else if (s.kind === "roll") roll(it, t, a, leave, dur);
            else ML.show(it, t, a, leave, { kind: s.kind, dur });
          });
        }
      },
    };
  },
});
