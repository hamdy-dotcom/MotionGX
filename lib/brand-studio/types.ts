// Shared (client + server) types of the brand creator: a talk, small previews to choose from, the final identity.
import { z } from "zod";

export const BRAND_LANGUAGES = ["ar", "en", "both"] as const;
export type BrandLanguage = (typeof BRAND_LANGUAGES)[number];

export const HEX = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const PaletteSchema = z.object({ primary: HEX, accent: HEX, ink: HEX, muted: HEX, background: HEX, surface: HEX });
export type Palette = z.infer<typeof PaletteSchema>;

export type Turn = { q: string; a: string };

export const NextQuestionSchema = z.object({
  done: z.boolean(),
  question: z.string().max(240),
  suggestions: z.array(z.string().max(70)).max(5),
  multiple: z.boolean(),
  brief: z.string().max(1500),
});
export type NextQuestion = z.infer<typeof NextQuestionSchema>;

/** what uploaded files already decide; empty fields are what the talk still has to ask */
export const FileBriefSchema = z.object({
  summary: z.string().max(3000),
  name: z.string().max(80),
  palette: z.array(HEX).max(8),
  fonts: z.array(z.string().max(60)).max(4),
  voice: z.string().max(400),
  complete: z.boolean(),
});
export type FileBrief = z.infer<typeof FileBriefSchema>;

export const DirectionSchema = z.object({
  name: z.string().min(1).max(40),
  name_ar: z.string().max(40),
  tagline: z.string().max(90),
  concept: z.string().max(180),
  palette: PaletteSchema,
  fonts: z.object({ display: z.string().max(50), body: z.string().max(50), arabic_display: z.string().max(50), arabic_body: z.string().max(50) }),
  icon: z.string().min(10).max(4000),
  headline: z.string().max(70),
  cta: z.string().max(24),
  radius: z.number().min(0).max(40),
});
export type Direction = z.infer<typeof DirectionSchema>;

export const IdentitySchema = z.object({
  name: z.string().min(1).max(40),
  name_ar: z.string().max(40),
  tagline: z.string().max(90),
  tagline_ar: z.string().max(90),
  headline: z.string().max(70).default(""),
  cta: z.string().max(24).default(""),
  summary: z.string().max(600),
  audience: z.string().max(400),
  positioning: z.string().max(500),
  story: z.string().max(900),
  values: z.array(z.object({ name: z.string().max(40), meaning: z.string().max(160) })).min(3).max(5),
  voice: z.object({
    summary: z.string().max(300),
    traits: z.array(z.string().max(40)).min(3).max(5),
    do: z.array(z.string().max(120)).min(3).max(6),
    dont: z.array(z.string().max(120)).min(3).max(6),
    samples: z.array(z.object({ context: z.string().max(40), line: z.string().max(160) })).min(3).max(6),
  }),
  pillars: z.array(z.object({ name: z.string().max(40), message: z.string().max(180) })).min(3).max(5),
  features: z.array(z.string().max(120)).max(12),
  palette: PaletteSchema,
  color_usage: z.object({ primary: z.string().max(280), accent: z.string().max(280), background: z.string().max(280) }),
  fonts: DirectionSchema.shape.fonts,
  radius: z.number().min(0).max(40),
  icon: z.string().min(10).max(4000),
  logo_idea: z.string().max(600),
  imagery: z.string().max(700),
  motion: z.string().max(500),
  dos: z.array(z.string().max(220)).min(3).max(8),
  donts: z.array(z.string().max(220)).min(3).max(8),
});
export type Identity = z.infer<typeof IdentitySchema>;

export const FONT_CHOICES = { latin: ["Poppins", "Inter", "Manrope", "Sora", "DM Sans", "Space Grotesk", "Outfit", "Plus Jakarta Sans", "Fraunces", "Playfair Display", "Lora", "DM Serif Display", "Bricolage Grotesque", "Syne", "Archivo", "Nunito"], arabic: ["Readex Pro", "Cairo", "Tajawal", "IBM Plex Sans Arabic", "Almarai", "El Messiri", "Changa", "Lemonada", "Noto Kufi Arabic", "Noto Naskh Arabic", "Amiri", "Markazi Text", "Aref Ruqaa"] };

/** relative luminance contrast (WCAG) */
export function contrast(a: string, b: string) {
  const lum = (h: string) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
/** text colour that reads on a fill */
export const onColor = (fill: string, ink: string) => (contrast(fill, "#FFFFFF") >= contrast(fill, ink) ? "#FFFFFF" : ink);

/** the icon's shapes kept: drawing tags and attributes only, so model-written markup can never carry a script or a link.
 *  Fills: P (primary), A (accent), I (ink), none. */
const TAGS = new Set(["path", "circle", "rect", "ellipse", "polygon", "line", "g"]);
const ATTRS = new Set(["d", "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "y1", "x2", "y2", "width", "height", "points", "transform", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "opacity", "fill-rule", "clip-rule"]);
export function cleanIcon(markup: string): string | null {
  const out: string[] = [];
  let shapes = 0;
  for (const m of markup.matchAll(/<\s*(\/?)\s*([a-zA-Z]+)([^<>]*?)(\/?)\s*>/g)) {
    const [, close, tag, rest, self] = m, t = tag.toLowerCase();
    if (t === "svg") continue;
    if (!TAGS.has(t)) return null;
    if (close) { out.push(`</${t}>`); continue; }
    const attrs = [...rest.matchAll(/([a-zA-Z0-9-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(([, k, a, b]) => [k.toLowerCase(), a ?? b] as const).filter(([k, v]) => ATTRS.has(k) && !/[<>&"]|url\(|javascript/i.test(v));
    if (t !== "g" && !attrs.length) return null; // a shape with nothing left to draw
    out.push(`<${t} ${attrs.map(([k, v]) => `${k}="${v}"`).join(" ")}${self ? "/" : ""}>`);
    if (t !== "g") shapes++;
  }
  return shapes ? out.join("") : null;
}
/** the icon in given colours; P / A / I become real ones */
export function paintIcon(icon: string, c: { P: string; A: string; I: string }) {
  return icon.replace(/\b(fill|stroke)="(P|A|I)"/g, (_, k, v: "P" | "A" | "I") => `${k}="${c[v]}"`);
}
export const iconSvg = (icon: string, c: { P: string; A: string; I: string }, size = 100) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">${paintIcon(icon, c)}</svg>`;
