// Glyph to punctuation: a logo's mark detaches and becomes the dot of a giant ?, ! or . — the wordmark blurs and fades
// (0.25 s), the mark (a faithful copy of its own shape) travels to the centre, its shape retracts (scale 1 → 0) leaving
// an accent dot, and the punctuation's hook — a brush-like ink stroke, or a clean one — draws upward from the dot with
// stroke-dashoffset over 0.5 s power2.out. On a word target the word's last letter gives up its dot instead. RTL
// mirrors the question mark (؟). The glyph is sized from the stage; colours are the look's ink and accent.
// Source: prompt-motion:lexnlin-claude-opus-5-5-made (reference) — our own rebuild.
ML.define({
  id: "text-emphasis.glyph-to-punctuation",
  category: "text-emphasis",
  name: "Logo glyph becomes a punctuation mark",
  does: "A logo's mark detaches, the wordmark leaves, and the mark becomes the dot of a giant ?, ! or . whose stroke draws above it.",
  says: ["brand", "change", "story"],
  energy: 3,
  targets: ["logo", "word"],
  duration: [1, 2.5],
  params: {
    punctuation: { type: "choice", options: ["?", "!", "."], default: "?" },
    stroke: { type: "choice", options: ["brush", "clean"], default: "brush" },
    size: { type: "number", range: [0.25, 0.6], default: 0.42, unit: "of the stage's short side" },
    place: { type: "choice", options: ["centre", "in-place"], default: "centre" },
    draw: { type: "number", range: [0.3, 0.8], default: 0.5, unit: "s" },
  },
  pairs: ["text-in.punchline", "transition.magic-move"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "prompt-motion:lexnlin-claude-opus-5-5-made", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    if (!el) return null;
    const NS = "http://www.w3.org/2000/svg";
    const host = ctx.scene || stage;
    const isSvg = el.tagName.toLowerCase() === "svg";
    // the mark and the wordmark
    let mark = null, wordmark = [], markBox, markClone = null;
    if (isSvg) {
      const kids = [...el.children].filter((n) => !/^(defs|title|desc|style)$/i.test(n.tagName));
      mark = kids.find((n) => n.tagName.toLowerCase() !== "text" && !n.querySelector?.("text")) || null;
      wordmark = kids.filter((n) => n !== mark);
      if (mark) {
        markBox = ctx.box(mark);
        const bb = mark.getBBox();
        markClone = document.createElementNS(NS, "svg");
        markClone.setAttribute("viewBox", `${bb.x} ${bb.y} ${bb.width} ${bb.height}`);
        markClone.setAttribute("preserveAspectRatio", "none");
        markClone.append(mark.cloneNode(true));
      } else { markBox = ctx.box(el); wordmark = []; markClone = el.cloneNode(true); markClone.removeAttribute("data-slot"); }
    } else if (el.tagName === "IMG") {
      markBox = ctx.box(el); markClone = el.cloneNode(true); markClone.removeAttribute("data-slot"); wordmark = [];
      Object.assign(markClone.style, { objectFit: "contain", width: "100%", height: "100%" });
    } else {
      // a word: its last letter's spot gives up the dot
      const rg = document.createRange(); rg.selectNodeContents(el);
      const rs = [...rg.getClientRects()], st = stage.getBoundingClientRect(), kk = st.width / (stage.offsetWidth || 1) || 1;
      const lr = rs[rs.length - 1] || el.getBoundingClientRect();
      const fs = parseFloat(getComputedStyle(el).fontSize) || 56, d = fs * 0.2;
      const x = rtl ? (lr.left - st.left) / kk : (lr.right - st.left) / kk;
      markBox = { x: x - d / 2 + (rtl ? -d * 0.4 : d * 0.4), y: (lr.bottom - st.top) / kk - fs * 0.32 - d / 2, w: d, h: d };
      wordmark = [el];
      markClone = document.createElement("div");
      Object.assign(markClone.style, { borderRadius: "50%", background: "var(--x-accent)" });
    }
    // the glyph: a 100 × 160 design box, dot at (50, 140)
    const S = Math.min(f.W, f.H) * p.size, scale = S / 160;
    const elB = ctx.box(el);
    const cx = p.place === "in-place" ? elB.x + elB.w / 2 : f.W / 2, cy = p.place === "in-place" ? elB.y + elB.h / 2 : f.H / 2;
    const gx = Math.max(10, Math.min(f.W - 100 * scale - 10, cx - 50 * scale)), gy = Math.max(10, Math.min(f.H - 160 * scale - 10, cy - 80 * scale));
    const dotR = 12, dot = { x: gx + 50 * scale * 1, y: gy + 140 * scale };
    const PATHS = {
      "?": "M50 112 L50 98 C50 80 80 74 80 46 C80 24 64 10 46 10 C30 10 18 22 18 38",
      "!": "M50 112 L50 12",
      ".": "",
    };
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 100 160");
    Object.assign(svg.style, { position: "absolute", left: gx.toFixed(1) + "px", top: gy.toFixed(1) + "px", width: (100 * scale).toFixed(1) + "px", height: (160 * scale).toFixed(1) + "px", overflow: "visible", pointerEvents: "none", zIndex: "6", willChange: "transform" });
    if (rtl && p.punctuation === "?") svg.style.transform = "scaleX(-1)"; // ؟
    const uid = "gp" + Math.round(ML.rnd(at * 97 + 3, 7) * 1e6);
    let filt = "";
    if (p.stroke === "brush") {
      const defs = document.createElementNS(NS, "defs");
      defs.innerHTML = `<filter id="${uid}" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter>`;
      svg.append(defs); filt = `url(#${uid})`;
    }
    const hook = document.createElementNS(NS, "path");
    const d = PATHS[p.punctuation] || "";
    let len = 0;
    if (d) {
      hook.setAttribute("d", d);
      Object.assign(hook.style, { fill: "none", stroke: "var(--x-ink)", strokeWidth: p.stroke === "brush" ? "15" : "11", strokeLinecap: "round", strokeLinejoin: "round" });
      if (filt) hook.setAttribute("filter", filt);
      svg.append(hook);
      len = hook.getTotalLength ? hook.getTotalLength() : 200;
      hook.style.strokeDasharray = `${len.toFixed(2)} ${len.toFixed(2)}`;
    }
    // brush: a second, thinner dry pass beside the main stroke
    let dry = null;
    if (d && p.stroke === "brush") {
      dry = hook.cloneNode(); dry.removeAttribute("filter");
      Object.assign(dry.style, { strokeWidth: "4", opacity: "0.35", transform: "translate(3px, 1px)" });
      svg.append(dry);
    }
    const circ = document.createElementNS(NS, "circle");
    circ.setAttribute("cx", "50"); circ.setAttribute("cy", "140"); circ.setAttribute("r", String(dotR));
    circ.style.fill = "var(--x-accent)";
    svg.append(circ);
    host.append(svg);
    // the travelling mark
    let proxy = null;
    if (markClone) {
      proxy = document.createElement("div");
      Object.assign(proxy.style, { position: "absolute", left: "0", top: "0", width: markBox.w + "px", height: markBox.h + "px", pointerEvents: "none", zIndex: "7", willChange: "transform" });
      Object.assign(markClone.style, { display: "block", width: "100%", height: "100%", overflow: "visible" });
      proxy.append(markClone);
      host.append(proxy);
    }
    const fadeA = at, travel = [at + 0.1, at + 0.6], retract = [at + 0.38, at + 0.68], drawA = at + 0.68, drawB = drawA + p.draw;
    const leave = end - 0.3;
    ctx.sfx(travel[0], "whoosh.soft", 0.3);
    ctx.sfx(retract[1] - 0.05, "pop.soft", 0.45);
    if (d) ctx.sfx(drawA + 0.05, "whoosh.soft", 0.2);
    const p2 = (t, a, b) => { const x = ML.lin(t, a, b); return 1 - (1 - x) * (1 - x); };
    const m0 = { x: markBox.x + markBox.w / 2, y: markBox.y + markBox.h / 2 };
    const dotPx = { x: rtl && p.punctuation === "?" ? gx + 50 * scale : dot.x, y: dot.y };
    return {
      draw(t) {
        const lv = ML.ease(t, leave, leave + 0.25);
        // the wordmark leaves
        const wf = ML.lin(t, fadeA, fadeA + 0.25);
        for (const n of wordmark) { n.style.opacity = (1 - wf).toFixed(4); n.style.filter = wf > 0 && wf < 1 ? `blur(${(wf * 8).toFixed(2)}px)` : "none"; }
        if (mark) mark.style.opacity = t >= travel[0] ? "0" : "1";
        if (el.tagName === "IMG") el.style.opacity = t >= travel[0] ? "0" : "1";
        // the mark travels to the dot's place and retracts into it
        const m = ML.expo(t, travel[0], travel[1]);
        const x = m0.x + (dotPx.x - m0.x) * m, y = m0.y + (dotPx.y - m0.y) * m;
        const shrink = 1 - ML.ease(t, retract[0], retract[1]);
        const dotD = dotR * 2 * scale, fitS = Math.min(1, dotD / Math.max(markBox.w, markBox.h));
        const sc = (1 - m * (1 - Math.max(fitS, 0.2))) * shrink; // the mark scales down toward the dot, then to 0
        if (proxy) {
          const on = t >= travel[0] && shrink > 0.001;
          proxy.style.visibility = on ? "visible" : "hidden";
          // sized, not scaled: a scaled layer can keep a stale raster between seeks
          const z = Math.max(0, Math.min(1, sc)), w = markBox.w * z, h = markBox.h * z;
          proxy.style.width = w.toFixed(2) + "px"; proxy.style.height = h.toFixed(2) + "px";
          proxy.style.left = (x - w / 2).toFixed(2) + "px"; proxy.style.top = (y - h / 2).toFixed(2) + "px";
        }
        // the dot appears under the retracting mark
        const dg = ML.back(t, retract[0] + 0.1, retract[1] + 0.08, 1.6);
        circ.setAttribute("r", (dotR * Math.max(0, t < retract[0] + 0.1 ? 0 : dg)).toFixed(3));
        // the hook draws upward from the dot
        if (d) {
          const h = p2(t, drawA, drawB);
          hook.style.strokeDashoffset = (len * (1 - h)).toFixed(2);
          hook.style.opacity = h > 0 ? "1" : "0";
          if (dry) { dry.style.strokeDashoffset = (len * (1 - p2(t, drawA + 0.05, drawB + 0.05))).toFixed(2); dry.style.opacity = h > 0 ? "0.35" : "0"; }
        }
        svg.style.opacity = (1 - lv).toFixed(4);
      },
    };
  },
});
