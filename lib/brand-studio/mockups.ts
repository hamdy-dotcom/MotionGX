// The brand in the world: a website, cards, clothes, a retail booth, packaging, a storefront, social. Drawn here as SVG
// from the brand's own values with no image generation, so the free previews cost nothing. Each brand gets its own
// treatment (flooded, quiet or patterned) so two brands never dress alike.
import { onColor, paintIcon, type BrandLanguage, type Direction, type Identity, type Palette } from "./types";

export type Look = {
  name: string; tagline: string; headline: string; cta: string; lines: string[];
  palette: Palette; icon: string; radius: number; rtl: boolean; lang: BrandLanguage;
  fonts: { display: string; body: string; arabic_display: string; arabic_body: string };
};
const hasAr = (s: string) => /[؀-ۿ]/.test(s);
export function lookFromDirection(d: Direction, lang: BrandLanguage): Look {
  const name = lang === "ar" && d.name_ar ? d.name_ar : d.name;
  return { name, tagline: d.tagline, headline: d.headline, cta: d.cta, lines: [], palette: d.palette, icon: d.icon, radius: d.radius, fonts: d.fonts, rtl: hasAr(d.headline), lang };
}
export function lookFromIdentity(id: Identity, lang: BrandLanguage): Look {
  const name = lang === "ar" && id.name_ar ? id.name_ar : id.name, tagline = lang === "ar" && id.tagline_ar ? id.tagline_ar : id.tagline;
  return { name, tagline, headline: id.headline || id.voice.samples[0]?.line || tagline, cta: id.cta || tagline, lines: id.pillars.map((p) => p.name), palette: id.palette, icon: id.icon, radius: id.radius, fonts: id.fonts, rtl: hasAr(tagline), lang };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const family = (L: Look, text: string, role: "display" | "body") => { const f = hasAr(text) ? (role === "display" ? L.fonts.arabic_display : L.fonts.arabic_body) : role === "display" ? L.fonts.display : L.fonts.body; return `'${f || "Readex Pro"}', sans-serif`; };
const mix = (a: string, b: string, t: number) => "#" + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, "0")).join("");

