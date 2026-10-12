// Phase 3C acceptance run: 5 companies through the spec pipeline.
//   npx tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/motion/generate-3c.ts [slug,slug] [--no-export]
// Per video: concept, behaviors, tokens per call (+ cache hits), AI cost, time to preview; then 6
// contact-sheet stills, a chunked export with the stem music, and hit measurement.
// Outputs: out/<slug>.mp4, out/3c/<slug>/…, out/3c/report.json
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { extractBrand, type BrandDraft } from "../../lib/brand/extract";
import { loadLogo } from "../../lib/brand/logo";
import { logoNeedsPlate } from "../../lib/video/brand-props";
import { buildTokens } from "../../packages/primitives/src/palette";
import { costOf, entryCost } from "../../lib/ai/usage";
import { behaviorsUsed, generateVideo } from "../../lib/motion/generate";
import { measureHits } from "../../lib/motion/music";
import { runSpecJob } from "../../lib/motion/spec-runner";
import { DbStore } from "../../lib/motion/store";
import { dimensionsFor, type MotionBrief } from "../../lib/motion/types";
import type { Dialect, Goal, Pace, VideoFormat } from "../../lib/types";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const CAP = Number(process.env.MOTIONGX_CAP_USD ?? 0.05);

type Job = { slug: string; url: string; dialect: Dialect; format: VideoFormat; lengthS: 15 | 30 | 60; pace: Pace; goal: Goal; brief: string };
const JOBS: Job[] = [
  { slug: "slllr", url: "https://www.slllr.com/", dialect: "sa", format: "9:16", lengthS: 30, pace: "medium", goal: "about", brief: "عرّف التجار الجدد بسلر: يبدأون تجارتهم أونلاين بالدروب شيبنج بدون مخزون ولا رأس مال، وسلر يتكفل بالمنتجات والشحن والتأكيدات. ادعهم يسجلوا اليوم." },
  { slug: "mantoog", url: "https://mantoog.com", dialect: "eg", format: "9:16", lengthS: 30, pace: "fast", goal: "launch", brief: "Launch video for Mantoog: paste a product link and get a full store with AI-written pages, then launch TikTok ads from inside the dashboard. Push sellers to start today." },
  { slug: "tamara", url: "https://tamara.co", dialect: "sa", format: "1:1", lengthS: 30, pace: "calm", goal: "sell", brief: "فيديو هادئ وواثق يشرح إن تمارا تخليك تقسّم مشترياتك على دفعات بدون فوائد في المتاجر اللي تحبها، وندعو الناس يحمّلون التطبيق." },
  { slug: "instabug", url: "https://www.instabug.com", dialect: "en", format: "16:9", lengthS: 30, pace: "medium", goal: "about", brief: "Show mobile teams how Instabug catches crashes and bugs with full context so they ship better apps faster. End with a call to try it." },
  { slug: "breadfast", url: "https://www.breadfast.com", dialect: "eg", format: "9:16", lengthS: 15, pace: "fast", goal: "sell", brief: "إعلان سريع لبريدفاست: البقالة والعيش الطازة يوصلوا لحد باب البيت في دقايق. خلّي الناس تطلب دلوقتي من التطبيق." },
];

// throwaway workspaces (no members); MOTIONGX_WS_TAG gives test iterations a fresh hourly AI limit
async function workspaceFor(slug: string): Promise<string> {
  const name = `[test] ${process.env.MOTIONGX_WS_TAG ?? "3C"} ${slug}`;
  const { data: found } = await admin.from("workspaces").select("id").eq("name", name).maybeSingle();
  if (found) return found.id;
  const { data, error } = await admin.from("workspaces").insert({ name, country_code: "EG", currency_code: "USD" }).select("id").single();
  if (error || !data) throw new Error(`workspace: ${error?.message}`);
  return data.id;
}

