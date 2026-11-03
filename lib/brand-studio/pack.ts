import "server-only";
// The brand pack: the logo as real vector files (the wordmark's letters outlined, Arabic shaped), PNGs, the documents
// an AI coding tool reads (DESIGN.md, BRAND.md, CLAUDE.md / AGENTS.md), tokens, and the guide for people.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { zip } from "@/lib/brand/zip";
import { shapeText } from "@/lib/motion/vector-text";
import { fillPage } from "./world";
import { onColor, paintIcon, type BrandLanguage, type Identity } from "./types";

type Colors = { P: string; A: string; I: string };
const enc = (s: string) => new TextEncoder().encode(s);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const svg = (w: number, h: number, inner: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`;
const n = (v: number) => +v.toFixed(2);

/** the name as outlines: no font needed wherever the logo goes */
async function wordmark(text: string, family: string, size: number) {
  const run = (await shapeText(family, 700, size, text)) ?? (await shapeText("Readex Pro", 700, size, text));
  if (!run) throw new Error(`the wordmark could not be drawn in ${family}`);
  return { w: run.w, h: run.h, paths: (fill: string) => `<g fill="${fill}">${run.glyphs.map((g) => `<path d="${g.d}"/>`).join("")}</g>` };
}

type Mark = Pick<Identity, "name" | "name_ar" | "palette" | "fonts" | "icon">;
async function logoFiles(id: Mark, language: BrandLanguage) {
  const P = id.palette, files: Record<string, string> = {};
  const light: Colors = { P: P.primary, A: P.accent, I: P.ink }, dark: Colors = { P: P.primary, A: P.accent, I: "#FFFFFF" };
  const black: Colors = { P: "#000000", A: "#000000", I: "#000000" }, white: Colors = { P: "#FFFFFF", A: "#FFFFFF", I: "#FFFFFF" };
  const icon = (c: Colors) => svg(100, 100, paintIcon(id.icon, c));
  files["icon-color.svg"] = icon(light); files["icon-on-dark.svg"] = icon(dark); files["icon-black.svg"] = icon(black); files["icon-white.svg"] = icon(white);
  const lockup = async (text: string, family: string, tag: string, rtl: boolean) => {
    const SIZE = 120, ICON = 160, GAP = 36, wm = await wordmark(text, family, SIZE), W = n(ICON + GAP + wm.w), H = Math.max(ICON, n(wm.h)), iconX = rtl ? n(wm.w + GAP) : 0, textX = rtl ? 0 : ICON + GAP;
    const draw = (c: Colors, ink: string) => svg(W, H, `<g transform="translate(${iconX} ${n((H - ICON) / 2)}) scale(${ICON / 100})">${paintIcon(id.icon, c)}</g><g transform="translate(${textX} ${n((H - wm.h) / 2)})">${wm.paths(ink)}</g>`);
    files[`logo${tag}-color.svg`] = draw(light, P.ink); files[`logo${tag}-on-dark.svg`] = draw(dark, "#FFFFFF"); files[`logo${tag}-black.svg`] = draw(black, "#000000"); files[`logo${tag}-white.svg`] = draw(white, "#FFFFFF");
  };
  if (language !== "ar" || !id.name_ar) await lockup(id.name, id.fonts.display, "", false);
  if (language !== "en" && id.name_ar) await lockup(id.name_ar, id.fonts.arabic_display, language === "ar" ? "" : "-ar", true);
  return { svgs: files, light, dark };
}

async function png(svgText: string, width: number, background?: string) {
  let img = sharp(Buffer.from(svgText), { density: 300 }).resize({ width, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
  if (background) img = img.flatten({ background });
  return new Uint8Array(await img.png().toBuffer());
}
/** the icon centred on a square of its own */
async function square(iconSvg: string, size: number, background: string | null, pad: number) {
  const inner = Math.round(size * (1 - pad * 2));
  const art = await sharp(Buffer.from(iconSvg), { density: 300 }).resize({ width: inner, height: inner, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return new Uint8Array(await sharp({ create: { width: size, height: size, channels: 4, background: background ?? { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: art, gravity: "center" }]).png().toBuffer());
}

const stacks = (id: Identity) => ({ display: `"${id.fonts.display}", "${id.fonts.arabic_display}", sans-serif`, body: `"${id.fonts.body}", "${id.fonts.arabic_body}", sans-serif` });
const googleCss = (id: Identity) => `https://fonts.googleapis.com/css2?${[...new Set([id.fonts.display, id.fonts.body, id.fonts.arabic_display, id.fonts.arabic_body])].filter(Boolean).map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;700`).join("&")}&display=swap`;
const SCALE = [["h1", 56, 700, 1.1], ["h2", 40, 700, 1.15], ["h3", 28, 600, 1.25], ["body-lg", 18, 400, 1.6], ["body", 16, 400, 1.6], ["caption", 13, 500, 1.4]] as const;

/** Google's open DESIGN.md format: tokens in the front matter, the reasons in prose */
function designMd(id: Identity) {
  const P = id.palette, on = onColor(P.primary, P.ink), r = id.radius, F = id.fonts;
  const type = SCALE.map(([k, s, w, l]) => `  ${k}:\n    fontFamily: "${k.startsWith("h") ? F.display : F.body}"\n    fontSize: ${s}px\n    fontWeight: ${w}\n    lineHeight: ${l}`).join("\n");
  return `---
version: alpha
name: ${JSON.stringify(id.name)}
description: ${JSON.stringify(id.summary)}
colors:
  primary: "${P.primary}"
  on-primary: "${on}"
  accent: "${P.accent}"
  background: "${P.background}"
  surface: "${P.surface}"
  ink: "${P.ink}"
  muted: "${P.muted}"
typography:
${type}
rounded:
  sm: ${Math.round(r / 2)}px
  md: ${r}px
  lg: ${r * 2}px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  2xl: 64px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: 12px 20px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 24px
---

# ${id.name} design system

## Overview
${id.summary}

${id.positioning}

The feeling: ${id.voice.traits.join(", ")}. The logo's idea: ${id.logo_idea}

## Colors
- **Primary (${P.primary}):** ${id.color_usage.primary}
- **Accent (${P.accent}):** ${id.color_usage.accent}
- **Background (${P.background}) and surface (${P.surface}):** ${id.color_usage.background}
- **Ink (${P.ink}) and muted (${P.muted}):** text. Text on primary is ${on}.

## Typography
Headlines in ${F.display}${F.arabic_display ? ` (Arabic: ${F.arabic_display})` : ""}; text in ${F.body}${F.arabic_body ? ` (Arabic: ${F.arabic_body})` : ""}. All are on Google Fonts.

## Layout
Use the spacing scale above and generous white space. Arabic layouts mirror right to left.

## Shapes
The base corner radius is ${r}px. Keep it consistent across buttons, inputs and cards.

## Imagery and motion
${id.imagery}

${id.motion}

## Do's and Don'ts
${id.dos.map((d) => `- Do: ${d}`).join("\n")}
${id.donts.map((d) => `- Don't: ${d}`).join("\n")}
`;
}

function brandMd(id: Identity) {
  return `# ${id.name}${id.name_ar ? ` / ${id.name_ar}` : ""}

${id.tagline}${id.tagline_ar ? `\n\n${id.tagline_ar}` : ""}

## What it is
${id.summary}

## Who it's for
${id.audience}

## Positioning
${id.positioning}

## Story
${id.story}

## Values
${id.values.map((v) => `- **${v.name}:** ${v.meaning}`).join("\n")}

## Voice
${id.voice.summary}

Traits: ${id.voice.traits.join(", ")}

Do:
${id.voice.do.map((d) => `- ${d}`).join("\n")}

Don't:
${id.voice.dont.map((d) => `- ${d}`).join("\n")}

Sounds like:
${id.voice.samples.map((s) => `- ${s.context}: "${s.line}"`).join("\n")}

## Messaging pillars
${id.pillars.map((p) => `- **${p.name}:** ${p.message}`).join("\n")}
`;
}

const agentRules = (id: Identity) => `# ${id.name}: brand rules

Everything you build or write for ${id.name} follows this brand.

- Before any UI work, read \`DESIGN.md\`, and use its tokens (\`theme.css\` or \`tokens.json\`) rather than inventing colours, fonts, radii or spacing.
- Before writing any copy, read \`BRAND.md\`, and write in its voice.
- Use the logo files in \`logo/\` as they are. Never redraw, recolour or stretch them.
`;

function tokensJson(id: Identity) {
  const P = id.palette, color = (v: string) => ({ $type: "color", $value: v });
  return JSON.stringify({
    color: { primary: color(P.primary), "on-primary": color(onColor(P.primary, P.ink)), accent: color(P.accent), background: color(P.background), surface: color(P.surface), ink: color(P.ink), muted: color(P.muted) },
    font: { display: { $type: "fontFamily", $value: [id.fonts.display, id.fonts.arabic_display, "sans-serif"].filter(Boolean) }, body: { $type: "fontFamily", $value: [id.fonts.body, id.fonts.arabic_body, "sans-serif"].filter(Boolean) } },
    radius: { sm: { $type: "dimension", $value: `${Math.round(id.radius / 2)}px` }, md: { $type: "dimension", $value: `${id.radius}px` }, lg: { $type: "dimension", $value: `${id.radius * 2}px` } },
  }, null, 2);
}
function themeCss(id: Identity) {
  const P = id.palette, S = stacks(id);
  return `/* ${id.name}: load the fonts: ${googleCss(id)} */
:root {
  --brand-primary: ${P.primary};
  --brand-on-primary: ${onColor(P.primary, P.ink)};
  --brand-accent: ${P.accent};
  --brand-background: ${P.background};
  --brand-surface: ${P.surface};
  --brand-ink: ${P.ink};
  --brand-muted: ${P.muted};
  --brand-font-display: ${S.display};
  --brand-font-body: ${S.body};
  --brand-radius: ${id.radius}px;
}
/* Tailwind v4: */
@theme {
  --color-primary: ${P.primary};
  --color-accent: ${P.accent};
  --color-surface: ${P.surface};
  --color-ink: ${P.ink};
  --color-muted: ${P.muted};
  --font-display: ${S.display};
  --font-body: ${S.body};
  --radius-brand: ${id.radius}px;
}
`;
}
const tailwindJs = (id: Identity) => { const P = id.palette, S = stacks(id); return `// Tailwind v3: merge into your config
module.exports = { theme: { extend: {
  colors: { primary: "${P.primary}", accent: "${P.accent}", surface: "${P.surface}", ink: "${P.ink}", muted: "${P.muted}" },
  fontFamily: { display: [${JSON.stringify(S.display)}], body: [${JSON.stringify(S.body)}] },
  borderRadius: { brand: "${id.radius}px" },
} } };
`; };

/** the same brand.json the video and post engines read */
function brandJson(id: Identity, language: BrandLanguage) {
  const P = id.palette;
  return JSON.stringify({ name: id.name, name_ar: id.name_ar || undefined, site: "", tagline: id.tagline, summary: id.summary, audience: id.audience, language: language === "en" ? "English (ltr)" : language === "ar" ? "Arabic (rtl)" : "Arabic and English", voice: id.voice.summary, palette: { background: P.background, surface: P.surface, ink: P.ink, muted: P.muted, primary: P.primary, accent: P.accent, theme: "light" }, fonts: { display: language === "ar" ? id.fonts.arabic_display : id.fonts.display, body: language === "ar" ? id.fonts.arabic_body : id.fonts.body, google_fonts: [...new Set(Object.values(id.fonts))].filter(Boolean), files: [] }, logo: { file: "library/logo/logo.png", on_dark: false }, selling_points: id.pillars.map((p) => p.message), features: id.features.map((name) => ({ name, detail: "", benefit: "", evidence: [] })), look: `${id.logo_idea} ${id.imagery}`, screens: [], parts: [], images: [], app_access: "none" }, null, 2);
}

function guideHtml(id: Identity, logoSvg: string, darkLogoSvg: string, iconSvgText: string, rtl: boolean, world: string) {
  const P = id.palette, S = stacks(id), on = onColor(P.primary, P.ink);
  const swatch = (name: string, hex: string, note = "") => `<div class="sw"><i style="background:${hex}"></i><b>${esc(name)}</b><span>${hex}</span>${note ? `<small>${esc(note)}</small>` : ""}</div>`;
  const list = (xs: string[]) => `<ul>${xs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
  return `<!doctype html><html lang="${rtl ? "ar" : "en"}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>${esc(id.name)} brand guide</title><link rel="stylesheet" href="${googleCss(id)}"><style>
*{box-sizing:border-box}body{margin:0;background:${P.background};color:${P.ink};font:400 16px/1.6 ${S.body}}section{padding:64px max(24px,8vw);break-inside:avoid;page-break-after:always}h1,h2,h3{font-family:${S.display};line-height:1.15;margin:0 0 16px}h1{font-size:64px}h2{font-size:36px;color:${P.primary}}h3{font-size:20px;margin-top:28px}p{max-width:62ch}
.cover{background:${P.primary};color:${on};min-height:90vh;display:flex;flex-direction:column;justify-content:center;gap:32px}.cover svg{max-width:480px;height:auto}.cover p{font-size:22px}
.logos{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}.logos>div{padding:40px;border-radius:${id.radius}px;display:flex;align-items:center;justify-content:center;min-height:200px}.logos svg{max-width:100%;max-height:120px;height:auto;width:auto}
.sws{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px}.sw i{display:block;height:110px;border-radius:${id.radius}px;box-shadow:inset 0 0 0 1px #0002}.sw b{display:block;margin-top:8px}.sw span{font-size:13px;color:${P.muted}}.sw small{display:block;font-size:12px;color:${P.muted}}
.world{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}.world img{display:block;width:100%}.world figure{margin:0;border-radius:${id.radius}px;overflow:hidden;break-inside:avoid}
blockquote{margin:8px 0;padding:12px 16px;background:${P.surface};border-radius:${id.radius}px}
</style></head><body>
<section class="cover">${darkLogoSvg}<p>${esc(id.tagline)}</p></section>
<section><h2>The brand</h2><p>${esc(id.summary)}</p><h3>Audience</h3><p>${esc(id.audience)}</p><h3>Positioning</h3><p>${esc(id.positioning)}</p><h3>Story</h3><p>${esc(id.story)}</p><h3>Values</h3>${list(id.values.map((v) => `${v.name}: ${v.meaning}`))}</section>
<section><h2>Logo</h2><p>${esc(id.logo_idea)}</p><div class="logos"><div style="background:${P.surface}">${logoSvg}</div><div style="background:${P.ink}">${darkLogoSvg}</div><div style="background:${P.surface}">${iconSvgText}</div></div></section>
<section><h2>Colour</h2><div class="sws">${swatch("Primary", P.primary, id.color_usage.primary)}${swatch("Accent", P.accent, id.color_usage.accent)}${swatch("Background", P.background, id.color_usage.background)}${swatch("Surface", P.surface)}${swatch("Ink", P.ink)}${swatch("Muted", P.muted)}</div></section>
<section><h2>Type</h2><h1>${esc(id.name)}</h1><p>${esc(id.fonts.display)}${id.fonts.arabic_display ? ` · ${esc(id.fonts.arabic_display)}` : ""}</p><p>${esc(id.summary)}</p><p>${esc(id.fonts.body)}${id.fonts.arabic_body ? ` · ${esc(id.fonts.arabic_body)}` : ""}</p></section>
<section><h2>Voice</h2><p>${esc(id.voice.summary)}</p>${id.voice.samples.map((s) => `<blockquote><small>${esc(s.context)}</small><br>${esc(s.line)}</blockquote>`).join("")}<h3>Do</h3>${list(id.voice.do)}<h3>Don't</h3>${list(id.voice.dont)}</section>
<section><h2>The brand in the world</h2><div class="world">${world}</div></section>
<section><h2>Imagery and motion</h2><p>${esc(id.imagery)}</p><p>${esc(id.motion)}</p><h3>Do</h3>${list(id.dos)}<h3>Don't</h3>${list(id.donts)}</section>
</body></html>`;
}

/** the logo as a PNG for the image model and the pages; good for a preview's direction as well */
export async function logoPng(id: Mark, language: BrandLanguage, width = 1024) {
  const { svgs } = await logoFiles(id, language);
  return png(svgs["logo-color.svg"], width);
}

/** the guide as a PDF and the website as a full-page picture, when a browser is available here; the HTML always ships */
async function renderWithBrowser(guide: string, sitePath: string | null) {
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      let site: Uint8Array | null = null;
      if (sitePath) { await page.goto("file://" + sitePath, { waitUntil: "networkidle", timeout: 40_000 }); site = new Uint8Array(await page.screenshot({ fullPage: true, type: "jpeg", quality: 85 })); }
      await page.setContent(guide, { waitUntil: "networkidle", timeout: 40_000 });
      return { pdf: new Uint8Array(await page.pdf({ format: "A4", printBackground: true })), site };
    } finally { await browser.close(); }
  } catch (err) {
    console.warn("[brand-studio] browser renders skipped", String(err).slice(0, 200));
    return { pdf: null, site: null };
  }
}

export type World = { kind: string; bytes: Uint8Array }[];
export type Site = { html: string; photos: { key: string; bytes: Uint8Array }[] };

export async function buildPack(id: Identity, language: BrandLanguage, world: World, site: Site) {
  const P = id.palette, { svgs } = await logoFiles(id, language);
  const main = svgs["logo-color.svg"], onDark = svgs["logo-on-dark.svg"], iconColor = svgs["icon-color.svg"];
  const files: { path: string; bytes: Uint8Array }[] = Object.entries(svgs).map(([k, v]) => ({ path: `logo/svg/${k}`, bytes: enc(v) }));
  const logoPng = await png(main, 1600);
  files.push({ path: "logo/png/logo-color.png", bytes: logoPng }, { path: "logo/png/logo-on-dark.png", bytes: await png(onDark, 1600) }, { path: "logo/png/logo-black.png", bytes: await png(svgs["logo-black.svg"], 1600) }, { path: "logo/png/logo-white.png", bytes: await png(svgs["logo-white.svg"], 1600) });
  if (svgs["logo-ar-color.svg"]) files.push({ path: "logo/png/logo-ar-color.png", bytes: await png(svgs["logo-ar-color.svg"], 1600) });
  files.push({ path: "logo/png/icon-1024.png", bytes: await square(iconColor, 1024, null, 0.06) }, { path: "logo/png/favicon-512.png", bytes: await square(iconColor, 512, P.background, 0.14) }, { path: "logo/png/favicon-180.png", bytes: await square(iconColor, 180, P.background, 0.14) }, { path: "logo/png/favicon-32.png", bytes: await square(iconColor, 32, null, 0.02) }, { path: "logo/png/social-avatar-1080.png", bytes: await square(svgs["icon-on-dark.svg"], 1080, onColor(P.primary, P.ink) === "#FFFFFF" ? P.ink : P.surface, 0.2) });
  const dataUri = (b: Uint8Array) => `data:image/jpeg;base64,${Buffer.from(b).toString("base64")}`;
  const small = await Promise.all(world.map(async (w) => ({ kind: w.kind, bytes: new Uint8Array(await sharp(Buffer.from(w.bytes)).resize({ width: 1000 }).jpeg({ quality: 80 }).toBuffer()) })));
  const guide = guideHtml(id, main, onDark, iconColor, language === "ar", small.map((w) => `<figure><img src="${dataUri(w.bytes)}" alt="${esc(w.kind)}"></figure>`).join(""));
  // the website as a folder that opens by itself
  const photos: Record<string, string> = Object.fromEntries(site.photos.map((p) => [p.key, `images/${p.key}.jpg`]));
  const siteHtml = fillPage(site.html, "images/logo.png", photos);
  files.push({ path: "website/index.html", bytes: enc(siteHtml) }, { path: "website/images/logo.png", bytes: logoPng }, ...site.photos.map((p) => ({ path: `website/images/${p.key}.jpg`, bytes: p.bytes })));
  for (const w of world) files.push({ path: `designs/${w.kind}.jpg`, bytes: w.bytes });
  // rendered from a folder on disk so the page finds its images
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "brand-site-"));
  fs.mkdirSync(path.join(tmp, "images"));
  fs.writeFileSync(path.join(tmp, "index.html"), siteHtml); fs.writeFileSync(path.join(tmp, "images", "logo.png"), logoPng);
  for (const p of site.photos) fs.writeFileSync(path.join(tmp, "images", `${p.key}.jpg`), p.bytes);
  const { pdf, site: sitePic } = await renderWithBrowser(guide, path.join(tmp, "index.html"));
  fs.rmSync(tmp, { recursive: true, force: true });
  if (sitePic) files.push({ path: "designs/website.jpg", bytes: sitePic });
  const text: Record<string, string> = {
    "DESIGN.md": designMd(id), "BRAND.md": brandMd(id), "CLAUDE.md": agentRules(id), "AGENTS.md": agentRules(id),
    "tokens.json": tokensJson(id), "theme.css": themeCss(id), "tailwind.config.js": tailwindJs(id), "brand.json": brandJson(id, language), "guidelines.html": guide,
    "README.md": `# ${id.name} brand pack\n\nTwo ways to use this pack:\n\n- **If you're a developer**, start from it: the tokens below are ready for code, and \`website/\` is a coded mockup to build on.\n- **If you're building with AI**, drop this folder into your project as the reference for Codex, Claude Code, Cursor or any other tool. \`CLAUDE.md\` and \`AGENTS.md\` tell them what to read.\n\nWhat's inside:\n\n- \`DESIGN.md\`: the visual system, in Google's open DESIGN.md format (still in alpha)\n- \`BRAND.md\`: who the brand is and how it talks\n- \`tokens.json\`, \`theme.css\`, \`tailwind.config.js\`: the tokens for code\n- \`logo/\`: the logo as vector SVG and PNG\n- \`website/\`: a mockup of the home page, designed for this brand, not a finished website; open \`index.html\` or edit it\n- \`designs/\`: photographs of the brand in its real world\n- \`guidelines.html\`${pdf ? ", `guidelines.pdf`" : ""}: the guide for people\n- \`brand.json\`: for MotionGX\n\nBefore registering this name or logo, have them checked for trademarks in your market. They were AI-assisted, and nobody has run that search.\n`,
  };
  for (const [path, v] of Object.entries(text)) files.push({ path, bytes: enc(v) });
  if (pdf) files.push({ path: "guidelines.pdf", bytes: pdf });
  return { files, zip: zip(files.map((f) => ({ path: `${id.name.replace(/[^\p{L}\p{N}]+/gu, "-")}-brand/${f.path}`, bytes: f.bytes }))), logoPng, count: files.length };
}
