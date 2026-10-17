/* eslint-disable */
// @ts-nocheck — verbatim port of video-sandbox/steps/script.mjs; the only edits are listed in scripts/live-engine/port-sandbox.py.
// STEP 5a — script. Brief + brand profile → a timed scene list on a 120 BPM bar grid (1 bar = 2 s).
import fs from "node:fs";
import path from "node:path";
import { callTool } from "../claude";

export const OBJECTIVES = {
  acquire: "Acquire new customers / sign-ups",
  launch: "Launch a new product or feature",
  offer: "Promote an offer or discount",
  explain: "Explain how the product works",
  awareness: "Brand awareness / brand story",
  retarget: "Win back people who visited but did not buy",
  recruit: "Recruit partners, sellers or affiliates",
  announce: "Company announcement",
};
export const COUNTRIES = { EG: "Egypt — Egyptian Arabic", SA: "Saudi Arabia — Saudi (Najdi/Hijazi) Arabic", AE: "UAE — Gulf Arabic", KW: "Kuwait — Gulf Arabic", MA: "Morocco — Darija", JO: "Jordan — Levantine Arabic", SY: "Syria — Levantine Arabic", IQ: "Iraq — Iraqi Arabic", US: "United States — English" };
export const LAYOUTS = { "9:16": [1080, 1920], "1:1": [1080, 1080], "16:9": [1920, 1080], "4:5": [1080, 1350] };

/**
 * Readability, enforced after the model: a scene lasts at least max(3 s, 0.5 s per on-screen word + 2 s with UI); the hook and
 * any scene with UI at least 4 s; an input → result flow at least 6 s (typing, tap, loading, result) — rounded up to the 2 s bar
 * grid. When that no longer fits the length, scenes are CUT (least important first), never shortened; spare time goes to the
 * scenes with UI. Start times and music drops follow.
 */
export function enforceTiming(script, assets, length, log = () => {}) {
  const byId = Object.fromEntries(assets.map((a) => [a.id, a]));
  const kinds = (sc) => (sc.visual?.assets || []).map((id) => byId[id]?.kind || "");
  const ui = (sc) => kinds(sc).some((k) => /^(live-|object-|app-screen|site-page)/.test(k));
  const flow = (sc) => (sc.visual?.assets || []).some((id) => byId[id]?.kind === "live-flow" && byId[id]?.input_result);
  const words = (sc) => `${sc.headline || ""} ${sc.sub || ""}`.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  const minBars = (sc, i) => Math.ceil(Math.max(3, 0.5 * words(sc) + (ui(sc) ? 2 : 0), i === 0 || ui(sc) ? 4 : 0, flow(sc) ? 6 : 0) / 2);
  const drops = new Set(script.music?.drops || []);
  let scenes = script.scenes.map((sc, i) => ({ sc, i, bars: Math.max(sc.bars || 1, minBars(sc, i)), drop: drops.has(sc.start) }));
  const total = () => scenes.reduce((a, x) => a + x.bars * 2, 0), before = script.scenes.length, cut = [];
  // too long: cut the least important scene (never the hook or the CTA / offer; UI and flows last)
  const rank = (x, i) => (i === 0 || i === scenes.length - 1 ? 1000 : ["cta", "offer"].includes(x.sc.purpose) ? 900 : flow(x.sc) ? 600 : ui(x.sc) ? 400 + (x.sc.purpose === "how-it-works" ? 50 : 0) : x.sc.purpose === "problem" ? 150 : 200) - i * 0.01;
  // too long: first take back bars the model gave above a scene's readable minimum (the most padded first), then cut
  for (let x; total() > length && (x = scenes.map((y, i) => ({ y, ex: y.bars - minBars(y.sc, i) })).filter((z) => z.ex > 0).sort((p, q) => q.ex - p.ex)[0]);) x.y.bars--;
  while (total() > length && scenes.length > 2) { let k = 1; scenes.forEach((x, i) => { if (rank(x, i) < rank(scenes[k], k)) k = i; }); cut.push(scenes[k].sc.headline); scenes.splice(k, 1); }
  // too short: the spare bars go to the scenes with UI (shortest first), then to the rest
  while (total() < length) { const pool = scenes.map((x, i) => ({ x, i })).filter(({ x }) => ui(x.sc)); const pick = (pool.length ? pool : scenes.map((x, i) => ({ x, i }))).sort((a, b) => a.x.bars - b.x.bars)[0]; pick.x.bars++; }
  let t = 0; const newDrops = [], kept = scenes.map((x) => x.i);
  scenes = scenes.map(({ sc, bars, drop }) => { const s = { ...sc, start: t, bars }; if (drop && t > 0) newDrops.push(t); t += bars * 2; return s; });
  script.scenes.splice(0, script.scenes.length, ...scenes);
  if (script.music) script.music.drops = newDrops;
  log(`  ⏱ readable timing: ${scenes.length}/${before} scenes${cut.length ? ` (cut: ${cut.map((h) => `«${h}»`).join(", ")})` : ""}`);
  return kept;
}

