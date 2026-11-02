import type { NextRequest } from "next/server";
import { getApiContext } from "@/lib/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { toAiErrorCode } from "@/lib/ai/usage";
import { InsufficientBalance, metered } from "@/lib/billing";
import { isLanguage, makeDirections, makeIdentity, MAX_FILE_BYTES, MAX_FILES, MAX_ROUNDS, nextQuestion, readFiles, type UploadedFile } from "@/lib/brand-studio/ai";
import { buildPack, logoPng } from "@/lib/brand-studio/pack";
import { fillPage, fullSite, photo, previewPage, previewScene, worldPrompt } from "@/lib/brand-studio/world";
import { DirectionSchema, FileBriefSchema, type FileBrief, type Turn } from "@/lib/brand-studio/types";

/**
 * The brand creator. The talk and the previews are free; the final pack is its real AI cost × the cost multiplier.
 *   POST multipart files[]                     → what the files decide
 *   POST {action:"question", …}                → the next question
 *   POST {action:"directions", …}              → 5 previews (twice at most)
 *   POST {action:"previewPage", …}             → a direction's first screen, designed
 *   POST {action:"previewPhoto", …}            → one quick photo of a direction in the world
 *   POST {action:"build", …}                   → the identity, website, photos and the pack (paid)
 */
