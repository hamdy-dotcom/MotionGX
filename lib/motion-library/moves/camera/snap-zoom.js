// Snap zoom with smear or echo: the camera snaps hard onto a word or back from a close-up, on the beat.
//   in:  the word group (or the whole scene around its headline) scales 1 → zoom (2–4, 2.8) in ~0.3 s expo.out, the
//        transform origin on the line's last letters (end), its first (start) or its centre; during the snap 2–3 echo
//        copies trail the previous transform states at 0.3 / 0.2 opacity and vanish by 0.4 s.
//   out: from zoom back to 1 in ~0.35 s expo.inOut; during the fastest 40% of the move a blur smears it (radial: an
//        even blur 6–10 px; horizontal: a directional SVG blur) and then clears, settling with no overshoot.
// The crop is intentional (letters run off the edge); it holds after landing (cut away from it). "End" follows the
// reading direction: in Arabic the line ends at its left. Echoes and smear are drawn from t alone (no frame memory):
// each echo is the pose at t − lag.
// Source: prompt-motion ultimaxbt-bbebf5 and melvynx-this-is-insane-with (reference only): our own rebuild.
ML.define({
  id: "camera.snap-zoom",
  category: "camera",
  name: "Snap zoom with smear or echo",
  does: "The camera snaps hard in or out — onto the end of a word, or back from a close-up to the full line — smearing with motion blur or leaving ghost echoes.",
  says: ["energy", "focus", "speed", "reveal", "transition"],
  energy: 4,
  targets: ["scene", "stage", "headline", "word"],
  duration: [0.3, 1.2],
  params: {
    direction: { type: "choice", options: ["in", "out"], default: "in" },
    zoom: { type: "number", range: [2, 4], default: 2.8, unit: "x" },
    duration: { type: "number", range: [0.25, 0.45], default: 0.32, unit: "s" },
    trail: { type: "choice", options: ["blur", "echo", "none"], default: "echo" },
    blur_type: { type: "choice", options: ["radial", "horizontal"], default: "radial" },
    origin: { type: "choice", options: ["end", "start", "centre"], default: "end" },
  },
  pairs: ["text-in.slam", "transition.hard-cut", "camera.impact-shake"],
  avoid: ["calm", "luxury", "ambient"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.heavy",
  source: { from: "prompt-motion:ultimaxbt-bbebf5", license: "reference", note: "also melvynx-this-is-insane-with; our own rebuild" },
  setup(ctx) {
    const { el, p, at, stage, f } = ctx;
    const host = ctx.scene || stage;
    const whole = !el || el === stage || el === host;
    const Z = ML.clamp(p.zoom, 2, 4), D = ML.clamp(p.duration, 0.25, 0.45);
    const out = p.direction === "out";
    const hb = host.getBoundingClientRect(), k = hb.width / (host.offsetWidth || 1) || 1;
    const subject = whole ? host.querySelector('[data-focus], .ml-title, [data-slot="headline"], h1, h2') : el;
    // the origin: the line's last letters (in reading order), its first, or its centre — measured on the glyphs
    const glyphs = (n) => {
      const texts = [];
      const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
      for (let x = w.nextNode(); x; x = w.nextNode()) if (x.textContent.trim()) texts.push(x);
      return texts;
    };
    const rectOf = (node, a, b) => { const r = document.createRange(); r.setStart(node, a); r.setEnd(node, b); const rs = r.getClientRects(); return rs.length ? rs[rs.length - 1] : r.getBoundingClientRect(); };
    let pt = null;
    if (subject) {
      const sr = subject.getBoundingClientRect();
      const texts = glyphs(subject);
      const ref = whole ? hb : el.getBoundingClientRect();
      const toLocal = (x, y) => ({ x: (x - ref.left) / k, y: (y - ref.top) / k });
      if (p.origin !== "centre" && texts.length) {
        const endWard = p.origin === "end";
        const node = endWard ? texts[texts.length - 1] : texts[0];
        const s = node.textContent;
        let i0, i1;
        if (endWard) { i1 = s.trimEnd().length; i0 = Math.max(0, s.lastIndexOf(" ", i1 - 1) + 1); }
        else { i0 = s.length - s.trimStart().length; i1 = s.indexOf(" ", i0); if (i1 < 0) i1 = s.length; }
        const r = rectOf(node, i0, i1); // the word itself (an Arabic word stays whole)
        const rtl = ctx.rtl;
        // the last letters sit at the reading end of that word
        const x = endWard ? (rtl ? r.left + r.width * 0.15 : r.right - r.width * 0.15) : rtl ? r.right - r.width * 0.15 : r.left + r.width * 0.15;
        pt = toLocal(x, r.top + r.height / 2);
      } else pt = toLocal(sr.left + sr.width / 2, sr.top + sr.height / 2);
    }
    let node, W0, H0;
    if (whole) {
      node = document.createElement("div");
      node.className = "ml-cam";
      node.style.cssText = "position:absolute;inset:0";
      while (host.firstChild) node.append(host.firstChild);
      host.append(node);
      W0 = f.W; H0 = f.H;
    } else { node = el; W0 = el.offsetWidth; H0 = el.offsetHeight; }
    if (!pt) pt = { x: W0 / 2, y: H0 / 2 };
    pt.x = ML.clamp(pt.x, 0, W0); pt.y = ML.clamp(pt.y, 0, H0);
    node.style.transformOrigin = `${pt.x.toFixed(1)}px ${pt.y.toFixed(1)}px`;

    // echoes: copies behind the subject, each showing the pose of a moment ago
    const echoes = [];
    if (p.trail === "echo") {
      for (const [lag, o] of [[0.04, 0.3], [0.08, 0.2], [0.12, 0.12]]) {
        const c = node.cloneNode(true);
        c.removeAttribute("data-slot");
        c.removeAttribute("id");
        c.querySelectorAll("[data-slot], [id]").forEach((n) => { n.removeAttribute("data-slot"); n.removeAttribute("id"); });
        c.setAttribute("aria-hidden", "true");
        c.style.pointerEvents = "none";
        c.style.visibility = "hidden";
        if (!whole) {
          c.style.position = "absolute";
          c.style.left = node.offsetLeft + "px";
          c.style.top = node.offsetTop + "px";
          c.style.width = W0 + "px";
          c.style.margin = "0";
        }
        node.parentNode.insertBefore(c, node);
        echoes.push({ c, lag, o });
      }
    }
    // the horizontal smear: an SVG blur along x only
    let fe = null, fid = "";
    if (p.trail === "blur" && p.blur_type === "horizontal") {
      fid = `ml-snapblur-${document.querySelectorAll('[id^="ml-snapblur-"]').length}`;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
      svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
      svg.innerHTML = `<filter id="${fid}" x="-30%" y="0" width="160%" height="100%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="0 0"/></filter>`;
      host.append(svg);
      fe = svg.querySelector("feGaussianBlur");
    }
    const expoOut = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
    const expoIO = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2);
    const scaleAt = (t) => { const x = ML.lin(t, at, at + D); return out ? Z + (1 - Z) * expoIO(x) : 1 + (Z - 1) * expoOut(x); };
    const win = out ? [0.3, 0.7] : [0, 0.4]; // the fastest 40% of the move
    ctx.sfx(Math.max(0, at - 0.04), "whoosh.heavy", 0.4);
    const base = whole ? "" : el.style.transform && el.style.transform !== "none" ? el.style.transform : "";
    return {
      draw(t) {
        const s = scaleAt(t);
        node.style.transform = (base ? base + " " : "") + (Math.abs(s - 1) < 1e-5 ? "scale(1)" : `scale(${s.toFixed(5)})`);
        for (const e of echoes) {
          const life = t >= at && t < at + 0.4 ? 1 - ML.lin(t, at + 0.26, at + 0.4) : 0;
          const se = scaleAt(t - e.lag);
          const on = life > 0 && Math.abs(se - s) > 0.01;
          e.c.style.visibility = on ? "visible" : "hidden";
          e.c.style.opacity = on ? (e.o * life).toFixed(4) : "0";
          e.c.style.transformOrigin = node.style.transformOrigin;
          e.c.style.transform = (base ? base + " " : "") + `scale(${se.toFixed(5)})`;
        }
        if (p.trail === "blur") {
          const x = ML.lin(t, at, at + D);
          const amt = x > win[0] && x < win[1] ? Math.sin(Math.PI * ML.lin(x, win[0], win[1])) * (6 + (Z - 2) * 2) : 0;
          if (fe) {
            fe.setAttribute("stdDeviation", `${amt.toFixed(2)} 0`);
            node.style.filter = amt > 0.05 ? `url(#${fid})` : "none";
          } else node.style.filter = amt > 0.05 ? `blur(${amt.toFixed(2)}px)` : "none";
        }
      },
    };
  },
});
