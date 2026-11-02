// Crane pull-back revealing the set: from an extreme close-up on the subject the camera pulls back and tilts down, and the
// subject turns out to stand in a larger set — a tabletop rises into view, the bokeh behind drops out of the top of the
// frame, a slip of grid paper labelled "No. 1" slides in at the bottom, a spotlight finds the subject and props parallax
// in from the side on a nearer layer. One unbroken move over `duration` on power2.inOut: it starts with the detail and
// ends on the context. Built as the 2D fallback of the 3D crane (distance d → `distance`·d, rising, tilting down
// `tilt`°): layered scale-downs — the far set 1 + (distance − 1)·0.2 → 1, the subject's plane 1 + (distance − 1)·0.47 → 1
// (≈2.4 at 4×, around the subject, which starts centred), the near props 1 + (distance − 1)·0.6 → 1 — with a vertical
// slide of H·sin(tilt)·0.4 for the tilt. 2D only, so text stays sharp; a picture in the subject's plane caps the
// close-up at its own pixels. Props come in from the reading side's end (right in LTR, left in RTL). Colours are the
// look's; nothing is a fixed colour or font.
// Source: prompt-motion anilraok-here-s-my-prompt-to (reference only — rebuilt as our own code).
ML.define({
  id: "camera.crane-pullback-reveal",
  category: "camera",
  name: "Crane pull-back revealing the set",
  does: "From an extreme close-up the camera pulls back and tilts down, revealing the subject stands in a larger set while props enter at the edges.",
  says: ["reveal", "story", "scale"],
  energy: 2,
  targets: ["scene", "stage"],
  duration: [2.5, 5],
  params: {
    distance: { type: "number", range: [2, 6], default: 4, unit: "x" },
    tilt: { type: "number", range: [0, 35], default: 20, unit: "deg" },
    duration: { type: "number", range: [2, 4], default: 3, unit: "s" },
    props: { type: "bool", default: true },
    spotlight: { type: "bool", default: true },
    paper: { type: "bool", default: true },
    label: { type: "text", default: "" },
  },
  pairs: ["camera.slow-push", "text-in.punchline", "camera.zoom-out-to-many"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:anilraok-here-s-my-prompt-to", license: "reference", note: "our own layered 2D crane (the brief's fallback) after the video" },
  setup(ctx) {
    const { el, p, at, stage, f } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, doc = document, U = Math.min(W, H) / 1080;
    const rtl = ctx.rtl;
    const mk = (css, parent, tag = "div") => { const n = doc.createElement(tag); n.style.cssText = css; parent.append(n); return n; };
    // the subject's plane: everything the scene already holds
    const cam = doc.createElement("div");
    cam.className = "ml-cam";
    cam.style.cssText = "position:absolute;inset:0";
    while (host.firstChild) cam.append(host.firstChild);
    // the far set (behind) and the near layer (in front)
    const far = mk("position:absolute;inset:0;pointer-events:none", host);
    // the spotlight lights the set behind the subject (the subject itself is never dimmed)
    const spot = p.spotlight ? mk("position:absolute;inset:0;pointer-events:none", host) : null;
    host.append(cam);
    const near = mk("position:absolute;inset:0;pointer-events:none;overflow:hidden", host);

    const shown = (n) => n && n.getClientRects().length > 0 && getComputedStyle(n).visibility !== "hidden";
    const subj = (el && el !== stage && el !== host ? el : null) || [cam.querySelector("[data-focus]"), cam.querySelector(".ml-title, h1"), cam.querySelector(".ml-pic > *"), cam.firstElementChild].find(shown);
    const sb = subj ? ctx.box(subj) : { x: W * 0.3, y: H * 0.4, w: W * 0.4, h: H * 0.2 };
    const scx = sb.x + sb.w / 2, scy = sb.y + sb.h / 2;

    const dist = ML.clamp(p.distance, 2, 6);
    const tiltR = (ML.clamp(p.tilt, 0, 35) * Math.PI) / 180;
    const tiltY = H * Math.sin(tiltR) * 0.4;
    let sMid = 1 + (dist - 1) * 0.47;
    const dpr = window.devicePixelRatio || 1;
    for (const im of cam.querySelectorAll("img")) {
      if (!shown(im) || !im.naturalWidth || /\.svg|image\/svg/i.test(im.currentSrc || im.src || "")) continue;
      const b = ctx.box(im), fit = getComputedStyle(im).objectFit, s0 = fit === "cover" ? Math.max(b.w / im.naturalWidth, b.h / im.naturalHeight) : b.w / im.naturalWidth;
      sMid = Math.min(sMid, Math.max(1, 1 / (s0 * dpr)));
    }
    const sFar = 1 + (dist - 1) * 0.2, sNear = 1 + (dist - 1) * 0.6;
    cam.style.transformOrigin = `${scx.toFixed(1)}px ${scy.toFixed(1)}px`;

    // ── the far set: bokeh in the close-up's background, a tabletop that rises as the camera tilts down ──
    const bokeh = mk(`position:absolute;left:0;top:0;width:${W}px;height:${H * 0.6}px`, far);
    const tones = ["var(--x-accent)", "var(--x-accent-2)", "var(--x-panel)", "var(--x-glow-1)", "var(--x-glow-2)"];
    for (let i = 0; i < 9; i++) {
      const r = (60 + ML.rnd(i, 2) * 120) * U;
      mk(`position:absolute;left:${(ML.rnd(i, 3) * W - r).toFixed(0)}px;top:${(ML.rnd(i, 4) * H * 0.55 - r).toFixed(0)}px;width:${(2 * r).toFixed(0)}px;height:${(2 * r).toFixed(0)}px;border-radius:50%;background:${tones[i % tones.length]};opacity:${(0.16 + ML.rnd(i, 5) * 0.22).toFixed(2)};filter:blur(${(14 * U).toFixed(1)}px)`, bokeh);
    }
    const tableH = H * (f.tall ? 0.26 : 0.3);
    const table = mk(`position:absolute;left:0;right:0;bottom:0;height:${tableH.toFixed(0)}px;background:linear-gradient(to bottom, color-mix(in srgb, var(--x-panel-2) 0%, transparent), color-mix(in srgb, var(--x-panel-2) 92%, var(--x-ink)) 34%, color-mix(in srgb, var(--x-panel-2) 80%, var(--x-ink)));border-top:var(--x-edge) solid var(--x-line)`, far);
    far.style.transformOrigin = `${scx.toFixed(1)}px ${scy.toFixed(1)}px`;

    // ── the spotlight: a soft cone from above onto the subject and a pool around it, the rest dimmed a little ──
    if (spot) {
      const sx = (scx / W) * 100, sy = (scy / H) * 100;
      mk(`position:absolute;inset:0;background:radial-gradient(ellipse ${(Math.max(sb.w * 0.8, W * 0.45) + 120 * U).toFixed(0)}px ${(Math.max(sb.h * 1.6, H * 0.4) + 160 * U).toFixed(0)}px at ${sx.toFixed(1)}% ${sy.toFixed(1)}%, transparent 0, transparent 60%, color-mix(in srgb, var(--x-ink) 12%, transparent) 100%)`, spot);
      const coneW = sb.w * 0.9 + 160 * U;
      mk(`position:absolute;left:${(scx - coneW / 2).toFixed(0)}px;top:0;width:${coneW.toFixed(0)}px;height:${(scy + sb.h * 0.6).toFixed(0)}px;clip-path:polygon(38% 0, 62% 0, 100% 100%, 0 100%);background:linear-gradient(to bottom, color-mix(in srgb, var(--x-panel) 0%, transparent), color-mix(in srgb, var(--x-panel) 30%, transparent));mix-blend-mode:screen`, spot);
    }

    // ── the near layer: props (vessels) from the reading side's end, the grid-paper slip at the bottom ──
    const props = [];
    if (p.props) {
      const shapes = [
        "M30 4h40v10c0 6 18 14 18 40c0 30-18 44-38 44S12 84 12 54c0-26 18-34 18-40z",
        "M40 2h20v16c18 6 30 22 30 44c0 22-16 36-40 36S10 84 10 62c0-22 12-38 30-44z",
        "M24 6h52v8c-6 4-8 8-8 14c10 8 18 22 18 38c0 18-16 32-36 32S14 84 14 66c0-16 8-30 18-38c0-6-2-10-8-14z",
      ];
      const fills = ["var(--x-accent)", "var(--x-accent-2)", "var(--x-dim)"];
      const ph = H * (f.tall ? 0.16 : 0.26);
      shapes.forEach((d, i) => {
        const h = ph * (1 - i * 0.18), w = h;
        const edge = W * (0.02 + i * 0.13);
        const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 100 100");
        svg.style.cssText = `position:absolute;bottom:${(H * 0.015 + i * 6 * U).toFixed(0)}px;${rtl ? "left" : "right"}:${edge.toFixed(0)}px;width:${w.toFixed(0)}px;height:${h.toFixed(0)}px;overflow:visible`;
        const cid = `ml-crane-v${i}-${Math.round(at * 1000)}`;
        // the vessel, its shadow on the table and a soft highlight kept inside its silhouette
        svg.innerHTML = `<defs><clipPath id="${cid}"><path d="${d}"/></clipPath></defs><ellipse cx="50" cy="99" rx="34" ry="3" fill="var(--x-ink)" opacity=".18"/><path d="${d}" fill="${fills[i]}"/><g clip-path="url(#${cid})"><ellipse cx="${rtl ? 66 : 34}" cy="58" rx="16" ry="34" fill="var(--x-panel)" opacity=".24"/><rect x="${rtl ? 0 : 78}" y="0" width="22" height="100" fill="var(--x-ink)" opacity=".12"/></g>`;
        near.append(svg);
        props.push({ n: svg, k: 1 + i * 0.35 });
      });
    }
    let slip = null;
    if (p.paper) {
      const sw = W * (f.wide ? 0.13 : 0.3), sh = sw * 0.62;
      const gap = 24 * U;
      slip = mk(`position:absolute;${rtl ? "right" : "left"}:${(W * 0.06).toFixed(0)}px;bottom:${(f.wide ? -sh * 0.28 : H * 0.03).toFixed(0)}px;width:${sw.toFixed(0)}px;height:${sh.toFixed(0)}px;box-sizing:border-box;padding:${(sw * 0.08).toFixed(0)}px;background-color:var(--x-panel);background-image:linear-gradient(var(--x-line) 1px, transparent 1px),linear-gradient(90deg, var(--x-line) 1px, transparent 1px);background-size:${gap.toFixed(0)}px ${gap.toFixed(0)}px;box-shadow:var(--x-shadow);border-radius:calc(var(--x-radius) * 0.15);display:flex;align-items:${f.wide ? "flex-start" : "flex-end"};justify-content:${rtl ? "flex-end" : "flex-start"}`, near);
      const lab = mk(`font:600 ${(sh * 0.22).toFixed(0)}px var(--x-label-font);color:var(--x-ink);white-space:nowrap`, slip);
      lab.className = "ml-label";
      lab.style.color = "var(--x-ink)";
      lab.textContent = p.label || (rtl ? "رقم ١" : "No. 1");
    }

    const T = ML.clamp(p.duration, 2, 4), t0 = at, t1 = at + T;
    const p2 = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    ctx.sfx(t0, "whoosh.soft", 0.3);
    if (p.props || p.paper) ctx.sfx(t0 + T * 0.62, "card", 0.18);
    const dx0 = W / 2 - scx, dy0 = H / 2 - scy; // the close-up starts with the subject centred
    return {
      draw(t) {
        const e = p2(ML.lin(t, t0, t1)), g = 1 - e;
        // the subject's plane
        const s = 1 + (sMid - 1) * g;
        cam.style.transform = g < 1e-5 ? "none" : `translate(${(dx0 * g).toFixed(2)}px, ${(dy0 * g + tiltY * g).toFixed(2)}px) scale(${s.toFixed(5)})`;
        // the far set: slower, the bokeh lifting out of the top as the tilt reveals the table
        const sf = 1 + (sFar - 1) * g;
        far.style.transform = g < 1e-5 ? "none" : `translate(${(dx0 * g * 0.4).toFixed(2)}px, ${(dy0 * g * 0.4).toFixed(2)}px) scale(${sf.toFixed(5)})`;
        bokeh.style.transform = `translateY(${(-H * 0.5 * e * (0.4 + Math.sin(tiltR))).toFixed(2)}px)`;
        bokeh.style.opacity = (1 - 0.85 * e).toFixed(4);
        table.style.transform = `translateY(${(tableH * 1.05 * (1 - ML.ease(t, t0 + T * 0.15, t1)) * (tiltR > 0.01 ? 1 : 0.3)).toFixed(2)}px)`;
        // the spotlight finds the subject in the second half
        if (spot) spot.style.opacity = ML.ease(t, t0 + T * 0.45, t1).toFixed(4);
        // the near layer: props parallax in from the side, the slip slides up from the bottom
        const dir = rtl ? -1 : 1;
        for (const pr of props) {
          const u = 1 - ML.out(t, t0 + T * 0.25, t1);
          const sn = 1 + (sNear - 1) * u * 0.5;
          pr.n.style.transformOrigin = rtl ? "0% 100%" : "100% 100%";
          pr.n.style.transform = `translate(${(dir * W * 0.42 * u * pr.k).toFixed(2)}px, ${(H * 0.06 * u).toFixed(2)}px) scale(${sn.toFixed(4)})`;
        }
        if (slip) {
          const u = ML.out(t, t0 + T * 0.55, t1 + 0.15);
          slip.style.transform = `translateY(${((1 - u) * H * 0.22).toFixed(2)}px) rotate(${(dir * (-4 + (1 - u) * -6)).toFixed(2)}deg)`;
          slip.style.opacity = Math.min(1, u * 3).toFixed(4);
        }
      },
    };
  },
});
