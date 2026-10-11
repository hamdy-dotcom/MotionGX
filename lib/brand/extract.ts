// PHASE 2: replace with real extraction (Firecrawl crawl + Claude brand analysis).
// For now every URL returns the Mantoog brand after a short delay.
import type { BrandColor, BrandFonts, Dialect } from "@/lib/types";

export type ExtractedBrand = {
  name: string;
  websiteUrl: string;
  logoText: string;
  colors: BrandColor[];
  fonts: BrandFonts;
  tone: string;
  tagline: string;
  defaultDialect: Dialect;
};

export async function extractBrand(url: string): Promise<ExtractedBrand> {
  await new Promise((resolve) => setTimeout(resolve, 1500));

  return {
    name: "منتوج",
    websiteUrl: normalizeUrl(url),
    logoText: "م",
    colors: [
      { hex: "#3B82F6", role: "primary" },
      { hex: "#0B0D12", role: "ink" },
      { hex: "#7C5CFF", role: "accent" },
    ],
    fonts: { arabic: "Noto Kufi Arabic", latin: "Geist" },
    tone: "ودود، مباشر، بالمصري",
    tagline: "من لينك لمتجر",
    defaultDialect: "eg",
  };
}

export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