async function brandFor(job: Job, ws: string): Promise<{ draft: BrandDraft; ogImage: string | null }> {
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

async function briefFor(job: Job, ws: string, draft: BrandDraft, ogImage: string | null): Promise<MotionBrief> {
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

(async () => {
  const only = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2].split(",") : null;
  const doExport = !process.argv.includes("--no-export");
  const root = path.resolve("out/3c");
  mkdirSync(root, { recursive: true });
  const reportFile = path.join(root, "report.json");
  const report: Record<string, unknown> = existsSync(reportFile) ? JSON.parse(readFileSync(reportFile, "utf8")) : {};
  const store = new DbStore(admin);

  for (const job of JOBS) {
    if (only && !only.includes(job.slug)) continue;
    const ws = await workspaceFor(job.slug);
    const dir = path.join(root, job.slug);
    mkdirSync(dir, { recursive: true });
    console.log(`\n=== ${job.slug} (${job.url}) · ${job.format} ${job.lengthS}s ${job.dialect} ===`);
    const { draft, ogImage } = await brandFor(job, ws);
    const brief = await briefFor(job, ws, draft, ogImage);
    console.log(`  brand: ${draft.name} · ${draft.colors.map((c) => c.hex).join(" ")} · ${draft.fonts.arabic}/${draft.fonts.latin} · logo ${Boolean(draft.logoUrl)}`);

    let g;
    try {
      g = await generateVideo(brief, store, dir, { capUsd: CAP, printCost: true });
    } catch (err) {
      console.error(`  FAILED: ${err instanceof Error ? err.message : err}`);
      report[job.slug] = { error: String(err) };
      writeFileSync(reportFile, JSON.stringify(report, null, 1));
      continue;
    }
    writeFileSync(path.join(dir, "spec.json"), JSON.stringify(g.spec, null, 1));
    writeFileSync(path.join(dir, "plan.json"), JSON.stringify(g.plan, null, 1));
    const behaviors = behaviorsUsed(g.spec);
    console.log(`  concept: "${g.plan.motion_language}" — ${g.plan.concept}`);
    console.log(`  summary: ${g.plan.summary_en} (nearest previous ${g.similarity.toFixed(2)}, concept redos ${g.conceptRedos})`);
    console.log(`  spec: ${g.spec.elements.length} elements, ${behaviors.length} behaviors: ${behaviors.join(", ")}`);
    console.log(`  rounds: ${g.specRun.rounds.map((r) => `${r.stage}${r.model ? `(${r.model.replace("claude-", "")})` : ""}→${r.issues} issues${r.autoFixed ? `, ${r.autoFixed} auto-fixed` : ""} ${(r.ms / 1000).toFixed(1)}s`).join(" | ")}`);
    if (g.specRun.issues.length) console.log(`  REMAINING ISSUES: ${g.specRun.issues.map((i) => `[${i.code}] ${i.id}: ${i.msg}`).join(" ; ")}`);
    console.log(`  ▶ preview ready in ${(g.toPreviewMs / 1000).toFixed(1)}s · AI $${g.costUsd.toFixed(4)} · status ${g.status} · timings ${JSON.stringify(Object.fromEntries(Object.entries(g.timings).map(([k, v]) => [k, Number((v / 1000).toFixed(1))])))}`);

    const bg = await g.background;
    console.log(`  taste: ${bg.taste ? `${bg.taste.score}/10 looks_good=${bg.taste.looks_good} brand_clear=${bg.taste.brand_clear} — ${bg.taste.note}` : "skipped"} (+$${bg.costUsd.toFixed(4)})`);

    // contact sheet stills (6) + export
    const sheetTimes = [0.1, 0.27, 0.44, 0.61, 0.78, 0.93].map((f) => Number((f * job.lengthS).toFixed(2)));
    const props = { spec: g.spec, input: g.input, audio: { music: null, sfx: null, voiceover: null }, custom: g.custom };
    const sheet = await runSpecJob({ task: "stills", props, times: sheetTimes, outDir: path.join(dir, "sheet"), scale: 0.5 });
    let exportInfo: Record<string, unknown> = {};
    let hits: Awaited<ReturnType<typeof measureHits>> = [];
    if (doExport && g.status === "ready") {
      const t0 = Date.now();
      const out = path.resolve(`out/${job.slug}.mp4`);
      const r = await runSpecJob({ task: "render", props, output: out, audioFile: g.audio.mix });
      exportInfo = r.ok ? { file: out, seconds: Number(((Date.now() - t0) / 1000).toFixed(1)), timings: r.timings } : { error: r.errors };
      console.log(r.ok ? `  export → ${out} in ${((Date.now() - t0) / 1000).toFixed(1)}s ${JSON.stringify(r.timings)}` : `  export FAILED ${r.errors.join("; ")}`);
      hits = await measureHits(g.audio.mixWav, g.plan.energy, dir);
    }
    const calls = [...g.usage, ...bg.usage].map((u) => ({ kind: u.kind, model: u.model.replace("claude-", ""), in: u.input_tokens, cached: u.cache_read ?? 0, cache_write: u.cache_write ?? 0, out: u.output_tokens, usd: Number(entryCost(u).toFixed(5)), s: u.ms ? Number((u.ms / 1000).toFixed(1)) : null }));
    report[job.slug] = {
      brand: draft.name,
      format: job.format,
      length_s: job.lengthS,
      dialect: job.dialect,
      status: g.status,
      title: g.plan.title,
      concept: g.plan.concept,
      summary_en: g.plan.summary_en,
      motion_language: g.plan.motion_language,
      similarity_to_nearest_previous: Number(g.similarity.toFixed(3)),
      concept_redos: g.conceptRedos,
      refs: g.refs.map((r) => ({ id: r.id, creator: r.creator, label: r.label })),
      elements: g.spec.elements.length,
      behaviors,
      validation: { remaining: g.specRun.issues, rounds: g.specRun.rounds, model: g.specRun.model },
      calls,
      cost_usd: Number(g.costUsd.toFixed(5)),
      cost_with_taste_usd: Number((g.costUsd + bg.costUsd).toFixed(5)),
      cost_by_step: costOf(g.usage).byKind,
      to_preview_s: Number((g.toPreviewMs / 1000).toFixed(1)),
      timings_s: Object.fromEntries(Object.entries(g.timings).map(([k, v]) => [k, Number((v / 1000).toFixed(2))])),
      taste: bg.taste,
      audio: { lufs: g.audio.lufs, peak_dbfs: g.audio.truePeak, music_ms: g.audio.ms, events: g.events.length },
      energy_map: g.plan.energy,
      measured_hits: hits,
      sheet: sheet.ok ? sheet.stills : sheet.errors,
      export: exportInfo,
    };
    writeFileSync(reportFile, JSON.stringify(report, null, 1));
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
