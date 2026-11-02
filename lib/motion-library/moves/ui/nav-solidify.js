// Transparent nav solidifies. A page in a window: a full-bleed hero under a transparent top bar (1 px bottom edge at
// 10 % of the bar's ink, 24 px padding — logo mark + uppercase tracked name, links, a pill button). When the page
// moves on — it scrolls (scroll-move), cuts to the content (cut) or the camera pans down it on a heavy spring
// (camera-pan) — the bar turns into a tinted solid: the tint at `alpha` (90 %), a backdrop blur (`blur`, 12 px), a
// soft small shadow, the edge gone, all in 0.5 s power2.out (the source's 500 ms transition, keyed on scrollY > 50).
// The hero is drawn (gradient ground, a sun, ridges): never a photo, so the backdrop blur never softens a picture.
// The tint is a look colour (ink, panel, accent, ground or a var(--x-…) expression), never a fixed colour; the bar's
// ink flips to stay readable on it.
// Source: MengTo/Skills web-design/dither-laser-dark-mode + number-details demos (MIT): #navbar and its scroll effect.
ML.define({
  id: "ui.nav-solidify",
  category: "ui",
  name: "Transparent nav solidifies",
  does: "A transparent top bar over a hero image turns into a tinted, blurred solid bar as the page moves on.",
  says: ["transition", "simplicity", "change"],
  energy: 1,
  targets: ["screen", "stage"],
  duration: [1, 2.5], // the bar must be seen clear first; the source's 0.5 s change then has to finish
  params: {
    tint: { type: "text", default: "ink" },
    alpha: { type: "number", range: [0.6, 0.95], default: 0.9 },
    blur: { type: "number", range: [6, 16], default: 12, unit: "px" },
    trigger: { type: "choice", options: ["scroll-move", "cut", "camera-pan"], default: "scroll-move" },
    brand: { type: "text" },
    title: { type: "text" }, // the hero's headline
    kicker: { type: "text" }, // the small line above it
  },
  pairs: ["ui.screen-scroll", "camera.push-in"],
  avoid: ["energy", "urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:web-design/dither-laser-dark-mode", license: "MIT", note: "#navbar scroll effect (bg tint/90, backdrop-blur-md, shadow-sm, border-white/10 → transparent, duration-500); same nav in number-details. The source's fixed #1A2F24 tint became a look colour" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const NAMED = { ink: "var(--x-ink)", panel: "var(--x-panel)", accent: "var(--x-accent)", ground: "var(--x-ground)", "accent-2": "var(--x-accent-2)" };
    const raw = String(p.tint || "ink").trim();
    const tint = NAMED[raw] || (/^var\(--x-[a-z0-9-]+\)$/.test(raw) ? raw : NAMED.ink);
    const lightTint = /panel|ground/.test(tint), accentTint = /accent/.test(tint);
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const lentText = el ? (el.textContent || "").trim() : "";
    if (el) el.style.visibility = "hidden"; // the page takes its place
    const track = rtl ? "0" : "var(--x-head-track)"; // Arabic letters join: never tracked
    const alpha = ML.clamp(p.alpha, 0.6, 0.95), blurPx = ML.clamp(p.blur, 6, 16);

    // the window: the picture region (or the whole safe area when the stage is the target)
    const R = ctx.el === ctx.stage ? f.safe : f.pic;
    const host = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;z-index:6;pointer-events:none;`, ctx.scene || ctx.stage);
    const W = R.w, H = R.h, u = Math.min(W, H * 1.4) / 1000; // one design px
    const px = (v) => (v * u).toFixed(1) + "px";
    const win = mk("div", `position:absolute;inset:0;overflow:hidden;border-radius:var(--x-radius);background:var(--x-ground);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);`, host);
    win.dir = rtl ? "rtl" : "ltr";
    const page = mk("div", "position:absolute;left:0;top:0;width:100%;", win);
    // hero: drawn ground
    const heroH = H * 0.9;
    const hero = mk("div", `position:relative;height:${heroH.toFixed(1)}px;overflow:hidden;background:linear-gradient(180deg, color-mix(in srgb, var(--x-ink) 92%, var(--x-accent)) 0%, color-mix(in srgb, var(--x-accent) 55%, var(--x-ink)) 62%, color-mix(in srgb, var(--x-accent-2) 60%, var(--x-ink)) 100%);`, page);
    mk("div", `position:absolute;left:${rtl ? "14%" : "62%"};top:30%;width:${px(220)};height:${px(220)};border-radius:50%;background:radial-gradient(circle, color-mix(in srgb, var(--x-accent-2) 70%, var(--x-panel)) 0%, transparent 70%);`, hero);
    const NS = "http://www.w3.org/2000/svg", svg = doc.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 1000 300"); svg.setAttribute("preserveAspectRatio", "none");
    svg.style.cssText = `position:absolute;left:0;bottom:0;width:100%;height:${(heroH * 0.42).toFixed(1)}px;`;
    [["M0 190 L180 110 L320 170 L470 80 L640 160 L800 100 L1000 170 L1000 300 L0 300Z", 55], ["M0 240 L150 180 L300 230 L520 160 L700 220 L860 170 L1000 210 L1000 300 L0 300Z", 80]].forEach(([d, m]) => { const pa = doc.createElementNS(NS, "path"); pa.setAttribute("d", d); pa.setAttribute("fill", `color-mix(in srgb, var(--x-ink) ${m}%, var(--x-accent))`); svg.append(pa); });
    hero.append(svg);
    const heroTxt = mk("div", `position:absolute;inset-inline-start:${px(48)};top:38%;max-width:70%;color:var(--x-panel);`, hero);
    mk("div", `font:var(--x-label-weight) ${px(24)} ${rtl ? "var(--x-body-font)" : "var(--x-label-font)"};letter-spacing:${rtl ? "0" : "var(--x-label-track)"};text-transform:var(--x-label-case);opacity:.8;margin-bottom:${px(14)};`, heroTxt, String(p.kicker || "").trim() || (rtl ? "إقامة هادية" : "Quiet stays"));
    mk("div", `font:var(--x-head-weight) ${px(72)}/1.1 var(--x-head-font);letter-spacing:${track};`, heroTxt, String(p.title || "").trim() || (lentText.length <= 40 ? lentText : "") || (rtl ? "استرح بين الجبال" : "Rest among the ridges"));
    // content below the hero
    const body = mk("div", `padding:${px(48)};display:grid;grid-template-columns:repeat(${W > H ? 3 : 2}, 1fr);gap:${px(24)};background:var(--x-ground);color:var(--x-ink);`, page);
    mk("div", `grid-column:1 / -1;font:var(--x-head-weight) ${px(48)}/1.15 var(--x-head-font);`, body, rtl ? "اختار جناحك" : "Choose your suite");
    for (let i = 0; i < (W > H ? 6 : 4); i++) {
      const c = mk("div", `border-radius:calc(var(--x-radius) * 0.6);overflow:hidden;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);`, body);
      mk("div", `height:${px(150)};background:linear-gradient(${140 + i * 20}deg, color-mix(in srgb, var(--x-accent) ${40 + i * 8}%, var(--x-panel)), color-mix(in srgb, var(--x-accent-2) 50%, var(--x-ink)));`, c);
      mk("div", `padding:${px(16)};font:600 ${px(28)} var(--x-body-font);`, c, rtl ? ["الكوخ", "الجناح", "البيت", "المرسم", "الشرفة", "الحديقة"][i] : ["Cabin", "Suite", "Lodge", "Studio", "Terrace", "Garden"][i]);
    }

    // the nav
    const brand = String(p.brand || "").trim() || (rtl ? "أرز" : "Cedar Lodges");
    const nav = mk("div", `position:absolute;left:0;right:0;top:0;z-index:4;display:flex;align-items:center;justify-content:space-between;gap:${px(24)};padding:${px(28)} ${px(40)};border-bottom:${Math.max(1, u).toFixed(1)}px solid transparent;`, win);
    const logo = mk("div", `display:flex;align-items:center;gap:${px(10)};white-space:nowrap;`, nav);
    const mark = doc.createElementNS(NS, "svg"); mark.setAttribute("viewBox", "0 0 24 24"); mark.setAttribute("width", (42 * u).toFixed(1)); mark.setAttribute("height", (42 * u).toFixed(1));
    const mp = doc.createElementNS(NS, "path"); mp.setAttribute("d", "M12 3l6 8h-3l4 6H5l4-6H6zM12 17v4"); mp.setAttribute("fill", "none"); mp.setAttribute("stroke", "currentColor"); mp.setAttribute("stroke-width", "1.6"); mp.setAttribute("stroke-linejoin", "round"); mark.append(mp); logo.append(mark);
    mk("span", `font:500 ${px(30)} var(--x-head-font);letter-spacing:${rtl ? "0" : "0.16em"};text-transform:${rtl ? "none" : "uppercase"};`, logo, brand);
    const wideNav = W > 1200 * (Math.min(f.W, f.H) / 1080); // the links only where they fit
    if (wideNav) {
      const links = mk("div", `display:flex;gap:${px(34)};font:400 ${px(22)} var(--x-body-font);letter-spacing:${rtl ? "0" : "0.12em"};text-transform:${rtl ? "none" : "uppercase"};white-space:nowrap;`, nav);
      (rtl ? ["الأجنحة", "التجارب", "المطعم", "تواصل"] : ["Suites", "Experiences", "Dining", "Contact"]).forEach((l) => mk("span", "", links, l));
    }
    const cta = mk("div", `padding:${px(14)} ${px(30)};border-radius:var(--x-radius-s);background:${accentTint ? "var(--x-accent-ink)" : "var(--x-accent)"};color:${accentTint ? "var(--x-accent)" : "var(--x-accent-ink)"};font:500 ${px(24)} var(--x-body-font);letter-spacing:${rtl ? "0" : "0.12em"};text-transform:${rtl ? "none" : "uppercase"};white-space:nowrap;`, nav, rtl ? "احجز" : "Reserve");
    const navH = nav.offsetHeight;

    // timing
    const tS = at + Math.min(0.5, Math.max(0.15, (end - at) * 0.3)); // the page starts to move, once the clear bar has been seen
    const tN = p.trigger === "cut" ? tS : tS + 0.12; // scrollY passes 50
    const p2 = (t, a, d) => 1 - Math.pow(1 - ML.lin(t, a, a + d), 2); // power2.out
    const travel = Math.min(heroH - navH * 1.4, page.offsetHeight - H);
    const scrollDur = Math.max(0.5, Math.min(1.1, end - tS - 0.2));
    if (p.trigger === "cut") ctx.sfx(tS, "whoosh.soft", 0.25);
    const ink0 = "var(--x-panel)", ink1 = lightTint ? "var(--x-ink)" : accentTint ? "var(--x-accent-ink)" : "var(--x-panel)";

    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.2, end);
        const a = ML.out(t, at, at + 0.3);
        host.style.opacity = (a * (1 - leave)).toFixed(4);
        let y;
        if (p.trigger === "cut") y = t >= tS ? travel : 0;
        else if (p.trigger === "camera-pan") y = travel * ML.clamp(ML.step(t - tS, ML.SPRING.camera));
        else y = travel * ML.ease(t, tS, tS + scrollDur);
        page.style.translate = `0 ${(-y).toFixed(2)}px`;
        // the bar: transparent → tinted solid in 0.5 s power2.out
        const s = t < tN ? 0 : p2(t, tN, 0.5);
        nav.style.background = s > 0.001 ? `color-mix(in srgb, ${tint} ${(alpha * 100 * s).toFixed(1)}%, transparent)` : "transparent";
        nav.style.backdropFilter = s > 0.001 ? `blur(${(blurPx * s * u).toFixed(2)}px)` : "none";
        nav.style.boxShadow = s > 0.001 ? `0 ${px(1)} ${px(2)} color-mix(in srgb, var(--x-ink) ${(10 * s).toFixed(1)}%, transparent)` : "none";
        nav.style.borderBottomColor = `color-mix(in srgb, var(--x-panel) ${(10 * (1 - s)).toFixed(1)}%, transparent)`;
        nav.style.color = `color-mix(in srgb, ${ink1} ${(100 * s).toFixed(1)}%, ${ink0})`;
      },
    };
  },
});
