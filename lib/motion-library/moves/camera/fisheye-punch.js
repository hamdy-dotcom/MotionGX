// Fisheye punch on impact: the finished frame bulges outward in a barrel distortion on the hit and relaxes back.
// The source's composite pass, exactly: p = uv − 0.5 with x scaled by the aspect (so p is in frame heights),
// r² = p·p, p ← p·(1 + k·r²·1.8)/(1 + 0.45k), k = k0·e^(−decay·τ) from the hit — the centre swells toward the lens.
// k0 = 0.42 for an ultimate hit, 0.14 for a lighter one; the demo runs it at 0.65 of those (felt, not thrown at the
// viewer), hence the 0.27 default. The warp is separable: the sample offset is p·(1.8r² − 0.45)·k/(1 + 0.45k), so the
// field (1.8r² − 0.45)·p is baked once into a displacement map and the per-frame strength is just the map's scale —
// an SVG feDisplacementMap over the whole scene (the DOM's stand-in for the fragment pass), closed form in t so it
// seeks. Pair it with impact-shake on the biggest beat; under reduced motion leave it out.
// Source: MengTo/Skills game-combat/lightning-energy-skill-vfx (assets/storm-energy.mjs composite shader, SKILL.md
// "Fisheye", demo/src/stage.js 0.65 scale) (MIT).
ML.define({
  id: "camera.fisheye-punch",
  category: "camera",
  name: "Fisheye punch on impact",
  does: "The image bulges outward in a barrel distortion on the hit and relaxes back.",
  says: ["energy", "arrival", "urgency", "celebration"],
  energy: 4,
  targets: ["scene", "stage"],
  duration: [0.4, 1.2],
  params: {
    strength: { type: "number", range: [0.1, 0.42], default: 0.27 },
    decay: { type: "number", range: [1.5, 3], default: 2.2, unit: "/s" },
  },
  pairs: ["camera.impact-shake", "accent.impact-burst", "transition.flash-cut"],
  avoid: ["calm", "luxury", "ambient", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "MengTo/Skills:game-combat/lightning-energy-skill-vfx", license: "MIT", note: "barrel law from the composite shader in assets/storm-energy.mjs; displacement-map form is our own" },
  async setup(ctx) {
    const { p, at, stage, f } = ctx;
    const host = ctx.scene || stage;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const W = f.W, H = f.H;
    // the finished frame: one wrapper around the scene's content (the ground stays on the stage behind it)
    const cam = doc.createElement("div");
    cam.className = "ml-cam";
    cam.style.cssText = "position:absolute;inset:0";
    while (host.firstChild) cam.append(host.firstChild);
    host.append(cam);

    // bake the field g(x, y) = (1.8r² − 0.45)·d (d = pixel offset from the centre, r = |d| / H) into R / G
    const MW = Math.round(W / 2), MH = Math.round(H / 2), sx = W / MW, sy = H / MH;
    let M = 1;
    for (const [x, y] of [[W / 2, H / 2], [W / 2, 0], [0, H / 2]]) { const r2 = (x * x + y * y) / (H * H); M = Math.max(M, Math.abs((1.8 * r2 - 0.45) * x), Math.abs((1.8 * r2 - 0.45) * y)); }
    // 8-bit map: the far corners (mostly ground) need offsets far larger than the content does, so the field is
    // soft-saturated past E = ½M (tanh: smooth, monotonic, no fold) to give the content finer steps
    const E = M > 360 ? M * 0.5 : M * 1.02;
    const enc = (v) => (M > 360 ? E * Math.tanh(v / E) : v);
    const cv = doc.createElement("canvas"); cv.width = MW; cv.height = MH;
    const g2 = cv.getContext("2d"), img = g2.createImageData(MW, MH), d = img.data;
    for (let j = 0; j < MH; j++) {
      const y = (j + 0.5) * sy - H / 2;
      for (let i = 0; i < MW; i++) {
        const x = (i + 0.5) * sx - W / 2, r2 = (x * x + y * y) / (H * H), q = 1.8 * r2 - 0.45, o = (j * MW + i) * 4;
        d[o] = Math.round(ML.clamp(0.5 + enc(q * x) / (2 * E)) * 255);
        d[o + 1] = Math.round(ML.clamp(0.5 + enc(q * y) / (2 * E)) * 255);
        d[o + 2] = 128; d[o + 3] = 255;
      }
    }
    g2.putImageData(img, 0, 0);
    const url = cv.toDataURL("image/png");
    await new Promise((res) => { const im = new Image(); im.onload = im.onerror = () => res(); im.src = url; });

    const id = "ml-fisheye-" + Math.round(ML.rnd(at * 13.7, 5) * 1e9).toString(36);
    const svg = doc.createElementNS(NS, "svg");
    svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
    svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
    const filt = doc.createElementNS(NS, "filter");
    const set = (e, a) => { for (const [k, v] of Object.entries(a)) e.setAttribute(k, String(v)); return e; };
    set(filt, { id, x: 0, y: 0, width: W, height: H, filterUnits: "userSpaceOnUse", primitiveUnits: "userSpaceOnUse", "color-interpolation-filters": "sRGB" });
    const fi = set(doc.createElementNS(NS, "feImage"), { x: 0, y: 0, width: W, height: H, preserveAspectRatio: "none", result: "map" });
    fi.setAttribute("href", url); fi.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", url);
    const disp = set(doc.createElementNS(NS, "feDisplacementMap"), { in: "SourceGraphic", in2: "map", scale: 0, xChannelSelector: "R", yChannelSelector: "G" });
    filt.append(fi, disp); svg.append(filt); host.append(svg);

    const k0 = ML.clamp(p.strength, 0.1, 0.42), decay = ML.clamp(p.decay, 1.5, 3);
    const LIFE = Math.log((k0 * 2 * E) / 0.4) / decay; // until the largest offset is under half a pixel
    ctx.sfx(at, k0 > 0.3 ? "sub" : "hit", 0.3 + k0);
    return {
      draw(t) {
        const tau = t - at;
        if (tau < 0 || tau > LIFE) { cam.style.filter = "none"; return; }
        const k = k0 * Math.exp(-decay * tau), kk = k / (1 + 0.45 * k);
        // feDisplacementMap samples P(x + scale·(R − 0.5)): R − 0.5 = g / 2E, so scale = 2E·kk gives offset g·kk
        disp.setAttribute("scale", (2 * E * kk).toFixed(3));
        cam.style.filter = `url(#${id})`;
      },
    };
  },
});
