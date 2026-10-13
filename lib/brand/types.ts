// Shared (client + server) types for brand extraction.
import type { AiErrorCode } from "@/lib/ai/errors";
import type { BrandColor, BrandFonts, Dialect } from "@/lib/types";

export const EXTRACT_STEPS = ["logo", "colors", "fonts", "tone", "facts", "snapshot"] as const;
export type ExtractStep = (typeof EXTRACT_STEPS)[number];

export const FALLBACK_FONTS = { arabic: "Readex Pro", latin: "Inter" } as const;

/** Summarized from the homepage + up to 3 more pages. Numbers are only ones found on the site. */
export type BrandFacts = {
  what_it_does: string;
  audience: string;
  key_features: string[];
  numbers: { value: number; label: string; prefix: string; suffix: string }[];
  offers: string[];
  cta_url: string;
};

export const EMPTY_FACTS: BrandFacts = { what_it_does: "", audience: "", key_features: [], numbers: [], offers: [], cta_url: "" };

export type BrandDraft = {
  name: string;
  websiteUrl: string;
  logoUrl: string | null;
  colors: BrandColor[];
  fonts: Required<BrandFonts>;
  tone: string;
  tagline: string;
  defaultDialect: Dialect;
  facts: BrandFacts;
  /** the site may have rebranded (logo text ≠ name, "X (formerly Y)"): ask the user to confirm */
  nameCheck?: { reason: "rebrand"; candidates: string[] } | null;
};

export type ExtractEvent =
  | { type: "step"; step: ExtractStep; status: "done" | "failed" }
  | { type: "error"; code: AiErrorCode }
  | { type: "result"; brand: BrandDraft; raw: Record<string, unknown> | null; cached: boolean };

/** What the editor starts from when nothing could be extracted. */
export function emptyDraft(url: string): BrandDraft {
  let name = "";
  try {
    name = new URL(url).hostname.replace(/^www\./, "").split(".")[0];
  } catch {}
  return { name, websiteUrl: url, logoUrl: null, colors: [], fonts: { ...FALLBACK_FONTS }, tone: "", tagline: "", defaultDialect: "eg", facts: { ...EMPTY_FACTS, cta_url: url } };
}
