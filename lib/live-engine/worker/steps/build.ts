/* eslint-disable */
// @ts-nocheck — verbatim port of video-sandbox/steps/build.mjs; the only edits are listed in scripts/live-engine/port-sandbox.py.
// STEP 5b — build. Script + brand + assets → one self-contained HTML composition (GSAP timeline), written in one call.
// The model writes video.src.html with light placeholders for the real product screens (data-clone="…");
// embedClones() then pastes the captured live UI into them → video.html (what QA checks and the renderer films).
import fs from "node:fs";
import path from "node:path";
import { callTool } from "../claude";
import { LAYOUTS } from "./script";
import { applyOrder, compose, fingerprintOf, readHistory, recipeFor, resolveArt, uniqueness } from "./compose";
import { artDirect } from "./artdirect";

const ROLE_ORDER = { field: 0, button: 1, stat: 2, title: 3, tab: 4, part: 5, row: 6, chart: 7, image: 8, item: 9, nav: 10 };
const loadClone = (brandDir, id) => { const f = path.join(brandDir, "clones", `${id}.json`); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null; };
// the key list the model sees: what it can zoom to, type into, tap, count, slide
const keyList = (c, n = 40) => [...c.keys].sort((a, b) => (a.acted ? -1 : 0) - (b.acted ? -1 : 0) || ROLE_ORDER[a.role] - ROLE_ORDER[b.role]).slice(0, n)
  .sort((a, b) => a.box[1] - b.box[1] || a.box[0] - b.box[0])
  .map((k) => `${k.k} ${k.role}${k.part != null ? " part:" + k.part : ""}${k.acted ? " ACTED:" + k.acted : ""} "${k.text}" [${k.box.join(",")}]`);
const liveInfo = (c, n) => ({ clone: c.id, size: [c.w, c.h], dir: c.dir, keys: keyList(c, n) });

export async function buildVideo(args) {
  // default: the art director picks the look (from the brand's site, unlike recent videos), the director plans what each
  // scene shows, code composes it from tested motion recipes (alive by construction).
  // brief.composer = "freeform" keeps the old path where the model writes the whole GSAP file.
  if (args.brief.composer !== "freeform") return directAndCompose(args);
  return buildFreeform(args);
}

