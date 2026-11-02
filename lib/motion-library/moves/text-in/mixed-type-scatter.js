// Mixed-type sentence: the words of one sentence land at different spots, each in its own face and size — label
// caps, a big serif italic, a small body word, and the last one ultra-bold across the bottom — forming an editorial layout.
// Each enters on its spoken word with its own small move. Reading order stays clear: top-start to bottom-end, so it
// mirrors itself in Arabic. Faces only from the look (head / body / label / mono); sizes relative to the target.
// Source: our own rebuild of prompt-motion "fionntobin-the-new-opus-5-5" — reference only.
ML.define({
  id: "text-in.mixed-type-scatter",
  category: "text-in",
  name: "Mixed-type sentence",
  does: "The words of one sentence land at different spots in the frame, each in a different typeface and size, forming an editorial layout.",
  says: ["story", "brand"],
  energy: 3,
  targets: ["headline", "line"],
  duration: [1.5, 4],
  params: {
    words: { type: "number", range: [3, 7], default: 4 },
    move: { type: "choice", options: ["fade", "rise", "mix"], default: "rise" },
    duration: { type: "number", range: [0.3, 0.6], default: 0.4, unit: "s" },
    layout: { type: "choice", options: ["editorial-grid", "diagonal"], default: "editorial-grid" },
    sync: { type: "choice", options: ["spoken", "stagger"], default: "spoken" },
    stagger: { type: "number", range: [0.15, 0.6], default: 0.35, unit: "s" },
  },
  pairs: ["text-in.mask-rise", "camera.drift"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:fionntobin-the-new-opus-5-5", license: "reference", note: "our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const doc = el.ownerDocument;
    const base = parseFloat(getComputedStyle(el).fontSize) || 100;
    const all = (el.textContent || "").trim().split(/\s+/).filter(Boolean);
    // group the sentence into `words` pieces (a long sentence keeps its phrases together)
    const n = Math.max(1, Math.min(all.length, Math.round(p.words)));
    const groups = Array.from({ length: n }, (_, i) => all.slice(Math.round((i * all.length) / n), Math.round(((i + 1) * all.length) / n)).join(" "));
    // the type styles: label caps, italic, small body, mono — and the last always the ultra-bold
    // Arabic letters join: no tracking, and the serif's own face instead of a slanted one
    const track = (v) => (rtl ? "0" : v);
    const styles = [
      { font: "var(--x-label-weight) SIZE var(--x-label-font)", size: 0.42, track: track("0.12em"), caps: true },
      { font: `${rtl ? "" : "italic "}400 SIZE var(--x-serif-font)`, size: 0.8, track: track("-0.01em") },
      { font: "var(--x-body-weight) SIZE var(--x-body-font)", size: 0.36, track: "0" },
      { font: "500 SIZE var(--x-mono-font)", size: 0.38, track: track("0.02em") },
      { font: "300 SIZE var(--x-head-font)", size: 0.56, track: track("-0.02em") },
    ];
    const big = { font: "900 SIZE var(--x-head-font)", size: 1.5, track: track("var(--x-hero-track)") };
    const place = ["start", "end", "start", "center", "end", "start"];
    const indent = [0, 0, 0.16, 0, 0.08, 0.3];

    // the room it has: its band (measured before the words move in and grow the slot)
    const avail = Math.max(el.offsetHeight, el.parentElement ? el.parentElement.clientHeight : 0);
    el.textContent = "";
    Object.assign(el.style, { display: "grid", gridTemplateColumns: "100%", alignContent: "center", rowGap: "0", textTransform: "none", letterSpacing: "normal", lineHeight: "1" });
    const W = el.clientWidth;
    const items = groups.map((g, i) => {
      const s = i === n - 1 && n > 1 ? big : styles[i % styles.length];
      const node = doc.createElement("span");
      node.textContent = g;
      Object.assign(node.style, { display: "inline-block", whiteSpace: "nowrap", font: s.font.replace("SIZE", `${(base * s.size).toFixed(1)}px`), lineHeight: "1.05", letterSpacing: s.track, textTransform: s.caps ? "uppercase" : "none", color: i === n - 1 ? "var(--x-ink)" : i % 2 ? "var(--x-accent)" : "var(--x-ink)", justifySelf: "start", maxWidth: "100%" });
      if (s.caps) node.style.color = "var(--x-dim)";
      el.append(node);
      return { node, s, size: base * s.size };
    });
    // every piece fits the width; the last grows to fill it (never past the hero size)
    items.forEach((it, i) => {
      const w = it.node.offsetWidth || 1;
      let size = it.size;
      if (i === n - 1 && n > 1) size = Math.min(size * (W * 0.98) / w, parseFloat(getComputedStyle(el).getPropertyValue("--x-hero-size")) * 1.15 || size);
      if (w * (size / it.size) > W * 0.98) size = it.size * (W * 0.98) / w;
      it.size = size;
      it.node.style.fontSize = `${size.toFixed(1)}px`;
    });
    // a wide, short slot reads the sentence as one flowing line of mixed sizes; otherwise stacked rows
    const flow = W / Math.max(1, avail) > 3.2;
    const bigIt = n > 1 ? items[n - 1] : null;
    const setSize = (it, size) => { it.size = size; it.node.style.fontSize = `${size.toFixed(1)}px`; };
    // too tall for its room: the big word gives way first (never below the slot's own size), then all of them
    const room0 = flow ? avail * 0.95 : avail * 1.12;
    const height = () => (flow ? Math.max(...items.map((it) => it.node.offsetHeight)) : items.reduce((a, it) => a + it.node.offsetHeight, 0));
    if (bigIt && height() > room0) { const h = bigIt.node.offsetHeight, over = height() - room0; setSize(bigIt, bigIt.size * Math.max(base * 0.95 / bigIt.size, (h - over) / h)); }
    if (flow) {
      Object.assign(el.style, { display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "center", columnGap: "0.3em", rowGap: "0" });
      const sum = items.reduce((a, it) => a + it.node.offsetWidth, 0) + base * 0.3 * n;
      const k = Math.min(1, (W * 0.98) / sum, room0 / height());
      items.forEach((it, i) => { setSize(it, it.size * k); it.node.style.translate = "none"; it.dy = (i % 2 ? -1 : 1) * base * 0.08 * k; });
    } else {
      const total = height(), k = total > room0 ? room0 / total : 1;
      items.forEach((it, i) => {
        if (k < 1) it.node.style.fontSize = `${(it.size * k).toFixed(1)}px`;
        const last = i === n - 1 && n > 1;
        if (p.layout === "diagonal") {
          it.node.style.justifySelf = "start";
          const w = it.node.offsetWidth;
          it.node.style.marginInlineStart = `${Math.max(0, (W - w) * (n > 1 ? i / (n - 1) : 0)).toFixed(1)}px`;
        } else {
          it.node.style.justifySelf = last ? "start" : place[i % place.length];
          const w = it.node.offsetWidth;
          if (!last && place[i % place.length] === "start") it.node.style.marginInlineStart = `${Math.min(W - w, W * indent[i % indent.length]).toFixed(1)}px`;
        }
        it.dy = 0;
      });
    }

    // times: each piece on its spoken word, else a steady stagger
    let prev = -Infinity;
    const times = groups.map((g, i) => {
      const fb = at + i * p.stagger;
      const w = p.sync === "spoken" ? Math.max(at, ctx.word(g.split(" ")[0], fb)) : fb;
      prev = Math.max(w, prev + 0.12);
      return prev;
    });
    const room = (end - at) * 0.8 - p.duration;
    if (times[n - 1] - at > room && room > 0) { const k = room / (times[n - 1] - at); times.forEach((x, i) => { times[i] = at + (x - at) * k; }); }
    times.forEach((x, i) => ctx.sfx(x, i === n - 1 ? "pop" : "tap", i === n - 1 ? 0.35 : 0.2));
    const kinds = items.map((_, i) => (p.move === "mix" ? ["rise", "fade", "slide", "scale"][i % 4] : p.move));
    const dir = rtl ? -1 : 1;
    return {
      draw(t) {
        items.forEach((it, i) => {
          const u = ML.land(t, times[i], times[i] + p.duration);
          const k = kinds[i], sz = it.size;
          let x = 0, y = it.dy || 0, s = 1;
          if (k === "rise") y += (1 - u) * sz * 0.35;
          if (k === "fade") y += (1 - u) * sz * 0.08;
          if (k === "slide") x = -dir * (1 - u) * sz * 0.5;
          if (k === "scale") s = 0.88 + 0.12 * u;
          it.node.style.opacity = (k === "fade" ? u : Math.min(1, u * 1.6)).toFixed(4);
          it.node.style.translate = x || y ? `${x.toFixed(2)}px ${y.toFixed(2)}px` : "none";
          it.node.style.scale = s === 1 ? "none" : s.toFixed(4);
        });
      },
    };
  },
});
