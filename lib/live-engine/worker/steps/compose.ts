/* eslint-disable */
// @ts-nocheck — verbatim port of video-sandbox/steps/compose.mjs; the only edits are listed in scripts/live-engine/port-sandbox.py.
// STEP 5b′ — compose. Script + brand + the ART DIRECTION (a style spec taken from the brand's own site: background, type,
// shapes, a layout per scene, transition family, tempo, hook / CTA style, scene order) + a small director plan → the full
// composition. The look comes from the spec; the motion mechanics (camera inside the real screens, replayed flows,
// phone scrolls, counting numbers, pops) come from tested recipes (vendor/recipes.js), so every video is alive and none
// looks like the last one.
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
  const spans = words.map((w) => (w === h ? `<span class="w hi">${esc(w)}<i class="hi-line"></i></span>` : `<span class="w">${esc(w)}</span>`));
  // the last two words stay on one line: never a single-word last line
  if (spans.length >= 3) spans.splice(-2, 2, `<span class="nb">${spans.at(-2)} ${spans.at(-1)}</span>`);
  return spans.join(" ");
}

/** the director may swap which asset a scene plays (a change request, or a QA retry): only one of the scene's own assets or another live asset */
const withAsset = (sc, p, byId) => (p.asset && byId[p.asset] && LIVE.test(byId[p.asset].kind) ? { ...sc, visual: { ...sc.visual, assets: [p.asset] } } : sc);

// ─────────────────────────── the art-direction vocabulary ───────────────────────────
export const LAYOUT_LIB = ["photo", "split", "card", "stack", "device", "bigtype", "tiles", "ticker"];
export const DEVICE_LAYOUTS = ["device", "split", "stack", "card"]; // layouts that can hold a live product screen
export const BACKGROUNDS = ["photo-led", "glow", "flat", "grid", "mesh", "texture"];
export const TRANSITIONS = ["cut", "whip", "mask", "zoom", "slide"];
export const TEMPOS = { calm: 1.25, steady: 1, punchy: 0.8 };
export const HOOKS = ["kinetic-type", "photo-reveal", "question-card", "product-first", "stat-slam", "ticker"];
export const CTAS = ["logo-button", "big-url", "card", "split-photo", "type-only"];
export const FREE_RECIPES = ["type", "pains", "count", "logo"]; // motion for scenes without a live screen
export const HIGHLIGHTS = ["gradient", "underline", "marker", "box", "color"];
const DEVICE_RECIPES = ["tour", "replay", "phone", "hero"];
const OLD = { hook: "type", stack: "pains", stat: "count", cta: "logo" };
const pick = (v, list, d) => (list.includes(v) ? v : d);
const numberIn = (sc) => /[0-9٠-٩]/.test(`${sc.headline} ${sc.sub || ""}`);

/** the brand's own photos (captured images), biggest first — the full-bleed photo layouts use them */
export const photosOf = (brand) =>
  (brand.images || []).filter((im) => im.file && ["product", "lifestyle", "people", "background", "illustration"].includes(im.kind) && (im.w || 0) >= 400)
    .sort((a, b) => (b.w || 0) * (b.h || 0) - (a.w || 0) * (a.h || 0)).slice(0, 12)
    .map((im, i) => ({ id: `img${i + 1}`, file: im.file, kind: im.kind, w: im.w, h: im.h, note: im.note || im.alt || "" }));

/** what makes two videos look alike */
export const fingerprintOf = (art) => ({ layouts: art.scenes.map((s) => s.layout), transition: art.transition, background: art.background, hook: art.hook, cta: art.cta });
const sameLayouts = (a = [], b = []) => { const n = Math.max(a.length, b.length); let eq = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] === b[i]) eq++; return n > 0 && eq / n >= 0.6; };
/** recent videos this one is too close to: fewer than 3 of the 5 fingerprint fields differ */
export function uniqueness(fp, history = []) {
  return history.map((h) => ({ h, differ: [!sameLayouts(fp.layouts, h.layouts), fp.transition !== h.transition, fp.background !== h.background, fp.hook !== h.hook, fp.cta !== h.cta].filter(Boolean).length })).filter((x) => x.differ < 3);
}
/** the last n fingerprints of other runs next to this one (the sandbox's runs/ folder is one workspace) */
export function readHistory(runDir, n = 5) {
  const root = path.dirname(runDir), me = path.basename(runDir);
  try {
    return fs.readdirSync(root).filter((d) => d !== me && fs.existsSync(path.join(root, d, "fingerprint.json")))
      .map((d) => ({ f: path.join(root, d, "fingerprint.json"), t: fs.statSync(path.join(root, d, "fingerprint.json")).mtimeMs }))
      .sort((a, b) => b.t - a.t).slice(0, n).map((x) => JSON.parse(fs.readFileSync(x.f, "utf8")));
  } catch { return []; }
}

