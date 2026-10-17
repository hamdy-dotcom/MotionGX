import type { NextRequest } from "next/server";
import { getApiContext } from "@/lib/context";
import { assertWithinRateLimit, toAiErrorCode } from "@/lib/ai/usage";
import { normalizeUrl, urlKey } from "@/lib/brand/url";
import { liveEngineEnabled } from "@/lib/live-engine/config";
import { answerCaptureCode, captureProgress, startBrandCapture } from "@/lib/live-engine/server/jobs";
import { brandDraftFrom } from "@/lib/live-engine/server/brand-draft";
import { brandFiles } from "@/lib/live-engine/server/brand-files";

/**
 * "طلّع الهوية" with VIDEO_ENGINE=live: the sandbox's capture (public crawl + sign-up agent + feature tour)
 * and profile, run as a worker job (~10 min).
 *   POST {url, refresh?, companyId?}  → {captureId, reused}
 *   POST {captureId, code}            → the SMS code the agent asked for
 *   GET  ?id=<captureId>              → progress; brand draft (the Add-company fields) once brand.json exists
 *   GET  ?id=<captureId>&files=1      → "ملفات البراند": logo, screens, UI blocks, images, agent trace (signed URLs)
 */
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!liveEngineEnabled()) return Response.json({ error: "not_found" }, { status: 404 });
  const ctx = await getApiContext();
  if (!ctx) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (ctx.role === "viewer") return Response.json({ error: "forbidden" }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { url?: string; refresh?: boolean; companyId?: string; captureId?: string; code?: string };

  if (body.captureId) {
    const ok = Boolean(body.code?.trim()) && (await answerCaptureCode(ctx.workspace.id, body.captureId, String(body.code)));
    return Response.json({ ok });
  }

  const url = normalizeUrl(String(body.url ?? ""));
  if (!urlKey(url)) return Response.json({ error: "invalid_url" }, { status: 400 });
  if (body.companyId) {
    const { data } = await ctx.supabase.from("companies").select("id").eq("id", body.companyId).maybeSingle(); // RLS
    if (!data) return Response.json({ error: "not_found" }, { status: 404 });
  }
  try {
    await assertWithinRateLimit(ctx.workspace.id);
    return Response.json(await startBrandCapture(ctx.workspace.id, url, { refresh: Boolean(body.refresh), companyId: body.companyId ?? null }));
  } catch (err) {
    console.error("[brand/capture] start failed", { url, err });
    return Response.json({ error: toAiErrorCode(err) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (!liveEngineEnabled()) return Response.json({ error: "not_found" }, { status: 404 });
  const ctx = await getApiContext();
  if (!ctx) return Response.json({ error: "unauthorized" }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "bad_request" }, { status: 400 });
  if (request.nextUrl.searchParams.get("files") === "1") {
    const files = await brandFiles(ctx.workspace.id, id);
    return files ? Response.json(files) : Response.json({ error: "not_found" }, { status: 404 });
  }
  const p = await captureProgress(ctx.workspace.id, id);
  if (!p) return Response.json({ error: "not_found" }, { status: 404 });
  const { profile, prefix, ...progress } = p;
  const brand = profile ? await brandDraftFrom(profile, { siteUrl: String(profile.site ?? ""), prefix }) : null;
  return Response.json({ ...progress, brand, raw: brand ? { source: "live", capture_id: id } : null });
}
