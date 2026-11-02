// HUD over photo: the picture goes grayscale at .8 opacity, lightened onto the look's near-black (or duotone: the grey
// picture multiplied by the accent), inside a 1 px faint keyline with the look's shadow. Over it a surveillance overlay:
// a tiny mono uppercase, widest-tracked label top corner that types in per character (steps of .03 s); a crosshair at
// the centre (two 1 px lines, 32 px at 1080, at .3) that grows from its centre (scale 0 → 1, .4 s power3.out) while its
// rotation settles 45° → 0 — or four corner brackets closing in; then a status dot in the accent with a glow that
// pulses every 2 s, with its label. Optional slow push 1 → 1.04 across the scene (inside the mask, never past the
// picture's pixels). RTL: label top-right, status bottom-left.
// Source: MengTo/Skills web-design corner-lasers demo (MIT): the "Cam 04 / Server Rack" photo panel (grayscale
// opacity-80 mix-blend-lighten, 10 px mono white/50 label, pulsing accent dot + "Secure", crosshair lines).
ML.define({
  id: "photo.hud-photo-overlay",
  category: "photo",
  name: "HUD over photo",
  does: "A desaturated photo gets a surveillance-style overlay: a camera label, a pulsing status dot and a faint crosshair locking onto the centre.",
  says: ["tech", "precision", "trust", "focus"],
  energy: 2,
  targets: ["image"],
  duration: [1.5, 6],
  params: {
    label: { type: "text", default: "CAM 04" },
    status: { type: "text", default: "SECURE" },
    crosshair: { type: "choice", options: ["plus", "brackets"], default: "plus" },
    treatment: { type: "choice", options: ["grayscale", "duotone"], default: "grayscale" },
    push: { type: "bool", default: true },
  },
  pairs: ["photo.mono-grain-grade", "text-in.punchline"],
  avoid: ["playful", "celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "MengTo/Skills:agent-skills/web-design/corner-lasers", license: "MIT", note: "the Cam 04 / Server Rack photo panel and its overlay, made a function of t" },
  async setup(ctx) {
    const { el, p, at, end, f, rtl } = ctx;
    if (!el) return null;
    const img = el.tagName === "IMG" ? el : el.querySelector("img");
    if (!img) return null;
    const mk = (tag, css, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (parent) parent.append(e); return e; };
    // the look's dark and light tones (whichever of ground / ink is darker)
    const tone = (v) => { const d = mk("div", `position:absolute;visibility:hidden;color:${v}`, ctx.stage); const c = getComputedStyle(d).color; d.remove(); const m = (c.match(/[\d.]+/g) || [0, 0, 0]).map(Number); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
    const gDark = tone("var(--x-ground)") < tone("var(--x-ink)");
    const dark = gDark ? "var(--x-ground)" : "var(--x-ink)", light = gDark ? "var(--x-ink)" : "var(--x-ground)";

    // the picture's own mask: a box in its place, so the push never spills past its edge
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
    const W = box.offsetWidth, H = box.offsetHeight, s = Math.min(W, H);
    box.style.background = `color-mix(in srgb, ${dark} 96%, ${light})`;
    box.style.boxShadow = "var(--x-shadow)";
    const hud = mk("div", "position:absolute;inset:0;pointer-events:none;z-index:2", box);
    mk("div", `position:absolute;inset:0;border:1px solid color-mix(in srgb, ${light} 10%, transparent);border-radius:inherit`, hud).style.borderRadius = getComputedStyle(box).borderRadius;
    let tint = null;
    if (p.treatment === "duotone") tint = mk("div", "position:absolute;inset:0;background:var(--x-accent);mix-blend-mode:multiply;z-index:1;pointer-events:none", box);
    img.style.transformOrigin = "50% 50%";
    // the look's own picture filter, appended when it has one ("none" cannot join a filter list)
    const lookF = getComputedStyle(box).getPropertyValue("--x-pic-filter").trim();
    const extra = lookF && lookF !== "none" ? " " + lookF : "";
    // the push stays within the picture's pixels
    const natW = img.naturalWidth || W, natH = img.naturalHeight || H;
    const pushTo = p.push ? Math.max(1, Math.min(1.04, Math.min(natW / W, natH / H))) : 1;

    // overlay type: tiny mono, widest tracking in Latin (none in Arabic), white/50 → the light tone at 50%
    const fs = ML.clamp(s * 0.045, 11, 30), m = Math.max(10, s * 0.06);
    const hasAr = (x) => ML.ARABIC.test(x);
    const label = mk("div", `position:absolute;top:${m}px;${rtl ? "right" : "left"}:${m}px;font:500 ${fs.toFixed(1)}px var(--x-mono-font);letter-spacing:${hasAr(p.label) ? "0" : "0.3em"};text-transform:uppercase;color:color-mix(in srgb, ${light} 50%, transparent);white-space:pre`, hud);
    label.setAttribute("dir", "auto");
    const st = mk("div", `position:absolute;bottom:${m}px;${rtl ? "left" : "right"}:${m}px;display:flex;align-items:center;gap:${(fs * 0.7).toFixed(1)}px;flex-direction:${rtl ? "row-reverse" : "row"}`, hud);
    const dot = mk("span", `display:block;width:${(fs * 0.8).toFixed(1)}px;height:${(fs * 0.8).toFixed(1)}px;border-radius:50%;background:var(--x-accent)`, st);
    const stl = mk("span", `font:500 ${fs.toFixed(1)}px var(--x-mono-font);letter-spacing:${hasAr(p.status) ? "0" : "0.3em"};text-transform:uppercase;color:${light};white-space:pre`, st);
    stl.setAttribute("dir", "auto");
    stl.textContent = p.status;
    // the crosshair: 32 px at 1080 (scaled with the picture), 1 px lines at .3
    const ch = Math.max(20, 32 * (Math.min(f.W, f.H) / 1080) * Math.max(1, s / 400));
    const cross = mk("div", `position:absolute;left:${(W - ch) / 2}px;top:${(H - ch) / 2}px;width:${ch}px;height:${ch}px;opacity:.3;transform-origin:50% 50%`, hud);
    const lines = [];
    if (p.crosshair === "brackets") {
      const arm = ch * 0.32;
      for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const b = mk("div", `position:absolute;${x ? "right" : "left"}:0;${y ? "bottom" : "top"}:0;width:${arm}px;height:${arm}px;border-${x ? "right" : "left"}:1px solid ${light};border-${y ? "bottom" : "top"}:1px solid ${light}`, cross);
        lines.push({ e: b, x: x ? 1 : -1, y: y ? 1 : -1 });
      }
    } else {
      lines.push({ e: mk("div", `position:absolute;left:0;top:${ch / 2 - 0.5}px;width:${ch}px;height:1px;background:${light};transform-origin:50% 50%`, cross) });
      lines.push({ e: mk("div", `position:absolute;top:0;left:${ch / 2 - 0.5}px;height:${ch}px;width:1px;background:${light};transform-origin:50% 50%`, cross) });
    }

    // the beats: label types, crosshair locks, then the dot starts pulsing
    const chars = Array.from(String(p.label));
    const tType = at + 0.1, tCross = tType + chars.length * 0.03 + 0.1, tDot = tCross + 0.4;
    const p3 = (x) => 1 - Math.pow(1 - x, 3);
    ctx.sfx(tType, "blip", 0.18);
    ctx.sfx(tCross + 0.32, "blip", 0.22);
    const span = Math.max(0.5, end - at);
    return {
      draw(t) {
        const on = t >= at - 1e-6;
        img.style.filter = on ? `grayscale(${(ML.lin(t, at, at + 0.3)).toFixed(4)})${extra}` : "";
        img.style.opacity = on ? (1 - 0.2 * ML.lin(t, at, at + 0.3)).toFixed(4) : "";
        img.style.mixBlendMode = on ? "lighten" : "";
        if (tint) tint.style.opacity = on ? ML.lin(t, at, at + 0.3).toFixed(4) : "0";
        hud.style.visibility = on ? "visible" : "hidden";
        img.style.scale = on && pushTo > 1 ? (1 + (pushTo - 1) * ML.lin(t, at, at + span)).toFixed(5) : "none";
        if (!on) return;
        // per-character typing in .03 s steps
        const n = Math.max(0, Math.min(chars.length, Math.floor((t - tType) / 0.03 + 1e-6) + 1));
        label.textContent = t < tType ? "" : chars.slice(0, n).join("");
        // the crosshair grows from its centre and settles its rotation
        const u = p3(ML.lin(t, tCross, tCross + 0.4));
        cross.style.visibility = t < tCross ? "hidden" : "visible";
        if (p.crosshair === "brackets") {
          cross.style.rotate = "0deg";
          for (const l of lines) l.e.style.translate = `${(l.x * (1 - u) * ch * 0.6).toFixed(2)}px ${(l.y * (1 - u) * ch * 0.6).toFixed(2)}px`;
          cross.style.opacity = (0.3 * Math.min(1, u * 2)).toFixed(4);
        } else {
          cross.style.rotate = `${(45 * (1 - u)).toFixed(3)}deg`;
          for (const l of lines) l.e.style.scale = u < 1e-4 ? "0" : (l === lines[0] ? `${u.toFixed(4)} 1` : `1 ${u.toFixed(4)}`);
        }
        // the status dot: in with its label, then a 2 s pulse (opacity + glow)
        const a = ML.lin(t, tDot, tDot + 0.2);
        st.style.opacity = a.toFixed(4);
        const ph = t < tDot ? 0 : ((t - tDot) % 2) / 2;
        const pulse = 0.5 + 0.5 * Math.cos(ph * Math.PI * 2);
        dot.style.opacity = (0.45 + 0.55 * pulse).toFixed(4);
        dot.style.boxShadow = `0 0 ${(fs * (0.3 + 0.7 * pulse)).toFixed(2)}px color-mix(in srgb, var(--x-accent) ${(40 + 40 * pulse).toFixed(1)}%, transparent)`;
      },
    };
  },
});
