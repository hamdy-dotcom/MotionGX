// Wire-led scan reveal: one survey wave conducts two representations of the subject. From an origin outside its
// silhouette the front travels on radius = (1 - (1 - e)^1.35) * maxR. At the front a glowing wire cage appears
// (rim = exp(-((d - R) / w)^2), trail = smoothstep(R, R - trail, d), alpha = (rim * 1.6 + trail * 0.34) * wire, capped at
// .82, wire = min(1, e / .06) * (1 - smoothstep(.72, 1, e))); the real surface fills in behind it (distance > R - lag +
// the two long sines is cut away) and at e = 1 the cage is gone and the cut removed. A perfect circle reads as a
// clip-path and high-frequency noise sparkles: both sines stay.
//   2d: the cage is the subject's own skeleton (box outlines of its blocks and text lines, an edge-detected line
//       render of a picture, a triangulated relief mesh) painted once and revealed per frame by a radial gradient
//       sampled from the formula; the surface is the real target under a polygon clip on the wobbled circle.
//   3d: the same conductor on a WebGL relief mesh in world space. A picture's surface is the mesh, textured, and
//       flattens onto the real picture as the cage burns away; other targets keep their real surface under the clip.
// Colour from the look (the accent, paled). The origin mirrors in Arabic.
// Source: MengTo/Skills build-wireframe-scan-reveal (MIT): the shaders, the conductor and its constants.
ML.define({
  id: "mask.wire-led-scan",
  category: "mask",
  name: "Wire-led scan reveal",
  does: "A survey wave sweeps out from a corner: a glowing wireframe of the subject appears at the wavefront, the real surface fills in just behind it, and the wire burns away.",
  says: ["tech", "reveal", "precision", "scale", "before-after"],
  energy: 3,
  targets: ["image", "screen", "chart", "logo", "shape", "stage"],
  duration: [2, 4.5],
  params: {
    mode: { type: "choice", options: ["2d", "3d"], default: "2d" },
    origin: { type: "choice", options: ["low-left", "low-right", "top"], default: "low-left" },
    duration: { type: "number", range: [2, 4.5], default: 3.4, unit: "s" },
    lag: { type: "number", range: [10, 25], default: 15, unit: "%" },
    colour: { type: "text", default: "accent pale" },
    density: { type: "number", range: [0.5, 2], default: 1 },
    seed: { type: "number", range: [0, 9999], default: 5 },
  },
  pairs: ["mask.scanner-recolor-pass", "data.count-up"],
  avoid: ["calm", "playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "riser",
  source: { from: "MengTo/Skills:agent-skills/web-design/build-wireframe-scan-reveal", license: "MIT", note: "conductor, rim / trail / wire formulas and the wobble ported; the 2D skeleton mode is ours, on the same conductor; raw WebGL instead of Three.js" },
  setup(ctx) {
    const { p, at, end, stage } = ctx;
    let el = ctx.el;
    if (!el) return null;
    if (el === stage && ctx.scene) el = ctx.scene;
    const whole = el === ctx.scene || el === stage;
    const host = whole ? stage : ctx.scene || stage;
    const b = ctx.box(el), W = b.w, H = b.h;
    if (!(W > 1 && H > 1)) return null;
    const diag = Math.hypot(W, H), k = diag / 1698, seed = Math.round(+p.seed || 0);
    const dur = Math.min(ML.clamp(+p.duration, 2, 4.5), Math.max(1.2, end - at - 0.05));
    const lagShare = ML.clamp(+p.lag, 10, 25) / 100;
    const smooth = (a, c, x) => { const u = ML.clamp((x - a) / (c - a)); return u * u * (3 - 2 * u); };

    // the origin, in the target's px: outside the silhouette, low and to one side (a centred origin reads as a loader)
    let which = p.origin;
    if (ctx.rtl && which !== "top") which = which === "low-left" ? "low-right" : "low-left";
    const out = 110 * k, low = 70 * k;
    const O = which === "top" ? { x: W / 2, y: -out } : which === "low-right" ? { x: W + out, y: H - low } : { x: -out, y: H - low };
    const far = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => Math.hypot(x - O.x, y - O.y)));

    // the colour, resolved inside the target's look
    const named = String(p.colour || "").trim();
    const colourVar = !named || named === "accent pale" ? "color-mix(in srgb, var(--x-accent) 72%, var(--x-accent-2))" : named === "accent" ? "var(--x-accent)" : named === "accent-2" ? "var(--x-accent-2)" : /^var\(--x-/.test(named) ? named : "color-mix(in srgb, var(--x-accent) 72%, var(--x-accent-2))";
    const probe = document.createElement("span");
    probe.style.cssText = `display:none;color:${colourVar}`;
    host.append(probe);
    const wireCss = getComputedStyle(probe).color;
    probe.remove();

    // the picture, if the target is one (or a whole picture inside), cropped exactly as it sits (object-fit: cover)
    const pic = el instanceof HTMLImageElement ? el : null;
    function raster(w, h) {
      if (!pic || !pic.naturalWidth) return null;
      const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
      const g = c.getContext("2d", { willReadFrequently: true }), nw = pic.naturalWidth, nh = pic.naturalHeight;
      const fit = getComputedStyle(pic).objectFit;
      if (fit === "cover") { const s = Math.max(W / nw, H / nh), sw = W / s, sh = H / s; g.drawImage(pic, (nw - sw) / 2, (nh - sh) / 2, sw, sh, 0, 0, c.width, c.height); }
      else if (fit === "contain") { const s = Math.min(W / nw, H / nh), dw = (nw * s * c.width) / W, dh = (nh * s * c.height) / H; g.drawImage(pic, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh); }
      else g.drawImage(pic, 0, 0, c.width, c.height);
      try { return { canvas: c, data: g.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height }; } catch { return null; } // a foreign picture: no reading it
    }
    const small = Math.min(1, 960 / Math.max(W, H)), shot = raster(W * small, H * small);
    const lumaAt = (x, y) => { // 0–1 at target px, x and y inside the target
      if (!shot) return 0.5;
      const i = Math.min(shot.w - 1, Math.max(0, Math.round((x / W) * (shot.w - 1)))), j = Math.min(shot.h - 1, Math.max(0, Math.round((y / H) * (shot.h - 1)))), o = (j * shot.w + i) * 4, d = shot.data;
      return ((0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2]) * (d[o + 3] / 255)) / 255;
    };

    // ── the mesh both modes share: jittered grid, triangulated (what WireframeGeometry gives the source) ──
    const cell = ML.clamp((diag / 34) / ML.clamp(+p.density, 0.5, 2), 12, 90);
    const nx = Math.max(2, Math.round(W / cell)), ny = Math.max(2, Math.round(H / cell)), dx = W / nx, dy = H / ny;
    // a long seeded swell, so a target without a picture still has a form
    const swell = (x, y) => 0.5 + 0.28 * Math.sin((x / W) * 5.2 + ML.rnd(seed, 3) * 6.28) * Math.cos((y / H) * 4.1 + ML.rnd(seed, 7) * 6.28) + 0.16 * Math.sin((x / W + y / H) * 9 + ML.rnd(seed, 11) * 6.28);
    const height = (x, y) => (shot ? lumaAt(x, y) : swell(x, y));
    const verts = [];
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
      const edgeI = i === 0 || i === nx, edgeJ = j === 0 || j === ny;
      const x = i * dx + (edgeI ? 0 : (ML.rnd(i * 7 + j * 131, seed + 1) - 0.5) * dx * 0.42), y = j * dy + (edgeJ ? 0 : (ML.rnd(i * 13 + j * 197, seed + 2) - 0.5) * dy * 0.42);
      verts.push({ x, y, h: ML.clamp(height(x, y)) });
    }
    const vid = (i, j) => j * (nx + 1) + i;
    const quads = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) quads.push([vid(i, j), vid(i + 1, j), vid(i + 1, j + 1), vid(i, j + 1), (i + j) % 2]);

    // the canvas over the target: a little larger in 3D, where the relief may step past its box
    const wrapPad = p.mode === "3d" && !whole ? Math.round(diag * 0.06) : 0;
    const cv = document.createElement("canvas");
    cv.width = Math.ceil(W + wrapPad * 2); cv.height = Math.ceil(H + wrapPad * 2);
    cv.setAttribute("aria-hidden", "true");
    cv.style.cssText = `position:absolute;left:${b.x - wrapPad}px;top:${b.y - wrapPad}px;width:${cv.width}px;height:${cv.height}px;pointer-events:none;z-index:6`;
    host.append(cv);

    // one conductor
    const conductor = (t, maxR) => {
      const e = ML.clamp((t - at) / dur);
      return { e, R: (1 - Math.pow(1 - e, 1.35)) * maxR, wire: Math.min(1, e / 0.06) * (1 - smooth(0.72, 1, e)) };
    };
    // the real surface under a polygon on the wobbled circle (the two long sines, ~1.5% and .7% of the diagonal)
    const wobble = (x, y) => Math.sin(y * (0.011 / k) + x * (0.007 / k)) * diag * 0.015 + Math.sin(y * (0.013 / k) + x * (0.021 / k)) * diag * 0.007;
    const clipSolid = (radius) => {
      if (radius <= 0) { el.style.clipPath = "polygon(0 0, 0 0, 0 0)"; return; }
      const pts = [];
      for (let i = 0; i < 180; i++) {
        const a = (i / 180) * 6.28319, c = Math.cos(a), s = Math.sin(a), x0 = O.x + c * radius, y0 = O.y + s * radius, r = Math.max(0, radius + wobble(x0, y0));
        pts.push(`${(O.x + c * r).toFixed(1)}px ${(O.y + s * r).toFixed(1)}px`);
      }
      el.style.clipPath = `polygon(${pts.join(",")})`;
    };

    ctx.sfx(at, "riser", 0.32);
    ctx.sfx(at + dur * 0.8, "land.light", 0.2);

    // ── 3D: raw WebGL, the source's shaders in target px ──
    const gl = p.mode === "3d" ? cv.getContext("webgl", { preserveDrawingBuffer: true, antialias: true, alpha: true, premultipliedAlpha: true }) : null;
    if (gl) {
      const compile = (vs, fs) => {
        const pr = gl.createProgram();
        for (const [ty, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) { const s = gl.createShader(ty); gl.shaderSource(s, src); gl.compileShader(s); gl.attachShader(pr, s); }
        gl.linkProgram(pr);
        return pr;
      };
      const VS = `attribute vec3 aP; uniform vec2 uBox; uniform vec2 uView; uniform float uFlat; uniform float uRelief; uniform float uDist; varying vec3 vWorld; varying vec2 vUv;
        void main(){ vec2 c = aP.xy - uBox/2.0; float z = -aP.z*uRelief*uFlat; float a = .20*uFlat, ca = cos(a), sa = sin(a);
          vec3 w = vec3(c.x*ca + z*sa, c.y*(1.0 - .04*uFlat), -c.x*sa*0.55 + z*ca - abs(sa)*length(uBox)*.12);
          vWorld = w; vUv = aP.xy/uBox; float s = uDist/(uDist - w.z);
          gl_Position = vec4(w.x*s/(uView.x/2.0), -w.y*s/(uView.y/2.0), w.z/(uDist*2.0), 1.0); }`;
      const SOLID = `precision highp float; uniform vec3 uO; uniform float uR, uLag, uK, uOn; uniform vec2 uBox; uniform float uRad; uniform sampler2D uTex; varying vec3 vWorld; varying vec2 vUv;
        void main(){ float wob = sin(vWorld.y*.011/uK + vWorld.x*.007/uK)*36.0*uK + sin(vWorld.z*.021/uK + vWorld.y*.013/uK)*17.0*uK;
          if (uOn > .5 && distance(vWorld, uO) > uR - uLag + wob) discard;
          vec2 q = abs(vUv*uBox - uBox/2.0) - uBox/2.0 + vec2(uRad); if (length(max(q, 0.0)) > uRad) discard;
          gl_FragColor = texture2D(uTex, vUv); }`;
      const WIRE = `precision highp float; uniform vec3 uO; uniform float uR, uWire, uK; uniform vec3 uC; varying vec3 vWorld; varying vec2 vUv;
        void main(){ float d = distance(vWorld, uO); float rim = exp(-pow((d - uR)/(135.0*uK), 2.0)); float trail = 1.0 - smoothstep(uR - 950.0*uK, uR, d);
          float a = (rim*1.6 + trail*.34)*uWire; if (a < .012) discard; a = min(a, .82); gl_FragColor = vec4(uC*a, a); }`;
      const pSolid = compile(VS, SOLID), pWire = compile(VS, WIRE);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts.flatMap((v) => [v.x, v.y, v.h])), gl.STATIC_DRAW);
      const tri = [], lines = [];
      for (const [a, c, d, f, flip] of quads) {
        if (flip) { tri.push(a, c, f, c, d, f); lines.push(a, c, c, f, f, a, c, d, d, f); }
        else { tri.push(a, c, d, a, d, f); lines.push(a, c, c, d, d, a, d, f, f, a); }
      }
      const big = verts.length > 65535;
      if (big) gl.getExtension("OES_element_index_uint");
      const Arr = big ? Uint32Array : Uint16Array, idxT = big ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
      const ibT = gl.createBuffer(), ibL = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibT); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Arr(tri), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibL); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Arr(lines), gl.STATIC_DRAW);
      // the texture: the picture at the size it is shown (never enlarged past what the page itself shows)
      let hasTex = false;
      if (pic) {
        const sharp = raster(W, H);
        if (sharp) {
          const tx = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, tx);
          gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sharp.canvas);
          for (const [n, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, n, v);
          hasTex = true;
        }
      }
      const g2 = document.createElement("canvas"); g2.width = g2.height = 1;
      const px = g2.getContext("2d", { willReadFrequently: true }); px.fillStyle = wireCss; px.fillRect(0, 0, 1, 1);
      const [cr, cg, cb] = px.getImageData(0, 0, 1, 1).data;
      const radius = parseFloat(getComputedStyle(el).borderRadius) || 0;
      // the world origin, y up as in the source's frame but in target px; z toward the viewer
      const O3 = which === "top" ? [0, -H / 2 - out, 120 * k] : which === "low-right" ? [W / 2 + out, H / 2 - low, 120 * k] : [-W / 2 - out, H / 2 - low, 120 * k];
      const maxR = diag * 1.3 + 900 * k, lag3 = diag * lagShare * 2;
      const rel = Math.min(W, H) * 0.09, DIST = 1400 * k;
      const use = (pr, flat) => {
        gl.useProgram(pr);
        const a = gl.getAttribLocation(pr, "aP");
        gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 3, gl.FLOAT, false, 0, 0);
        gl.uniform2f(gl.getUniformLocation(pr, "uBox"), W, H);
        gl.uniform2f(gl.getUniformLocation(pr, "uView"), cv.width, cv.height);
        gl.uniform1f(gl.getUniformLocation(pr, "uFlat"), flat);
        gl.uniform1f(gl.getUniformLocation(pr, "uRelief"), rel);
        gl.uniform1f(gl.getUniformLocation(pr, "uDist"), DIST);
        gl.uniform3f(gl.getUniformLocation(pr, "uO"), O3[0], O3[1], O3[2]);
        gl.uniform1f(gl.getUniformLocation(pr, "uK"), k);
      };
      gl.viewport(0, 0, cv.width, cv.height);
      return {
        draw(t) {
          const inScene = t >= ctx.from - 1e-6 && t < ctx.to + 1e-6;
          const { e, R, wire } = conductor(t, maxR);
          const live = inScene && t >= at - 1e-6 && e < 1;
          cv.style.visibility = live ? "visible" : "hidden";
          if (t < at) { el.style.clipPath = "polygon(0 0, 0 0, 0 0)"; return; }
          if (e >= 1) { el.style.opacity = ""; el.style.clipPath = "none"; return; }
          const flat = 1 - smooth(0.55, 0.98, e);
          if (hasTex) { el.style.opacity = "0"; el.style.clipPath = "none"; }
          else clipSolid(R - lag3);
          gl.clearColor(0, 0, 0, 0); gl.clearDepth(1); gl.depthMask(true); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
          gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
          if (hasTex) {
            gl.disable(gl.BLEND); gl.depthMask(true); gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1, 1);
            use(pSolid, flat);
            gl.uniform1f(gl.getUniformLocation(pSolid, "uR"), R);
            gl.uniform1f(gl.getUniformLocation(pSolid, "uLag"), lag3);
            gl.uniform1f(gl.getUniformLocation(pSolid, "uOn"), 1);
            gl.uniform1f(gl.getUniformLocation(pSolid, "uRad"), radius);
            gl.uniform1i(gl.getUniformLocation(pSolid, "uTex"), 0);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibT); gl.drawElements(gl.TRIANGLES, tri.length, idxT, 0);
            gl.disable(gl.POLYGON_OFFSET_FILL);
          }
          if (wire > 0.001) {
            gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false); // additive, no depth writes, depth test on
            use(pWire, flat);
            gl.uniform1f(gl.getUniformLocation(pWire, "uR"), R);
            gl.uniform1f(gl.getUniformLocation(pWire, "uWire"), wire);
            gl.uniform3f(gl.getUniformLocation(pWire, "uC"), cr / 255, cg / 255, cb / 255);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibL); gl.drawElements(gl.LINES, lines.length, idxT, 0);
          }
        },
      };
    }

    // ── 2D: the skeleton, painted once ──
    const skel = document.createElement("canvas");
    skel.width = cv.width; skel.height = cv.height;
    const s = skel.getContext("2d");
    s.strokeStyle = wireCss; s.fillStyle = wireCss; s.lineCap = "round"; s.lineJoin = "round";
    const line = Math.max(1, 1.5 * k * 1.4);
    // 1. the triangulated relief: every vertex lifted a little by its height, so the mesh takes the subject's form
    const lift = Math.min(dx, dy) * 0.55;
    const P = verts.map((v) => [v.x, v.y - (v.h - 0.5) * lift]);
    s.globalAlpha = shot ? 0.5 : 0.4; s.lineWidth = Math.max(0.8, line * 0.6);
    s.beginPath();
    for (const [a, c, d, f, flip] of quads) {
      const seg = (u, v) => { s.moveTo(P[u][0], P[u][1]); s.lineTo(P[v][0], P[v][1]); };
      seg(a, c); seg(c, d); seg(a, f); flip ? seg(c, f) : seg(a, d);
    }
    s.stroke();
    // 2. a picture's own edges: Sobel on its shown crop, written as a line render
    if (shot) {
      const cw = shot.w, ch = shot.h, lum = new Float32Array(cw * ch), d = shot.data;
      for (let i = 0; i < cw * ch; i++) lum[i] = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255;
      const tmp = document.createElement("canvas"); tmp.width = cw; tmp.height = ch;
      const tg = tmp.getContext("2d"); tg.fillStyle = wireCss; tg.fillRect(0, 0, cw, ch);
      const out2 = tg.getImageData(0, 0, cw, ch);
      for (let y = 1; y < ch - 1; y++) for (let x = 1; x < cw - 1; x++) {
        const o = y * cw + x, gx = lum[o - cw + 1] + 2 * lum[o + 1] + lum[o + cw + 1] - lum[o - cw - 1] - 2 * lum[o - 1] - lum[o + cw - 1], gy = lum[o + cw - 1] + 2 * lum[o + cw] + lum[o + cw + 1] - lum[o - cw - 1] - 2 * lum[o - cw] - lum[o - cw + 1];
        out2.data[o * 4 + 3] = Math.round(255 * smooth(0.12, 0.4, Math.hypot(gx, gy)));
      }
      tg.putImageData(out2, 0, 0);
      s.globalAlpha = 0.95; s.drawImage(tmp, 0, 0, W, H);
    }
    // 3. the blocks and text lines inside (screens, charts, cards, a scene): their outlines, as screenshot-to-code reads them
    s.globalAlpha = 0.95; s.lineWidth = line;
    const rel = (r) => ({ x: r.x - b.x, y: r.y - b.y, w: r.w, h: r.h });
    const roundBox = (r, rad) => { s.beginPath(); s.roundRect(r.x + 0.5, r.y + 0.5, Math.max(1, r.w - 1), Math.max(1, r.h - 1), Math.min(rad || 0, r.w / 2, r.h / 2)); s.stroke(); };
    const seen = new Set();
    const walk = (n, depth) => {
      if (depth > 7 || seen.size > 260 || n.nodeType !== 1) return;
      seen.add(n);
      if (n !== el && n.closest && n.closest("svg") && n.tagName.toLowerCase() !== "svg") {
        return;
      }
      const cs = getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden") return;
      const hasBox = n === el || n instanceof HTMLImageElement || n instanceof SVGSVGElement || cs.backgroundColor !== "rgba(0, 0, 0, 0)" || parseFloat(cs.borderTopWidth) > 0 || cs.boxShadow !== "none";
      if (hasBox && (n !== el || !whole)) { const r = rel(ctx.box(n)); if (r.w > 3 && r.h > 3) roundBox(r, parseFloat(cs.borderRadius) || 0); }
      for (const c of n.childNodes) {
        if (c.nodeType === 3 && c.textContent.trim()) {
          const rg = document.createRange(); rg.selectNodeContents(c);
          const k0 = stage.getBoundingClientRect(), f = k0.width / (stage.offsetWidth || 1) || 1;
          const rows = new Map();
          for (const q of rg.getClientRects()) { const y = Math.round(q.top); const m = rows.get(y) || { l: q.left, r: q.right, t: q.top, b: q.bottom }; m.l = Math.min(m.l, q.left); m.r = Math.max(m.r, q.right); m.t = Math.min(m.t, q.top); m.b = Math.max(m.b, q.bottom); rows.set(y, m); }
          for (const m of rows.values()) {
            const r = rel({ x: (m.l - k0.left) / f, y: (m.t - k0.top) / f, w: (m.r - m.l) / f, h: (m.b - m.t) / f });
            const inset = r.h * 0.14;
            roundBox({ x: r.x, y: r.y + inset, w: r.w, h: r.h - inset * 2 }, r.h * 0.12);
          }
        } else if (c.nodeType === 1 && !(n instanceof HTMLImageElement)) walk(c, depth + 1);
      }
    };
    if (!pic) walk(el, 0); else roundBox({ x: 0, y: 0, w: W, h: H }, parseFloat(getComputedStyle(el).borderRadius) || 0);

    // the reveal gradient: the source's rim + trail, sampled along the radius
    const g = cv.getContext("2d");
    const lag = lagShare * diag, maxR = far + lag + diag * 0.03;
    const rimW = diag * 0.04, trailW = diag * 0.3;
    const paint = (R, wire) => {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, cv.width, cv.height);
      if (wire <= 0.001 || R <= 0) return;
      g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
      g.drawImage(skel, 0, 0);
      const outer = R + rimW * 2.4, gr = g.createRadialGradient(O.x, O.y, 0, O.x, O.y, outer), N = 40;
      for (let i = 0; i <= N; i++) {
        const d = (i / N) * outer, rim = Math.exp(-Math.pow((d - R) / rimW, 2)), tr = 1 - smooth(R - trailW, R, d);
        const a = Math.min(0.82, (rim * 1.6 + tr * 0.34) * wire);
        gr.addColorStop(i / N, `rgba(0,0,0,${a.toFixed(4)})`);
      }
      g.globalCompositeOperation = "destination-in";
      g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height);
      g.globalCompositeOperation = "source-over";
    };
    return {
      draw(t) {
        const inScene = t >= ctx.from - 1e-6 && t < ctx.to + 1e-6;
        const { e, R, wire } = conductor(t, maxR);
        const live = inScene && t >= at - 1e-6 && e < 1;
        cv.style.visibility = live ? "visible" : "hidden";
        if (t < at) { el.style.clipPath = "polygon(0 0, 0 0, 0 0)"; return; }
        if (e >= 1) { el.style.clipPath = "none"; return; }
        clipSolid(R - lag);
        paint(R, wire);
      },
    };
  },
});
