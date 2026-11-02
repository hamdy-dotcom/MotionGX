// Glossy 3D blob with ring text: a raymarched metaball blob (four spheres melted together with a smooth union,
// orbiting and breathing), shaded iridescent from the look's two accents with a neon rim (fresnel), a hard specular
// and a soft glow, turning at `speed` °/s — our own WebGL shader, painted from t. Around it one or two text bands run
// as cylinder rings in opposite directions: each word chunk is placed on the ring by its angle and projected in 2D
// (perspective scale ≤ 1, foreshortened by cos φ, mirrored on the far side), so nothing is ever enlarged under a 3D
// transform. The near half passes in front of the blob, the far half behind it, dimmer and depth-blurred. Band one is
// accent bold, band two a grey outline. Words stay whole (Arabic joins), and the reading order runs with the language.
// Source: prompt-motion "johnsavage-ai-opus-5-5-prompt-make" (reference only — shader and rings are our own code).
ML.define({
  id: "element.glossy-3d-blob-ring-text",
  category: "element",
  name: "Glossy 3D blob with ring text",
  does: "A shiny iridescent 3D blob rotates in the centre while words in bands circle behind and in front of it.",
  says: ["tech", "luxury", "brand"],
  energy: 4,
  targets: ["logo", "shape"],
  duration: [2, 6],
  params: {
    band_text: { type: "text", default: "FORM • LIGHT • MAKE" },
    speed: { type: "number", range: [10, 60], default: 30, unit: "deg/s" },
    bands: { type: "number", range: [1, 2], default: 2 },
    size: { type: "number", range: [0.35, 0.7], default: 0.56 },
    dark: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "background.mesh-gradient", "element.glossy-3d-logo"],
  avoid: ["problem", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "prompt-motion:johnsavage-ai-opus-5-5-prompt-make", license: "reference", note: "raymarch shader and projected text rings are our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const ob = own ? ctx.box(own) : null;
    const big = ob && ob.w > f.W * 0.4 && ob.h > f.H * 0.18;
    const R = big ? ob : f.pic;
    const k = Math.min(f.W, f.H) / 1080;
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;overflow:hidden;border-radius:var(--x-radius);`, host);
    const back = mk("div", `position:absolute;inset:0;background:${p.dark ? "radial-gradient(closest-side, color-mix(in srgb, var(--x-accent) 28%, var(--x-device)), var(--x-device))" : "var(--x-ground)"};`, layer);
    const rgb = (v) => { const e = mk("span", `color:${v};display:none`, layer); const m = (getComputedStyle(e).color.match(/[\d.]+/g) || [0, 0, 0]).map(Number); e.remove(); return [m[0] / 255, m[1] / 255, m[2] / 255]; };
    const A = rgb("var(--x-accent)"), B = rgb("var(--x-accent-2)"), D = rgb("var(--x-device)");

    // the blob canvas, centred (a little high to leave room for a logo under it)
    const hasLogo = own && !big;
    const S = Math.min(R.w, R.h) * ML.clamp(p.size, 0.35, 0.7);
    const cx = R.w / 2, cy = R.h / 2 - (hasLogo ? S * 0.12 : 0);
    const RES = 0.8;
    const cv = mk("canvas", `position:absolute;left:${cx - S / 2}px;top:${cy - S / 2}px;width:${S}px;height:${S}px;z-index:2;`, layer);
    cv.width = Math.round(S * RES); cv.height = Math.round(S * RES);
    const VS = "attribute vec2 a; void main(){ gl_Position=vec4(a,0.0,1.0); }";
    const FS = `precision highp float;
uniform vec2 uRes; uniform float uRot, uT; uniform vec3 uA, uB, uD;
mat3 rotY(float a){ float c=cos(a), s=sin(a); return mat3(c,0.0,-s, 0.0,1.0,0.0, s,0.0,c); }
mat3 rotX(float a){ float c=cos(a), s=sin(a); return mat3(1.0,0.0,0.0, 0.0,c,s, 0.0,-s,c); }
float smin(float a, float b, float k){ float h=clamp(0.5+0.5*(b-a)/k,0.0,1.0); return mix(b,a,h)-k*h*(1.0-h); }
float map(vec3 p){
  p = rotX(0.35) * rotY(uRot) * p;
  float d = length(p) - 0.5;
  for (int i=0;i<4;i++){
    float fi=float(i);
    float a=fi*1.5708+uT*0.6*(mod(fi,2.0)*2.0-1.0);
    vec3 c=vec3(cos(a)*0.68, sin(fi*2.1+uT*0.8)*0.42, sin(a)*0.68);
    d = smin(d, length(p-c) - (0.3+0.05*sin(uT*1.3+fi)), 0.3);
  }
  return d;
}
vec3 nrm(vec3 p){ vec2 e=vec2(0.0015,0.0); return normalize(vec3(map(p+e.xyy)-map(p-e.xyy), map(p+e.yxy)-map(p-e.yxy), map(p+e.yyx)-map(p-e.yyx))); }
void main(){
  vec2 uv=(gl_FragCoord.xy-0.5*uRes)/uRes.y;
  vec3 ro=vec3(0.0,0.0,3.6), rd=normalize(vec3(uv*1.15,-1.6));
  float t=0.0, dmin=9.0; bool hit=false;
  for(int i=0;i<72;i++){ vec3 p=ro+rd*t; float d=map(p); dmin=min(dmin,d); if(d<0.001){hit=true;break;} t+=d*0.9; if(t>7.0)break; }
  if(!hit){ float g=exp(-dmin*7.0)*0.55*(1.0-smoothstep(0.3,0.5,length(uv))); gl_FragColor=vec4(uB*g, g); return; }
  vec3 p=ro+rd*t, n=nrm(p), v=-rd;
  vec3 L=normalize(vec3(-0.5,0.8,0.6));
  float dif=max(dot(n,L),0.0), fr=pow(1.0-max(dot(n,v),0.0),3.0);
  float spec=pow(max(dot(reflect(-L,n),v),0.0),70.0);
  float spec2=pow(max(dot(reflect(-normalize(vec3(0.7,-0.2,0.5)),n),v),0.0),30.0);
  // iridescence: the two accents swept by the normal, plus a thin-film shimmer
  float h=0.5+0.5*sin(dot(n,vec3(2.2,1.4,0.9))*2.2+uRot*1.5);
  vec3 film=0.5+0.5*cos(6.2831*(vec3(0.0,0.33,0.67)+fr*0.8+h*0.3));
  vec3 base=mix(uA,uB,h);
  vec3 col=uD*0.35+base*(0.25+0.75*dif)+film*0.18*fr;
  col+=uB*fr*1.6;          // neon rim
  col+=vec3(1.0)*(spec*1.2+spec2*0.35);
  gl_FragColor=vec4(col,1.0);
}`;
    let gl = null, U = {};
    try {
      gl = cv.getContext("webgl", { alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: true });
      if (gl) {
        const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
        const pr = gl.createProgram();
        gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
        gl.bindAttribLocation(pr, 0, "a"); gl.linkProgram(pr);
        if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
        gl.useProgram(pr);
        const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        for (const u of ["uRes", "uRot", "uT", "uA", "uB", "uD"]) U[u] = gl.getUniformLocation(pr, u);
        gl.viewport(0, 0, cv.width, cv.height);
        gl.uniform2f(U.uRes, cv.width, cv.height);
        gl.uniform3fv(U.uA, A); gl.uniform3fv(U.uB, B); gl.uniform3fv(U.uD, D);
        gl.clearColor(0, 0, 0, 0);
      }
    } catch (e) { gl = null; }
    const c2 = gl ? null : cv.getContext("2d");
    const css = (c, a = 1) => `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`;
    const paint = (rot, tt) => {
      if (gl) { gl.clear(gl.COLOR_BUFFER_BIT); gl.uniform1f(U.uRot, rot); gl.uniform1f(U.uT, tt); gl.drawArrays(gl.TRIANGLES, 0, 3); return; }
      // fallback: four soft glossy discs
      const w = cv.width, h = cv.height; c2.clearRect(0, 0, w, h);
      for (let i = 0; i < 4; i++) { const a = rot + i * 1.57, x = w / 2 + Math.cos(a) * w * 0.12, y = h / 2 + Math.sin(i * 2.1 + tt) * h * 0.07; const g = c2.createRadialGradient(x - w * 0.05, y - h * 0.06, 0, x, y, w * 0.25); g.addColorStop(0, "rgba(255,255,255,.9)"); g.addColorStop(0.25, css(i % 2 ? A : B)); g.addColorStop(1, css(A, 0)); c2.fillStyle = g; c2.beginPath(); c2.arc(x, y, w * 0.25, 0, Math.PI * 2); c2.fill(); }
    };

    // the text bands: whole-word chunks around a ring, laid out once
    const DEF = "FORM • LIGHT • MAKE";
    const text = rtl && p.band_text === DEF ? "شكل • نور • صنع" : String(p.band_text || DEF);
    const words = text.split(/\s*[•·|]\s*|\s{2,}/).map((s) => s.trim()).filter(Boolean);
    const nb = Math.round(ML.clamp(p.bands, 1, 2));
    const rad = Math.min(R.w * 0.44, S * 0.92);
    const bandsDef = [
      { y: nb > 1 ? -S * 0.2 : 0, tilt: 0.24, dir: 1, style: "accent" },
      { y: S * 0.24, tilt: -0.18, dir: -1, style: "outline" },
    ].slice(0, nb);
    const fs0 = S * 0.1;
    const bands = bandsDef.map((bd, bi) => {
      const seq = [];
      words.forEach((w) => { seq.push(w); seq.push("•"); });
      const els = seq.map((w) => {
        const isDot = w === "•";
        const e = mk("div", `position:absolute;left:0;top:0;white-space:nowrap;font:${bd.style === "accent" ? "800" : "var(--x-head-weight)"} ${fs0}px/1 var(--x-head-font);letter-spacing:${rtl ? 0 : "0.02em"};text-transform:${rtl ? "none" : "uppercase"};${bd.style === "accent" ? "color:var(--x-accent-2);" : `color:transparent;-webkit-text-stroke:${Math.max(1, 1.4 * k)}px color-mix(in srgb, var(--x-dim) 70%, white);`}${isDot ? "opacity:.8;" : ""}`, layer, w);
        return e;
      });
      const ws = els.map((e) => e.offsetWidth + fs0 * 0.5);
      const seqW = ws.reduce((a, b) => a + b, 0);
      const C = 2 * Math.PI * rad;
      const reps = Math.max(1, Math.floor(C / (seqW * 1.25)));
      // the font that makes `reps` copies close the ring exactly
      const fs = fs0 * (C / (reps * seqW));
      const chunks = [];
      for (let r = 0; r < reps; r++) els.forEach((e, i) => { const el = r === 0 ? e : e.cloneNode(true); if (r) layer.append(el); el.style.fontSize = fs + "px"; chunks.push({ el, w: ws[i] * (fs / fs0) }); });
      let acc = 0;
      chunks.forEach((c) => { c.phi = ((acc + c.w / 2) / C) * Math.PI * 2 * (rtl ? -1 : 1); acc += c.w; c.h = c.el.offsetHeight; c.ow = c.el.offsetWidth; });
      return { ...bd, chunks, bi };
    });

    // a logo under the blob
    let logo = null;
    if (hasLogo) {
      logo = own.cloneNode(true); logo.removeAttribute("data-slot");
      const lh = Math.min(S * 0.2, ob.h * 1.6), lw = (ob.w / ob.h) * lh;
      logo.style.cssText = `position:absolute;left:${cx - lw / 2}px;top:${cy + S * 0.72}px;width:${lw}px;height:${lh}px;z-index:4;display:block;`;
      if (logo.tagName === "IMG") { logo.style.height = Math.min(lh, own.naturalHeight || lh) + "px"; logo.style.width = "auto"; }
      if (p.dark) logo.style.setProperty("--x-ink", "color-mix(in srgb, var(--x-panel) 10%, white)");
      layer.append(logo);
    }

    const sp = (ML.clamp(p.speed, 10, 60) * Math.PI) / 180;
    const leaveA = Math.max(at + 1.2, end - 0.35);
    ctx.sfx(at, "swell", 0.35);
    if (nb) ctx.sfx(at + 0.45, "whoosh.soft", 0.2);
    const persp = 3.2;

    return {
      draw(t) {
        const leave = ML.clamp((t - leaveA) / 0.3);
        layer.style.visibility = t < at - 0.15 ? "hidden" : "visible";
        layer.style.opacity = (1 - leave).toFixed(4);
        if (own && own.style) { const o = t >= at ? "0" : ""; if (own.style.opacity !== o) own.style.opacity = o; }
        back.style.opacity = ML.out(t, at - 0.15, at + 0.25).toFixed(4);
        const e = ML.out(t, at, at + 0.7);
        const dt = Math.max(0, t - at);
        paint(dt * sp, dt);
        cv.style.opacity = e.toFixed(4);
        cv.style.transform = `scale(${(0.7 + 0.3 * e).toFixed(4)})`;
        bands.forEach((b, bi) => {
          const bo = ML.out(t, at + 0.3 + bi * 0.15, at + 0.9 + bi * 0.15);
          const rot = dt * sp * b.dir * (rtl ? -1 : 1) * 0.9;
          b.chunks.forEach((c) => {
            const phi = c.phi + rot;
            const sx = Math.sin(phi), cz = Math.cos(phi);
            const z = cz; // −1 far … 1 near
            const ps = persp / (persp + (1 - z)); // ≤ 1
            const x = cx + rad * sx * ps;
            const y = cy + b.y + rad * b.tilt * z * ps;
            const fore = Math.max(0.04, Math.abs(cz)) * Math.sign(cz || 1);
            const front = z > 0;
            c.el.style.zIndex = front ? "3" : "1";
            c.el.style.transform = `translate(${(x - c.ow / 2).toFixed(2)}px, ${(y - c.h / 2).toFixed(2)}px) scale(${(fore * ps).toFixed(4)}, ${ps.toFixed(4)})`;
            const depth = (1 - z) / 2; // 0 near … 1 far
            c.el.style.opacity = (bo * (1 - 0.6 * depth) * Math.min(1, Math.abs(cz) * 4)).toFixed(4);
            c.el.style.filter = depth > 0.5 ? `blur(${((depth - 0.5) * 6 * k).toFixed(2)}px)` : "none";
          });
        });
        if (logo) { const l = ML.out(t, at + 0.6, at + 1.0); logo.style.opacity = l.toFixed(4); logo.style.translate = `0 ${((1 - l) * 10 * k).toFixed(2)}px`; }
      },
    };
  },
});
