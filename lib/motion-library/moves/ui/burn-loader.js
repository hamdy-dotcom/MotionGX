// Burn loader ("kindling"): a dark layer over everything; a small burning ring opens in its middle while a tiny tracked
// label 24 vh below centre counts up to 100. The progress is scripted from t with the fire-paper-loader's numbers: a
// creep toward 0.38·(1 − e^(−t/0.8 s)) held under WAIT 0.290 and easing toward CEIL 0.335 (τ 2.5 s), never still
// (≥ VMIN 0.016/s, ≤ VMAX 0.05/s); on "done" a Hermite run from the creep speed to V_HAND 0.24/s over
// clamp(2.8·du / vH, 0.30, 1.2) s reaching HAND 0.36 — the label lands on 100 and fades (0.40 s after 0.12 s) — then
// after `hold` the ring keeps opening along the intro curve for 1.8 s until it leaves the frame, and the layer fades in
// 0.12 s. A beat shorter than all that plays the whole script faster, so it always finishes by `end`. The ring is our
// own fragment shader (seeded value noise, no clock): radius T = prog·1.62 − 0.30 of the half diagonal at 0.67 scale
// until the hand-off, a torn arc first whose ends crawl round and meet, a ragged lip, a smooth ember ramp hot → ember →
// deep (no white, no drawn outline), porous char behind it, sparks rising, and the page through the hole. Every ember
// colour comes from the look (--x-bad / --x-accent / --x-good), the hot end by walking its hue.
// Source: MengTo/Skills web-design/fire-paper-loader (demo.html: pacing constants and the burn's shape, MIT).
ML.define({
  id: "ui.burn-loader",
  category: "ui",
  name: "Kindling progress loader",
  does: "On a dark layer a small ember ring burns open while a tiny tracked label counts up to 100, then the label fades and the ring burns away to the page.",
  says: ["time", "change", "arrival", "tech"],
  energy: 3,
  targets: ["stage"],
  duration: [1.5, 3],
  params: {
    label: { type: "text", default: "KINDLING" },
    counter: { type: "bool", default: true },
    hold: { type: "number", range: [0, 1.5], default: 0.4, unit: "s" },
    ember: { type: "choice", options: ["bad", "accent", "good"], default: "bad" },
  },
  pairs: [],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "riser",
  source: { from: "MengTo/Skills:web-design/fire-paper-loader", license: "MIT" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const W = f.W, H = f.H, k = Math.min(W, H) / 1080;
    const layer = mk("div", "position:absolute;inset:0;pointer-events:none;z-index:20;", host);
    // the look's colours, resolved once
    const rgb = (v) => { const e = mk("span", `color:${v};display:none`, layer); const m = (getComputedStyle(e).color.match(/[\d.]+/g) || [0, 0, 0]).map(Number); e.remove(); return [m[0] / 255, m[1] / 255, m[2] / 255]; };
    const EMB = rgb(`var(--x-${p.ember})`), DARK = rgb("var(--x-device)");
    // the label and the fallback's core: whichever of the look's ink / panel stands out on the dark layer
    const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    const INK = rgb("var(--x-ink)"), PANEL = rgb("var(--x-panel)");
    const inkWins = Math.abs(lum(INK) - lum(DARK)) > Math.abs(lum(PANEL) - lum(DARK));
    const CORE = inkWins ? INK : PANEL, LABEL = inkWins ? "var(--x-ink)" : "var(--x-panel)";
    const RES = 0.6; // the burn is soft: drawn at 60 % and shown at size
    let cv = mk("canvas", "position:absolute;inset:0;width:100%;height:100%;", layer);
    cv.width = Math.round(W * RES); cv.height = Math.round(H * RES);
    const lab = mk("div", `position:absolute;left:0;right:0;top:${H * 0.74}px;text-align:center;font:var(--x-label-weight) ${Math.max(20, 26 * k).toFixed(1)}px var(--x-label-font);letter-spacing:${rtl ? 0 : "0.26em"};text-transform:${rtl ? "none" : "uppercase"};color:${LABEL};white-space:pre;direction:${rtl ? "rtl" : "ltr"};`, layer);
    const labWord = mk("span", "opacity:0.6", lab), labNum = mk("span", `letter-spacing:${rtl ? 0 : "0.06em"}`, lab);

    // ── the progress, scripted from t (fire-paper-loader pacing) ──
    const HAND = 0.36, WAIT = 0.29, CEIL = 0.335, VMIN = 0.016, VMAX = 0.05, V_HAND = 0.24;
    const creep = Math.max(0.6, (end - at) * 0.3);
    const goal = (s) => { const g = Math.min(0.38 * (1 - Math.exp(-s / 0.8)), WAIT); return g + (CEIL - g) * (1 - Math.exp(-Math.max(0, s - 1.2) / 2.5)) * (g >= WAIT - 1e-4 ? 1 : 0); };
    // integrate the creep once in setup (fixed step, so it is the same every time): speed clamped to [VMIN, VMAX]
    const N = Math.ceil(creep / 0.01), C = [0];
    for (let i = 1; i <= N; i++) { const s = i * 0.01, prev = C[i - 1], v = ML.clamp((goal(s) - prev) / 0.25, VMIN, VMAX); C.push(Math.min(CEIL, prev + v * 0.01)); }
    const creepAt = (s) => { const x = ML.clamp(s / 0.01, 0, N), i = Math.floor(x), fr = x - i; return C[i] + (C[Math.min(N, i + 1)] - C[i]) * fr; };
    const u0 = creepAt(creep), v0 = (creepAt(creep) - creepAt(creep - 0.05)) / 0.05;
    const du = HAND - u0, dd = ML.clamp((2.8 * du) / V_HAND, 0.3, 1.2);
    const tDone = at + creep, tHand = tDone + dd, tGo = tHand + 0.12 + 0.4 + p.hold;
    // the run out: 1.8 s in the source, shortened (never under 0.6 s) when the beat is shorter
    const INTRO = ML.clamp(end - tGo - 0.25, 0.6, 1.8), tOut = tGo + INTRO;
    const prog = (t) => {
      if (t <= at) return 0;
      if (t < tDone) return creepAt(t - at);
      if (t < tHand) { const x = (t - tDone) / dd, h00 = 2 * x ** 3 - 3 * x ** 2 + 1, h10 = x ** 3 - 2 * x ** 2 + x, h01 = -2 * x ** 3 + 3 * x ** 2, h11 = x ** 3 - x ** 2; return h00 * u0 + h10 * dd * v0 + h01 * HAND + h11 * dd * V_HAND; }
      if (t < tGo) return HAND + 0.006 * (t - tHand); // never still
      const x = ML.clamp((t - tGo) / INTRO), u = 1 - Math.pow(1 - x, 1.7); const base = HAND + 0.006 * (tGo - tHand); return base + (1 - base) * (V_HAND * INTRO / (1 - base) * x * (1 - x) * (1 - x) + u * u * (3 - 2 * u));
    };
    // the script runs at z of its pace when the beat is shorter than it (draw reads it at tt, so it ends by `end`)
    const z = Math.min(1, Math.max(0.3, end - at) / (tOut + 0.12 - at));
    const real = (x) => at + (x - at) * z;
    ctx.sfx(at, "riser", 0.3);
    ctx.sfx(real(tHand), "blip", 0.35);
    ctx.sfx(real(tGo), "whoosh.soft", 0.35);

    // ── the burn: our own shader ──
    const VS = "attribute vec2 a; void main(){ gl_Position=vec4(a,0.0,1.0); }";
    const FS = `precision highp float;
uniform vec2 uRes; uniform float uProg, uTime, uPx; uniform vec3 uEmb, uDark;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 x){ vec2 i=floor(x), f=fract(x); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(h(i), h(i+vec2(1,0)), u.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*n(p); p=p*2.03+11.7; a*=0.5; } return s; }
void main(){
  vec2 uv=gl_FragCoord.xy/uRes; float asp=uRes.x/uRes.y;
  vec2 p=(uv-0.5)*vec2(asp,1.0);
  // while it loads the ring burns at 0.67 scale, clear of the label; past the hand-off it grows to full
  float sc=0.67+0.33*smoothstep(0.335,0.55,uProg);
  float maxR=length(vec2(asp,1.0)*0.5)*sc;
  float px2T=uPx/(maxR*uRes.y);
  float T=uProg*1.62-0.30;
  float eps=(9.0+3.0*smoothstep(0.0,0.15,uProg)+6.0*smoothstep(0.15,0.22,uProg))*px2T;
  float sx=(T-eps)/0.006; // a soft max; past e^40 exp() would overflow to infinity and the whole layer would vanish at once
  float Tv=eps+(sx>40.0?T-eps:0.006*log(1.0+exp(sx)));
  float r=length(p)/maxR; vec2 dir=p/max(length(p),1e-5);
  // a ragged lip: broad bays (bigger while small: a tear, capped once it is wide) and fine fibres a few px deep
  float bays=(fbm(dir*1.6+vec2(5.1,2.3))-0.5)*mix(0.9,0.22,smoothstep(0.0,0.3,Tv))*min(Tv,0.35);
  float fibPx=(fbm(dir*5.0+p*7.0+vec2(0.0,uTime*0.35))-0.5)*(3.0+22.0*smoothstep(0.02,0.3,Tv));
  float dpx=(r-Tv-bays)/px2T-fibPx; // stage px outside the lip (negative: burnt side)
  float heat=smoothstep(0.0,0.2,uProg);
  // the ramp, every colour derived from the look's ember: hot (its hue walked toward the next channel: red → gold) → ember → deep
  vec3 emb=uEmb, hot=min(emb+0.6*emb.brg,vec3(1.0)), deep=emb*0.28;
  // it starts as a torn arc, a little over half round, whose ends crawl round and meet
  vec2 q=vec2(p.x*0.45-p.y*0.89, p.x*0.89+p.y*0.45);
  float ang=abs(atan(q.y,q.x))/3.14159, cov=mix(0.6,1.12,smoothstep(0.04,0.17,uProg));
  float arc=1.0-smoothstep(cov-0.07,cov,ang);
  // heat runs along the edge, patches flicker
  float run=fbm(dir*3.0+vec2(uTime*0.9,-uTime*0.6));
  float flk=0.82+0.36*n(dir*7.0+vec2(uTime*7.0,0.0));
  float d=-dpx;
  float zone=(4.0+24.0*heat)*(0.7+0.9*fbm(dir*4.0+3.7));
  float e=clamp(d/zone,0.0,1.0);
  vec3 ramp=mix(hot*1.1,emb,smoothstep(0.0,0.5,e)); ramp=mix(ramp,deep,smoothstep(0.5,1.0,e));
  float ember=smoothstep(1.2,-0.6,dpx)*(1.0-smoothstep(0.85,1.25,d/zone))*arc*clamp((0.55+0.95*run)*flk,0.0,1.0);
  // char behind the ember: near black with fibre grain, porous toward the hole
  float inside=smoothstep(0.5,-0.5,dpx);
  vec3 charC=uDark*(0.3+0.6*fbm(p*vec2(90.0,120.0)));
  float charW=3.0+15.0*heat;
  float pore=smoothstep(0.6,0.72,fbm(p*55.0+9.0));
  float holeD=d-(zone+charW+(fbm(dir*9.0+p*18.0)-0.5)*22.0*heat)+pore*12.0*heat;
  float hole=smoothstep(-2.0,2.0,holeD)*smoothstep(0.14,0.2,uProg);
  float glow=exp(-max(dpx,0.0)/(10.0+34.0*heat))*0.38*flk*arc;
  vec3 col=uDark+emb*glow*(1.0-inside);
  col=mix(col,charC,inside);
  col=mix(col,ramp,ember);
  // sparks rising off the lip (seeded per cell, carried up by t)
  vec2 g=vec2(p.x*46.0, p.y*46.0-uTime*3.2); vec2 cell=floor(g), fc=fract(g)-0.5;
  float dotS=step(0.93,h(cell+1.3))*(1.0-smoothstep(0.05,0.14,length(fc-(vec2(h(cell+7.0),h(cell+11.0))-0.5)*0.6)));
  float env=smoothstep(2.0,14.0,dpx)*exp(-dpx/(40.0+150.0*heat))*smoothstep(-0.2,0.5,dir.y)*smoothstep(0.03,0.16,uProg);
  col+=hot*dotS*env*(0.5+0.5*sin(uTime*9.0+h(cell)*6.28));
  gl_FragColor=vec4(min(col,vec3(1.0)),1.0-hole);
}`;
    let gl = null, prog_, U = {};
    try {
      gl = cv.getContext("webgl", { alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false });
      if (gl) {
        const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
        prog_ = gl.createProgram();
        gl.attachShader(prog_, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog_, sh(gl.FRAGMENT_SHADER, FS));
        gl.bindAttribLocation(prog_, 0, "a"); gl.linkProgram(prog_);
        if (!gl.getProgramParameter(prog_, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog_));
        gl.useProgram(prog_);
        const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        for (const u of ["uRes", "uProg", "uTime", "uPx", "uEmb", "uDark"]) U[u] = gl.getUniformLocation(prog_, u);
        gl.viewport(0, 0, cv.width, cv.height);
        gl.uniform2f(U.uRes, cv.width, cv.height); gl.uniform1f(U.uPx, RES);
        gl.uniform3fv(U.uEmb, EMB); gl.uniform3fv(U.uDark, DARK);
      }
    } catch (e) { gl = null; }
    // a canvas that took a webgl context cannot give a 2d one: the fallback starts on a fresh copy
    if (!gl) { const fresh = cv.cloneNode(); cv.replaceWith(fresh); cv = fresh; }
    const c2 = gl ? null : cv.getContext("2d");
    const css = (c, a = 1) => `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`;
    const paint = (u, t) => {
      if (gl) { gl.uniform1f(U.uProg, u); gl.uniform1f(U.uTime, t); gl.drawArrays(gl.TRIANGLES, 0, 3); return; }
      // a plain fallback: dark with a glowing hole
      const w = cv.width, h = cv.height, maxR = Math.hypot(w, h) / 2, R = Math.max(5 * RES, (u * 1.62 - 0.3) * maxR);
      c2.clearRect(0, 0, w, h); c2.fillStyle = css(DARK); c2.fillRect(0, 0, w, h);
      c2.globalCompositeOperation = "destination-out"; c2.beginPath(); c2.arc(w / 2, h / 2, R, 0, Math.PI * 2); c2.fill();
      c2.globalCompositeOperation = "source-over";
      const g = c2.createRadialGradient(w / 2, h / 2, Math.max(0, R - 10 * RES), w / 2, h / 2, R + 30 * RES);
      g.addColorStop(0, css(EMB, 0)); g.addColorStop(0.25, css(CORE, 0.9)); g.addColorStop(0.45, css(EMB, 0.9)); g.addColorStop(1, css(EMB, 0));
      c2.fillStyle = g; c2.beginPath(); c2.arc(w / 2, h / 2, R + 30 * RES, 0, Math.PI * 2); c2.fill();
    };
    const word = p.label === "KINDLING" && rtl ? "جارٍ الإشعال" : p.label;
    return {
      draw(t0) {
        const t = at + (t0 - at) / z;
        const on = t >= at - 1e-6 && t < tOut + 0.12;
        layer.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        const u = prog(t);
        paint(Math.min(u, 1.2), t0 - at);
        layer.style.opacity = (1 - ML.lin(t, tOut, tOut + 0.12)).toFixed(4);
        const n = t >= tHand ? 100 : Math.min(99, Math.floor((100 * u) / HAND));
        labWord.textContent = word; labNum.textContent = p.counter ? `  ${n}` : "";
        lab.style.opacity = (ML.lin(t, at, at + 0.15) * (1 - ML.lin(t, tHand + 0.12, tHand + 0.52))).toFixed(4);
      },
    };
  },
});
