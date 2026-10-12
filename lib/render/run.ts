import "server-only";
import { readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadCompanyBrand } from "@/lib/video/brand-props";
import { runMotionJob } from "@/lib/motion/runner";
import { runtimeInput } from "@/lib/motion/pipeline";
import { dimensionsFor } from "@/lib/motion/types";
import { EMPTY_FACTS } from "@/lib/brand/types";
import type { Treatment } from "@/lib/motion/director";
import type { ScriptBeat } from "@motiongx/primitives";
import type { Video } from "@/lib/types";

/**
 * Renders a queued export: status `rendering` → MP4 (rendered by the isolated motion worker / Vercel
 * Sandbox) uploaded to renders/{workspace_id}/{render_id}.mp4 → status `done`, video `ready`.
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
    if (!version.composition_js || !version.treatment) throw new Error("this version has no generated composition");

    await admin.from("renders").update({ status: "rendering", progress: 0.05, updated_at: new Date().toISOString() }).eq("id", renderId);
    if (opts.forceFailure || process.env.MOTIONGX_FORCE_RENDER_FAILURE === "1") throw new Error("forced failure (test)");

    const v = video as Video;
    const brand = await loadCompanyBrand(admin, v.company_id);
    if (!brand) throw new Error("brand missing");
    const { width, height } = dimensionsFor(v.format);
    const treatment = version.treatment as Treatment;
    const script = { title: v.title, beats: version.scenes as ScriptBeat[] };
    const input = runtimeInput(
      {
        workspaceId: v.workspace_id,
        brief: v.brief,
        goal: v.goal,
        format: v.format,
        width,
        height,
        lengthS: v.length_s,
        pace: v.pace,
        dialect: v.dialect,
        voiceover: v.voiceover,
        brand: {
          name: brand.name,
          url: (brand.video.url ?? "").replace(/^https?:\/\//, ""),
          tone: "",
          tagline: "",
          colors: brand.video.colors,
          fonts: brand.video.fonts,
          hasLogo: Boolean(brand.video.logoUrl),
          logoUrl: brand.video.logoUrl,
          logoPlate: brand.video.logoPlate,
          imageUrls: brand.video.imageUrls,
          imageCount: brand.video.imageUrls.length,
        },
        facts: EMPTY_FACTS,
      },
      treatment.energy,
      script,
    );
    const audio = (version.audio ?? {}) as { mix?: string; sfx?: string };
    const publicUrl = (p?: string) => (p ? admin.storage.from("music").getPublicUrl(p).data.publicUrl : null);
    const music = v.music_enabled === false ? publicUrl(audio.sfx) : publicUrl(audio.mix);

    const res = await runMotionJob({ task: "render", js: version.composition_js, input, audio: { music, sfx: null, voiceover: null }, output: out });
    if (!res.ok) throw new Error(`${res.stage}: ${res.errors.join("; ")}`);
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
