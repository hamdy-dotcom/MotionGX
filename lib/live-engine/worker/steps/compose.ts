/* eslint-disable */
// @ts-nocheck — verbatim port of video-sandbox/steps/compose.mjs; the only edits are listed in scripts/live-engine/port-sandbox.py.
// STEP 5b′ — compose. Script + brand + a small director plan → the full composition, written by code from tested motion
// recipes (vendor/recipes.js). The model only decides WHAT each scene shows; HOW it moves is guaranteed here,
// so every video is alive: living background, brand mark, kinetic type, devices flying in, camera tours inside the
// real screens, replayed flows (type → tap → result), phone scrolls, counting numbers, logo outro.
import fs from "node:fs";
import path from "node:path";
import { LAYOUTS } from "./script";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const has = (brandDir, id) => fs.existsSync(path.join(brandDir, "clones", `${id}.json`));
const LIVE = /^live-/;

/** which recipe a scene gets, and which live asset it plays */
export function recipeFor(scene, assetsById, brandDir, brand) {
  const live = (scene.visual.assets || []).map((id) => assetsById[id]).filter((a) => a && LIVE.test(a.kind));
  const pick = (k) => live.find((a) => a.kind.startsWith(k));
  if (scene.purpose === "hook" && !live.length) return { recipe: "hook" };
  if (scene.purpose === "problem" && !live.length) return { recipe: "stack" };
  if (scene.purpose === "offer") return { recipe: "stat" };
  if (scene.purpose === "cta") return { recipe: "cta" };
  const flow0 = pick("live-flow"), sid0 = flow0 && flow0.id.replace(/-flow$/, "");
  const cust = sid0 && (brand?.screens || []).find((x) => x.id === sid0)?.customer;
  if (cust && has(brandDir, `${sid0}-mobile`)) return { recipe: "phone", ui: `${sid0}-mobile`, asset: flow0 };
  const flow = flow0; if (flow) { const sid = flow.id.replace(/-flow$/, ""); if (has(brandDir, `${sid}-before`) && has(brandDir, sid)) return { recipe: "replay", a: `${sid}-before`, b: sid, asset: flow }; }
  const phone = pick("live-phone"); if (phone) { const id = phone.id.replace(/-phone$/, "-mobile"); if (has(brandDir, id)) return { recipe: "phone", ui: id, asset: phone }; }
  const screen = pick("live-screen"); if (screen && has(brandDir, screen.id)) return { recipe: "tour", ui: screen.id, asset: screen };
  const block = pick("live-block"); if (block && has(brandDir, block.id)) return { recipe: "hero", ui: block.id, asset: block };
  return { recipe: scene.purpose === "problem" ? "stack" : "hook" };
}

/** the block of a screen worth lifting out toward the viewer: plan focus first, else the richest block (not the sidebar) */
function popPart(brandDir, screenId, focus) {
  const c = fs.existsSync(path.join(brandDir, "clones", `${screenId}.json`)) && JSON.parse(fs.readFileSync(path.join(brandDir, "clones", `${screenId}.json`), "utf8"));
  if (!c) return null;
  const inBox = (b, r) => b[0] >= r[0] - 4 && b[1] >= r[1] - 4 && b[0] + b[2] <= r[0] + r[2] + 4 && b[1] + b[3] <= r[1] + r[3] + 4;
  const parts = c.keys.filter((k) => k.part != null).filter((k) => k.box[2] < c.w * 0.9 && !(k.box[2] < c.w * 0.2 && k.box[3] > c.h * 0.6) && k.box[2] * k.box[3] > 20000);
  const score = (k) => c.keys.filter((x) => inBox(x.box, k.box) && ["stat", "row", "field", "button", "chart", "image", "item"].includes(x.role)).length * 4 + Math.min(k.box[2] * k.box[3] / 40000, 6);
  const want = (focus || []).map((f) => String(f).match(/^part:(\d+)$/)?.[1]).filter((x) => x != null).map(Number);
  const cands = [...parts.filter((k) => want.includes(k.part)), ...parts.sort((a, b) => score(b) - score(a))];
  for (const k of cands) {
    const id = `${screenId}-p${String(k.part).padStart(2, "0")}`;
    const f = path.join(brandDir, "clones", `${id}.json`); if (!fs.existsSync(f)) continue;
    const pc = JSON.parse(fs.readFileSync(f, "utf8")); const w = 940, h = Math.round(pc.h * (w / pc.w));
    if (h < 160 || h > 820) continue;
    return { id, w, h };
  }
  return null;
}

