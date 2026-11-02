// Tilted-page flyover: a whole web page lies on one tall plane tilted back in perspective — rotateX(35–50°)
// rotateZ(−6..0°), the camera 1400 px off (scaled to the stage) — and the camera glides down its length: the plane's
// translateY, either continuous at `speed` page-px/s (with a slight roll drift on "diagonal") or eased 0 → 60% of the
// page over 4 s on power1.inOut. Tilt-shift: two blurred copies of the plane (`dof` px) masked by top / bottom
// gradients leave a sharp horizontal band through the middle 35% of the frame; section titles blur in as they reach
// the band (their screen position solved from the projection, so it stays a function of t). Floating UI cards (a chat
// bubble, a stat) sit above the plane at translateZ 40–80 px with soft shadows, so they parallax. The page is the
// target screen (copied, its slots dropped) or, alone, a page built in the look (hero from the scene's headline,
// features, numbers, a chart, a quote, pricing). Sharp: the plane pivots on the frame's bottom edge, so nothing visible
// is nearer than the screen plane (cards are scaled to compensate their lift); a page that is a picture is never
// blurred (no tilt-shift copies, a fog at the far edge instead) and never laid wider than its pixels. RTL: the roll
// and the diagonal drift mirror.
// Source: prompt-motion (twoclipping, pankajstwt), reference only: rebuilt as our own code.
ML.define({
  id: "camera.tilted-page-flyover",
  category: "camera",
  name: "Camera flies over a tilted web page",
  does: "A whole web page lies on a tilted plane in perspective and the camera glides down its length, sections sliding under a sharp band with tilt-shift blur at the near and far edges.",
  says: ["proof", "scale", "tech"],
  energy: 3,
  targets: ["screen", "stage", "scene"],
  duration: [2.5, 8],
  params: {
    angle: { type: "number", range: [35, 50], default: 40, unit: "deg" },
    roll: { type: "number", range: [-6, 0], default: -6, unit: "deg" },
    speed: { type: "number", range: [250, 400], default: 320, unit: "px/s" },
    direction: { type: "choice", options: ["down", "up", "diagonal"], default: "down" },
    pace: { type: "choice", options: ["continuous", "eased"], default: "continuous" },
    dof: { type: "number", range: [0, 14], default: 10, unit: "px" },
    floating_cards: { type: "bool", default: false },
  },
  pairs: ["camera.region-tour", "text-in.punchline"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:twoclipping-d89be5", license: "reference", note: "also prompt-motion:pankajstwt-49978ed; rebuilt as our own code: perspective plane, translateY camera, masked blurred copies for tilt-shift, titles blurring in at the band, floating cards at translateZ" },
  setup(ctx) {
    const { el, p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, k = Math.min(W, H) / 1080;
    const a = (ML.clamp(p.angle, 35, 50) * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
    const P = Math.round((1400 * Math.max(W, H)) / 1440), OY = H * 0.3;
    const mir = ctx.rtl ? -1 : 1;
    const roll0 = ML.clamp(p.roll, -6, 0) * mir;
    // the projection of a plane point d px above the pivot (the frame's bottom edge): its screen y and its scale
    const proj = (d) => { const s = P / (P + d * sa); return { y: OY + (H - d * ca - OY) * s, s }; };
    const dFor = (y) => { let lo = 0, hi = H * 12; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; (proj(m).y > y ? (lo = m) : (hi = m)); } return lo; };
    const dTop = Math.min(H * 6, dFor(H * 0.1)), sTop = proj(dTop).s;
    const dBand = dFor(H * 0.5);

    // the page: the target screen (a copy, slots dropped) or our own, in the look
    let page, isPic = false, PW;
    const src = el && el !== stage && el !== host ? el : null;
    if (src && (src.tagName === "IMG" || (src.querySelector("img") && !src.querySelector("h1, h2, h3, p, button")))) {
      const img = src.tagName === "IMG" ? src : src.querySelector("img");
      isPic = true;
      const nw = img.naturalWidth || 1440, nh = img.naturalHeight || 4000;
      PW = Math.min(nw, Math.max(W, (W / sTop) * 1.2));
      page = document.createElement("div");
      page.style.cssText = `position:absolute;left:0;top:0;width:${PW}px;height:${(nh * PW) / nw}px;background:var(--x-panel)`;
      const pic = img.cloneNode(true);
      pic.removeAttribute("data-slot"); pic.removeAttribute("id");
      pic.style.cssText = `display:block;width:${PW}px;height:auto;max-width:none;border-radius:0;filter:var(--x-pic-filter)`;
      page.append(pic);
      src.style.visibility = "hidden";
    } else {
      PW = Math.min(W * 5, Math.max(W * 1.2, (W / sTop) * 1.25));
      page = document.createElement("div");
      page.style.cssText = `position:absolute;left:0;top:0;width:${PW}px;background:var(--x-panel);color:var(--x-ink)`;
      if (src) {
        const c = src.cloneNode(true);
        c.removeAttribute("data-slot"); c.removeAttribute("id");
        c.querySelectorAll("[data-slot], [id]").forEach((n) => { n.removeAttribute("data-slot"); n.removeAttribute("id"); });
        c.style.cssText += `;position:relative;width:${Math.min(PW, Math.max(W * 1.1, 1200 * k))}px;margin:0 auto;transform:none;opacity:1`;
        page.append(c);
        src.style.visibility = "hidden";
      }
    }
    const CW = Math.min(PW, Math.max(W * 1.1, 1240 * k));
    const head = host.querySelector(".ml-title, [data-slot=headline]");
    const T = ctx.rtl
      ? { hero: (head && head.textContent.trim()) || "كل اللي محتاجه في مكان واحد", sec: ["المميزات", "بالأرقام", "آراء العملاء", "الأسعار", "ابدأ دلوقتي"], cta: "ابدأ مجاناً", quote: "وفّر علينا ساعات كل أسبوع" }
      : { hero: (head && head.textContent.trim()) || "Everything you need in one place", sec: ["Features", "By the numbers", "What people say", "Pricing", "Get started"], cta: "Start free", quote: "It saves us hours every week" };
    const px = (v) => `${Math.round(v * k)}px`;
    const titles = [];
    const col = () => { const c = document.createElement("div"); c.style.cssText = `width:${CW}px;margin:0 auto;padding:${px(90)} ${px(80)};box-sizing:border-box;direction:${ctx.rtl ? "rtl" : "ltr"}`; return c; };
    const titleEl = (txt) => { const h = document.createElement("div"); h.textContent = txt; h.style.cssText = `font:var(--x-head-weight) ${px(64)}/1.1 var(--x-head-font);letter-spacing:var(--x-head-track);margin-bottom:${px(48)}`; titles.push(h); return h; };
    const box = (css) => { const d = document.createElement("div"); d.style.cssText = css; return d; };
    const bar = (w, h, c, o = 1) => box(`width:${w};height:${px(h)};border-radius:var(--x-radius-s);background:${c};opacity:${o}`);
    let heroCenter = 0;
    const sections = [
      () => { // nav
        const s = box(`border-bottom:var(--x-edge) solid var(--x-line)`), c = col();
        c.style.cssText += `;display:flex;align-items:center;justify-content:space-between;padding-top:${px(36)};padding-bottom:${px(36)}`;
        const logo = box(`width:${px(56)};height:${px(56)};border-radius:${px(16)};background:var(--x-accent)`);
        const links = box(`display:flex;gap:${px(36)}`); for (let i = 0; i < 4; i++) links.append(bar(px(110), 16, "var(--x-dim)", 0.5));
        c.append(logo, links, box(`width:${px(190)};height:${px(64)};border-radius:var(--x-radius-s);background:var(--x-ink)`)); s.append(c); return s;
      },
      () => { // hero
        const s = box(""), c = col();
        c.style.cssText += `;text-align:center;padding-top:${px(150)};padding-bottom:${px(150)}`;
        const h = box(`font:var(--x-head-weight) ${px(116)}/1.05 var(--x-head-font);letter-spacing:var(--x-hero-track);text-wrap:balance`); h.textContent = T.hero;
        const sub = box(`margin:${px(40)} auto 0;display:grid;gap:${px(18)};justify-items:center`); sub.append(bar("70%", 20, "var(--x-dim)", 0.45), bar("52%", 20, "var(--x-dim)", 0.45));
        const cta = box(`display:inline-block;margin-top:${px(56)};padding:${px(26)} ${px(56)};border-radius:var(--x-radius-s);background:var(--x-accent);color:var(--x-accent-ink);font:600 ${px(34)} var(--x-body-font)`); cta.textContent = T.cta;
        c.append(h, sub, cta); s.append(c); s.dataset.hero = "1"; return s;
      },
      () => { // features
        const s = box("background:var(--x-panel-2)"), c = col(); c.append(titleEl(T.sec[0]));
        const g = box(`display:grid;grid-template-columns:repeat(3,1fr);gap:${px(36)}`);
        for (let i = 0; i < 3; i++) { const cd = box(`background:var(--x-panel);border-radius:var(--x-radius);padding:${px(40)};display:grid;gap:${px(20)};border:var(--x-edge) solid var(--x-edge-color)`); cd.append(box(`width:${px(72)};height:${px(72)};border-radius:${px(20)};background:${i === 1 ? "var(--x-accent)" : "var(--x-accent-2)"};opacity:${i === 1 ? 1 : 0.6}`), bar("80%", 26, "var(--x-ink)", 0.85), bar("95%", 16, "var(--x-dim)", 0.4), bar("70%", 16, "var(--x-dim)", 0.4)); g.append(cd); }
        c.append(g); s.append(c); return s;
      },
      () => { // numbers
        const s = box(""), c = col(); c.append(titleEl(T.sec[1]));
        const g = box(`display:flex;justify-content:space-between;gap:${px(30)};direction:ltr`);
        ["3.2×", "48k", "99.9%"].forEach((v) => { const n = box(`font:var(--x-head-weight) ${px(110)}/1 var(--x-head-font);color:var(--x-accent);letter-spacing:var(--x-hero-track)`); n.textContent = v; g.append(n); });
        const chart = box(`margin-top:${px(60)};height:${px(260)};display:flex;align-items:flex-end;gap:${px(14)}`);
        for (let i = 0; i < 18; i++) chart.append(box(`flex:1;height:${(22 + 70 * (i / 17) + 12 * Math.sin(i * 1.7)).toFixed(1)}%;border-radius:${px(8)} ${px(8)} 0 0;background:${i === 17 ? "var(--x-accent)" : "var(--x-accent-2)"};opacity:${i === 17 ? 1 : 0.45}`));
        c.append(g, chart); s.append(c); return s;
      },
      () => { // quote
        const s = box("background:var(--x-panel-2)"), c = col(); c.append(titleEl(T.sec[2]));
        const q = box(`font:400 ${px(54)}/1.3 var(--x-serif-font);max-width:80%`); q.textContent = `“${T.quote}”`;
        const who = box(`display:flex;align-items:center;gap:${px(22)};margin-top:${px(40)}`); who.append(box(`width:${px(72)};height:${px(72)};border-radius:50%;background:var(--x-accent-2)`), bar(px(260), 22, "var(--x-ink)", 0.7));
        c.append(q, who); s.append(c); return s;
      },
      () => { // pricing
        const s = box(""), c = col(); c.append(titleEl(T.sec[3]));
        const g = box(`display:grid;grid-template-columns:repeat(3,1fr);gap:${px(36)}`);
        for (let i = 0; i < 3; i++) { const cd = box(`border-radius:var(--x-radius);padding:${px(44)};display:grid;gap:${px(22)};background:${i === 1 ? "var(--x-ink)" : "var(--x-panel-2)"};color:${i === 1 ? "var(--x-panel)" : "var(--x-ink)"}`); const pr = box(`font:var(--x-head-weight) ${px(80)}/1 var(--x-head-font);direction:ltr`); pr.textContent = ["$0", "$19", "$49"][i]; cd.append(pr, bar("80%", 16, "currentColor", 0.4), bar("65%", 16, "currentColor", 0.4), bar("72%", 16, "currentColor", 0.4)); g.append(cd); }
        c.append(g); s.append(c); return s;
      },
      () => { // cta band
        const s = box("background:var(--x-accent);color:var(--x-accent-ink)"), c = col(); c.style.cssText += ";text-align:center"; c.append(titleEl(T.sec[4]));
        c.append(box(`display:inline-block;padding:${px(26)} ${px(56)};border-radius:var(--x-radius-s);background:var(--x-accent-ink);color:var(--x-accent);font:600 ${px(34)} var(--x-body-font)`)); c.lastChild.textContent = T.cta; s.append(c); return s;
      },
    ];

    // the view: three stacked copies (sharp, far blur, near blur) of one perspective rig
    const views = [], planes = [], pivots = [];
    const mkView = () => {
      const v = document.createElement("div");
      v.style.cssText = `position:absolute;inset:0;overflow:hidden;pointer-events:none;perspective:${P}px;perspective-origin:50% ${OY}px`;
      const pv = document.createElement("div");
      pv.style.cssText = `position:absolute;left:${(W - PW) / 2}px;top:0;width:${PW}px;height:${H}px;transform-origin:50% 100%;transform-style:preserve-3d`;
      const pl = document.createElement("div");
      pl.style.cssText = `position:absolute;left:0;top:0;width:${PW}px;transform-style:preserve-3d`;
      pv.append(pl); v.append(pv);
      views.push(v); pivots.push(pv); planes.push(pl);
      return v;
    };
    const rig = document.createElement("div");
    rig.style.cssText = "position:absolute;inset:0;z-index:0;pointer-events:none;background:var(--x-ground)";
    host.insertBefore(rig, host.firstChild);
    rig.append(mkView());
    planes[0].append(page);
    if (!isPic && !src) {
      // build sections until the page is tall enough for the shot
      const pace = p.pace === "eased" ? null : ML.clamp(p.speed, 250, 400) * k * Math.max(0.5, end - at);
      let i = 0;
      for (const mk of sections) page.append(mk());
      const need = () => { const hero = page.querySelector("[data-hero]"); heroCenter = hero.offsetTop + hero.offsetHeight / 2; const y0 = H - dBand - heroCenter; return pace === null ? (H - y0) / 0.4 + H : H - y0 + pace + H * 0.5; };
      while (page.offsetHeight < need() && i < 40) { page.append(sections[2 + (i % (sections.length - 2))]()); i++; }
    } else heroCenter = Math.min(page.offsetHeight * 0.15, H * 0.4);
    const pageH = page.offsetHeight;
    const y0 = H - dBand - heroCenter; // the page's top in the pivot at the start: its hero in the band
    const titleY = titles.map((t) => { let y = 0, n = t; while (n && n !== page) { y += n.offsetTop; n = n.offsetParent; } return y + t.offsetHeight / 2; });

    // floating cards: a chat bubble and a stat, lifted off the plane
    const floats = [];
    if (p.floating_cards) {
      const mk = (txt, left, top, z, accent) => {
        const c = document.createElement("div");
        c.className = "ml-panel";
        c.textContent = txt;
        c.style.cssText = `position:absolute;left:${left}px;top:${top}px;padding:${px(28)} ${px(36)};font:600 ${px(38)}/1.2 var(--x-body-font);white-space:nowrap;${accent ? "background:var(--x-accent);color:var(--x-accent-ink);" : ""}box-shadow:0 ${px(30)} ${px(60)} -${px(10)} color-mix(in srgb, var(--x-ink) 30%, transparent);transform:translateZ(${z * k}px) scale(${(P / (P + z * k)).toFixed(4)});transform-origin:50% 50%`;
        planes[0].append(c);
        floats.push(c);
      };
      const cx = (PW - CW) / 2;
      mk(ctx.rtl ? "تمام، اتبعت ✓" : "Done, sent ✓", cx + CW * (ctx.rtl ? 0.08 : 0.62), heroCenter + H * 0.35, 60, true);
      mk("+48%", cx + CW * (ctx.rtl ? 0.66 : 0.12), heroCenter + H * 0.9, 80, false);
      mk(ctx.rtl ? "عميل جديد" : "New customer", cx + CW * 0.55, heroCenter + H * 1.6, 40, false);
    }
    // tilt-shift copies: blurred, masked to the far and near edges (never for a picture)
    const dof = isPic ? 0 : ML.clamp(p.dof, 0, 14) * k;
    const copyTitles = [titles];
    if (dof > 0.3) {
      const masks = ["linear-gradient(180deg, #000 0%, #000 22%, transparent 32.5%)", "linear-gradient(0deg, #000 0%, #000 20%, transparent 32.5%)"];
      masks.forEach((m, i) => {
        const v = mkView();
        v.style.filter = `blur(${(i === 0 ? dof : dof * 0.85).toFixed(2)}px)`;
        v.style.webkitMaskImage = m; v.style.maskImage = m;
        const c = planes[0].cloneNode(true);
        while (c.firstChild) planes[planes.length - 1].append(c.firstChild);
        rig.append(v);
        const list = [...planes[planes.length - 1].querySelectorAll("*")];
        const all = [...planes[0].querySelectorAll("*")];
        copyTitles.push(titles.map((t) => list[all.indexOf(t)]));
      });
    }
    // the far edge fades into the ground (a fog; the only depth cue a picture page gets)
    const fog = document.createElement("div");
    fog.style.cssText = "position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg, var(--x-ground) 0%, var(--x-ground) 8%, color-mix(in srgb, var(--x-ground) 0%, transparent) 30%)";
    rig.append(fog);

    // the camera: how far down the page at t
    const dirn = p.direction;
    const travelMax = p.pace === "eased" ? pageH * 0.6 : ML.clamp(p.speed, 250, 400) * k * Math.max(0.5, end - at);
    const p1 = (x) => -(Math.cos(Math.PI * x) - 1) / 2; // power1.inOut ≈ sine-like
    const scrollAt = (t) => {
      const u = p.pace === "eased" ? p1(ML.lin(t, at, at + Math.min(4, Math.max(1, end - at)))) : ML.clamp((t - at) / Math.max(0.5, end - at));
      const v = Math.min(travelMax, Math.max(0, pageH - (H - y0) - H * 0.2)) * u;
      return dirn === "up" ? Math.max(0, travelMax - v) : v;
    };
    const bandTop = H * 0.325, bandBot = H * 0.675;
    ctx.sfx(at + 0.02, "whoosh.soft", 0.22);
    return {
      draw(t) {
        const sc = scrollAt(t);
        const roll = roll0 + (dirn === "diagonal" ? mir * 2.5 * ML.clamp((t - at) / Math.max(1, end - at)) : 0);
        const tx = dirn === "diagonal" ? mir * sc * 0.22 : 0;
        for (const pv of pivots) pv.style.transform = `rotateX(${((a * 180) / Math.PI).toFixed(3)}deg) rotateZ(${roll.toFixed(3)}deg)`;
        for (const pl of planes) pl.style.transform = `translate(${(-tx).toFixed(2)}px, ${(y0 - sc).toFixed(2)}px)`;
        // titles blur in as they reach the band (from below scrolling down, from above scrolling up)
        titleY.forEach((py, i) => {
          const d = H - (y0 - sc + py);
          const y = proj(d).y;
          const u = dirn === "up" ? ML.clamp((y - (bandTop - H * 0.1)) / (H * 0.12)) : ML.clamp((bandBot + H * 0.1 - y) / (H * 0.12));
          const e = 1 - Math.pow(1 - u, 3);
          for (const list of copyTitles) {
            const n = list[i];
            if (!n) continue;
            n.style.opacity = e.toFixed(4);
            n.style.filter = e < 1 ? `blur(${((1 - e) * 10 * k).toFixed(2)}px)` : "none";
            n.style.translate = `0 ${((1 - e) * 26 * k).toFixed(2)}px`;
          }
        });
      },
    };
  },
});
