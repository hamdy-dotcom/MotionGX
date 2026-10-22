import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { getApiContext } from "@/lib/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { LIVE_BUCKET } from "@/lib/live-engine/protocol";
import { REF_TYPES, refsPrefix } from "@/lib/refs";

/** POST {companyId, type, size} → a signed upload URL for one reference file (the browser uploads it directly) */
export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (!ctx) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (ctx.role === "viewer") return Response.json({ error: "forbidden" }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { companyId?: string; type?: string; size?: number };
  const t = REF_TYPES[String(body.type ?? "")];
  if (!t) return Response.json({ error: "type" }, { status: 400 });
  if (!(Number(body.size) > 0) || Number(body.size) > t.max) return Response.json({ error: "size", max: t.max }, { status: 400 });
  const { data: company } = await ctx.supabase.from("companies").select("id").eq("id", String(body.companyId ?? "")).maybeSingle(); // RLS
  if (!company) return Response.json({ error: "not_found" }, { status: 404 });
  const path = `${refsPrefix(ctx.workspace.id, company.id)}${randomUUID()}.${t.ext}`;
  const { data, error } = await createAdminClient().storage.from(LIVE_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return Response.json({ error: "generic" }, { status: 500 });
  return Response.json({ path, token: data.token, kind: t.kind });
}
