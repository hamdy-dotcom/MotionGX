// Game HUD: thin game-like counters overlay the scene — an index top-left ("01", mono-ish, ink at 70%) with a tiny
// progress line under it, and top-right a heart icon in the "bad" colour, a heart-rate number and a mini ECG sparkline
// drawn continuously (the trace scrolls from t). Values step on events: each change swaps with a small 0.15 s y nudge
// (the old value lifts out as the new one rises in). Mirrored in RTL (index top-right, heart top-left).
// Source: prompt-motion loicrambo-just-one-shot-the (reference only: our own rebuild).
ML.define({
  id: "data.game-hud",
  category: "data",
  name: "Game-style HUD counters",
  does: "Thin game-like counters — an index top-left and a heart-rate number with a mini line top-right — overlay the scene.",
  says: ["time", "story"],
  energy: 1,
  targets: ["stage", "number", "label"],
  duration: [2, 10],
  params: {
    left: { type: "text", default: "01" },
    right: { type: "text", default: "120" },
    sparkline: { type: "bool", default: true },
    left_steps: { type: "number", range: [0, 5], default: 0 },
    right_every: { type: "number", range: [0, 3], default: 1.2, unit: "s" },
    bpm: { type: "number", range: [50, 160], default: 96 },
  },
  pairs: ["data.flow-particles", "camera.iso-orbit"],
  avoid: ["luxury", "celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:loicrambo-just-one-shot-the", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, end, stage, f } = ctx;
    const scene = ctx.scene || stage;
    const k = Math.min(f.W, f.H) / 1080, rtl = ctx.rtl;
    // two corners, just above the headline band: clear of the headline and of the phone's top edge
    const hud = document.createElement("div");
    hud.style.cssText = `position:absolute;left:var(--safe-x);top:calc(var(--safe-y) - ${f.tall ? 84 * k : 40 * k}px);width:var(--safe-w);height:${90 * k}px;z-index:8;pointer-events:none;visibility:hidden;display:flex;justify-content:space-between;align-items:flex-start;direction:${rtl ? "rtl" : "ltr"};color:var(--x-ink);font-family:var(--x-mono-font)`;
    scene.append(hud);
    // a value that swaps with a y nudge: two stacked spans in a clipped box, held open by a hidden copy of its widest value
    const swapper = (size, weight, widest) => {
      const box = document.createElement("span");
      box.style.cssText = `position:relative;display:inline-block;overflow:hidden;height:${(size * 1.15).toFixed(1)}px;line-height:${(size * 1.15).toFixed(1)}px;font-size:${size.toFixed(1)}px;font-weight:${weight};font-variant-numeric:tabular-nums;${ML.ARABIC.test(widest) ? "" : "letter-spacing:0.02em;"}direction:ltr`;
      const hold = document.createElement("span"), a = document.createElement("span"), b = document.createElement("span");
      hold.style.cssText = "display:block;white-space:pre;visibility:hidden"; hold.textContent = widest; box.append(hold);
      for (const s of [a, b]) { s.style.cssText = "display:block;white-space:pre;position:absolute;left:0;top:0"; box.append(s); }
      return { box, a, b };
    };
    // a target's text is the counter's value: a number holds still (it is a fact, it never drifts), a label is the index
    const target = ctx.el && ctx.el !== stage && ctx.el !== ctx.scene ? ctx.el : null, told = target ? target.textContent.trim() : "", isNum = /\d/.test(told);
    const LEFT = target && !isNum && told ? told : String(p.left), RIGHT = target && isNum ? told : String(p.right), hold = !!(target && isNum);
    // the values over time: the left index steps `left_steps` times; the right number drifts every `right_every` s
    const leftNum = parseInt(LEFT, 10), pad = LEFT.length;
    const lefts = [[at, LEFT]];
    const span = end - at - 0.6;
    if (Number.isFinite(leftNum)) for (let i = 1; i <= Math.round(p.left_steps); i++) lefts.push([at + (span * i) / (Math.round(p.left_steps) + 1), String(leftNum + i).padStart(pad, "0")]);
    const rightNum = parseFloat(RIGHT.replace(/[^\d.]/g, "")), rights = [[at, RIGHT]];
    if (!hold && Number.isFinite(rightNum) && p.right_every > 0) { let v = rightNum; for (let t = at + 0.6 + p.right_every, i = 0; t < end - 0.3; t += p.right_every, i++) { v = Math.max(1, Math.round(v + (ML.rnd(i, 17) * 7 - 2.5))); rights.push([t, String(v)]); } }
    const widest = (list) => list.map((x) => x[1]).sort((a, b) => b.length - a.length)[0];
    // left: the index and its progress line
    const left = document.createElement("div");
    left.style.cssText = `display:grid;gap:${8 * k}px;opacity:0.7`;
    const idx = swapper(40 * k, "var(--x-label-weight)", widest(lefts));
    const bar = document.createElement("div");
    bar.style.cssText = `position:relative;width:${84 * k}px;height:${Math.max(3, 3 * k)}px;background:color-mix(in srgb, var(--x-ink) 22%, transparent);border-radius:2px;overflow:hidden`;
    const fill = document.createElement("div");
    fill.style.cssText = `position:absolute;inset:0;background:var(--x-ink);transform-origin:${rtl ? "right" : "left"} center`;
    bar.append(fill); left.append(idx.box, bar);
    // right: heart, number, ECG
    const right = document.createElement("div");
    right.style.cssText = `display:flex;align-items:center;gap:${12 * k}px`;
    // heart and ECG are painted on canvases cleared every frame (a fully repainted picture is the same picture at the same t)
    const probe = document.createElement("i"); probe.style.cssText = "display:none;color:var(--x-bad)"; hud.append(probe);
    const BAD = getComputedStyle(probe).color; probe.remove();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const canvas = (w, h) => { const c = document.createElement("canvas"); c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); c.style.cssText = `width:${w}px;height:${h}px;display:block`; return c; };
    const HW = 42 * k, HH = 39 * k, heart = canvas(HW, HH), hg = heart.getContext("2d");
    const HEART = new Path2D("M12 21 C5 15.5 1 12 1 7.2 C1 3.8 3.6 1.3 6.8 1.3 C9 1.3 10.9 2.5 12 4.3 C13.1 2.5 15 1.3 17.2 1.3 C20.4 1.3 23 3.8 23 7.2 C23 12 19 15.5 12 21 Z");
    const val = swapper(42 * k, "var(--x-label-weight)", widest(rights));
    right.append(heart, val.box);
    const EW = 140 * k, EH = 44 * k, PAD = 5 * k;
    const ecg = p.sparkline ? canvas(EW + PAD * 2, EH) : null, eg = ecg && ecg.getContext("2d");
    if (ecg) right.append(ecg);
    hud.append(left, right);
    // one soft blip per change, at most one a beat
    let last = -9; [...lefts.slice(1), ...rights.slice(1)].map((x) => x[0]).sort((a, b) => a - b).forEach((t) => { if (t - last >= 0.8) { ctx.sfx(t, "blip", 0.15); last = t; } });
    const show = (sw, list, t) => {
      let i = 0; while (i + 1 < list.length && t >= list[i + 1][0]) i++;
      const u = i > 0 ? ML.out(t, list[i][0], list[i][0] + 0.15) : 1, h = sw.box.offsetHeight || 1;
      sw.b.textContent = list[i][1]; sw.a.textContent = i > 0 ? list[i - 1][1] : "";
      sw.b.style.transform = `translateY(${((1 - u) * h * 0.6).toFixed(2)}px)`; sw.b.style.opacity = u.toFixed(3);
      sw.a.style.transform = `translateY(${(-u * h * 0.6).toFixed(2)}px)`; sw.a.style.opacity = i > 0 ? (1 - u).toFixed(3) : "0";
      sw.a.style.visibility = i > 0 && u < 1 ? "visible" : "hidden";
    };
    // an ECG beat shape over one period (x 0–1 → y −1…1): flat, small P, sharp QRS, T bump
    const beat = (x) => x < 0.1 ? 0 : x < 0.18 ? 0.18 * Math.sin(((x - 0.1) / 0.08) * Math.PI) : x < 0.24 ? 0 : x < 0.27 ? -0.25 * ((x - 0.24) / 0.03) : x < 0.31 ? -0.25 + 1.25 * ((x - 0.27) / 0.04) : x < 0.35 ? 1 - 1.6 * ((x - 0.31) / 0.04) : x < 0.38 ? -0.6 + 0.6 * ((x - 0.35) / 0.03) : x < 0.5 ? 0 : x < 0.64 ? 0.3 * Math.sin(((x - 0.5) / 0.14) * Math.PI) : 0;
    const period = 60 / p.bpm;
    return {
      draw(t) {
        const vis = ML.out(t, at, at + 0.4) * (1 - ML.ease(t, end - 0.3, end));
        hud.style.visibility = t < at || vis <= 0.001 ? "hidden" : "visible";
        hud.style.opacity = vis.toFixed(4);
        hud.style.translate = `0 ${((1 - ML.out(t, at, at + 0.4)) * -10 * k).toFixed(2)}px`;
        if (t < at) return;
        show(idx, lefts, t); show(val, rights, t);
        fill.style.transform = `scaleX(${ML.lin(t, at, end).toFixed(4)})`;
        const ph = (((t - at) / period) % 1 + 1) % 1;
        // the beat swells the heart
        const hs = 1 + 0.12 * Math.exp(-Math.pow((ph - 0.31) / 0.06, 2));
        hg.reset(); hg.setTransform(dpr, 0, 0, dpr, 0, 0); hg.clearRect(0, 0, HW, HH);
        hg.translate(HW / 2, HH / 2); hg.scale((HW / 28) * hs, (HW / 28) * hs); hg.translate(-12, -11.2);
        hg.fillStyle = BAD; hg.fill(HEART);
        if (eg) {
          // the trace scrolls: x across the box maps to time; the newest sample sits at the reading end
          const n = 180, win = period * 2.2;
          eg.reset(); eg.setTransform(dpr, 0, 0, dpr, 0, 0); eg.clearRect(0, 0, EW + PAD * 2, EH);
          eg.strokeStyle = BAD; eg.fillStyle = BAD; eg.lineWidth = Math.max(1.5, 2 * k); eg.lineJoin = "round"; eg.lineCap = "round"; eg.globalAlpha = 0.9;
          eg.beginPath();
          let lx = 0, ly = 0;
          for (let i = 0; i <= n; i++) {
            const u = i / n, ts = t - at - win * (1 - u), y = EH / 2 - beat(((ts / period) % 1 + 1) % 1) * EH * 0.42;
            const x = PAD + (rtl ? EW * (1 - u) : EW * u);
            i ? eg.lineTo(x, y) : eg.moveTo(x, y); lx = x; ly = y;
          }
          eg.stroke(); eg.globalAlpha = 1;
          eg.beginPath(); eg.arc(lx, ly, 2.5 * k, 0, Math.PI * 2); eg.fill();
        }
      },
    };
  },
});
