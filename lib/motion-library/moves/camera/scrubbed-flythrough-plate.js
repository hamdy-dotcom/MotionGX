// Scrubbed fly-through plate: one continuous camera move through a world, full-bleed behind the story, advancing exactly
// with it. From MengTo/Skills scroll-world-storytelling's video demo: layers (1) the plate, object-fit cover, filter
// saturate(0.92) contrast(1.08); (2) a legibility scrim; (3) a grain tile at 5.5%. The clip time is linear in progress,
// clipTime = p·(duration − 0.04), p = (t − start) / (end − start), so the camera only eases if the clip does; chapters
// are equal slices of p (index = floor(p·N)), exposed as data-chapter on the scene (and an optional 01 / 0N counter).
// When the target is a <video> (a pre-decoded / small-GOP plate) it is seeked to the clip time every frame — never
// played in real time. Otherwise the plate is our own world, painted per frame from t on a canvas: a seeded field of
// towers on a gridded ground under a horizon glow, in the look's colours, flown through at constant velocity — a
// forward dolly, a lateral track that turns into a forward one, or a slow orbit round a central monument. Enters
// already moving; reverse plays it as a rewind. One connected place for the whole video (span whole-video: p runs on
// the film's clock, so every scene that shows the plate continues the same shot).
// Source: MengTo/Skills web-design/scroll-world-storytelling demo/video/index.html (MIT): layers, scrub law, chapters.
ML.define({
  id: "camera.scrubbed-flythrough-plate",
  category: "camera",
  name: "Scrubbed fly-through plate",
  does: "A single continuous camera move through a world plays as the full-bleed backdrop, advancing exactly with the story so each chapter lands on its own stretch of the shot.",
  says: ["story", "flow", "arrival", "ambient"],
  energy: 2,
  targets: ["scene", "stage"],
  duration: [4, 60],
  params: {
    move: { type: "choice", options: ["forward-dolly", "lateral-to-forward", "slow-orbit"], default: "forward-dolly" },
    span: { type: "choice", options: ["whole-video", "one-scene"], default: "whole-video" },
    direction: { type: "choice", options: ["forward", "reverse"], default: "forward" },
    saturate: { type: "number", range: [0.9, 1], default: 0.92 },
    contrast: { type: "number", range: [1, 1.1], default: 1.08 },
    chapters: { type: "number", range: [0, 8], default: 0 },
  },
  pairs: ["text-in.chapter-swap", "text-in.soft-rise", "background.film-grain"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:web-design/scroll-world-storytelling", license: "MIT", note: "demo/video/index.html: plate layers, clipTime = p·(duration − 0.04), chapters as equal slices; the painted world is our own" },
  setup(ctx) {
    const { el, p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H;
    const video = el && el.tagName === "VIDEO" ? el : host.querySelector("video[data-plate]");
    const plate = document.createElement("div");
    plate.style.cssText = `position:absolute;inset:0;overflow:hidden;pointer-events:none;filter:saturate(${ML.clamp(p.saturate, 0.9, 1)}) contrast(${ML.clamp(p.contrast, 1, 1.1)})`;
    host.insertBefore(plate, host.firstChild);
    let cv = null, g = null;
    if (video) {
      plate.append(video);
      video.muted = true;
      video.pause();
      video.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center";
    } else {
      cv = document.createElement("canvas");
      cv.width = W; cv.height = H;
      cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
      plate.append(cv);
      g = cv.getContext("2d");
    }
    // the scrim: text over the plate stays legible (top band for the headline, bottom for captions)
    const scrim = document.createElement("div");
    scrim.style.cssText = "position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg, color-mix(in srgb, var(--x-ground) 78%, transparent) 0%, color-mix(in srgb, var(--x-ground) 30%, transparent) 30%, transparent 52%), linear-gradient(0deg, color-mix(in srgb, var(--x-ground) 60%, transparent), transparent 30%)";
    // grain: one seeded tile, its offset re-rolled each frame from the frame index
    const T = 192, tile = document.createElement("canvas");
    tile.width = T; tile.height = T;
    const tg = tile.getContext("2d"), id = tg.createImageData(T, T);
    for (let i = 0; i < T * T; i++) { const v = Math.round(ML.rnd(i, 17) * 255); id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
    tg.putImageData(id, 0, 0);
    const grain = document.createElement("div");
    grain.style.cssText = `position:absolute;inset:0;pointer-events:none;opacity:0.055;mix-blend-mode:overlay;background-image:url(${tile.toDataURL()});background-size:${T}px ${T}px`;
    plate.after(scrim);
    scrim.after(grain);
    const N = Math.round(ML.clamp(p.chapters, 0, 8));
    let counter = null;
    if (N > 0) {
      counter = document.createElement("div");
      counter.className = "ml-label";
      counter.style.cssText = `position:absolute;${ctx.rtl ? "left" : "right"}:${f.m}px;top:${f.safe.y + f.safe.h - 40}px;z-index:4;font-variant-numeric:tabular-nums;color:var(--x-ink)`;
      host.append(counter);
    }

    // the look's colours, resolved once for the canvas
    const probe = document.createElement("span");
    host.append(probe);
    const col = (v) => { probe.style.color = `var(${v})`; return getComputedStyle(probe).color; };
    const clear = (c) => c.replace(/^rgba?\(([^,]+),([^,]+),([^,)]+).*$/, "rgba($1,$2,$3,0)"); // the same colour, transparent (a canvas gradient to "transparent" fades through black)
    const C = { ground: col("--x-ground"), ink: col("--x-ink"), accent: col("--x-accent"), accent2: col("--x-accent-2"), panel: col("--x-panel"), panel2: col("--x-panel-2"), line: col("--x-line") };
    probe.remove();

    // the world: a seeded field of towers, kept clear of the camera's path
    const L = 220; // world units travelled over the whole shot
    const SIDE = ctx.rtl ? -1 : 1; // a sideways move follows the reading direction
    const camAt = (q) => {
      if (p.move === "slow-orbit") { const a = -0.65 + q * 1.3, R = 34; return { x: SIDE * Math.sin(a) * R, z: 120 - Math.cos(a) * R, yaw: SIDE * a, h: 7 }; }
      if (p.move === "lateral-to-forward") {
        const k = 0.6, ph = (Math.PI / 2) * Math.min(1, q / k), r = (k * L) / (Math.PI / 2);
        const x = r * Math.sin(ph), z = r * (1 - Math.cos(ph)) + Math.max(0, q - k) * L;
        return { x: SIDE * (x - 60), z, yaw: 0, h: 4.2 };
      }
      return { x: 0, z: q * L, yaw: 0, h: 4.2 };
    };
    const path = Array.from({ length: 80 }, (_, i) => camAt(i / 79));
    const towers = [];
    for (let i = 0; towers.length < 170 && i < 900; i++) {
      const x = -110 + ML.rnd(i, 1) * 220, z = -20 + ML.rnd(i, 2) * (L + 120);
      if (p.move === "slow-orbit" && Math.hypot(x, z - 120) < 6) continue;
      if (path.some((c) => Math.hypot(c.x - x, c.z - z) < 5.5)) continue;
      const big = ML.rnd(i, 5) < 0.12;
      towers.push({ x, z, w: 1.6 + ML.rnd(i, 3) * 3.2, h: (big ? 14 : 3) + ML.rnd(i, 4) * (big ? 16 : 9), lit: ML.rnd(i, 6) < 0.35, c: ML.rnd(i, 7) < 0.15 ? 1 : 0 });
    }
    if (p.move === "slow-orbit") for (let j = 0; j < 5; j++) towers.push({ x: Math.cos(j * 1.26) * 2.4, z: 120 + Math.sin(j * 1.26) * 2.4, w: 2.2, h: 22 + j * 4, lit: true, c: 1 });

    const dur = () => (p.span === "whole-video" && window.__duration ? window.__duration : 0);
    const FL = Math.min(W, H) * 0.95, HZ = H * 0.5;
    const paint = (q) => {
      const cam = camAt(q), cs = Math.cos(cam.yaw), sn = Math.sin(cam.yaw);
      const toCam = (X, Y, Z) => { const dx = X - cam.x, dz = Z - cam.z; return { x: dx * cs + dz * sn, y: Y - cam.h, z: dz * cs - dx * sn }; };
      const proj = (v) => ({ x: W / 2 + (FL * v.x) / v.z, y: HZ - (FL * v.y) / v.z });
      const FAR = 160;
      // sky and ground
      let gr = g.createLinearGradient(0, 0, 0, HZ);
      gr.addColorStop(0, C.ground); gr.addColorStop(1, C.panel2);
      g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(0, 0, W, HZ + 1);
      gr = g.createLinearGradient(0, HZ, 0, H);
      gr.addColorStop(0, C.panel2); gr.addColorStop(1, C.ground);
      g.fillStyle = gr; g.fillRect(0, HZ, W, H - HZ);
      const glow = g.createRadialGradient(W / 2, HZ, 0, W / 2, HZ, Math.max(W, H) * 0.55);
      glow.addColorStop(0, C.accent); glow.addColorStop(1, clear(C.accent));
      g.globalAlpha = 0.3; g.fillStyle = glow; g.fillRect(0, 0, W, H);
      // the ground grid, clipped in front of the camera
      g.strokeStyle = C.ink; g.lineWidth = 1.5;
      const seg = (a, b) => {
        let A = toCam(a[0], 0, a[1]), B = toCam(b[0], 0, b[1]);
        if (A.z < 0.6 && B.z < 0.6) return;
        if (A.z < 0.6) { const k = (0.6 - A.z) / (B.z - A.z); A = { x: A.x + (B.x - A.x) * k, y: A.y, z: 0.6 }; }
        if (B.z < 0.6) { const k = (0.6 - B.z) / (A.z - B.z); B = { x: B.x + (A.x - B.x) * k, y: B.y, z: 0.6 }; }
        const pa = proj(A), pb = proj(B);
        g.globalAlpha = 0.22 * (1 - ML.clamp(Math.min(A.z, B.z) / FAR));
        g.beginPath(); g.moveTo(pa.x, pa.y); g.lineTo(pb.x, pb.y); g.stroke();
      };
      const S = 6, gx0 = Math.floor((cam.x - FAR) / S) * S, gz0 = Math.floor((cam.z - FAR) / S) * S;
      for (let x = gx0; x <= cam.x + FAR; x += S) seg([x, cam.z - FAR], [x, cam.z + FAR]);
      for (let z = gz0; z <= cam.z + FAR; z += S) seg([cam.x - FAR, z], [cam.x + FAR, z]);
      // towers, far to near, fogged into the ground colour
      const vis = [];
      for (const tw of towers) { const v = toCam(tw.x, 0, tw.z); if (v.z > 0.8 && v.z < FAR && Math.abs(v.x) < v.z * (W / FL) * 0.7 + tw.w) vis.push({ tw, v }); }
      vis.sort((a, b) => b.v.z - a.v.z);
      for (const { tw, v } of vis) {
        const base = proj(v), top = proj({ x: v.x, y: tw.h, z: v.z });
        const hw = (FL * tw.w) / v.z / 2, fog = 0.88 * ML.clamp(v.z / FAR) ** 0.75;
        const x0 = base.x - hw, y0 = top.y, hgt = base.y - top.y;
        // the body: the panel colour shaded toward the ink, a darker side away from the glow, a lit window strip
        g.globalAlpha = 1;
        g.fillStyle = tw.c ? C.accent : C.panel;
        g.fillRect(x0, y0, hw * 2, hgt);
        g.fillStyle = C.ink;
        g.globalAlpha = tw.c ? 0.1 : 0.16; g.fillRect(x0, y0, hw * 2, hgt);
        g.globalAlpha = 0.14; g.fillRect(x0 + (v.x > 0 ? 0 : hw * 1.25), y0, hw * 0.75, hgt);
        g.globalAlpha = 0.5; g.fillRect(x0, y0, hw * 2, Math.max(1, hgt * 0.012));
        if (tw.lit) { g.fillStyle = tw.c ? C.panel : C.accent; g.globalAlpha = 0.95; g.fillRect(x0 + hw * 0.4, y0 + hgt * 0.12, hw * 0.35, Math.max(1.5, hgt * 0.05)); }
        // fog into the ground colour with distance
        g.fillStyle = C.ground; g.globalAlpha = fog; g.fillRect(x0 - 1, y0 - 1, hw * 2 + 2, hgt + 2);
      }
      g.globalAlpha = 1;
    };
    const inst = {
      draw(t) {
        const D = dur();
        let q = D > 0 ? ML.clamp(t / D) : ML.lin(t, at, end);
        if (p.direction === "reverse") q = 1 - q;
        if (video) {
          const vd = Number.isFinite(video.duration) ? video.duration : 0;
          const ct = q * Math.max(0.01, vd - 0.04);
          if (vd && Math.abs(video.currentTime - ct) > 0.015) video.currentTime = ct;
        } else paint(q);
        const fi = Math.floor(t * 24);
        grain.style.backgroundPosition = `${Math.round(ML.rnd(fi, 3) * T)}px ${Math.round(ML.rnd(fi, 5) * T)}px`;
        const pf = p.direction === "reverse" ? 1 - q : q;
        if (N > 0) {
          const idx = Math.min(N - 1, Math.floor(pf * N));
          host.dataset.chapter = String(idx);
          counter.textContent = `${String(idx + 1).padStart(2, "0")} / ${String(N).padStart(2, "0")}`;
        }
      },
    };
    // the clip's length is needed for the scrub law from the first frame: the film waits for it (the kit awaits setup)
    if (video && video.readyState < 1) return Promise.race([new Promise((r) => video.addEventListener("loadedmetadata", r, { once: true })), new Promise((r) => setTimeout(r, 8000))]).then(() => inst);
    return inst;
  },
});
