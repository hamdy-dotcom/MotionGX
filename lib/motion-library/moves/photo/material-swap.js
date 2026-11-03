// Material swap: the model's paint changes mid-shot — from a plain finish (or its own colours) to a livery. A WebGL pass
// over the picture holds two materials, both lit by the picture's own luminance so the form stays readable: A = a plain
// matte finish (the look's paper tone), B = a livery (seeded camouflage blotches, racing stripes or a carbon weave, in the
// look's accent family). They blend through a uniform mix 0 → 1 over 0.6 s power2.inOut ("fade"), or a wipe across the
// model on an x threshold with a 0.1 soft edge so the paint visibly sweeps along it ("sweep"; right to left in RTL).
// Optional UI trigger: a small swatch toggle at the picture's corner flips at the same moment. The paint lands on the body
// only: near-black parts (glass, tyres) keep their own pixels, and so does whatever is not the model — the transparent
// area of a cut-out, or the plain backdrop of a product shot (its border colour, keyed out). A busy opaque photo has no
// separable model, so all of it would be painted: this move is for cut-outs and plain-backdrop shots.
// Uniforms only: a pure function of t; the picture is never enlarged.
// Source: prompt-motion "buildfastwithai-opus-5-5-high-just" (reference only; the shader is our own code).
ML.define({
  id: "photo.material-swap",
  category: "photo",
  name: "Livery / material changes on the model",
  does: "A cut-out or plain-backdrop model's paint changes mid-shot, from a plain finish to a camouflage, striped or carbon livery.",
  says: ["change", "choice", "before-after"],
  energy: 2,
  targets: ["image"],
  duration: [0.6, 2],
  params: {
    blend: { type: "choice", options: ["fade", "sweep"], default: "fade" },
    ui_trigger: { type: "bool", default: false },
    livery: { type: "choice", options: ["camo", "stripes", "carbon"], default: "camo" },
    from: { type: "choice", options: ["finish", "original"], default: "finish" },
  },
  pairs: ["photo.media-settle", "photo.mono-ramp-tint"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:buildfastwithai-opus-5-5-high-just", license: "reference", note: "technique only; two-material shader with fade / world-x sweep written as our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const img = el.tagName === "IMG" ? el : el.querySelector("img");
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
    // what is not the model: a cut-out says so itself (alpha); an opaque shot on a plain backdrop has one border colour to key out
    let border; try { const d = sg.getImageData(0, 0, TW, TH).data, o = []; const take = (x, y) => { const i = (y * TW + x) * 4; o.push([d[i] / 255, d[i + 1] / 255, d[i + 2] / 255, d[i + 3] / 255]); }; for (let x = 0; x < TW; x += Math.ceil(TW / 64)) { take(x, 0); take(x, TH - 1); } for (let y = 0; y < TH; y += Math.ceil(TH / 64)) { take(0, y); take(TW - 1, y); } border = o; } catch (e) { return null; }
    const opaque = border.every((b) => b[3] > 0.98), mean = [0, 1, 2].map((c) => border.reduce((a, b) => a + b[c], 0) / border.length);
    const spread = Math.sqrt(border.reduce((a, b) => a + [0, 1, 2].reduce((q, c) => q + (b[c] - mean[c]) ** 2, 0), 0) / border.length);
    const keyOn = opaque && spread < 0.07 ? 1 : 0;

    // the materials' colours, from the look (read through a 1 px canvas so color-mix resolves)
    const rgbOf = (expr) => {
      const sp = document.createElement("span"); sp.style.display = "none"; sp.style.color = expr; box.append(sp);
      const c = getComputedStyle(sp).color; sp.remove();
      const k = document.createElement("canvas"); k.width = k.height = 1;
      const g = k.getContext("2d"); g.fillStyle = "#000"; g.fillStyle = c; g.fillRect(0, 0, 1, 1);
      const d = g.getImageData(0, 0, 1, 1).data; return [d[0] / 255, d[1] / 255, d[2] / 255];
    };
    // by what they are, not by name: a dark look's ink is its lightest tone, so a paint named from it would come out pale
    const lumC = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    const inkDark = lumC(rgbOf("var(--x-ink)")) <= lumC(rgbOf("var(--x-ground)"));
    const DEEP = inkDark ? "var(--x-ink)" : "var(--x-ground)", PAPER = inkDark ? "var(--x-panel-2)" : "var(--x-ink)";
    const finish = rgbOf(`color-mix(in srgb, ${PAPER} 94%, var(--x-accent-2))`);
    const liv = [
      rgbOf(`color-mix(in srgb, var(--x-accent) 55%, ${DEEP})`),
      rgbOf(`color-mix(in srgb, var(--x-accent-2) 60%, ${DEEP})`),
      rgbOf(`color-mix(in srgb, ${PAPER} 55%, var(--x-accent))`),
      rgbOf(`color-mix(in srgb, ${DEEP} 85%, var(--x-accent))`),
    ];

    const cv = document.createElement("canvas"); cv.width = BW; cv.height = BH;
    cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1";
    const gl = cv.getContext("webgl", { preserveDrawingBuffer: true, antialias: false });
    if (!gl) return null;
    const sh = (type, code) => { const o = gl.createShader(type); gl.shaderSource(o, code); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error("material-swap: " + gl.getShaderInfoLog(o)); return o; };
    const vs = `attribute vec2 a; varying vec2 vUv; void main(){ vUv = a*0.5+0.5; gl_Position = vec4(a,0.0,1.0); }`;
    const fs = `precision highp float; varying vec2 vUv;
      uniform sampler2D uTex; uniform vec2 uOff, uScl, uAspect; uniform float uMix, uSweep, uRtl, uKind, uFromOrig, uKeyOn;
      uniform vec3 uFinish, uKey, uC0, uC1, uC2, uC3;
      float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y)*p3.z); }
      float noise(vec2 x){ vec2 i = floor(x), f = fract(x); vec2 u = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
      /* each octave turned, so no blotch follows the noise's grid */
      float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a*noise(p); p = mat2(1.6,1.2,-1.2,1.6)*p + 3.3; a *= 0.5; } return s/0.9375; }
      float edge(float at, float f){ return smoothstep(at - 0.006, at + 0.006, f); }
      float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
      vec3 livery(vec2 q){
        if (uKind < 0.5) {
          /* camouflage: three thresholded seeded blotch fields, layered, their outlines warped so they read as painted shapes */
          vec2 w = q + 0.22*vec2(fbm(q*2.3 + 5.2), fbm(q*2.3 + 19.1));
          vec3 c = uC2;
          c = mix(c, uC1, edge(0.48, fbm(w*3.0 + 11.0)));
          c = mix(c, uC0, edge(0.54, fbm(w*3.4 + 47.0)));
          c = mix(c, uC3, edge(0.6, fbm(w*3.9 + 91.0)));
          return c;
        } else if (uKind < 1.5) {
          /* racing livery: a broad diagonal band with twin pinstripes over the base colour */
          float d = (q.x + q.y*0.55)*1.4;
          float band = smoothstep(0.02, 0.0, abs(fract(d) - 0.5) - 0.16);
          float pin = smoothstep(0.012, 0.0, abs(abs(fract(d) - 0.5) - 0.22) - 0.012);
          return mix(mix(uC0, uC2, band), uC3, pin);
        }
        /* carbon weave: alternating twill cells */
        vec2 g = q*26.0; vec2 cell = floor(g); vec2 f = fract(g);
        float dir = mod(cell.x + cell.y, 2.0);
        float sheen = mix(f.x, f.y, dir);
        return mix(mix(uC3, uC2, 0.1), mix(uC3, uC2, 0.32), smoothstep(0.1, 0.9, sheen));
      }
      void main(){
        vec2 v = vec2(vUv.x, 1.0 - vUv.y);
        vec2 uv = uOff + v*uScl;
        vec4 tex = texture2D(uTex, uv); /* premultiplied, so a cut-out's edge filters clean */
        vec3 base = tex.rgb/max(tex.a, 0.001);
        float L = luma(base);
        /* both materials take the model's light: matte shading + a little specular from the bright areas */
        float shade = 0.30 + 0.90*L;
        float spec = pow(L, 6.0)*0.3;
        vec3 sand = uFinish*(0.22 + 0.86*L) + spec*0.4;
        /* the paint lands on the body: near-black parts keep their pixels, and so does a keyed-out plain backdrop */
        float body = smoothstep(0.12, 0.24, L);
        if (uKeyOn > 0.5) body *= smoothstep(0.06, 0.14, distance(base, uKey));
        vec2 q = uv*uAspect;
        vec3 paint = livery(q)*shade + spec;
        /* fade: a uniform mix; sweep: an x threshold with a 0.1 soft edge travelling across */
        float x = mix(v.x, 1.0 - v.x, uRtl);
        float m = uSweep > -5.0 ? 1.0 - smoothstep(uSweep - 0.1, uSweep, x) : uMix;
        vec3 from = uFromOrig > 0.5 ? base : mix(base, sand, body);
        vec3 col = clamp(mix(from, mix(base, paint, body), m), 0.0, 1.0);
        vec2 e = step(vec2(0.0), uv)*step(uv, vec2(1.0)); /* outside the picture (object-fit: contain): nothing */
        gl_FragColor = vec4(col*tex.a, tex.a)*e.x*e.y;
      }`;
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog); gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aLoc = gl.getAttribLocation(prog, "a"); gl.enableVertexAttribArray(aLoc); gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); } catch (e) { return null; }
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    const U = (n) => gl.getUniformLocation(prog, n);
    gl.uniform1i(U("uTex"), 0);
    gl.uniform2f(U("uOff"), off[0], off[1]);
    gl.uniform2f(U("uScl"), scl[0], scl[1]);
    gl.uniform2f(U("uAspect"), (NW / Math.max(NW, NH)) * 2.2, (NH / Math.max(NW, NH)) * 2.2); // pattern scale in picture space
    gl.uniform1f(U("uRtl"), rtl ? 1 : 0);
    gl.uniform1f(U("uKind"), { camo: 0, stripes: 1, carbon: 2 }[p.livery] ?? 0);
    gl.uniform3fv(U("uFinish"), finish); gl.uniform3fv(U("uKey"), mean);
    gl.uniform1f(U("uKeyOn"), keyOn); gl.uniform1f(U("uFromOrig"), p.from === "original" ? 1 : 0);
    liv.forEach((c, i) => gl.uniform3fv(U("uC" + i), c));
    const uMix = U("uMix"), uSweep = U("uSweep");
    gl.viewport(0, 0, BW, BH);
    box.append(cv);
    img.style.visibility = "hidden"; // the canvas is the picture now: a cut-out's soft edge must not show the still one under it

    // the side-panel toggle: two swatches, the ring moving from the plain finish to the livery at the swap
    let ring = null, sw = [];
    if (p.ui_trigger) {
      const d = Math.round(ML.clamp(Math.min(BW, BH) * 0.11, 18, 56)), gap = Math.round(d * 0.35), pad = Math.round(d * 0.3);
      const pill = document.createElement("div");
      pill.style.cssText = `position:absolute;z-index:2;top:${pad + 4}px;${rtl ? "left" : "right"}:${pad + 4}px;display:flex;gap:${gap}px;padding:${pad}px;` +
        "border-radius:var(--x-radius-s);background:color-mix(in srgb, var(--x-panel) 88%, transparent);box-shadow:var(--x-shadow);border:var(--x-edge) solid var(--x-edge-color)";
      const toCss = (c) => `rgb(${c.map((x) => Math.round(x * 255)).join(",")})`;
      for (const bg of [`linear-gradient(135deg, ${toCss(finish)}, ${toCss(finish.map((v) => v * 0.7))})`, `conic-gradient(${toCss(liv[0])} 0 25%, ${toCss(liv[1])} 0 50%, ${toCss(liv[2])} 0 75%, ${toCss(liv[3])} 0)`]) {
        const dot = document.createElement("div");
        dot.style.cssText = `width:${d}px;height:${d}px;border-radius:50%;background:${bg};outline-offset:3px`;
        pill.append(dot); sw.push(dot);
      }
      box.append(pill);
      ring = true;
    }
    const swapAt = at + Math.min(0.3, Math.max(0, (end - at) * 0.15));
    const dur = Math.min(p.blend === "sweep" ? 0.9 : 0.6, Math.max(0.3, end - swapAt)); // done inside the move's own span
    const quad = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2); // power2.inOut
    ctx.sfx(swapAt, "whoosh.soft", 0.22);
    if (ring) ctx.sfx(swapAt, "click", 0.2);
    return {
      draw(t) {
        const u = quad(ML.lin(t, swapAt, swapAt + dur));
        if (p.blend === "sweep") { gl.uniform1f(uSweep, -0.1 + u * 1.2); gl.uniform1f(uMix, 0); }
        else { gl.uniform1f(uSweep, -10); gl.uniform1f(uMix, u); }
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (ring) {
          const on = t >= swapAt ? 1 : 0;
          sw.forEach((dot, i) => { dot.style.outline = i === on ? "var(--x-ring-w) solid var(--x-ring)" : "none"; dot.style.scale = i === on ? "1" : "0.86"; });
        }
      },
    };
  },
});
