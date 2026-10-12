import "server-only";
import { readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildVideoProps, type VideoRow } from "@/lib/video/props";
import type { BrandVideoProps } from "@/lib/video/kit";

type Progress = (p: number) => void;

/** Remotion bundle for local renders, built once per server process. */
const g = globalThis as unknown as { __mgxBundle?: Promise<string> };

async function renderLocally(props: BrandVideoProps, onProgress: Progress): Promise<Buffer> {
  const { bundle } = await import("@remotion/bundler");
  const { renderMedia, selectComposition } = await import("@remotion/renderer");
  g.__mgxBundle ??= bundle({ entryPoint: path.resolve(process.cwd(), "remotion/index.ts") });
  const serveUrl = await g.__mgxBundle;
  const composition = await selectComposition({ serveUrl, id: "BrandVideo", inputProps: props });
  const out = path.join(os.tmpdir(), `mgx-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`);
  try {
    await renderMedia({ serveUrl, composition, inputProps: props, codec: "h264", crf: 20, outputLocation: out, onProgress: ({ progress }) => onProgress(progress) });
    return await readFile(out);
  } finally {
    await rm(out, { force: true });
  }
}

/** Vercel Sandbox render (@remotion/vercel). The bundle is prebuilt into .remotion-bundle at build time. */
async function renderOnVercel(props: BrandVideoProps, onProgress: Progress): Promise<Buffer> {
  const { addBundleToSandbox, createSandbox, renderMediaOnVercel } = await import("@remotion/vercel");
  const sandbox = await createSandbox();
  try {
    await addBundleToSandbox({ sandbox, bundleDir: path.join(process.cwd(), ".remotion-bundle") });
    const { sandboxFilePath } = await renderMediaOnVercel({
      sandbox,
      compositionId: "BrandVideo",
      inputProps: props as unknown as Record<string, unknown>,
      codec: "h264",
      crf: 20,
      onProgress: (u) => onProgress(u.overallProgress),
    });
    return await sandbox.readFileToBuffer({ path: sandboxFilePath }).then((b) => {
      if (!b) throw new Error("rendered file missing in sandbox");
      return Buffer.from(b);
    });
  } finally {
    await sandbox.stop().catch(() => undefined);
  }
}

/**
 * Renders a queued export: status `rendering` → MP4 uploaded to renders/{workspace_id}/{render_id}.mp4 →
 * status `done`, video `ready`. Any failure calls refund_render(), which credits the wallet back.
 * Progress (0..1) is written to the renders row; the studio follows it through Supabase Realtime.
 */
export async function runRender(renderId: string, opts: { forceFailure?: boolean } = {}) {
  const admin = createAdminClient();
  const fail = async (message: string) => {
    console.error("[render] failed", { renderId, message });
    const { error } = await admin.rpc("refund_render", { p_render_id: renderId, p_error: message.slice(0, 500) });
    if (error) console.error("[render] refund failed", { renderId, code: error.code, message: error.message });
  };

  try {
    const { data: render } = await admin.from("renders").select("id, video_id, version_id, status").eq("id", renderId).single();
    if (!render || render.status !== "queued") return;
    const { data: video } = await admin.from("videos").select("*").eq("id", render.video_id).single();
    const { data: version } = await admin.from("video_versions").select("scenes").eq("id", render.version_id).single();
    if (!video || !version) throw new Error("video or version missing");

    const built = await buildVideoProps(admin, video as VideoRow, version.scenes);
    if (!built) throw new Error("brand missing");

    await admin.from("renders").update({ status: "rendering", progress: 0, updated_at: new Date().toISOString() }).eq("id", renderId);

    let lastWrite = 0;
    let lastValue = 0;
    const onProgress: Progress = (p) => {
      const now = Date.now();
      if (p - lastValue < 0.04 && now - lastWrite < 3000) return;
      lastValue = p;
      lastWrite = now;
      void admin.from("renders").update({ progress: Math.min(0.97, Math.max(0, p)), updated_at: new Date().toISOString() }).eq("id", renderId);
    };

    if (opts.forceFailure || process.env.MOTIONGX_FORCE_RENDER_FAILURE === "1") throw new Error("forced failure (test)");

    const mp4 = process.env.VERCEL ? await renderOnVercel(built.props, onProgress) : await renderLocally(built.props, onProgress);

    const outputPath = `${video.workspace_id}/${renderId}.mp4`;
    const { error: upErr } = await admin.storage.from("renders").upload(outputPath, mp4, { contentType: "video/mp4", upsert: true });
    if (upErr) throw new Error(`upload failed: ${upErr.message}`);

    await admin.from("renders").update({ status: "done", progress: 1, output_path: outputPath, updated_at: new Date().toISOString() }).eq("id", renderId);
    await admin.from("videos").update({ status: "ready" }).eq("id", video.id);
  } catch (err) {
    await fail(err instanceof Error ? err.message : String(err));
  }
}
