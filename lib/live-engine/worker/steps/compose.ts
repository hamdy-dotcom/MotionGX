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
import { clipFrames } from "./clips";

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
function popPart(brandDir, screenId, focus, maxW = 940) {
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
    const pc = JSON.parse(fs.readFileSync(f, "utf8")); const w = maxW, h = Math.round(pc.h * (w / pc.w));
    if (h < 300 || h > 820) continue; // a real block, never a thin strip
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
const loadClone = (brandDir, id) => { const f = path.join(brandDir, "clones", `${id}.json`); return id && fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null; };

/** the scene's words promise an input (type / paste / enter / search a link, URL, code…): which kind, or null */
export function promised(sc) {
  const t = `${sc.headline || ""} ${sc.sub || ""}`.replace(/بدون كود|من غير كود|no[- ]code|without code/gi, "");
  const verb = /\b(type|types|typing|paste|pastes|enter|enters|search|searches|code)\b|اكتب|يكتب|تكتب|الصق|ألصق|لصق|حط اللينك|حط الرابط|أدخل|ادخل|دخّل|ابحث|بحث|كود|رمز/i.test(t);
  // a link / URL alone is not an input ("a public store link"): only with something done from it (generate, analyze, search…)
  const fromLink = /\b(link|url)\b|رابط|لينك/i.test(t) && ["generate", "analyze", "search"].some((k) => INTENTS[k].test(t));
  if (!verb && !fromLink) return null;
  if (/link|url|رابط|لينك/i.test(t)) return "link";
  if (/\bcode\b|كود|رمز/i.test(t)) return "code";
  if (/search|ابحث|بحث/i.test(t)) return "search";
  return "text";
}
/** what to type for a promised input: a value the capture agent really typed when there is one, else a neutral sample */
function sampleFor(intent, sc, brandDir) {
  let typed = [];
  try { for (const f of fs.readdirSync(path.join(brandDir, "clones"))) if (/-before\.json$/.test(f)) for (const m of fs.readFileSync(path.join(brandDir, "clones", f), "utf8").matchAll(/data-val=\\?"([^"\\]{2,80})\\?"/g)) typed.push(m[1]); } catch {}
  typed = typed.filter((v) => !/^•+$/.test(v) && !/@/.test(v));
  const url = (v) => /^(https?:\/\/|www\.)|\.[a-z]{2,}\//i.test(v);
  if (intent === "link") return typed.find(url) || "https://shop.example.com/product/24816";
  if (intent === "code") return typed.find((v) => /^\d{4,8}$/.test(v)) || "4829";
  const quoted = String(sc.visual?.detail || "").match(/["“«']([^"”»']{2,40})["”»']/)?.[1];
  return typed.find((v) => !url(v) && v.length <= 40) || quoted || String(sc.headline || "").split(/\s+/).slice(0, 2).join(" ");
}

/**
 * Dead content, before anything is composed: images inside the live UI clones that are missing, empty or a tiny
 * placeholder shown big are swapped for another captured brand image of the closest shape; a block too thin to fill a
 * frame becomes its parent screen, zoomed to that block; a clone that still has dead images makes its scene use another
 * live asset of the same kind. Patches the clones in place, changes scene assets in the script. Returns what changed.
 */
export function repairAssets({ script, assets, brandDir, brand, log = () => {} }) {
  const byId = Object.fromEntries(assets.map((a) => [a.id, a])), changes = [];
  const ok = (rel) => { const f = path.join(brandDir, rel); if (!fs.existsSync(f)) return false; const n = fs.statSync(f).size; return n >= 400 && (!/\.svg$/i.test(f) || /<svg/i.test(fs.readFileSync(f, "utf8").slice(0, 3000))); };
  const pool = (brand.images || []).filter((im) => im.file && ok(im.file) && fs.statSync(path.join(brandDir, im.file)).size >= 4000 && im.w && im.h);
  const dims = (attrs) => [+(/width:([\d.]+)px/.exec(attrs) || [])[1] || 0, +(/height:([\d.]+)px/.exec(attrs) || [])[1] || 0];
  const fixClone = (id) => {
    const f = path.join(brandDir, "clones", `${id}.json`); if (!fs.existsSync(f)) return { dead: 0 };
    const c = JSON.parse(fs.readFileSync(f, "utf8")); let dead = 0, fixed = 0;
    c.html = c.html.replace(/<img([^>]*?)src="\{\{B\}\}\/([^"]+)"([^>]*?)>/g, (whole, a1, rel, a2) => {
      const [w, h] = dims(a1 + a2), big = w * h > 60000;
      const placeholder = big && fs.existsSync(path.join(brandDir, rel)) && fs.statSync(path.join(brandDir, rel)).size < 2000; // an icon blown up on an empty block
      if (ok(rel) && !placeholder) return whole;
      const ar = w && h ? w / h : 1, alt = pool.sort((x, y) => Math.abs(x.w / x.h - ar) - Math.abs(y.w / y.h - ar))[0];
      if (!alt) { if (big) dead++; return whole; }
      fixed++; return `<img${a1}src="{{B}}/${alt.file}"${a2}>`;
    });
    if (fixed) { fs.writeFileSync(f, JSON.stringify(c)); changes.push(`${id}: ${fixed} dead image(s) replaced`); }
    return { dead, c };
  };
  const used = new Set(script.scenes.flatMap((s) => s.visual?.assets || []));
  script.scenes.forEach((sc, i) => {
    const live = (sc.visual?.assets || []).filter((id) => byId[id] && LIVE.test(byId[id].kind)); if (!live.length) return;
    const r = recipeFor(sc, byId, brandDir, brand), ids = [r.ui, r.a, r.b].filter(Boolean);
    let dead = 0; for (const id of ids) dead += fixClone(id).dead;
    // a UI block too thin to fill a frame: show its screen instead, zoomed to the block
    if (r.recipe === "hero") { const c = loadClone(brandDir, r.ui), parent = String(r.ui).replace(/-p\d+$/, ""), part = String(r.ui).match(/-p(\d+)$/)?.[1];
      if (c && c.w / Math.max(1, c.h) > 3.2 && parent !== r.ui && byId[parent] && loadClone(brandDir, parent)) { sc.visual = { ...sc.visual, assets: [parent] }; if (part != null) sc._focus = [`part:${+part}`]; changes.push(`scene ${i + 1}: thin block ${r.ui} → its screen ${parent}, zoomed to part ${+part}`); return; } }
    if (dead) { // still dead images: another live asset of the same kind, unused in the video
      const kind = byId[live[0]].kind, alt = assets.find((a) => a.kind === kind && !used.has(a.id) && recipeFor({ ...sc, visual: { ...sc.visual, assets: [a.id] } }, byId, brandDir, brand).recipe === r.recipe);
      if (alt) { sc.visual = { ...sc.visual, assets: [alt.id] }; used.add(alt.id); changes.push(`scene ${i + 1}: ${live[0]} has ${dead} dead image(s) → ${alt.id}`); }
      else changes.push(`scene ${i + 1}: ${live[0]} has ${dead} dead image(s), no other asset of its kind`);
    }
  });
  // an empty screen (no data) is never proof: a version of it with data, else a flow that creates data, else another screen of its kind
  script.scenes.forEach((sc, i) => {
    const id = (sc.visual?.assets || []).find((x) => byId[x] && LIVE.test(byId[x].kind)); if (!id || !byId[id].empty) return;
    const alt = assets.find((a) => a.kind === byId[id].kind && !a.empty && !used.has(a.id) && String(a.shows || "").split(" — ")[0] === String(byId[id].shows || "").split(" — ")[0])
      || assets.find((a) => { const f = flowInfo(a, brandDir); return f.input && !f.nav && !a.empty && !used.has(a.id) && sameScreen(f.result, byId[id].shows); })
      || assets.find((a) => a.kind === byId[id].kind && !a.empty && !used.has(a.id));
    if (alt) { sc.visual = { ...sc.visual, assets: [alt.id] }; used.add(alt.id); changes.push(`scene ${i + 1}: ${id} is empty → ${alt.id}`); }
  });
  if (changes.length) log(`  🩹 assets: ${changes.join(" · ")}`);
  return changes;
}

