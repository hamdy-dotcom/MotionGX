import "server-only";
// Custom elements (the ≤150-line escape hatch) that passed review and shipped in a downloaded video are
// promoted into motion_custom_behaviors, so the library grows from real use.
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MotionSpec } from "./spec";

export async function promoteCustom(videoId: string, versionId: string) {
  const admin = createAdminClient();
  const { data: v } = await admin.from("video_versions").select("spec, custom_js").eq("id", versionId).maybeSingle();
  const spec = v?.spec as MotionSpec | null;
  const js = (v?.custom_js ?? {}) as Record<string, string>;
  for (const el of spec?.elements ?? []) {
    if (el.type !== "custom" || !js[el.id] || !el.tsx) continue;
    const hash = createHash("sha1").update(el.tsx).digest("hex").slice(0, 8);
    const base = (el.note ?? el.id).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "effect";
    const name = `${base}-${hash}`;
    const { data: existing } = await admin.from("motion_custom_behaviors").select("id, uses").eq("name", name).maybeSingle();
    if (existing) await admin.from("motion_custom_behaviors").update({ uses: existing.uses + 1 }).eq("id", existing.id);
    else {
      const { error } = await admin.from("motion_custom_behaviors").insert({ name, note: el.note ?? null, tsx: el.tsx, js: js[el.id], source_video_id: videoId, source_element: el.id });
      if (error) console.error("[motion] promote failed", { name, code: error.code, message: error.message });
    }
  }
}

/** promoted effects the spec writer may reuse by name ({ "type": "custom", "use": name }) */
export async function customLibrary(): Promise<{ name: string; note: string | null; js: string }[]> {
  const { data, error } = await createAdminClient().from("motion_custom_behaviors").select("name, note, js").order("uses", { ascending: false }).limit(40);
  return error ? [] : (data ?? []);
}
