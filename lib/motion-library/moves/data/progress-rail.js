// Sizes below are for a 1080 frame (the demo's web px read too thin on video), so 2 / 5 / 22 where it says 1 / 3 / 14.
// Progress rail: a 1 px base line spans exactly from the first step's node centre to the last (centres measured); a
// 3 px accent progress line grows along it (from the top, or from the reading-start side). Nodes are 14 px dots with a
// 2 px ground border and a 1 px ring: inactive dim at scale .72; when the head reaches one it turns accent at scale 1
// (.28 s) with a 7 px accent halo (or a pulsing ring), and the step it marks brightens .46 → 1 — only one step is
// current; passed nodes may carry a check. Stepped: the head holds on each node while its step is told and travels
// between nodes in `travel` s (power2.inOut); continuous: a calm linear fill through the same times. A list target's
// own items become the steps (each lands on its spoken word when the voice says it); otherwise a step list is built.
// Centred-alternating collapses to a simple rail on 9:16 (reading order kept).
// Source: MengTo/Skills web-design scroll-progress-timeline demo (MIT) — .rail / .rail i / .dot / .step.active.
ML.define({
  id: "data.progress-rail",
  category: "data",
  name: "Progress rail through step nodes",
  does: "A line fills from the first step's node to the last while each node lights up as the fill reaches it and its step brightens.",
  says: ["step", "time", "flow", "story", "precision"],
  energy: 2,
  targets: ["list", "shape", "chart"],
  duration: [1.5, 10],
  params: {
    orientation: { type: "choice", options: ["auto", "vertical", "horizontal"], default: "auto" },
    fill: { type: "choice", options: ["stepped", "continuous"], default: "stepped" },
    nodes: { type: "number", range: [3, 8], default: 4 },
    layout: { type: "choice", options: ["rail", "centred-alternating"], default: "rail" },
    checks: { type: "bool", default: false },
    travel: { type: "number", range: [0.25, 0.9], default: 0.6, unit: "s" },
    halo: { type: "choice", options: ["halo", "pulse"], default: "halo" },
    sync: { type: "choice", options: ["spoken", "even"], default: "spoken" },
  },
  pairs: ["data.timeline-lanes-build", "data.data-point-step-highlight"],
  avoid: ["energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/scroll-progress-timeline/demo/index.html", license: "MIT", note: "rail, progress line, node and active-step styles ported; driven by t instead of scroll" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, text, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    // the steps: the target's own items, else a built list. auto: a list keeps its own flow (a row runs horizontal);
    // a built list runs vertical, except across a wide frame
    let box, steps, own = false, host = null, vert;
    if (el && el !== ctx.stage && el.children.length >= 2) {
      box = el; steps = [...el.children];
      const a = steps[0].getBoundingClientRect(), b = steps[1].getBoundingClientRect();
      vert = p.orientation === "auto" ? Math.abs(a.top - b.top) > 2 : p.orientation === "vertical";
    } else vert = p.orientation === "auto" ? !f.wide : p.orientation === "vertical";
    const alt = vert && p.layout === "centred-alternating" && !f.tall;
    if (!box) {
      own = true;
      const parent = ctx.scene || ctx.stage;
      host = mk("div", "position:absolute;left:var(--pic-x);top:var(--pic-y);width:var(--pic-w);height:var(--pic-h);z-index:4;background:var(--x-ground);display:flex;align-items:center;justify-content:center", null, parent);
      const n = Math.round(ML.clamp(p.nodes, 3, 8));
      const T = rtl ? ["اسأل السؤال الصح", "جرّب أصغر تجربة", "ابني اللي يصمد", "قيس وقرّر", "اطلق الدليل", "اتعلّم وكرّر", "كبّر اللي نجح", "احكي الحكاية"] : ["Ask the useful question", "Sketch the smallest test", "Build what holds", "Measure and decide", "Ship the proof", "Learn and repeat", "Scale what works", "Tell the story"];
      const P = rtl ? ["البداية", "التجربة", "البناء", "القياس", "الإطلاق", "التعلّم", "التوسّع", "الحكاية"] : ["Frame", "Sketch", "Build", "Measure", "Ship", "Learn", "Scale", "Tell"];
      const hostW = f.pic.w, hostH = f.pic.h;
      const titleF = vert ? Math.min((f.tall ? 56 : 44) * k, (hostH * 0.8) / n / 2.9) : Math.min(40 * k, (hostW * 0.9) / n / 6.5);
      box = mk("div", vert ? `width:${Math.min(hostW * 0.9, 1100 * k).toFixed(1)}px` : `width:${(hostW * 0.94).toFixed(1)}px`, null, host);
      steps = Array.from({ length: n }, (_, i) => {
        const s = mk("div", "min-width:0", null, box);
        mk("div", `font:var(--x-label-weight) ${(titleF * 0.6).toFixed(1)}px var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:var(--x-label-case);color:var(--x-accent);white-space:nowrap`, `${String(i + 1).padStart(2, "0")} / ${P[i]}`, s);
        mk("div", `font:var(--x-head-weight) ${titleF.toFixed(1)}px/1.1 var(--x-head-font);letter-spacing:var(--x-head-track);color:var(--x-ink);margin-top:${(titleF * 0.25).toFixed(1)}px`, T[i], s);
        return s;
      });
    }
    const n = steps.length;
    const node = 22 * k * (p.checks ? 1.5 : 1), gutter = Math.max(46 * k, node * 3);
    if (getComputedStyle(box).position === "static") box.style.position = "relative";
    box.style.display = "flex";
    box.style.boxSizing = "border-box";
    if (vert) {
      box.style.flexDirection = "column"; box.style.alignItems = "stretch";
      box.style.gap = (own ? (f.tall ? 72 : 40) * k : 22 * k).toFixed(1) + "px";
      if (alt) steps.forEach((s, i) => { s.style.width = "44%"; s.style.alignSelf = i % 2 ? "flex-end" : "flex-start"; s.style.textAlign = "start"; });
      else box.style.paddingInlineStart = gutter.toFixed(1) + "px";
      // a built list never outgrows its region: the gaps give way first
      if (own) box.style.gap = Math.max(6 * k, Math.min(parseFloat(box.style.gap), (f.pic.h * 0.95 - steps.reduce((a, s) => a + s.offsetHeight, 0)) / (n - 1))).toFixed(1) + "px";
    } else {
      box.style.flexDirection = "row"; box.style.alignItems = "flex-start";
      box.style.gap = (own ? 28 * k : 18 * k).toFixed(1) + "px";
      box.style.paddingTop = gutter.toFixed(1) + "px";
      steps.forEach((s) => { s.style.flex = "1 1 0"; s.style.textAlign = "center"; });
    }
    // measure node centres (box px)
    const bw = box.clientWidth;
    const railX = alt ? bw / 2 : rtl ? bw - gutter / 2 : gutter / 2;
    const C = steps.map((s) => {
      const firstLine = own ? Math.min(s.offsetHeight / 2, (s.firstElementChild?.offsetHeight || s.offsetHeight) / 2) : s.offsetHeight / 2;
      return vert ? { x: railX, y: s.offsetTop + firstLine } : { x: s.offsetLeft + s.offsetWidth / 2, y: gutter / 2 };
    });
    const lineW = Math.max(1, 2 * k), fillW = 5 * k;
    const layer = mk("div", "position:absolute;inset:0;pointer-events:none;z-index:2", null, box);
    const base = mk("div", vert
      ? `position:absolute;left:${(railX - lineW / 2).toFixed(2)}px;top:${C[0].y.toFixed(2)}px;width:${lineW.toFixed(2)}px;height:${(C[n - 1].y - C[0].y).toFixed(2)}px;background:var(--x-line)`
      : `position:absolute;top:${(C[0].y - lineW / 2).toFixed(2)}px;left:${Math.min(C[0].x, C[n - 1].x).toFixed(2)}px;height:${lineW.toFixed(2)}px;width:${Math.abs(C[n - 1].x - C[0].x).toFixed(2)}px;background:var(--x-line)`, null, layer);
    const prog = mk("div", vert
      ? `position:absolute;left:${(railX - fillW / 2).toFixed(2)}px;top:${C[0].y.toFixed(2)}px;width:${fillW.toFixed(2)}px;height:0;background:var(--x-accent)`
      : `position:absolute;top:${(C[0].y - fillW / 2).toFixed(2)}px;height:${fillW.toFixed(2)}px;width:0;background:var(--x-accent)`, null, layer);
    const dots = C.map((c) => {
      const d = mk("div", `position:absolute;left:${(c.x - node / 2).toFixed(2)}px;top:${(c.y - node / 2).toFixed(2)}px;width:${node.toFixed(2)}px;height:${node.toFixed(2)}px;box-sizing:border-box;border-radius:50%;border:${(3 * k).toFixed(2)}px solid var(--x-ground);display:flex;align-items:center;justify-content:center`, null, layer);
      const ring = p.halo === "pulse" ? mk("div", `position:absolute;left:50%;top:50%;width:${(node * 1.6).toFixed(1)}px;height:${(node * 1.6).toFixed(1)}px;translate:-50% -50%;border-radius:50%;border:${Math.max(1, 1.5 * k).toFixed(1)}px solid var(--x-accent);opacity:0`, null, d) : null;
      let check = null;
      if (p.checks) { check = document.createElementNS("http://www.w3.org/2000/svg", "svg"); check.setAttribute("viewBox", "0 0 12 12"); check.style.cssText = `width:62%;height:62%;opacity:0`; check.innerHTML = `<path d="M2.5 6.3 5 8.6 9.6 3.6" fill="none" stroke="var(--x-accent-ink)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`; d.append(check); }
      return { d, ring, check };
    });
    // times: each step on its spoken word (first word of its text), else evenly; kept apart by `travel`
    const t0 = at + 0.35, span = Math.max(0.6, end - 0.45 - t0), gap = Math.max(0.3, span / Math.max(1, n - 0.6));
    const T = steps.map((s, i) => {
      const even = t0 + i * gap;
      if (p.sync !== "spoken" || i === 0) return even;
      const w = (s.textContent || "").trim().split(/\s+/)[0] || "";
      return ctx.word(w, even);
    });
    const tr = Math.min(p.travel, gap * 0.85);
    for (let i = 1; i < n; i++) T[i] = Math.max(T[i], T[i - 1] + (p.fill === "stepped" ? tr + 0.08 : 0.2));
    T.forEach((tt, i) => ctx.sfx(tt, "tap", 0.28));
    const coord = vert ? "y" : "x";
    const headAt = (t) => {
      if (t <= T[0]) return C[0][coord];
      for (let i = 1; i < n; i++) {
        if (t < T[i]) {
          const a = C[i - 1][coord], b = C[i][coord];
          const u = p.fill === "stepped" ? ML.ease(t, T[i] - tr, T[i]) : ML.lin(t, T[i - 1], T[i]);
          return a + (b - a) * u;
        }
      }
      return C[n - 1][coord];
    };
    return {
      draw(t) {
        if (host) ML.show(host, t, at, end - 0.22);
        // on a target's own list the dimming comes in with the rail and goes with it: before `at` the list stays as it is
        const show = host ? 1 : ML.out(t, at, at + 0.35) * (1 - ML.lin(t, end - 0.22, end));
        layer.style.opacity = show.toFixed(4);
        const h = headAt(t), c0 = C[0][coord];
        if (vert) prog.style.height = Math.max(0, h - c0).toFixed(2) + "px";
        else { prog.style.left = Math.min(c0, h).toFixed(2) + "px"; prog.style.width = Math.abs(h - c0).toFixed(2) + "px"; }
        prog.style.opacity = t >= T[0] - 0.01 ? "1" : "0";
        dots.forEach(({ d, ring, check }, i) => {
          const a = ML.lin(t, T[i], T[i] + 0.28), done = i < n - 1 ? ML.lin(t, T[i + 1], T[i + 1] + 0.28) : 0, cur = a * (1 - done);
          d.style.scale = (0.72 + 0.28 * a).toFixed(4);
          d.style.background = `color-mix(in srgb, var(--x-accent) ${(a * 100).toFixed(1)}%, var(--x-dim))`;
          d.style.boxShadow = `0 0 0 1px color-mix(in srgb, var(--x-accent) ${(a * 100).toFixed(1)}%, var(--x-dim))` + (p.halo === "halo" ? `, 0 0 0 ${(10 * k).toFixed(1)}px color-mix(in srgb, var(--x-accent) ${(12 * cur).toFixed(2)}%, transparent)` : "");
          if (ring) { const ph = t >= T[i] ? ((t - T[i]) % 1.2) / 1.2 : 0; ring.style.opacity = (cur * 0.7 * (1 - ph)).toFixed(4); ring.style.scale = (0.75 + 0.55 * ph).toFixed(4); }
          if (check) check.style.opacity = (p.fill === "stepped" ? done : a).toFixed(4);
          steps[i].style.opacity = (1 - 0.54 * (1 - cur) * show).toFixed(4);
        });
      },
    };
  },
});
