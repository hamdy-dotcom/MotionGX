// Phase 3B acceptance run: 5 videos for 5 companies through the full generative pipeline.
//   npx tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/motion/generate-five.ts [slug,slug]
// Outputs: out/<slug>.mp4, out/contact-sheet.png, out/five/report.json (+ per-video work dirs).
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { extractBrand, type BrandDraft } from "../../lib/brand/extract";
import { loadLogo } from "../../lib/brand/logo";
import { logoNeedsPlate } from "../../lib/video/brand-props";
import { buildTokens } from "../../packages/primitives/src/palette";
import { FileStore } from "../../lib/motion/store";
import { costOf, generateMotion, type PipelineResult } from "../../lib/motion/pipeline";
import { runMotionJob } from "../../lib/motion/runner";
import { dimensionsFor, type MotionBrief } from "../../lib/motion/types";
import type { Dialect, Goal, Pace, VideoFormat } from "../../lib/types";

// A throwaway workspace (no members) so test calls never count against a real workspace's limit.
const WORKSPACE = process.env.MOTIONGX_TEST_WORKSPACE ?? "6bf66e75-0cc0-457b-ab4e-7c758034cdfd";

type Job = { slug: string; url: string; dialect: Dialect; format: VideoFormat; lengthS: 15 | 30 | 60; pace: Pace; goal: Goal; brief: string };

const JOBS: Job[] = [
  { slug: "slllr", url: "https://www.slllr.com/", dialect: "sa", format: "9:16", lengthS: 30, pace: "medium", goal: "about", brief: "عرّف التجار الجدد بسلر: يبدأون تجارتهم أونلاين بالدروب شيبنج بدون مخزون ولا رأس مال، وسلر يتكفل بالمنتجات والشحن والتأكيدات. ادعهم يسجلوا اليوم." },
  { slug: "mantoog", url: "https://mantoog.com", dialect: "eg", format: "9:16", lengthS: 30, pace: "fast", goal: "launch", brief: "Launch video for Mantoog: paste a product link and get a full store with AI-written pages, then launch TikTok ads from inside the dashboard. Push sellers to start today." },
  { slug: "tamara", url: "https://tamara.co", dialect: "sa", format: "1:1", lengthS: 30, pace: "calm", goal: "sell", brief: "فيديو هادئ وواثق يشرح إن تمارا تخليك تقسّم مشترياتك على دفعات بدون فوائد في المتاجر اللي تحبها، وندعو الناس يحمّلون التطبيق." },
  { slug: "instabug", url: "https://www.instabug.com", dialect: "en", format: "16:9", lengthS: 30, pace: "medium", goal: "about", brief: "Show mobile teams how Instabug catches crashes and bugs with full context so they ship better apps faster. End with a call to try it." },
  { slug: "breadfast", url: "https://www.breadfast.com", dialect: "eg", format: "9:16", lengthS: 15, pace: "fast", goal: "sell", brief: "إعلان سريع لبريدفاست: البقالة والعيش الطازة يوصلوا لحد باب البيت في دقايق. خلّي الناس تطلب دلوقتي من التطبيق." },
];