/**
 * A scene that promises an input (type / paste / search …) must play a real input → result flow. Its own asset if it is one,
 * else the unused flow that best matches its words; with no flow at all the scene is marked for a rewrite (sc._rewrite: the
 * director restates it as what the screen shows). Returns what changed.
 */
export function matchPromises({ script, assets, brandDir, log = () => {} }) {
  const byId = Object.fromEntries(assets.map((a) => [a.id, a])), changes = [];
  const flows = assets.filter((a) => a.kind === "live-flow").map((a) => ({ a, ...flowInfo(a, brandDir) })).filter((f) => f.input && !f.nav);
  const holds = (sc) => (sc.visual?.assets || []).find((id) => byId[id]?.kind === "live-flow" && byId[id].input_result);
  // every (promising scene, real input flow) pair, scored on intent; the best pairs are assigned first, one flow per scene
  const pairs = [];
  // a scene already playing a real input flow keeps it unless a scene that promises it scores clearly higher
  script.scenes.forEach((sc, i) => { const p = promised(sc); for (const f of flows) { const own = holds(sc) === f.a.id; if (!p && !own) continue; const v = (own ? Math.max(2, matchScore(sc, f) + 1) : matchScore(sc, f)) - (i === 0 ? 2 : 0); if (v > 0) pairs.push({ i, f, v }); } });
  pairs.sort((x, y) => y.v - x.v || x.i - y.i);
  const got = new Map(), taken = new Set();
  for (const p of pairs) if (!got.has(p.i) && !taken.has(p.f.a.id)) { got.set(p.i, p.f); taken.add(p.f.a.id); }
  script.scenes.forEach((sc, i) => {
    const had = holds(sc), f = got.get(i);
    if (f) { if (had !== f.a.id) { sc.visual = { ...sc.visual, assets: [f.a.id, ...(had ? (sc.visual.assets || []).filter((x) => x !== had && byId[x]?.kind === "live-screen") : [])] }; changes.push(`scene ${i + 1}: plays the input → result flow ${f.a.id} (typed ${JSON.stringify(f.typed.slice(0, 40))} → «${f.button}»)`); } return; }
    if (had) { // a flow it shouldn't play (navigation, or a better scene took it): its result screen instead
      const sid = had.replace(/-flow$/, ""), screen = byId[sid] && LIVE.test(byId[sid].kind) ? sid : null;
      const info = flowInfo(byId[had], brandDir), wrong = info.nav || !info.input || taken.has(had);
      if (wrong) { sc.visual = { ...sc.visual, assets: screen ? [screen] : (sc.visual.assets || []).filter((x) => x !== had) }; changes.push(`scene ${i + 1}: ${had} ${info.nav ? "is a menu click, not an input" : info.input ? "plays in a scene that promises it better" : "has no typed value"} → ${screen || "dropped"}`); }
    }
    if (promised(sc) && !got.has(i)) {
      // its flow plays in a scene that promises it better: this one shows that flow's result; with no matching flow at all, a rewrite
      const best = flows.map((f) => ({ f, v: matchScore(sc, f) })).filter((x) => x.v > 0).sort((x, y) => y.v - x.v)[0], sid = best && best.f.a.id.replace(/-flow$/, "");
      if (sid && byId[sid] && LIVE.test(byId[sid].kind)) { sc.visual = { ...sc.visual, assets: [sid] }; changes.push(`scene ${i + 1}: ${best.f.a.id} plays in another scene → its result ${sid}`); }
      else { sc._rewrite = true; changes.push(`scene ${i + 1}: promises an input no captured flow matches — the director rewrites it`); }
    }
  });
  if (changes.length) log(`  ⌨ inputs: ${changes.join(" · ")}`);
  return changes;
}

