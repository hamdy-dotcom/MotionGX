// Card slams up with motion blur: an app window (a rebuilt CRM list — a light panel, small radius, deep shadow) rockets
// in from below the frame (or from a side) over the text in 0.45 s expo.out, overshoots 10 px and settles. For the
// first 60 % of the flight it carries a one-axis motion blur along its path (an SVG feGaussianBlur with a zero
// deviation across the motion — CSS blur() cannot do one axis), fading to sharp as it brakes. The scene behind dims to
// 50 % under a veil of the ground colour. No picture is ever blurred: the window is rebuilt from look variables.
// Source: prompt-motion "xelandre-wtf-avec-ce-prompt" (reference only — rebuilt as our own code).
ML.define({
  id: "element.card-slam-up-blur",
  category: "element",
  name: "Card shoots up from the bottom with motion blur",
  does: "A white app window (a CRM list) rockets up from below the frame over the text, heavily motion-blurred, then settles.",
  says: ["arrival", "energy", "tech"],
  energy: 4,
  targets: ["screen", "card"],
  duration: [0.5, 1.2],
  params: {
    direction: { type: "choice", options: ["up", "left", "right"], default: "up" },
    blur: { type: "number", range: [4, 16], default: 12, unit: "px" },
    dim_behind: { type: "bool", default: true },
  },
  pairs: ["camera.impact-shake", "text-in.punchline", "ui.cursor-glide-click"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.heavy",
  source: { from: "prompt-motion:xelandre-wtf-avec-ce-prompt", license: "reference", note: "technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080;
    const layer = mk("div", `position:absolute;inset:0;pointer-events:none;z-index:7;`, host);
    const veil = p.dim_behind ? mk("div", "position:absolute;inset:0;background:var(--x-ground);opacity:0;", layer) : null;

    // the one-axis blur filter
    const fid = "ml-slam-" + Math.floor(ML.rnd(at * 13.7 + f.W, 3) * 1e9);
    const svg = doc.createElementNS(NS, "svg");
    svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.style.position = "absolute";
    svg.innerHTML = `<filter id="${fid}" x="-10%" y="-40%" width="120%" height="180%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="0 0"/></filter>`;
    layer.append(svg);
    const gb = svg.querySelector("feGaussianBlur");

    // the window: 3:2, as wide as the picture band allows (600×400 at a 1080 stage, larger on a bigger band)
    const R = f.pic;
    const cw = Math.min(R.w * 0.94, (R.h * 0.9) * 1.5, 960 * k), ch = cw / 1.5;
    const cx = R.x + (R.w - cw) / 2, cy = R.y + (R.h - ch) / 2;
    const card = mk("div", `position:absolute;left:${cx}px;top:${cy}px;width:${cw}px;height:${ch}px;box-sizing:border-box;overflow:hidden;background:var(--x-panel);border-radius:calc(var(--x-radius) * 0.4);box-shadow:0 ${30 * k}px ${60 * k}px color-mix(in srgb, var(--x-ink) 40%, transparent);display:flex;flex-direction:column;will-change:transform;`, layer);
    const u = ch / 400; // the window's own unit
    const bar = mk("div", `flex:none;height:${34 * u}px;display:flex;align-items:center;gap:${7 * u}px;padding:0 ${14 * u}px;background:var(--x-bar);border-bottom:var(--x-edge) solid var(--x-line);flex-direction:${rtl ? "row-reverse" : "row"};`, card);
    ["--x-light-1", "--x-light-2", "--x-light-3"].forEach((v) => mk("span", `width:${10 * u}px;height:${10 * u}px;border-radius:50%;background:var(${v});opacity:var(--x-lights);`, bar));
    mk("span", `flex:1;text-align:center;font:var(--x-label-weight) ${11 * u}px var(--x-label-font);color:var(--x-bar-ink);letter-spacing:${rtl ? 0 : "0.08em"};`, bar, rtl ? "العملاء" : "CRM · Contacts");
    const head = mk("div", `flex:none;display:flex;align-items:center;justify-content:space-between;padding:${14 * u}px ${20 * u}px ${8 * u}px;`, card);
    mk("div", `font:var(--x-head-weight) ${20 * u}px var(--x-head-font);color:var(--x-ink);`, head, rtl ? "العملاء" : "Contacts");
    mk("div", `padding:${5 * u}px ${12 * u}px;border-radius:var(--x-radius-s);background:var(--x-accent);color:var(--x-accent-ink);font:600 ${11 * u}px var(--x-body-font);`, head, rtl ? "+ عميل جديد" : "+ New");
    const cols = mk("div", `flex:none;display:grid;grid-template-columns:2fr 1.4fr 1fr;padding:${6 * u}px ${20 * u}px;font:var(--x-label-weight) ${9.5 * u}px var(--x-label-font);color:var(--x-dim);letter-spacing:${rtl ? 0 : "0.1em"};text-transform:${rtl ? "none" : "uppercase"};border-bottom:var(--x-edge) solid var(--x-line);`, card);
    (rtl ? ["الاسم", "الشركة", "الحالة"] : ["Name", "Company", "Status"]).forEach((x) => mk("span", "", cols, x));
    const ROWS = rtl
      ? [["سارة منصور", "نوفا", 0], ["أحمد فريد", "سحابة", 1], ["ليلى حسن", "مدار", 2], ["عمر خالد", "بوصلة", 0], ["منى سامي", "رواق", 1], ["يوسف نبيل", "أفق", 2]]
      : [["Sara Mansour", "Nova Labs", 0], ["Adam Fried", "Cloudline", 1], ["Lena Hart", "Orbit Co", 2], ["Omar Khalid", "Compass", 0], ["Mona Sami", "Arcade", 1], ["Yusuf Nabil", "Horizon", 2]];
    const ST = rtl ? ["فاز", "متابعة", "جديد"] : ["Won", "Follow-up", "New"];
    const SC = ["var(--x-good)", "var(--x-accent)", "var(--x-dim)"];
    ROWS.forEach(([nm, co, s], i) => {
      const r = mk("div", `flex:none;display:grid;grid-template-columns:2fr 1.4fr 1fr;align-items:center;padding:${8.5 * u}px ${20 * u}px;border-bottom:var(--x-edge) solid var(--x-line);font:400 ${12.5 * u}px var(--x-body-font);color:var(--x-ink);`, card);
      const a = mk("span", `display:flex;align-items:center;gap:${9 * u}px;`, r);
      mk("span", `flex:none;width:${22 * u}px;height:${22 * u}px;border-radius:50%;background:color-mix(in srgb, ${i % 2 ? "var(--x-accent-2)" : "var(--x-accent)"} ${40 + i * 9}%, var(--x-panel-2));`, a);
      mk("span", "font-weight:600;white-space:nowrap;", a, nm);
      mk("span", "color:var(--x-dim);white-space:nowrap;", r, co);
      const chip = mk("span", `justify-self:start;padding:${3 * u}px ${9 * u}px;border-radius:var(--x-radius-s);font:600 ${10.5 * u}px var(--x-body-font);color:${SC[s]};background:color-mix(in srgb, ${SC[s]} 13%, transparent);white-space:nowrap;`, r, ST[s]);
      void chip;
    });

    // flight: from fully off the frame along the chosen axis
    const side = p.direction === "up" ? null : (p.direction === "left" ? -1 : 1) * (rtl ? -1 : 1); // −1: comes from the left
    const D = side == null ? Math.max(700 * k, f.H - cy + 20 * k) : side < 0 ? cx + cw + 20 * k : f.W - cx + 20 * k;
    const fly = 0.45, over = 10 * k;
    ctx.sfx(at, "whoosh.heavy", 0.5);
    ctx.sfx(at + fly * 0.8, "land.light", 0.35);
    const goA = Math.max(at + fly + 0.35, end - 0.25);

    return {
      draw(t) {
        const leave = ML.clamp((t - goA) / 0.22);
        layer.style.visibility = t < at - 0.05 ? "hidden" : "visible";
        if (veil) veil.style.opacity = (0.5 * ML.out(t, at, at + fly) * (1 - leave)).toFixed(4);
        // y (or x) offset: off-frame → −10 px past the rest (expo.out), then back to rest
        const e = ML.expo(t, at, at + fly);
        let d = D + (-over - D) * e;
        d += over * ML.ease(t, at + fly * 0.85, at + fly + 0.22);
        const vec = side == null ? `0px, ${d.toFixed(2)}px` : `${(d * (side < 0 ? -1 : 1)).toFixed(2)}px, 0px`;
        card.style.transform = `translate(${vec})`;
        card.style.opacity = (1 - leave).toFixed(4);
        // blur along the path for the first 60 % of the flight
        const bl = p.blur * k * 1.6 * (1 - ML.lin(t, at, at + fly * 0.6));
        if (bl > 0.1 && t >= at) {
          gb.setAttribute("stdDeviation", side == null ? `0 ${bl.toFixed(2)}` : `${bl.toFixed(2)} 0`);
          card.style.filter = `url(#${fid})`;
        } else card.style.filter = "none";
      },
    };
  },
});