/** art direction (the look) + a cheap director call (what each scene shows); compose() writes it from the motion recipes */
async function directAndCompose({ brief, brand, script, runDir, brandDir, ledger, models, fixIssues, request, history, keepArt, log = console.log }) {
  log("▶ build (art direction + director + motion recipes)");
  const assets = JSON.parse(fs.readFileSync(path.join(runDir, "assets.json")));
  const byId = Object.fromEntries(assets.map((a) => [a.id, a]));

  // 1. the look of this one video — kept on QA rebuilds and edits (a video keeps its look), new otherwise
  const artFile = path.join(runDir, "art.json"), ctx = { script, assets, brandDir, brand };
  const fpOf = (a) => fingerprintOf({ ...a, scenes: a.order.map((n) => a.scenes[n - 1]) }); // in play order
  let art;
  if (fs.existsSync(artFile) && (fixIssues || request || keepArt)) {
    art = JSON.parse(fs.readFileSync(artFile, "utf8"));
    log(`  ↺ art direction kept: ${art.background} · ${art.transition} · hook ${art.hook} · cta ${art.cta}`);
  } else {
    const recent = (history ?? readHistory(runDir)).slice(0, 5);
    let raw = null;
    try { raw = await artDirect({ brief, brand, script, assets, brandDir, ledger, models, history: recent, log }); } catch (e) { log(`  ! art direction failed (${e.message}) — a default look`); }
    art = resolveArt(raw || {}, ctx);
    // no repeats: at least 3 of the 5 fingerprint fields differ from each recent video, else one more answer
    let fails = uniqueness(fpOf(art), recent);
    if (raw && fails.length) {
      log(`  ↻ too close to ${fails.length} recent video(s) (${fails.map((f) => `${f.differ}/5 differ`).join(", ")}) — asking the art director again`);
      try {
        const raw2 = await artDirect({ brief, brand, script, assets, brandDir, ledger, models, history: recent, avoid: fails.map((f) => f.h), log });
        const art2 = resolveArt(raw2, ctx), fails2 = uniqueness(fpOf(art2), recent);
        if (fails2.length <= fails.length) { art = art2; fails = fails2; raw = raw2; }
      } catch (e) { log(`  ! second art direction failed (${e.message})`); }
      if (fails.length) log(`  ! still close to ${fails.length} recent video(s) — kept the more different answer`);
    }
    art = applyOrder(script, art); // the play order: the script is re-timed in place (scenes, start times, music drops)
    fs.writeFileSync(path.join(runDir, "script.json"), JSON.stringify(script, null, 2));
    fs.writeFileSync(artFile, JSON.stringify({ ...art, raw }, null, 2));
  }

  // 2. the director: what each scene shows
  const scenes = script.scenes.map((sc, i) => {
    const r = recipeFor(sc, byId, brandDir, brand);
    const out = { n: i + 1, purpose: sc.purpose, recipe: art.scenes[i]?.recipe || r.recipe, layout: art.scenes[i]?.layout, headline: sc.headline, sub: sc.sub || "", detail: sc.visual?.detail || "" };
    const cid = r.ui || r.b; const c = cid && loadClone(brandDir, cid);
    if (c) out.regions = c.keys.filter((k) => k.part != null && k.text).slice(0, 8).map((k) => `part:${k.part} "${k.text.slice(0, 50)}"`);
    if (r.recipe === "replay") { const b = loadClone(brandDir, r.a); if (b) out.action = b.action; }
    return out;
  });
  const tool = { name: "plan", description: "What each scene shows", input_schema: { type: "object", required: ["scenes"], properties: { scenes: { type: "array", items: { type: "object", required: ["n"], properties: {
    n: { type: "integer" },
    highlight: { type: "string", description: "ONE word copied exactly from the headline that carries the promise (gets the brand gradient)" },
    callouts: { type: "array", items: { type: "string" }, description: "0-2 short benefit chips (max 4 words each) in the headline's dialect, only facts visible on that screen or in the brand facts" },
    pains: { type: "array", items: { type: "string" }, description: "problem scenes only: 2-4 pain cards, max 3 words each" },
    focus: { type: "array", items: { type: "string" }, description: "tour/replay scenes: up to 2 region ids from that scene's regions that best prove the headline, most important first" },
    number: { type: "string", description: "offer scenes: the number to count up, copied from the headline/sub" },
    button: { type: "string", description: "cta scene: button text, max 3 words" },
    asset: { type: "string", description: "only when a change request or a QA problem needs it: another asset id from LIVE ASSETS for this scene" },
  } } } } } };
  // a client's change request and/or the problems QA found in the previous composition steer the plan
  const live = assets.filter((a) => /^live-/.test(a.kind)).map((a) => ({ id: a.id, kind: a.kind, shows: a.shows }));
  const steer = [
    request ? `CLIENT CHANGE REQUEST (apply it through highlight, callouts, pains, focus, number, button, or another asset for a scene): ${request}` : "",
    fixIssues?.length ? `QA FOUND THESE PROBLEMS IN THE PREVIOUS COMPOSITION — change the plan so they do not happen again (other focus regions, shorter callouts/button text, another asset for a scene whose screen did not work):\n${fixIssues.map((x) => "- " + x.msg).join("\n")}` : "",
  ].filter(Boolean).join("\n\n");
  let plan = {};
  try {
    const out = await callTool({ ledger, step: "direct", model: models.qa || models.script, maxTokens: 3000, tool, content: `BRAND: ${JSON.stringify({ name: brand.name, name_ar: brand.name_ar, selling_points: brand.selling_points, voice: brand.voice })}\n\nSCENES:\n${JSON.stringify(scenes, null, 1)}${steer ? `\n\nLIVE ASSETS:\n${JSON.stringify(live)}\n\n${steer}` : ""}`,
      system: "You direct a motion-graphics ad. Write the benefit chips (callouts), pain cards and button text in the SAME language and dialect as the headlines (Arabic headlines → Arabic chips; a product name may stay as written). For each scene pick the highlight word, short benefit chips, pain cards, camera focus regions, the offer number and the button text. Copy words exactly; never invent numbers or features. Arabic stays in the same dialect as the headlines." });
    for (const p of out.scenes || []) plan[p.n] = p;
  } catch (e) { log(`  ! director failed (${e.message}) — composing with defaults`); }
  fs.writeFileSync(path.join(runDir, "plan.json"), JSON.stringify(plan, null, 2));
  const { html, recipes, layouts, fingerprint } = compose({ brief, brand, script, assets, plan, art, brandDir, runDir });
  fs.writeFileSync(path.join(runDir, "video.src.html"), html);
  fs.writeFileSync(path.join(runDir, "fingerprint.json"), JSON.stringify(fingerprint, null, 2));
  const info = embedClones({ runDir, brandDir, layout: brief.layout });
  log(`✓ build: ${recipes.length} scenes composed (${recipes.map((r, i) => `${layouts[i]}/${r}`).join(" · ")}) · ${art.background} · ${art.transition} · hook ${art.hook} · cta ${art.cta} · ${info.count} live screens embedded${info.missing.length ? ` · missing: ${info.missing.join(", ")}` : ""}`);
  return path.join(runDir, "video.html");
}

