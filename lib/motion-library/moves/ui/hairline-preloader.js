// Hairline preloader, ported from MengTo/Skills' scroll-worlds demo (#pre): a full-screen veil on the look's ground
// with a centred stack — a 44 px mark, a spaced caps label (.5em), a 1 px track at 14 % ink whose fill's right inset
// runs 100 % → 0 in jobs (each step glides .35 s linear, the percentage jumps as each job finishes), and a meta row:
// the current job's caption on one side, the tabular percentage on the other. When the last job lands it waits .22 s
// and the whole veil fades out over .8 s on cubic-bezier(.22,.61,.36,1), uncovering the scene beneath.
// Captions come from `labels` (split on |) and advance with the jobs. Web px grow with the stage (×2.2 at 1080).
// In Arabic the fill grows from the right and the meta row mirrors (no letter-spacing on Arabic).
// Source: MengTo/Skills web-design/build-threejs-scroll-worlds/demo/index.html (MIT).
ML.define({
  id: "ui.hairline-preloader",
  category: "ui",
  name: "Hairline preloader",
  does: "A one-pixel line fills left to right under a small mark while a percentage counts, then the whole screen fades out.",
  says: ["time", "arrival", "calm"],
  energy: 1,
  targets: ["number", "line", "scene"],
  duration: [1, 3],
  params: {
    labels: { type: "text", default: "Reading the type|Pouring the ground" },
    title: { type: "text" },
    bar_width: { type: "number", range: [120, 400], default: 220, unit: "px" },
    jobs: { type: "number", range: [4, 16], default: 9 },
  },
  pairs: ["text-in.punchline", "camera.push-in"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "MengTo/Skills:web-design/build-threejs-scroll-worlds/demo/index.html", license: "MIT" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const u = 2.2 * Math.min(f.W, f.H) / 1080; // one web px
    const defaultLabels = "Reading the type|Pouring the ground";
    const labels = (rtl && p.labels === defaultLabels ? "نقرأ الخط|نجهّز الأرضية" : p.labels || defaultLabels).split("|").map((x) => x.trim()).filter(Boolean);
    const title = p.title || (rtl ? "لحظة واحدة" : "LOADING");

    const veil = mk("div", `position:absolute;inset:0;z-index:40;background:var(--x-ground);background-image:var(--x-ground-image);display:flex;align-items:center;justify-content:center;pointer-events:none;`, host);
    const bw = Math.min(p.bar_width * u, f.W * 0.74);
    const inn = mk("div", `width:${bw.toFixed(1)}px;text-align:center;`, veil);
    const mark = sv("svg", { viewBox: "0 0 44 44", width: (44 * u).toFixed(1), height: (44 * u).toFixed(1), fill: "none", style: `display:block;margin:0 auto ${(26 * u).toFixed(1)}px;opacity:.9;` }, inn);
    sv("circle", { cx: 22, cy: 24, r: 9.5, stroke: "var(--x-accent)", "stroke-width": 1.2 }, mark);
    sv("path", { d: "M6 12h32M9.5 17h25M22 8v28", stroke: "var(--x-ink)", "stroke-width": 1.2 }, mark);
    mk("div", `font:var(--x-label-weight) ${(12 * u).toFixed(1)}px var(--x-label-font);letter-spacing:${rtl ? 0 : ".5em"};${rtl ? "" : "margin-inline-end:-.5em;"}text-transform:var(--x-label-case);color:var(--x-dim);margin-bottom:${(20 * u).toFixed(1)}px;`, inn, title);
    const bar = mk("div", `position:relative;height:${Math.max(1, u * 0.9).toFixed(2)}px;background:color-mix(in srgb, var(--x-ink) 14%, transparent);overflow:hidden;`, inn);
    const fill = mk("i", `position:absolute;top:0;bottom:0;${rtl ? "right" : "left"}:0;width:100%;background:var(--x-ink);`, bar);
    const meta = mk("div", `display:flex;justify-content:space-between;align-items:baseline;gap:1em;margin-top:${(12 * u).toFixed(1)}px;font:var(--x-label-weight) ${(10 * u).toFixed(1)}px var(--x-label-font);letter-spacing:${rtl ? 0 : ".2em"};text-transform:var(--x-label-case);color:var(--x-dim);white-space:nowrap;`, inn);
    const cap = mk("span", "overflow:hidden;text-overflow:ellipsis;", meta);
    const pctB = mk("b", "font-weight:500;color:var(--x-ink);font-variant-numeric:tabular-nums;direction:ltr;", meta);

    // jobs: seeded finish times between at and the hand-off, each a step of the fill
    const fadeD = Math.min(0.8, Math.max(0.3, (end - at) * 0.3));
    const fadeAt = Math.max(at + 0.7, end - fadeD - 0.05), lastJob = fadeAt - 0.22;
    const J = Math.max(2, Math.round(p.jobs)), span = Math.max(0.3, lastJob - (at + 0.12));
    const w = Array.from({ length: J }, (_, i) => 0.5 + ML.rnd(i, 21)), sw = w.reduce((a, b) => a + b, 0);
    const jobT = []; { let acc = 0; for (let i = 0; i < J; i++) { acc += w[i]; jobT.push(at + 0.12 + (span * acc) / sw - 0.0); } }
    jobT[J - 1] = lastJob;
    const fadeCurve = ML.bezier(0.22, 0.61, 0.36, 1);
    ctx.sfx(lastJob, "swell", 0.2);
    const step = Math.max(0.05, Math.min(0.35, span / J));

    return {
      draw(t) {
        if (t < at - 1e-6) { veil.style.visibility = "hidden"; return; }
        // jobs done by t; the fill glides .35 s linear from the previous share to the new one
        let done = 0; while (done < J && t >= jobT[done]) done++;
        let shown = 0;
        for (let i = 0; i < J; i++) shown += ML.lin(t, jobT[i], jobT[i] + step) / J;
        fill.style.width = (shown * 100).toFixed(3) + "%";
        pctB.textContent = `${Math.round((done / J) * 100)}%`;
        cap.textContent = labels[Math.min(labels.length - 1, Math.floor((done / J) * labels.length))];
        const o = 1 - fadeCurve(ML.lin(t, fadeAt, fadeAt + fadeD));
        veil.style.visibility = o <= 0.001 ? "hidden" : "visible";
        veil.style.opacity = o.toFixed(4);
        inn.style.opacity = ML.out(t, at, at + 0.3).toFixed(4);
      },
    };
  },
});
