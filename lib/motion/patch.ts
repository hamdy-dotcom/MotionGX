// RFC 6902 JSON Patch (add / remove / replace / move / copy / test) — small, dependency-free.
export type PatchOp =
  | { op: "add" | "replace" | "test"; path: string; value: unknown }
  | { op: "remove"; path: string }
  | { op: "move" | "copy"; from: string; path: string };

const unescape = (s: string) => s.replace(/~1/g, "/").replace(/~0/g, "~");
const parse = (p: string) => (p === "" ? [] : p.replace(/^\//, "").split("/").map(unescape));

function parentOf(doc: unknown, path: string[]): [Record<string, unknown> | unknown[], string] {
  let cur = doc as Record<string, unknown> | unknown[];
  for (const k of path.slice(0, -1)) {
    const next = Array.isArray(cur) ? cur[Number(k)] : (cur as Record<string, unknown>)[k];
    if (next === undefined || next === null || typeof next !== "object") throw new Error(`path not found: /${path.join("/")}`);
    cur = next as Record<string, unknown> | unknown[];
  }
  return [cur, path[path.length - 1]];
}

function get(doc: unknown, p: string) {
  let cur = doc as unknown;
  for (const k of parse(p)) cur = Array.isArray(cur) ? cur[Number(k)] : (cur as Record<string, unknown>)?.[k];
  return cur;
}

/** Applies ops to a deep copy; throws on an invalid op (callers treat that as a failed patch). */
export function applyPatch<T>(doc: T, ops: PatchOp[]): T {
  const out = structuredClone(doc);
  for (const op of ops) {
    const path = parse(op.path);
    if (op.op === "test") {
      if (JSON.stringify(get(out, op.path)) !== JSON.stringify(op.value)) throw new Error(`test failed at ${op.path}`);
      continue;
    }
    let value: unknown = "value" in op ? op.value : undefined;
    if (op.op === "move" || op.op === "copy") {
      value = structuredClone(get(out, op.from));
      if (value === undefined) throw new Error(`from not found: ${op.from}`);
      if (op.op === "move") applyRemove(out, parse(op.from));
    }
    if (op.op === "remove") {
      applyRemove(out, path);
      continue;
    }
    const [parent, key] = parentOf(out, path);
    if (Array.isArray(parent)) {
      const i = key === "-" ? parent.length : Number(key);
      if (op.op === "replace") parent[i] = value;
      else parent.splice(i, 0, value);
    } else parent[key] = value;
  }
  return out;
}

function applyRemove(doc: unknown, path: string[]) {
  const [parent, key] = parentOf(doc, path);
  if (Array.isArray(parent)) parent.splice(Number(key), 1);
  else delete parent[key];
}