export async function writeScript({ brief, brand, runDir, ledger, models, log = console.log }) {
  log("▶ script");
  const bars = Math.round(brief.length / 2);
  const live = [];
  // an empty screen (no data, zero metrics, empty tables) is never proof: drop it when a version with data exists, else mark it
  const key = (s) => String(s.url || s.label || "").replace(/[?#].*$/, "").toLowerCase();
  const filled = new Set(brand.screens.filter((s) => !s.empty).map(key));
  for (const s of brand.screens) {
    if (s.empty && filled.has(key(s))) continue;
    const c = s.clones || {}, from = s.app ? "app" : "website", empty = s.empty ? { empty: true } : {};
    if (c.screen) live.push({ id: s.id, kind: "live-screen", from, shows: s.shows, features: (s.features || []).slice(0, 5), ...empty, ...(s.customer ? { customer_view: true, essentials: s.covers } : {}) });
    // a flow whose before half has a typed value is a real input → result (the value, the button, the result)
    if (c.before) live.push({ id: `${s.id}-flow`, kind: "live-flow", from, shows: `${c.before.action} → ${s.shows}`, features: (s.features || []).slice(0, 3), ...(c.before.typed ? { input_result: true, typed: c.before.typed } : {}), ...empty });
    if (c.mobile) live.push({ id: `${s.id}-phone`, kind: "live-phone", from, shows: `${s.shows} — as it looks on a phone` });
  }
  const assets = [
    ...(brand.logo ? [{ id: "logo", kind: "logo", file: brand.logo.file }] : []),
    ...live,
    ...(brand.parts || []).map((x) => ({ id: x.id, kind: x.clone ? `live-block-${x.kind}` : `object-${x.kind}`, from: x.app ? "app" : "website", shows: x.shows, feature: x.feature, contents: x.contents })),
    ...brand.screens.filter((s) => !s.clones?.screen).map((s) => ({ id: s.id, kind: s.app ? "app-screen-full" : "site-page-full", shows: s.shows })),
    ...brand.images.filter((i) => ["product", "lifestyle", "people", "illustration"].includes(i.kind)).slice(0, 20).map((i, k) => ({ id: `img${k}`, kind: i.kind, file: i.file, note: i.note || i.alt, w: i.w, h: i.h })),
  ];
  fs.writeFileSync(path.join(runDir, "assets.json"), JSON.stringify(assets, null, 2));
  const tool = {
    name: "video_script", description: "The full video script",
    input_schema: {
      type: "object", required: ["idea", "language", "scenes", "music"],
      properties: {
        idea: { type: "string", description: "the one creative idea that makes this video specific to this brand and objective" },
        language: { type: "string" },
        music: { type: "object", required: ["mood", "drops"], properties: { mood: { type: "string", enum: ["driving", "uplifting", "tense-then-release", "chill"] }, drops: { type: "array", items: { type: "number" }, description: "seconds where the beat hits hardest (scene changes that matter most); multiples of 2" } } },
        scenes: {
          type: "array", items: {
            type: "object", required: ["start", "bars", "purpose", "headline", "visual", "motion"],
            properties: {
              start: { type: "number", description: "seconds, multiple of 2" }, bars: { type: "integer", description: "length in bars (1 bar = 2 s)" },
              purpose: { type: "string", enum: ["hook", "problem", "reveal", "feature", "proof", "how-it-works", "offer", "cta"] },
              headline: { type: "string", description: "on-screen text, max 8 words, in the target dialect" }, sub: { type: "string", description: "optional supporting line, max 14 words" },
              visual: { type: "object", required: ["type"], properties: { type: { type: "string", enum: ["screen", "image", "logo", "type-only", "list", "stat", "device"] }, assets: { type: "array", items: { type: "string" }, description: "asset ids" }, detail: { type: "string", description: "which elements of the object to show and animate (e.g. 'type the link into the field, press the generate button, stat counts up')" } } },
              motion: { type: "string", description: "the camera and element motion, beat-aware (e.g. 'screen slides up on the downbeat, button pulses on beats 3-4')" },
            },
          },
        },
      },
    },
  };
  const features = (brand.features || []).map((f) => ({ name: f.name, detail: f.detail, benefit: f.benefit, group: f.group, evidence: f.evidence }));
  const content = `BRIEF
Objective: ${OBJECTIVES[brief.objective] || brief.objective}
What the user needs: ${brief.description || "(none)"}
Country / dialect: ${COUNTRIES[brief.country] || brief.country}
Layout: ${brief.layout}, length ${brief.length}s = ${bars} bars at 120 BPM.
${brief.offer ? "Offer / CTA: " + brief.offer : ""}

BRAND
${JSON.stringify({ name: brand.name, name_ar: brand.name_ar, tagline: brand.tagline, summary: brand.summary, audience: brand.audience, voice: brand.voice, selling_points: brand.selling_points, look: brand.look, site: brand.site })}

FEATURE INVENTORY (evidence = asset ids that visibly show the feature)
${JSON.stringify(features)}

ASSETS YOU MAY USE (by id)
${JSON.stringify(assets)}`;
  const script = await callTool({ ledger, step: "script", model: models.script, maxTokens: 8000, tool, content, effort: brief.effort?.script || "low",
    system: `You write short motion-graphics ad scripts for Arabic-speaking markets.
Rules: never use an asset marked "empty" (no data, zero metrics, empty tables) as proof or as a feature's main visual — use another screen, or the live-flow that creates that data. A scene may promise typing / pasting / entering / searching something ONLY when its asset is a live-flow with input_result (it plays the real value typed into the real field and the real result); otherwise describe what the screen shows. Scenes cover 0..${brief.length}s with no gaps; every start and length sits on the 2-second bar grid; the first scene is a hook (2 bars); READABILITY: every scene stays on screen long enough to read — about 0.5 s per word of on-screen text, plus 2 s when a UI is shown, never under 3 s; the hook and any scene showing UI at least 2 bars (4 s); a live-flow that types an input at least 3 bars — fewer, readable scenes beat many short ones; the last is a CTA with the website. Cover the product's breadth: pick the features that serve the objective and show as many distinct ones as the length allows (one feature per scene, each long enough to read), grouping small ones into fast montage scenes. SHOW THE REAL PRODUCT, AS IT WAS USED: live-* assets are the product's real screens copied out of the browser during the test drive (real DOM, real styles) — the video should feel cut out of the product's source code. live-screen = a whole real screen (camera starts on it, then zooms into the block that matters); live-flow = a recorded action (the screen before, the exact value typed / button pressed, then the result screen) — replay it: type, tap, result appears; live-phone = a customer-facing page (store, landing page, theme) on a phone, scrolling; live-block-* = one real block of a screen, shown big. The ESSENTIALS come first: assets with customer_view:true are what the product actually produces, as the end customer sees it (e.g. the live store with products, a product page, the generated landing page, checkout) — they are the strongest proof, so the video MUST show them (at least 2 scenes when they exist), ideally right after the flow that creates them (flow → the real result). Prefer live-flow for "how it works" moments and live-screen/live-block for proof. In visual.detail name what the camera zooms to, what gets typed, what gets tapped. Every feature scene must show an asset from that feature's evidence list or a live asset whose 'shows'/'features' clearly match the headline (object-* assets are fallbacks rebuilt as components; *-full screenshots only for a quick scrolling device shot). Never show a website page for an in-app feature, and never an asset whose 'shows' does not match the headline. Never invent numbers, prices or features that are not in BRAND / FEATURE INVENTORY. Write headlines in the dialect of the target country, natural and punchy, not formal MSA. One idea per scene.` });
  // normalise timing to the grid: shrink the longest middle scenes until everything fits the length exactly
  const maxBars = Math.round(brief.length / 2);
  for (const sc of script.scenes) sc.bars = Math.max(1, Math.round(sc.bars || 1));
  while (script.scenes.length > maxBars) script.scenes.splice(-2, 1);
  let sum = () => script.scenes.reduce((a, sc) => a + sc.bars, 0);
  while (sum() > maxBars) { const mid = script.scenes.slice(0, -1).reduce((m, sc) => (sc.bars > m.bars ? sc : m)); if (mid.bars > 1) mid.bars--; else script.scenes.at(-1).bars = Math.max(1, script.scenes.at(-1).bars - 1); if (sum() > maxBars && script.scenes.every((sc) => sc.bars === 1)) script.scenes.splice(-2, 1); }
  if (sum() < maxBars) script.scenes.at(-1).bars += maxBars - sum();
  let t = 0; for (const sc of script.scenes) { sc.start = t; t += sc.bars * 2; }
  script.length = brief.length; script.bpm = 120;
  enforceTiming(script, assets, brief.length, log);
  fs.writeFileSync(path.join(runDir, "script.json"), JSON.stringify(script, null, 2));
  log(`✓ script: "${script.idea}" · ${script.scenes.length} scenes`);
  script.scenes.forEach((s) => log(`   ${String(s.start).padStart(2)}s ${s.purpose.padEnd(12)} ${s.headline}`));
  return script;
}