async function buildFreeform({ brief, brand, script, runDir, brandDir, ledger, models, fixIssues, log = console.log }) {
  log("▶ build");
  const [W, H] = LAYOUTS[brief.layout] || LAYOUTS["9:16"];
  const rel = (p) => path.relative(runDir, path.join(brandDir, p)).split(path.sep).join("/");
  const assets = JSON.parse(fs.readFileSync(path.join(runDir, "assets.json")));
  const used = new Set(script.scenes.flatMap((s) => s.visual.assets || []));
  const src = assets.filter((a) => used.has(a.id) || a.id === "logo").map((a) => {
    if (a.kind === "logo") return { id: a.id, src: rel(a.file), kind: "logo" };
    if (a.kind === "live-screen") { const c = loadClone(brandDir, a.id); if (c) return { id: a.id, kind: a.kind, shows: a.shows, ...liveInfo(c, 45) }; }
    if (a.kind === "live-phone") { const c = loadClone(brandDir, a.id.replace(/-phone$/, "-mobile")); if (c) return { id: a.id, kind: a.kind, shows: a.shows, ...liveInfo(c, 30) }; }
    if (a.kind === "live-flow") { const sid = a.id.replace(/-flow$/, ""); const b = loadClone(brandDir, `${sid}-before`), c = loadClone(brandDir, sid); if (b && c) return { id: a.id, kind: a.kind, shows: a.shows, action: b.action, before: liveInfo(b, 28), after: liveInfo(c, 30) }; }
    if (a.kind.startsWith("live-block")) { const c = loadClone(brandDir, a.id); if (c) return { id: a.id, kind: a.kind, shows: a.shows, ...liveInfo(c, 30) }; }
    if (a.kind.startsWith("object-") || a.kind.startsWith("live-block")) { const x = brand.parts.find((p) => p.id === a.id); return { id: a.id, kind: a.kind.replace("live-block", "object"), shows: x.shows, object: { ...x.object, images: (x.object.images || []).map((im) => ({ ...im, src: rel(im.file), file: undefined })) }, how: "REBUILD this as a live HTML component in the brand style — same title, numbers, labels, buttons, fields and rows (you may keep only the 3-8 that matter), enlarged for a phone screen. Do not use a screenshot of it." }; }
    const s = brand.screens.find((x) => x.id === a.id);
    if (s) return { id: a.id, kind: "screen-image", src: rel(s.file), shows: s.shows, how: "tall full-page capture: only inside a device/browser frame with overflow hidden, scrolling (pan y) to the relevant part — never shrunk to fit" };
    return { id: a.id, kind: a.kind, src: rel(a.file), w: a.w, h: a.h, note: a.note };
  });
  const fontFaces = (brand.fonts.files || []).filter((f) => /woff2?$/.test(f)).slice(0, 6).map((f) => rel(f));
  const tool = { name: "composition", description: "The finished HTML file", input_schema: { type: "object", required: ["html"], properties: { html: { type: "string", description: "complete HTML document" }, notes: { type: "string" } } } };
  const system = `You are a senior motion designer who codes. You write ONE complete HTML document that plays a ${script.length}s ${brief.layout} ad as a GSAP timeline. It is rendered frame by frame, so every visual change must live on the timeline.

TECH CONTRACT (must follow exactly)
- <head>: <meta charset="utf-8">, then <script src="../../vendor/gsap.min.js"></script> and <script src="../../vendor/kit.js"></script>. You may add Google Fonts <link> tags. No other external scripts.
- html, body margin 0, background = brand background. One root <div id="stage"> exactly ${W}×${H}px, position:relative, overflow:hidden. Everything is inside #stage. Use px sizes for a ${W}px-wide canvas (headline ~${Math.round(W / 11)}px).
- Script: build \`const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } })\`, add all tweens with absolute positions in seconds, finish with \`K.done(tl, ${script.length})\`. No setTimeout, setInterval, requestAnimationFrame, CSS @keyframes, CSS transitions, video tags or Math.random (use a fixed list of values instead).
- GSAP traps to avoid: an element hidden in CSS (opacity:0) must be revealed with tl.fromTo(sel,{opacity:0,...},{opacity:1,...}) or tl.set — never with .from({opacity:0}) (it would tween 0→0 and the scene stays invisible). Never animate the same property of the same element with two overlapping tweens. Scene containers: start hidden in CSS (visibility:hidden; opacity:0 — never display:none), tl.set(scene,{autoAlpha:1},start) and tl.to(scene,{autoAlpha:0,duration:.3},end-.3).
- EVERY scene of the script gets its own container <div class="scene" data-scene="N"> (N = 1, 2, … in script order) — all ${script.scenes.length} of them, none skipped or merged.
- Kit helpers: K.split(selector) wraps words in .w spans; K.flash(tl, t); K.pulse(tl, target, from, to, vars, every=0.5); K.count(tl, selector, from, to, at, dur, fmt); K.type(tl, selector, text, at, dur).

LIVE PRODUCT SCREENS — the heart of the video
The live-* assets are the product's REAL screens, copied out of the browser while our agent test-drove the product (real DOM and styles, crisp at any zoom). The video must feel cut out of the product itself: show the real thing, then move through it like a camera operator.
- Embed one with an EMPTY placeholder: <div id="ui3" class="ui" data-clone="CLONE_ID"></div>, positioned with your own CSS (position:absolute; left/top only).
  · Desktop screens (live-screen, live-flow) are shown ON A LAPTOP automatically: the pipeline draws the screen (${Math.min(W - 160, 920)}×${Math.round(Math.min(W - 160, 920) * 10 / 16)}px), a black bezel around it (~${Math.round(Math.min(W - 160, 920) * 0.022)}px) and the silver base below it (~${Math.round(Math.min(W - 160, 920) * 0.032)}px tall, a bit wider than the screen). So: do NOT add your own frame, border, browser bar or shadow to it; centre it horizontally (left:${Math.round((W - Math.min(W - 160, 920)) / 2)}px) and leave room for bezel + base. Animate the laptop in/out as one object (move/scale/fade the placeholder itself).
  · live-block and live-phone: data-w = width on stage (and optional data-h); give them a background in the brand surface colour (blocks have none of their own), radius and shadow; put live-phone inside your own phone body. The pipeline pastes the real UI into it — never write anything inside it and never style its insides.
- Keys: each asset lists "k12 role \\"text\\" [x,y,w,h]" — real elements inside the screen (boxes in screen px). Target them only as "#ui3 [data-k=k12]" (or with the helpers below). Roles: field, button, stat, title, tab, part, row, chart, image, item, nav. ACTED:click / ACTED:type = what the agent actually did.
- Camera: K.focus(tl, "#ui3", "k12" | "part:2" | "all" | [x,y,w,h], at, {zoom, dur}) glides/zooms so the target fills the window (zoom auto-fits; dur 0 = cut). K.scrollTo(tl, "#ui3", y, at, dur) scrolls the real page. Desktop screens: start on "all" for a beat (the whole real screen on the laptop), then the camera zooms INSIDE the laptop screen into the block that proves the headline. Never leave it un-zoomed for more than ~1.5 s — its text is tiny at full width.
- Actions: K.typeInto(tl, "#ui3", "k4", at, dur[, text]) types into a real field (defaults to the value typed during the test); K.tap(tl, "#ui3", "k7", at) — a pointer glides in and taps the real button at time at (press + ripple); K.press(tl, el, at); K.count on a stat: "#ui3 [data-k=k9]". Stagger real rows / items in with tl.fromTo("#ui3 [data-role=row]", {opacity:0,x:40},{opacity:1,x:0,stagger:.12}, at).
- live-flow = replay a recorded action: placeholder A for "before" (zoom to the ACTED field/button, typeInto it, tap the ACTED:click button), then K.swap(tl, "#uiA", "#uiB", at) to placeholder B ("after", same size/position) and zoom into the result. live-phone: a phone frame (~${Math.round(W * 0.72)}px wide), data-w = the screen width inside it, K.scrollTo down the page.
- Your own layer on top: headline + sub in the brand style, kept clear of the window (above or below it, or on a solid band). Never cover the part of the screen the camera is focusing on.
- object-* assets (fallback, only if listed): rebuild them as HTML components from their data. screen-image assets: only inside a device frame, panning.
- Images: only the src paths given. Arabic: dir="rtl" on #stage when the language is Arabic. Never letter-space Arabic. Line-height ≥1.3.

CRAFT
- Music is 120 BPM: beat = 0.5s, bar = 2s. Scene changes on bar starts. Hits, taps and camera moves land on beats. Call K.flash on the music drops. Use K.pulse for a subtle beat pulse on the background glow during energetic scenes.
- Each scene: enter (≤0.6s), hold long enough to read (≥1.2s for a headline), exit (≤0.35s). Stagger words of headlines.
- Look must be an extension of the brand: brand palette, brand fonts, brand shapes and radius. Bold type, real depth (shadows, layering), real transitions (slides, masks, scale punches). No generic gradients that are not in the palette. No emoji.
- Keep your own text inside safe margins (${Math.round(W * 0.07)}px). Nothing may overflow the stage unintentionally.`;
  const content = `SCRIPT\n${JSON.stringify(script)}\n\nBRAND\n${JSON.stringify({ name: brand.name, name_ar: brand.name_ar, palette: brand.palette, fonts: { display: brand.fonts.display, body: brand.fonts.body, google_fonts: brand.fonts.google_fonts }, local_font_files: fontFaces, look: brand.look, language: brand.language, site: brand.site })}\n\nASSETS (src paths are relative to the HTML file; live-* go in data-clone placeholders)\n${JSON.stringify(src, null, 1)}`;
  const content2 = fixIssues ? content + `\n\nA previous build of this script failed these checks — avoid the same mistakes:\n${fixIssues.map((x) => "- " + x.msg).join("\n")}` : content;
  // completeness: every scene built, live scenes with their data-clone placeholder, the answer not cut off
  const liveIds = new Set(assets.filter((a) => /^live-/.test(a.kind)).map((a) => a.id));
  const liveScenes = script.scenes.map((s) => (s.visual.assets || []).filter((id) => liveIds.has(id))).filter((ids) => ids.length);
  const measure = (o) => ({ ...coverage(o.html, script, liveScenes), out: o.__meta?.out ?? 0, stop: o.__meta?.stop ?? "?" });
  const line = (c) => `scenes ${c.scenes}/${c.total} · live screens ${c.live}/${c.liveTotal} · out tokens ${c.out} · stop_reason ${c.stop}`;
  const incomplete = (c) => c.scenes < c.total || (c.liveTotal > 0 && c.live < 0.7 * c.liveTotal) || c.stop === "max_tokens";
  let out = await callTool({ ledger, step: fixIssues ? "rebuild" : "build", content: content2, model: models.build, maxTokens: 32000, tool, system, cacheSystem: true, effort: brief.effort?.build || "low" });
  let cov = measure(out);
  log(`  build: ${line(cov)}`);
  if (incomplete(cov)) {
    const retry = await callTool({ ledger, step: "build-retry", content: content2 + `\n\nYour previous build covered only ${cov.scenes} of ${cov.total} scenes and ${cov.live} of ${cov.liveTotal} live screens. Build EVERY scene of the script, each live scene with its data-clone placeholder and K.focus/K.tap/K.typeInto moves.`, model: models.build, maxTokens: 32000, tool, system, cacheSystem: true, effort: "medium" });
    const cov2 = measure(retry);
    log(`  build retry (effort medium): ${line(cov2)}`);
    // keep the better build: complete beats incomplete, then more scenes + live screens
    const rank = (c) => (incomplete(c) ? 0 : 1000) + c.scenes + c.live;
    if (rank(cov2) >= rank(cov)) { out = retry; cov = cov2; }
  }
  fs.writeFileSync(path.join(runDir, "video.src.html"), out.html);
  const file = path.join(runDir, "video.html");
  const info = embedClones({ runDir, brandDir, layout: brief.layout });
  log(`✓ build: video.html (${(out.html.length / 1024).toFixed(1)} KB written, ${info.count} live screens embedded${info.missing.length ? `, missing: ${info.missing.join(", ")}` : ""}) · ${line(cov)}`);
  return file;
}

