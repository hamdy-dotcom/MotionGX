// End-to-end edit-safety check on a THROWAWAY video (never a live row):
//   v1 = a known spec → a real «اطلب تعديلًا» edit (AI, dry-run + revision CAS) → v2 with an inverse patch
//   → a stale edit against v1 must be rejected without AI → undo must reproduce v1's revision exactly.
//   npx tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/motion/undo-e2e.ts [--keep] [--no-undo]
// --no-undo leaves v2 in place so the studio's «تراجع» button can be clicked in the browser.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { runGeneration, undoLatest } from "../../lib/motion/app";
import { historyFor, specRevision, undoSpec, type VersionHistory } from "../../lib/motion/revision";
import type { MotionSpec } from "../../lib/motion/spec";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const WS = "00000000-0000-0000-0000-00000000d3e0";
const COMPANY = "2bf6ad1a-fdac-4216-bb22-876bca060c03"; // SLLLR

(async () => {
  const spec = JSON.parse(readFileSync("out/3c/slllr/spec.json", "utf8")) as MotionSpec;
  const plan = JSON.parse(readFileSync("out/3c/slllr/plan.json", "utf8"));
  const { data: video, error } = await admin
    .from("videos")
    .insert({ workspace_id: WS, company_id: COMPANY, title: "[test] 3D undo check", brief: "عرّف التجار الجدد بسلر: يبدأون تجارتهم أونلاين بالدروب شيبنج بدون مخزون ولا رأس مال. ادعهم يسجلوا اليوم.", goal: "about", format: "9:16", length_s: 30, pace: "medium", dialect: "sa", voiceover: false, status: "ready" })
    .select("*")
    .single();
  if (error || !video) throw new Error(`video insert: ${error?.message}`);
  console.log(`throwaway video ${video.id}`);
  const base = `generated/${WS}/${video.id}/v1`;
  for (const f of ["mix.mp3", "sfx.mp3"]) await admin.storage.from("music").upload(`${base}/${f}`, readFileSync(`out/3c/slllr/audio/${f}`), { contentType: "audio/mpeg", upsert: true });
  const v1rev = specRevision(spec);
  const { error: e1 } = await admin.from("video_versions").insert({ video_id: video.id, version: 1, scenes: plan.beats, script: { title: plan.title, generator: "spec", motion_language: plan.motion_language }, spec, plan, custom_js: {}, energy_map: plan.energy, qa: { validation: [], history: historyFor(spec, "new", null) }, audio: { mix: `${base}/mix.mp3`, sfx: `${base}/sfx.mp3` } });
  if (e1) throw new Error(`v1 insert: ${e1.message}`);
  console.log(`v1 revision ${v1rev}`);

  // 1. a real edit (AI) against v1
  const t0 = Date.now();
  await runGeneration(video.id, { kind: "edit", instruction: "خلّي زرار الاشتراك في الآخر بلون الـ accent، وكبّر عنوان أول مشهد شوية", baseRevision: v1rev });
  const { data: g1 } = await admin.from("videos").select("generation").eq("id", video.id).single();
  console.log(`edit → ${JSON.stringify(g1?.generation)} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  const { data: v2 } = await admin.from("video_versions").select("*").eq("video_id", video.id).eq("version", 2).maybeSingle();
  if (!v2) throw new Error("edit produced no v2");
  const h2 = (v2.qa as { history: VersionHistory; validation: { stage: string; issues: number }[] }).history;
  console.log(`v2 revision ${specRevision(v2.spec)} · origin ${h2.origin} · parent v${h2.parent_version} (${h2.parent_revision}) · inverse patch ${h2.inverse_patch?.length} ops · rounds ${(v2.qa as { validation: { stage: string; issues: number }[] }).validation.map((r) => `${r.stage}→${r.issues}`).join(" | ")}`);
  const offline = undoSpec(v2.spec as MotionSpec, h2);
  console.log(`offline undo reproduces v1: ${offline.ok && specRevision(offline.spec) === v1rev}`);

  // 2. a stale edit (made against v1 after v2 landed) is rejected before any AI call
  await runGeneration(video.id, { kind: "edit", instruction: "غيّر الخلفية", baseRevision: v1rev });
  const { data: g2 } = await admin.from("videos").select("generation").eq("id", video.id).single();
  const { count } = await admin.from("video_versions").select("id", { count: "exact", head: true }).eq("video_id", video.id);
  console.log(`stale edit → stage ${(g2?.generation as { stage?: string })?.stage} · versions ${count} (expected edit_stale, 2)`);

  if (process.argv.includes("--no-undo")) {
    console.log(`\nleft at v2 for the studio check: /ar/videos/${video.id}`);
    return;
  }
  // 3. undo (the same server function the studio button calls) + a stale undo
  const staleUndo = await undoLatest(video.id, { version: 1, revision: v1rev });
  console.log(`stale undo → ${JSON.stringify(staleUndo)} (expected stale)`);
  const res = await undoLatest(video.id, { version: 2, revision: specRevision(v2.spec) });
  const { data: v3 } = await admin.from("video_versions").select("*").eq("video_id", video.id).eq("version", 3).maybeSingle();
  console.log(`undo → ${JSON.stringify(res)} · v3 revision ${v3 ? specRevision(v3.spec) : "-"} === v1 ${v3 ? specRevision(v3.spec) === v1rev : false}`);
  if (!process.argv.includes("--keep")) {
    await admin.from("video_versions").delete().eq("video_id", video.id);
    await admin.from("videos").delete().eq("id", video.id);
    await admin.storage.from("music").remove([`${base}/mix.mp3`, `${base}/sfx.mp3`]);
    console.log("throwaway removed");
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
