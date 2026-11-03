// Living painting flow: a painting or illustration comes alive — its brushstrokes flow along their swirls while bright
// spots twinkle, the picture staying recognisable. A flow field is baked once from the picture: the smoothed structure
// tensor of its luminance gives each place its stroke direction (the gradient turned 90°, averaged so one bristle's noise
// does not count), a seeded swirl fills where the picture is flat, and the signs are made to agree with the neighbours, so
// both sides of a stroke travel together instead of shearing. A WebGL pass then displaces the picture along the field: two
// samples advect on a two-phase flow map (period ~2 s, cross-faded so nothing stretches) plus a gentle sin(t + phase(uv))
// breathing, all within 2–4 px. Bright areas pulse in place (.8–1.2 at .5 Hz, phase per spot), never a blur.
// Uniforms only: every frame is a pure function of t. The picture is never enlarged (cover-cropped exactly as laid out).
// Source: prompt-motion "mandelduck-single-prompt-with-opus" (reference only; the shader is our own code).
ML.define({
  id: "photo.living-painting-flow",
  category: "photo",
  name: "Living painting flow",
  does: "A painting or illustration comes alive: its brushstrokes flow along their swirls while bright spots twinkle, the image staying recognisable.",
  says: ["calm", "luxury", "story", "ambient"],
  energy: 2,
  targets: ["image", "stage"],
  duration: [2, 20],
  params: {
    strength: { type: "number", range: [1, 6], default: 3, unit: "px" },
    speed: { type: "number", range: [0.2, 2], default: 1 },
    glow: { type: "number", range: [0, 1.2], default: 0.8 },
  },
  pairs: ["photo.media-settle", "photo.molded-mount"],
  avoid: ["urgency", "speed", "tech"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "prompt-motion:mandelduck-single-prompt-with-opus", license: "reference", note: "technique only; flow-map shader written as our own code" },
  setup(ctx) {
    const { el, p, at, end, scene } = ctx;
    if (!el) return null;
    const img = el.tagName === "IMG" ? el : el.querySelector("img") || (scene && scene.querySelector("img"));
    if (!img || !img.naturalWidth) return null;
    let box = img.parentElement;
    if (!box.dataset.mlPic) {
      const cs = getComputedStyle(img), w = img.offsetWidth, h = img.offsetHeight;
      box = document.createElement("div");
      box.dataset.mlPic = "1";
      box.style.cssText = `position:relative;overflow:hidden;isolation:isolate;flex:none;width:${w}px;height:${h}px;border-radius:${cs.borderRadius};margin:${cs.margin}`;
      img.parentNode.insertBefore(box, img);
      box.append(img);
      Object.assign(img.style, { width: "100%", height: "100%", display: "block", margin: "0" });
    }
    const BW = Math.max(2, Math.round(box.clientWidth)), BH = Math.max(2, Math.round(box.clientHeight));
    // how the picture sits in its box (object-fit / object-position honoured): the part of the texture the box shows
    const cs0 = getComputedStyle(img), fit = cs0.objectFit, NW = img.naturalWidth, NH = img.naturalHeight;
    const cover = Math.max(BW / NW, BH / NH), contain = Math.min(BW / NW, BH / NH);
    const sx = fit === "fill" ? BW / NW : fit === "contain" ? contain : cover, sy = fit === "fill" ? BH / NH : fit === "contain" ? contain : cover;
    const pos = cs0.objectPosition.split(" ").map((v) => (v.endsWith("%") ? parseFloat(v) / 100 : 0.5));
    const scl = [BW / (NW * sx), BH / (NH * sy)], off = [(1 - scl[0]) * (pos[0] ?? 0.5), (1 - scl[1]) * (pos[1] ?? 0.5)];
    // the texture at the pixels it is shown at (a large photo drawn down once, smoothly, so it never shimmers), never above its own
    const cap = Math.min(1, Math.max(sx, sy), 2048 / Math.max(NW, NH)), TW = Math.max(2, Math.round(NW * cap)), TH = Math.max(2, Math.round(NH * cap));
    const src = document.createElement("canvas"); src.width = TW; src.height = TH;
    const sg = src.getContext("2d", { willReadFrequently: true }); sg.imageSmoothingQuality = "high";
    try { sg.drawImage(img, 0, 0, TW, TH); } catch (e) { return null; }

    // the flow field, baked once on a coarse grid (pure: the picture and fixed sines decide it)
    const GW = Math.max(16, Math.round(ML.clamp(TW, 16, 240))), GH = Math.max(16, Math.round((GW * TH) / TW));
    const gc = document.createElement("canvas"); gc.width = GW; gc.height = GH;
    const gg = gc.getContext("2d", { willReadFrequently: true }); gg.imageSmoothingQuality = "high"; gg.drawImage(src, 0, 0, GW, GH);
    let px0; try { px0 = gg.getImageData(0, 0, GW, GH).data; } catch (e) { return null; }
    const lum = new Float32Array(GW * GH);
    for (let i = 0; i < GW * GH; i++) lum[i] = (0.2126 * px0[i * 4] + 0.7152 * px0[i * 4 + 1] + 0.0722 * px0[i * 4 + 2]) / 255;
    const at2 = (a, x, y) => a[ML.clamp(y, 0, GH - 1) * GW + ML.clamp(x, 0, GW - 1)];
    let Jxx = new Float32Array(GW * GH), Jyy = new Float32Array(GW * GH), Jxy = new Float32Array(GW * GH);
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const gx = at2(lum, x + 1, y) - at2(lum, x - 1, y), gy = at2(lum, x, y + 1) - at2(lum, x, y - 1), i = y * GW + x;
      Jxx[i] = gx * gx; Jyy[i] = gy * gy; Jxy[i] = gx * gy;
    }
    const smooth = (a) => { // two box passes, radius 3: the strokes' direction, not each bristle's
      const R = 3, h = new Float32Array(a.length), v = new Float32Array(a.length);
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { let s = 0; for (let k = -R; k <= R; k++) s += at2(a, x + k, y); h[y * GW + x] = s / (2 * R + 1); }
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { let s = 0; for (let k = -R; k <= R; k++) s += at2(h, x, y + k); v[y * GW + x] = s / (2 * R + 1); }
      return v;
    };
    Jxx = smooth(Jxx); Jyy = smooth(Jyy); Jxy = smooth(Jxy);
    const FX = new Float32Array(GW * GH), FY = new Float32Array(GW * GH), flow = new Uint8Array(GW * GH * 4);
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const i = y * GW + x, u = x / GW, v = y / GH;
      const ang = 0.5 * Math.atan2(2 * Jxy[i], Jxx[i] - Jyy[i]) + Math.PI / 2; // along the strokes: across the strongest gradient
      const diff = Math.hypot(Jxx[i] - Jyy[i], 2 * Jxy[i]), strength = ML.clamp(diff / 0.004); // flat or directionless: the swirl takes over
      const sw = 3.4 * Math.sin(u * 5.1 + 1.3 * Math.sin(v * 4.3 + 0.7)) + 2.6 * Math.cos(v * 6.2 + 1.1 * Math.cos(u * 3.7));
      let ax = Math.cos(ang), ay = Math.sin(ang);
      const sx0 = Math.cos(sw), sy0 = Math.sin(sw);
      if (ax * sx0 + ay * sy0 < 0) { ax = -ax; ay = -ay; }
      let vx = ax * strength + sx0 * (1 - strength), vy = ay * strength + sy0 * (1 - strength);
      // agree with the neighbours already set, so a stroke's two sides travel the same way
      const lx = x ? FX[i - 1] : 0, ly = x ? FY[i - 1] : 0, ux = y ? FX[i - GW] : 0, uy = y ? FY[i - GW] : 0;
      if (vx * (lx + ux) + vy * (ly + uy) < 0) { vx = -vx; vy = -vy; }
      const m = Math.hypot(vx, vy) || 1; vx /= m; vy /= m;
      FX[i] = vx; FY[i] = vy;
      flow[i * 4] = Math.round((vx * 0.5 + 0.5) * 255); flow[i * 4 + 1] = Math.round((vy * 0.5 + 0.5) * 255); flow[i * 4 + 2] = 0; flow[i * 4 + 3] = 255;
    }

    const cv = document.createElement("canvas"); cv.width = BW; cv.height = BH;
    cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1";
    const gl = cv.getContext("webgl", { preserveDrawingBuffer: true, antialias: false });
    if (!gl) return null;
    const sh = (type, code) => { const o = gl.createShader(type); gl.shaderSource(o, code); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error("living-painting-flow: " + gl.getShaderInfoLog(o)); return o; };
    const vs = `attribute vec2 a; varying vec2 vUv; void main(){ vUv = a*0.5+0.5; gl_Position = vec4(a,0.0,1.0); }`;
    const fs = `precision highp float; varying vec2 vUv;
      uniform sampler2D uTex, uFlow; uniform vec2 uTexel, uOff, uScl, uAmp; uniform float uT, uIn, uGlow;
      float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y)*p3.z); }
      float noise(vec2 x){ vec2 i = floor(x), f = fract(x); vec2 u = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
      float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a*noise(p); p = p*2.03 + 7.1; a *= 0.5; } return s; }
      float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
      void main(){
        vec2 v = vec2(vUv.x, 1.0 - vUv.y);
        vec2 uv = uOff + v*uScl;
        vec2 f = texture2D(uFlow, uv).rg*2.0 - 1.0;
        float ph = fbm(uv*5.0 + 3.7);
        /* two-phase flow map: two samples slide along the field half a period apart and cross-fade */
        float p0 = fract(uT*0.5), p1 = fract(uT*0.5 + 0.5);
        float wgt = abs(1.0 - 2.0*p0);
        vec2 amp = uAmp*uIn;
        vec2 breathe = f*sin(uT*1.4 + ph*6.2832)*0.5*amp;
        vec4 c = mix(texture2D(uTex, uv + f*(p0 - 0.5)*2.0*amp + breathe), texture2D(uTex, uv + f*(p1 - 0.5)*2.0*amp + breathe), wgt);
        /* bright spots twinkle: luma mask, the .8 - 1.2 pulse at .5 Hz, phase per spot (colours premultiplied, a cut-out keeps its edge) */
        float mask = smoothstep(0.62, 0.95, luma(c.rgb/max(c.a, 0.001)));
        float spot = noise(uv/uTexel/26.0); /* smooth per-spot phase, no blocks */
        float pulse = 1.0 + 0.2*sin(6.2832*0.5*uT + spot*6.2832 + ph*3.0);
        c.rgb *= 1.0 + mask*(pulse - 1.0)*uGlow*uIn;
        /* outside the picture (object-fit: contain): nothing */
        vec2 e = step(vec2(0.0), uv)*step(uv, vec2(1.0));
        gl_FragColor = vec4(min(c.rgb, vec3(c.a)), c.a)*e.x*e.y;
      }`;
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog); gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aLoc = gl.getAttribLocation(prog, "a"); gl.enableVertexAttribArray(aLoc); gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); } catch (e) { return null; }
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    // the flow field on unit 1
    gl.activeTexture(gl.TEXTURE1); const ftex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, ftex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, GW, GH, 0, gl.RGBA, gl.UNSIGNED_BYTE, flow);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.activeTexture(gl.TEXTURE0);
    const U = (n) => gl.getUniformLocation(prog, n);
    gl.uniform1i(U("uTex"), 0);
    gl.uniform1i(U("uFlow"), 1);
    gl.uniform2f(U("uTexel"), 1 / TW, 1 / TH);
    gl.uniform2f(U("uOff"), off[0], off[1]);
    gl.uniform2f(U("uScl"), scl[0], scl[1]);
    // strength in box pixels → texture uv
    const px = ML.clamp(p.strength, 0.5, 8);
    gl.uniform2f(U("uAmp"), (px * scl[0]) / BW, (px * scl[1]) / BH);
    gl.uniform1f(U("uGlow"), ML.clamp(p.glow, 0, 1.5));
    const uT = U("uT"), uIn = U("uIn");
    gl.viewport(0, 0, BW, BH);
    box.append(cv);
    img.style.visibility = "hidden"; // the canvas is the picture now: a cut-out's soft edge must not show the still one under it
    ctx.sfx(at, "swell", 0.14);
    const speed = ML.clamp(p.speed, 0.1, 3);
    return {
      draw(t) {
        // it comes alive over 0.8 s and comes to rest just before the end
        const k = ML.ease(t, at, at + 0.8) * (1 - ML.ease(t, end - 0.4, end));
        gl.uniform1f(uT, Math.max(0, t - at) * speed);
        gl.uniform1f(uIn, k);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      },
    };
  },
});
