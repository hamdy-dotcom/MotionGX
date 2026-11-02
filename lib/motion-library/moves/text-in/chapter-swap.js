// Chapter focus swap: the slot holds a run of chapters (eyebrow + headline [+ line]); exactly one is active. At each
// beat the next chapter rises into full opacity (translateY 38 → 0 on cubic-bezier(.22,1,.36,1) in .5 s, opacity
// .18 → 1 on ease in .32 s) while the outgoing one runs the same in reverse at the same moment — it sinks back 38px
// and dims to a .18 ghost (a brief crossfade). Each switch lands on the spoken word that opens the chapter, else on a
// steady share of the run. "in-place" keeps every chapter in the one slot (the ghost lingers a moment, then goes);
// "stacked-scroll" lays them in a column that scrolls up so the active one always sits in the slot, its ghosted
// neighbours above and below implying the sequence. Headline: serif, line-height .82, tracking -.065em, balanced
// (Arabic: tracking 0, open leading, whole lines only). Chapters come from [data-chapter] children of the target,
// else its text cut at " / " or "|", else its words in `chapters` balanced groups.
// Source: MengTo/Skills scroll-world-storytelling demo/video/index.html (.copy / .chapter.is-active, MIT).
ML.define({
  id: "text-in.chapter-swap",
  category: "text-in",
  name: "Chapter focus swap",
  does: "At each beat the next chapter's eyebrow, headline and line rise into full opacity while the previous chapter sinks and dims to a ghost.",
  says: ["story", "step", "list", "transition"],
  energy: 2,
  targets: ["headline", "line", "label"],
  duration: [0.6, 1.5],
  params: {
    dim: { type: "number", range: [0.08, 0.22], default: 0.18 },
    offset: { type: "number", range: [28, 42], default: 38, unit: "px" },
    layout: { type: "choice", options: ["in-place", "stacked-scroll"], default: "in-place" },
    fade: { type: "number", range: [0.3, 0.35], default: 0.32, unit: "s" },
    move: { type: "number", range: [0.45, 0.55], default: 0.5, unit: "s" },
    chapters: { type: "number", range: [2, 4], default: 2 },
    eyebrow: { type: "bool", default: true },
    face: { type: "choice", options: ["serif", "look"], default: "serif" },
  },
  pairs: ["text-in.kicker-rule", "camera.push-in"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:agent-skills/web-design/scroll-world-storytelling/demo/video/index.html", license: "MIT" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const fs = parseFloat(getComputedStyle(el).fontSize) || 100;
    const k = Math.max(0.5, fs / 104); // the reference's px read against its type size
    // the chapters
    let parts = [...el.querySelectorAll(":scope > [data-chapter]")].map((c) => ({ html: c.innerHTML, text: c.textContent.trim() }));
    if (!parts.length) {
      const text = (el.textContent || "").trim();
      const cut = text.split(/\s*(?:\s\/\s|\|)\s*/).filter(Boolean);
      if (cut.length > 1) parts = cut.map((x) => ({ text: x }));
      else {
        const all = text.split(/\s+/), n = Math.max(1, Math.min(Math.round(p.chapters), all.length));
        for (let i = 0, j = 0; j < n; j++) { const take = Math.round(((j + 1) * all.length) / n) - Math.round((j * all.length) / n); parts.push({ text: all.slice(i, i + take).join(" ") }); i += take; }
      }
    }
    const n = parts.length;
    const ar = ML.ARABIC.test(el.textContent || "");
    el.textContent = "";
    const col = document.createElement("div");
    col.style.cssText = "position:relative;width:100%;";
    el.append(col);
    const blocks = parts.map((part, i) => {
      const b = document.createElement("div");
      b.style.cssText = "position:absolute;left:0;right:0;top:0;";
      if (p.eyebrow) {
        const eb = document.createElement("div");
        eb.className = "ml-label";
        eb.setAttribute("aria-hidden", "true");
        eb.style.cssText = `color:var(--x-accent);font-size:${Math.max(16, fs * 0.2).toFixed(1)}px;margin-bottom:${(fs * 0.2).toFixed(1)}px;`;
        eb.textContent = `${String(i + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`;
        b.append(eb);
      }
      const h = document.createElement("div");
      if (part.html) h.innerHTML = part.html; else h.textContent = part.text;
      h.style.cssText = `${p.face === "serif" ? "font-family:var(--x-serif-font);font-weight:400;" : ""}line-height:${ar ? 1.18 : 0.82};letter-spacing:${ar ? 0 : "-0.065em"};text-wrap:balance;padding-bottom:${ar ? 0 : 0.08}em;`;
      b.append(h);
      col.append(b);
      return { b };
    });
    // in place: one cell as tall as the tallest; stacked: a column, the slot showing the active one
    const gap = fs * 0.5;
    let y = 0, tall = 0;
    blocks.forEach((x) => { x.h = x.b.offsetHeight; tall = Math.max(tall, x.h); });
    blocks.forEach((x) => { x.top = p.layout === "stacked-scroll" ? y : 0; y += x.h + gap; x.b.style.top = x.top + "px"; });
    col.style.height = tall + "px";
    // the switches: on the spoken word that opens each chapter, else a steady share of the run
    const slot = Math.max(0.6, (end - at - 0.6) / n);
    const times = [];
    parts.forEach((part, i) => {
      if (i === 0) { times.push(at); return; }
      const spoken = ML.wordAt(ctx.words, part.text.split(/\s+/)[0], NaN);
      let tk = Number.isFinite(spoken) && spoken > times[i - 1] + 0.4 ? spoken : at + i * slot;
      times.push(Math.min(Math.max(tk, times[i - 1] + 0.45), end - 0.5));
    });
    times.forEach((tk, i) => ctx.sfx(tk, i ? "whoosh.soft" : "pop.soft", 0.25));
    const fadeC = ML.bezier(0.25, 0.1, 0.25, 1), moveC = ML.bezier(0.22, 1, 0.36, 1);
    const off = p.offset * k;
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.18);
        el.style.opacity = (1 - leave).toFixed(4);
        el.style.visibility = t < at - 0.3 ? "hidden" : "visible";
        // the column scrolls so the active chapter sits in the slot
        let scroll = 0;
        for (let i = 1; i < n; i++) scroll += (blocks[i].top - blocks[i - 1].top) * moveC(ML.lin(t, times[i], times[i] + p.move));
        col.style.translate = Math.abs(scroll) > 0.01 ? `0 ${(-scroll).toFixed(2)}px` : "none";
        blocks.forEach((x, i) => {
          const tin = times[i], tout = i + 1 < n ? times[i + 1] : Infinity;
          const fo = fadeC(ML.lin(t, tin, tin + p.fade)) - (tout < Infinity ? fadeC(ML.lin(t, tout, tout + p.fade)) : 0);
          const mo = moveC(ML.lin(t, tin, tin + p.move)) - (tout < Infinity ? moveC(ML.lin(t, tout, tout + p.move)) : 0);
          let o = p.dim + (1 - p.dim) * fo;
          if (p.layout === "in-place") {
            // only the first waits as a ghost; an outgoing ghost lingers a moment, then clears the slot
            if (i > 0 && t < tin) o = 0;
            if (tout < Infinity) o *= 1 - ML.lin(t, tout + p.fade, tout + p.fade + 0.3);
          }
          x.b.style.opacity = o.toFixed(4);
          x.b.style.visibility = o < 0.002 ? "hidden" : "visible";
          const dy = off * (1 - mo);
          x.b.style.translate = Math.abs(dy) > 0.01 ? `0 ${dy.toFixed(2)}px` : "none";
        });
      },
    };
  },
});