/** what a captured flow really did, from its "before" clone: the typed values, the button pressed, whether that was a menu click */
export function flowInfo(a, brandDir) {
  const sid = String(a.id).replace(/-flow$/, ""), c = brandDir ? loadClone(brandDir, `${sid}-before`) : null, keys = c?.keys || [];
  const click = keys.find((k) => k.acted === "click"), fields = keys.filter((k) => k.acted === "type" && k.text && !/^•+$/.test(k.text));
  const button = click?.text || (String(a.shows || "").match(/click "(?:<[^>]+>\s*)?([^"]+)"/) || [])[1] || "";
  const navs = new Set(keys.filter((k) => k.role === "nav").map((k) => String(k.text || "").trim()));
  const nav = click ? click.role === "nav" || (navs.has(String(click.text || "").trim()) && !fields.length) : !a.input_result;
  // the typed value only counts when it was typed on this screen (a stale value from an earlier step is not this flow's input)
  const typedAll = c ? fields.map((k) => k.text) : a.typed ? [a.typed] : [];
  const typed = typedAll.find(isUrl) || [...typedAll].sort((x, y) => y.length - x.length)[0] || "";
  const result = String(a.shows || "").split("→").slice(1).join("→").trim();
  return { input: Boolean(typed), nav, typed, typedAll, button: String(button).trim(), result, typeKey: (fields.find((k) => isUrl(k.text)) || fields.sort((x, y) => y.text.length - x.text.length)[0])?.k || null };
}
const isUrl = (v) => /^(https?:\/\/|www\.)|\.[a-z]{2,}\//i.test(String(v || ""));
const sceneText = (sc) => `${sc.headline || ""} ${sc.sub || ""}`;
// what an input → result flow can promise; each scene and flow is read for these intents (Arabic + English, any dialect)
const INTENTS = {
  link: /\b(link|url|paste)\b|لينك|رابط|الصق|ألصق|لصق/i,
  generate: /\b(generat\w*|creat\w*|build\w*|make|ready)\b|توليد|ولّ?د|يولد|إنشاء|انشاء|أنشئ|انشئ|اعمل|بيعمل|جاهز|ذكاء|\bAI\b/i,
  analyze: /\b(analy\w*|score\w*|check)\b|حلل|تحليل|محلل|يحلل/i,
  search: /\b(search\w*|find|research|discover)\b|بحث|ابحث|دوّ?ر|اكتشف/i,
  order: /\b(order\w*|checkout|buy|cart)\b|اطلب|يطلب|طلب|الدفع|السلة|شراء/i,
  write: /\b(type|write|enter)\b|اكتب|يكتب|أدخل|ادخل/i,
};
export const intentsOf = (t) => new Set(Object.entries(INTENTS).filter(([, re]) => re.test(t)).map(([k]) => k));
/** how well a scene promises a flow: shared intents (a typed URL is the link intent), plus shared words with its button and result */
function matchScore(sc, f) {
  const mine = intentsOf(sceneText(sc)), theirs = intentsOf(`${f.button} ${f.result}`);
  if (isUrl(f.typed)) theirs.add("link"); else if (f.typed) theirs.add("write");
  // a scene that promises an action (generate / analyze / search / order) only matches a flow doing that action — a shared link is not enough
  const acts = ["generate", "analyze", "search", "order"].filter((k) => mine.has(k));
  if (acts.length && !acts.some((k) => theirs.has(k))) return 0;
  let v = 0; for (const k of mine) if (theirs.has(k)) v += k === "link" ? 4 : 3;
  if (!v) return 0;
  const words = (t) => new Set(String(t).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).map((w) => w.replace(/^(وال|بال|لل|ال|و|ب)(?=\p{L}{3})/u, "")).filter((w) => w.length > 2));
  const a = words(sceneText(sc)), b = words(`${f.button} ${f.result} ${(f.a.features || []).join(" ")}`);
  return v + Math.min(3, [...a].filter((w) => b.has(w)).length);
}
const sameScreen = (result, shows) => { const w = (t) => new Set(String(t || "").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((x) => x.length > 3)); const a = w(result), b = w(String(shows || "").split(" — ")[0]); return [...a].some((x) => b.has(x)); };

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
/**
 * Images the capture agent's own test actions brought in (a sample marketplace product, a generated page, test orders,
 * seed data) are product-demo content, never brand photos. Tagged at capture (capture.json demoAssets → brand.images[].demo);
 * for brands profiled before that, an image used only on the app's screens and never on a public page counts as test data.
 */