type Ink = { P: string; A: string; I: string };
const mark = (L: Look, c: Ink, x: number, y: number, size: number, opacity = 1) => `<g transform="translate(${x} ${y}) scale(${size / 100})" opacity="${opacity}">${paintIcon(L.icon, c)}</g>`;
const one = (c: string): Ink => ({ P: c, A: c, I: c });
const brandInk = (L: Look): Ink => ({ P: L.palette.primary, A: L.palette.accent, I: L.palette.ink });
/** icon and name together, centred on (cx, cy); the name is one line */
function lockup(L: Look, cx: number, cy: number, size: number, c: Ink, ink: string) {
  const text = L.name, fs = size * 0.62, tw = text.length * fs * (hasAr(text) ? 0.5 : 0.56), gap = size * 0.24, w = size + gap + tw, left = cx - w / 2, rtl = hasAr(text);
  const iconX = rtl ? left + tw + gap : left, textX = rtl ? left + tw : left + size + gap;
  return `${mark(L, c, iconX, cy - size / 2, size)}<text x="${textX}" y="${cy}" dominant-baseline="central" text-anchor="${rtl ? "end" : "start"}" direction="${rtl ? "rtl" : "ltr"}" font-family="${family(L, text, "display")}" font-weight="700" font-size="${fs}" fill="${ink}">${esc(text)}</text>`;
}
/** wrapped text in a box */
const box = (L: Look, x: number, y: number, w: number, h: number, text: string, o: { size: number; color: string; role?: "display" | "body"; weight?: number; align?: string; line?: number }) => {
  const rtl = hasAr(text);
  return `<foreignObject x="${x}" y="${y}" width="${w}" height="${h}"><div xmlns="http://www.w3.org/1999/xhtml" dir="${rtl ? "rtl" : "ltr"}" style="font-family:${family(L, text, o.role ?? "body").replace(/"/g, "'")};font-size:${o.size}px;font-weight:${o.weight ?? 400};line-height:${o.line ?? 1.25};color:${o.color};text-align:${o.align ?? (rtl ? "right" : "left")};overflow:hidden;height:100%">${esc(text)}</div></foreignObject>`;
};
const pattern = (L: Look, id: string, c: string, tile = 120, opacity = 0.16) => `<pattern id="${id}" width="${tile}" height="${tile}" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)"><g opacity="${opacity}">${mark(L, one(c), tile * 0.2, tile * 0.2, tile * 0.6)}</g></pattern>`;
const svg = (w: number, h: number, inner: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" style="display:block" role="img">${inner}</svg>`;
const shadow = (id: string, dy = 18, blur = 22, o = 0.25) => `<filter id="${id}" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="${dy}" stdDeviation="${blur}" flood-color="#000" flood-opacity="${o}"/></filter>`;

const scheme = (L: Look) => {
  const P = L.palette, t = hash(L.name) % 3, on = onColor(P.primary, P.ink);
  return { t, on, P, garment: t === 0 ? P.primary : t === 1 ? P.ink : "#F7F5F0", garmentInk: t === 2 ? P.primary : "#FFFFFF", wall: t === 1 ? P.ink : P.primary, wallInk: t === 1 ? "#FFFFFF" : on };
};
const uid = (L: Look, k: string) => `b${hash(L.name + L.palette.primary).toString(36)}${k}`;

function website(L: Look) {
  const { P, on, t } = scheme(L), id = uid(L, "w"), R = Math.min(L.radius, 22), rtl = L.rtl;
  const heroBg = t === 2 ? P.background : P.primary, heroInk = t === 2 ? P.ink : on, sub = t === 2 ? P.muted : mix(on, heroBg, 0.2);
  const items = (L.lines.length ? L.lines : ["●", "●", "●"]).slice(0, 3);
  const nav = rtl ? ["الرئيسية", "عنّا", "تواصل"] : ["Home", "About", "Contact"];
  const tx = rtl ? 560 : 70, vx = rtl ? 60 : 690;
  return svg(1200, 860, `<defs>${pattern(L, id + "p", heroInk, 130, 0.09)}${shadow(id + "s", 22, 30, 0.22)}<clipPath id="${id}c"><rect x="30" y="30" width="1140" height="800" rx="18"/></clipPath></defs>
<rect width="1200" height="860" fill="${mix(P.surface, P.ink, 0.06)}"/><g filter="url(#${id}s)"><rect x="30" y="30" width="1140" height="800" rx="18" fill="${P.background}"/></g><g clip-path="url(#${id}c)">
<rect x="30" y="30" width="1140" height="44" fill="${mix(P.surface, P.ink, 0.1)}"/>${[56, 80, 104].map((x, i) => `<circle cx="${x}" cy="52" r="7" fill="${["#FF5F57", "#FEBC2E", "#28C840"][i]}"/>`).join("")}<rect x="400" y="40" width="400" height="24" rx="12" fill="${P.background}"/>
<rect x="30" y="74" width="1140" height="76" fill="${P.background}"/>${lockup(L, rtl ? 1000 : 200, 112, 44, brandInk(L), P.ink)}
${nav.map((n, i) => `<text x="${rtl ? 300 + i * 110 : 620 + i * 90}" y="112" dominant-baseline="central" font-family="${family(L, n, "body")}" font-size="19" fill="${P.ink}">${n}</text>`).join("")}
<rect x="${rtl ? 60 : 900}" y="90" width="220" height="44" rx="${R}" fill="${P.primary}"/>${box(L, rtl ? 66 : 906, 100, 208, 26, L.cta, { size: 16, color: on, weight: 700, align: "center", line: 1.5 })}
<rect x="30" y="150" width="1140" height="430" fill="${heroBg}"/><rect x="30" y="150" width="1140" height="430" fill="url(#${id}p)"/>
${box(L, tx, 205, 570, 240, L.headline, { size: 62, color: heroInk, role: "display", weight: 800, line: 1.08 })}${box(L, tx, 450, 540, 60, L.tagline, { size: 23, color: sub })}
<rect x="${rtl ? 840 : tx}" y="510" width="290" height="52" rx="${R}" fill="${t === 2 ? P.primary : on}"/>${box(L, rtl ? 846 : tx + 6, 522, 278, 30, L.cta, { size: 18, color: t === 2 ? on : P.primary, weight: 700, align: "center", line: 1.5 })}
<rect x="${vx}" y="195" width="430" height="340" rx="${R * 1.5}" fill="${t === 2 ? P.primary : P.accent}"/>${mark(L, t === 2 ? one(on) : one(onColor(P.accent, P.ink)), vx + 95, 245, 240)}
${items.map((it, i) => { const x = 70 + i * 362; return `<rect x="${x}" y="610" width="340" height="190" rx="${R}" fill="${P.surface}" stroke="${mix(P.surface, P.ink, 0.1)}"/>${mark(L, brandInk(L), x + 26, 632, 54)}<rect x="${x + 26}" y="${it === "●" ? 706 : 2000}" width="200" height="16" rx="8" fill="${mix(P.surface, P.ink, 0.22)}"/><rect x="${x + 26}" y="${it === "●" ? 734 : 2000}" width="270" height="12" rx="6" fill="${mix(P.surface, P.ink, 0.12)}"/>${it === "●" ? "" : box(L, x + 26, 700, 290, 86, it, { size: 26, color: P.ink, role: "display", weight: 700 })}`; }).join("")}
</g>`);
}

function card(L: Look) {
  const { P, on } = scheme(L), id = uid(L, "c"), R = Math.min(L.radius, 18), ar = hasAr(L.name) || L.rtl;
  return svg(1000, 720, `<defs>${shadow(id + "s", 24, 26, 0.3)}<clipPath id="${id}f"><rect width="640" height="370" rx="${R}"/></clipPath><clipPath id="${id}b"><rect width="640" height="370" rx="${R}"/></clipPath></defs>
<rect width="1000" height="720" fill="${mix(P.background, P.ink, 0.08)}"/>
<g transform="translate(300 300) rotate(5)" filter="url(#${id}s)"><rect width="640" height="370" rx="${R}" fill="${P.surface}"/></g>
<g transform="translate(300 300) rotate(5)"><g clip-path="url(#${id}b)">${lockup(L, 215, 100, 60, brandInk(L), P.ink)}
${box(L, 44, 170, 560, 44, ar ? "الاسم هنا" : "Your Name", { size: 34, color: P.ink, role: "display", weight: 700 })}${box(L, 44, 218, 560, 30, ar ? "المسمى الوظيفي" : "Founder", { size: 22, color: P.muted })}
<text x="44" y="310" font-family="${family(L, "a", "body")}" font-size="20" fill="${P.ink}" direction="ltr">+20 100 000 0000  ·  hello@${esc(L.name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "brand")}.com</text><rect y="352" width="640" height="18" fill="${P.primary}"/></g></g>
<g transform="translate(60 60) rotate(-6)" filter="url(#${id}s)"><rect width="640" height="370" rx="${R}" fill="${P.primary}"/></g>
<g transform="translate(60 60) rotate(-6)"><g clip-path="url(#${id}f)"><g opacity="0.16">${mark(L, one(on), 300, -60, 520)}</g>${mark(L, one(on), 50, 110, 150)}${box(L, 225, 130, 400, 90, L.name, { size: 62, color: on, role: "display", weight: 800, line: 1 })}${box(L, 50, 300, 540, 40, L.tagline, { size: 22, color: on })}</g></g>`);
}

const TEE = "M130 40C150 58 250 58 270 40L330 62L392 150L335 182L312 150L312 420Q200 432 88 420L88 150L65 182L8 150L70 62Z";
function tshirt(L: Look) {
  const { P, garment, garmentInk } = scheme(L), id = uid(L, "t"), c = garment === "#F7F5F0" ? brandInk(L) : one(garmentInk), neck = mix(garment, "#000000", 0.28);
  const tee = (x: number, y: number, back: boolean) => `<g transform="translate(${x} ${y}) scale(1.5)" filter="url(#${id}s)"><path d="${TEE}" fill="${garment}"/><path d="${TEE}" fill="url(#${id}g)"/><path d="M130 40C150 ${back ? 56 : 80} 250 ${back ? 56 : 80} 270 40C250 58 150 58 130 40Z" fill="${neck}"/><path d="M88 150L100 118M312 150L300 118" stroke="#000" stroke-opacity=".12" stroke-width="3" fill="none"/>${back ? mark(L, c, 115, 130, 170) : mark(L, c, 230, 125, 52)}</g>`;
  return svg(1000, 1080, `<defs>${shadow(id + "s", 16, 18, 0.28)}<linearGradient id="${id}g" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".14"/><stop offset=".3" stop-color="#000" stop-opacity="0"/><stop offset=".7" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity=".14"/></linearGradient></defs><rect width="1000" height="1080" fill="${mix(P.background, P.primary, 0.08)}"/>${tee(370, 20, true)}${tee(20, 390, false)}`);
}

function uniform(L: Look) {
  const { P, garment, garmentInk } = scheme(L), id = uid(L, "u"), c = garment === "#F7F5F0" ? brandInk(L) : one(garmentInk), dark = mix(garment, "#000000", 0.25), apron = garment === P.primary ? P.ink : P.primary, apronInk = onColor(apron, P.ink);
  return svg(1000, 720, `<defs>${shadow(id + "s", 16, 18, 0.25)}</defs><rect width="1000" height="720" fill="${mix(P.surface, P.ink, 0.05)}"/>
<g transform="translate(40 80) scale(1.28)" filter="url(#${id}s)"><path d="${TEE.replace("L335 182L312 150", "L335 182L312 150")}" fill="${garment}"/><path d="M130 40L200 92L270 40L252 28C230 38 170 38 148 28Z" fill="${dark}"/><path d="M200 92V175" stroke="${dark}" stroke-width="8"/><circle cx="200" cy="118" r="5" fill="${garmentInk}"/><circle cx="200" cy="150" r="5" fill="${garmentInk}"/>${mark(L, c, 238, 130, 46)}</g>
<g transform="translate(610 60)" filter="url(#${id}s)"><path d="M70 40H230L245 170L320 220V600Q150 622 -20 600V220L55 170Z" fill="${apron}"/><path d="M90 40C90 -20 210 -20 210 40" stroke="${apron}" stroke-width="14" fill="none"/><path d="M-20 300H-60M320 300H360" stroke="${apron}" stroke-width="12"/>${mark(L, one(apronInk), 70, 240, 160)}${box(L, 0, 415, 300, 70, L.name, { size: 38, color: apronInk, role: "display", weight: 800, align: "center", line: 1.05 })}<rect x="40" y="500" width="220" height="70" rx="8" fill="#000" fill-opacity=".12"/></g>`);
}

function booth(L: Look) {
  const { P, wall, wallInk, on } = scheme(L), id = uid(L, "b"), side = mix(wall, "#000000", 0.28), R = Math.min(L.radius, 14);
  const shelf = (x: number, y: number) => `<rect x="${x}" y="${y + 66}" width="150" height="8" fill="${mix(wallInk, wall, 0.3)}"/>${[0, 1, 2].map((i) => `<rect x="${x + 8 + i * 48}" y="${y + (i % 2 ? 18 : 8)}" width="40" height="${i % 2 ? 48 : 58}" rx="4" fill="${i === 1 ? P.accent : "#FFFFFF"}"/>${mark(L, i === 1 ? one(onColor(P.accent, P.ink)) : one(P.primary), x + 16 + i * 48, y + 26, 24)}`).join("")}`;
  return svg(1100, 780, `<defs>${pattern(L, id + "p", wallInk, 110, 0.12)}${shadow(id + "s", 14, 14, 0.28)}<linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(P.surface, P.ink, 0.1)}"/><stop offset="1" stop-color="${mix(P.surface, P.ink, 0.28)}"/></linearGradient></defs>
<rect width="1100" height="780" fill="${mix(P.background, P.ink, 0.05)}"/><path d="M0 610H1100V780H0Z" fill="url(#${id}f)"/>
<path d="M170 170L90 110V640L170 600Z" fill="${side}"/><path d="M930 170L1010 110V640L930 600Z" fill="${side}"/>
<rect x="170" y="170" width="760" height="430" fill="${wall}"/><rect x="170" y="170" width="760" height="430" fill="url(#${id}p)"/>
${box(L, 300, 215, 500, 100, L.headline, { size: 38, color: wallInk, role: "display", weight: 800, align: "center", line: 1.1 })}${shelf(205, 240)}${shelf(745, 240)}${shelf(205, 350)}${shelf(745, 350)}
<path d="M90 60H1010L1010 170H90Z" fill="${P.ink === wall ? P.primary : P.ink}"/>${lockup(L, 550, 115, 70, one("#FFFFFF"), "#FFFFFF")}${[250, 450, 650, 850].map((x) => `<path d="M${x} 170L${x - 40} 240H${x + 40}Z" fill="#fff" opacity=".1"/>`).join("")}
<g filter="url(#${id}s)"><path d="M300 470H800L840 500H260Z" fill="${mix(P.surface, P.ink, 0.04)}"/><rect x="260" y="500" width="580" height="170" rx="${R}" fill="${P.primary}"/></g>${mark(L, one(on), 300, 525, 120)}${box(L, 435, 530, 385, 110, L.tagline, { size: 32, color: on, role: "display", weight: 700, line: 1.15 })}
<rect x="590" y="430" width="90" height="42" rx="6" fill="#1b1b20"/><rect x="600" y="438" width="70" height="26" rx="3" fill="${P.accent}"/>`);
}

function packaging(L: Look) {
  const { P, on, t } = scheme(L), id = uid(L, "k"), bag = t === 1 ? P.ink : P.primary, bagInk = onColor(bag, P.ink);
  return svg(1000, 720, `<defs>${shadow(id + "s", 20, 20, 0.3)}${pattern(L, id + "p", P.primary, 80, 0.14)}</defs><rect width="1000" height="720" fill="${mix(P.background, P.accent, 0.12)}"/>
<g filter="url(#${id}s)"><path d="M120 190H520L550 640H90Z" fill="${bag}"/></g><path d="M240 190C240 70 400 70 400 190" fill="none" stroke="${mix(bag, "#000000", 0.25)}" stroke-width="12"/><path d="M520 190L550 640L490 640L470 190Z" fill="#000" opacity=".12"/>${mark(L, one(bagInk), 225, 290, 190)}${box(L, 120, 495, 400, 80, L.name, { size: 44, color: bagInk, role: "display", weight: 800, align: "center", line: 1 })}
<g filter="url(#${id}s)"><path d="M590 390L770 310L940 390V600L770 680L590 600Z" fill="${P.surface}"/></g><path d="M590 390L770 470L940 390L770 310Z" fill="${mix(P.surface, P.ink, 0.04)}"/><path d="M590 390L770 470V680L590 600Z" fill="${mix(P.surface, P.ink, 0.08)}"/><path d="M590 390L770 470V680L590 600Z" fill="url(#${id}p)"/><path d="M770 470L940 390V600L770 680Z" fill="${P.primary}"/><g transform="translate(800 480) skewY(-25)">${mark(L, one(on), 0, 0, 100)}</g>`);
}

function storefront(L: Look) {
  const { P, wall, wallInk, on } = scheme(L), id = uid(L, "f"), stripes = Array.from({ length: 12 }, (_, i) => `<path d="M${130 + i * 70} 250H${200 + i * 70}L${194 + i * 72} 340H${112 + i * 72}Z" fill="${i % 2 ? P.background : P.accent}"/>`).join("");
  return svg(1100, 780, `<defs>${shadow(id + "s", 8, 10, 0.3)}<linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity=".04"/></linearGradient></defs>
<rect width="1100" height="780" fill="${mix(P.surface, P.ink, 0.12)}"/><rect x="70" y="60" width="960" height="630" fill="${mix(P.background, P.ink, 0.06)}"/><rect x="70" y="60" width="960" height="190" fill="${wall}"/>${lockup(L, 550, 155, 96, wallInk === "#FFFFFF" ? one("#FFFFFF") : brandInk(L), wallInk)}
${stripes}<rect x="130" y="340" width="540" height="350" fill="#20242c"/><rect x="130" y="340" width="540" height="350" fill="url(#${id}g)"/>${box(L, 170, 400, 460, 150, L.headline, { size: 42, color: "#FFFFFF", role: "display", weight: 800, line: 1.12 })}${mark(L, one(P.accent), 170, 570, 80)}
<rect x="720" y="360" width="250" height="330" fill="${P.primary}"/><rect x="745" y="385" width="200" height="220" fill="#20242c"/><rect x="745" y="385" width="200" height="220" fill="url(#${id}g)"/>${mark(L, one("#FFFFFF"), 805, 455, 80)}<circle cx="935" cy="640" r="9" fill="${on}"/><rect y="690" width="1100" height="90" fill="${mix(P.surface, P.ink, 0.22)}"/>`);
}

function social(L: Look) {
  const { P, on } = scheme(L), id = uid(L, "s"), S = 186, tiles = Array.from({ length: 6 }, (_, i) => { const x = 14 + (i % 3) * (S + 6), y = 430 + Math.floor(i / 3) * (S + 6), bg = [P.primary, P.surface, P.accent, P.ink, P.accent, P.primary][i], ink = onColor(bg, P.ink); return `<rect x="${x}" y="${y}" width="${S}" height="${S}" fill="${bg}"/>${i === 0 || i === 4 ? box(L, x + 16, y + 40, S - 32, S - 50, i === 0 ? L.headline : L.tagline, { size: 21, color: ink, role: "display", weight: 700, line: 1.15 }) : mark(L, i === 1 ? brandInk(L) : one(ink), x + 48, y + 48, 90)}`; }).join("");
  return svg(1000, 900, `<defs>${shadow(id + "s", 24, 26, 0.32)}<clipPath id="${id}c"><rect width="600" height="840" rx="52"/></clipPath></defs><rect width="1000" height="900" fill="${mix(P.background, P.primary, 0.14)}"/>
<g transform="translate(200 30)" filter="url(#${id}s)"><rect x="-12" y="-12" width="624" height="864" rx="62" fill="#17171c"/></g><g transform="translate(200 30)" clip-path="url(#${id}c)"><rect width="600" height="840" fill="#FFFFFF"/><rect x="0" y="0" width="600" height="60" fill="#fff"/><text x="30" y="40" font-family="sans-serif" font-size="22" font-weight="700" fill="#111" direction="ltr">9:41</text>
<circle cx="90" cy="150" r="60" fill="${P.primary}"/>${mark(L, one(on), 52, 112, 76)}${[["128", "Posts"], ["4.8K", "Followers"], ["96", "Following"]].map(([n, s], i) => `<text x="${250 + i * 120}" y="140" text-anchor="middle" font-family="sans-serif" font-size="26" font-weight="700" fill="#111">${n}</text><text x="${250 + i * 120}" y="170" text-anchor="middle" font-family="sans-serif" font-size="17" fill="#555">${s}</text>`).join("")}
${box(L, 30, 225, 540, 42, L.name, { size: 28, color: "#111", role: "display", weight: 700 })}${box(L, 30, 268, 540, 70, L.tagline, { size: 22, color: "#333" })}<rect x="30" y="345" width="260" height="56" rx="12" fill="${P.primary}"/>${box(L, 30, 358, 260, 34, L.cta, { size: 20, color: on, weight: 700, align: "center" })}<rect x="306" y="345" width="264" height="56" rx="12" fill="#eee"/>${tiles}</g>`);
}

export const MOCKUPS = { website, card, tshirt, uniform, booth, packaging, storefront, social } as const;
export type MockupKind = keyof typeof MOCKUPS;
export const MOCKUP_KINDS = Object.keys(MOCKUPS) as MockupKind[];
/** the four a small preview shows */
export const PREVIEW_KINDS: MockupKind[] = ["website", "tshirt", "booth", "card"];
export const mockup = (L: Look, kind: MockupKind) => MOCKUPS[kind](L);
export const fontsUrl = (L: Look) => `https://fonts.googleapis.com/css2?${[...new Set(Object.values(L.fonts))].filter(Boolean).map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;700;800`).join("&")}&display=swap`;
