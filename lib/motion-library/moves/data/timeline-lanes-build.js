// Editor lanes fill with clips: a video-editor timeline builds lane by lane — scene clips spread across the span, a
// voice waveform on its beat, caption blocks staggering in (0.018 s apart), a music bar (accent at 0.6), sound ticks
// (3 px bars, 0.008 s apart) — then a 2 px ring-coloured playhead sweeps the whole film on a cubic in-out. Lanes sit in
// a grid (rows 1.5fr 1fr .7fr .7fr .7fr …, gap 10, a label column) and every clip is placed by its time (share of the
// film). The panel and each clip enter the way the look moves (ML.show); a long stagger compresses so every lane lands
// before the move ends. On 9:16 it drops to 3 lanes with narrower labels; in Arabic the labels sit on the right and time
// runs right to left (logical inline insets).
// Source: MengTo/Skills html-explainer-video demo/film.js step4 + film.css .s4-* (MIT), ported to a standalone move.
ML.define({
  id: "data.timeline-lanes-build",
  category: "data",
  name: "Editor lanes fill with clips",
  does: "A video-editor timeline builds lane by lane — clips, a waveform, caption blocks, a music bar, sound ticks — then a playhead sweeps the whole film.",
  says: ["flow", "connection", "tech", "step"],
  energy: 3,
  targets: ["chart", "screen", "list"],
  duration: [2, 6],
  params: {
    lanes: { type: "number", range: [2, 6], default: 5 },
    stagger: { type: "number", range: [0.008, 0.2], default: 0.018, unit: "s" },
    playhead: { type: "bool", default: true },
    scenes: { type: "number", range: [3, 12], default: 7 },
  },
  pairs: ["data.waveform-progress", "data.timeline-playhead-markers"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "MengTo/Skills:html-explainer-video (demo/film.js step4, film.css .s4-*)", license: "MIT" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const R0 = el && el !== stage ? ctx.box(el) : f.pic;
    const R = R0.h < 160 ? f.pic : R0;
    const u = Math.min(f.W, f.H) / 1080;
    const NAMES = rtl ? ["المشاهد", "الصوت", "الترجمة", "الموسيقى", "المؤثرات", "العناوين"] : ["Scenes", "Voice", "Captions", "Music", "Sound", "Titles"];
    const ROWS = [1.5, 1, 0.7, 0.7, 0.7, 0.7];
    const nL = Math.round(ML.clamp(f.tall ? Math.min(p.lanes, 3) : p.lanes, 2, 6));
    const labW = Math.round((f.tall ? 120 : 150) * u), padX = Math.round(20 * u);
    const H = Math.min(R.h, Math.max(260 * u, nL * 110 * u));
    const panel = mk("div", `position:absolute;left:${R.x}px;top:${(R.y + (R.h - H) / 2).toFixed(1)}px;width:${R.w}px;height:${H.toFixed(1)}px;z-index:20;box-sizing:border-box;visibility:hidden`, ctx.scene || stage);
    panel.className = "ml-panel";
    panel.dir = rtl ? "rtl" : "ltr";
    const lanesBox = mk("div", `position:absolute;inset:0;display:grid;grid-template-rows:${ROWS.slice(0, nL).map((r) => r + "fr").join(" ")};gap:${Math.round(10 * u)}px;padding:${Math.round(18 * u)}px ${padX}px;padding-inline-start:${labW + padX + Math.round(2 * u)}px`, panel);
    const lanes = NAMES.slice(0, nL).map((n) => {
      const l = mk("div", "position:relative;min-height:0", lanesBox);
      const lab = mk("label", `position:absolute;inset-inline-start:${-labW}px;top:50%;transform:translateY(-50%);font-family:var(--x-label-font);font-weight:var(--x-label-weight);text-transform:var(--x-label-case);font-size:${Math.round((f.tall ? 21 : 25) * u)}px;color:var(--x-dim);white-space:nowrap`, l, n);
      if (rtl) lab.style.textTransform = "none";
      return l;
    });
    const clipCss = `position:absolute;top:0;bottom:0;overflow:hidden;border-radius:min(var(--x-radius-s), ${Math.round(14 * u)}px);border:1px solid var(--x-line);visibility:hidden;box-sizing:border-box`;
    const span = Math.max(1, end - at);
    // the film the timeline lays out: seeded scene lengths, words, captions, cues (shares of the whole)
    const nS = Math.round(ML.clamp(p.scenes, 3, 12));
    const cuts = [0]; { let acc = 0; const ws = Array.from({ length: nS }, (_, i) => 0.6 + ML.rnd(i, 13)); const tot = ws.reduce((a, b) => a + b, 0); for (const w of ws) { acc += w / tot; cuts.push(acc); } }
    const pct = (x) => (x * 100).toFixed(2) + "%";
    const items = []; // [element, time it enters]
    const T = { scenes: at + 0.1, wave: at + span * 0.3, caps: at + span * 0.36, music: at + span * 0.44, sound: at + span * 0.5, titles: at + span * 0.52, head: at + span * 0.55 };
    const fitStep = (want, n, from) => Math.min(want, Math.max(0.004, (end - 0.6 - from) / n)); // a stagger never outruns the move
    const leaveAt = end - 0.25;
    const kinds = ["scenes", "wave", "caps", "music", "sound", "titles"];
    lanes.forEach((lane, li) => {
      const kind = kinds[li];
      if (kind === "scenes") {
        for (let i = 0; i < nS; i++) {
          const c = mk("div", `${clipCss};inset-inline-start:${pct(cuts[i])};width:calc(${pct(cuts[i + 1] - cuts[i])} - ${Math.round(3 * u)}px);background:linear-gradient(135deg, color-mix(in srgb, var(--x-accent) ${i % 2 ? 55 : 30}%, var(--x-panel-2)), color-mix(in srgb, var(--x-accent-2) ${i % 2 ? 25 : 50}%, var(--x-panel-2)))`, lane);
          mk("i", `position:absolute;inset-inline-start:12%;bottom:18%;width:${(30 + 40 * ML.rnd(i, 4)).toFixed(0)}%;height:12%;border-radius:var(--x-radius-s);background:var(--x-panel);opacity:.55`, c);
          items.push([c, T.scenes + (i * (T.wave - 0.2 - T.scenes)) / nS]);
        }
      } else if (kind === "wave") {
        const w = mk("div", `position:absolute;inset:0;display:flex;align-items:center;gap:${Math.max(1, Math.round(2 * u))}px;visibility:hidden`, lane);
        const nB = f.tall ? 60 : 96;
        for (let i = 0; i < nB; i++) mk("i", `flex:1;min-width:1px;height:${(14 + 74 * ML.rnd(i, 5)).toFixed(0)}%;background:var(--x-accent)`, w);
        items.push([w, T.wave - 0.05]);
      } else if (kind === "caps" || kind === "titles") {
        let x = 0.01, i = 0;
        const seed = kind === "caps" ? 21 : 37, born = items.length;
        while (x < 0.97) {
          const len = (kind === "caps" ? 0.05 : 0.12) + (kind === "caps" ? 0.06 : 0.1) * ML.rnd(i, seed);
          const b = Math.min(0.995, x + len);
          const c = mk("div", `${clipCss};inset-inline-start:${pct(x)};width:calc(${pct(b - x)} - ${Math.round(2 * u)}px);background:color-mix(in srgb, var(--x-ink) 80%, transparent)`, lane);
          items.push([c, 0]);
          x = b + (kind === "caps" ? 0.004 : 0.08 + 0.1 * ML.rnd(i, seed + 1)); i++;
        }
        const from = kind === "caps" ? T.caps : T.titles, dt = fitStep(p.stagger, i, from);
        for (let k = 0; k < i; k++) items[born + k][1] = from + k * dt;
      } else if (kind === "music") {
        const c = mk("div", `${clipCss};inset-inline-start:0;width:100%;background:color-mix(in srgb, var(--x-accent) 60%, transparent)`, lane);
        items.push([c, T.music]);
      } else if (kind === "sound") {
        const n = 16, dt = fitStep((p.stagger * 8) / 18, n, T.sound); // ticks run at 0.008 where captions run at 0.018
        for (let i = 0; i < n; i++) {
          const x = (i + 0.2 + 0.6 * ML.rnd(i, 29)) / n;
          const c = mk("i", `position:absolute;top:12%;bottom:12%;inset-inline-start:${pct(x)};width:${Math.max(2, Math.round(3 * u))}px;background:var(--x-ink);visibility:hidden`, lane);
          items.push([c, T.sound + i * dt]);
        }
      }
    });
    const head = p.playhead ? mk("i", `position:absolute;top:${Math.round(6 * u)}px;bottom:${Math.round(6 * u)}px;width:${Math.max(2, Math.round(2 * u))}px;background:var(--x-ring);visibility:hidden;z-index:2`, panel) : null;
    if (head) mk("b", `position:absolute;top:${-Math.round(4 * u)}px;left:50%;width:${Math.round(12 * u)}px;height:${Math.round(12 * u)}px;translate:-50% 0;border-radius:50%;background:var(--x-ring)`, head);
    const startX = labW + padX + Math.round(2 * u), trackOff = startX + padX;
    ctx.sfx(T.scenes, "pop.soft", 0.3);
    if (nL > 2) ctx.sfx(T.caps, "tap", 0.22);
    if (head) ctx.sfx(T.head, "whoosh.soft", 0.25);
    return {
      draw(t) {
        ML.show(panel, t, at, leaveAt);
        for (const [e, a] of items) ML.show(e, t, a, leaveAt, { dur: 0.35 }); // the same leave: a hidden panel's children stay hidden
        if (head) {
          const h = ML.mix(t, T.head, end - 0.35, 0, 1);
          head.style.insetInlineStart = `calc(${startX}px + (100% - ${trackOff}px) * ${h.toFixed(4)})`;
          head.style.visibility = t >= T.head && t <= leaveAt + 0.22 ? "visible" : "hidden";
        }
      },
    };
  },
});
