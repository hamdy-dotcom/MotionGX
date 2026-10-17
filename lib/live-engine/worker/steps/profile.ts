/* eslint-disable */
// @ts-nocheck — verbatim port of video-sandbox/steps/profile.mjs; the only edits are listed in scripts/live-engine/port-sandbox.py.
// STEP 4 — brand profile.
// Merge every page probe into hard facts (colours by painted area, fonts, CSS vars, logo, images),
// then one model call turns facts + a few screenshots into brand.json and sorts the library.
import fs from "node:fs";
import path from "node:path";
import { callTool, imageBlock } from "../claude";

const rgbToHex = (v) => {
  const m = String(v).match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/);
  if (!m) return null; if (m[4] !== undefined && +m[4] < 0.5) return null;
  return "#" + [m[1], m[2], m[3]].map((x) => Math.round(+x).toString(16).padStart(2, "0")).join("");
};
const merge = (lists) => { const o = {}; for (const l of lists) for (const { value, weight } of l) { const k = value.startsWith("GRADIENT") ? value : rgbToHex(value); if (k) o[k] = (o[k] || 0) + weight; } return Object.entries(o).sort((a, b) => b[1] - a[1]).map(([value, weight]) => ({ value, weight })); };

export async function buildProfile({ brief, brandDir, capture, ledger, models, log = console.log }) {
  log("▶ profile: merging captured pages");
  const all = [...capture.pages, ...capture.app.screens];
  const probes = all.map((p) => ({ ...p, data: JSON.parse(fs.readFileSync(path.join(brandDir, p.probe))) }));
  const facts = {
    site: brief.url, title: probes[0]?.data.title, description: probes[0]?.data.description, lang: probes[0]?.data.lang, dir: probes[0]?.data.dir,
    backgrounds: merge(probes.map((p) => p.data.colors.backgrounds)).slice(0, 12),
    text: merge(probes.map((p) => p.data.colors.text)).slice(0, 8),
    buttons: merge(probes.map((p) => p.data.colors.buttons)).slice(0, 8),
    fonts: [...new Set(probes.flatMap((p) => p.data.fonts.map((f) => f.value)))].slice(0, 8),
    cssVars: Object.fromEntries(Object.entries(Object.assign({}, ...probes.map((p) => p.data.cssVars))).filter(([, v]) => /#|rgb|hsl/.test(v)).slice(0, 40)),
    fontFiles: fs.readdirSync(path.join(brandDir, "assets/fonts")),
    logoCandidates: capture.logoCandidates.map((l, i) => ({ i, file: l.file, w: l.w, h: l.h, icon: !!l.icon })),
  };
  // image library: every <img> we saw on a page, mapped to the downloaded file
  const imgs = new Map();
  for (const p of probes) for (const im of p.data.images || []) { const file = capture.assets[im.src]; if (file && !imgs.has(file)) imgs.set(file, { file, alt: im.alt, w: im.w, h: im.h, page: p.id }); }
  const images = [...imgs.values()].slice(0, 60).map((x, i) => ({ i, ...x }));
  const screens = probes.map((p, i) => ({ i, id: p.id, label: p.label, app: !!p.app, customer_view: !!p.customer, essentials: p.covers || [], description: p.description || "", features: p.features || [], url: p.url, headings: (p.data.headings || []).slice(0, 10) }));
  // public pages carry the marketing copy (feature lists, pricing, FAQ) — give it generously
  const copy = [...probes.filter((p) => !p.app).map((p) => `## PUBLIC PAGE ${p.label}\n${p.data.text.slice(0, 6000)}`), ...probes.filter((p) => p.app).map((p) => `## APP SCREEN ${p.label}\n${p.data.text.slice(0, 700)}`)].join("\n\n");
  const EMPTY = /no data|nothing yet|empty|لا توجد|لا يوجد|لا بيانات|ابدأ بإضافة|no results/i;
  const brief1 = (o = {}) => [o.title && `title "${o.title}"`, o.stats && `stats ${o.stats.map((x) => `${x.label}: ${x.value}`).join(" | ").slice(0, 160)}`, o.buttons && `buttons ${o.buttons.map((b) => b.text).join(", ")}`, o.fields && `fields ${o.fields.map((f) => f.label || f.placeholder).join(", ")}`, o.table && `table ${o.table.length} rows`, o.list && `list: ${o.list.slice(0, 4).join(" / ")}`, o.chips && `chips ${o.chips.map((c) => c.text).join(", ")}`, o.images && `${o.images.length} images`, o.chart && "chart"].filter(Boolean).join("; ");
  const parts = all.flatMap((p) => (p.parts || []).map((x) => ({ id: x.id, screen: p.id, app: !!p.app, kind: x.kind, heading: x.heading, contents: brief1(x.object), w: x.w, h: x.h, file: x.file, clone: x.clone || null, object: x.object, emptyish: EMPTY.test(x.text) || (x.text.length < 12 && !x.object?.images) })));

  // up to 6 screenshots (viewport JPEGs) so the model can see the look
  const pick = [...capture.pages.slice(0, 3), ...capture.app.screens.slice(0, 3)];
  const content = [];
  for (const p of pick) { content.push({ type: "text", text: `Screen "${p.label}" (${p.id})` }); content.push(imageBlock(fs.readFileSync(path.join(brandDir, p.view)))); }
  content.push({ type: "text", text: `FACTS (measured in the browser; colours are weighted by painted area):\n${JSON.stringify(facts)}\n\nIMAGES:\n${JSON.stringify(images)}\n\nSCREENS (with the features the capture agent saw on each):\n${JSON.stringify(screens)}\n\nUI OBJECTS (each one block of a screen, read from the live page: its title, numbers, buttons, fields, rows):\n${JSON.stringify(parts.map(({ file, object, emptyish, clone, ...x }) => x))}\n\nSITE COPY:\n${copy}` });

  const tool = {
    name: "brand_profile", description: "The brand profile used by every later step",
    input_schema: {
      type: "object", required: ["name", "tagline", "summary", "audience", "language", "voice", "palette", "fonts", "logo", "selling_points", "features", "screens", "parts", "images", "look"],
      properties: {
        name: { type: "string" }, name_ar: { type: "string" }, tagline: { type: "string" }, summary: { type: "string", description: "2-3 sentences: what the company sells and to whom" },
        audience: { type: "string" }, language: { type: "string", description: "main site language + direction, e.g. 'Arabic (rtl)'" },
        voice: { type: "string", description: "tone of voice in 1-2 sentences, with 3 example phrases from the site" },
        palette: { type: "object", required: ["background", "surface", "ink", "muted", "primary", "accent"], description: "hex colours chosen from FACTS only",
          properties: { background: { type: "string" }, surface: { type: "string" }, ink: { type: "string" }, muted: { type: "string" }, primary: { type: "string" }, accent: { type: "string" }, gradient: { type: "string", description: "CSS gradient if the brand uses one, else empty" }, theme: { type: "string", enum: ["light", "dark"] } } },
        fonts: { type: "object", required: ["display", "body"], properties: { display: { type: "string" }, body: { type: "string" }, google_fonts: { type: "array", items: { type: "string" }, description: "Google Fonts family names that match or closely substitute" } } },
        logo: { type: "object", required: ["index", "reason"], properties: { index: { type: "integer", description: "index in logoCandidates, -1 if none fits" }, on_dark: { type: "boolean" }, reason: { type: "string" } } },
        selling_points: { type: "array", items: { type: "string" }, description: "5-8 concrete claims from the copy" },
        features: { type: "array", description: "the COMPLETE feature inventory — every capability in the site copy and every feature seen in the app (aim for 12-30). Each with the UI parts/screens that prove it.", items: { type: "object", required: ["name", "detail", "benefit", "evidence"], properties: { name: { type: "string", description: "short, in the site's language" }, detail: { type: "string", description: "what it does, concretely" }, benefit: { type: "string", description: "why a customer cares" }, evidence: { type: "array", items: { type: "string" }, description: "ids of UI OBJECTS (best) or SCREENS that show this feature; empty if only described in copy" }, group: { type: "string", description: "e.g. store, products, orders, ads, research, payments, analytics, settings" } } } },
        screens: { type: "array", description: "one entry per screen", items: { type: "object", required: ["index", "shows", "use"], properties: { index: { type: "integer" }, shows: { type: "string" }, use: { type: "string", enum: ["hero", "feature", "proof", "ui-detail", "skip"] } } } },
        parts: { type: "array", description: "one entry per UI object worth rebuilding in a video (skip empty states, nav bars, footers, duplicates)", items: { type: "object", required: ["id", "shows"], properties: { id: { type: "string" }, shows: { type: "string", description: "what a viewer sees in this image, concretely" }, feature: { type: "string", description: "feature name it proves" } } } },
        images: { type: "array", items: { type: "object", required: ["index", "kind"], properties: { index: { type: "integer" }, kind: { type: "string", enum: ["product", "lifestyle", "illustration", "icon", "partner-logo", "background", "people", "junk"] }, note: { type: "string" } } } },
        look: { type: "string", description: "how the brand looks: shapes, radius, imagery style, density — what a motion designer must keep" },
      },
    },
  };
  const out = await callTool({ ledger, step: "profile", model: models.profile, maxTokens: 12000, tool, content, effort: "low",
    system: "You are a brand strategist and designer building a brand profile from a captured website and product. The feature inventory must be exhaustive: list every capability the copy or the app shows, not a summary. Link features to the UI OBJECTS that prove them. Use only colours that appear in FACTS. Be concrete. Keep Arabic text in Arabic." });

  // sort the library on disk
  const lib = path.join(brandDir, "library");
  for (const d of ["logo", "screens", "product", "lifestyle", "illustration", "icon", "people", "background", "partner-logo"]) fs.mkdirSync(path.join(lib, d), { recursive: true });
  const KINDS = ["product", "lifestyle", "illustration", "icon", "partner-logo", "background", "people", "junk"];
  const cp = (src, dir, name) => { fs.mkdirSync(path.join(lib, dir), { recursive: true }); const dst = path.join(lib, dir, name); fs.copyFileSync(path.join(brandDir, src), dst); return `library/${dir}/${name}`; };
  const logo = out.logo.index >= 0 && facts.logoCandidates[out.logo.index] ? cp(facts.logoCandidates[out.logo.index].file, "logo", "logo" + path.extname(facts.logoCandidates[out.logo.index].file)) : null;
  const rated = new Map(out.screens.map((s) => [s.index, s]));
  const shotList = all.map((p, i) => ({ p, s: rated.get(i) || { shows: p.description || p.label, use: p.app ? "feature" : "hero" } })).filter(({ p, s }) => p.app || s.use !== "skip").map(({ p, s }) => ({ id: p.id, file: cp(p.screen, "screens", `${p.id}.full${path.extname(p.screen)}`), view: cp(p.view, "screens", `${p.id}.jpg`), label: p.label, app: !!p.app, shows: s.shows, use: s.use === "skip" ? "feature" : s.use, features: p.features || [], url: p.url, clones: p.clones || {}, customer: !!p.customer, covers: p.covers || [] }));
  const partInfo = new Map(parts.map((x) => [x.id, x]));
  const partList = out.parts.filter((x) => partInfo.has(x.id) && !partInfo.get(x.id).emptyish).map((x) => { const pi = partInfo.get(x.id); return { id: x.id, file: pi.file ? cp(pi.file, "parts", path.basename(pi.file)) : null, clone: pi.clone, screen: pi.screen, app: pi.app, kind: pi.kind, w: pi.w, h: pi.h, shows: x.shows, feature: x.feature || "", contents: pi.contents, object: { ...pi.object, images: (pi.object?.images || []).filter((im) => im.file).map((im) => ({ ...im, file: cp(im.file, "object-images", path.basename(im.file)) })) } }; });
  const imageList = out.images.map((m) => ({ ...m, kind: KINDS.includes(m.kind) ? m.kind : "background" })).filter((m) => m.kind !== "junk" && images[m.index]).map((m) => { const im = images[m.index]; return { file: cp(im.file, m.kind, path.basename(im.file)), kind: m.kind, w: im.w, h: im.h, alt: im.alt, note: m.note || "" }; });

  const brand = {
    name: out.name, name_ar: out.name_ar, site: brief.url, tagline: out.tagline, summary: out.summary, audience: out.audience, language: out.language, voice: out.voice,
    palette: out.palette, fonts: { ...out.fonts, files: facts.fontFiles.map((f) => `assets/fonts/${f}`) }, logo: logo ? { file: logo, on_dark: out.logo.on_dark } : null,
    selling_points: out.selling_points, features: out.features, look: out.look, screens: shotList, parts: partList, images: imageList,
    app_access: capture.app.status, measured: { backgrounds: facts.backgrounds.slice(0, 6), buttons: facts.buttons.slice(0, 4), text: facts.text.slice(0, 4) },
  };
  fs.writeFileSync(path.join(brandDir, "brand.json"), JSON.stringify(brand, null, 2));
  log(`✓ profile: ${brand.name} · ${brand.features.length} features · ${partList.length} UI parts · ${shotList.length} screens · ${imageList.length} images · logo ${logo ? "yes" : "no"}`);
  brand.features.forEach((f) => log(`   · ${f.name} — ${f.evidence?.length ? f.evidence.join(", ") : "copy only"}`));
  return brand;
}
