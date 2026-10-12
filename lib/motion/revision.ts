// Edit safety (model borrowed from genmotion, MIT © 2026 Afnan K Salal — documentDiff is ported from its
// src/ir/document-diff.ts):
//  • every spec has a content revision; an edit names the revision it was made against and is rejected
//    as stale if the video moved on meanwhile (compare-and-swap)
//  • a patch is dry-run (applied to a copy, schema-checked, validated) before anything is saved
//  • every version stores the inverse patch back to its parent, so «تراجع» is one click
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { applyPatch, type PatchOp } from "./patch";
import { specSchema, type MotionSpec } from "./spec";
import { validateSpec, type SpecIssue, type ValidateCtx } from "./validate";

/** stable JSON (sorted keys) so equal specs always hash the same */
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v as object).sort().filter((k) => (v as Record<string, unknown>)[k] !== undefined).map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`).join(",")}}`;
  return JSON.stringify(v);
}

/** content revision of a spec */
export const specRevision = (spec: unknown) => createHash("sha256").update(stable(spec)).digest("hex").slice(0, 16);

const isRecord = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
const pointer = (path: string, key: string) => `${path}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`;

/**
 * RFC 6902 patch turning `before` into `after`. Arrays of id'd objects whose ids line up are diffed per
 * element; arrays whose identity/order changed are replaced whole.
 */
export function documentDiff(before: unknown, after: unknown): PatchOp[] {
  const ops: PatchOp[] = [];
  const visit = (l: unknown, r: unknown, path: string): void => {
    if (isDeepStrictEqual(l, r)) return;
    if (isRecord(l) && isRecord(r)) {
      for (const k of Object.keys(l)) if (!Object.hasOwn(r, k) && l[k] !== undefined) ops.push({ op: "remove", path: pointer(path, k) });
      for (const k of Object.keys(r)) {
        if (r[k] === undefined) continue;
        if (!Object.hasOwn(l, k) || l[k] === undefined) ops.push({ op: "add", path: pointer(path, k), value: structuredClone(r[k]) });
        else visit(l[k], r[k], pointer(path, k));
      }
    } else if (Array.isArray(l) && Array.isArray(r) && l.length === r.length && l.every((v, i) => !isRecord(v) || !Object.hasOwn(v, "id") || (isRecord(r[i]) && v.id === (r[i] as Record<string, unknown>).id))) {
      l.forEach((v, i) => visit(v, r[i], pointer(path, String(i))));
    } else ops.push({ op: "replace", path: path || "", value: structuredClone(r) });
  };
  visit(before, after, "");
  return ops;
}

export type DryRun = { ok: true; spec: MotionSpec; issues: SpecIssue[] } | { ok: false; error: string };

/** Applies a patch to a copy, schema-checks and validates it — nothing is saved. */
export async function dryRunPatch(current: MotionSpec, ops: PatchOp[], vctx: ValidateCtx): Promise<DryRun> {
  let next: unknown;
  try {
    next = applyPatch(current, ops);
  } catch (err) {
    return { ok: false, error: `patch does not apply: ${err instanceof Error ? err.message : err}` };
  }
  const parsed = specSchema.safeParse(next);
  if (!parsed.success) return { ok: false, error: `patched spec is invalid: ${parsed.error.issues.slice(0, 6).map((x) => `${x.path.join(".")}: ${x.message}`).join("; ")}` };
  const v = await validateSpec(parsed.data, vctx);
  return { ok: true, spec: parsed.data, issues: v.issues };
}

/** lineage stored on every version (video_versions.qa.history) */
export type VersionHistory = {
  revision: string;
  origin: "new" | "direction" | "edit" | "undo" | "lines";
  parent_version: number | null;
  parent_revision: string | null;
  /** RFC 6902 patch from this version's spec back to its parent's */
  inverse_patch: PatchOp[] | null;
};

export function historyFor(spec: MotionSpec, origin: VersionHistory["origin"], parent: { version: number; spec: unknown } | null): VersionHistory {
  return {
    revision: specRevision(spec),
    origin,
    parent_version: parent?.version ?? null,
    parent_revision: parent ? specRevision(parent.spec) : null,
    inverse_patch: parent ? documentDiff(spec, parent.spec) : null,
  };
}

/** Undo: the parent's spec from a version's inverse patch — verified against the stored parent revision. */
export function undoSpec(spec: MotionSpec, h: VersionHistory): { ok: true; spec: MotionSpec } | { ok: false; error: string } {
  if (!h.inverse_patch || !h.parent_revision) return { ok: false, error: "nothing to undo" };
  let prev: unknown;
  try {
    prev = applyPatch(spec, h.inverse_patch);
  } catch (err) {
    return { ok: false, error: `inverse patch does not apply: ${err instanceof Error ? err.message : err}` };
  }
  if (specRevision(prev) !== h.parent_revision) return { ok: false, error: "inverse patch does not reproduce the parent revision" };
  const parsed = specSchema.safeParse(prev);
  return parsed.success ? { ok: true, spec: parsed.data } : { ok: false, error: "restored spec is invalid" };
}