/**
 * The art director's answer → a spec compose() can always render: valid values, every scene covered, live product
 * screens only in layouts that hold a device, photo layouts only with a photo, the hook / CTA style applied to the
 * first / last scene in play order. Scenes stay in script numbering here; `order` is the play order.
 */
export function resolveArt(raw = {}, { script, assets, brandDir, brand }) {
  const byId = Object.fromEntries(assets.map((a) => [a.id, a])), photos = photosOf(brand), N = script.scenes.length;
  const t = raw.typography || {}, sh = raw.shapes || {};
  const art = {
    notes: raw.style_notes || "",
    background: pick(raw.background, BACKGROUNDS, "glow"),
    typography: { size: pick(t.size, ["xl", "l", "m"], "l"), weight: [500, 700, 800, 900].includes(+t.weight) ? +t.weight : 800, align: pick(t.align, ["center", "start"], "center"), highlight: pick(t.highlight, HIGHLIGHTS, "gradient") },
    shapes: { radius: Math.max(0, Math.min(48, Math.round(+sh.radius >= 0 ? +sh.radius : 26))), border: !!sh.border, glass: !!sh.glass, shadow: pick(sh.shadow, ["none", "soft", "hard"], "soft") },
    transition: pick(raw.transition, TRANSITIONS, "zoom"), tempo: pick(raw.tempo, Object.keys(TEMPOS), "steady"),
    hook: pick(raw.hook, HOOKS, "kinetic-type"), cta: pick(raw.cta, CTAS, "logo-button"),
  };
  if (art.background === "photo-led" && !photos.length) art.background = "glow";
  // play order: a permutation of 1..N, the CTA scene last
  let order = Array.isArray(raw.order) && raw.order.length === N && new Set(raw.order).size === N && raw.order.every((x) => x >= 1 && x <= N) ? raw.order.map(Number) : script.scenes.map((_, i) => i + 1);
  const ctaN = script.scenes.findIndex((s) => s.purpose === "cta") + 1;
  if (ctaN) order = [...order.filter((x) => x !== ctaN), ctaN];
  const photoFor = (want, i) => (photos.find((p) => p.id === want) || photos[i % Math.max(1, photos.length)] || null)?.id || null;
  const scenes = script.scenes.map((sc, i) => {
    const n = i + 1, want = (raw.scenes || []).find((x) => +x.n === n) || {}, r = recipeFor(sc, byId, brandDir, brand);
    if (DEVICE_RECIPES.includes(r.recipe)) return { n, recipe: r.recipe, layout: pick(want.layout, DEVICE_LAYOUTS, "device"), image: null };
    let recipe = sc.purpose === "cta" ? "logo" : pick(want.recipe, FREE_RECIPES, OLD[r.recipe] || "type");
    if (recipe === "count" && !numberIn(sc)) recipe = "type";
    let layout = pick(want.layout, LAYOUT_LIB.filter((l) => l !== "device" && l !== "stack"), "bigtype");
    if ((layout === "photo" || layout === "split") && !photos.length) layout = "bigtype";
    return { n, recipe, layout, image: layout === "photo" || layout === "split" ? photoFor(want.image, i) : null };
  });
  // the hook style shapes the opening scene (a live opening scene keeps its product screen)
  const first = scenes[order[0] - 1], firstSc = script.scenes[order[0] - 1];
  if (!DEVICE_RECIPES.includes(first.recipe)) {
    const H = { "kinetic-type": ["bigtype", "type"], "photo-reveal": photos.length ? ["photo", "type"] : ["bigtype", "type"], "question-card": ["card", "type"], "stat-slam": ["bigtype", numberIn(firstSc) ? "count" : "type"], ticker: ["ticker", "type"], "product-first": ["bigtype", "type"] }[art.hook];
    [first.layout, first.recipe] = H; first.image = first.layout === "photo" ? photoFor(null, 0) : null;
  }
  // the CTA style shapes the closing scene
  const last = scenes[order[N - 1] - 1];
  if (last.recipe === "logo") { last.cta = art.cta === "split-photo" && !photos.length ? "card" : art.cta; last.layout = last.cta === "card" ? "card" : "bigtype"; last.image = last.cta === "split-photo" ? photoFor(null, 1) : null; }
  return { ...art, order, scenes };
}

/** play the scenes in the art direction's order: new start times on the 2 s bar grid, music drops follow their scenes; art.scenes follow too */
export function applyOrder(script, art) {
  const old = script.scenes.map((s) => ({ ...s })), drops = new Set(script.music?.drops || []);
  if (art.order.every((n, i) => n === i + 1)) return art;
  let t = 0; const next = [], newDrops = [];
  art.order.forEach((n) => { const s = { ...old[n - 1] }; if (drops.has(s.start)) newDrops.push(t); s.start = t; t += s.bars * 2; next.push(s); });
  script.scenes.splice(0, script.scenes.length, ...next);
  if (script.music) script.music.drops = newDrops.filter((x) => x > 0);
  return { ...art, scenes: art.order.map((n, i) => ({ ...art.scenes[n - 1], n: i + 1, was: n })), order: art.order.map((_, i) => i + 1) };
}