const demoCache = new Map();
export function demoImages(brandDir) {
  if (!brandDir) return new Set(); if (demoCache.has(brandDir)) return demoCache.get(brandDir);
  const out = new Set(), base = (f) => path.basename(String(f));
  try {
    const cap = JSON.parse(fs.readFileSync(path.join(brandDir, "capture.json"), "utf8"));
    if (Array.isArray(cap.demoAssets)) cap.demoAssets.forEach((f) => out.add(base(f)));
    else {
      const pub = (cap.pages || []).map((p) => p.id), app = (cap.app?.screens || []).map((s) => s.id), owner = (f) => (x) => f === x || f.startsWith(x + "-");
      const seen = { pub: new Set(), app: new Set() };
      for (const f of fs.readdirSync(path.join(brandDir, "clones")).filter((x) => x.endsWith(".json"))) {
        const id = f.replace(/\.json$/, ""), side = pub.some(owner(id)) ? "pub" : app.some(owner(id)) ? "app" : null; if (!side) continue;
        for (const m of fs.readFileSync(path.join(brandDir, "clones", f), "utf8").matchAll(/assets\/images\/([^"'\\)\s?#]+)/g)) seen[side].add(m[1]);
      }
      for (const p of cap.pages || []) { const h = p.html && path.join(brandDir, p.html); if (h && fs.existsSync(h)) for (const m of fs.readFileSync(h, "utf8").matchAll(/assets\/images\/([^"'\\)\s?#]+)/g)) seen.pub.add(m[1]); }
      for (const n of seen.app) if (!seen.pub.has(n)) out.add(n);
    }
  } catch {}
  demoCache.set(brandDir, out); return out;
}
export const photosOf = (brand, brandDir) =>
  (brand.images || []).filter((im) => im.file && !im.demo && !demoImages(brandDir).has(path.basename(im.file)) && ["product", "lifestyle", "people", "background", "illustration"].includes(im.kind) && (im.w || 0) >= 400)
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
  const byId = Object.fromEntries(assets.map((a) => [a.id, a])), photos = photosOf(brand, brandDir), N = script.scenes.length;
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
    if (recipe === "pains" && !["bigtype", "card"].includes(layout)) layout = "bigtype"; // large pain cards need the frame
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

/** a clone's typical text size (median inline font-size, px) — how far a camera must zoom for text to read */
function cloneFont(brandDir, id) { const c = loadClone(brandDir, id); if (!c) return null; const v = [...String(c.html).matchAll(/font-size:\s*([\d.]+)px/g)].map((m) => +m[1]).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; }

export function compose({ brief, brand, script, assets, plan = {}, art, brandDir, runDir }) {
  const clipNotes = []; // flow clips (experiment): which scenes play a real clip, which fall back to the clone replay, and why
  const [W, H] = LAYOUTS[brief.layout] || LAYOUTS["9:16"];
  const rel = (p) => path.relative(runDir, path.join(brandDir, p)).split(path.sep).join("/");
  const byId = Object.fromEntries(assets.map((a) => [a.id, a]));
  art = art || resolveArt({}, { script, assets, brandDir, brand });
  const photos = Object.fromEntries(photosOf(brand, brandDir).map((p) => [p.id, rel(p.file)]));
  const P = brand.palette || {}, F = brand.fonts || {};
  const rtl = /arab|rtl/i.test(brand.language || "") || /[؀-ۿ]/.test(script.scenes.map((s) => s.headline).join(""));
  const logo = brand.logo?.file ? rel(brand.logo.file) : null;
  const gfonts = (F.google_fonts || []).slice(0, 3).map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;600;800;900`).join("&");
  const disp = `'${F.display || F.google_fonts?.[0] || "Cairo"}', 'Noto Kufi Arabic', sans-serif`, body = `'${F.body || F.google_fonts?.[1] || F.display || "Cairo"}', 'Noto Sans Arabic', sans-serif`;
  const bg = P.background || "#0b0d12", ink = P.ink || "#fff", muted = P.muted || "#9aa0b4", primary = P.primary || "#3b82f6", accent = P.accent || primary, surface = P.surface || "#13161d";
  const grad = P.gradient || `linear-gradient(90deg, ${primary}, ${accent})`;
  const dark = (P.theme || "dark") === "dark";
  const portrait = H > W;
  // the safe area (80 px left/right, 140 px top/bottom at 1080×1920): every text, chip, callout and device stays inside it
  const SX = Math.round((W * 80) / 1080), SY = Math.round((H * 140) / 1920), m = SX;
  const fitW = Math.floor((W - 2 * SX) / 1.03) - 8; // the widest visual (the visual layer pushes in by 3%)
  // a laptop (with its wider base) where it fits the frame; at 9:16 desktop screens fill a browser window instead
  const lapW = Math.min(920, Math.floor(fitW / 1.17)), lapH = Math.round(lapW * 10 / 16), lapLeft = Math.round((W - lapW) / 2);
  const devTop = portrait ? 680 : 260, coTop = portrait ? 1560 : H - SY - 110;
  const phW = portrait ? 480 : 430, phH = portrait ? 960 : 860, phTop = portrait ? 660 : 120; // phone body (9:16: 480 px wide)
  const BAR = 44, winW = fitW; // browser window: a 44 px bar + the screen
  const typedAll = {}; // promised-input samples per scene
  const T = art.typography, S = art.shapes, hlPx = Math.round((W / 11.5) * { xl: 1.22, l: 1, m: 0.84 }[T.size]);
  const url = (brand.site || "").replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  const scenes = [], calls = [], used = [], paceWins = [];

  script.scenes.forEach((sc, i) => {
    const n = i + 1, s = sc.start, d = sc.bars * 2, id = `sc${n}`;
    // the director's focus ids, cleaned ("part:1 \"label\"" → "part:1")
    const p = { ...(plan[n] || {}) }; if (Array.isArray(p.focus)) p.focus = p.focus.map((f) => String(f).match(/part:\d+|\bk\d+\b/)?.[0]).filter(Boolean);
    const a = art.scenes[i] || { recipe: "type", layout: "bigtype" };
    // the director may have swapped the asset (a change request / QA retry): the mechanics follow the asset, the layout must hold it
    const r = recipeFor(withAsset(sc, p, byId), byId, brandDir, brand);
    let recipe = a.recipe, layout = a.layout;
    if (DEVICE_RECIPES.includes(r.recipe)) { recipe = r.recipe; if (!DEVICE_LAYOUTS.includes(layout)) layout = "device"; }
    else if (DEVICE_RECIPES.includes(recipe)) { recipe = OLD[r.recipe] || "type"; layout = "bigtype"; }
    const img = a.image && photos[a.image] ? photos[a.image] : Object.values(photos)[i % Math.max(1, Object.keys(photos).length)];
    if ((layout === "photo" || layout === "split") && !DEVICE_RECIPES.includes(recipe) && !img) layout = "bigtype";
    used.push(layout);
    // flow clips (experiment): every flow scene says what it plays — the clip (logged where it is picked), or why not
    const flowAsset = brief.flowClips ? (sc.visual?.assets || []).map((x) => byId[x]).find((x) => x?.kind === "live-flow") : null;
    if (flowAsset) {
      const sid = flowAsset.id.replace(/-flow$/, ""), meta = (brand.screens || []).find((x) => x.id === sid)?.clones?.clip;
      if (!meta) clipNotes.push(`scene ${n}: no clip recorded for ${sid} in this capture → ${recipe === "replay" ? "clone replay" : recipe}`);
      else if (recipe !== "replay") clipNotes.push(`scene ${n}: ${sid} plays as "${recipe}"${recipe === "phone" ? " (a customer page on a phone; clips are desktop recordings)" : ""} — its clip is not used`);
      else if (!portrait) clipNotes.push(`scene ${n}: ${brief.layout} layout — clips play only in the 9:16 window → clone replay`);
    }
    const cta = recipe === "logo" ? a.cta || art.cta : null;
    // chips speak the headlines' language: with Arabic headlines, a chip without any Arabic letter is dropped
    const chips = (p.callouts || []).filter((c) => !rtl || /[؀-ۿ]/.test(c)).slice(0, 2);
    const chip = (c, style = "") => `<div class="co surface"${style ? ` style="${style}"` : ""}><b>✓</b>${esc(c)}</div>`;
    const headInner = `<div class="hl">${headline(sc.headline, p.highlight)}</div>${sc.sub ? `<div class="sub">${esc(sc.sub)}</div>` : ""}`;
    let headStyle = "", headWrap = null, vis = "", extra = "", call = "", co = chips.length ? `<div class="cos">${chips.map((c) => chip(c)).join("")}</div>` : "";

    // ── device mechanics (live product screens) ──
    // an input is only ever shown as a real flow (replay: the typed value, the button, the result) — never an overlay bar
    const intent = null, sample = null;
    let devStyle = "", devHtml = "", fake = "";
    if (DEVICE_RECIPES.includes(recipe)) {
      const win = portrait && recipe !== "phone"; // 9:16: desktop screens and blocks in a full-width window
      // where the device sits and how tall it is (inside the safe area, room for the headline above / the chips below)
      // 9:16: the visual takes the safe height the headline (≤ 2 lines + sub) and the chip row leave — the scene is then packed
      // and centred as one group at runtime (R.balance), so these tops are only a first placement
      const cardPad = layout === "card" ? 2 * Math.round(W * 0.045) : 0, inner = W - 2 * m - cardPad;
      const headEst = (() => { const per = inner / (hlPx * 0.34), lines = Math.min(2, Math.max(1, Math.ceil(String(sc.headline || "").length / per))); const sfs = Math.round(W / 26), sl = sc.sub ? Math.min(2, Math.ceil(String(sc.sub).length / (inner / (sfs * 0.34)))) : 0; return Math.round(lines * hlPx * 1.3 + (sl ? 22 + sl * sfs * 1.45 : 0) + cardPad); })();
      const GAP = Math.round(H * 0.03), chipsH = !chips.length ? 0 : layout === "stack" ? GAP + chips.length * 150 : GAP + 124, safeH = H - 2 * SY; // stack: its cards sit on the device
      // planned on the generous side: R.balance shrinks the device (≥ 78%) when the headline runs longer, grows phones when shorter
      const avail = safeH - headEst - GAP - chipsH - Math.round(H * 0.032); // 3.2%: room for the visual layer's 3% push-in
      const geo = (() => {
        if (recipe === "phone") {
          if (!portrait) return { top: phTop, h: phH, w: phW };
          const h = Math.round(Math.max(safeH * 0.6, Math.min(safeH * 0.8, avail))); // a phone is at least 60% of the safe height
          return { top: layout === "split" ? SY + 40 : SY + headEst + GAP, h, w: Math.round(h / 2) };
        }
        if (!portrait) return { top: layout === "split" ? Math.round((H - lapH) / 2) : devTop, h: recipe === "hero" ? Math.round(H * 0.5) : lapH + 30, w: lapW };
        // a full-width window cannot grow at runtime, so it plans for a headline ~18% shorter (R.fit often shrinks long ones); if it
        // still runs longer, R.balance shrinks the window a little instead
        return { top: layout === "split" ? SY + 40 : SY + headEst + GAP, h: Math.max(640, Math.min(safeH - GAP - Math.round(H * 0.032) - Math.round(hlPx * 1.3), avail + Math.round(headEst * 0.18))), w: winW }; // split: the visual on top, the text under it
      })();
      const left = Math.round((W - geo.w) / 2);
      devStyle = `top:${geo.top}px;` + (win || recipe === "hero" || recipe === "phone" ? `left:${left}px;width:${geo.w}px;height:${geo.h}px;` : "");
      if (layout === "split") {
        if (portrait) headStyle = `top:${geo.top + geo.h + 70}px;`;
        else { devStyle = `left:${SX}px;top:${geo.top}px;`; headStyle = `left:${Math.round(W / 2 + SX / 2)}px;top:${Math.round(H * 0.32)}px;`; }
      }
      const uiH = win ? geo.h - (recipe === "hero" ? 0 : BAR) : null;
      const pop = (recipe === "tour" || recipe === "replay") && (d >= 3 || layout === "stack") ? popPart(brandDir, r.ui || r.b, p.focus || sc._focus, Math.min(940, Math.floor(fitW / 1.06))) : null; // every desktop scene ≥ 3 s pops its best block
      const popHtml = pop ? `<div class="pop" style="left:${Math.round((W - pop.w) / 2)}px;top:${Math.max(SY, Math.round(geo.top + geo.h / 2 - pop.h / 2))}px"><div id="p${n}" class="ui" data-clone="${pop.id}" data-w="${pop.w}" data-h="${pop.h}" data-frame="none"></div></div>` : "";
      const popArg = pop ? `,pop:"#p${n}"` : "";
      const frameOpen = win ? `<div class="dev win" style="${devStyle}">${recipe === "hero" ? "" : `<div class="wbar"><i></i><i></i><i></i></div>`}` : "", frameClose = win ? "</div>" : "";
      const deskUi = (uid, cid, after = false) => (win ? `<div id="${uid}" class="ui${after ? " ui-after" : ""}" data-clone="${cid}" data-w="${geo.w}" data-h="${uiH}" data-frame="none"></div>` : `<div id="${uid}" class="ui${after ? " ui-after" : ""}" data-clone="${cid}" data-w="${lapW}"></div>`);
      // a promised input: type into a real field of the screen, else into a field built in the brand's style
      const fieldOf = (cid) => (loadClone(brandDir, cid)?.keys || []).find((k) => k.role === "field");
      let typeArg = "";

      if (recipe === "tour") { devHtml = win ? `${frameOpen}${deskUi(`u${n}`, r.ui)}${frameClose}` : `<div class="dev laptop" style="${devStyle}">${deskUi(`u${n}`, r.ui)}</div>`; call = `K.R.tour(tl,{sc:"#${id}",ui:"#u${n}",s:${s},d:${d},focus:${JSON.stringify(p.focus || sc._focus || [])}${popArg}${typeArg}});`; }
      // a flow clip (experiment, brief.flowClips): the recorded session plays in the window, sped up to fit, the camera zoomed on
      // top — only when it stays sharp at the zoom that makes its text readable (≤ 2× upscale); else the clone replay as before
      const clip = recipe === "replay" && brief.flowClips && win ? (brand.screens || []).find((x) => x.id === r.b)?.clones?.clip : null;
      let clipUse = null;
      if (clip) {
        const k = clip.w / (clip.view?.[0] || clip.w), sClip = geo.w / clip.w, fpx = (cloneFont(brandDir, r.a) || 14) * k * sClip;
        const z = Math.min(3.2, Math.max(1, 22 / fpx)), up = sClip * z;
        if (!fs.existsSync(path.join(brandDir, clip.file))) clipNotes.push(`scene ${n}: clip ${clip.file} missing → clone replay`);
        else if (up > 2) clipNotes.push(`scene ${n}: clip would be ${up.toFixed(2)}× upscaled at the readable zoom (blurry) → clone replay`);
        else { const fr = clipFrames({ brandDir, runDir, clip, id: `${r.b}-${n}` }); if (fr) { clipUse = { ...fr, sClip, z, clip }; clipNotes.push(`scene ${n}: plays clip ${clip.file} (${clip.dur} s in ${d} s, zoom ${z.toFixed(2)}, ${up.toFixed(2)}× upscale)`); } else clipNotes.push(`scene ${n}: clip frames failed → clone replay`); }
      }
      if (clipUse) {
        const cw = Math.round(clipUse.clip.w * clipUse.sClip), ch = Math.round(clipUse.clip.h * clipUse.sClip);
        devHtml = `${frameOpen}<div id="u${n}v" class="clipui" style="left:0;top:${BAR}px;width:${geo.w}px;height:${uiH}px"><div class="clip-cam" style="width:${cw}px;height:${ch}px"><img src="${clipUse.dir}/0001.jpg"></div></div>${frameClose}`;
        call = `K.R.clip(tl,{sc:"#${id}",ui:"#u${n}v",s:${s},d:${d},dir:${JSON.stringify(clipUse.dir)},n:${clipUse.n},fps:${clipUse.fps},dur:${clipUse.clip.dur},k:${clipUse.sClip.toFixed(5)},z:${clipUse.z.toFixed(3)},w:${cw},h:${ch},marks:${JSON.stringify(clipUse.clip.marks || [])}});`;
      }
      else if (recipe === "replay") { const then = (sc.visual?.assets || []).map((x) => (byId[x]?.kind === "live-phone" ? x.replace(/-phone$/, "") : x)).filter((x) => x !== r.b && /^live-(screen|phone)/.test(byId[x]?.kind || byId[`${x}-phone`]?.kind || "") && has(brandDir, x)).filter((x, k, l) => l.indexOf(x) === k).slice(0, 2);
        devHtml = `${win ? frameOpen : `<div class="dev laptop" style="${devStyle}">`}${deskUi(`u${n}a`, r.a)}${deskUi(`u${n}b`, r.b, true)}${then.map((x, k) => deskUi(`u${n}c${k}`, x, true)).join("")}<div class="spin"></div><div class="ok">✓</div>${win ? frameClose : "</div>"}`; const tk = p.typeKey || (r.asset && flowInfo(r.asset, brandDir).typeKey); call = `K.R.replay(tl,{sc:"#${id}",a:"#u${n}a",b:"#u${n}b",s:${s},d:${d}${tk ? `,typeKey:"${tk}"` : ""}${p.tapKey ? `,tapKey:"${p.tapKey}"` : ""}${p.result ? `,result:${JSON.stringify(p.result)}` : ""}${then.length ? `,then:${JSON.stringify(then.map((_, k) => `#u${n}c${k}`))}` : popArg}${fake ? `,fake:${JSON.stringify(fake)}` : ""}});`; }
      else if (recipe === "phone") { devHtml = `<div class="dev phone" style="${devStyle}"><div class="notch"></div><div id="u${n}" class="ui" data-clone="${r.ui}" data-w="${geo.w - 40}" data-h="${geo.h - 60}" data-frame="none"></div></div>`; call = `K.R.phone(tl,{sc:"#${id}",ui:"#u${n}",s:${s},d:${d}${p.tapKey ? `,tapKey:"${p.tapKey}"` : ""}${typeArg}});`; }
      else { const bh = win ? geo.h : Math.round(Math.min((loadClone(brandDir, r.ui)?.h || 400) * (lapW / (loadClone(brandDir, r.ui)?.w || 1)), H * 0.5)); devHtml = `<div class="glow"></div>${win ? `${frameOpen}<div id="u${n}" class="ui" data-clone="${r.ui}" data-w="${geo.w}" data-h="${geo.h}" data-frame="none"></div>${frameClose}` : `<div class="dev block" style="${devStyle}"><div id="u${n}" class="ui" data-clone="${r.ui}" data-w="${lapW}" data-h="${bh}" data-frame="none"></div></div>`}`; call = `K.R.hero(tl,{sc:"#${id}",ui:"#u${n}",s:${s},d:${d}${typeArg}});`; }
      if (layout === "stack") { extra = chips.map((c, k) => `<div class="stackcard surface" style="top:${Math.round(geo.top + geo.h + GAP + k * 150)}px;inset-inline-${k % 2 ? "end" : "start"}:${SX + 40}px"><b>✓</b>${esc(c)}</div>`).join(""); co = ""; }
      // callouts sit in a row under the device, inside the safe area — never on its edge
      else if (chips.length && layout !== "split") co = `<div class="cos" style="top:${Math.min(H - SY - 130, geo.top + geo.h + 34)}px">${chips.map((c) => chip(c)).join("")}</div>`;
      if (layout === "card") headWrap = "card";
      if (fake) extra += `<div class="fakefield surface" style="top:${Math.round(geo.top + (recipe === "phone" ? 120 : 70))}px"><span class="ff-ico">${intent === "link" ? "🔗" : intent === "search" ? "⌕" : "›"}</span><span class="ff-text"></span><span class="ff-caret"></span></div>`;
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
      if (recipe === "pains") { co = ""; const pains = (p.pains && p.pains.length ? p.pains : (/[+،,]/.test(sc.headline) ? sc.headline : String(sc.sub || sc.headline)).split(/[+،,]| و /).map((x) => x.trim()).filter(Boolean)).slice(0, 4); vis = `<div class="vis"><div class="pains">${pains.map((x) => `<div class="pain surface">${esc(x)}</div>`).join("")}</div><div class="xmark"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/></svg></div></div>`; call = `K.R.pains(tl,{sc:"#${id}",s:${s},d:${d}});`; }
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
        // whole short items (a name / a benefit), each its own chip, the logo between them — never a raw joined string
        const short = (x) => x && x.length <= 26 && x.split(/\s+/).length <= 4;
        const items = [...new Set([...chips, ...(brand.features || []).map((f) => f.name), ...(brand.selling_points || [])].map((x) => String(x || "").trim()))].filter((x) => short(x) && (!rtl || /[\u0600-\u06FF]/.test(x))).slice(0, 8);
        const seq = items.flatMap((x, k) => [`<span class="ti surface">${esc(x)}</span>`, ...(logo && k % 2 === 1 ? [`<span class="ti logo surface"><img src="${logo}"></span>`] : [])]);
        const est = items.reduce((a, x) => a + x.length * 26 + 110, 0) + (logo ? 160 * Math.floor(items.length / 2) : 0), reps = Math.max(1, Math.ceil((W * 1.2) / Math.max(1, est)));
        const half = Array.from({ length: reps }, () => seq.join("")).join(""); // one half fills more than the frame; the track holds two halves (a seamless loop)
        const row = (k) => `<div class="tick" style="top:${(portrait ? 1180 : H * 0.62) + k * (portrait ? 190 : 120)}px"><div class="track"><div class="half">${half}</div><div class="half">${half}</div></div></div>`;
        extra = items.length >= 2 ? row(0) + row(1) : ""; co = "";
      }
    }
    const headHtml = headWrap === "card" ? `<div class="card surface"><div class="head inner">${headInner}</div></div>`
      : headWrap && headWrap.pre ? `<div class="card surface cta-card">${headWrap.pre}<div class="head inner">${headInner}</div>${headWrap.post}</div>`
      : `<div class="head"${headStyle ? ` style="${headStyle}"` : ""}>${headInner}</div>`;
    scenes.push(`<div class="scene l-${layout} r-${recipe}${cta ? ` cta-${cta}` : ""}" data-scene="${n}" id="${id}">${headHtml}${vis}${extra}${co}</div>`);
    calls.push(`K.R.layout(tl,"#${id}",${s},${s + d});\n${call}`);
    paceWins.push([s, s + d, `#${id}`]);
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
#mark{position:absolute;top:${SY}px;${rtl ? "right" : "left"}:${SX}px;height:60px;z-index:40;visibility:hidden}
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
.win{border-radius:var(--r);overflow:hidden;background:${surface};box-shadow:0 40px 120px rgba(0,0,0,.45),0 0 0 2px ${ink}1a}
.win .wbar{height:${BAR}px;display:flex;align-items:center;gap:10px;padding:0 18px;background:${surface};border-bottom:1px solid ${ink}14}.win .wbar i{width:13px;height:13px;border-radius:50%;background:${ink}33}
.win .ui{position:absolute;left:0;top:${BAR}px}.win:not(:has(.wbar)) .ui{top:0}
.fakefield{position:absolute;left:${SX + 30}px;right:${SX + 30}px;height:118px;display:flex;align-items:center;gap:22px;padding:0 34px;font-size:42px;font-weight:600;color:${ink};z-index:9;opacity:0;direction:ltr;box-shadow:0 24px 70px rgba(0,0,0,.4),0 0 0 3px ${primary}}
.fakefield .ff-ico{font-size:44px;opacity:.8}.fakefield .ff-text{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fakefield .ff-caret{width:3px;height:52px;background:${primary};margin-inline-start:-14px}
.ui-after{visibility:hidden}
.clipui{position:absolute;overflow:hidden;background:#000}.clip-cam{position:absolute;left:0;top:0;transform-origin:0 0}.clip-cam img{display:block;width:100%;height:100%}
.spin{position:absolute;left:50%;top:50%;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;border:10px solid ${ink}22;border-top-color:${primary};opacity:0;z-index:7}
.pop{position:absolute;left:${Math.round((W - 940) / 2)}px;opacity:0;z-index:6}
.pop .ui{border-radius:var(--r);background:${surface};box-shadow:0 50px 140px rgba(0,0,0,.65),0 0 0 3px ${primary}88}
.ok{position:absolute;${rtl ? "left" : "right"}:18px;top:18px;width:110px;height:110px;border-radius:50%;background:${grad};color:#fff;font:800 64px/110px sans-serif;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.45);opacity:0;z-index:5}
.phone{left:${Math.round((W - phW) / 2)}px;top:${phTop}px;width:${phW}px;height:${phH}px;border-radius:64px;background:#0a0a0c;box-shadow:0 0 0 3px #3a3d45,0 0 0 9px #16171b,0 60px 140px rgba(0,0,0,.6)}
.phone .ui{position:absolute;left:20px;top:30px;border-radius:40px;overflow:hidden;background:#fff}
.phone .notch{position:absolute;left:50%;top:14px;width:130px;height:30px;margin-left:-65px;border-radius:20px;background:#000;z-index:3}
.block{left:${lapLeft}px;top:${portrait ? 760 : 220}px}
.block .ui{position:relative;border-radius:var(--r);background:${surface};box-shadow:0 40px 120px rgba(0,0,0,.5),0 0 0 2px ${primary}33}
.glow{position:absolute;left:50%;top:${portrait ? 1050 : 520}px;width:800px;height:800px;margin:-400px 0 0 -400px;border-radius:50%;background:radial-gradient(${primary}55,transparent 65%);opacity:.6}
.cos{position:absolute;left:${SX}px;right:${SX}px;top:${coTop}px;display:flex;flex-wrap:nowrap;gap:22px;justify-content:center;font-size:38px}
.co{padding:.52em .9em;font-size:1em;font-weight:700;white-space:nowrap}
.r-phone .cos{top:${portrait ? phTop + phH + 30 : H - 150}px}
.co b,.stackcard b{color:${primary};margin-inline-end:12px}
.stackcard{position:absolute;z-index:7;padding:26px 38px;font-size:40px;font-weight:800;opacity:0}
.card{position:absolute;left:${m}px;right:${m}px;top:${portrait ? 230 : 70}px;padding:${Math.round(W * 0.045)}px;text-align:${T.align}}
.l-card .laptop,.l-card .block{top:${portrait ? 880 : 300}px}.l-card .phone{top:${portrait ? 760 : 160}px}
.card.cta-card{top:${portrait ? 420 : 120}px;text-align:center}.cta-card .biglogo{position:static!important;transform:none!important;height:150px;margin:0 auto 28px;display:block}
.cta-card .cta-btn{position:static!important;transform:none!important;display:inline-block;margin-top:44px}.cta-card .url{position:static!important;margin-top:28px}
.ph{position:absolute;inset:0;overflow:hidden;z-index:0}.ph img{width:100%;height:100%;object-fit:cover}
.head,.card{z-index:4}.cos,.co{z-index:5}.scrim{z-index:1}.vis{z-index:2}
.ph.half{bottom:auto;height:${portrait ? Math.round(H * 0.5) : H}px;${portrait ? "" : `width:${Math.round(W / 2)}px;`}border-radius:0 0 var(--r) var(--r)}
.scrim{position:absolute;inset:0;background:linear-gradient(to top,${bg} 0%,${bg}ee 30%,${bg}99 46%,${bg}00 70%)}
.l-photo .head{top:${portrait ? Math.round(H * 0.67) : Math.round(H * 0.55)}px}.l-photo .cos{top:${portrait ? H - SY - 130 : H - SY - 110}px}
.l-split:not(.r-tour):not(.r-replay):not(.r-phone):not(.r-hero) .head{top:${portrait ? Math.round(H * 0.56) : Math.round(H * 0.3)}px${portrait ? "" : `;left:${Math.round(W / 2 + m / 2)}px`}}
.l-bigtype .head{top:${portrait ? Math.round(H * 0.36) : Math.round(H * 0.3)}px;left:${SX + 24}px;right:${SX + 24}px}.l-bigtype .hl{font-size:${Math.round(hlPx * 1.3)}px}
.l-bigtype.r-count .head,.l-bigtype.r-pains .head{top:${portrait ? 360 : 90}px}.l-bigtype.r-count .hl,.l-bigtype.r-pains .hl{font-size:${hlPx}px}
.tiles{position:absolute;left:${m}px;right:${m}px;top:${portrait ? 760 : Math.round(H * 0.42)}px;display:grid;grid-template-columns:1fr 1fr;gap:26px}
.tile{height:${portrait ? 400 : 240}px;overflow:hidden;opacity:0}.tile img{width:100%;height:100%;object-fit:cover;object-position:top}
.tile.txt{display:flex;align-items:center;justify-content:center;padding:30px;font-size:44px;font-weight:800;text-align:center;line-height:1.3}
.tick{position:absolute;left:${SX}px;right:${SX}px;overflow:hidden;direction:ltr}.track{display:flex;width:max-content}.track .half{display:flex;gap:26px;padding-inline-end:26px}
.ti{flex:none;padding:26px 44px;font-size:46px;font-weight:800;white-space:nowrap;direction:${rtl ? "rtl" : "ltr"}}.ti.logo{padding:18px 36px;display:flex;align-items:center}.ti.logo img{height:64px}
.l-ticker .head{top:${portrait ? 520 : 120}px}
.r-type.l-bigtype .biglogo{position:absolute;left:50%;top:${portrait ? 330 : 60}px;height:150px;transform:translateX(-50%)}
.pains{position:absolute;left:${SX + 16}px;right:${SX + 16}px;top:${portrait ? 760 : Math.round(H * 0.42)}px;bottom:${SY + 20}px;display:flex;flex-direction:column;justify-content:center;gap:24px}
.l-card .pains{top:${portrait ? 720 : Math.round(H * 0.45)}px}
.pain{flex:1;max-height:${portrait ? 420 : 260}px;display:flex;align-items:center;justify-content:center;text-align:center;padding:0 48px;border-color:#ef444466;font-size:${Math.round(W / 17)}px;font-weight:800;line-height:1.3;color:${ink}}
.xmark{position:absolute;left:50%;top:${portrait ? 1180 : 600}px;margin-left:-110px;width:220px;height:220px;border-radius:50%;background:#ef4444;opacity:0;z-index:6;display:flex;align-items:center;justify-content:center}.xmark svg{width:130px;height:130px}
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
.cta-split-photo .biglogo{top:${portrait ? Math.round(H * 0.51) : 80}px!important;height:120px!important}.cta-split-photo .head{top:${portrait ? Math.round(H * 0.58) : 300}px}
.cta-split-photo .cta-btn{top:${portrait ? Math.round(H * 0.73) : 620}px}.cta-split-photo .url{top:${portrait ? Math.round(H * 0.82) : 760}px}
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
K.R.pace(tl, ${JSON.stringify(paceWins)}); // no scene goes more than 3 s without visible movement
K.done(tl, ${script.length});
// once the fonts are in: shrink any text that would run off the frame, move badges off the headline
// then pack each scene's headline + visual + chips into one group, centred on the safe area's optical centre
window.__ready = Promise.resolve(window.__ready).then(() => K.R.fit()).then(() => K.R.balance(${SX}, ${SY})).then(() => true);
</script></body></html>`;
  const final = { ...art, scenes: art.scenes.map((x, i) => ({ ...x, layout: used[i] ?? x.layout })) };
  return { clipNotes, html, recipes: script.scenes.map((sc, i) => (art.scenes[i] || {}).recipe || "type"), layouts: used, fingerprint: fingerprintOf(final) };
}
