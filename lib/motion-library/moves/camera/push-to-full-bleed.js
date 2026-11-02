// Push until the frame drops away. Window chrome: the scene sits inside an app window (title bar, soft shadow, small
// radius) at ~1/amount of the frame (≈ 92% at 1.1) on a flat wall; the camera scales 1 → amount over ~0.5 s
// power3.inOut around the window's content, so its edges and title bar pass off-screen and the content lands exactly
// full-bleed at its own size (scale 1: the content was laid out at full frame and shown at 1/amount, never enlarged).
// Picture frame: the picture sits in a mat with a caption card; the group scales 1 → amount over ~1 s cubic in-out while
// the mat and the card fade 1 → 0 in 0.5 s (the mat softening), and the wall darkens up to the picture's edge.
// mode push-past keeps the chrome until it leaves the frame; dissolve fades it out on the way. direction out plays it
// backwards: full-bleed content pulls back into its window / frame. RTL: the title bar's lights sit on the right.
// Source: prompt-motion lester-tyy-opus-5-5-is-crazy and mandelduck-single-prompt-with-opus (reference only): rebuilt as
// our own code, a pure function of t.
ML.define({
  id: "camera.push-to-full-bleed",
  category: "camera",
  name: "Push until the frame drops away",
  does: "The camera pushes into a framed window or picture until its chrome or frame leaves and the content fills the screen.",
  says: ["focus", "reveal", "transition", "calm"],
  energy: 2,
  targets: ["screen", "image", "scene"],
  duration: [0.5, 1.5],
  params: {
    chrome: { type: "choice", options: ["window", "frame"], default: "window" },
    mode: { type: "choice", options: ["push-past", "dissolve"], default: "push-past" },
    direction: { type: "choice", options: ["in", "out"], default: "in" },
    amount: { type: "number", range: [1.08, 1.2], default: 1.1, unit: "x" },
    duration: { type: "number", range: [0.5, 1.2], default: 0.6, unit: "s" },
  },
  pairs: ["camera.slow-push", "camera.screen-focus", "transition.element-expand-to-frame"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:lester-tyy-opus-5-5-is-crazy", license: "reference", note: "also mandelduck-single-prompt-with-opus; our own rebuild" },
  setup(ctx) {
    const { el, p, at, stage, f } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, A = ML.clamp(p.amount, 1.08, 1.2);
    const D = ML.clamp(p.duration, 0.5, 1.2);
    const pic = el && el.tagName === "IMG" ? el : host.querySelector("img");
    const chrome = p.chrome === "frame" && pic ? "frame" : "window";
    const short = Math.min(W, H);
    const rig = document.createElement("div"); // the camera
    rig.style.cssText = "position:absolute;inset:0;transform-origin:0 0;z-index:5";
    const wall = document.createElement("div");
    wall.style.cssText = "position:absolute;inset:0;background:color-mix(in srgb, var(--x-ink) 7%, var(--x-ground))";
    const cw = W / A, ch = H / A;
    let C, parts;

    if (chrome === "window") {
      const hb = Math.round(short * 0.044);
      const left = (W - cw) / 2, top = (H - ch - hb) / 2;
      const shadow = document.createElement("div");
      shadow.style.cssText = `position:absolute;left:${left}px;top:${top}px;width:${cw}px;height:${ch + hb}px;border-radius:calc(var(--x-radius) * 0.4);box-shadow:var(--x-shadow)`;
      const win = document.createElement("div");
      win.style.cssText = `position:absolute;left:${left}px;top:${top}px;width:${cw}px;height:${ch + hb}px;overflow:hidden;border-radius:calc(var(--x-radius) * 0.4);background:var(--x-ground);background-image:var(--x-ground-image)`;
      const bar = document.createElement("div");
      bar.style.cssText = `position:absolute;left:0;top:0;right:0;height:${hb}px;background:var(--x-panel);border-bottom:var(--x-edge) solid var(--x-edge-color);display:flex;align-items:center;gap:${Math.round(hb * 0.2)}px;padding:0 ${Math.round(hb * 0.45)}px;box-sizing:border-box;flex-direction:${ctx.rtl ? "row-reverse" : "row"}`;
      for (const c of ["var(--x-bad)", "var(--x-accent)", "var(--x-good)"]) {
        const d = document.createElement("span");
        d.style.cssText = `flex:0 0 auto;width:${Math.round(hb * 0.26)}px;height:${Math.round(hb * 0.26)}px;border-radius:50%;background:${c};opacity:.85`;
        bar.append(d);
      }
      const addr = document.createElement("span");
      addr.style.cssText = `flex:0 0 auto;width:${Math.round(cw * 0.34)}px;height:${Math.round(hb * 0.46)}px;border-radius:${Math.round(hb * 0.23)}px;background:var(--x-panel-2);margin:0 auto`;
      bar.append(addr);
      const content = document.createElement("div");
      content.style.cssText = `position:absolute;left:0;top:${hb}px;width:${cw}px;height:${ch}px;overflow:hidden`;
      const inner = document.createElement("div"); // the scene, laid out at full frame and shown at 1/amount
      inner.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0;transform:scale(${(1 / A).toFixed(5)})`;
      while (host.firstChild) inner.append(host.firstChild);
      content.append(inner);
      const line = document.createElement("div");
      line.style.cssText = `position:absolute;inset:0;border-radius:inherit;border:var(--x-edge) solid var(--x-edge-color);pointer-events:none`;
      win.append(content, bar, line);
      rig.append(wall, shadow, win);
      C = { x: W / 2, y: top + hb + ch / 2 };
      parts = { kind: "window", win, shadow, bar, line, wall };
    } else {
      // the picture, laid out full frame (object-fit cover) and shown at 1/amount inside its mat
      const mat = Math.round(short * 0.035);
      const left = (W - cw) / 2, top = (H - ch) / 2;
      const nw = pic.naturalWidth || 0, nh = pic.naturalHeight || 0;
      const vector = /\.svg|image\/svg/i.test(pic.currentSrc || pic.src || "");
      // never past its pixels: a small photo stops short of full-bleed
      const cover = nw && nh && !vector ? Math.max(W / nw, H / nh) : 1;
      const fitK = cover > 1 ? 1 / cover : 1;
      const dark = document.createElement("div");
      dark.style.cssText = `position:absolute;inset:0;background:color-mix(in srgb, var(--x-ink) 70%, var(--x-ground));opacity:0`;
      const frame = document.createElement("div");
      frame.style.cssText = `position:absolute;left:${left - mat}px;top:${top - mat}px;width:${cw + 2 * mat}px;height:${ch + 2 * mat}px;background:var(--x-panel);box-shadow:var(--x-shadow),inset 0 0 0 var(--x-edge) var(--x-edge-color);box-sizing:border-box`;
      const box = document.createElement("div");
      box.style.cssText = `position:absolute;left:${left}px;top:${top}px;width:${cw}px;height:${ch}px;overflow:hidden;background:var(--x-pic-ground, var(--x-panel-2))`;
      const img = document.createElement("img");
      img.src = pic.currentSrc || pic.src;
      img.alt = "";
      img.style.cssText = `position:absolute;left:${((W * (1 - fitK)) / 2).toFixed(1)}px;top:${((H * (1 - fitK)) / 2).toFixed(1)}px;width:${W * fitK}px;height:${H * fitK}px;object-fit:cover;transform-origin:0 0;filter:var(--x-pic-filter);mix-blend-mode:var(--x-pic-blend)`;
      const holder = document.createElement("div");
      holder.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0;transform:scale(${(1 / A).toFixed(5)})`;
      holder.append(img);
      box.append(holder);
      const card = document.createElement("div");
      card.className = "ml-panel ml-label";
      const cap = (pic.getAttribute("alt") || pic.dataset.caption || "").trim();
      card.textContent = cap;
      card.style.cssText = `position:absolute;${ctx.rtl ? "right" : "left"}:${left + mat}px;top:${top + ch - mat - Math.round(short * 0.07)}px;padding:12px 20px;color:var(--x-ink);${cap ? "" : "display:none"}`;
      rig.append(wall, dark, frame, box, card);
      host.append(rig);
      C = { x: W / 2, y: H / 2 };
      parts = { kind: "frame", frame, card, dark };
    }
    if (chrome === "window") host.append(rig);

    const p3 = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2); // power3.inOut ≡ cubic in-out
    ctx.sfx(Math.max(0, at - 0.05), "whoosh.soft", 0.26);
    const out = p.direction === "out";
    const R0 = 0.4; // the window's radius is a share of the look's radius (below)
    return {
      draw(t) {
        const raw = ML.lin(t, at, at + D);
        const e = p3(raw);
        const u = out ? 1 - e : e; // 0 framed … 1 full-bleed
        const s = 1 + (A - 1) * u;
        const px = C.x + (W / 2 - C.x) * u, py = C.y + (H / 2 - C.y) * u;
        rig.style.transform = u > 0 ? `translate(${(px - s * C.x).toFixed(2)}px, ${(py - s * C.y).toFixed(2)}px) scale(${s.toFixed(5)})` : "none";
        if (parts.kind === "window") {
          // the corners square off as they reach the frame's corners, so no wedge of wall ever shows
          const r = `calc(var(--x-radius) * ${(R0 * (1 - u)).toFixed(4)})`;
          parts.win.style.borderRadius = r;
          parts.shadow.style.borderRadius = r;
          const k = p.mode === "dissolve" ? ML.ease(u, 0, 0.5) : ML.lin(u, 0.7, 1);
          parts.line.style.opacity = (1 - Math.max(k, ML.lin(u, 0.7, 1))).toFixed(4);
          parts.shadow.style.opacity = (1 - k).toFixed(4);
          parts.bar.style.opacity = p.mode === "dissolve" ? (1 - k).toFixed(4) : "1";
          parts.wall.style.opacity = p.mode === "dissolve" ? (1 - k).toFixed(4) : "1";
        } else {
          // mat and card fade over the first half-second of the push (the last of a pull-back), the mat softening
          const fade = out ? ML.lin(t, at + D - 0.5, at + D) : ML.lin(t, at, at + 0.5);
          const k = out ? 1 - fade : fade;
          const gone = Math.max(k, p.mode === "push-past" ? ML.lin(u, 0.85, 1) : 0);
          const kk = p.mode === "dissolve" ? gone : ML.lin(u, 0.5, 1);
          parts.frame.style.opacity = (1 - kk).toFixed(4);
          parts.frame.style.filter = kk > 0.01 ? `blur(${(kk * 6).toFixed(2)}px)` : "none";
          parts.card.style.opacity = (1 - k).toFixed(4);
          parts.dark.style.opacity = (0.6 * u).toFixed(4);
        }
      },
    };
  },
});
