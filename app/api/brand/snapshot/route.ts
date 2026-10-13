import type { NextRequest } from "next/server";
import { getApiContext } from "@/lib/context";
import { snapshotFolder } from "@/lib/brand/snapshot";
import { urlKey } from "@/lib/brand/url";

/**
 * GET /api/brand/snapshot?url=<website>[&file=manifest.json|screenshot.png|…]
 * Redirects to a short-lived signed URL for the site's saved page snapshot (default: snapshot.zip).
 * Scoped to the caller's workspace; storage RLS enforces the same.
 */
export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (!ctx) return Response.json({ error: "unauthorized" }, { status: 401 });

  const key = urlKey(request.nextUrl.searchParams.get("url") ?? "");
  if (!key) return Response.json({ error: "invalid_url" }, { status: 400 });

  const file = request.nextUrl.searchParams.get("file") ?? "snapshot.zip";
  if (!/^[\w\-./]+$/.test(file) || file.includes("..")) return Response.json({ error: "invalid_file" }, { status: 400 });

  const folder = await snapshotFolder(ctx.workspace.id, key);
  const host = key.split("/")[0].replace(/[^\w.-]/g, "_");
  const { data, error } = await ctx.supabase.storage
    .from("brand-assets")
    .createSignedUrl(`${folder}/${file}`, 60 * 10, file === "snapshot.zip" ? { download: `${host}-page.zip` } : undefined);
  if (error || !data?.signedUrl) return Response.json({ error: "not_found" }, { status: 404 });

  return Response.redirect(data.signedUrl, 302);
}
