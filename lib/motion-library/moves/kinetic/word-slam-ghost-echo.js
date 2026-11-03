// Word slam with a giant blurred ghost echo: each word of a slogan cuts in big and crisp — its two chromatic copies
// (the look's warm "bad" red and its cool second accent, ±4 px) collapsing into it over 0.15 s — while a huge copy of
// the next word (or the same one) fills the background: 300% size, 20% opacity, its own red / cyan split ±split px,
// smeared by a horizontal motion blur and sliding 40 px sideways through the hold. Between words a 0.12 s whip: a
// horizontal blur smear and a short push. Words cycle about 0.6 s each (on their spoken times when the voice says
// them inside the run); the final word turns to the accent and holds. Arabic words stay whole; RTL slides the other way.
// Source: prompt-motion aistocksavvy-wow-made-this-motion (reference only — our own rebuild).
ML.define({
  id: "kinetic.word-slam-ghost-echo",
  category: "kinetic",
  name: "Word slam with giant blurred ghost echo",
  does: "Each word of a slogan cuts in big and crisp while a huge, faded, chromatic-split copy of the next/previous word fills the background.",
  says: ["energy", "urgency", "brand"],
  energy: 5,
  targets: ["word", "headline"],
  duration: [1.5, 5],
  params: {
    echo: { type: "choice", options: ["next", "same"], default: "next" },
    split: { type: "number", range: [4, 14], default: 10, unit: "px" },
    cycle: { type: "number", range: [0.3, 1], default: 0.6, unit: "s" },
  },
  pairs: ["kinetic.word-card-cuts", "transition.glitch-bar-wipe"],
  avoid: ["calm", "luxury", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "prompt-motion:aistocksavvy-wow-made-this-motion", license: "reference", note: "our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const host = ctx.scene || ctx.stage, doc = host.ownerDocument, NS = "http://www.w3.org/2000/svg";
    const f = ctx.f, W = f.W, H = f.H, k = Math.min(W, H) / 1080;
    const isStage = el === ctx.stage || el === ctx.scene;
    const src = ((isStage ? host.querySelector(".ml-title") : el)?.textContent || "").replace(/\s+/g, " ").trim();
    const words = src.split(" ").map((w) => w.replace(/[.,،؛!?…:]+$/u, "")).filter(Boolean).slice(0, 8);
    if (!words.length) return null;
    const n = words.length;
    // ── times: spoken when every word is said inside the run, else a steady cycle that fits ──
    const cyc = Math.min(p.cycle, Math.max(0.25, (end - at - 0.6) / n));
    let times = words.map((_, i) => at + i * cyc);
    const said = words.map((w, i) => ctx.word(w, NaN, words.slice(0, i).filter((x) => ML.plain(x) === ML.plain(w)).length + 1));
    if (said.every((x, i) => Number.isFinite(x) && x >= at && x < end - 0.5 && (i === 0 || x > said[i - 1] + 0.2))) times = said;
    times.forEach((t, i) => ctx.sfx(t, i === n - 1 ? "hit" : "whoosh.soft", i === n - 1 ? 0.45 : 0.2));
    // ── the layer: echo behind, the slam in front ──
    const fid = "ml-wsge-" + Math.round(ML.rnd(at * 5.1 + n, 9) * 1e9);
    const svg = doc.createElementNS(NS, "svg");
    svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.style.position = "absolute";
    svg.innerHTML = `<filter id="${fid}e" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${(14 * k).toFixed(1)} 0"/></filter><filter id="${fid}w" x="-20%" y="-10%" width="140%" height="120%"><feGaussianBlur stdDeviation="0 0"/></filter>`;
    host.append(svg);
    const whip = svg.querySelector(`#${fid}w feGaussianBlur`);
    const layer = doc.createElement("div");
    Object.assign(layer.style, { position: "absolute", inset: "0", zIndex: "6", overflow: "hidden", pointerEvents: "none", background: "var(--x-ground)" });
    host.append(layer);
    const mk = (parent, css) => { const d = doc.createElement("div"); Object.assign(d.style, { position: "absolute", left: "50%", top: "50%", translate: "-50% -50%", whiteSpace: "nowrap", font: "700 10px / 1 var(--x-head-font)", letterSpacing: rtl ? "0" : "-0.02em", textTransform: rtl ? "none" : "uppercase", direction: rtl ? "rtl" : "ltr" }, css); parent.append(d); return d; };
    // echo: three stacked copies (red, cyan, ink) at 20%, blurred sideways
    const echo = doc.createElement("div");
    Object.assign(echo.style, { position: "absolute", inset: "0", opacity: "0.2", filter: `url(#${fid}e)` });
    layer.append(echo);
    const eR = mk(echo, { color: "var(--x-bad)" }), eC = mk(echo, { color: "var(--x-accent-2)" }), eK = mk(echo, { color: "var(--x-ink)" });
    // slam: red / cyan copies behind the ink copy
    const slam = doc.createElement("div");
    Object.assign(slam.style, { position: "absolute", inset: "0" });
    layer.append(slam);
    const sR = mk(slam, { color: "var(--x-bad)", opacity: "0.85" }), sC = mk(slam, { color: "var(--x-accent-2)", opacity: "0.85" }), sK = mk(slam, { color: "var(--x-ink)" });
    // sizes: the slam fitted to 86% of the width, the echo 3×
    const base = 190 * k * (f.wide ? 1.15 : 1);
    sK.style.fontSize = base + "px";
    const sizes = words.map((w) => { sK.textContent = w; const ww = sK.offsetWidth; return ww > W * 0.86 ? (base * W * 0.86) / ww : base; });
    const dir = rtl ? -1 : 1;
    const set = (els, txt, size) => els.forEach((e) => { if (e.textContent !== txt) e.textContent = txt; e.style.fontSize = size.toFixed(2) + "px"; });
    const hideSource = !isStage;
    // the first word cuts in as it is said (no smeared word waiting for the voice); a move starting with its scene
    // never flashes the scene first
    const start = times[0] - (ctx.from ?? 0) <= 0.2 ? (ctx.from ?? 0) : times[0];
    return {
      draw(t) {
        const on = t >= start - 1e-6 && t < end;
        layer.style.display = on ? "block" : "none"; // (visibility would not hold: the split copies set their own)
        if (hideSource) el.style.opacity = on ? "0" : "";
        if (!on) return;
        let i = 0;
        for (let j = 0; j < n; j++) if (t >= times[j]) i = j;
        const last = i === n - 1;
        const s0 = times[i], s1 = last ? end : times[i + 1];
        // the slam: chromatic copies collapse in 0.15 s
        set([sR, sC, sK], words[i], sizes[i]);
        const c = (1 - ML.out(t, s0, s0 + 0.15)) * 4 * k;
        sR.style.translate = `calc(-50% - ${c.toFixed(2)}px) -50%`;
        sC.style.translate = `calc(-50% + ${c.toFixed(2)}px) -50%`;
        sR.style.visibility = sC.style.visibility = c > 0.05 ? "visible" : "hidden";
        sK.style.color = last ? "var(--x-accent)" : "var(--x-ink)";
        // whip: a horizontal smear and a short push around each cut (out of this word, into the next)
        const into = t < s0 ? 0 : 1 - ML.lin(t, s0, s0 + 0.12), outOf = last ? 0 : ML.lin(t, s1 - 0.06, s1);
        const smear = Math.max(into * (i > 0 ? 1 : 0.4), outOf) * 18 * k;
        whip.setAttribute("stdDeviation", `${smear.toFixed(2)} 0`);
        slam.style.filter = smear > 0.05 ? `url(#${fid}w)` : "none";
        slam.style.translate = `${(dir * (-into * 30 * k + outOf * 30 * k)).toFixed(2)}px 0`;
        // the echo: the next (or same) word at 3×, sliding 40 px through the hold, split ±split px
        const ew = p.echo === "next" && !last ? words[i + 1] : words[i];
        set([eR, eC, eK], ew, sizes[i] * 3);
        const slide = (ML.lin(t, s0, s1) - 0.5) * 40 * k * dir;
        const sp = p.split * k;
        eR.style.translate = `calc(-50% + ${(slide - sp).toFixed(2)}px) -50%`;
        eC.style.translate = `calc(-50% + ${(slide + sp).toFixed(2)}px) -50%`;
        eK.style.translate = `calc(-50% + ${slide.toFixed(2)}px) -50%`;
      },
    };
  },
});
