// Hyperspace flash: on the cut the ground flashes bright (a light grey) for 2-3 frames while ~200 radial star streaks
// (1 px, 20-80 px long, 60 % white) rush out from the centre at ~3000 px/s; the word lands at scale 1.15 as three copies
// — a red one 8 px to the start side, a blue one 8 px to the end side, the clean one on top — that converge to no offset
// and scale 1 over 0.25 s expo.out, so a chromatic split snaps clean; the flash fades back to the ground over 0.2 s and
// the starfield keeps streaking, slower. "per-word" cuts on the beat word by word (each word on its spoken time), each
// cut kicking the streaks again. The starfield is painted on a canvas from t alone: every streak's angle, start, length
// and speed come from ML.rnd, its distance is the closed-form integral of a decaying speed burst per cut.
// Streaks are drawn over the flash, so the frame's brightest moment shows them. The layer ends with the move (ctx.end).
// Colours from the look: the dark ground and the light streaks and word are its ink and ground (darker one the ground),
// the split its bad (red) and accent-2 (blue). The flash is a look name / --x- variable, or "grey" (dim lifted towards light).
// Source: prompt-motion maxalexweber-i-made-this-with (reference only: our own rebuild).
ML.define({
  id: "transition.hyperspace-flash",
  category: "transition",
  name: "Hyperspace flash",
  does: "The frame flashes bright with radial star streaks rushing outward while a big word slams in with a red/blue chromatic offset, then snaps clean.",
  says: ["energy", "arrival", "speed"],
  energy: 5,
  targets: ["headline", "word", "scene"],
  duration: [0.3, 0.8],
  params: {
    flash: { type: "text", default: "grey" },
    split: { type: "number", range: [0, 14], default: 8, unit: "px" },
    streaks: { type: "number", range: [50, 300], default: 200 },
    words: { type: "choice", options: ["whole", "per-word"], default: "whole" },
    gap: { type: "number", range: [0.2, 0.8], default: 0.4, unit: "s" },
  },
  pairs: ["transition.flash-cut", "camera.snap-zoom", "text-in.slam"],
  avoid: ["calm", "luxury", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "prompt-motion:maxalexweber-i-made-this-with", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const scene = ctx.scene || stage;
    const own = ctx.el && ctx.el !== stage && ctx.el !== scene ? ctx.el : null;
    const src = own || scene.querySelector(".ml-title, .ml-hero, [data-slot-sample='headline']");
    const text = ((src && src.textContent) || "").trim().replace(/\s+/g, " ");
    if (!text) return null;
    const W = f.W, H = f.H, k = Math.min(W, H) / 1080, FR = 1 / 30;
    const name = String(p.flash || "grey").trim();
    
    // the two poles of the look, whichever way round it is: never accent-ink, which is dark on a bright accent
    const probe = document.createElement("span"); probe.style.display = "none"; stage.append(probe);
    const rgb = (v) => { probe.style.color = v; return (getComputedStyle(probe).color.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number); };
    const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const inkDark = lum(rgb("var(--x-ink)")) < lum(rgb("var(--x-ground)"));
    probe.remove();
    const DARK = inkDark ? "var(--x-ink)" : "var(--x-ground)", LIGHT = inkDark ? "var(--x-ground)" : "var(--x-ink)";
    const flashCol = name.startsWith("--x-") ? `var(${name})` : /^(accent|accent-2|accent-ink|ink|dim|panel|panel-2|ground|good|bad|device)$/.test(name) ? `var(--x-${name})` : `color-mix(in srgb, var(--x-dim) 45%, ${LIGHT})`;

    // the layer: the dark ground, the flash, the starfield canvas over it, the word
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:9;overflow:hidden;visibility:hidden;background:" + DARK;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
    const fl = document.createElement("div");
    fl.style.cssText = `position:absolute;inset:0;background:${flashCol};opacity:0`;
    const wordBox = document.createElement("div");
    wordBox.style.cssText = "position:absolute;inset:0;display:grid;place-items:center";
    layer.append(fl, cv, wordBox);
    stage.append(layer);
    const lk = scene.getAttribute("data-look"); if (lk) layer.setAttribute("data-look", lk); // a scene's own look reaches the layer on the stage
    const g = cv.getContext("2d");
    const lp = document.createElement("span");
    lp.style.cssText = `display:none;color:${LIGHT}`;
    layer.append(lp);
    const star = (getComputedStyle(lp).color.match(/[\d.]+/g) || [255, 255, 255]).slice(0, 3).map(Number);
    lp.remove();

    // the words that slam: the whole line once, or one word per beat
    const parts = p.words === "per-word" ? text.split(" ") : [text];
    const times = parts.map((w, i) => (i === 0 ? at : Math.max(at + i * 0.2, ctx.word(w, at + i * p.gap))));
    for (let i = 1; i < times.length; i++) times[i] = Math.max(times[i], times[i - 1] + 0.2);
    const arabic = ML.ARABIC.test(text);
    const slams = parts.map((w) => {
      const holder = document.createElement("div");
      holder.style.cssText = "grid-area:1/1;position:relative;visibility:hidden;white-space:nowrap";
      const mk = (col, blend) => {
        const d = document.createElement("div");
        d.textContent = w;
        d.style.cssText = `font:var(--x-head-weight) var(--x-hero-size)/1.02 var(--x-head-font);letter-spacing:${arabic ? "0" : "var(--x-hero-track)"};text-transform:var(--x-head-case);color:${col};white-space:nowrap;${blend ? "position:absolute;inset:0;mix-blend-mode:screen;" : "position:relative;"}`;
        return d;
      };
      const red = mk("var(--x-bad)", true), blue = mk("var(--x-accent-2)", true), top = mk(LIGHT, false);
      holder.append(top, red, blue);
      top.style.zIndex = "2";
      wordBox.append(holder);
      return { holder, red, blue, top };
    });
    // every word fitted to the frame (all copies the same size)
    for (const s of slams) {
      const size = ML.fit(s.top, W * 0.86);
      s.red.style.fontSize = s.blue.style.fontSize = s.top.style.fontSize = size.toFixed(2) + "px";
    }

    // the starfield: one streak per seed, distance = closed-form integral of a burst of speed per cut
    const N = Math.round(ML.clamp(+p.streaks || 200, 50, 300));
    const Rmax = Math.hypot(W, H) / 2 + 80 * k, rmin = 30 * k;
    const vf = 3000 * k, vs = 420 * k, tc = 0.32;
    const seeds = Array.from({ length: N }, (_, i) => ({ a: ML.rnd(i, 1) * Math.PI * 2, r0: ML.rnd(i, 2) * (Rmax - rmin), len: (20 + 60 * ML.rnd(i, 3)) * k, s: 0.7 + 0.6 * ML.rnd(i, 4), w: ML.rnd(i, 5) < 0.2 ? 1.6 : 1 }));
    const dist = (tau) => {
      let d = vs * tau;
      for (const tk of times) { const u = tau - (tk - at); if (u > 0) d += (vf - vs) * tc * (1 - Math.exp(-u / tc)); }
      return d;
    };
    const speed = (tau) => { let v = vs; for (const tk of times) { const u = tau - (tk - at); if (u > 0) v += (vf - vs) * Math.exp(-u / tc); } return v; };
    const split = ML.clamp(+p.split, 0, 14) * k * (ctx.rtl ? -1 : 1);
    times.forEach((tk, i) => ctx.sfx(tk, "hit", i === 0 ? 0.6 : 0.4));
    ctx.sfx(at, "whoosh.heavy", 0.3);

    const paint = (tau) => {
      g.clearRect(0, 0, W, H);
      const d = dist(tau), v = speed(tau), stretch = 0.6 + 0.9 * (v / vf);
      g.lineCap = "round";
      for (const s of seeds) {
        const r = rmin + ((s.r0 + d * s.s) % (Rmax - rmin));
        const len = s.len * stretch, r1 = Math.max(rmin, r - len);
        const cx = W / 2, cy = H / 2, ca = Math.cos(s.a), sa = Math.sin(s.a);
        const a = 0.6 * ML.clamp((r - rmin) / (Rmax * 0.35));
        if (a < 0.01) continue;
        g.strokeStyle = `rgba(${star.join(",")},${a.toFixed(3)})`;
        g.lineWidth = s.w * k;
        g.beginPath();
        g.moveTo(cx + ca * r1, cy + sa * r1);
        g.lineTo(cx + ca * r, cy + sa * r);
        g.stroke();
      }
    };

    // a piece's explicit visibility beats a hidden parent: a layer that is off is off by display, on any seek
    const showLayer = (on) => { layer.style.visibility = on ? "visible" : "hidden"; layer.style.display = on ? "" : "none"; };
    return {
      draw(t) {
        scene.style.visibility = t >= ctx.end ? "hidden" : "";
        if (t < at || t >= ctx.end) { showLayer(false); return; }
        showLayer(true);
        paint(t - at);
        // flash: full for 3 frames on the first cut (2 on the later ones, softer), fades back over 0.2 s
        let fo = 0;
        times.forEach((tk, i) => {
          const hold = (i === 0 ? 3 : 2) * FR, peak = i === 0 ? 1 : 0.6;
          if (t >= tk && t < tk + hold) fo = Math.max(fo, peak);
          else if (t >= tk + hold) fo = Math.max(fo, peak * (1 - ML.out(t, tk + hold, tk + hold + 0.2)));
        });
        fl.style.opacity = fo.toFixed(4);
        // the word on screen: the latest one cut in
        let cur = -1;
        times.forEach((tk, i) => { if (t >= tk) cur = i; });
        slams.forEach((s, i) => {
          if (i !== cur) { s.holder.style.visibility = "hidden"; return; }
          const e = ML.expo(t, times[i], times[i] + 0.25);
          s.holder.style.visibility = "visible";
          s.holder.style.scale = (1.15 - 0.15 * e).toFixed(4);
          const off = split * (1 - e);
          s.red.style.translate = `${(-off).toFixed(2)}px 0`;
          s.blue.style.translate = `${off.toFixed(2)}px 0`;
          s.red.style.opacity = s.blue.style.opacity = e < 0.995 ? "1" : "0";
        });
      },
    };
  },
});
