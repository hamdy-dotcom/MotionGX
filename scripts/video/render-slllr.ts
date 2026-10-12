// Done-criterion 1: a 30 s Saudi-dialect SLLLR video with music, no voiceover → out/slllr-test.mp4.
// Uses the real pipeline: brand from Supabase (read-only), brand facts (Firecrawl + Haiku),
// script (Sonnet), music from the generated library, render with @remotion/renderer.
// Run: npx tsx --conditions=react-server --env-file=.env.local scripts/video/render-slllr.ts
import { createReadStream, existsSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { loadCompanyBrand, logoNeedsPlate } from "../../lib/video/brand-props";
import { extractBrand, type BrandDraft } from "../../lib/brand/extract";
import { decodeSvgDataUri } from "../../lib/brand/map";
import { buildTokens } from "../../lib/video/tokens";
import { hostOf } from "../../lib/script/schema";
import { scrapeBrand } from "../../lib/brand/firecrawl";
import { pickFactPages, scrapeFactPages, summarizeFacts } from "../../lib/brand/facts";
import { generateScript } from "../../lib/script/generate";
import { PACE_BPM, type BrandVideoProps } from "../../lib/video/kit";
import type { BrandFacts } from "../../lib/brand/types";

const BRIEF = "فيديو قصير يعرّف التجار الجدد بمنصة سلر للدروبشيبنج: يبدأون تجارتهم أونلاين بدون مخزون ولا رأس مال، وسلر يتكفل بالمنتجات والشحن وخدمة العملاء، وندعوهم يسجلوا اليوم.";

async function main() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: companies } = await admin.from("companies").select("id, name, website_url").ilike("website_url", "%slllr%").limit(1);
  const company = companies?.[0];
  if (!company) throw new Error("SLLLR company not found");

  // facts column only exists after 0003 — read it if present.
  const brand = (await loadCompanyBrand(admin, company.id, true)) ?? (await loadCompanyBrand(admin, company.id, false));
  if (!brand) throw new Error("brand load failed");
  console.log("stored brand:", brand.name, brand.video.colors, brand.video.fonts, "logo:", brand.video.logoUrl?.slice(0, 50));

  // The stored SLLLR row still holds the Phase 1 mock (Mantoog) brand from before Phase 2, so the test
  // uses a fresh in-memory extraction of slllr.com (nothing is written back to the company).
  const draftFile = path.resolve("out/slllr-draft.json");
  let draft: BrandDraft | null = existsSync(draftFile) ? JSON.parse(readFileSync(draftFile, "utf8")) : null;
  if (!draft) {
    for await (const e of extractBrand(brand.workspaceId, brand.websiteUrl!)) {
      if (e.type === "step") console.log("step", e.step, e.status);
      if (e.type === "error") console.log("error", e.code);
      if (e.type === "result") draft = e.brand;
    }
    writeFileSync(draftFile, JSON.stringify(draft, null, 2));
  }
  if (!draft) throw new Error("extraction failed");
  const svg = draft.logoUrl ? decodeSvgDataUri(draft.logoUrl) : null;
  brand.name = draft.name;
  brand.profile = { colors: draft.colors, fonts: draft.fonts, tone: draft.tone, tagline: draft.tagline, facts: draft.facts };
  brand.video = {
    ...brand.video,
    name: draft.name,
    logoUrl: draft.logoUrl,
    logoPlate: logoNeedsPlate(svg, buildTokens(draft.colors).dark),
    colors: draft.colors,
    fonts: draft.fonts,
    url: hostOf(draft.facts.cta_url || draft.websiteUrl),
  };
  console.log("real brand:", draft.name, draft.colors, draft.fonts, "tagline:", draft.tagline, "tone:", draft.tone, "plate:", brand.video.logoPlate);

  const cacheFile = path.resolve("out/slllr-facts.json");
  let facts: BrandFacts | null = draft.facts?.what_it_does ? draft.facts : null;
  if (!facts && existsSync(cacheFile)) facts = JSON.parse(readFileSync(cacheFile, "utf8"));
  if (!facts) {
    const home = await scrapeBrand(brand.websiteUrl!);
    const pages = await scrapeFactPages(brand.workspaceId, pickFactPages(home.links, brand.websiteUrl!));
    console.log("fact pages:", pages.map((p) => p.url));
    facts = await summarizeFacts(brand.workspaceId, brand.websiteUrl!, home.markdown ?? "", pages);
    writeFileSync(cacheFile, JSON.stringify(facts, null, 2));
  }
  console.log("facts:", JSON.stringify(facts, null, 1));

  const scriptFile = path.resolve("out/slllr-script.json");
  const script = existsSync(scriptFile) && process.argv.includes("--reuse-script")
    ? JSON.parse(readFileSync(scriptFile, "utf8"))
    : await generateScript({
        workspaceId: brand.workspaceId,
        brief: BRIEF,
        goal: "about",
        format: "9:16",
        lengthS: 30,
        pace: "medium",
        dialect: "sa",
        voiceover: false,
        brand: { name: brand.name, websiteUrl: brand.websiteUrl, profile: { ...(brand.profile ?? { colors: [], fonts: {}, tone: null, tagline: null }), facts } },
      });
  writeFileSync(scriptFile, JSON.stringify(script, null, 2));
  console.log("title:", script.title, "| mood:", script.musicMood);
  console.log("scenes:", script.scenes.map((s: { type: string; duration_beats: number; lines: string[] }) => `${s.type}(${s.duration_beats}) ${s.lines.join(" / ")}`).join("\n  "));
  console.log("distinct types:", new Set(script.scenes.map((s: { type: string }) => s.type)).size);

  // Serve the local music library for the renderer.
  const musicDir = path.resolve("scripts/music/out");
  const server = http.createServer((req, res) => {
    const file = path.join(musicDir, path.basename(req.url ?? ""));
    if (!existsSync(file)) return void res.writeHead(404).end();
    res.writeHead(200, { "Content-Type": "audio/mpeg", "Access-Control-Allow-Origin": "*" });
    createReadStream(file).pipe(res);
  });
  await new Promise<void>((r) => server.listen(4799, r));
  const bpm = PACE_BPM.medium;
  const track = `medium-${script.musicMood}-1.mp3`;

  const props: BrandVideoProps = {
    brand: brand.video,
    scenes: script.scenes,
    format: "9:16",
    fps: 30,
    lengthS: 30,
    lang: "ar",
    bpm,
    music: { url: `http://localhost:4799/${track}`, bpm },
    voiceover: null,
  };
  writeFileSync(path.resolve("out/slllr-props.json"), JSON.stringify(props, null, 2));

  const serveUrl = await bundle({ entryPoint: path.resolve("remotion/index.ts") });
  const composition = await selectComposition({ serveUrl, id: "BrandVideo", inputProps: props });
  const output = path.resolve("out/slllr-test.mp4");
  let last = 0;
  await renderMedia({
    serveUrl,
    composition,
    inputProps: props,
    codec: "h264",
    crf: 20,
    outputLocation: output,
    onProgress: ({ progress }) => {
      if (progress - last >= 0.1) {
        last = progress;
        console.log(`render ${Math.round(progress * 100)}%`);
      }
    },
  });
  server.close();
  console.log("done:", output, "music:", track);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