export const maxDuration = 800;
const BUCKET = "brand-assets", WEEK = 7 * 24 * 3600;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const fileBriefOf = (v: unknown): FileBrief | null => FileBriefSchema.safeParse(v).data ?? null;
const turnsOf = (v: unknown): Turn[] => (Array.isArray(v) ? v.slice(0, 12).map((t) => ({ q: text(t?.q, 300), a: text(t?.a, 1000) })) : []);

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (!ctx) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (ctx.role === "viewer") return Response.json({ error: "forbidden" }, { status: 403 });
  const workspaceId = ctx.workspace.id;
  try {
    if ((request.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
      const form = await request.formData();
      const uploads = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
      if (!uploads.length || uploads.length > MAX_FILES || uploads.some((f) => f.size > MAX_FILE_BYTES)) return Response.json({ error: "bad_files" }, { status: 400 });
      const files: UploadedFile[] = await Promise.all(uploads.map(async (f) => ({ name: f.name, type: f.type, bytes: Buffer.from(await f.arrayBuffer()) })));
      return Response.json({ brief: await readFiles({ workspaceId, files }) });
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const language = body.language;
    if (!isLanguage(language)) return Response.json({ error: "bad_language" }, { status: 400 });
    const fileBrief = fileBriefOf(body.fileBrief);
    if (body.action === "question") {
      const business = text(body.business, 3000);
      if (!business && !fileBrief) return Response.json({ error: "empty" }, { status: 400 });
      return Response.json(await nextQuestion({ workspaceId, locale: text(body.locale, 5) === "ar" ? "ar" : "en", language, business, turns: turnsOf(body.turns), fileBrief }));
    }
    const brief = text(body.brief, 6000);
    if (!brief) return Response.json({ error: "empty" }, { status: 400 });
    if (body.action === "directions") {
      if (Number(body.round) >= MAX_ROUNDS) return Response.json({ error: "no_more_rounds" }, { status: 400 });
      const seen = Array.isArray(body.seen) ? body.seen.slice(0, 10).map((s) => text(s, 40)) : [];
      return Response.json({ directions: await makeDirections({ workspaceId, language, brief, fileBrief, seen }) });
    }
    const chosen = DirectionSchema.safeParse(body.chosen);
    const db = createAdminClient();
    const up = async (path: string, bytes: Uint8Array, contentType: string, download?: string) => {
      const { error } = await db.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: true });
      if (error) throw new Error(`upload: ${error.message}`);
      const { data, error: e2 } = await db.storage.from(BUCKET).createSignedUrl(path, WEEK, download ? { download } : undefined);
      if (e2 || !data) throw new Error(`url: ${e2?.message}`);
      return data.signedUrl;
    };
    if (body.action === "previewPage" && chosen.success) {
      const html = await previewPage({ workspaceId, d: chosen.data, brief, lang: language });
      const logo = await logoPng(chosen.data, language, 400);
      return Response.json({ html: fillPage(html, `data:image/png;base64,${Buffer.from(logo).toString("base64")}`, {}) });
    }
    if (body.action === "previewPhoto" && chosen.success) {
      const logo = await logoPng(chosen.data, language);
      const shot = await photo(previewScene(chosen.data, brief.slice(0, 500)), { logo, quality: "low" });
      return Response.json({ url: await up(`${workspaceId}/brand-previews/${crypto.randomUUID()}.jpg`, shot.bytes, "image/jpeg") });
    }
    if (body.action === "build") {
      if (!chosen.success) return Response.json({ error: "bad_direction" }, { status: 400 });
      const notes = text(body.notes, 1000);
      // NDJSON: each step as it finishes, then the result (or the error)
      const encoder = new TextEncoder();
      return new Response(new ReadableStream({
        async start(ctl) {
          const send = (v: object) => ctl.enqueue(encoder.encode(`${JSON.stringify(v)}\n`));
          try {
            // everything that can fail happens inside: the hold is released and nothing is charged unless the pack is ready
            send({ result: await metered(workspaceId, "brand", `Brand pack: ${chosen.data.name}`, async (addCost) => {
              const identity = await makeIdentity({ workspaceId, language, brief, chosen: chosen.data, notes, fileBrief });
              send({ step: "identity" });
              const logo = await logoPng(identity, language), about = identity.summary;
              const paid = async (prompt: string, o: Parameters<typeof photo>[1]) => { const p = await photo(prompt, o); addCost(p.usd); return p.bytes; };
              // side by side; a real-world photo that fails is left out rather than failing the pack
              const [site, world] = await Promise.all([
                fullSite({ workspaceId, id: identity, brief, lang: language }).then(async (page) => {
                  const photos = await Promise.all(page.photos.map(async (p) => ({ key: p.key, bytes: await paid(`${p.prompt}\n\nPhotorealistic, art-directed. Colours in harmony with ${identity.palette.primary} and ${identity.palette.accent}. No text, logos or watermarks.`, { quality: "medium", size: p.wide ? "1536x1024" : "1024x1024" }) })));
                  send({ step: "website" });
                  return { html: page.html, photos };
                }),
                Promise.all(identity.world.map(async (w) => { try { return { ...w, bytes: await paid(worldPrompt(w.scene, identity.name, about, identity.palette), { logo, quality: "medium" }) }; } catch (err) { console.warn("[brand/studio] photo failed", w.kind, String(err).slice(0, 200)); return null; } })).then((r) => { send({ step: "photos" }); return r; }),
              ]);
              const shots = world.filter((w): w is NonNullable<typeof w> => Boolean(w));
              const pack = await buildPack(identity, language, shots, site);
              const base = `${workspaceId}/brand-packs/${crypto.randomUUID()}`;
              const photoUrls = Object.fromEntries(await Promise.all(site.photos.map(async (p) => [p.key, await up(`${base}/site-${p.key}.jpg`, p.bytes, "image/jpeg")] as const)));
              const logoUrl = await up(`${base}/logo.png`, pack.logoPng, "image/png");
              send({ step: "pack" });
              return {
                identity, logoUrl, files: pack.count,
                packUrl: await up(`${base}/pack.zip`, pack.zip, "application/zip", `${identity.name}-brand-pack.zip`),
                siteHtml: fillPage(site.html, logoUrl, photoUrls),
                world: await Promise.all(shots.map(async (w) => ({ kind: w.kind, label: w.label, url: await up(`${base}/${w.kind}.jpg`, w.bytes, "image/jpeg") }))),
              };
            }) });
          } catch (err) {
            console.error("[brand/studio] build failed", err);
            send({ error: err instanceof InsufficientBalance ? "insufficient_balance" : toAiErrorCode(err) });
          } finally { ctl.close(); }
        },
      }), { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
    }
    return Response.json({ error: "bad_action" }, { status: 400 });
  } catch (err) {
    if (err instanceof InsufficientBalance) return Response.json({ error: "insufficient_balance", needUsd: err.needUsd, availableUsd: err.availableUsd }, { status: 402 });
    console.error("[brand/studio] failed", err);
    return Response.json({ error: toAiErrorCode(err) }, { status: 500 });
  }
}
