import "server-only";
import type { AppContext } from "@/lib/context";
import { cleanRefs, isContentType } from "@/lib/refs";

/** a new video's / post's content type and references, from the create form (needs migration 0014 — skipped quietly before it) */
export async function saveCreateRefs(ctx: AppContext, table: "videos" | "posts", id: string, companyId: string, formData: FormData) {
  const type = String(formData.get("content_type") ?? "standard");
  let raw: unknown = [];
  try { raw = JSON.parse(String(formData.get("refs") ?? "[]")); } catch { raw = []; }
  const refs = cleanRefs(raw, ctx.workspace.id, companyId);
  if (type === "standard" && !refs.length) return;
  const { error } = await ctx.supabase.from(table).update({ content_type: isContentType(type) ? type : "standard", refs }).eq("id", id);
  if (error) console.error(`[create] ${table} refs not saved (is migration 0014 applied?)`, { code: error.code, message: error.message });
}
