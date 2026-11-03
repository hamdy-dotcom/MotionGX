// Word slams on a repeating wall: the frame turns into a poster — behind, a wall of outline type (the look's accent,
// a thin stroke) repeating a slogan in rows that scroll at a steady speed, every other row the other way, seamless;
// in front, one giant heavy word slams in rotated — scale 2.5 → 1 and rotation 2× → 1× its tilt in 0.2 s on an expo
// out — with a hard accent offset shadow and a 2-frame shake on impact. The next word swaps in by a hard cut (on its
// spoken time when the voice says it). Arabic words stay whole; RTL rows run the other way and the tilt mirrors.
// Source: prompt-motion 3xtihor-made-with-claude-opus (reference only — our own rebuild).
ML.define({
  id: "kinetic.word-slam-on-wall",
  category: "kinetic",
  name: "Word slams on a repeating wall",
  does: "A giant word slams in rotated over a background wall of repeated outline text scrolling in alternating rows.",
  says: ["energy", "brand", "urgency"],
  energy: 5,
  targets: ["word", "headline"],
  duration: [0.8, 4],
  params: {
    rotation: { type: "number", range: [-10, 10], default: -4, unit: "deg" },
    wall_text: { type: "text", default: "MAKE IT MOVE •" },
    wall_rows: { type: "number", range: [4, 10], default: 8 },
    wall_speed: { type: "number", range: [20, 80], default: 40, unit: "px/s" },
    shake: { type: "bool", default: true },
    plate: { type: "choice", options: ["ink", "ground"], default: "ink" },
  },
  pairs: ["kinetic.marquee-wall", "transition.glitch-bar-wipe"],
  avoid: ["calm", "luxury", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "prompt-motion:3xtihor-made-with-claude-opus", license: "reference", note: "our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const host = ctx.scene || ctx.stage, doc = host.ownerDocument;
    const f = ctx.f, W = f.W, H = f.H, k = Math.min(W, H) / 1080;
    const isStage = el === ctx.stage || el === ctx.scene;
    const src = ((isStage ? host.querySelector(".ml-title") : el)?.textContent || "").replace(/\s+/g, " ").trim();
    const words = src.split(" ").map((w) => w.replace(/[.,،؛؟!?…:]+$/u, "")).filter(Boolean); // every word slams: none is dropped from the line
    if (!words.length) return null;
    const n = words.length;
    // ── times: spoken when every word is said inside the run, else a steady hard-cut cycle ──
    const cyc = Math.max(0.2, Math.min(0.75, (end - at - 0.3) / n));
    let times = words.map((_, i) => at + i * cyc);
    const said = words.map((w, i) => ctx.word(w, NaN, words.slice(0, i).filter((x) => ML.plain(x) === ML.plain(w)).length + 1));
    if (said.every((x, i) => Number.isFinite(x) && x >= at && x < end - 0.3 && (i === 0 || x > said[i - 1] + 0.25))) times = said;
    times.forEach((t, i) => ctx.sfx(t + 0.1, "hit", i === n - 1 ? 0.5 : 0.32));
    const ink = p.plate === "ink";
    // ── the layer: a plate, the wall of outline rows, the slam word ──
    const layer = doc.createElement("div");
    Object.assign(layer.style, { position: "absolute", inset: "0", zIndex: "6", overflow: "hidden", pointerEvents: "none", background: ink ? "var(--x-ink)" : "var(--x-ground)" });
    host.append(layer);
    const rows = Math.round(ML.clamp(p.wall_rows, 4, 10));
    const rowH = H / rows, wallSize = rowH * 0.5;
    const wallText = rtl && p.wall_text === "MAKE IT MOVE •" ? words.join(" ") + " •" : String(p.wall_text || "•");
    const wall = [];
    for (let r = 0; r < rows; r++) {
      const row = doc.createElement("div");
      Object.assign(row.style, { position: "absolute", left: "0", top: (r * rowH + (rowH - wallSize * 1.1) / 2).toFixed(1) + "px", whiteSpace: "nowrap", direction: "ltr", font: `700 ${wallSize.toFixed(1)}px / 1.1 var(--x-head-font)`, letterSpacing: rtl ? "0" : "0.02em", textTransform: rtl ? "none" : "uppercase", color: ink ? "var(--x-ink)" : "var(--x-ground)", WebkitTextStroke: `${Math.max(2, 3 * k).toFixed(2)}px var(--x-accent)`, paintOrder: "stroke fill", opacity: "0.9" }); // the plate's colour filled over the stroke: only the outer edge shows, so joined Arabic letters keep one clean outline, no seams inside
      layer.append(row);
      const seg = doc.createElement("span");
      Object.assign(seg.style, { display: "inline-block", unicodeBidi: "isolate", direction: rtl ? "rtl" : "ltr", paddingInlineEnd: (wallSize * 0.45).toFixed(1) + "px" });
      seg.textContent = wallText;
      row.append(seg);
      wall.push({ row, seg });
    }
    const segW = Math.max(40, ctx.box(wall[0].seg).w); // sub-pixel width: the wrap has to be seamless
    const copies = Math.ceil(W / segW) + 3;
    for (const w of wall) for (let c = 1; c < copies; c++) w.row.append(w.seg.cloneNode(true));
    // the slam word: 220 px on a 1080 frame, short words up to 300 px so they stay giant, long ones fitted to 86% of the width
    const word = doc.createElement("div");
    Object.assign(word.style, { position: "absolute", left: "50%", top: "50%", whiteSpace: "nowrap", font: `800 ${(220 * k).toFixed(1)}px / 1 var(--x-head-font)`, letterSpacing: rtl ? "0" : "-0.03em", textTransform: rtl ? "none" : "uppercase", direction: rtl ? "rtl" : "ltr", color: ink ? "var(--x-ground)" : "var(--x-ink)", textShadow: `${(6 * k).toFixed(1)}px ${(6 * k).toFixed(1)}px 0 var(--x-accent)` });
    layer.append(word);
    const base = 220 * k * (f.wide ? 1.1 : 1);
    word.style.fontSize = base + "px";
    const sizes = words.map((w) => { word.textContent = w; return Math.min((base * W * 0.86) / (word.offsetWidth || 1), base * (300 / 220)); });
    const tilt = p.rotation * (rtl ? -1 : 1);
    const hideSource = !isStage;
    // the poster takes the frame just before the first slam (on the voice, that may be after `at`)
    const start = Math.max(at, times[0] - 0.1);
    return {
      draw(t) {
        const on = t >= start - 1e-6 && t < end;
        layer.style.visibility = on ? "visible" : "hidden";
        if (hideSource) el.style.opacity = on ? "0" : "";
        if (!on) return;
        // the wall: each row scrolls at wall_speed, alternating, wrapped on one segment so it never ends
        const run = (t - start) * p.wall_speed * k;
        wall.forEach((w, r) => {
          const d = (r % 2 === 0 ? 1 : -1) * (rtl ? -1 : 1);
          const o = ((run % segW) + segW) % segW;
          const x = d > 0 ? -segW + o : -o;
          w.row.style.transform = `translateX(${x.toFixed(2)}px)`;
        });
        // the word: hard cut to the current one, slam 2.5 → 1, tilt 2× → 1×, 2-frame shake on impact
        let i = 0;
        for (let j = 0; j < n; j++) if (t >= times[j]) i = j;
        if (word.textContent !== words[i]) word.textContent = words[i];
        word.style.fontSize = sizes[i].toFixed(2) + "px";
        const s0 = times[i], u = ML.expo(t, s0, s0 + 0.2);
        const sc = 2.5 - 1.5 * u, rot = tilt * (2 - u);
        let sx = 0, sy = 0;
        const fr = Math.floor((t - (s0 + 0.12)) * 30);
        if (p.shake && fr >= 0 && fr < 2) { sx = (ML.rnd(i * 7 + fr, 3) - 0.5) * 22 * k; sy = (ML.rnd(i * 7 + fr, 5) - 0.5) * 22 * k; }
        word.style.opacity = String(Math.min(1, ML.lin(t, s0, s0 + 0.05)));
        word.style.transform = `translate(calc(-50% + ${sx.toFixed(2)}px), calc(-50% + ${sy.toFixed(2)}px)) rotate(${rot.toFixed(3)}deg) scale(${sc.toFixed(4)})`;
      },
    };
  },
});