/** headline → word spans; the highlight word gets the brand gradient + an underline sweep */
function headline(text, hi) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const h = hi && words.find((w) => w.replace(/[^\p{L}\p{N}]/gu, "") === String(hi).replace(/[^\p{L}\p{N}]/gu, "")) ? hi : words[words.length - 1];
  return words.map((w) => (w === h ? `<span class="w hi">${esc(w)}<i class="hi-line"></i></span>` : `<span class="w">${esc(w)}</span>`)).join(" ");
}

export function compose({ brief, brand, script, assets, plan = {}, brandDir, runDir }) {
  const [W, H] = LAYOUTS[brief.layout] || LAYOUTS["9:16"];
  const rel = (p) => path.relative(runDir, path.join(brandDir, p)).split(path.sep).join("/");
  const byId = Object.fromEntries(assets.map((a) => [a.id, a]));
  const P = brand.palette || {}, F = brand.fonts || {};
  const rtl = /arab|rtl/i.test(brand.language || "") || /[؀-ۿ]/.test(script.scenes.map((s) => s.headline).join(""));
  const logo = brand.logo?.file ? rel(brand.logo.file) : null;
  const gfonts = (F.google_fonts || []).slice(0, 3).map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;600;800`).join("&");
  const disp = `'${F.display || F.google_fonts?.[0] || "Cairo"}', 'Noto Kufi Arabic', sans-serif`, body = `'${F.body || F.google_fonts?.[1] || F.display || "Cairo"}', 'Noto Sans Arabic', sans-serif`;
  const grad = P.gradient || `linear-gradient(90deg, ${P.primary || "#3b82f6"}, ${P.accent || P.primary || "#a78bfa"})`;
  const dark = (P.theme || "dark") === "dark";
  const lapW = Math.min(W - 160, 920), lapLeft = Math.round((W - lapW) / 2);
  const portrait = H > W;
  const devTop = portrait ? 800 : 260, coTop = portrait ? 1560 : H - 150;
  const scenes = [], calls = [];

  script.scenes.forEach((sc, i) => {
    const n = i + 1, s = sc.start, d = sc.bars * 2, p = plan[n] || {};
    const r = recipeFor(sc, byId, brandDir, brand), id = `sc${n}`;
    const hl = `<div class="head"><div class="hl">${headline(sc.headline, p.highlight)}</div>${sc.sub ? `<div class="sub">${esc(sc.sub)}</div>` : ""}</div>`;
    const callouts = (p.callouts || []).slice(0, 2).map((c) => `<div class="co"><b>✓</b>${esc(c)}</div>`).join("");
    const co = callouts ? `<div class="cos">${callouts}</div>` : "";
    let vis = "", call = "";
    const pop = (r.recipe === "tour" || r.recipe === "replay") && d >= 4 ? popPart(brandDir, r.ui || r.b, p.focus) : null;
    const popHtml = pop ? `<div class="pop" style="top:${Math.round(devTop + 420 - pop.h / 2)}px"><div id="p${n}" class="ui" data-clone="${pop.id}" data-w="${pop.w}" data-h="${pop.h}" data-frame="none"></div></div>` : "";
    const popArg = pop ? `,pop:"#p${n}"` : "";
    if (r.recipe === "tour") { vis = `<div class="vis"><div class="dev laptop"><div id="u${n}" class="ui" data-clone="${r.ui}"></div></div>${popHtml}</div>`; call = `K.R.tour(tl,{sc:"#${id}",ui:"#u${n}",s:${s},d:${d},focus:${JSON.stringify(p.focus || [])}${popArg}});`; }
    else if (r.recipe === "replay") { vis = `<div class="vis"><div class="dev laptop"><div id="u${n}a" class="ui" data-clone="${r.a}"></div><div id="u${n}b" class="ui ui-after" data-clone="${r.b}"></div><div class="ok">✓</div></div>${popHtml}</div>`; call = `K.R.replay(tl,{sc:"#${id}",a:"#u${n}a",b:"#u${n}b",s:${s},d:${d}${p.typeKey ? `,typeKey:"${p.typeKey}"` : ""}${p.tapKey ? `,tapKey:"${p.tapKey}"` : ""}${p.result ? `,result:${JSON.stringify(p.result)}` : ""}${popArg}});`; }
    else if (r.recipe === "phone") { vis = `<div class="vis"><div class="dev phone"><div class="notch"></div><div id="u${n}" class="ui" data-clone="${r.ui}" data-w="390" data-h="800" data-frame="none"></div></div></div>`; call = `K.R.phone(tl,{sc:"#${id}",ui:"#u${n}",s:${s},d:${d}${p.tapKey ? `,tapKey:"${p.tapKey}"` : ""}});`; }
    else if (r.recipe === "hero") { const c = JSON.parse(fs.readFileSync(path.join(brandDir, "clones", `${r.ui}.json`), "utf8")); const bh = Math.round(Math.min(c.h * (lapW / c.w), portrait ? 740 : H * 0.6)); vis = `<div class="vis"><div class="glow"></div><div class="dev block"><div id="u${n}" class="ui" data-clone="${r.ui}" data-w="${lapW}" data-h="${bh}" data-frame="none"></div></div></div>`; call = `K.R.hero(tl,{sc:"#${id}",ui:"#u${n}",s:${s},d:${d}});`; }
    else if (r.recipe === "stack") { const pains = (p.pains && p.pains.length ? p.pains : (/[+،,]/.test(sc.headline) ? sc.headline : String(sc.sub || sc.headline)).split(/[+،,]| و /).map((x) => x.trim()).filter(Boolean)).slice(0, 4); vis = `<div class="vis"><div class="pains">${pains.map((x) => `<div class="pain">${esc(x)}</div>`).join("")}</div><div class="xmark">✕</div></div>`; call = `K.R.stack(tl,{sc:"#${id}",s:${s},d:${d}});`; }
    else if (r.recipe === "stat") { const num = p.number || (String(sc.headline + " " + (sc.sub || "")).match(/[0-9٠-٩][0-9٠-٩٬,.]*/) || [""])[0]; vis = `<div class="vis"><div class="ring"></div><div class="ring"></div>${num ? `<div class="bignum">${esc(num)}</div>` : ""}</div>`; call = `K.R.stat(tl,{sc:"#${id}",s:${s},d:${d}});`; }
    else if (r.recipe === "cta") { vis = `<div class="vis"><div class="halo"></div>${logo ? `<img class="biglogo" src="${logo}">` : `<div class="biglogo txt">${esc(brand.name_ar || brand.name)}</div>`}<div class="cta-btn">${esc(p.button || (rtl ? "ابدأ مجاناً" : "Start free"))}</div><div class="url" data-text="${esc((brand.site || "").replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""))}"></div></div>`; call = `K.R.cta(tl,{sc:"#${id}",s:${s},d:${d}});`; }
    else { vis = logo ? `<div class="vis"><img class="biglogo" src="${logo}"></div>` : ""; call = `K.R.hook(tl,{sc:"#${id}",s:${s},d:${d}});`; }
    scenes.push(`<div class="scene r-${r.recipe}" data-scene="${n}" id="${id}">${hl}${vis}${co}</div>`);
    calls.push(call);
  });

  const drops = [...new Set([...(script.music?.drops || []), ...script.scenes.filter((s) => ["reveal", "cta", "offer"].includes(s.purpose)).map((s) => s.start)])].filter((t) => t > 0 && t < script.length);
  const css = `
html,body{margin:0;background:${P.background || "#0b0d12"}}
#stage{width:${W}px;height:${H}px;position:relative;overflow:hidden;background:${P.background || "#0b0d12"};color:${P.ink || "#fff"};font-family:${body}}
#bg{position:absolute;inset:0;overflow:hidden}
#bg .blob{position:absolute;width:1300px;height:1300px;border-radius:50%;opacity:${dark ? 0.55 : 0.35};will-change:transform}
#bg .b1{left:-460px;top:-400px;background:radial-gradient(closest-side,${P.primary || "#3b82f6"},transparent)}
#bg .b2{right:-500px;top:${Math.round(H * 0.3)}px;background:radial-gradient(closest-side,${P.accent || P.primary || "#a78bfa"},transparent)}
#bg .b3{left:${Math.round(W * 0.1)}px;bottom:-620px;background:radial-gradient(closest-side,${P.primary || "#3b82f6"},transparent);opacity:${dark ? 0.3 : 0.2}}
#bg .grid{position:absolute;inset:-50%;background-image:linear-gradient(${dark ? "rgba(255,255,255,.045)" : "rgba(0,0,0,.05)"} 1px,transparent 1px),linear-gradient(90deg,${dark ? "rgba(255,255,255,.045)" : "rgba(0,0,0,.05)"} 1px,transparent 1px);background-size:72px 72px;transform:perspective(900px) rotateX(58deg);transform-origin:50% 0;top:45%}
#bar{position:absolute;left:0;top:0;height:8px;width:100%;background:${grad};transform-origin:${rtl ? "right" : "left"};z-index:50}
#mark{position:absolute;top:56px;${rtl ? "right" : "left"}:64px;height:64px;z-index:40;visibility:hidden}
.scene{position:absolute;inset:0;visibility:hidden;opacity:0}
.head{position:absolute;left:${Math.round(W * 0.07)}px;right:${Math.round(W * 0.07)}px;top:${portrait ? 300 : 80}px;text-align:center}
.hl{font-family:${disp};font-weight:800;font-size:${Math.round(W / 11.5)}px;line-height:1.3;color:${P.ink || "#fff"}}
.hl .w{display:inline-block;margin:0 .1em}
.hl .hi{background:${grad};-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;position:relative}
.hl .hi-line{position:absolute;left:0;right:0;bottom:.02em;height:.09em;border-radius:9px;background:${grad};transform-origin:${rtl ? "right" : "left"}}
.sub{margin-top:22px;font-size:${Math.round(W / 26)}px;line-height:1.45;color:${P.muted || "#9aa0b4"}}
.vis{position:absolute;inset:0;transform-origin:50% 55%}
.dev{position:absolute}
.laptop{left:${lapLeft}px;top:${devTop}px;width:${lapW}px;height:${Math.round(lapW * 10 / 16)}px}
.laptop .ui{position:absolute;left:0;top:0}
.ui-after{visibility:hidden}
.pop{position:absolute;left:${Math.round((W - 940) / 2)}px;opacity:0;z-index:6}
.pop .ui{border-radius:26px;background:${P.surface || "#13161d"};box-shadow:0 50px 140px rgba(0,0,0,.65),0 0 0 3px ${P.primary || "#3b82f6"}88}
.ok{position:absolute;${rtl ? "left" : "right"}:-30px;top:-40px;width:110px;height:110px;border-radius:50%;background:${grad};color:#fff;font:800 64px/110px sans-serif;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.45);opacity:0;z-index:5}
.phone{left:${Math.round((W - 430) / 2)}px;top:${portrait ? 700 : 120}px;width:430px;height:860px;border-radius:64px;background:#0a0a0c;box-shadow:0 0 0 3px #3a3d45,0 0 0 9px #16171b,0 60px 140px rgba(0,0,0,.6)}
.phone .ui{position:absolute;left:20px;top:30px;border-radius:40px;overflow:hidden;background:#fff}
.phone .notch{position:absolute;left:50%;top:14px;width:130px;height:30px;margin-left:-65px;border-radius:20px;background:#000;z-index:3}
.block{left:${lapLeft}px;top:${portrait ? 760 : 220}px}
.block .ui{position:relative;border-radius:28px;background:${P.surface || "#13161d"};box-shadow:0 40px 120px rgba(0,0,0,.5),0 0 0 2px ${P.primary || "#3b82f6"}33}
.glow{position:absolute;left:50%;top:${portrait ? 1050 : 520}px;width:800px;height:800px;margin:-400px 0 0 -400px;border-radius:50%;background:radial-gradient(${P.primary || "#3b82f6"}55,transparent 65%);opacity:.6}
.cos{position:absolute;left:60px;right:60px;top:${coTop}px;display:flex;flex-wrap:wrap;gap:22px;justify-content:center}
.co{padding:20px 34px;border-radius:999px;background:${P.surface || "#13161d"}e6;border:2px solid ${P.primary || "#3b82f6"}66;font-size:38px;font-weight:700;box-shadow:0 14px 40px rgba(0,0,0,.35)}
.r-phone .cos{top:${portrait ? 1610 : H - 150}px}
.co b{color:${P.primary || "#3b82f6"};margin-inline-end:12px}
.r-hook .head,.r-stack .head{top:${portrait ? 560 : 200}px}
.r-hook .biglogo{position:absolute;left:50%;top:${portrait ? 330 : 60}px;height:150px;transform:translateX(-50%)}
.pains{position:absolute;left:120px;right:120px;top:${portrait ? 1000 : 520}px;display:flex;flex-direction:column;gap:26px;align-items:center}
.pain{padding:28px 44px;border-radius:26px;background:${P.surface || "#13161d"};border:2px solid #ef444466;font-size:46px;font-weight:700;color:${P.ink || "#fff"};box-shadow:0 18px 50px rgba(0,0,0,.4)}
.xmark{position:absolute;left:50%;top:${portrait ? 1180 : 600}px;margin-left:-110px;width:220px;height:220px;border-radius:50%;background:#ef4444;color:#fff;font:900 150px/220px sans-serif;text-align:center;opacity:0}
.r-stat .head{top:${portrait ? 380 : 100}px}
.bignum{position:absolute;left:0;right:0;top:${portrait ? 820 : 360}px;text-align:center;font-family:${disp};font-weight:900;font-size:${Math.round(W / 3.2)}px;line-height:1;background:${grad};-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent}
.ring{position:absolute;left:50%;top:${portrait ? 990 : 470}px;width:520px;height:520px;margin:-260px 0 0 -260px;border-radius:50%;border:6px solid ${P.primary || "#3b82f6"}}
.r-cta .head{top:${portrait ? 820 : 260}px}
.r-cta .biglogo{position:absolute;left:50%;top:${portrait ? 430 : 60}px;height:230px;transform:translateX(-50%)}
.r-cta .biglogo.txt{height:auto;font-family:${disp};font-weight:900;font-size:150px;background:${grad};-webkit-background-clip:text;color:transparent}
.halo{position:absolute;left:50%;top:${portrait ? 545 : 175}px;width:520px;height:520px;margin:-260px 0 0 -260px;border-radius:50%;background:conic-gradient(from 0deg,transparent,${P.primary || "#3b82f6"}aa,transparent 40%,${P.accent || "#a78bfa"}aa,transparent 75%);-webkit-mask:radial-gradient(closest-side,#000 55%,transparent);mask:radial-gradient(closest-side,#000 55%,transparent)}
.cta-btn{position:absolute;left:50%;top:${portrait ? 1250 : 560}px;transform:translateX(-50%);padding:36px 90px;border-radius:${Math.max(18, Math.min(60, brand.radius || 999))}px;background:${grad};color:#fff;font-family:${disp};font-weight:800;font-size:60px;white-space:nowrap;box-shadow:0 24px 70px ${P.primary || "#3b82f6"}66}
.url{position:absolute;left:0;right:0;top:${portrait ? 1450 : 700}px;text-align:center;font-size:44px;color:${P.muted || "#9aa0b4"};direction:ltr}`;

  const html = `<!doctype html><html><head><meta charset="utf-8">
<script src="../../vendor/gsap.min.js"></script><script src="../../vendor/kit.js"></script><script src="../../vendor/recipes.js"></script>
${gfonts ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${gfonts}&display=swap">` : ""}
<style>${css}</style></head><body>
<div id="stage"${rtl ? ' dir="rtl"' : ""}>
<div id="bg"><div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div><div class="grid"></div></div>
<div id="bar"></div>${logo ? `<img id="mark" src="${logo}">` : ""}
${scenes.join("\n")}
</div>
<script>
const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
K.R.bg(tl, ${script.length}, ${JSON.stringify(drops)});
${logo ? `K.R.mark(tl, ${script.scenes[0].bars * 2}, ${script.scenes.at(-1).start});` : ""}
${calls.join("\n")}
K.done(tl, ${script.length});
</script></body></html>`;
  return { html, recipes: script.scenes.map((sc) => recipeFor(sc, byId, brandDir, brand).recipe) };
}
