// Product orbit: the camera swings around a hero product and shows its depth without ever turning it edge-on. The
// source's 2D port: the target becomes a layered slab in perspective (its own face in front, a stack of edge plates
// behind for thickness, a contact shadow on the floor and a soft fog-to-horizon floor glow), turned by rotateY (azimuth)
// and rotateX (elevation) with parallax between the layers. Two paths, as the source:
//   sway — azimuth bounded ±0.30 rad (the `azimuth` param), elevation ±0.09 rad; the deterministic touch sway
//          sin(0.55 t)·0.6·bound and sin(0.37 t + 1)·0.5·bound, raised by a gain that rises on tau 0.30 s, and settled
//          home at the end with the closed form angle(t) = target + (a0 − target)·e^(−4.5 t);
//   swing — a one-way turntable swing, azimuth 0 → `swing_to` on sine.inOut over the shot, elevation 8° → 12°.
// The slab is pushed back so its nearest edge sits on the picture plane: nothing is ever magnified under the 3D
// transform (it can only shrink a little), so pictures and text stay sharp. idle_part: a slow light glint crossing the
// face keeps it alive. RTL: the direction mirrors.
// Sources: MengTo/Skills 3d/3d-orbit-inspect-demo (AZ_MAX 0.30, EL_MAX 0.09, the touch sway, 1 − e^(−4.5 dt), GAIN_TAU
// 0.30) (MIT); prompt-motion buildfastwithai (the turntable swing; reference only).
ML.define({
  id: "camera.product-orbit",
  category: "camera",
  name: "Orbit around a hero product",
  does: "The camera swings around a product — a bounded left-right/up-down sway, or a one-way turntable swing from front to three-quarter — revealing its depth without ever turning it edge-on.",
  says: ["focus", "precision", "luxury", "proof"],
  energy: 2,
  targets: ["image", "logo", "screen", "card", "stage"],
  duration: [3, 8],
  params: {
    path: { type: "choice", options: ["sway", "swing"], default: "sway" },
    azimuth: { type: "number", range: [10, 45], default: 17, unit: "deg" },
    swing_to: { type: "number", range: [20, 45], default: 40, unit: "deg" },
    amplitude: { type: "number", range: [0.3, 1], default: 0.6, unit: "of-bound" },
    speed: { type: "number", range: [0.3, 0.8], default: 0.55, unit: "rad/s" },
    axis: { type: "choice", options: ["yaw", "yaw+pitch"], default: "yaw+pitch" },
    direction: { type: "choice", options: ["left", "right"], default: "left" },
    idle_part: { type: "bool", default: false },
  },
  pairs: ["camera.slow-push", "camera.macro-push-detail"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:3d/3d-orbit-inspect-demo", license: "MIT", note: "sway bounds, touch sway, damping from demo.html; turntable swing after prompt-motion buildfastwithai-opus-5-5-high-just (reference); 2D port per the source's note" },
  setup(ctx) {
    const { el, p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const own = el && el !== stage && el !== host ? el : null;

    // ── the rig: a box standing where the target stood, the target inside it as the slab's face ──
    let rig, slab, BW, BH, radius;
    slab = document.createElement("div");
    if (own) {
      const cs = getComputedStyle(own);
      const r = own.getBoundingClientRect(), k = host.getBoundingClientRect().width / (host.offsetWidth || 1) || 1;
      BW = own.offsetWidth || r.width / k; BH = own.offsetHeight || r.height / k;
      radius = cs.borderRadius && cs.borderRadius !== "0px" ? cs.borderRadius : own instanceof SVGElement ? "0px" : "var(--x-radius)";
      rig = document.createElement("div");
      const pinned = cs.position === "absolute" || cs.position === "fixed";
      if (pinned) { own.style.position = "relative"; own.style.left = "0"; own.style.top = "0"; }
      rig.style.cssText = `position:${pinned ? cs.position + `;left:${cs.left};top:${cs.top}` : "relative"};width:${BW}px;height:${BH}px;flex:none;margin:${cs.margin};align-self:${cs.alignSelf};justify-self:${cs.justifySelf};grid-area:${cs.gridArea}`;
      own.parentNode.insertBefore(rig, own);
      own.style.margin = "0"; own.style.width = BW + "px"; own.style.height = BH + "px"; own.style.boxSizing = "border-box";
      slab.style.cssText = `position:absolute;inset:0;transform-style:preserve-3d`;
      rig.append(slab);
    } else {
      BW = f.W; BH = f.H; radius = "0px";
      rig = host;
      slab.style.cssText = `position:absolute;inset:0;transform-style:preserve-3d`;
      while (host.firstChild) slab.append(host.firstChild);
      host.append(slab);
    }
    const isSvgLogo = own instanceof SVGElement;
    // the floor: a soft glow fading to the horizon, and the contact shadow under the slab
    const floor = document.createElement("div");
    floor.style.cssText = `position:absolute;left:-20%;right:-20%;top:${own ? 70 : 78}%;height:${own ? 70 : 30}%;pointer-events:none;background:radial-gradient(ellipse 50% 40% at 50% 30%, color-mix(in srgb, var(--x-panel) 60%, transparent), transparent 75%)`;
    const shadow = document.createElement("div");
    shadow.style.cssText = `position:absolute;left:8%;right:8%;top:${own ? 94 : 92}%;height:${own ? 16 : 8}%;pointer-events:none;background:radial-gradient(ellipse 50% 50% at 50% 50%, color-mix(in srgb, var(--x-ink) 26%, transparent), transparent 70%)`;
    if (own) { rig.insertBefore(shadow, rig.firstChild); rig.insertBefore(floor, rig.firstChild); }
    // thickness: edge plates behind the face (an svg logo gets none: it has no box to give a side)
    const depth = Math.min(BW, BH) * (own ? 0.06 : 0.02), plates = [];
    const nP = Math.round(ML.clamp(depth / 2.5, 6, 24)); // about 2.5 px a plate, so the side reads solid at any size
    if (own && !isSvgLogo) for (let i = nP; i >= 1; i--) {
      const d = document.createElement("div");
      d.style.cssText = `position:absolute;inset:0;border-radius:${radius};pointer-events:none;background:color-mix(in srgb, var(--x-panel-2) ${(100 - (i / nP) * 36).toFixed(0)}%, var(--x-dim));transform:translateZ(${((-depth * i) / nP).toFixed(2)}px)`;
      slab.insertBefore(d, slab.firstChild);
      plates.push(d);
    }
    if (own) { slab.append(own); own.style.transform = "translateZ(0.5px)"; }
    // the idle glint
    const glint = document.createElement("div");
    glint.style.cssText = `position:absolute;inset:0;border-radius:${radius};pointer-events:none;overflow:hidden;transform:translateZ(1px);mix-blend-mode:screen`;
    const band = document.createElement("div");
    band.style.cssText = "position:absolute;top:-20%;bottom:-20%;width:30%;background:linear-gradient(90deg, transparent, color-mix(in srgb, var(--x-panel) 42%, transparent), transparent);transform:skewX(-18deg)";
    glint.append(band);
    if (p.idle_part) slab.append(glint);

    // ── the camera path ──
    const AZ = (ML.clamp(p.azimuth, 10, 45) * Math.PI) / 180, EL = 0.09, amp = ML.clamp(p.amplitude, 0.3, 1), sp = ML.clamp(p.speed, 0.3, 0.8);
    const dirn = (p.direction === "left" ? 1 : -1) * (ctx.rtl ? -1 : 1);
    const pitch = p.axis === "yaw+pitch";
    const settleAt = Math.max(at + 1, end - 0.7);
    const sineIO = (x) => -(Math.cos(Math.PI * x) - 1) / 2;
    const swayAt = (t) => {
      const tau = Math.max(0, t - at), g = 1 - Math.exp(-tau / 0.3);
      return [dirn * g * Math.sin(sp * tau) * AZ * amp, pitch ? g * Math.sin(0.37 * tau + 1) * EL * 0.5 - g * Math.sin(1) * EL * 0.5 : 0];
    };
    const pose = (t) => {
      if (p.path === "swing") {
        const u = sineIO(ML.lin(t, at, end - 0.1));
        return [(dirn * ML.clamp(p.swing_to, 20, 45) * Math.PI * u) / 180, ((pitch ? 8 + 4 * u : 8) * Math.PI) / 180];
      }
      if (t <= settleAt) return swayAt(t);
      const a0 = swayAt(settleAt), k = Math.exp(-4.5 * (t - settleAt));
      return [a0[0] * k, a0[1] * k];
    };
    const P = 2.4 * Math.max(BW, BH);
    ctx.sfx(at, "whoosh.soft", 0.14);

    return {
      draw(t) {
        const [az, elv] = pose(t);
        // pushed back so the nearest corner sits on the picture plane: never magnified
        const near = (BW / 2) * Math.abs(Math.sin(az)) + (BH / 2) * Math.abs(Math.sin(elv)) + depth;
        slab.style.transform = `perspective(${P.toFixed(0)}px) translateZ(${(-near).toFixed(2)}px) rotateX(${(-elv).toFixed(5)}rad) rotateY(${az.toFixed(5)}rad)`;
        // the shadow and the floor glow slide against the slab (the parallax between layers)
        const sx = -Math.sin(az) * BW * 0.08;
        shadow.style.transform = `translateX(${sx.toFixed(2)}px) scaleX(${(1 - 0.25 * Math.abs(Math.sin(az))).toFixed(4)})`;
        floor.style.transform = `translateX(${(sx * 0.4).toFixed(2)}px)`;
        if (p.idle_part) {
          const cyc = ((Math.max(0, t - at) / 2.6) % 1);
          band.style.left = `${(-40 + cyc * 180).toFixed(2)}%`;
          glint.style.opacity = (Math.sin(Math.PI * cyc) * 0.9).toFixed(3);
        }
      },
    };
  },
});
