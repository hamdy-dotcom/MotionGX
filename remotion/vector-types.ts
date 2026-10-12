// Shared (renderer + Node) types for vector text. Pure types, no imports.
export type Glyph = { d: string; x: number; adv: number; word: number; tatweel?: boolean };
export type GlyphRun = {
  /** line box in px (centred like the DOM text) */
  w: number;
  h: number;
  rtl: boolean;
  glyphs: Glyph[];
  words: number;
  /** same line with one stretchable tatweel per long Arabic word */
  kashida?: Glyph[];
  /** points along the outlines, px (text ↔ particles) */
  points?: [number, number][];
};
export const runKey = (family: string, weight: number, sizePx: number, text: string) => `${family}|${weight}|${Math.round(sizePx)}|${text}`;

type Families = { arabic: string | null; latin: string | null; display?: string | null };
/** the ONE family vector text is shaped with: the first entry of the same CSS stack the DOM text uses */
export function vectorFamily(role: "head" | "body" | "latin" | "display", fonts: Families, lang: "ar" | "en"): string {
  const fallback = "Readex Pro";
  if (role === "latin") return fonts.latin ?? fallback;
  if (role === "display" && fonts.display) return fonts.display;
  return (lang === "ar" ? fonts.arabic : fonts.latin) ?? fallback;
}
/** behaviors that need shaped glyphs */
export const VECTOR_FX = ["text-stroke-draw", "particles-to-text", "text-to-particles", "text-morph", "kashida-stretch"] as const;
