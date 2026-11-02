// Paper burn: a ragged ember front burns through the old scene and the next one is revealed behind it. Three layers
// a frame: the old scene beneath (as it stands: give the scene no other move while it burns, the source's "frozen
// frame"), the incoming scene behind the front (the next ground, --x-next-ground when the film sets it, with the
// chapter's title), and the burn over both, decided per pixel from one signed distance xc to a seeded noisy front.
// Line: front = -0.26 + 1.62 rc of the sweep, rc = clamp((f - 0.01) / 0.97), linear, in and out off the frame, 3 s by
// default, sweeping from the side the incoming words sit. Iris: a torn ember arc a little over half round whose ends
// crawl round and meet, its radius growing in log space (equal steps of ln R read equal at every size) and finishing
// on 1 - (1 - x)^1.7 to the open frame; "close" burns in from the edges instead. Silhouette per seed: 2.0-3.6 broad
// bays of depth 0.055-0.115 and fine terms (integer harmonics on the circle so the ring closes), licking tongues.
// Shader: ahead a 20-40 px scorch tan -> brown by tk^2; the ember zone 12-66 px on a linear heat ramp deep red ->
// orange -> gold -> hot gold (gold, never cream); a beading thread (0.9 + 2.6 heat) x bead px with a tight glow;
// behind 3-6 px of flaky crust then 26 px of porous near-black char whose pores open with age (no glowing rims). Heat
// pulses both ways along the edge, flickers at 7 Hz, rolls back through the zone, ~1.8 px shimmer near the front;
// ACES, sRGB, grain 0.003. Everything is a function of t (seeded hash noise, no clock). DOM render: the source's line
// version — the incoming layer clipped behind the front, the flame band (#0a0806 / #3a1a08 / #ff7a1f / gold stops) as
// bands along the ragged front, a screen-blend glow and the smoky veil ahead, f on sine.inOut. Cinders: seeded sparks
// shed off the front, rising and dying. Without WebGL the shader falls back to the DOM render.
// Source: MengTo/Skills paper-cinder-transition SKILL.md (MIT: the composite, the ramp, char and timing constants),
// fire-paper-loader SKILL.md (MIT: the iris ring growing in log space) and horizontal-scroll-scenes demo.html (MIT:
// the DOM line version, its clip, flame band, glow and veil).
ML.define({
  id: "transition.paper-burn",
  category: "transition",
  name: "Paper burn",
  does: "A ragged glowing ember front (a growing ring or a sweeping line) burns through the old scene, charring it, and the next scene is revealed behind it.",
  says: ["transition", "change", "reveal", "energy", "story"],
  energy: 4,
  targets: ["scene", "stage"],
  duration: [1.2, 5],
  params: {
    shape: { type: "choice", options: ["line", "iris"], default: "line" },
    direction: { type: "choice", options: ["from-text-side", "ltr", "rtl", "from-bottom", "close"], default: "from-text-side" },
    duration: { type: "number", range: [1.2, 5], default: 3, unit: "s" },
    palette: { type: "choice", options: ["ember", "brand-heat", "magenta-cyan"], default: "ember" },
    render: { type: "choice", options: ["shader", "dom"], default: "shader" },
    cinders: { type: "bool", default: false },
  },
  pairs: ["text-in.mask-rise", "transition.colour-field-cut"],
  avoid: ["calm", "simplicity"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.heavy",
  source: { from: "MengTo/Skills:agent-skills/web-design/paper-cinder-transition/SKILL.md", license: "MIT", note: "with fire-paper-loader/SKILL.md and horizontal-scroll-scenes/demo.html + SKILL.md (MIT)" },
  async setup(ctx) {
    const { p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, S = Math.min(W, H), k = S / 1080;
    const dur = Math.max(0.6, Math.min(ML.clamp(+p.duration || 3, 1.2, 5), end - at - 0.05));
    const t1 = at + dur;
    const hb = host === stage ? { x: 0, y: 0 } : ctx.box(host);

    // ── the incoming scene: the next ground with the chapter's title, revealed behind the front ──
    const inc = document.createElement("div");
    inc.setAttribute("aria-hidden", "true");
    inc.style.cssText = "position:absolute;inset:0;z-index:6;pointer-events:none;visibility:hidden;background:var(--x-next-ground, var(--x-device));color:var(--x-next-ink, var(--x-ground))";
    host.append(inc);
    const head = host.querySelector(".ml-title") || host.querySelector(".ml-hero");
    let hbx = { x: W * 0.1, y: H * 0.4, w: W * 0.8, h: H * 0.1 };
    if (head) {
      const text = head.textContent.trim();
      try { const cs = getComputedStyle(head); await document.fonts.load(`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, text || "A"); } catch (e) { /* measure as is */ }
      const b = ctx.box(head);
      hbx = { x: b.x - hb.x, y: b.y - hb.y, w: b.w, h: b.h };
      const title = document.createElement("div");
      title.className = head.className;
      title.setAttribute("dir", ctx.rtl ? "rtl" : "ltr");
      title.textContent = text;
      title.style.cssText = `position:absolute;left:${hbx.x.toFixed(1)}px;top:${hbx.y.toFixed(1)}px;width:${hbx.w.toFixed(1)}px;text-align:${getComputedStyle(head).textAlign}`;
      inc.append(title);
    }

    // ── geometry: the sweep, the seed, the silhouette (the same functions in JS and in the shader) ──
    const iris = p.shape === "iris" || p.direction === "close";
    const close = p.direction === "close";
    let side = p.direction; // ltr | rtl | from-bottom
    if (side === "from-text-side" || side === "close") {
      const cx = (hbx.x + hbx.w / 2) / W;
      side = Math.abs(cx - 0.5) < 0.08 ? (ctx.rtl ? "rtl" : "ltr") : cx > 0.5 ? "rtl" : "ltr";
    }
    const axisY = side === "from-bottom";
    const Ls = axisY ? H : W, Lp = axisY ? W : H; // along the sweep / along the front
    // (a, v): a along the sweep from its start side, v along the front → stage x, y
    const toXY = (a, v) => (axisY ? [v, H - a] : side === "rtl" ? [W - a, v] : [a, v]);
    const seed = 1 + Math.floor(ML.rnd(Math.round(at * 100) + 3, 17) * 1000);
    const R = (i) => ML.rnd(seed, i);
    const bays = 2.0 + 1.6 * R(1), depth = 0.055 + 0.06 * R(2), lean = (R(7) - 0.5) * 0.07;
    const ph = [R(3), R(4), R(5), R(6)].map((x) => x * Math.PI * 2);
    const B1 = Math.max(2, Math.round(bays)), B2 = Math.round(bays * 2.3);
    const TAU = Math.PI * 2;
    // line: the front's offset (in short sides) at v in 0..1 along it
    const nLine = (v, t) => depth * (0.6 * Math.sin(TAU * bays * 0.5 * v + ph[0]) + 0.25 * Math.sin(TAU * bays * 1.15 * v + ph[1])) + lean * (v - 0.5)
      + 0.007 * Math.sin(TAU * 9.7 * v + ph[2] + 1.1 * t) + 0.0025 * Math.sin(TAU * 23.3 * v + ph[3] - 2.8 * t);
    // iris: the relative radius change at angle th (integer harmonics: the ring closes)
    const nCirc = (th, t) => depth * (0.6 * Math.sin(B1 * th + ph[0]) + 0.25 * Math.sin(B2 * th + ph[1]))
      + 0.014 * Math.sin(10 * th + ph[2] + 1.1 * t) + 0.006 * Math.sin(23 * th + ph[3] - 2.8 * t);
    // the iris opens round the incoming words
    const C = { x: hbx.x + hbx.w / 2, y: hbx.y + hbx.h / 2 };
    const far = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => Math.hypot(x - C.x, y - C.y)));
    const R0 = 9 * k, Rmax = far * 1.32 + 70 * k;
    const th0 = R(8) * TAU;
    const sine = (x) => -(Math.cos(Math.PI * x) - 1) / 2;
    // the clock of the burn
    const state = (t) => {
      const raw = ML.lin(t, at, t1);
      const fr = p.render === "dom" && !iris ? sine(raw) : raw;
      if (!iris) { const rc = ML.clamp((fr - 0.01) / 0.97); return { front: (-0.26 + 1.62 * rc) * Ls, arc: 1, rad: 0 }; }
      if (close) { const g = 1 - Math.pow(1 - raw, 1.7); return { front: 0, arc: 1, rad: Math.max(0, Rmax * (1 - g)) }; }
      const g = 1 - Math.pow(1 - raw, 1.7);
      const rad = R0 * Math.exp(Math.log(Rmax / R0) * g);
      const arc = 0.56 + 0.44 * ML.clamp(raw / 0.22) ** 0.8; // a torn arc a little over half round, its ends meeting
      return { front: 0, arc, rad };
    };

    // ── the incoming layer's clip: the burnt side of xc = 0 ──
    const clipPath = (t, st) => {
      const pts = [];
      if (!iris) {
        const n = 72;
        for (let i = 0; i <= n; i++) { const v = i / n; pts.push(toXY(st.front + nLine(v, t) * S, v * Lp)); }
        pts.push(toXY(-W - H, Lp), toXY(-W - H, 0));
        return `path("M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z")`;
      }
      const n = 120;
      for (let i = 0; i <= n; i++) {
        const th = (i / n) * TAU;
        let r = st.rad * (1 + nCirc(th, t));
        if (!close && st.arc < 1) { let d = Math.abs(((th - th0 + Math.PI * 3) % TAU) - Math.PI); const half = st.arc * Math.PI; if (d > half) r = Math.max(0, r - (d - half) * st.rad * 1.4); }
        pts.push([C.x + Math.cos(th) * r, C.y + Math.sin(th) * r]);
      }
      const ring = `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
      return close ? `path(evenodd, "M-20 -20L${W + 20} -20L${W + 20} ${H + 20}L-20 ${H + 20}Z${ring}")` : `path("${ring}")`;
    };

    // ── palettes: physical ember constants (linear light), the look's heat, or magenta-cyan ──
    const probe = document.createElement("div"); host.append(probe);
    const rgbOf = (cssVar) => { probe.style.color = `var(${cssVar})`; const m = getComputedStyle(probe).color.match(/[\d.]+/g) || [0, 0, 0]; return m.slice(0, 3).map((x) => Math.pow(+x / 255, 2.2)); };
    const lin3 = (a, b, x) => a.map((v, i) => v + (b[i] - v) * x);
    let PAL;
    if (p.palette === "brand-heat") {
      const a1 = rgbOf("--x-accent"), a2 = rgbOf("--x-accent-2");
      PAL = { deep: a1.map((v) => v * 0.28), mid: a1.map((v) => v * 1.0), gold: lin3(a1, a2, 0.6).map((v) => v * 1.1), hot: a2.map((v) => v * 1.15 + 0.08), thrA: a2.map((v) => v * 1.4 + 0.1), thrB: a2.map((v) => v * 1.7 + 0.3) };
    } else if (p.palette === "magenta-cyan") {
      PAL = { deep: [0.22, 0.01, 0.16], mid: [0.82, 0.06, 0.52], gold: [0.42, 0.36, 1.0], hot: [0.3, 0.86, 1.1], thrA: [0.5, 1.1, 1.4], thrB: [0.9, 1.5, 1.8] };
    } else {
      PAL = { deep: [0.34, 0.022, 0.003], mid: [0.86, 0.2, 0.024], gold: [1.02, 0.38, 0.055], hot: [1.1, 0.64, 0.17], thrA: [1.4, 0.56, 0.09], thrB: [1.85, 1.02, 0.3] };
    }
    probe.remove();
    const cssRGB = (c, a = 1) => `rgba(${c.map((v) => Math.round(255 * Math.pow(Math.min(1, v), 1 / 2.2))).join(",")},${a})`;

    // ── the burn layer: a WebGL composite pass, or the DOM line version ──
    let gl = null, prog = null, U = {}, canvas = null;
    if (p.render !== "dom") {
      canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      canvas.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;z-index:7;pointer-events:none;visibility:hidden`;
      gl = canvas.getContext("webgl", { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false, alpha: true });
      if (gl) {
        const vs = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
        const fs = `precision highp float;
uniform vec2 uRes;uniform float uT,uK,uS,uFront,uIris,uClose,uRad,uArc,uTh0,uSide,uLs,uLp,uBays,uDepth,uLean,uB1,uB2;uniform vec4 uPh;uniform vec2 uC;
uniform vec3 cDeep,cMid,cGold,cHot,cThrA,cThrB;
const float TAU=6.2831853;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float nLine(float v){return uDepth*(0.6*sin(TAU*uBays*0.5*v+uPh.x)+0.25*sin(TAU*uBays*1.15*v+uPh.y))+uLean*(v-0.5)+0.007*sin(TAU*9.7*v+uPh.z+1.1*uT)+0.0025*sin(TAU*23.3*v+uPh.w-2.8*uT);}
float nCirc(float th){return uDepth*(0.6*sin(uB1*th+uPh.x)+0.25*sin(uB2*th+uPh.y))+0.014*sin(10.*th+uPh.z+1.1*uT)+0.006*sin(23.*th+uPh.w-2.8*uT);}
vec3 aces(vec3 x){return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.,1.);}
void main(){
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  float xc,s;
  if(uIris<0.5){
    float a=uSide<0.5?px.x:(uSide<1.5?uRes.x-px.x:uRes.y-px.y);
    float v=uSide>1.5?px.x:px.y;
    float F=uFront+nLine(v/uLp)*uS;
    float d=(nLine((v+4.)/uLp)-nLine((v-4.)/uLp))*uS/8.;
    xc=(a-F)/sqrt(1.+d*d);s=v;
  }else{
    vec2 q=px-uC;float r=length(q);float th=atan(q.y,q.x);if(th<0.)th+=TAU;
    float Rt=uRad*(1.+nCirc(th));
    if(uClose<0.5&&uArc<1.){float dd=abs(mod(th-uTh0+3.*3.14159265,TAU)-3.14159265);float half_=uArc*3.14159265;if(dd>half_)Rt=max(0.,Rt-(dd-half_)*uRad*1.4);}
    float dR=uRad*(nCirc(th+0.01)-nCirc(th-0.01))/0.02;
    xc=(uClose>0.5?(Rt-r):(r-Rt))/sqrt(1.+pow(dR/max(r,1.),2.));s=th*max(uRad,40.*uK);
  }
  float k=uK;
  // heat: pulses along the edge both ways, a 7 Hz flicker, a roll back through the zone
  float heat=0.5+0.28*sin(s*0.018/k-uT*1.30)+0.22*sin(s*0.027/k+uT*1.70+1.3);
  heat+=0.10*sin(uT*7.*TAU+s*0.05/k)+0.08*sin(xc*0.12/k+uT*2.6);
  heat=clamp(heat+0.25*(vn(vec2(s*0.02/k,uT*0.8))-0.5),0.,1.);
  // shimmer: about 1.8 px near the front
  xc+=1.8*k*sin(s*0.08/k+uT*19.)*exp(-abs(xc)/(18.*k));
  float zone=(12.+54.*heat)*k;
  float scorch=(20.+20.*vn(vec2(s*0.01/k,3.)))*k;
  vec3 col=vec3(0.);float al=0.;
  if(xc>zone){
    float tk=1.-clamp((xc-zone)/scorch,0.,1.);
    col=mix(vec3(0.80,0.62,0.42),vec3(0.20,0.10,0.045),tk*tk);al=tk*tk*0.92;
  }else if(xc>0.){
    float e=1.-xc/zone; // 0 at the scorch side, 1 at the front
    float h=e*(0.55+0.45*heat);
    col=h<0.42?mix(cDeep,cMid,h/0.42):(h<0.76?mix(cMid,cGold,(h-0.42)/0.34):mix(cGold,cHot*(0.30+0.70*heat),clamp((h-0.76)/0.24,0.,1.)));
    al=smoothstep(0.,0.18,e);
    col=mix(vec3(0.20,0.10,0.045),col,al);al=max(al,0.92);
  }else{
    float back=-xc;
    float crust=(3.+3.*vn(vec2(s*0.06/k,7.)))*k;
    float bedEdge=crust+(26.+8.*(vn(vec2(s*0.08/k,11.))-0.5)*2.+3.*(vn(vec2(s*0.25/k,13.))-0.5)*2.)*k;
    if(back<crust){col=mix(vec3(0.20,0.07,0.02),vec3(0.05,0.025,0.012),back/crust);al=1.;}
    else if(back<bedEdge){
      float age=(back-crust)/(bedEdge-crust);
      float pore=vn(px/(5.*k))*0.6+vn(px/(13.*k))*0.4;
      float cover=step(age*0.75,pore*1.05-0.05);
      col=vec3(0.0085,0.0062,0.0048);al=cover*(1.-smoothstep(0.85,1.,age));
    }
  }
  // the thread: a beading bright line on the front, and its tight glow
  float bead=0.5+vn(vec2(s*0.06/k-uT*0.8,5.));
  float tw=(0.9+2.6*heat)*bead*k;
  float d=abs(xc+0.5*tw);
  float th_=exp(-pow(d/max(tw,0.5),2.));
  float glow=exp(-d/((2.+2.8*heat)*k))*0.6;
  vec3 thr=mix(cThrA,cThrB,heat);
  col=col*al+thr*th_+vec3(0.95,0.20,0.022)*glow;
  al=clamp(max(al,max(th_,glow*0.85)),0.,1.);
  vec3 o=aces(col*1.05);
  o=pow(o,vec3(1./2.2));
  o+=0.003*(hash(px+fract(uT*24.))-0.5);
  gl_FragColor=vec4(o*al,al);
}`;
        const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error("paper-burn shader: " + gl.getShaderInfoLog(s)); return s; };
        try {
          prog = gl.createProgram();
          gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog);
          gl.useProgram(prog);
          const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
          const loc = gl.getAttribLocation(prog, "a"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
          for (const n of ["uRes", "uT", "uK", "uS", "uFront", "uIris", "uClose", "uRad", "uArc", "uTh0", "uSide", "uLs", "uLp", "uBays", "uDepth", "uLean", "uB1", "uB2", "uPh", "uC", "cDeep", "cMid", "cGold", "cHot", "cThrA", "cThrB"]) U[n] = gl.getUniformLocation(prog, n);
          gl.uniform2f(U.uRes, W, H); gl.uniform1f(U.uK, k); gl.uniform1f(U.uS, S);
          gl.uniform1f(U.uIris, iris ? 1 : 0); gl.uniform1f(U.uClose, close ? 1 : 0); gl.uniform1f(U.uTh0, th0);
          gl.uniform1f(U.uSide, side === "ltr" ? 0 : side === "rtl" ? 1 : 2); gl.uniform1f(U.uLs, Ls); gl.uniform1f(U.uLp, Lp);
          gl.uniform1f(U.uBays, bays); gl.uniform1f(U.uDepth, depth); gl.uniform1f(U.uLean, lean); gl.uniform1f(U.uB1, B1); gl.uniform1f(U.uB2, B2);
          gl.uniform4f(U.uPh, ph[0], ph[1], ph[2], ph[3]); gl.uniform2f(U.uC, C.x, C.y);
          for (const [n, c] of [["cDeep", PAL.deep], ["cMid", PAL.mid], ["cGold", PAL.gold], ["cHot", PAL.hot], ["cThrA", PAL.thrA], ["cThrB", PAL.thrB]]) gl.uniform3f(U[n], c[0], c[1], c[2]);
          host.append(canvas);
        } catch (e) { console.warn(String(e)); gl = null; }
      }
    }
    // DOM render (and the shader's fallback), and the cinders: one 2D canvas, cleared and painted whole every frame
    let c2 = null, g2 = null, bands = [];
    if (!gl || p.cinders) {
      c2 = document.createElement("canvas");
      c2.width = W; c2.height = H;
      c2.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;z-index:8;pointer-events:none;visibility:hidden`;
      host.append(c2);
      g2 = c2.getContext("2d");
    }
    const smoke = cssRGB(PAL.deep.map((v) => v * 0.03));
    if (!gl) {
      // [from, to] px of xc (+ ahead), fill: the source's smoky veil, 240 px glow, then the flame band's stops and char
      bands = [
        ...(!iris ? [[20 * k, Ls * 0.34, "veil"]] : []),
        [-170 * k, 70 * k, cssRGB(PAL.mid, 0.16), "screen"],
        [30 * k, 56 * k, cssRGB([0.2, 0.1, 0.045], 0.55)], // scorch
        [-30 * k, -4 * k, cssRGB([0.0085, 0.0062, 0.0048])], // char
        [-4 * k, 0, cssRGB([0.14, 0.05, 0.016])], // crust
        [0, 30 * k, cssRGB(PAL.deep)],
        [4 * k, 22 * k, cssRGB(PAL.mid)],
        [8 * k, 15 * k, cssRGB(PAL.gold)],
        [-1.6 * k, 2.4 * k, cssRGB(PAL.hot)], // the thread
      ].map(([a, b, fill, blend]) => ({ a, b, fill, blend }));
    }
    const bandPts = (t, st, a, b) => {
      const pts1 = [], pts2 = [];
      if (!iris) {
        const n = 60;
        for (let i = 0; i <= n; i++) {
          const v = i / n, F = st.front + nLine(v, t) * S, rag = (ML.rnd(i, seed) - 0.5) * 6 * k;
          pts1.push(toXY(F + a + rag, v * Lp)); pts2.push(toXY(F + b - rag, v * Lp));
        }
      } else {
        const n = 120, sg = close ? -1 : 1;
        for (let i = 0; i <= n; i++) {
          const th = (i / n) * TAU, rag = (ML.rnd(i, seed) - 0.5) * 6 * k;
          let r = st.rad * (1 + nCirc(th, t));
          if (!close && st.arc < 1) { const d = Math.abs(((th - th0 + Math.PI * 3) % TAU) - Math.PI), half = st.arc * Math.PI; if (d > half) r = Math.max(0, r - (d - half) * st.rad * 1.4); }
          const r1 = Math.max(0, r + sg * (a + rag)), r2 = Math.max(0, r + sg * (b - rag));
          pts1.push([C.x + Math.cos(th) * r1, C.y + Math.sin(th) * r1]); pts2.push([C.x + Math.cos(th) * r2, C.y + Math.sin(th) * r2]);
        }
      }
      return pts1.concat(pts2.reverse());
    };

    // ── cinders: sparks shed off the front, rising and dying (seeded, a function of t) ──
    const sparks = !p.cinders ? [] : Array.from({ length: 46 }, (_, i) => ({ r: (1.5 + 3 * ML.rnd(i, 41)) * k, born: at + dur * (0.05 + 0.9 * ML.rnd(i, 42)), v: ML.rnd(i, 43), life: 0.8 + 0.8 * ML.rnd(i, 44), drift: (ML.rnd(i, 45) - 0.5) * 120 * k, rise: (160 + 220 * ML.rnd(i, 46)) * k }));

    ctx.sfx(at, "whoosh.heavy", 0.5);
    if (dur > 2.2) ctx.sfx(at + dur * 0.55, "whoosh.soft", 0.2);
    return {
      draw(t) {
        const burning = t >= at && t < t1;
        inc.style.visibility = t >= at ? "visible" : "hidden";
        if (t < at) { if (canvas) canvas.style.visibility = "hidden"; if (c2) c2.style.visibility = "hidden"; return; }
        const st = state(t);
        inc.style.clipPath = burning ? clipPath(t, st) : "none";
        if (gl) {
          canvas.style.visibility = burning ? "visible" : "hidden";
          if (burning) {
            gl.viewport(0, 0, W, H);
            gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
            gl.uniform1f(U.uT, t - at); gl.uniform1f(U.uFront, st.front); gl.uniform1f(U.uRad, st.rad); gl.uniform1f(U.uArc, st.arc);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
          }
        }
        if (!c2) return;
        g2.setTransform(1, 0, 0, 1, 0, 0);
        g2.globalCompositeOperation = "source-over";
        g2.clearRect(0, 0, W, H);
        let painted = false;
        if (burning) for (const b of bands) {
          const pts = bandPts(t - at, st, b.a, b.b);
          g2.beginPath(); pts.forEach(([x, y], i) => (i ? g2.lineTo(x, y) : g2.moveTo(x, y))); g2.closePath();
          if (b.fill === "veil") {
            const [x0, y0] = toXY(st.front + b.a, 0), [x1, y1] = toXY(st.front + b.b, 0);
            const gr = axisY ? g2.createLinearGradient(0, y0, 0, y1) : g2.createLinearGradient(x0, 0, x1, 0);
            gr.addColorStop(0, smoke.replace(/,1\)$/, ",.88)")); gr.addColorStop(0.4, smoke.replace(/,1\)$/, ",.52)")); gr.addColorStop(1, smoke.replace(/,1\)$/, ",0)"));
            g2.fillStyle = gr;
          } else g2.fillStyle = b.fill;
          g2.globalCompositeOperation = b.blend || "source-over";
          g2.fill();
          painted = true;
        }
        g2.globalCompositeOperation = "source-over";
        for (const s of sparks) {
          const age = (t - s.born) / s.life;
          if (age < 0 || age > 1) continue;
          const sb = state(s.born);
          let x0, y0;
          if (!iris) [x0, y0] = toXY(sb.front + nLine(s.v, s.born - at) * S, s.v * Lp);
          else { const th = s.v * TAU, r = sb.rad * (1 + nCirc(th, s.born - at)); x0 = C.x + Math.cos(th) * r; y0 = C.y + Math.sin(th) * r; }
          const e = 1 - Math.pow(1 - age, 2);
          g2.globalAlpha = (1 - age) * (age < 0.1 ? age / 0.1 : 1);
          g2.fillStyle = cssRGB(lin3(PAL.hot, PAL.deep, age));
          g2.beginPath(); g2.arc(x0 + s.drift * e + Math.sin(age * 9 + s.v * 20) * 6 * k, y0 - s.rise * e, s.r, 0, TAU); g2.fill();
          g2.globalAlpha = 1;
          painted = true;
        }
        c2.style.visibility = painted ? "visible" : "hidden";
      },
    };
  },
});
