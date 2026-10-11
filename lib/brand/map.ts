// Pure mapping from a Firecrawl v2 scrape (branding + metadata) to our brand profile shape.
import type { BrandColor, ColorRole } from "@/lib/types";
import { FALLBACK_FONTS } from "./types";

export { FALLBACK_FONTS };

export type FirecrawlBranding = {
  colorScheme?: string;
  logo?: string | null;
  brandName?: string;
  colors?: Partial<Record<"primary" | "secondary" | "accent" | "background" | "textPrimary" | "textSecondary" | "link", string>>;
  fonts?: { family?: string; role?: string }[];
  typography?: { fontFamilies?: Partial<Record<"primary" | "heading" | "code", string>> };
  components?: { buttonPrimary?: { background?: string }; buttonSecondary?: { background?: string } };
  images?: { logo?: string | null; favicon?: string | null; ogImage?: string | null };
};

export type FirecrawlScrape = {
  markdown?: string;
  branding?: FirecrawlBranding;
  metadata?: {
    title?: string;
    description?: string;
    language?: string;
    ogSiteName?: string;
    ogLocale?: string;
    sourceURL?: string;
    url?: string;
  };
};


// Families that are Arabic (or Arabic-first). Anything else counts as Latin.
const ARABIC_FONTS = [
  "readex pro", "cairo", "tajawal", "almarai", "changa", "el messiri", "amiri", "lalezar", "harmattan", "mada",
  "alexandria", "markazi", "lateef", "scheherazade", "reem kufi", "aref ruqaa", "kufam", "zain", "thmanyah",
  "somar", "ge ss", "din next arabic", "dubai", "29lt", "ibm plex sans arabic", "noto kufi arabic",
  "noto sans arabic", "noto naskh arabic", "baloo bhaijaan", "vazirmatn", "rubik arabic", "lyon arabic",
  "graphik arabic", "frutiger arabic", "helvetica neue arabic", "neue haas arabic", "expo arabic", "bahij",
  "droid arabic", "hacen", "mestika", "ping ar", "estedad", "qomra", "blabeloo", "beiruti", "handjet", "playpen sans arabic",
];

function isArabicFont(family: string) {
  const f = family.toLowerCase();
  return /arabic|kufi|naskh|ruqaa|thuluth|\barab\b/.test(f) || ARABIC_FONTS.some((a) => f.startsWith(a));
}

const GENERIC_FONTS = /^(sans-serif|serif|monospace|system-ui|-apple-system|blinkmacsystemfont|arial|helvetica|times new roman|inherit|initial|ui-sans-serif)$/i;

function cleanFamily(family: string) {
  return family.replace(/["']/g, "").split(",")[0].trim();
}

export function normalizeHex(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  let m = v.match(/^#([0-9a-f]{3})$/i);
  if (m) return `#${m[1].split("").map((c) => c + c).join("")}`.toUpperCase();
  m = v.match(/^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/i);
  if (m) return `#${m[1]}`.toUpperCase();
  m = v.match(/^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/i);
  if (m) return `#${[m[1], m[2], m[3]].map((n) => Math.min(255, Number(n)).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
  return null;
}

function rgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function distance(a: string, b: string) {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
}

function saturation(hex: string) {
  const [r, g, b] = rgb(hex).map((x) => x / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

/** Fill colors used inside an inline SVG logo (often the most faithful brand colors). */
export function svgFills(svg: string): string[] {
  const found = [...svg.matchAll(/fill(?:=|:\s*)["']?(#[0-9a-f]{3,8}|rgba?\([^)]+\))/gi)]
    .map((m) => normalizeHex(m[1]))
    .filter((h): h is string => Boolean(h));
  return [...new Set(found)];
}

export function decodeSvgDataUri(uri: string): string | null {
  const m = uri.match(/^data:image\/svg\+xml(;base64)?(?:;[^,]*)?,(.*)$/is);
  if (!m) return null;
  try {
    return m[1] ? Buffer.from(m[2], "base64").toString("utf8") : decodeURIComponent(m[2]);
  } catch {
    return null;
  }
}

/** primary / ink / accent / background — distinct, valid hex values only. */
export function mapColors(branding: FirecrawlBranding | undefined, logo: string | null): BrandColor[] {
  const c = branding?.colors ?? {};
  const out: BrandColor[] = [];
  const add = (role: ColorRole, ...candidates: (string | null | undefined)[]) => {
    for (const candidate of candidates) {
      const hex = normalizeHex(candidate);
      if (!hex) continue;
      if (out.some((o) => distance(o.hex, hex) < 40)) continue;
      // The accent should be a real color, not a near-gray or browser-default link blue.
      if (role === "accent" && (saturation(hex) < 0.25 || hex === "#0000EE")) continue;
      out.push({ hex, role });
      return;
    }
  };

  const logoSvg = logo ? decodeSvgDataUri(logo) : null;
  const logoColors = logoSvg ? svgFills(logoSvg) : [];

  add("primary", c.primary, branding?.components?.buttonPrimary?.background, c.accent, ...logoColors);
  add("ink", c.textPrimary, c.secondary, "#10184A");
  add("accent", c.accent, c.secondary, branding?.components?.buttonSecondary?.background, ...logoColors, c.link);
  const bg = normalizeHex(c.background);
  if (bg && !out.some((o) => o.hex === bg)) out.push({ hex: bg, role: "background" });
  return out;
}

export function mapFonts(branding: FirecrawlBranding | undefined) {
  const families = [
    branding?.typography?.fontFamilies?.heading,
    branding?.typography?.fontFamilies?.primary,
    ...(branding?.fonts ?? []).map((f) => f.family),
  ]
    .filter((f): f is string => Boolean(f))
    .map(cleanFamily)
    .filter((f) => f && !GENERIC_FONTS.test(f));

  const arabic = families.find(isArabicFont) ?? null;
  const latin = families.find((f) => !isArabicFont(f)) ?? null;
  return {
    fonts: { arabic: arabic ?? FALLBACK_FONTS.arabic, latin: latin ?? FALLBACK_FONTS.latin },
    found: { arabic: Boolean(arabic), latin: Boolean(latin) },
  };
}

export function pickLogo(branding: FirecrawlBranding | undefined): string | null {
  const candidate = branding?.images?.logo || branding?.logo || null;
  if (!candidate) return null;
  if (candidate.startsWith("data:image/") || /^https?:\/\//i.test(candidate)) return candidate;
  return null;
}

export function pickName(scrape: FirecrawlScrape, url: string): string {
  const fromTitle = scrape.metadata?.title?.split(/\s[|–—\-:·]\s/)[0]?.trim();
  const candidates = [scrape.branding?.brandName, scrape.metadata?.ogSiteName, fromTitle];
  const name = candidates.find((n) => n && n.trim().length > 0 && n.length <= 60);
  if (name) return name.trim();
  try {
    return new URL(url).hostname.replace(/^www\./, "").split(".")[0];
  } catch {
    return "";
  }
}

/** Markdown for the tone prompt — images and bare links stripped, trimmed to ~6k chars. */
export function trimMarkdown(markdown: string | undefined, max = 6000) {
  if (!markdown) return "";
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}
