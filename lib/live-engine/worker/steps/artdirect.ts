/* eslint-disable */
// @ts-nocheck — verbatim port of video-sandbox/steps/artdirect.mjs; the only edits are listed in scripts/live-engine/port-sandbox.py.
// STEP 5a — art direction. One look per video, taken from the brand's OWN site (screenshots of its home hero and two
// sections), never a default and never a repeat of the workspace's recent videos. One Sonnet call at low effort.
// Output: a style spec compose() renders — background treatment, typography, shape language, a layout per scene,
// transition family, tempo, the motion recipe per scene, hook and CTA style, and the scene order.
import fs from "node:fs";
import path from "node:path";
import { callTool, imageBlock } from "../claude";
import { BACKGROUNDS, CTAS, FREE_RECIPES, HIGHLIGHTS, HOOKS, LAYOUT_LIB, TEMPOS, TRANSITIONS, photosOf, recipeFor } from "./compose";

const LAYOUT_NOTES = {
  photo: "full-bleed brand photo with a slow push, text on a scrim (no product screen)",
  split: "half visual / half text (device or photo)",
  card: "the headline sits in a card; a device or nothing under it",
  stack: "the device level and still, with straight benefit cards offset over it",
  device: "the device centred, benefit callouts floating around it",
  bigtype: "big type only (optionally a counting number or pain cards)",
  tiles: "a 2×2 grid of the product's real UI blocks or benefit tiles",
  ticker: "the headline over moving rows of features",
};

/** the site as the visitor sees it: the home page's first screen + its two largest sections (falls back to other public pages) */
function siteShots(brand, brandDir) {
  const pub = (brand.screens || []).filter((s) => !s.app);
  const files = [pub[0]?.view, ...(brand.parts || []).filter((p) => !p.app && p.file).sort((a, b) => (b.w || 0) * (b.h || 0) - (a.w || 0) * (a.h || 0)).map((p) => p.file), ...pub.slice(1).map((s) => s.view)];
  return [...new Set(files.filter(Boolean))].filter((f) => fs.existsSync(path.join(brandDir, f))).slice(0, 4);
}

export async function artDirect({ brief, brand, script, assets, brandDir, ledger, models, history = [], avoid = [], log = console.log }) {
  const byId = Object.fromEntries(assets.map((a) => [a.id, a]));
  const shots = siteShots(brand, brandDir);
  const photos = photosOf(brand, brandDir).map(({ file, ...p }) => p);
  const scenes = script.scenes.map((sc, i) => {
    const r = recipeFor(sc, byId, brandDir, brand);
    const live = ["tour", "replay", "phone", "hero"].includes(r.recipe);
    return { n: i + 1, purpose: sc.purpose, bars: sc.bars, headline: sc.headline, sub: sc.sub || "", visual: sc.visual?.type, live_product_screen: live ? r.recipe : null };
  });
  const tool = { name: "art_direction", description: "The look of this one video", input_schema: { type: "object", required: ["style_notes", "background", "typography", "shapes", "transition", "tempo", "hook", "cta", "order", "scenes"], properties: {
    style_notes: { type: "string", description: "2-3 sentences: what in the site screenshots drives these choices (photo-heavy? flat? gradients? glass? sharp or round corners? type scale?)" },
    background: { type: "string", enum: BACKGROUNDS },
    typography: { type: "object", required: ["size", "weight", "align", "highlight"], properties: { size: { type: "string", enum: ["xl", "l", "m"] }, weight: { type: "integer", enum: [500, 700, 800, 900] }, align: { type: "string", enum: ["center", "start"] }, highlight: { type: "string", enum: HIGHLIGHTS } } },
    shapes: { type: "object", required: ["radius", "border", "glass", "shadow"], properties: { radius: { type: "integer", description: "corner radius in px, 0-48, as on the site" }, border: { type: "boolean" }, glass: { type: "boolean" }, shadow: { type: "string", enum: ["none", "soft", "hard"] } } },
    transition: { type: "string", enum: TRANSITIONS },
    tempo: { type: "string", enum: Object.keys(TEMPOS) },
    hook: { type: "string", enum: HOOKS },
    cta: { type: "string", enum: CTAS },
    order: { type: "array", items: { type: "integer" }, description: "the play order of the scene numbers (a permutation of all of them); the CTA scene stays last" },
    scenes: { type: "array", items: { type: "object", required: ["n", "layout", "recipe"], properties: { n: { type: "integer" }, layout: { type: "string", enum: LAYOUT_LIB }, recipe: { type: "string", enum: [...FREE_RECIPES, "device"], description: "\"device\" for scenes with a live product screen (its mechanics follow the screen); else type / pains / count / logo" }, image: { type: "string", description: "photo / split layouts: a photo id from PHOTOS" } } } },
  } } };
  const recent = history.slice(0, 5);
  const text = [
    `BRIEF: ${JSON.stringify({ objective: brief.objective, country: brief.country, layout: brief.layout, length: brief.length, description: brief.description || "" })}`,
    `BRAND: ${JSON.stringify({ name: brand.name, palette: brand.palette, fonts: { display: brand.fonts?.display, body: brand.fonts?.body }, look: brand.look, language: brand.language })}`,
    `SCRIPT SCENES (live_product_screen = the scene shows a real product screen and needs a layout that holds a device: ${["device", "split", "stack", "card"].join(", ")}):\n${JSON.stringify(scenes)}`,
    `PHOTOS (the brand's own captured images): ${photos.length ? JSON.stringify(photos) : "none — do not use photo / split-photo / photo-led"}`,
    `LAYOUTS: ${JSON.stringify(LAYOUT_NOTES)}`,
    `RECENT VIDEOS IN THIS WORKSPACE (fingerprints): ${recent.length ? JSON.stringify(recent) : "none"}${recent.length ? "\nThis video must differ from EACH of them in at least 3 of these 5 fields: the layout sequence, transition, background, hook, cta." : ""}`,
    avoid.length ? `YOUR PREVIOUS ANSWER WAS TOO CLOSE TO: ${JSON.stringify(avoid)} — change more of the 5 fields.` : "",
  ].filter(Boolean).join("\n\n");
  const content = [...shots.flatMap((f, i) => [{ type: "text", text: i === 0 ? "THE BRAND'S SITE — home page, first screen:" : "THE BRAND'S SITE — a section:" }, imageBlock(fs.readFileSync(path.join(brandDir, f)), /\.png$/i.test(f) ? "image/png" : "image/jpeg")]), { type: "text", text }];
  const out = await callTool({ ledger, step: "art", model: models.art || models.script, maxTokens: 2500, effort: "low", tool, content,
    system: "You are the art director of a short ad for this brand. The look must come from the brand's OWN site in the screenshots — its photography, background treatment, type scale and weight, corner radius, borders, glass, shadows — never a generic default. Pick a layout per scene from the library so the video has a real visual rhythm (vary layouts; no single layout on most scenes). Scenes with a live product screen use a layout that holds a device. You may reorder scenes for a stronger story, but the CTA scene stays last. Make this video clearly different from the recent ones." });
  log(`  🎨 art direction: ${out.background} · ${out.transition} · hook ${out.hook} · cta ${out.cta} · ${(out.scenes || []).map((s) => s.layout).join(" ")} — ${String(out.style_notes || "").slice(0, 140)}`);
  return { ...out, shots };
}
