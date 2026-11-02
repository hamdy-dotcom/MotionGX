// Ink wick: the target's words soak into paper. The whole rendered word (never split into glyphs, so Arabic stays
// joined) is rasterised twice — a crisp mask with the small bleed halo below the ink threshold, and a wide halo — and a
// WebGL shader on a procedural fibre field (formation clouds + kozo strands, ported from the 3d-paper-material demo)
// thresholds them: visible ink = smoothstep(0.62, 0.85, halo + fibre·0.4 + (0.5 − formation)·0.5), guarded by
// smoothstep(0.03, 0.16, halo) so far fibres never darken. Over the run the halo goes from wide to crisp while its
// strength rises (ease-out), so ink creeps out along the strands first and then sharpens into the letterforms; a damp
// shade under the bleed dries away. A logo (an <svg> or <img> target) soaks in the same way, as one-colour ink: its
// silhouette is the mask. Every frame is a pure function of t (uniforms only, no state).
// Source: MengTo/Skills agent-skills/3d/3d-paper-material/demo.html (MIT) — the noise library, the washi / cotton fibre
// field and the ink threshold, ported to a 2D shader over the target.
ML.define({
  id: "text-in.ink-wick",
  category: "text-in",
  name: "Ink wicks into paper",
  does: "Text or a mark soaks into paper: ink spreads along the fibres from a soft halo into crisp letterforms.",
  says: ["story", "luxury", "reveal", "brand"],
  energy: 2,
  targets: ["headline", "word", "logo", "label"],
  duration: [0.8, 2.5],
  params: {
    speed: { type: "number", range: [0.6, 1.5], default: 1, unit: "s" },
    ink: { type: "choice", options: ["black", "indigo", "brand"], default: "black" },
    paper: { type: "choice", options: ["washi", "rag"], default: "washi" },
  },
  pairs: ["background.grain", "text-in.letter-fade"],
  avoid: ["urgency", "speed", "tech"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "MengTo/Skills:agent-skills/3d/3d-paper-material", license: "MIT", note: "noise + fibre field + ink threshold ported to a 2D WebGL pass over the target" },
  async setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    // a mark can't hold a canvas or be split: it gets a box of its own, and its silhouette stands in for the words
    const mark = /^(svg|img)$/i.test(el.tagName) ? el : null;
    let host = el;
    if (mark) {
      const b = ctx.box(mark);
      host = document.createElement("span");
      Object.assign(host.style, { display: "inline-block", flex: "none", lineHeight: "0", width: b.w + "px", height: b.h + "px" });
      mark.replaceWith(host); host.append(mark);
    }
    const words = mark ? [] : ML.split(el, "words");
    // the canvas takes the face as it is now: make sure each word's face has arrived first
    if (document.fonts) await Promise.all(words.map((w) => { const cs = getComputedStyle(w); return document.fonts.load(`${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, w.textContent).catch(() => null); }));
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    const eb = ctx.box(host), fs0 = mark ? Math.max(eb.h, 24) : parseFloat(getComputedStyle(el).fontSize) || 60;
    const pad = Math.round(fs0 * 0.35);
    const W = Math.ceil(eb.w + pad * 2), H = Math.ceil(eb.h + pad * 2);

    // the ink colour, from the look
    const probe = document.createElement("span");
    const inkVar = { black: "var(--x-ink)", indigo: "color-mix(in srgb, var(--x-ink) 55%, var(--x-accent))", brand: "var(--x-accent)" }[p.ink] || "var(--x-ink)";
    probe.style.color = inkVar; probe.style.display = "none"; host.append(probe);
    // through a canvas: a computed colour may read rgb(0–255) or color(srgb 0–1) depending on how the look wrote it
    const swatch = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    swatch.canvas.width = swatch.canvas.height = 1; swatch.fillStyle = getComputedStyle(probe).color; swatch.fillRect(0, 0, 1, 1);
    const rgb = [...swatch.getImageData(0, 0, 1, 1).data].slice(0, 3).map((v) => v / 255);
    probe.remove();

    // a mark's silhouette, black on clear. An inline svg goes in as an image, so its look colours are resolved first
    // (the shape is all that matters; text inside it falls back to a system face, so real logos should be paths)
    let shape = null;
    if (mark) {
      let pic = mark;
      if (mark.tagName.toLowerCase() === "svg") {
        const c = mark.cloneNode(true), from = [mark, ...mark.querySelectorAll("*")], to = [c, ...c.querySelectorAll("*")];
        from.forEach((n, i) => { const s = getComputedStyle(n); to[i].style.fill = s.fill; to[i].style.stroke = s.stroke; to[i].style.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`; });
        c.setAttribute("xmlns", "http://www.w3.org/2000/svg"); c.setAttribute("width", eb.w); c.setAttribute("height", eb.h);
        pic = new Image(); pic.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(c));
      }
      if (pic.decode) await pic.decode().catch(() => null);
      shape = document.createElement("canvas"); shape.width = W; shape.height = H;
      const s = shape.getContext("2d");
      s.drawImage(pic, pad, pad, eb.w, eb.h); s.globalCompositeOperation = "source-in"; s.fillStyle = "#000"; s.fillRect(0, 0, W, H);
    }

    // rasterise every word at its laid-out place (the canvas shapes Arabic itself)
    const paint = (blurPx, shadow) => {
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const g = c.getContext("2d");
      g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.fillStyle = "#000";
      if (blurPx > 0) g.filter = `blur(${blurPx.toFixed(1)}px)`;
      if (shadow > 0) { g.shadowColor = "rgba(0,0,0,0.78)"; g.shadowBlur = shadow; } // the bleed halo, below the threshold
      if (shape) g.drawImage(shape, 0, 0);
      for (const w of words) {
        const cs = getComputedStyle(w), b = ctx.box(w), rtlW = ML.ARABIC.test(w.textContent);
        g.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        if ("letterSpacing" in g) g.letterSpacing = rtlW || cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing; // joined letters are never spaced
        g.direction = rtlW ? "rtl" : "ltr"; g.textAlign = rtlW ? "right" : "left"; g.textBaseline = "alphabetic";
        const say = cs.textTransform === "uppercase" ? w.textContent.toUpperCase() : cs.textTransform === "lowercase" ? w.textContent.toLowerCase() : cs.textTransform === "capitalize" ? w.textContent.replace(/^\p{L}/u, (c) => c.toUpperCase()) : w.textContent;
        const m = g.measureText(say), size = parseFloat(cs.fontSize);
        const asc = m.fontBoundingBoxAscent || size * 0.8, desc = m.fontBoundingBoxDescent || size * 0.2;
        const x = (rtlW ? b.x + b.w : b.x) - eb.x + pad, y = b.y - eb.y + pad + (b.h - (asc + desc)) / 2 + asc;
        g.fillText(say, x, y);
        if (shadow > 0) { g.lineWidth = size * 0.012; g.strokeStyle = "#000"; g.strokeText(say, x, y); }
      }
      return c;
    };
    const crisp = paint(0, fs0 * 0.05), wide = paint(fs0 * 0.16, 0);

    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    Object.assign(cv.style, { position: "absolute", left: -pad + "px", top: -pad + "px", width: W + "px", height: H + "px", pointerEvents: "none" });
    host.append(cv);
    const gl = cv.getContext("webgl", { preserveDrawingBuffer: true, premultipliedAlpha: true, antialias: false });
    const sharp = (t) => ML.out(t, at, at + p.speed);
    ctx.sfx(at, "swell", 0.2);

    // no WebGL, or a picture from another origin it may not read: a soft fade (still a function of t)
    const soak = () => {
      cv.remove();
      return { draw(t) { const u = sharp(t), lv = ML.clamp((t - (end - 0.25)) / 0.18); host.style.opacity = (u * (1 - lv)).toFixed(4); host.style.filter = !mark && u < 1 ? `blur(${((1 - u) * 6).toFixed(2)}px)` : "none"; } };
    };
    if (!gl) return soak();

    const NOISE = `
      vec2 hash2(vec2 p){ p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3))); return fract(sin(p)*43758.5453123)*2.0-1.0; }
      float gnoise(vec2 x){ vec2 p = floor(x), w = fract(x); vec2 u = w*w*w*(w*(w*6.0-15.0)+10.0);
        float a = dot(hash2(p), w); float b = dot(hash2(p+vec2(1,0)), w-vec2(1,0));
        float c = dot(hash2(p+vec2(0,1)), w-vec2(0,1)); float d = dot(hash2(p+vec2(1,1)), w-vec2(1,1));
        return mix(mix(a,b,u.x), mix(c,d,u.x), u.y)*0.7+0.5; }
      float fbm(vec2 p, int oct){ float s=0.0,a=0.5,n=0.0; for(int i=0;i<8;i++){ if(i>=oct) break; s+=a*gnoise(p); n+=a; p=p*2.03+11.7; a*=0.5; } return s/max(n,1e-4); }
      float ridged(vec2 p, int oct){ float s=0.0,a=0.5,n=0.0; for(int i=0;i<8;i++){ if(i>=oct) break; s+=a*(1.0-abs(gnoise(p)*2.0-1.0)); n+=a; p=p*2.11+5.3; a*=0.5; } return s/max(n,1e-4); }`;
    const vs = `attribute vec2 a; varying vec2 vUv; void main(){ vUv = a*0.5+0.5; gl_Position = vec4(a,0.0,1.0); }`;
    const fsrc = `precision highp float; varying vec2 vUv;
      uniform sampler2D uCrisp, uWide; uniform vec2 uSize; uniform float uScale, uAmp, uSharp, uDry, uOut; uniform vec2 uFa, uFb; uniform vec3 uInk;
      ${NOISE}
      void main(){
        vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uSize;
        vec2 q = px / uScale;
        /* formation — the cloudy thick-and-thin of a couched sheet */
        float form = fbm(q*2.6, 4)*0.62 + fbm(q*7.4, 3)*0.38;
        /* kozo fibres: a warped, turning lattice so no strand runs ruler-straight */
        vec2 qw = q + 0.014*vec2(gnoise(q*6.0) - 0.5, gnoise(q*6.0 + 13.3) - 0.5);
        float ta = (gnoise(q*2.1 + 9.0) - 0.5)*1.5;
        qw = mat2(cos(ta), -sin(ta), sin(ta), cos(ta))*qw;
        float fa = ridged(vec2(qw.x*uFa.x, qw.y*uFa.y), 3);
        float fb = ridged(vec2(qw.x*uFb.x, qw.y*uFb.y), 3);
        float fibre = max(smoothstep(0.91,0.995,fa), smoothstep(0.92,0.995,fb));
        float fa2 = ridged(vec2(qw.x*uFa.x*2.7 + 3.1, qw.y*uFa.y*2.7), 2);
        float fb2 = ridged(vec2(qw.x*uFb.x*2.7, qw.y*uFb.y*2.7 + 7.7), 2);
        fibre = max(fibre, max(smoothstep(0.90,0.99,fa2), smoothstep(0.90,0.99,fb2))*0.55);
        /* the halo: wide early, crisp late, its strength rising */
        float hc = 1.0 - texture2D(uCrisp, vUv).r, hw = 1.0 - texture2D(uWide, vUv).r;
        float halo = mix(hw*1.15, hc, uSharp) * uAmp;
        float ink = smoothstep(0.62, 0.85, halo + fibre*0.40 + (0.5 - form)*0.50 + (gnoise(q*210.0) - 0.5)*0.16) * smoothstep(0.03, 0.16, halo);
        /* the damp shade under the bleed, drying as the ink sets */
        float damp = smoothstep(0.03, 0.5, hw*uAmp) * uDry * (0.6 + 0.4*form) * 0.12;
        float a = clamp(max(ink*0.97, damp), 0.0, 1.0) * uOut;
        gl_FragColor = vec4(uInk * a, a);
      }`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error("ink-wick shader: " + gl.getShaderInfoLog(s)); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fsrc)); gl.linkProgram(prog); gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const tex = (img, unit) => {
      const tx = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    };
    try { tex(crisp, 0); tex(wide, 1); } catch { return soak(); }
    // the canvas holds the ink now
    if (mark) mark.style.visibility = "hidden";
    else { el.style.color = "transparent"; for (const w of words) w.style.color = "transparent"; }
    const U = (n) => gl.getUniformLocation(prog, n);
    gl.uniform1i(U("uCrisp"), 0); gl.uniform1i(U("uWide"), 1);
    gl.uniform2f(U("uSize"), W, H);
    // one sheet unit ≈ the glyph height / 0.64, as in the demo's ink painting
    gl.uniform1f(U("uScale"), fs0 / 0.64);
    const stock = p.paper === "rag" ? { fa: [15, 17], fb: [16, 14] } : { fa: [1.9, 54], fb: [44, 2.3] };
    gl.uniform2f(U("uFa"), stock.fa[0], stock.fa[1]); gl.uniform2f(U("uFb"), stock.fb[0], stock.fb[1]);
    gl.uniform3f(U("uInk"), rgb[0], rgb[1], rgb[2]);
    gl.viewport(0, 0, W, H);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const uAmp = U("uAmp"), uSharp = U("uSharp"), uDry = U("uDry"), uOut = U("uOut");

    return {
      draw(t) {
        const u = ML.lin(t, at, at + p.speed), e = 1 - Math.pow(1 - u, 2.2);
        const leave = ML.clamp((t - (end - 0.25)) / 0.18);
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform1f(uAmp, t < at ? 0 : 0.15 + 0.9 * e);
        gl.uniform1f(uSharp, ML.ease(u, 0.35, 1));
        gl.uniform1f(uDry, t < at ? 0 : Math.min(1, u * 4) * (1 - ML.ease(u, 0.55, 1)));
        gl.uniform1f(uOut, 1 - leave);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      },
    };
  },
});
