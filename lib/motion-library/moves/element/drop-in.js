// Drop in and settle. Heavy: the object falls from −120 % of its own height (tilted 0–15°, a vertical motion blur
// while it falls fast) in 0.45 s on power3.in, lands with a small bounce (6 px) and turns −2° → 0 over 0.2 s. Light:
// y −40 px → 0 with scale 0.92 → 1 in 0.45 s on back.out(1.3). A shadow ellipse scales in under it on landing.
// Glow: a 60 px accent box-shadow pulsing once 45 % → 70 % → 45 % over 0.8 s after the landing. From the bottom it rises
// instead (mirrored). The tilt leans with the reading direction. Pictures never get the blur and never pass 100 %.
// Source: prompt-motion "thismacapital-la-video-a-ete", "ajith-io-claude-cooked-really-hard",
// "sudo-kiran-built-a-product-demo" (reference only — rebuilt as our own code).
ML.define({
  id: "element.drop-in",
  category: "element",
  name: "Drop in and settle",
  does: "An object or card falls in from above (tilted, motion-blurred) and lands with a small bounce and a shadow, optionally with a glow rim that pulses once.",
  says: ["arrival", "playful", "reveal", "result"],
  energy: 3,
  targets: ["image", "logo", "card", "screen"],
  duration: [0.5, 1.2],
  params: {
    weight: { type: "choice", options: ["heavy", "light"], default: "heavy" },
    from: { type: "choice", options: ["top", "bottom"], default: "top" },
    tilt: { type: "number", range: [0, 15], default: 8, unit: "deg" },
    motion_blur: { type: "bool", default: true },
    glow: { type: "bool", default: false },
    bounce: { type: "number", range: [0, 12], default: 6, unit: "px" },
  },
  pairs: ["element.fade-rise", "text-in.punchline", "camera.impact-shake"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "land",
  source: { from: "prompt-motion:thismacapital-la-video-a-ete", license: "reference", note: "also ajith-io-claude-cooked-really-hard, sudo-kiran-built-a-product-demo; rebuilt as our own code" },
  setup(ctx) {
    const { p, at, f, rtl } = ctx;
    const doc = document;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080;
    let el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    if (!el) {
      const holder = mk("div", `position:absolute;left:${f.pic.x}px;top:${f.pic.y}px;width:${f.pic.w}px;height:${f.pic.h}px;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:6;`, host);
      el = mk("div", `display:grid;gap:${18 * k}px;padding:${40 * k}px;width:${Math.min(f.pic.w * 0.7, 560 * k)}px;box-sizing:border-box;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:var(--x-radius);box-shadow:var(--x-shadow);`, holder);
      mk("div", `height:${150 * k}px;border-radius:calc(var(--x-radius) * .6);background:linear-gradient(140deg, var(--x-accent), var(--x-accent-2));`, el);
      mk("div", `height:${22 * k}px;width:70%;border-radius:999px;background:var(--x-ink);opacity:.85;`, el);
      mk("div", `height:${16 * k}px;width:45%;border-radius:999px;background:var(--x-dim);opacity:.6;`, el);
    }
    const pic = el.tagName === "IMG" || el.tagName === "VIDEO" || !!el.querySelector?.("img,video,canvas");
    const b = ctx.box(el);
    const heavy = p.weight !== "light";
    const sign = p.from === "bottom" ? -1 : 1; // +1: falls from above
    const lean = rtl ? -1 : 1;
    const tilt = ML.clamp(p.tilt, 0, 15) * lean;
    const fall = heavy ? Math.min(b.h * 1.2, f.H * 0.45) : 40 * k;
    const bounce = ML.clamp(p.bounce, 0, 12) * k;
    const D = 0.45, land = at + D;

    // a vertical-only blur for the fall (feGaussianBlur stdDeviation "0 y"); never on pictures
    const blurOn = heavy && p.motion_blur && !pic;
    let blurNode = null, fid = "";
    if (blurOn) {
      window.__mlDropIn = (window.__mlDropIn || 0) + 1;
      fid = `ml-drop-in-blur-${window.__mlDropIn}`;
      const svg = doc.createElementNS(NS, "svg");
      svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
      svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;";
      svg.innerHTML = `<defs><filter id="${fid}" x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="0 0"/></filter></defs>`;
      host.append(svg);
      blurNode = svg.querySelector("feGaussianBlur");
    }
    // the ground shadow: just before the object, so the object (transformed, later in order) paints over it
    const sw = b.w * 0.8, sh = Math.max(10 * k, b.h * 0.07);
    const shadow = doc.createElement("div");
    shadow.style.cssText = `position:absolute;left:0;top:0;width:${sw}px;height:${sh}px;border-radius:50%;background:radial-gradient(closest-side, color-mix(in srgb, var(--x-ink) 30%, transparent), transparent);pointer-events:none;opacity:0;margin:0;`;
    el.before(shadow);
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    const op = shadow.offsetParent || host, ob = ctx.box(op);
    shadow.style.left = `${b.x - ob.x - (op.clientLeft || 0) + (b.w - sw) / 2}px`;
    shadow.style.top = `${b.y - ob.y - (op.clientTop || 0) + b.h - sh * 0.5}px`;
    const prevShadow = el.style.boxShadow || "";
    ctx.sfx(heavy ? land : at + 0.18, heavy ? "land" : "land.light", heavy ? 0.45 : 0.3);
    if (p.glow) ctx.sfx(land + 0.1, "swell", 0.2);
    const backOut = (x, c = 1.3) => { const y = x - 1; return 1 + (c + 1) * y * y * y + c * y * y; };
    return {
      draw(t) {
        if (t < at) { el.style.opacity = "0"; shadow.style.opacity = "0"; return; }
        let y, rot = 0, sc = 1, o, blur = 0;
        if (heavy) {
          const x = ML.lin(t, at, land), e = x * x * x; // power3.in
          y = -sign * (1 - e) * fall;
          o = ML.lin(t, at, at + 0.12);
          if (t < land) { rot = tilt * (1 - e * 0.6); blur = 12 * k * Math.sin(Math.PI * Math.min(1, x * 1.05)) * Math.min(1, x * 3); }
          else {
            const u = ML.lin(t, land, land + 0.2); // the bounce and the −2° → 0 settle
            y = -sign * bounce * Math.sin(Math.PI * u) * (1 - u * 0.4);
            rot = -2 * lean * (1 - ML.out(t, land, land + 0.2)) * Math.min(1, ML.lin(t, land, land + 0.04) * 3);
          }
        } else {
          const x = ML.lin(t, at, land), e = backOut(x);
          y = -sign * (1 - e) * fall;
          sc = 0.92 + 0.08 * e;
          rot = tilt * 0.4 * (1 - e);
          o = ML.out(t, at, at + 0.2);
        }
        if (pic) sc = Math.min(sc, 1);
        el.style.opacity = o.toFixed(4);
        el.style.translate = Math.abs(y) < 0.01 ? "none" : `0 ${y.toFixed(2)}px`;
        el.style.rotate = Math.abs(rot) < 1e-3 ? "none" : `${rot.toFixed(3)}deg`;
        el.style.scale = Math.abs(sc - 1) < 1e-4 ? "none" : sc.toFixed(4);
        if (blurOn) {
          blurNode.setAttribute("stdDeviation", `0 ${blur.toFixed(2)}`);
          el.style.filter = blur > 0.05 ? `url(#${fid})` : "none";
        }
        // the shadow: scales in under it as it nears the ground
        const g = heavy ? ML.out(t, land - 0.2, land + 0.1) : ML.out(t, at, land);
        shadow.style.opacity = (g * 0.9).toFixed(4);
        shadow.style.scale = `${(0.4 + 0.6 * g).toFixed(4)} ${(0.6 + 0.4 * g).toFixed(4)}`;
        if (p.glow) {
          const gu = ML.lin(t, land, land + 0.8), a = t < land ? 0.45 * ML.lin(t, at, land) : 0.45 + 0.25 * Math.sin(Math.PI * gu);
          el.style.boxShadow = `${prevShadow ? prevShadow + ", " : ""}0 0 ${60 * k}px color-mix(in srgb, var(--x-accent) ${(a * 100).toFixed(1)}%, transparent)`;
        }
      },
    };
  },
});
