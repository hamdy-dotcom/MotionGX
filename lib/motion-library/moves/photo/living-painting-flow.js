// Living painting flow: a painting or illustration comes alive — its brushstrokes flow along their swirls while bright
// spots twinkle, the picture staying recognisable. A WebGL pass over the picture: the texture is displaced by a flow
// field made from the image's own luminance gradient rotated 90° (so motion runs along the strokes, not across them),
// blended with a seeded curl-like swirl where the picture is flat. Two samples advect along the field on a two-phase
// flow map (period ~2 s, cross-faded so nothing stretches) plus a gentle sin(t + phase(uv)) breathing, all within
// 2–4 px. Bright areas get a luma-masked pulse (.8–1.2 at .5 Hz, phase per spot) — a brightening in place, never a blur.
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
    // the picture at its own pixels (capped), so the shader never shows more than the source has
    const NW = img.naturalWidth, NH = img.naturalHeight, cap = Math.min(1, 2048 / Math.max(NW, NH));
    const TW = Math.round(NW * cap), TH = Math.round(NH * cap);
    const src = document.createElement("canvas"); src.width = TW; src.height = TH;
    try { src.getContext("2d").drawImage(img, 0, 0, TW, TH); } catch (e) { return null; }
    // object-fit: cover, centred — the part of the texture the box shows
    const fit = getComputedStyle(img).objectFit;
    const s = fit === "contain" ? Math.min(BW / NW, BH / NH) : Math.max(BW / NW, BH / NH);
    const scl = [Math.min(1, BW / (NW * s)), Math.min(1, BH / (NH * s))], off = [(1 - scl[0]) / 2, (1 - scl[1]) / 2];

    const cv = document.createElement("canvas"); cv.width = BW; cv.height = BH;
    cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1";
    const gl = cv.getContext("webgl", { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false });
    if (!gl) return null;
    const sh = (type, code) => { const o = gl.createShader(type); gl.shaderSource(o, code); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error("living-painting-flow: " + gl.getShaderInfoLog(o)); return o; };
    const vs = `attribute vec2 a; varying vec2 vUv; void main(){ vUv = a*0.5+0.5; gl_Position = vec4(a,0.0,1.0); }`;
    const fs = `precision highp float; varying vec2 vUv;
      uniform sampler2D uTex; uniform vec2 uTexel, uOff, uScl, uAmp; uniform float uT, uIn, uGlow;
      vec2 hash2(vec2 p){ p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3))); return fract(sin(p)*43758.5453); }
      float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y)*p3.z); }
      float noise(vec2 x){ vec2 i = floor(x), f = fract(x); vec2 u = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
      float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a*noise(p); p = p*2.03 + 7.1; a *= 0.5; } return s; }
      float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
      float L(vec2 uv){ return luma(texture2D(uTex, uv).rgb); }
      vec2 flowAt(vec2 uv){
        /* the stroke direction: the luminance gradient over a few texels, turned 90 degrees */
        vec2 d = uTexel*5.0;
        vec2 g = vec2(L(uv+vec2(d.x,0.0)) - L(uv-vec2(d.x,0.0)), L(uv+vec2(0.0,d.y)) - L(uv-vec2(0.0,d.y)));
        vec2 along = vec2(-g.y, g.x);
        float m = length(along);
        /* a seeded swirl where the picture is flat: the angle of a slow noise field */
        float ang = fbm(uv*3.2)*6.2832*1.5;
        vec2 swirl = vec2(cos(ang), sin(ang));
        float w = smoothstep(0.004, 0.05, m);
        return normalize(mix(swirl, along/max(m, 1e-5), w) + 1e-5);
      }
      void main(){
        vec2 v = vec2(vUv.x, 1.0 - vUv.y);
        vec2 uv = uOff + v*uScl;
        vec2 f = flowAt(uv);
        float ph = fbm(uv*5.0 + 3.7);
        /* two-phase flow map: two samples slide along the field half a period apart and cross-fade */
        float p0 = fract(uT*0.5), p1 = fract(uT*0.5 + 0.5);
        float wgt = abs(1.0 - 2.0*p0);
        vec2 amp = uAmp*uIn;
        vec2 breathe = f*sin(uT*1.4 + ph*6.2832)*0.5*amp;
        vec3 c0 = texture2D(uTex, uv + f*(p0 - 0.5)*2.0*amp + breathe).rgb;
        vec3 c1 = texture2D(uTex, uv + f*(p1 - 0.5)*2.0*amp + breathe).rgb;
        vec3 col = mix(c0, c1, wgt);
        /* bright spots twinkle: luma mask, pulse .8 - 1.2 at .5 Hz, phase per spot */
        float l = luma(col);
        float mask = smoothstep(0.62, 0.95, l);
        float spot = noise(uv/uTexel/26.0); /* smooth per-spot phase, no blocks */
        float pulse = 0.8 + 0.4*(0.5 + 0.5*sin(6.2832*0.5*uT + spot*6.2832 + ph*3.0));
        col += col*mask*(pulse - 0.8)*uGlow*0.4*uIn;
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      }`;
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog); gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aLoc = gl.getAttribLocation(prog, "a"); gl.enableVertexAttribArray(aLoc); gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); } catch (e) { return null; }
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    const U = (n) => gl.getUniformLocation(prog, n);
    gl.uniform1i(U("uTex"), 0);
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
