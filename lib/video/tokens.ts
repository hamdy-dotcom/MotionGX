// Brand tokens for the motion engine, derived from the company's brand_profile colors.
// Nothing here is a fixed brand color: canvas, text and gradient all come from the brand,
// with text picked by WCAG contrast. Relative imports only (bundled by Remotion too).
import type { BrandColorInput } from "./kit";

type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB) {
  return `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

export function mix(a: string, b: string, t: number) {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

export function rgba(hex: string, alpha: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function luminance(hex: string) {
  const ch = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** WCAG contrast ratio. */
export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  return [h * 60, s, l];
}

function hslToHex(h: number, s: number, l: number) {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex([f(0) * 255, f(8) * 255, f(4) * 255]);
}

export function rotateHue(hex: string, deg: number) {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  return hslToHex((h + deg + 360) % 360, s, l);
}

/** Lighten (amount > 0) or darken (< 0) in HSL space. */
export function shade(hex: string, amount: number) {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  return hslToHex(h, s, Math.min(1, Math.max(0, l + amount)));
}

/** Nudge a color's lightness until it reaches `min` contrast against `bg`. */
export function ensureContrast(color: string, bg: string, min: number) {
  let c = color;
  const lighten = luminance(bg) < 0.4;
  for (let i = 0; i < 20 && contrast(c, bg) < min; i++) c = shade(c, lighten ? 0.04 : -0.04);
  return c;
}

const pick = (colors: BrandColorInput[], role: string) => colors.find((c) => c.role === role)?.hex;
const valid = (hex?: string | null): hex is string => !!hex && /^#[0-9a-f]{6}$/i.test(hex);

export type BrandTokens = {
  bg: string;
  bg2: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textMuted: string;
  textDim: string;
  primary: string;
  onPrimary: string;
  accent: string;
  /** Gradient stops, readable on bg. */
  gradA: string;
  gradB: string;
  gradient: string;
  glowA: string;
  glowB: string;
  dark: boolean;
};

export function buildTokens(colors: BrandColorInput[]): BrandTokens {
  const list = colors.filter((c) => valid(c.hex));
  const primary = pick(list, "primary") ?? list[0]?.hex ?? "#5558E3";
  const inkRaw = pick(list, "ink") ?? list.find((c) => luminance(c.hex) < 0.15 && c.hex !== primary)?.hex;
  const background = pick(list, "background");
  const accentRaw = pick(list, "accent") ?? list.find((c) => c.hex !== primary && c.hex !== inkRaw && c.hex !== background)?.hex;

  // Canvas: the brand's darkest neutral (ink or a dark background); otherwise a deep shade of primary.
  // Dark canvases carry the glow treatment; text color is chosen by contrast either way.
  const darkCandidates = [inkRaw, background].filter(valid).filter((c) => luminance(c) < 0.12);
  const bg = darkCandidates.sort((a, b) => luminance(a) - luminance(b))[0] ?? mix(primary, "#05060A", 0.86);
  const dark = luminance(bg) < 0.4;

  const textCandidates = ["#FFFFFF", "#0B0D12", ...(background ? [background] : [])];
  const text = textCandidates.sort((a, b) => contrast(b, bg) - contrast(a, bg))[0];

  const accentBase = accentRaw && contrast(accentRaw, primary) > 1.15 ? accentRaw : rotateHue(primary, 38);
  const gradA = ensureContrast(shade(primary, dark ? 0.08 : -0.04), bg, 3.2);
  const gradB = ensureContrast(accentBase, bg, 3.2);
  const primaryUi = ensureContrast(primary, bg, 1.8);
  const onPrimary = contrast("#FFFFFF", primaryUi) >= contrast("#0B0D12", primaryUi) ? "#FFFFFF" : "#0B0D12";

  return {
    bg,
    bg2: mix(bg, primary, 0.12),
    surface: mix(bg, text, 0.06),
    surface2: mix(bg, primary, 0.18),
    border: rgba(text, 0.09),
    text,
    textMuted: mix(text, bg, 0.38),
    textDim: mix(text, bg, 0.62),
    primary: primaryUi,
    onPrimary,
    accent: gradB,
    gradA,
    gradB,
    gradient: `linear-gradient(90deg, ${gradA}, ${gradB})`,
    glowA: rgba(primary, dark ? 0.26 : 0.18),
    glowB: rgba(accentBase, dark ? 0.22 : 0.15),
    dark,
  };
}
