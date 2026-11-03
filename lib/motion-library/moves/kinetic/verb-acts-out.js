// The word does what it says: a heavy word (~140 px, fitted to the frame) performs its own verb, letter after letter
// from the baseline. squash: scaleY 1 → 0.55, scaleX 1 → 1.2, 0.04 s stagger, a stiff spring (the power4.out landing
// with its slight rebound), the letters spreading so they squash wide, not into each other; stretch: scaleY 1 → 2,
// 0.75 × the stagger, a vertical-only motion blur while growing, an elastic settle, the word set with the room to grow;
// spin (on each unit's own centre), shake (decaying seeded jitter), bounce (decaying hops) and split (the halves part
// from the middle; a lone Arabic word is sliced as a picture, its letters stay joined). Optional field swap: the frame flips to the accent field as the verb starts (the cut to the next verb).
// Every unit is driven by closed-form springs from t. Arabic words are never split into letters: the whole word acts.
// Source: prompt-motion zheke-prompt-hello-opus-5-5 (reference only — our own rebuild).
ML.define({
  id: "kinetic.verb-acts-out",
  category: "kinetic",
  name: "The word does what it says",
  does: "Verbs perform themselves: SQUASH squashes flat, STRETCH stretches tall, each letter deforming in sequence.",
  says: ["playful", "energy"],
  energy: 5,
  targets: ["word"],
  duration: [0.8, 2.5],
  params: {
    verb: { type: "choice", options: ["squash", "stretch", "spin", "shake", "bounce", "split"], default: "squash" },
    split: { type: "choice", options: ["letters", "word"], default: "letters" },
    stagger: { type: "number", range: [0, 0.06], default: 0.04, unit: "s" },
    size: { type: "number", range: [0.5, 1.4], default: 1, unit: "x 140px" },
    field_swap: { type: "bool", default: false },
  },
  pairs: ["kinetic.word-card-cuts", "rhythm.beat-pulse"],
  avoid: ["calm", "luxury", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop",
  source: { from: "prompt-motion:zheke-prompt-hello-opus-5-5", license: "reference", note: "our own code; per-letter verb deformations" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el || el === ctx.stage) return null;
    const doc = el.ownerDocument, NS = "http://www.w3.org/2000/svg";
    const W = ctx.f.W, k = Math.min(W, ctx.f.H) / 1080, host = ctx.scene || ctx.stage;
    // heavy, big, fitted: never wider than the frame's safe width
    // stretch sets the word with the room it grows into (the band check below then sizes it), so it never runs over a line
    const LH = p.verb === "stretch" ? 2.1 : 1.05;
    if (p.verb === "stretch") Object.assign(el.style, { paddingTop: "0.45em", marginBottom: "-0.5em" });
    Object.assign(el.style, { fontFamily: "var(--x-head-font)", fontWeight: "700", lineHeight: String(LH), textTransform: ctx.rtl ? "none" : "uppercase", letterSpacing: ctx.rtl ? "0" : "-0.01em", color: "var(--x-ink)", overflow: "visible" });
    // ~140 px (scaled to the frame), but a phrase may take at most two lines of the safe width; never smaller than it was
    const cur = parseFloat(getComputedStyle(el).fontSize) || 56;
    const big = 140 * k * p.size;
    el.style.fontSize = big + "px";
    const r = doc.createRange(); r.selectNodeContents(el);
    el.style.whiteSpace = "nowrap";
    const sc = el.getBoundingClientRect().width / (el.offsetWidth || 1) || 1;
    const oneLine = r.getBoundingClientRect().width / sc;
    el.style.whiteSpace = "";
    const narrow = p.verb === "split" ? 0.78 : p.verb === "squash" ? 0.8 : 0.92;
    const lines = /\s/.test(el.textContent.trim()) ? 2 : 1;
    el.style.fontSize = Math.max(cur, Math.min(big, (big * lines * narrow * ctx.f.safe.w) / Math.max(1, oneLine))).toFixed(1) + "px";
    // and never taller than the band it sits in (a squash or stretch must not run under the picture)
    const band = el.parentElement;
    if (band && band !== host && band !== ctx.stage) {
      let size = parseFloat(el.style.fontSize), guard = 0;
      while (band.scrollHeight > band.clientHeight + 1 && size > cur && guard++ < 30) { size = Math.max(cur, size * 0.92); el.style.fontSize = size.toFixed(1) + "px"; }
    }
    Object.assign(el.style, { position: el.style.position || "relative", zIndex: "2" });
    const units = ML.split(el, p.split === "word" ? "words" : "chars");
    if (!units.length) return null;
    // a whole word (Arabic, or split by words) widens less, so the spaces between words survive the squash
    const wide = units.map((u) => !u.classList.contains("ml-c") || u.classList.contains("ml-w"));
    const n = units.length;
    const gap = p.verb === "stretch" ? p.stagger * 0.75 : p.stagger;
    const times = units.map((_, i) => at + i * Math.min(gap, 0.5 / Math.max(1, n)));
    const baseline = ((LH / 2 + 0.35) / LH) * 100; // the baseline inside a line box of this height
    units.forEach((u) => { u.style.transformOrigin = p.verb === "spin" ? "50% 50%" : `50% ${baseline.toFixed(1)}%`; });
    // each unit's distance from the middle of its own line, in em (RTL and wrapped lines come out right by measuring)
    const px = parseFloat(getComputedStyle(el).fontSize) || 1;
    const boxes = units.map((u) => ctx.box(u));
    const lineOf = (b) => Math.round((b.y + b.h / 2) / (px * LH * 0.5));
    const fromMid = boxes.map((b) => {
      const line = boxes.filter((x) => lineOf(x) === lineOf(b));
      return (b.x + b.w / 2 - (Math.min(...line.map((x) => x.x)) + Math.max(...line.map((x) => x.x + x.w))) / 2) / px;
    });
    // split with one unit (a lone Arabic word): two copies of the word, each showing one half
    let half = null;
    if (p.verb === "split" && n === 1) {
      const u = units[0];
      half = u.cloneNode(true);
      Object.assign(half.style, { position: "absolute", left: u.offsetLeft + "px", top: u.offsetTop + "px", width: u.offsetWidth + "px", clipPath: "inset(-20% -20% -20% 50%)" });
      u.style.clipPath = "inset(-20% 50% -20% -20%)";
      el.append(half);
    }
    // a vertical-only blur for stretch
    let blurNode = null, fid = "";
    if (p.verb === "stretch") {
      fid = "ml-vao-" + Math.round(ML.rnd(at * 7.3 + n, 5) * 1e9);
      const svg = doc.createElementNS(NS, "svg");
      svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.style.position = "absolute";
      svg.innerHTML = `<filter id="${fid}" x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation="0 0"/></filter>`;
      host.append(svg);
      blurNode = svg.querySelector("feGaussianBlur");
    }
    // the field swap
    let field = null;
    if (p.field_swap) {
      field = doc.createElement("div");
      Object.assign(field.style, { position: "absolute", inset: "0", background: "var(--x-accent)", zIndex: "0", pointerEvents: "none" });
      host.prepend(field);
    }
    const ink0 = el.style.color;
    const stiff = { stiffness: 520, damping: 28 }, elastic = { stiffness: 260, damping: 10 }, pop = ML.SPRING.pop;
    ctx.sfx(at, "pop", 0.4);
    if (n > 3) ctx.sfx(times[n - 1], "pop.soft", 0.2);
    return {
      draw(t) {
        const leave = ML.ease(t, end - 0.25, end);
        el.style.opacity = (1 - leave).toFixed(4);
        if (field) { const on = t >= at && t < end; field.style.opacity = on ? "1" : "0"; el.style.color = on ? "var(--x-accent-ink)" : ink0; }
        let vblur = 0;
        units.forEach((u, i) => {
          const s = t - times[i];
          let sx = 1, sy = 1, rot = 0, tx = 0, ty = 0;
          switch (p.verb) {
            case "squash": { const e = ML.step(s, stiff); sy = 1 - 0.45 * e; sx = 1 + (wide[i] ? 0.06 : 0.2) * e; tx = fromMid[i] * (sx - 1); break; }
            case "stretch": {
              const e = ML.step(s, elastic); sy = 1 + 1.0 * Math.max(0, e);
              if (s > 0 && s < 0.25) vblur = Math.max(vblur, (1 - s / 0.25) * 10 * k);
              break;
            }
            case "spin": rot = 360 * ML.step(s, pop) * (ctx.rtl ? -1 : 1); break;
            case "shake": { const a = s > 0 ? Math.exp(-s / 0.45) : 0; tx = a * 0.12 * Math.sin(2 * Math.PI * 9 * s + ML.rnd(i, 2) * 6.28); rot = a * 6 * Math.sin(2 * Math.PI * 7 * s + ML.rnd(i, 3) * 6.28); break; }
            case "bounce": { const a = s > 0 ? Math.exp(-s / 0.6) : 0; ty = -a * 0.45 * Math.abs(Math.sin((Math.PI * Math.max(0, s)) / 0.32)); sy = 1 - 0.12 * a * Math.pow(Math.abs(Math.cos((Math.PI * Math.max(0, s)) / 0.32)), 6); break; }
            case "split": { const e = ML.step(s, ML.SPRING.glide); const side = half ? -1 : Math.abs(fromMid[i]) < 0.02 ? 0 : Math.sign(fromMid[i]); tx = side * 0.28 * e; if (half) half.style.transform = `translateX(${(0.28 * e).toFixed(4)}em)`; break; }
          }
          u.style.transform = sx !== 1 || sy !== 1 || rot || tx || ty ? `translate(${tx.toFixed(4)}em, ${ty.toFixed(4)}em) rotate(${rot.toFixed(2)}deg) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})` : "none";
        });
        if (blurNode) { blurNode.setAttribute("stdDeviation", `0 ${vblur.toFixed(2)}`); el.style.filter = vblur > 0.05 ? `url(#${fid})` : "none"; }
      },
    };
  },
});
