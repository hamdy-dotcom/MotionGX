// Acceptance-run jobs (5 companies) + brand/brief helpers, shared by generate-3c and ab-spec.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { extractBrand, type BrandDraft } from "../../lib/brand/extract";
import { loadLogo } from "../../lib/brand/logo";
import { logoNeedsPlate } from "../../lib/video/brand-props";
import { buildTokens } from "../../packages/primitives/src/palette";
import { dimensionsFor, type MotionBrief } from "../../lib/motion/types";
import type { Dialect, Goal, Pace, VideoFormat } from "../../lib/types";

export const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
export const CAP = Number(process.env.MOTIONGX_CAP_USD ?? 0.05);

export type Job = { slug: string; url: string; dialect: Dialect; format: VideoFormat; lengthS: 15 | 30 | 60; pace: Pace; goal: Goal; brief: string };
export const JOBS: Job[] = [
  { slug: "slllr", url: "https://www.slllr.com/", dialect: "sa", format: "9:16", lengthS: 30, pace: "medium", goal: "about", brief: "عرّف التجار الجدد بسلر: يبدأون تجارتهم أونلاين بالدروب شيبنج بدون مخزون ولا رأس مال، وسلر يتكفل بالمنتجات والشحن والتأكيدات. ادعهم يسجلوا اليوم." },
  { slug: "mantoog", url: "https://mantoog.com", dialect: "eg", format: "9:16", lengthS: 30, pace: "fast", goal: "launch", brief: "Launch video for Mantoog: paste a product link and get a full store with AI-written pages, then launch TikTok ads from inside the dashboard. Push sellers to start today." },
  { slug: "tamara", url: "https://tamara.co", dialect: "sa", format: "1:1", lengthS: 30, pace: "calm", goal: "sell", brief: "فيديو هادئ وواثق يشرح إن تمارا تخليك تقسّم مشترياتك على دفعات بدون فوائد في المتاجر اللي تحبها، وندعو الناس يحمّلون التطبيق." },
  { slug: "instabug", url: "https://www.instabug.com", dialect: "en", format: "16:9", lengthS: 30, pace: "medium", goal: "about", brief: "Show mobile teams how Instabug catches crashes and bugs with full context so they ship better apps faster. End with a call to try it." },
  { slug: "breadfast", url: "https://www.breadfast.com", dialect: "eg", format: "9:16", lengthS: 15, pace: "fast", goal: "sell", brief: "إعلان سريع لبريدفاست: البقالة والعيش الطازة يوصلوا لحد باب البيت في دقايق. خلّي الناس تطلب دلوقتي من التطبيق." },
];

// throwaway workspaces (no members); MOTIONGX_WS_TAG gives test iterations a fresh hourly AI limit
export async function workspaceFor(slug: string): Promise<string> {
  const name = `[test] ${process.env.MOTIONGX_WS_TAG ?? "3C"} ${slug}`;
  const { data: found } = await admin.from("workspaces").select("id").eq("name", name).maybeSingle();
  if (found) return found.id;
  const { data, error } = await admin.from("workspaces").insert({ name, country_code: "EG", currency_code: "USD" }).select("id").single();
  if (error || !data) throw new Error(`workspace: ${error?.message}`);
  return data.id;
}

export async function brandFor(job: Job, ws: string): Promise<{ draft: BrandDraft; ogImage: string | null }> {
  const dir = path.resolve("out/five", job.slug);
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "draft.json");
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  let draft: BrandDraft | null = null;
  let raw: Record<string, unknown> | null = null;
  for await (const e of extractBrand(ws, job.url)) {
    if (e.type === "error") console.log(`  [${job.slug}] extraction error ${e.code}`);
    if (e.type === "result") {
      draft = e.brand;
      raw = e.raw;
    }
  }
  if (!draft) throw new Error(`extraction failed for ${job.url}`);
  const og = ((raw?.branding as { images?: { ogImage?: string } } | null)?.images?.ogImage ?? null) as string | null;
  const out = { draft, ogImage: og && /^https?:\/\//.test(og) ? og : null };
  writeFileSync(file, JSON.stringify(out, null, 1));
  return out;
}

export async function briefFor(job: Job, ws: string, draft: BrandDraft, ogImage: string | null): Promise<MotionBrief> {
  const { width, height } = dimensionsFor(job.format);
  let svg: string | null = null;
  if (draft.logoUrl) {
    const logo = await loadLogo(draft.logoUrl);
    if (logo?.contentType === "image/svg+xml") svg = new TextDecoder().decode(logo.bytes);
  }
  return {
    workspaceId: ws,
    videoId: undefined,
    brief: job.brief,
    goal: job.goal,
    format: job.format,
    width,
    height,
    lengthS: job.lengthS,
    pace: job.pace,
    dialect: job.dialect,
    voiceover: false,
    brand: {
      name: draft.name,
      url: (draft.facts.cta_url || draft.websiteUrl).replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, ""),
      tone: draft.tone,
      tagline: draft.tagline,
      colors: draft.colors,
      fonts: draft.fonts,
      hasLogo: Boolean(draft.logoUrl),
      logoUrl: draft.logoUrl,
      logoPlate: draft.logoUrl ? logoNeedsPlate(svg, buildTokens(draft.colors).dark) : false,
      imageUrls: ogImage ? [ogImage] : [],
      imageCount: ogImage ? 1 : 0,
    },
    facts: draft.facts,
  };
}

