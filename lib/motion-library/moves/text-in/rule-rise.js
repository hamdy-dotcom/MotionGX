// Rise from a rule: a visible line is drawn first (scaleX 0 → 1 from the start side or the centre) and the words grow
// up out of it — each letter / word / the whole line sits in a box clipped at the rule and travels 110% → 0 on the
// landing curve with a small vertical smear — or drop below it, or split (first half rises above, second half drops
// below). Variants: underline-synced (the rule grows with the letters), gradient payoff (gradient text + gradient
// rule), horizon lyric (a thin line across, italic words emerging with blur and a kept baseline wobble, the last word
// brightening). After the build the rule stays, shrinks to the last word or fades.
// Sources: prompt-motion tolgayhickiran / 1littlecoder / samaote / sudo-kiran / raphaelaubryy … (reference only — our
// own rebuild).
ML.define({
  id: "text-in.rule-rise",
  category: "text-in",
  name: "Rise from a rule",
  does: "A visible horizontal line is drawn first and the words grow up out of it (or drop below it) as if the line were the floor of a stage.",
  says: ["arrival", "reveal", "brand", "energy", "focus", "story", "calm"],
  energy: 3,
  targets: ["headline", "word", "line", "logo"],
  duration: [0.6, 2.5],
  params: {
    direction: { type: "choice", options: ["rise", "drop", "split"], default: "rise" },
    split: { type: "choice", options: ["letters", "words", "line"], default: "letters" },
    rule_draw: { type: "choice", options: ["left", "centre"], default: "left" },
    rule_weight: { type: "number", range: [1, 6], default: 2, unit: "px" },
    rule_after: { type: "choice", options: ["stay", "shrink-to-word", "fade"], default: "stay" },
    underline_sync: { type: "bool", default: false },
    duration: { type: "number", range: [0.25, 0.6], default: 0.4, unit: "s" },
    stagger: { type: "number", range: [0, 0.3], default: 0.05, unit: "s" },
    blur: { type: "number", range: [0, 6], default: 0, unit: "px" },
    style: { type: "choice", options: ["caps", "gradient", "horizon-lyric"], default: "caps" },
    alternate_colour: { type: "bool", default: false },
  },
  pairs: ["text-in.scramble", "text-emphasis.underline-draw"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:tolgayhickiran-motion-graphics-from-a", license: "reference", note: "also 1littlecoder, samaote, sudo-kiran, raphaelaubryy, astrodevil; our own code" },
  async setup(ctx) {
    const { p, at, end } = ctx;
    let el = ctx.el;
    if (!el) return null;
    // a logo slot can be an <svg> or <img>: it rises whole, in an HTML box of its own (it has no letters to split)
    const atomic = el instanceof SVGElement || el.tagName === "IMG";
    if (atomic) { const host = document.createElement("span"); host.style.display = "inline-block"; el.replaceWith(host); host.append(el); el.style.display = "block"; el = host; }
    // measure with the real face: wait for the faces this text uses (a page's fonts can still be arriving)
    try { const cs = getComputedStyle(el); await document.fonts.load(`${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, el.textContent || "A"); await document.fonts.ready; } catch (e) { /* no font API: measure as is */ }
    const horizon = p.style === "horizon-lyric", gradient = p.style === "gradient";
    el.style.position = "relative";
    // the horizon lyric is set in the look's serif, italic in Latin (Arabic has no italic: a slant only deforms it)
    if (horizon) { el.style.fontFamily = "var(--x-serif-font)"; el.style.fontWeight = "var(--x-sub-weight)"; if (ctx.rtl) el.style.letterSpacing = "0"; else el.style.fontStyle = "italic"; }
    if (p.style === "caps" && !atomic) el.style.textTransform = "uppercase";
    // units: letters (Arabic words stay whole), words, or the whole line
    // (the horizon lyric's words emerge whole; an SVG or picture is one unit)
    const by = atomic ? "line" : horizon && p.split === "letters" ? "words" : p.split;
    if (!atomic) ML.split(el, by === "letters" ? "chars" : "words");
    let units;
    if (by === "line") {
      const all = document.createElement("span"); all.style.display = "inline-block";
      while (el.firstChild) all.append(el.firstChild);
      el.append(all); units = [all];
    } else units = [...el.querySelectorAll(by === "letters" ? ".ml-c" : ".ml-w")];
    const words = [...el.querySelectorAll(".ml-w")];
    // split: the first half of the words above the rule, the rest on a line of their own below it
    let dir = p.direction;
    if (dir === "split" && (by === "line" || words.length < 2)) dir = "rise";
    const half = Math.ceil(words.length / 2);
    if (dir === "split") words[half - 1].after(document.createElement("br"));
    const below = new Set(dir === "split" ? words.slice(half).flatMap((w) => [w, ...w.querySelectorAll(".ml-c")]) : []);
    // a clip box round each unit, its edge on the rule (none for the horizon lyric: those words emerge, not rise);
    // room above for accents, none on the rule side, so a letter on its way is hidden exactly at the line
    // the rule side also makes room for what this very text pokes past its line box (a y, a ج, a shadda), so the floor
    // sits under the descenders and nothing stays cut off once landed
    let sink = 0, head = 0;
    if (!atomic) {
      const cs = getComputedStyle(el), cv = document.createElement("canvas").getContext("2d"), fs = parseFloat(cs.fontSize) || 100, lh = parseFloat(cs.lineHeight) || fs * 1.12;
      cv.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const m = cv.measureText(cs.textTransform === "uppercase" ? el.textContent.toUpperCase() : el.textContent);
      const base = (lh - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
      sink = Math.max(0, (m.actualBoundingBoxDescent - (lh - base)) / fs);
      head = Math.max(0, (m.actualBoundingBoxAscent - base) / fs);
    }
    const clips = units.map((u) => {
      if (horizon) return u;
      const down = below.has(u) || dir === "drop";
      const c = document.createElement("span");
      const pt = down ? 0.02 + head : 0.16 + head, pb = down ? 0.16 + sink : 0.02 + sink;
      c.style.cssText = `display:inline-block;overflow:hidden;vertical-align:top;padding:${pt.toFixed(3)}em 0.02em ${pb.toFixed(3)}em;margin:${(-pt).toFixed(3)}em -0.02em ${(-pb).toFixed(3)}em;`;
      u.replaceWith(c); c.append(u);
      return c;
    });
    if (horizon) words.forEach((w, i) => { w.style.position = "relative"; w.style.top = ((ML.rnd(i, 7) - 0.5) * 0.08).toFixed(3) + "em"; });
    const weight = horizon ? 1 : p.rule_weight;
    // one rule per text line for rise / drop (each line has its own floor); one for split and the horizon
    const rowOf = clips.map((c) => Math.round(c.offsetTop));
    const tops = dir === "split" || horizon ? [0] : [...new Set(rowOf)].sort((x, y) => x - y);
    const rowIdx = clips.map((_, i) => (tops.length === 1 ? 0 : tops.indexOf(rowOf[i])));
    const rules = tops.map(() => {
      const r = document.createElement("div");
      r.style.cssText = `position:absolute;height:${weight}px;pointer-events:none;border-radius:${weight}px;` +
        (gradient ? "background:linear-gradient(90deg, var(--x-accent), var(--x-accent-2));" : horizon ? "background:color-mix(in srgb, var(--x-ink) 45%, transparent);" : "background:var(--x-accent);");
      r.style.transformOrigin = p.rule_draw === "centre" ? "50% 50%" : ctx.rtl ? "100% 50%" : "0 50%";
      el.append(r);
      return r;
    });
    // where everything sits, read from the layout as it is now (offsets ignore transforms, so the same every frame and
    // right even when the face arrives after setup)
    const last = words[words.length - 1];
    function geom() {
      const rects = clips.map((c) => ({ x: c.offsetLeft, y: c.offsetTop, w: c.offsetWidth, h: c.offsetHeight }));
      const fs = parseFloat(getComputedStyle(el).fontSize) || 100;
      const span = (rs) => { const minX = Math.min(...rs.map((r) => r.x)), maxX = Math.max(...rs.map((r) => r.x + r.w)); return { left: minX - fs * 0.05, width: maxX - minX + fs * 0.1 }; };
      const all = span(rects);
      const lines = rules.map((_, k) => {
        const rs = rects.filter((_, i) => rowIdx[i] === k);
        let y;
        if (dir === "drop") y = Math.min(...rs.map((r) => r.y)) + fs * 0.02;
        else if (dir === "split") {
          const ab = rects.filter((_, i) => !below.has(units[i])), be = rects.filter((_, i) => below.has(units[i]));
          y = (Math.max(...ab.map((r) => r.y + r.h)) + Math.min(...be.map((r) => r.y))) / 2;
        } else y = Math.max(...rs.map((r) => r.y + r.h)) - (horizon ? 0 : fs * 0.02) + (p.underline_sync ? fs * 0.12 : 0);
        const sp = horizon ? { left: 0, width: el.offsetWidth } : span(rs);
        return { y, ...sp };
      });
      const lw = last ? { x: last.offsetLeft, w: last.offsetWidth } : all;
      return { rects, all, lines, lw };
    }
    if (!gradient && p.alternate_colour) units.forEach((u, i) => i % 2 === 1 && (u.style.color = "var(--x-accent)"));
    if (gradient) units.forEach((u) => { u.style.backgroundImage = "linear-gradient(90deg, var(--x-accent), var(--x-accent-2))"; u.style.webkitBackgroundClip = "text"; u.style.backgroundClip = "text"; u.style.color = "transparent"; });
    // timing: the rule first (or with the letters when synced), then the units in reading order
    const ruleDur = horizon ? 0.6 : 0.5;
    const t0 = p.underline_sync ? at : at + ruleDur * 0.7;
    // a long line tightens its stagger to land before the move's end; the lyric's words land when they are spoken
    const st = Math.min(p.stagger, Math.max(0.01, (end - 0.3 - p.duration - t0 - (dir === "split" ? 0.25 : 0)) / Math.max(1, units.length - 1)));
    const times = units.map((u, i) => (horizon ? Math.max(t0, ctx.word(u.textContent, t0 + i * Math.max(st, 0.18))) : t0 + i * st + (below.has(u) ? 0.25 : 0)));
    for (let i = 1; i < times.length; i++) if (horizon) times[i] = Math.max(times[i], times[i - 1] + 0.06);
    const built = Math.max(...times) + p.duration;
    const ruleEnd = p.underline_sync ? Math.max(at + 0.3, built) : at + ruleDur;
    const curve = ML.bezier(0.2, 0.9, 0.25, 1);
    ctx.sfx(at, "whoosh.soft", 0.35);
    ctx.sfx(t0 + 0.05, "tap", 0.25);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.18);
        el.style.opacity = (1 - leave).toFixed(4);
        // the rules: drawn, then kept, shrunk to the last word or faded
        const g = geom(), fs = parseFloat(getComputedStyle(el).fontSize) || 100;
        rules.forEach((r, k) => {
          const L = g.lines[k], lastRow = k === rules.length - 1, lag = k * 0.12;
          const sx = p.underline_sync ? ML.lin(t, at + lag, ruleEnd + lag) : curve(ML.lin(t, at + lag, ruleEnd + lag));
          let ro = t < at + lag ? 0 : 1, rl = L.left, rw = L.width;
          if (p.rule_after === "fade" || (p.rule_after === "shrink-to-word" && !lastRow)) ro *= 1 - ML.ease(t, built + 0.2, built + 0.6);
          if (p.rule_after === "shrink-to-word" && lastRow) { const s = ML.ease(t, built + 0.15, built + 0.6); rl = L.left + (g.lw.x - L.left) * s; rw = L.width + (g.lw.w - L.width) * s; }
          r.style.top = (L.y - weight / 2).toFixed(1) + "px";
          r.style.left = rl.toFixed(1) + "px"; r.style.width = rw.toFixed(1) + "px";
          r.style.transform = `scaleX(${sx.toFixed(4)})`;
          r.style.opacity = ro.toFixed(4);
        });
        // gradient payoff: one gradient across the whole line, cut per unit so every letter shows its own slice
        if (gradient) units.forEach((u, i) => { u.style.backgroundSize = `${g.all.width.toFixed(1)}px 100%`; u.style.backgroundPosition = `${(g.all.left - g.rects[i].x).toFixed(1)}px 0`; });
        units.forEach((u, i) => {
          const a = times[i], x = ML.lin(t, a, a + p.duration), e = curve(x);
          if (horizon) {
            const blur = Math.max(p.blur, 6) * (1 - e);
            const lastOne = i === units.length - 1 ? ML.ease(t, a + p.duration, a + p.duration + 0.5) : 0;
            u.style.opacity = (t < a ? 0 : Math.min(1, e * 1.4) * (0.82 + 0.18 * (i === units.length - 1 ? lastOne : 1))).toFixed(4);
            u.style.translate = `0 ${((1 - e) * fs * 0.3).toFixed(2)}px`;
            u.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
            u.style.scale = lastOne > 0 ? (1 + 0.05 * lastOne).toFixed(4) : "none";
            return;
          }
          const from = below.has(u) || dir === "drop" ? -110 - head * 100 : 110 + sink * 100; // clear of the clip, whatever its room
          u.style.visibility = t < a ? "hidden" : "visible";
          u.style.translate = `0 ${((1 - e) * from).toFixed(2)}%`;
          // a smear while it travels (letters only), gone once it lands
          const smear = by === "letters" ? 0.15 * Math.sin(Math.PI * x) : 0;
          u.style.scale = smear > 0.001 ? `1 ${(1 + smear).toFixed(4)}` : "none";
          u.style.transformOrigin = from > 0 ? "50% 100%" : "50% 0";
          const blur = p.blur * (1 - e);
          u.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
        });
      },
    };
  },
});
