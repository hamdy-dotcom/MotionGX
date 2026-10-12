// Inspiration references + treatment history, with embeddings for retrieval and the novelty check.
// Two backends: Supabase (motion_refs / motion_treatments with pgvector) and a local JSON file
// (dev scripts / before the migration runs).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cosine, embed } from "./embed";
import { projectPath } from "./paths";

export type MotionRef = {
  id: string;
  title: string;
  source_url: string | null;
  creator: string;
  category: string;
  tags: string[];
  prompt_text: string;
  code_snippet: string | null;
  license_note: string;
  embedding?: number[];
};

export type TreatmentRecord = {
  workspace_id: string;
  video_id: string | null;
  concept: string;
  motion_language: string;
  ref_ids: string[];
  embedding: number[];
  created_at: string;
};

export interface MotionStore {
  refs(): Promise<MotionRef[]>;
  recentTreatments(workspaceId: string, n: number): Promise<TreatmentRecord[]>;
  recentGlobal(n: number): Promise<TreatmentRecord[]>;
  saveTreatment(t: TreatmentRecord): Promise<void>;
}

export const refText = (r: Pick<MotionRef, "title" | "category" | "tags" | "prompt_text">) => `${r.title}. ${r.category}. ${r.tags.join(", ")}. ${r.prompt_text}`;

/** Local JSON store (scripts, tests, pre-migration). */
export class FileStore implements MotionStore {
  constructor(
    private file = projectPath("out/motion-store.json"),
    private seed = projectPath("data/motion-refs.json"),
  ) {}
  private load(): { refs: MotionRef[]; treatments: TreatmentRecord[] } {
    if (existsSync(this.file)) return JSON.parse(readFileSync(this.file, "utf8"));
    return { refs: [], treatments: [] };
  }
  private save(d: { refs: MotionRef[]; treatments: TreatmentRecord[] }) {
    mkdirSync(path.dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify(d));
  }
  async refs() {
    const d = this.load();
    const seed = JSON.parse(readFileSync(this.seed, "utf8")) as MotionRef[];
    const known = new Map(d.refs.map((r) => [r.id, r]));
    let changed = false;
    for (const r of seed) {
      const k = known.get(r.id);
      if (!k?.embedding || k.prompt_text !== r.prompt_text) {
        known.set(r.id, { ...r, embedding: await embed(refText(r)) });
        changed = true;
      }
    }
    d.refs = [...known.values()];
    if (changed) this.save(d);
    return d.refs;
  }
  async recentTreatments(workspaceId: string, n: number) {
    return this.load().treatments.filter((t) => t.workspace_id === workspaceId).slice(-n).reverse();
  }
  async recentGlobal(n: number) {
    return this.load().treatments.slice(-n).reverse();
  }
  async saveTreatment(t: TreatmentRecord) {
    const d = this.load();
    d.treatments.push(t);
    this.save(d);
  }
}

const parseVector = (v: unknown): number[] => (Array.isArray(v) ? (v as number[]) : typeof v === "string" ? JSON.parse(v) : []);

/** Supabase store (after 0004_generative.sql). */
export class DbStore implements MotionStore {
  constructor(private admin: SupabaseClient) {}
  async refs() {
    const { data, error } = await this.admin.from("motion_refs").select("id, title, source_url, creator, category, tags, prompt_text, code_snippet, license_note, embedding");
    if (error) throw new Error(`motion_refs: ${error.message}`);
    return (data ?? []).map((r) => ({ ...r, embedding: parseVector(r.embedding) })) as MotionRef[];
  }
  async recentTreatments(workspaceId: string, n: number) {
    const { data, error } = await this.admin
      .from("motion_treatments")
      .select("workspace_id, video_id, concept, motion_language, ref_ids, embedding, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(n);
    if (error) throw new Error(`motion_treatments: ${error.message}`);
    return (data ?? []).map((t) => ({ ...t, embedding: parseVector(t.embedding) })) as TreatmentRecord[];
  }
  async recentGlobal(n: number) {
    const { data, error } = await this.admin
      .from("motion_treatments")
      .select("workspace_id, video_id, concept, motion_language, ref_ids, embedding, created_at")
      .order("created_at", { ascending: false })
      .limit(n);
    if (error) throw new Error(`motion_treatments: ${error.message}`);
    return (data ?? []).map((t) => ({ ...t, embedding: parseVector(t.embedding) })) as TreatmentRecord[];
  }
  async saveTreatment(t: TreatmentRecord) {
    const { error } = await this.admin.from("motion_treatments").insert({ ...t, embedding: JSON.stringify(t.embedding) });
    if (error) throw new Error(`motion_treatments insert: ${error.message}`);
  }
}

/**
 * The k most relevant references with diversity (maximal marginal relevance), skipping the ones
 * this workspace's last videos already used.
 */
export function selectRefs(all: MotionRef[], query: number[], k: number, exclude: Set<string>, lambda = 0.65): MotionRef[] {
  const pool = all.filter((r) => r.embedding?.length && !exclude.has(r.id));
  const chosen: MotionRef[] = [];
  while (chosen.length < k && pool.length) {
    let best = 0;
    let bestScore = -Infinity;
    pool.forEach((r, i) => {
      const rel = cosine(query, r.embedding!);
      const red = chosen.length ? Math.max(...chosen.map((c) => cosine(c.embedding!, r.embedding!))) : 0;
      const score = lambda * rel - (1 - lambda) * red;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    });
    chosen.push(pool.splice(best, 1)[0]);
  }
  return chosen;
}
