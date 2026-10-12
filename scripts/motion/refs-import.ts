// pnpm refs:import <file.json>  — upserts motion references (with embeddings) into motion_refs.
// The file is an array of { id, title, source_url, creator, category, tags, prompt_text, code_snippet?, license_note,
// card?, embed_text? }. embed_text (when given) is what gets embedded; otherwise title + category + tags + prompt_text.
// References are descriptions/paraphrases + links for inspiration only: never paste someone else's
// project or ship their videos. Rows without license_note or creator are rejected.
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { embed } from "../../lib/motion/embed";
import { refText, type MotionRef } from "../../lib/motion/store";

(async () => {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: pnpm refs:import <file.json>");
    process.exit(1);
  }
  type ImportRow = MotionRef & { card?: Record<string, unknown> | null; embed_text?: string };
  const rows = JSON.parse(readFileSync(path.resolve(file), "utf8")) as ImportRow[];
  if (!Array.isArray(rows)) throw new Error("expected a JSON array");

  const problems: string[] = [];
  rows.forEach((r, i) => {
    for (const k of ["id", "title", "creator", "category", "prompt_text", "license_note"] as const) {
      if (!r[k] || typeof r[k] !== "string") problems.push(`row ${i} (${r.id ?? "?"}): missing ${k}`);
    }
    if (!Array.isArray(r.tags)) problems.push(`row ${i} (${r.id}): tags must be an array`);
    if (r.code_snippet && r.code_snippet.length > 600) problems.push(`row ${i} (${r.id}): code_snippet over 600 chars — store a technique sketch, not a project`);
  });
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const t0 = Date.now();
  const payload = [];
  for (const r of rows) {
    payload.push({
      id: r.id,
      title: r.title,
      source_url: r.source_url ?? null,
      creator: r.creator,
      category: r.category,
      tags: r.tags,
      prompt_text: r.prompt_text,
      code_snippet: r.code_snippet ?? null,
      license_note: r.license_note,
      card: r.card ?? null,
      embedding: JSON.stringify(await embed(r.embed_text ?? refText(r))),
    });
  }
  const { error } = await admin.from("motion_refs").upsert(payload, { onConflict: "id" });
  if (error) {
    console.error(`upsert failed: ${error.message}${error.code === "42P01" ? " — run supabase/migrations/0004_generative.sql first" : ""}`);
    process.exit(1);
  }
  console.log(`motion_refs: upserted ${payload.length} references in ${Date.now() - t0}ms`);
})();
