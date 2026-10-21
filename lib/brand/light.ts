import type { BrandColor } from "@/lib/types";

const HEX = /^#[0-9a-f]{6}$/i;
const lum = (h: string) => { const n = parseInt(h.slice(1), 16); return (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255; };

/** The two colours that light the studio for a brand: its primary (or accent) and a second one, never near-black or near-white. */
export function brandLight(colors: BrandColor[] = []): { brand: string; brand2: string } {
  const ordered = [...colors.filter((c) => c.role === "primary"), ...colors.filter((c) => c.role === "accent"), ...colors].map((c) => c.hex).filter((h) => HEX.test(h));
  const usable = [...new Set(ordered.map((h) => h.toLowerCase()))].filter((h) => lum(h) > 0.18 && lum(h) < 0.92);
  const brand = usable[0] ?? "#5558e3";
  return { brand, brand2: usable.find((h) => h !== brand) ?? "#8f92ff" };
}

/** Hex colours of a palette, in order, for colour bars. */
export const paletteHexes = (colors: BrandColor[] = []) => colors.map((c) => c.hex).filter((h) => HEX.test(h));

/** A Google Fonts stylesheet URL for a brand font name (Arabic display), or null for the app's own font. */
export function brandFontHref(name?: string | null) {
  const family = (name ?? "").split(",")[0].trim();
  if (!family || /^readex/i.test(family)) return null;
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@500;700;800&display=swap`;
}
