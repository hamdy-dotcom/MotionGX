// Page macro drift: the camera hangs close over a page at an angle and drifts slowly while the lines above and below go
// soft. The page is the live scene (or the target screen / picture) laid out larger with CSS zoom — so the closeness is
// real layout, re-rasterised sharp, never a bitmap scaled up — then tilted in perspective with nothing in front of the
// picture plane (the near edge sits at scale 1, everything else recedes, so nothing is magnified under 3D). Two set-ups:
// a grazing angle (rotateX 45–70°, top edge receding to a horizon just above the frame) or a close tilt (rotateX
// 10–45° with rotateZ −4°). The drift travels along the page plane (left, right, diagonal or up; 20–240 px over the
// shot, near-linear). Depth of field: three stacked blur bands at the top and three at the bottom (blur/3, 2·blur/3,
// blur), each faded in by a gradient mask, so the blur grows with distance from the focus line. Optional warm light
// pool (screen-blended radial in the look's panel colour) and a dark vignette. Exit: hold, or a whip-pan — the page
// flies sideways under a heavy horizontal-only motion blur (an SVG Gaussian with σy = 0) in the last 0.32 s.
// RTL: left and right drifts mirror. Pictures are never laid out past their size (a picture target keeps zoom 1).
// Sources: prompt-motion itisrazak "WTF made with a single…" and ajith-io "OMG I asked Claude…" (reference only —
// rebuilt as our own code).
ML.define({
  id: "camera.page-macro-drift",
  category: "camera",
  name: "Close drift over a tilted page with shallow focus",
  does: "The camera hangs close over a printed or live page at an angle, drifting slowly while lines above and below go soft.",
  says: ["story", "calm", "luxury", "focus"],
  energy: 2,
  targets: ["screen", "image", "stage"],
  duration: [2, 5],
  params: {
    angle: { type: "number", range: [10, 70], default: 18, unit: "deg" },
    drift: { type: "choice", options: ["left", "right", "diagonal", "up"], default: "left" },
    distance: { type: "number", range: [20, 240], default: 120, unit: "px" },
    blur: { type: "number", range: [4, 10], default: 8, unit: "px" },
    light_pool: { type: "bool", default: false },
    exit: { type: "choice", options: ["hold", "whip"], default: "hold" },
  },
  pairs: ["camera.slow-push", "transition.blur-swap"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "prompt-motion:itisrazak-wtf-made-with-single", license: "reference", note: "also ajith-io-omg-i-asked-claude; technique rebuilt as our own code" },
  setup(ctx) {
    const { el, p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const own = el && el !== stage && el !== host ? el : null;
    const isPic = !!own && (own.tagName === "IMG" || own.tagName === "VIDEO" || own.tagName === "CANVAS");
    const NS = "http://www.w3.org/2000/svg";
    const uid = "mlpd" + Math.floor(ML.rnd((own ? own.offsetWidth : f.W) + at * 13, 5) * 1e6);

    // the frame we look through: the scene itself, or a clip box standing where the target stood
    let frame, BW, BH;
    const zoomer = document.createElement("div");
    if (own) {
      const cs = getComputedStyle(own);
      BW = own.offsetWidth || own.getBoundingClientRect().width; BH = own.offsetHeight || own.getBoundingClientRect().height;
      frame = document.createElement("div");
      frame.style.cssText = `position:relative;overflow:hidden;width:${BW}px;height:${BH}px;flex:none;border-radius:${cs.borderRadius};margin:${cs.margin};align-self:${cs.alignSelf};justify-self:${cs.justifySelf};grid-area:${cs.gridArea}`;
      own.parentNode.insertBefore(frame, own);
      own.style.margin = "0"; own.style.width = BW + "px"; own.style.height = BH + "px"; own.style.boxSizing = "border-box";
      zoomer.append(own);
    } else {
      frame = host; BW = f.W; BH = f.H;
      while (host.firstChild) zoomer.append(host.firstChild);
    }
    // closeness as layout: zoom the page (never a picture past its size)
    const angle = ML.clamp(p.angle, 10, 70), grazing = angle >= 45;
    const rad = (angle * Math.PI) / 180;
    // a grazing view foreshortens the page by cos(angle): lay it out that much larger so it still fills the frame
    const kz = isPic ? 1 : grazing ? Math.min(2.8, 1.1 / Math.cos(rad)) : 1.5;
    zoomer.style.cssText = `position:relative;width:${BW}px;height:${BH}px;zoom:${kz}`;
    const page = document.createElement("div");
    const PW = BW * kz, PH = BH * kz;
    // the camera: perspective deep enough that the horizon sits above the frame
    const P = Math.max(1.1 * BH * Math.tan(rad), (grazing ? 2.2 : 2.6) * Math.max(BW, BH));
    // the tilt pivots on the frame's bottom edge (nothing comes in front of the picture plane); the page's centre is
    // placed where, once tilted, it projects to the middle of the frame: d·cos·P / (P + d·sin) = BH / 2
    const dC = (0.5 * BH * P) / Math.max(1, P * Math.cos(rad) - 0.5 * BH * Math.sin(rad));
    const left = (BW - PW) / 2, top = BH - dC - PH / 2;
    page.style.cssText = `position:absolute;left:${left}px;top:${top}px;width:${PW}px;height:${PH}px;transform-origin:${BW / 2 - left}px ${BH - top}px`;
    page.append(zoomer);
    // a horizontal-only motion blur for the whip
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.style.position = "absolute";
    svg.innerHTML = `<filter id="${uid}" x="-20%" y="0" width="140%" height="100%"><feGaussianBlur stdDeviation="0 0"/></filter>`;
    const gauss = svg.querySelector("feGaussianBlur");
    frame.append(svg, page);

    // depth of field: stacked blur bands, top (far) and bottom (near)
    const B = ML.clamp(p.blur, 4, 10);
    const bands = [];
    for (const side of ["top", "bottom"]) {
      [[0.34, 1 / 3], [0.24, 2 / 3], [0.14, 1]].forEach(([h, k]) => {
        const hh = side === "top" ? h * (grazing ? 1.25 : 1) : h * 0.8;
        const d = document.createElement("div");
        const dirn = side === "top" ? "to bottom" : "to top";
        d.style.cssText = `position:absolute;left:0;right:0;${side}:0;height:${(hh * 100).toFixed(1)}%;pointer-events:none;z-index:3;-webkit-mask-image:linear-gradient(${dirn}, #000 35%, transparent);mask-image:linear-gradient(${dirn}, #000 35%, transparent)`;
        frame.append(d);
        bands.push({ d, k });
      });
    }
    const pool = document.createElement("div");
    pool.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:4;mix-blend-mode:screen;background:radial-gradient(ellipse 48% 34% at 46% 44%, color-mix(in srgb, var(--x-panel) 55%, var(--x-accent-2) 8%), transparent 72%)";
    const vig = document.createElement("div");
    vig.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:4;background:radial-gradient(ellipse 85% 75% at 50% 50%, transparent 50%, color-mix(in srgb, var(--x-ink) 30%, transparent))";
    if (p.light_pool) frame.append(pool, vig);

    // the camera
    const rz = grazing ? 0 : -4 * (ctx.rtl ? -1 : 1);
    const mir = ctx.rtl ? -1 : 1;
    const dist = ML.clamp(p.distance, 20, 240) * (Math.max(BW, BH) / 1080);
    const dv = p.drift === "left" ? [-mir, 0] : p.drift === "right" ? [mir, 0] : p.drift === "up" ? [0, -1] : [-0.8 * mir, -0.6];
    const whip = p.exit === "whip";
    const wD = 0.32, tW = whip ? Math.max(at + 0.4, end - wD - 0.02) : end;
    const wx = p.drift === "right" ? mir : -mir; // a whip runs on in the drift's sideways direction
    ctx.sfx(at, "whoosh.soft", 0.14);
    if (whip) ctx.sfx(tW, "whoosh.heavy", 0.35);

    return {
      draw(t) {
        // near-linear drift with soft ends
        const u = ML.lin(t, at, tW), s = 0.8 * u + 0.2 * (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
        let dx = dv[0] * dist * s, dy = dv[1] * dist * s;
        const w = whip ? ML.lin(t, tW, tW + wD) : 0, we = w * w * w;
        const wxOff = wx * BW * 1.3 * we;
        page.style.transform = `perspective(${P.toFixed(0)}px) rotateX(${angle.toFixed(2)}deg) rotateZ(${rz}deg) translate(${(dx + wxOff).toFixed(2)}px, ${dy.toFixed(2)}px)`;
        const sx = whip ? 70 * Math.sin(Math.PI * Math.min(1, w * 1.1)) : 0;
        gauss.setAttribute("stdDeviation", `${sx.toFixed(2)} 0`);
        zoomer.style.filter = sx > 0.05 ? `url(#${uid})` : "none";
        page.style.opacity = whip ? (1 - ML.lin(w, 0.55, 1)).toFixed(4) : "1";
        // the focus bands ease in with the camera
        const fe = ML.ease(t, at - 0.1, at + 0.5);
        for (const bd of bands) { const v = B * bd.k * fe; const fl = v > 0.05 ? `blur(${v.toFixed(2)}px)` : "none"; bd.d.style.backdropFilter = fl; bd.d.style.webkitBackdropFilter = fl; }
        if (p.light_pool) { pool.style.opacity = (0.85 * fe).toFixed(3); vig.style.opacity = fe.toFixed(3); }
      },
    };
  },
});
