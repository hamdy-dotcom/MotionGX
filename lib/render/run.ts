import "server-only";
import { writeFileSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import { briefFor, runtimeInputWithAssets } from "@/lib/motion/app";
import { runSpecJob } from "@/lib/motion/spec-runner";
import { verifyMp4 } from "@/lib/motion/verify-mp4";
import type { Plan } from "@/lib/motion/plan";
import type { MotionSpec } from "@/lib/motion/spec";
import type { SpecVideoProps } from "@/remotion/SpecVideo";
import type { Video } from "@/lib/types";

/**
 * Renders a queued export: status `rendering` → MP4 (the version's MotionSpec, rendered in parallel
 * chunks by the isolated spec worker — Vercel Sandbox in production, unverified — with the mastered
 * mix muxed once) uploaded to renders/{workspace_id}/{render_id}.mp4 → status `done`, video `ready`.
 * Any failure calls refund_render(), which credits the wallet back.
 */
export async function runRender(renderId: string, opts: { forceFailure?: boolean } = {}) {
  const admin = createAdminClient();
  const fail = async (message: string) => {
    console.error("[render] failed", { renderId, message });
    const { error } = await admin.rpc("refund_render", { p_render_id: renderId, p_error: message.slice(0, 500) });
    if (error) console.error("[render] refund failed", { renderId, code: error.code, message: error.message });
  };

  const out = path.join(os.tmpdir(), `mgx-render-${renderId}.mp4`);
  try {
    const { data: render } = await admin.from("renders").select("id, video_id, version_id, status").eq("id", renderId).single();
    if (!render || render.status !== "queued") return;
    const { data: video } = await admin.from("videos").select("*").eq("id", render.video_id).single();
    const { data: version } = await admin.from("video_versions").select("*").eq("id", render.version_id).single();
    if (!video || !version) throw new Error("video or version missing");

    await admin.from("renders").update({ status: "rendering", progress: 0.05, updated_at: new Date().toISOString() }).eq("id", renderId);
    if (opts.forceFailure || process.env.MOTIONGX_FORCE_RENDER_FAILURE === "1") throw new Error("forced failure (test)");

    const v = video as Video;
    if (!version.spec || !version.plan) throw new Error("this version has no MotionSpec (made with the old engine — generate another direction)");
    const brief = await briefFor(v);
    if (!brief) throw new Error("brand missing");
    const plan = { ...(version.plan as Plan), beats: version.scenes } as Plan;
    const audio = (version.audio ?? {}) as { mix?: string; sfx?: string };
    // the soundtrack is muxed once after the chunks render: download it next to the output
    const track = v.music_enabled === false ? audio.sfx : audio.mix;
    let audioFile: string | null = null;
    if (track) {
      const { data: blob } = await admin.storage.from("music").download(track);
      if (blob) {
        audioFile = out.replace(/\.mp4$/, path.extname(track));
        writeFileSync(audioFile, Buffer.from(await blob.arrayBuffer()));
      }
    }
    const props: SpecVideoProps = { spec: version.spec as MotionSpec, input: await runtimeInputWithAssets(brief, plan, version.spec as MotionSpec), audio: { music: null, sfx: null, voiceover: null }, custom: (version.custom_js ?? {}) as Record<string, string> };
    const res = await runSpecJob({ task: "render", props, output: out, audioFile });
    if (audioFile) await rm(audioFile, { force: true });
    if (!res.ok) throw new Error(`render: ${res.errors.join("; ")}`);
    // post-encode verification: a broken file (wrong length/fps/size, no or silent audio, black or frozen
    // stretches) is never delivered — the export fails and the wallet is refunded
    const check = await verifyMp4(out, { duration: brief.lengthS, fps: 30, width: brief.width, height: brief.height, audio: Boolean(audioFile) });
    if (check.warnings.length) console.warn("[render] verification warnings", { renderId, warnings: check.warnings });
    if (!check.ok) throw new Error(`export verification failed: ${check.problems.join("; ")}`);
    await admin.from("renders").update({ progress: 0.95, updated_at: new Date().toISOString() }).eq("id", renderId);

    const outputPath = `${v.workspace_id}/${renderId}.mp4`;
    const { error: upErr } = await admin.storage.from("renders").upload(outputPath, await readFile(out), { contentType: "video/mp4", upsert: true });
    if (upErr) throw new Error(`upload failed: ${upErr.message}`);
    await admin.from("renders").update({ status: "done", progress: 1, output_path: outputPath, updated_at: new Date().toISOString() }).eq("id", renderId);
    await admin.from("videos").update({ status: "ready" }).eq("id", v.id);
  } catch (err) {
    await fail(err instanceof Error ? err.message : String(err));
  } finally {
    await rm(out, { force: true });
  }
}