export function compose({ brief, brand, script, assets, plan = {}, art, brandDir, runDir }) {
  const [W, H] = LAYOUTS[brief.layout] || LAYOUTS["9:16"];
  const rel = (p) => path.relative(runDir, path.join(brandDir, p)).split(path.sep).join("/");
  const byId = Object.fromEntries(assets.map((a) => [a.id, a]));
  art = art || resolveArt({}, { script, assets, brandDir, brand });
  const photos = Object.fromEntries(photosOf(brand).map((p) => [p.id, rel(p.file)]));
  const P = brand.palette || {}, F = brand.fonts || {};
  const rtl = /arab|rtl/i.test(brand.language || "") || /[؀-ۿ]/.test(script.scenes.map((s) => s.headline).join(""));
  const logo = brand.logo?.file ? rel(brand.logo.file) : null;
  const gfonts = (F.google_fonts || []).slice(0, 3).map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;600;800;900`).join("&");
  const disp = `'${F.display || F.google_fonts?.[0] || "Cairo"}', 'Noto Kufi Arabic', sans-serif`, body = `'${F.body || F.google_fonts?.[1] || F.display || "Cairo"}', 'Noto Sans Arabic', sans-serif`;
  const bg = P.background || "#0b0d12", ink = P.ink || "#fff", muted = P.muted || "#9aa0b4", primary = P.primary || "#3b82f6", accent = P.accent || primary, surface = P.surface || "#13161d";
  const grad = P.gradient || `linear-gradient(90deg, ${primary}, ${accent})`;
  const dark = (P.theme || "dark") === "dark";
  const lapW = Math.min(W - 160, 920), lapH = Math.round(lapW * 10 / 16), lapLeft = Math.round((W - lapW) / 2);
  const portrait = H > W, m = Math.round(W * 0.07);
  const devTop = portrait ? 800 : 260, coTop = portrait ? 1560 : H - 150;
  const phW = portrait ? 480 : 430, phH = portrait ? 960 : 860, phTop = portrait ? 700 : 120; // phone body (9:16: 480 px wide)
  const T = art.typography, S = art.shapes, hlPx = Math.round((W / 11.5) * { xl: 1.22, l: 1, m: 0.84 }[T.size]);
  const url = (brand.site || "").replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  const scenes = [], calls = [], used = [];

  script.scenes.forEach((sc, i) => {
    const n = i + 1, s = sc.start, d = sc.bars * 2, p = plan[n] || {}, id = `sc${n}`;
    const a = art.scenes[i] || { recipe: "type", layout: "bigtype" };
    // the director may have swapped the asset (a change request / QA retry): the mechanics follow the asset, the layout must hold it
    const r = recipeFor(withAsset(sc, p, byId), byId, brandDir, brand);
    let recipe = a.recipe, layout = a.layout;
    if (DEVICE_RECIPES.includes(r.recipe)) { recipe = r.recipe; if (!DEVICE_LAYOUTS.includes(layout)) layout = "device"; }
    else if (DEVICE_RECIPES.includes(recipe)) { recipe = OLD[r.recipe] || "type"; layout = "bigtype"; }
    const img = a.image && photos[a.image] ? photos[a.image] : Object.values(photos)[i % Math.max(1, Object.keys(photos).length)];
    if ((layout === "photo" || layout === "split") && !DEVICE_RECIPES.includes(recipe) && !img) layout = "bigtype";
    used.push(layout);
    const cta = recipe === "logo" ? a.cta || art.cta : null;
    // chips speak the headlines' language: with Arabic headlines, a chip without any Arabic letter is dropped
    const chips = (p.callouts || []).filter((c) => !rtl || /[؀-ۿ]/.test(c)).slice(0, 2);
    const chip = (c, style = "") => `<div class="co surface"${style ? ` style="${style}"` : ""}><b>✓</b>${esc(c)}</div>`;
    const headInner = `<div class="hl">${headline(sc.headline, p.highlight)}</div>${sc.sub ? `<div class="sub">${esc(sc.sub)}</div>` : ""}`;
    let headStyle = "", headWrap = null, vis = "", extra = "", call = "", co = chips.length ? `<div class="cos">${chips.map((c) => chip(c)).join("")}</div>` : "";

    // ── device mechanics (live product screens) ──
    let devStyle = "", devHtml = "";
    if (DEVICE_RECIPES.includes(recipe)) {
      const pop = (recipe === "tour" || recipe === "replay") && (d >= 3 || layout === "stack") ? popPart(brandDir, r.ui || r.b, p.focus) : null; // every laptop scene ≥ 3 s pops its best block
      const popTop = layout === "split" ? Math.round(200 + lapH / 2 - (pop?.h || 0) / 2) : Math.round(devTop + 420 - (pop?.h || 0) / 2);
      const popHtml = pop ? `<div class="pop" style="top:${popTop}px"><div id="p${n}" class="ui" data-clone="${pop.id}" data-w="${pop.w}" data-h="${pop.h}" data-frame="none"></div></div>` : "";
      const popArg = pop ? `,pop:"#p${n}"` : "";
      if (layout === "split") { // portrait: device on top, text under it · landscape: device left, text right
        if (portrait) { const top = recipe === "phone" ? 110 : 200, hgt = recipe === "phone" ? phH : recipe === "hero" ? 700 : lapH + 40; devStyle = `top:${top}px;`; headStyle = `top:${top + hgt + 90}px;`; }
        else { devStyle = `left:${m}px;top:${Math.round((H - (recipe === "phone" ? phH : lapH)) / 2)}px;`; headStyle = `left:${Math.round(W / 2 + m / 2)}px;top:${Math.round(H * 0.32)}px;`; }
      }
      if (recipe === "tour") { devHtml = `<div class="dev laptop" style="${devStyle}"><div id="u${n}" class="ui" data-clone="${r.ui}"></div></div>`; call = `K.R.tour(tl,{sc:"#${id}",ui:"#u${n}",s:${s},d:${d},focus:${JSON.stringify(p.focus || [])}${popArg}});`; }
      else if (recipe === "replay") { devHtml = `<div class="dev laptop" style="${devStyle}"><div id="u${n}a" class="ui" data-clone="${r.a}"></div><div id="u${n}b" class="ui ui-after" data-clone="${r.b}"></div><div class="ok">✓</div></div>`; call = `K.R.replay(tl,{sc:"#${id}",a:"#u${n}a",b:"#u${n}b",s:${s},d:${d}${p.typeKey ? `,typeKey:"${p.typeKey}"` : ""}${p.tapKey ? `,tapKey:"${p.tapKey}"` : ""}${p.result ? `,result:${JSON.stringify(p.result)}` : ""}${popArg}});`; }
      else if (recipe === "phone") { devHtml = `<div class="dev phone" style="${devStyle}"><div class="notch"></div><div id="u${n}" class="ui" data-clone="${r.ui}" data-w="${phW - 40}" data-h="${phH - 60}" data-frame="none"></div></div>`; call = `K.R.phone(tl,{sc:"#${id}",ui:"#u${n}",s:${s},d:${d}${p.tapKey ? `,tapKey:"${p.tapKey}"` : ""}});`; }
      else { const c = JSON.parse(fs.readFileSync(path.join(brandDir, "clones", `${r.ui}.json`), "utf8")); const bh = Math.round(Math.min(c.h * (lapW / c.w), portrait ? 700 : H * 0.6)); devHtml = `<div class="glow"></div><div class="dev block" style="${devStyle}"><div id="u${n}" class="ui" data-clone="${r.ui}" data-w="${lapW}" data-h="${bh}" data-frame="none"></div></div>`; call = `K.R.hero(tl,{sc:"#${id}",ui:"#u${n}",s:${s},d:${d}});`; }
      if (layout === "stack") { devHtml = `<div class="tilt">${devHtml}</div>`; extra = chips.map((c, k) => `<div class="stackcard surface" style="top:${devTop + (recipe === "phone" ? phH - 220 : lapH - 60) + k * 150}px;inset-inline-${k % 2 ? "end" : "start"}:${m}px"><b>✓</b>${esc(c)}</div>`).join(""); co = ""; }
      if (layout === "device") { co = chips.map((c, k) => chip(c, `position:absolute;z-index:8;top:${devTop + (portrait ? 70 + k * 330 : 40 + k * 200)}px;inset-inline-${k % 2 ? "end" : "start"}:${Math.round(m * 0.5)}px`)).join(""); } // floating callouts around the device
      if (layout === "card") headWrap = "card";
      vis = `<div class="vis">${devHtml}${popHtml}</div>`;
    } else if (recipe === "logo") {
      // ── the CTA style ──
      const lg = logo ? `<img class="biglogo" src="${logo}">` : `<div class="biglogo txt">${esc(brand.name_ar || brand.name)}</div>`;
      const btn = `<div class="cta-btn">${esc(p.button || (rtl ? "ابدأ مجاناً" : "Start free"))}</div>`, u = `<div class="url" data-text="${esc(url)}"></div>`;
      if (cta === "card") { headWrap = "card-cta"; vis = ""; extra = ""; }
      else if (cta === "big-url") vis = `<div class="vis">${lg}<div class="url big" data-text="${esc(url)}"></div></div>`;
      else if (cta === "split-photo") vis = `<div class="ph half"><img src="${img}"></div><div class="vis">${lg}${btn}${u}</div>`;
      else if (cta === "type-only") vis = `<div class="vis">${u}</div>`;
      else vis = `<div class="vis"><div class="halo"></div>${lg}${btn}${u}</div>`;
      if (cta === "card") headWrap = { pre: lg, post: btn + u };
      call = `K.R.logo(tl,{sc:"#${id}",s:${s},d:${d}});`;
    } else {
      // ── scenes without a live screen ──
      if (recipe === "pains") { const pains = (p.pains && p.pains.length ? p.pains : (/[+،,]/.test(sc.headline) ? sc.headline : String(sc.sub || sc.headline)).split(/[+،,]| و /).map((x) => x.trim()).filter(Boolean)).slice(0, 4); vis = `<div class="vis"><div class="pains">${pains.map((x) => `<div class="pain surface">${esc(x)}</div>`).join("")}</div><div class="xmark">✕</div></div>`; call = `K.R.pains(tl,{sc:"#${id}",s:${s},d:${d}});`; }
      else if (recipe === "count") { const num = p.number || (String(sc.headline + " " + (sc.sub || "")).match(/[0-9٠-٩][0-9٠-٩٬,.]*/) || [""])[0]; vis = `<div class="vis"><div class="ring"></div><div class="ring"></div>${num ? `<div class="bignum">${esc(num)}</div>` : ""}</div>`; call = `K.R.count(tl,{sc:"#${id}",s:${s},d:${d}});`; }
      else { vis = i === 0 && logo && layout === "bigtype" ? `<div class="vis"><img class="biglogo" src="${logo}"></div>` : ""; call = `K.R.type(tl,{sc:"#${id}",s:${s},d:${d}});`; }
      if (layout === "card") headWrap = "card";
      if (layout === "photo") vis = `<div class="ph"><img src="${img}"></div><div class="scrim"></div>` + vis;
      if (layout === "split") vis = `<div class="ph half"><img src="${img}"></div>` + vis;
      if (layout === "tiles") {
        // tiles: the brand's real UI blocks (previews), else the chips / features as text tiles
        const blocks = (brand.parts || []).filter((x) => x.file && /\.(jpe?g|png|webp)$/i.test(x.file)).slice(i % 3, (i % 3) + 4);
        const words = [...chips, ...(brand.features || []).map((f) => f.name)].slice(0, 4);
        extra = `<div class="tiles">${(blocks.length >= 4 ? blocks.map((b) => `<div class="tile surface"><img src="${rel(b.file)}"></div>`) : words.map((w) => `<div class="tile surface txt">${esc(w)}</div>`)).join("")}</div>`;
        co = "";
      }
      if (layout === "ticker") {
        const items = [...chips, ...(brand.features || []).map((f) => f.name), ...(brand.selling_points || [])].filter((x) => !rtl || /[؀-ۿ]/.test(x)).slice(0, 8);
        const row = (k) => `<div class="tick" style="top:${(portrait ? 1180 : H * 0.62) + k * (portrait ? 190 : 120)}px"><div class="track">${[...items, ...items].map((x) => `<span class="ti surface">${esc(x)}</span>`).join("")}</div></div>`;
        extra = items.length ? row(0) + row(1) : ""; co = "";
      }
    }
    const headHtml = headWrap === "card" ? `<div class="card surface"><div class="head inner">${headInner}</div></div>`
      : headWrap && headWrap.pre ? `<div class="card surface cta-card">${headWrap.pre}<div class="head inner">${headInner}</div>${headWrap.post}</div>`
      : `<div class="head"${headStyle ? ` style="${headStyle}"` : ""}>${headInner}</div>`;
    scenes.push(`<div class="scene l-${layout} r-${recipe}${cta ? ` cta-${cta}` : ""}" data-scene="${n}" id="${id}">${headHtml}${vis}${extra}${co}</div>`);
    calls.push(`K.R.layout(tl,"#${id}",${s},${s + d});\n${call}`);
  });

  const drops = [...new Set([...(script.music?.drops || []), ...script.scenes.filter((s) => ["reveal", "cta", "offer"].includes(s.purpose)).map((s) => s.start)])].filter((t) => t > 0 && t < script.length);
  const hard = `${Math.round(W * 0.008)}px ${Math.round(W * 0.008)}px 0 ${accent}`;
  const shadow = { none: "none", soft: "0 30px 90px rgba(0,0,0,.38)", hard }[S.shadow];
  const hiCss = {
    gradient: `.hl .hi{background:${grad};-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;position:relative}.hl .hi-line{background:${grad}}`,
    underline: `.hl .hi{position:relative}.hl .hi-line{background:${accent};height:.12em!important}`,
    marker: `.hl .hi{background:linear-gradient(transparent 58%, ${accent}88 58%);padding:0 .12em;border-radius:.08em}.hl .hi-line{display:none}`,
    box: `.hl .hi{box-shadow:inset 0 0 0 .06em ${accent};border-radius:.14em;padding:0 .14em}.hl .hi-line{display:none}`,
    color: `.hl .hi{color:${primary}}.hl .hi-line{display:none}`,
  }[T.highlight];
  const bgPhoto = Object.values(photos)[0];
  const bgHtml = {
    glow: `<div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div>`,
    grid: `<div class="blob b1 faint"></div><div class="grid"></div>`,
    flat: `<div class="vign"></div>`,
    mesh: `<div class="mesh"></div>`,
    texture: `<div class="tex"></div><div class="vign"></div>`,
    "photo-led": bgPhoto ? `<div class="bgph"><img src="${bgPhoto}"></div><div class="bgscrim"></div>` : `<div class="blob b1"></div><div class="blob b2"></div>`,
  }[art.background];
  const noise = `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/></filter><rect width='100%' height='100%' filter='url(#n)' opacity='.55'/></svg>`)}")`;
  const css = `
html,body{margin:0;background:${bg}}
#stage{width:${W}px;height:${H}px;position:relative;overflow:hidden;background:${bg};color:${ink};font-family:${body};--r:${S.radius}px}
#bg{position:absolute;inset:0;overflow:hidden}
#bg .blob{position:absolute;width:1300px;height:1300px;border-radius:50%;opacity:${dark ? 0.55 : 0.35};will-change:transform}
#bg .blob.faint{opacity:${dark ? 0.25 : 0.15}}
#bg .b1{left:-460px;top:-400px;background:radial-gradient(closest-side,${primary},transparent)}
#bg .b2{right:-500px;top:${Math.round(H * 0.3)}px;background:radial-gradient(closest-side,${accent},transparent)}
#bg .b3{left:${Math.round(W * 0.1)}px;bottom:-620px;background:radial-gradient(closest-side,${primary},transparent);opacity:${dark ? 0.3 : 0.2}}
#bg .grid{position:absolute;inset:-50%;background-image:linear-gradient(${dark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.06)"} 1px,transparent 1px),linear-gradient(90deg,${dark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.06)"} 1px,transparent 1px);background-size:72px 72px;transform:perspective(900px) rotateX(58deg);transform-origin:50% 0;top:45%}
#bg .mesh{position:absolute;inset:-25%;background:radial-gradient(at 20% 20%,${primary}88,transparent 45%),radial-gradient(at 80% 15%,${accent}77,transparent 45%),radial-gradient(at 50% 90%,${surface},transparent 60%);background-size:160% 160%}
#bg .tex{position:absolute;inset:-10%;background-image:${noise};opacity:${dark ? 0.12 : 0.08}}
#bg .vign{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 40%,transparent 40%,${dark ? "rgba(0,0,0,.45)" : "rgba(0,0,0,.08)"})}
#bg .bgph{position:absolute;inset:0;overflow:hidden}#bg .bgph img{width:100%;height:100%;object-fit:cover}
#bg .bgscrim{position:absolute;inset:0;background:${bg}d9}
#bar{position:absolute;left:0;top:0;height:8px;width:100%;background:${grad};transform-origin:${rtl ? "right" : "left"};z-index:50}
#mark{position:absolute;top:56px;${rtl ? "right" : "left"}:64px;height:64px;z-index:40;visibility:hidden}
.scene{position:absolute;inset:0;visibility:hidden;opacity:0}
.surface{background:${S.glass ? `${surface}8c` : surface};border:${S.border ? `2px solid ${ink}26` : "0"};box-shadow:${shadow};border-radius:var(--r);${S.glass ? "backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);" : ""}}
.head{position:absolute;left:${m}px;right:${m}px;top:${portrait ? 300 : 80}px;text-align:${T.align}}
.head.inner{position:static}
.hl{font-family:${disp};font-weight:${T.weight};font-size:${hlPx}px;line-height:1.3;color:${ink};text-wrap:balance}
.hl .nb{white-space:nowrap}
.hl .w{display:inline-block;margin:0 .1em}
.hl .hi-line{position:absolute;left:0;right:0;bottom:.02em;height:.09em;border-radius:9px;transform-origin:${rtl ? "right" : "left"}}
${hiCss}
.sub{margin-top:22px;font-size:${Math.round(W / 26)}px;line-height:1.45;color:${muted}}
.vis{position:absolute;inset:0;transform-origin:50% 55%}
.dev{position:absolute}
.laptop{left:${lapLeft}px;top:${devTop}px;width:${lapW}px;height:${lapH}px}
.laptop .ui{position:absolute;left:0;top:0}
.ui-after{visibility:hidden}
.tilt{position:absolute;inset:0;transform-origin:50% 60%}
.pop{position:absolute;left:${Math.round((W - 940) / 2)}px;opacity:0;z-index:6}
.pop .ui{border-radius:var(--r);background:${surface};box-shadow:0 50px 140px rgba(0,0,0,.65),0 0 0 3px ${primary}88}
.ok{position:absolute;${rtl ? "left" : "right"}:-30px;top:-40px;width:110px;height:110px;border-radius:50%;background:${grad};color:#fff;font:800 64px/110px sans-serif;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.45);opacity:0;z-index:5}
.phone{left:${Math.round((W - phW) / 2)}px;top:${phTop}px;width:${phW}px;height:${phH}px;border-radius:64px;background:#0a0a0c;box-shadow:0 0 0 3px #3a3d45,0 0 0 9px #16171b,0 60px 140px rgba(0,0,0,.6)}
.phone .ui{position:absolute;left:20px;top:30px;border-radius:40px;overflow:hidden;background:#fff}
.phone .notch{position:absolute;left:50%;top:14px;width:130px;height:30px;margin-left:-65px;border-radius:20px;background:#000;z-index:3}
.block{left:${lapLeft}px;top:${portrait ? 760 : 220}px}
.block .ui{position:relative;border-radius:var(--r);background:${surface};box-shadow:0 40px 120px rgba(0,0,0,.5),0 0 0 2px ${primary}33}
.glow{position:absolute;left:50%;top:${portrait ? 1050 : 520}px;width:800px;height:800px;margin:-400px 0 0 -400px;border-radius:50%;background:radial-gradient(${primary}55,transparent 65%);opacity:.6}
.cos{position:absolute;left:60px;right:60px;top:${coTop}px;display:flex;flex-wrap:wrap;gap:22px;justify-content:center}
.co{padding:20px 34px;font-size:38px;font-weight:700;white-space:nowrap}
.r-phone .cos{top:${portrait ? phTop + phH + 30 : H - 150}px}
.co b,.stackcard b{color:${primary};margin-inline-end:12px}
.stackcard{position:absolute;z-index:7;padding:26px 38px;font-size:40px;font-weight:800;opacity:0}
.card{position:absolute;left:${m}px;right:${m}px;top:${portrait ? 230 : 70}px;padding:${Math.round(W * 0.045)}px;text-align:${T.align}}
.l-card .laptop,.l-card .block{top:${portrait ? 880 : 300}px}.l-card .phone{top:${portrait ? 760 : 160}px}
.cta-card{top:${portrait ? 420 : 120}px;text-align:center}.cta-card .biglogo{position:static!important;transform:none!important;height:150px;margin:0 auto 28px;display:block}
.cta-card .cta-btn{position:static!important;transform:none!important;display:inline-block;margin-top:44px}.cta-card .url{position:static!important;margin-top:28px}
.ph{position:absolute;inset:0;overflow:hidden;z-index:0}.ph img{width:100%;height:100%;object-fit:cover}
.head,.card{z-index:4}.cos,.co{z-index:5}.scrim{z-index:1}.vis{z-index:2}
.ph.half{bottom:auto;height:${portrait ? Math.round(H * 0.5) : H}px;${portrait ? "" : `width:${Math.round(W / 2)}px;`}border-radius:0 0 var(--r) var(--r)}
.scrim{position:absolute;inset:0;background:linear-gradient(to top,${bg} 0%,${bg}ee 30%,${bg}99 46%,${bg}00 70%)}
.l-photo .head{top:${portrait ? Math.round(H * 0.67) : Math.round(H * 0.55)}px}.l-photo .cos{top:${portrait ? 1680 : H - 140}px}
.l-split:not(.r-tour):not(.r-replay):not(.r-phone):not(.r-hero) .head{top:${portrait ? Math.round(H * 0.56) : Math.round(H * 0.3)}px${portrait ? "" : `;left:${Math.round(W / 2 + m / 2)}px`}}
.l-bigtype .head{top:${portrait ? Math.round(H * 0.36) : Math.round(H * 0.3)}px}.l-bigtype .hl{font-size:${Math.round(hlPx * 1.3)}px}
.l-bigtype.r-count .head,.l-bigtype.r-pains .head{top:${portrait ? 360 : 90}px}.l-bigtype.r-count .hl,.l-bigtype.r-pains .hl{font-size:${hlPx}px}
.tiles{position:absolute;left:${m}px;right:${m}px;top:${portrait ? 760 : Math.round(H * 0.42)}px;display:grid;grid-template-columns:1fr 1fr;gap:26px}
.tile{height:${portrait ? 400 : 240}px;overflow:hidden;opacity:0}.tile img{width:100%;height:100%;object-fit:cover;object-position:top}
.tile.txt{display:flex;align-items:center;justify-content:center;padding:30px;font-size:44px;font-weight:800;text-align:center;line-height:1.3}
.tick{position:absolute;left:0;right:0;overflow:hidden;direction:ltr}.track{display:flex;gap:26px;width:max-content}
.ti{padding:26px 44px;font-size:46px;font-weight:800;white-space:nowrap;direction:${rtl ? "rtl" : "ltr"}}
.l-ticker .head{top:${portrait ? 520 : 120}px}
.r-type.l-bigtype .biglogo{position:absolute;left:50%;top:${portrait ? 330 : 60}px;height:150px;transform:translateX(-50%)}
.pains{position:absolute;left:120px;right:120px;top:${portrait ? 1000 : 520}px;display:flex;flex-direction:column;gap:26px;align-items:center}
.pain{padding:28px 44px;border-color:#ef444466;font-size:46px;font-weight:700;color:${ink}}
.xmark{position:absolute;left:50%;top:${portrait ? 1180 : 600}px;margin-left:-110px;width:220px;height:220px;border-radius:50%;background:#ef4444;color:#fff;font:900 150px/220px sans-serif;text-align:center;opacity:0}
.bignum{position:absolute;left:0;right:0;top:${portrait ? 820 : 360}px;text-align:center;font-family:${disp};font-weight:900;font-size:${Math.round(W / 3.2)}px;line-height:1;background:${grad};-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent}
.ring{position:absolute;left:50%;top:${portrait ? 990 : 470}px;width:520px;height:520px;margin:-260px 0 0 -260px;border-radius:50%;border:6px solid ${primary}}
.r-logo .head{top:${portrait ? 820 : 260}px}
.r-logo .biglogo{position:absolute;left:50%;top:${portrait ? 430 : 60}px;height:230px;transform:translateX(-50%)}
.r-logo .biglogo.txt{height:auto;font-family:${disp};font-weight:900;font-size:150px;background:${grad};-webkit-background-clip:text;color:transparent}
.halo{position:absolute;left:50%;top:${portrait ? 545 : 175}px;width:520px;height:520px;margin:-260px 0 0 -260px;border-radius:50%;background:conic-gradient(from 0deg,transparent,${primary}aa,transparent 40%,${accent}aa,transparent 75%);-webkit-mask:radial-gradient(closest-side,#000 55%,transparent);mask:radial-gradient(closest-side,#000 55%,transparent)}
.cta-btn{position:absolute;left:50%;top:${portrait ? 1250 : 560}px;transform:translateX(-50%);padding:36px 90px;border-radius:${Math.max(12, Math.min(999, S.radius * 3))}px;background:${grad};color:#fff;font-family:${disp};font-weight:800;font-size:60px;white-space:nowrap;box-shadow:0 24px 70px ${primary}66}
.url{position:absolute;left:0;right:0;top:${portrait ? 1450 : 700}px;text-align:center;font-size:44px;color:${muted};direction:ltr}
.url.big{top:${portrait ? 1100 : 520}px;font-family:${disp};font-weight:900;font-size:${Math.round(W / 9)}px;color:${ink}}
.cta-big-url .biglogo{top:${portrait ? 300 : 40}px!important;height:130px!important}.cta-big-url .head{top:${portrait ? 560 : 220}px}
.cta-split-photo .biglogo{top:${portrait ? Math.round(H * 0.52) : 80}px!important;height:140px!important}.cta-split-photo .head{top:${portrait ? Math.round(H * 0.61) : 300}px}
.cta-split-photo .cta-btn{top:${portrait ? Math.round(H * 0.78) : 620}px}.cta-split-photo .url{top:${portrait ? Math.round(H * 0.88) : 780}px}
.cta-type-only .head{top:${portrait ? Math.round(H * 0.34) : 200}px}.cta-type-only .hl{font-size:${Math.round(hlPx * 1.35)}px}.cta-type-only .url{top:${portrait ? Math.round(H * 0.62) : 700}px;font-size:56px;color:${ink}}`;

  const html = `<!doctype html><html><head><meta charset="utf-8">
<script src="../../vendor/gsap.min.js"></script><script src="../../vendor/kit.js"></script><script src="../../vendor/recipes.js"></script>
${gfonts ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${gfonts}&display=swap">` : ""}
<style>${css}</style></head><body>
<div id="stage"${rtl ? ' dir="rtl"' : ""}>
<div id="bg">${bgHtml}</div>
<div id="bar"></div>${logo ? `<img id="mark" src="${logo}">` : ""}
${scenes.join("\n")}
</div>
<script>
const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
K.R.len = ${script.length}; K.R.tx = ${JSON.stringify(art.transition)}; K.R.tempo = ${TEMPOS[art.tempo]}; K.R.W = ${W}; K.R.H = ${H};
K.R.bg(tl, ${script.length}, ${JSON.stringify(drops)});
${logo ? `K.R.mark(tl, ${script.scenes[0].bars * 2}, ${script.scenes.at(-1).start});` : ""}
${calls.join("\n")}
K.done(tl, ${script.length});
// once the fonts are in: shrink any text that would run off the frame, move badges off the headline
window.__ready = Promise.resolve(window.__ready).then(() => K.R.fit()).then(() => true);
</script></body></html>`;
  const final = { ...art, scenes: art.scenes.map((x, i) => ({ ...x, layout: used[i] ?? x.layout })) };
  return { html, recipes: script.scenes.map((sc, i) => (art.scenes[i] || {}).recipe || "type"), layouts: used, fingerprint: fingerprintOf(final) };
}