async function brandFor(job: Job, dir: string): Promise<{ draft: BrandDraft; ogImage: string | null }> {
  const file = path.join(dir, "draft.json");
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  let draft: BrandDraft | null = null;
  let raw: Record<string, unknown> | null = null;
  for await (const e of extractBrand(WORKSPACE, job.url)) {
    if (e.type === "step") console.log(`  [${job.slug}] step ${e.step}: ${e.status}`);
    if (e.type === "error") console.log(`  [${job.slug}] error ${e.code}`);
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

async function briefFor(job: Job, draft: BrandDraft, ogImage: string | null): Promise<MotionBrief> {
  const { width, height } = dimensionsFor(job.format);
  let svg: string | null = null;
  if (draft.logoUrl) {
    const logo = await loadLogo(draft.logoUrl);
    if (logo?.contentType === "image/svg+xml") svg = new TextDecoder().decode(logo.bytes);
  }
  return {
    workspaceId: WORKSPACE,
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

async function main() {
  const only = process.argv[2]?.split(",");
  const root = path.resolve("out/five");
  mkdirSync(root, { recursive: true });
  const reportFile = path.join(root, "report.json");
  const report: Record<string, unknown> = existsSync(reportFile) ? JSON.parse(readFileSync(reportFile, "utf8")) : {};
  const store = new FileStore();

  // Serve generated audio to the renderer.
  const server = http.createServer((req, res) => {
    const file = path.join(root, decodeURIComponent((req.url ?? "").split("?")[0]));
    if (!file.startsWith(root) || !existsSync(file)) return void res.writeHead(404).end();
    res.writeHead(200, { "Content-Type": "audio/mpeg", "Access-Control-Allow-Origin": "*" });
    createReadStream(file).pipe(res);
  });
  await new Promise<void>((r) => server.listen(4798, r));

  for (const job of JOBS) {
    if (only && !only.includes(job.slug)) continue;
    const dir = path.join(root, job.slug);
    mkdirSync(dir, { recursive: true });
    console.log(`\n=== ${job.slug} (${job.url}) ===`);
    const started = Date.now();
    const { draft, ogImage } = await brandFor(job, dir);
    const brief = await briefFor(job, draft, ogImage);
    console.log(`  brand: ${draft.name} colors=${draft.colors.map((c) => c.hex).join(",")} fonts=${draft.fonts.arabic}/${draft.fonts.latin} logo=${Boolean(draft.logoUrl)} plate=${brief.brand.logoPlate}`);

    const t0 = Date.now();
    let result: PipelineResult;
    try {
      result = await generateMotion(brief, store, dir, { progress: (s, d) => console.log(`  … ${s}${d ? ` ${d}` : ""} (${Math.round((Date.now() - t0) / 1000)}s)`), seed: job.slug.length * 13 });
    } catch (err) {
      console.error(`  FAILED: ${err instanceof Error ? err.message : err}`);
      report[job.slug] = { error: String(err) };
      writeFileSync(reportFile, JSON.stringify(report, null, 1));
      continue;
    }
    const genMs = Date.now() - t0;
    writeFileSync(path.join(dir, "composition.tsx"), result.code ?? "// no passing version");
    writeFileSync(path.join(dir, "treatment.json"), JSON.stringify(result.treatment, null, 1));
    writeFileSync(path.join(dir, "script.json"), JSON.stringify(result.script, null, 1));
    writeFileSync(path.join(dir, "qa.json"), JSON.stringify(result.qa, null, 1));
    console.log(`  treatment: "${result.treatment.motion_language}" — ${result.treatment.concept.slice(0, 140)}`);
    console.log(`  QA: ${result.qa.map((q) => `r${q.round}:${q.pass ? "PASS" : `fail(${q.issues.length})`}`).join(" ")} → ${result.status}`);

    let renderMs = 0;
    if (result.status === "passed" && result.js && result.audio) {
      const t1 = Date.now();
      const out = path.resolve(`out/${job.slug}.mp4`);
      const rel = path.relative(root, result.audio.mix);
      const r = await runMotionJob({ task: "render", js: result.js, input: result.input, audio: { music: `http://localhost:4798/${rel}`, sfx: null, voiceover: null }, output: out });
      renderMs = Date.now() - t1;
      console.log(r.ok ? `  rendered ${out} (${Math.round(renderMs / 1000)}s)` : `  render failed: ${r.errors.join("; ")}`);
      // 6 contact-sheet stills
      const L = job.lengthS;
      await runMotionJob({ task: "validate", source: result.code!, input: result.input, stills: [0.12, 0.28, 0.45, 0.6, 0.78, 0.93].map((f) => ({ t: Number((f * L).toFixed(2)), label: "sheet" })), outDir: path.join(dir, "sheet"), staticScan: false });
    }
    const cost = costOf(result.usage);
    report[job.slug] = {
      url: job.url,
      brand: draft.name,
      format: job.format,
      length_s: job.lengthS,
      dialect: job.dialect,
      status: result.status,
      motion_language: result.treatment.motion_language,
      concept: result.treatment.concept,
      similarity_to_nearest_previous: Number(result.similarity.toFixed(3)),
      refs: result.refIds,
      qa_rounds: result.qa.map((q) => ({ round: q.round, pass: q.pass, score: q.score, issues: q.issues.map((i) => `${i.check}${i.t !== null ? `@${i.t}` : ""}: ${i.detail}`) })),
      energy_map: result.treatment.energy,
      measured_hits: result.audio?.hits ?? [],
      loudness: result.audio?.report ?? null,
      cost_usd: Number(cost.usd.toFixed(4)),
      cost_by_step: cost.byKind,
      generate_seconds: Math.round(genMs / 1000),
      render_seconds: Math.round(renderMs / 1000),
      total_seconds: Math.round((Date.now() - started) / 1000),
      timings_ms: result.timings,
    };
    writeFileSync(reportFile, JSON.stringify(report, null, 1));
    console.log(`  cost $${cost.usd.toFixed(3)} · generate ${Math.round(genMs / 1000)}s · render ${Math.round(renderMs / 1000)}s`);
  }
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