/** how much of the script a composition covers: scene containers, and live scenes that have a data-clone placeholder */
export function coverage(html, script, liveScenes) {
  const total = script.scenes.length;
  const tagged = new Set([...html.matchAll(/data-scene\s*=\s*["']?(\d+)/g)].map((m) => +m[1]));
  const byId = new Set([...html.matchAll(/\bid\s*=\s*["'](?:s|scene-?)(\d+)["']/g)].map((m) => +m[1]));
  const base = (id) => String(id).replace(/-(flow|before|phone|mobile)$/, "");
  const clones = new Set([...html.matchAll(/data-clone\s*=\s*["']([^"']+)["']/g)].map((m) => base(m[1])));
  return { scenes: Math.min(total, (tagged.size ? tagged : byId).size), total, live: liveScenes.filter((ids) => ids.some((id) => clones.has(base(id)))).length, liveTotal: liveScenes.length };
}

/** video.src.html → video.html: paste the captured live UI into every data-clone placeholder. */
export function embedClones({ runDir, brandDir, layout }) {
  const [W, H] = LAYOUTS[layout] || LAYOUTS["9:16"];
  const B = path.relative(runDir, brandDir).split(path.sep).join("/");
  let html = fs.readFileSync(path.join(runDir, "video.src.html"), "utf8");
  const meta = {}, missing = []; let count = 0;
  const attr = (tag, n) => tag.match(new RegExp(`\\s${n}\\s*=\\s*"([^"]*)"`))?.[1];
  html = html.replace(/<([a-z]+)(\s[^>]*?\sdata-clone\s*=\s*"([^"]+)"[^>]*?)(\/?)>/gi, (whole, tag, attrs, id, selfClose) => {
    // tolerate asset ids for clone ids (flows/phones)
    const cid = [id, id.replace(/-phone$/, "-mobile"), id.replace(/-flow$/, "")].find((x) => fs.existsSync(path.join(brandDir, "clones", `${x}.json`)));
    if (!cid) { missing.push(id); return whole; }
    const c = JSON.parse(fs.readFileSync(path.join(brandDir, "clones", `${cid}.json`), "utf8"));
    // desktop screens are shown on a laptop: 16:10 screen + bezel + silver base, drawn here so every video gets the same device
    const laptop = (attr(whole, "data-frame") || (c.w >= 1000 && !/-p\d+$/.test(cid) ? "laptop" : "none")) === "laptop";
    const w = Math.round(+attr(whole, "data-w") || (laptop ? Math.min(W - 160, 920) : W * 0.88)), s = w / c.w;
    const h = Math.round(laptop ? w * 10 / 16 : +attr(whole, "data-h") || Math.min(c.h * s, H * 0.72));
    if (!meta[cid]) { const keys = {}, parts = {}, info = {}; for (const k of c.keys) { keys[k.k] = k.box; info[k.k] = [k.role, k.acted || "", k.text || ""]; if (k.part != null) parts[k.part] = k.box; } meta[cid] = { w: c.w, h: c.h, keys, parts, info }; }
    let open = whole.replace(/\/>$/, ">").replace(`data-clone="${id}"`, `data-clone="${cid}" data-scale="${s.toFixed(5)}" data-vw="${w}" data-vh="${h}"`);
    const style = attr(open, "style");
    const force = `width:${w}px;height:${h}px;overflow:${laptop ? "visible" : "hidden"};${laptop ? "border:0;box-shadow:none;background:transparent;border-radius:0;" : ""}`;
    open = style != null ? open.replace(/\sstyle\s*=\s*"([^"]*)"/, (_, st) => ` style="${st.replace(/;?\s*$/, ";")}${force}"`) : open.replace(/>$/, ` style="${force}">`);
    count++;
    const body = c.html.replaceAll("{{B}}", B);
    const cam = `<div class="ui-cam" style="position:absolute;left:0;top:0;width:${c.w * s}px;height:${c.h * s}px;transform-origin:0 0"><div class="ui-clone" dir="${c.dir || "ltr"}" style="position:absolute;left:0;top:0;width:${c.w}px;height:${c.h}px;transform:scale(${s.toFixed(5)});transform-origin:0 0;text-align:start">${body}</div></div>`;
    const bez = Math.round(w * 0.022), baseW = w + bez * 2 + Math.round(w * 0.12), baseH = Math.round(w * 0.032);
    const inner = !laptop ? cam
      : `<div class="ui-lid" style="position:absolute;left:${-bez}px;top:${-bez - 4}px;width:${w + bez * 2}px;height:${h + bez * 2 + 4}px;border-radius:${Math.round(bez * 1.4)}px ${Math.round(bez * 1.4)}px 6px 6px;background:linear-gradient(#1b1d22,#0c0d10);box-shadow:0 0 0 2px #8e939d,0 0 0 4px #3b3f47,0 60px 140px rgba(0,0,0,.6)"><div style="position:absolute;left:50%;top:${Math.round(bez * 0.35)}px;width:${Math.round(bez * 0.4)}px;height:${Math.round(bez * 0.4)}px;margin-left:${-Math.round(bez * 0.2)}px;border-radius:50%;background:#2c3038;box-shadow:inset 0 0 0 1px #444"></div></div>`
      + `<div class="ui-screen" style="position:absolute;left:0;top:0;width:${w}px;height:${h}px;overflow:hidden;border-radius:3px;background:#000">${cam}</div>`
      + `<div class="ui-base" style="position:absolute;left:${Math.round((w - baseW) / 2)}px;top:${h + bez}px;width:${baseW}px;height:${baseH}px;border-radius:2px 2px ${baseH}px ${baseH}px / 2px 2px ${Math.round(baseH * 0.9)}px ${Math.round(baseH * 0.9)}px;background:linear-gradient(#e9ebef 0%,#c3c7cf 45%,#8d929c 100%);box-shadow:0 18px 40px rgba(0,0,0,.5)"><div style="position:absolute;left:50%;top:0;width:${Math.round(w * 0.16)}px;height:${Math.round(baseH * 0.38)}px;margin-left:${-Math.round(w * 0.08)}px;border-radius:0 0 10px 10px;background:linear-gradient(#a7acb5,#c9cdd4)"></div></div>`;
    return `${open}${inner}${selfClose ? `</${tag}>` : ""}`;
  });
  const head = `<link rel="stylesheet" href="${B}/clones/fonts.css"><style>[data-clone]{position:relative}.ui-clone,.ui-clone *{animation:none!important;transition:none!important}.ui-clone img{max-width:none}</style><script>window.__clones=${JSON.stringify(meta)}</script>`;
  html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + head) : head + html;
  fs.writeFileSync(path.join(runDir, "video.html"), html);
  return { count, missing };
}
