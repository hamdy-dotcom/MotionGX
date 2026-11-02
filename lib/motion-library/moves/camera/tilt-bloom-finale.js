// Tilt-bloom finale: the last beat. The device (the target screen, or our own status card) tilts back in 3D — rotateX
// to `angle` over `duration` on power3.inOut — until its edge reads as a bright horizontal line, while its status
// colours (the look's good / accent / bad) bloom behind it into a wide glow: the glow layers scale up to `glow_scale`
// with a screen blend, and a thin horizontal light line crosses the frame along the device's edge (from the reading
// side; RTL from the right). The labels on the device are counter-rotated to face the camera, so they stand up off the
// tilted surface and stay readable. Sharp: the device is pushed back by its own forward reach (h/2·sin θ), so no part
// of it is ever nearer than the screen plane (never scaled above 1 under 3D); the glow is a 2D layer.
// Source: prompt-motion (jazzen-chen "someone on reddit asked"), reference only: rebuilt as our own code.
ML.define({
  id: "camera.tilt-bloom-finale",
  category: "camera",
  name: "Camera tilts to edge-on with colour bloom",
  does: "Final beat: the view tilts until the device edge becomes a bright horizontal line while its status colours bloom into a wide glow, labels still readable.",
  says: ["result", "tech", "celebration"],
  energy: 4,
  targets: ["screen", "stage"],
  duration: [0.6, 2],
  params: {
    angle: { type: "number", range: [50, 80], default: 70, unit: "deg" },
    duration: { type: "number", range: [0.4, 1], default: 0.6, unit: "s" },
    glow_scale: { type: "number", range: [1.5, 3], default: 2, unit: "x" },
  },
  pairs: ["camera.push-in", "text-in.punchline"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "prompt-motion:jazzen-chen-someone-on-reddit-asked", license: "reference", note: "rebuilt as our own code: rotateX power3.inOut, screen-blend glow scale-up, light line, counter-rotated labels" },
  setup(ctx) {
    const { el, p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, u = Math.min(W, H) / 1080;
    const angle = ML.clamp(p.angle, 50, 80), dur = ML.clamp(p.duration, 0.4, 1), gs = ML.clamp(p.glow_scale, 1.5, 3);
    const STATUS = ["var(--x-good)", "var(--x-accent)", "var(--x-bad)"];
    let dev, labels = [], colors = STATUS;
    if (el && el !== stage && el !== host) {
      dev = el;
      labels = [...el.querySelectorAll(".ml-label, [data-label], label")].slice(0, 8);
    } else {
      // our own device: a status card with three rows (dot, label, bar) in the look's status colours
      const pic = f.pic, dw = Math.min(pic.w * 0.82, 760 * u), dh = Math.min(pic.h * 0.86, dw * 0.78);
      dev = document.createElement("div");
      dev.className = "ml-panel";
      dev.style.cssText = `position:absolute;left:${pic.x + (pic.w - dw) / 2}px;top:${pic.y + (pic.h - dh) / 2}px;width:${dw}px;height:${dh}px;z-index:4;box-sizing:border-box;padding:${Math.round(dh * 0.09)}px;display:flex;flex-direction:column;justify-content:space-between;background:var(--x-device);border-color:color-mix(in srgb, var(--x-accent-ink) 18%, transparent)`;
      const names = ctx.rtl ? ["جاهز", "قيد التنفيذ", "متوقف"] : ["Ready", "Running", "Blocked"];
      const values = [92, 64, 18];
      names.forEach((name, i) => {
        const row = document.createElement("div");
        row.style.cssText = `display:flex;align-items:center;gap:${Math.round(dh * 0.05)}px;height:${Math.round(dh * 0.2)}px`;
        const dot = document.createElement("div");
        dot.style.cssText = `flex:0 0 auto;width:${Math.round(dh * 0.07)}px;height:${Math.round(dh * 0.07)}px;border-radius:50%;background:${STATUS[i]};box-shadow:0 0 ${Math.round(dh * 0.06)}px ${STATUS[i]}`;
        const lab = document.createElement("div");
        lab.className = "ml-label";
        lab.textContent = name;
        lab.style.cssText = `flex:0 0 auto;min-width:${Math.round(dw * 0.3)}px;font-size:${Math.round(dh * 0.075)}px;color:var(--x-accent-ink);transform-origin:50% 100%`;
        const bar = document.createElement("div");
        bar.style.cssText = `flex:1;height:${Math.round(dh * 0.05)}px;border-radius:var(--x-radius-s);background:color-mix(in srgb, var(--x-accent-ink) 14%, transparent);overflow:hidden`;
        const fill = document.createElement("div");
        fill.style.cssText = `height:100%;width:${values[i]}%;background:${STATUS[i]};border-radius:inherit;${ctx.rtl ? "margin-left:auto" : ""}`;
        bar.append(fill);
        row.append(dot, lab, bar);
        dev.append(row);
        labels.push(lab);
      });
      host.append(dev);
    }
    const b = ctx.box(dev);
    labels.forEach((l) => { if (getComputedStyle(l).display === "inline") l.style.display = "inline-block"; l.style.transformOrigin = "50% 100%"; });
    // the ground's lightness decides the blend: screen on a dark ground; on a light one screen would vanish, so the
    // bloom lays its colour normally and the light line takes the accent for its core
    const probe = document.createElement("span");
    probe.style.color = "var(--x-ground)";
    host.append(probe);
    const rgb = (getComputedStyle(probe).color.match(/[\d.]+/g) || [0, 0, 0]).map(Number);
    probe.remove();
    const dark = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] < 128;
    const core = dark ? "color-mix(in srgb, var(--x-accent-ink) 85%, var(--x-accent-2))" : "color-mix(in srgb, var(--x-accent) 80%, var(--x-panel))";
    // the bloom: one soft blob per status colour, behind the device, 2D, screen-blended
    const glow = document.createElement("div");
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    glow.style.cssText = `position:absolute;left:${cx - b.w / 2}px;top:${cy - b.h * 0.35}px;width:${b.w}px;height:${b.h * 0.7}px;pointer-events:none;z-index:3;mix-blend-mode:${dark ? "screen" : "normal"};transform-origin:50% 50%`;
    colors.forEach((c, i) => {
      const blob = document.createElement("div");
      const x = (i - 1) * 0.3;
      blob.style.cssText = `position:absolute;left:${(20 + x * 100).toFixed(1)}%;top:10%;width:60%;height:80%;border-radius:50%;background:radial-gradient(closest-side, ${c}, transparent);opacity:0.85`;
      glow.append(blob);
    });
    host.insertBefore(glow, dev.parentElement === host ? dev : host.firstChild);
    if (dev.parentElement !== host) glow.style.zIndex = "0";
    // the light line: the device edge, carried across the frame
    const line = document.createElement("div");
    const lh = Math.max(3, Math.round(5 * u));
    line.style.cssText = `position:absolute;left:0;top:${cy - lh / 2}px;width:${W}px;height:${lh}px;pointer-events:none;z-index:5;border-radius:${lh}px;background:linear-gradient(90deg, transparent, var(--x-accent-2) 18%, ${core} 50%, var(--x-accent-2) 82%, transparent);box-shadow:0 0 ${Math.round(18 * u)}px var(--x-accent-2), 0 0 ${Math.round(48 * u)}px var(--x-accent)`;
    host.append(line);
    const P = Math.round(1400 * Math.max(W, H) / 1440);
    const p3 = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const tiltAt = Math.min(at + 0.2, Math.max(at, end - dur - 0.2));
    ctx.sfx(tiltAt, "swell", 0.5);
    const baseShadow = dev.style.boxShadow;
    // the nodes between the device and its labels: they keep the 3D space while it tilts
    const chain = new Set();
    labels.forEach((l) => { let n = l.parentElement; while (n && n !== dev) { chain.add(n); n = n.parentElement; } });
    return {
      draw(t) {
        const k = p3(ML.lin(t, tiltAt, tiltAt + dur));
        const a = angle * k, rad = (a * Math.PI) / 180;
        // pushed back by its forward reach so its near edge never comes closer than the screen plane
        const back = (b.h / 2) * Math.sin(rad);
        dev.style.transformOrigin = "50% 50%";
        dev.style.transform = k > 0 ? `perspective(${P}px) translateZ(${(-back).toFixed(2)}px) rotateX(${a.toFixed(3)}deg)` : "none";
        dev.style.boxShadow = k > 0 ? `0 0 0 ${(1 + k * 2).toFixed(2)}px color-mix(in srgb, ${core} ${(k * 80).toFixed(1)}%, transparent), 0 0 ${(k * 60 * u).toFixed(1)}px color-mix(in srgb, var(--x-accent-2) ${(k * 90).toFixed(1)}%, transparent)` : baseShadow;
        // labels counter-rotate about their own base: they stand up and face the camera
        labels.forEach((l) => { l.style.transform = k > 0 ? `rotateX(${(-a).toFixed(3)}deg)` : "none"; });
        const ts = k > 0 ? "preserve-3d" : "";
        dev.style.transformStyle = ts;
        for (const n of chain) n.style.transformStyle = ts;
        // bloom: scale up to glow_scale (2D), stronger as the device goes edge-on
        const g = ML.lin(t, tiltAt + dur * 0.2, tiltAt + dur * 1.3), ge = 1 - Math.pow(1 - g, 3);
        glow.style.opacity = ((0.15 + 0.85 * ge) * (dark ? 1 : 0.75)).toFixed(4);
        glow.style.transform = `scale(${(1 + (gs - 1) * ge).toFixed(4)}, ${(1 + (gs * 0.6 - 0.6) * ge).toFixed(4)})`;
        // the light line crosses from the reading side, then rests as the device's bright edge
        const lx = ML.out(t, tiltAt + dur * 0.55, tiltAt + dur * 1.35);
        const ins = (1 - lx) * 100;
        line.style.clipPath = ctx.rtl ? `inset(0 0 0 ${ins.toFixed(2)}%)` : `inset(0 ${ins.toFixed(2)}% 0 0)`;
        line.style.opacity = lx > 0 ? (0.6 + 0.4 * ML.pulse(t, tiltAt + dur, 0.2, 0.8)).toFixed(4) : "0";
      },
    };
  },
});
