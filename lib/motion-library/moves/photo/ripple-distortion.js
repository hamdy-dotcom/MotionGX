// Water ripple distortion: ripples of liquid displacement follow a moving point across the photo, bending the picture
// like water and decaying behind it. An own seekable WebGL pass (the source drew it with the "shaders" package:
// <Shader toneMapping="aces"><ImageTexture objectFit="cover"/><CursorRipples decay={7.3} radius={0.6}/></Shader> over a
// same-crop fallback <img>, the canvas fading in over 240 ms — rebuilt here, the library is not shipped). Emitters are
// sampled along a scripted pointer path, one every 1/30 s; per pixel the shader sums, over the live samples with age
// a = t − ts, a radial wave sin(k·(d − c·a))·exp(−decay·a)·smoothstep(radius, 0, d) and displaces the UV along the
// radial direction by amplitude·sum (optional chromatic split: R / G / B read at slightly different offsets; a soft
// light along the ripple slopes, ACES-compressed). Same path, same t → same picture. Paths: a sweep across the
// picture (right to left in RTL), a circle round its middle, a single tap. Before the first ripple and after the last
// has died, the canvas fades out and the untouched <img> shows (the same crop, so nothing jumps).
// Source: MengTo/Skills web-design/shaders-cursor-ripples (assets/react/cursor-ripple-shader.tsx), rebuilt (MIT).
ML.define({
  id: "photo.ripple-distortion",
  category: "photo",
  name: "Water ripple distortion",
  does: "Ripples of liquid displacement follow a moving point across a photo, bending the picture like water and decaying behind it.",
  says: ["playful", "luxury", "focus", "reveal"],
  energy: 3,
  targets: ["image", "scene"],
  duration: [1, 6],
  params: {
    decay: { type: "number", range: [4, 10], default: 7.3 },
    radius: { type: "number", range: [0.3, 0.8], default: 0.6 },
    intensity: { type: "number", range: [0.2, 1], default: 0.5 },
    chromatic: { type: "bool", default: false },
    path: { type: "choice", options: ["sweep", "circle", "tap"], default: "sweep" },
  },
  pairs: ["camera.slow-push", "photo.settle-glint", "photo.retro-film-grade"],
  avoid: ["problem", "urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:web-design/shaders-cursor-ripples", license: "MIT", note: "CursorRipples (decay 7.3, radius 0.6, aces) over an objectFit cover ImageTexture, rebuilt as our own seekable WebGL pass" },
  async setup(ctx) {
    const { el, p, at, end, rtl, stage } = ctx;
    if (!el) return null;
    const decay = ML.clamp(p.decay, 4, 10), radius = ML.clamp(p.radius, 0.3, 0.8), inten = ML.clamp(p.intensity, 0.2, 1);

    // the picture: the target itself, or the first picture inside it / the scene
    const isStage = el === stage || el === ctx.scene;
    const img = el.tagName === "IMG" ? el : el.querySelector("img") || (isStage ? (ctx.scene || stage).querySelector("img") : null);
    if (!img || !img.naturalWidth) return null;

    // a box over the picture that holds the canvas (a wrapper takes the picture's place in the layout)
    const b = ctx.box(img), cs = getComputedStyle(img);
    const host = document.createElement("div");
    host.style.cssText = `position:relative;display:${cs.display === "inline" ? "inline-block" : cs.display};width:${b.w}px;height:${b.h}px;flex:${cs.flex};align-self:${cs.alignSelf};margin:${cs.margin};border-radius:${cs.borderRadius};overflow:hidden;line-height:0`;
    img.parentNode.insertBefore(host, img);
    host.append(img);
    img.style.width = "100%"; img.style.height = "100%"; img.style.margin = "0"; img.style.display = "block";

    // the texture: the picture at its own pixels (capped), so nothing is enlarged past them
    const NW = img.naturalWidth, NH = img.naturalHeight, cap = Math.min(1, 2048 / Math.max(NW, NH));
    const src = document.createElement("canvas"); src.width = Math.round(NW * cap); src.height = Math.round(NH * cap);
    src.getContext("2d").drawImage(img, 0, 0, src.width, src.height);

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cv = document.createElement("canvas");
    cv.width = Math.max(2, Math.round(b.w * dpr)); cv.height = Math.max(2, Math.round(b.h * dpr));
    cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0;filter:var(--x-pic-filter)";
    host.append(cv);
    const gl = cv.getContext("webgl", { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false });
    if (!gl) { cv.remove(); return null; }

    const MAX = 48;
    const vs = "attribute vec2 a;varying vec2 v;void main(){v=vec2(a.x*.5+.5,.5-a.y*.5);gl_Position=vec4(a,0.,1.);}";
    const fs = `precision highp float;varying vec2 v;uniform sampler2D tex;uniform vec2 asp;uniform vec4 crop;uniform vec3 s[${MAX}];uniform int n;
uniform float decay,radius,amp,k,c,chroma;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){vec2 p=v*asp;vec2 disp=vec2(0.);float slope=0.;
for(int i=0;i<${MAX};i++){if(i>=n)break;vec2 dv=p-s[i].xy*asp;float d=length(dv);float a=s[i].z;
float env=exp(-decay*a)*smoothstep(radius,0.,d);float ph=k*(d-c*a);float w=sin(ph)*env;
vec2 dir=d>1e-4?dv/d:vec2(0.);disp+=dir*w;slope+=cos(ph)*env*dot(dir,vec2(-.7071,-.7071));}
disp=disp*amp/asp;vec2 uv=crop.xy+(v+disp)*crop.zw;vec4 base=texture2D(tex,uv);vec3 col=base.rgb;
if(chroma>0.){col.r=texture2D(tex,crop.xy+(v+disp*1.35)*crop.zw).r;col.b=texture2D(tex,crop.xy+(v+disp*.65)*crop.zw).b;}
float l=slope*amp*14.;vec3 lit=col+vec3(max(l,0.))*.6-vec3(max(-l,0.))*.25;
col=mix(col,aces(lit*1.08),clamp(abs(l)*6.,0.,1.));gl_FragColor=vec4(col,1.);}`;
    const sh = (type, code) => { const o = gl.createShader(type); gl.shaderSource(o, code); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error("ripple shader: " + gl.getShaderInfoLog(o)); return o; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog); gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aLoc = gl.getAttribLocation(prog, "a"); gl.enableVertexAttribArray(aLoc); gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); } catch (e) { cv.remove(); return null; } // a picture from another origin: leave it untouched
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const U = (name) => gl.getUniformLocation(prog, name);

    // object-fit cover with the picture's own object-position: the same crop as the <img> under it
    const ba = b.w / b.h, ia = NW / NH;
    const [px, py] = (cs.objectPosition || "50% 50%").split(" ").map((x) => (x.endsWith("%") ? parseFloat(x) / 100 : 0.5));
    const fit = cs.objectFit || "fill";
    let crop = [0, 0, 1, 1];
    if (fit === "cover") crop = ia > ba ? [(1 - ba / ia) * px, 0, ba / ia, 1] : [0, (1 - ia / ba) * py, 1, ia / ba];
    const unit = Math.min(b.w, b.h);
    gl.uniform2f(U("asp"), b.w / unit, b.h / unit);
    gl.uniform4f(U("crop"), crop[0], crop[1], crop[2], crop[3]);
    gl.uniform1f(U("decay"), decay); gl.uniform1f(U("radius"), radius);
    gl.uniform1f(U("k"), (2 * Math.PI) / 0.2); gl.uniform1f(U("c"), 0.55);
    gl.uniform1f(U("amp"), 0.011 * inten);
    gl.uniform1f(U("chroma"), p.chromatic ? 1 : 0);
    gl.uniform1i(U("tex"), 0);
    gl.viewport(0, 0, cv.width, cv.height);
    const uS = U("s"), uN = U("n");

    // the scripted pointer path (box shares, 0–1), sampled every 1/30 s
    const span = Math.max(0.6, end - at);
    const D = p.path === "tap" ? 0.1 : Math.min(p.path === "circle" ? 2.6 : 2.2, Math.max(0.8, span - 0.7));
    const ar = b.w / b.h;
    const pathAt = (u) => {
      if (p.path === "circle") { const a = -Math.PI / 2 + u * Math.PI * 2 * (rtl ? -1 : 1), r = 0.3; return [0.5 + (r * Math.cos(a)) / Math.max(1, ar), 0.5 + r * Math.sin(a) * Math.min(1, ar)]; }
      if (p.path === "tap") return [0.5, 0.5];
      const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      const x = -0.05 + 1.1 * e;
      return [rtl ? 1 - x : x, 0.58 - 0.16 * Math.sin(Math.PI * e)];
    };
    const samples = [];
    const M = Math.max(1, Math.round(D * 30));
    for (let j = 0; j <= M; j++) { const [x, y] = pathAt(j / M); samples.push({ x, y, ts: at + j / 30 }); }
    const life = 5 / decay; // exp(−decay·a) < 1% after this
    const last = samples[samples.length - 1].ts + life;
    ctx.sfx(at, "whoosh.soft", 0.28);
    if (p.path === "circle") ctx.sfx(at + D * 0.5, "whoosh.soft", 0.18);
    const arr = new Float32Array(MAX * 3);

    return {
      draw(t) {
        // canvas in over 240 ms at the first ripple, out over 240 ms once the last has died
        const o = ML.lin(t, at, at + 0.24) * (1 - ML.lin(t, last - 0.24, last));
        cv.style.opacity = o.toFixed(4);
        if (o <= 0) return;
        let n = 0;
        for (let j = samples.length - 1; j >= 0 && n < MAX; j--) {
          const s = samples[j], a = t - s.ts;
          if (a < 0) continue;
          if (a > life) break;
          arr[n * 3] = s.x; arr[n * 3 + 1] = s.y; arr[n * 3 + 2] = a; n++;
        }
        gl.uniform3fv(uS, arr);
        gl.uniform1i(uN, n);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      },
    };
  },
});
