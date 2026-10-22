// What a piece is (its content type) and the reference media / links the client attaches when creating it. Files are
// uploaded straight to the live-engine bucket under {workspace}/refs/{company}/… with a signed upload URL; the job
// downloads them into the brand folder as refs/<file> (the director sees them under capture/refs/…).

export const CONTENT_TYPES = ["standard", "product_update"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];
export const isContentType = (v: unknown): v is ContentType => typeof v === "string" && (CONTENT_TYPES as readonly string[]).includes(v);

export type Ref =
  | { kind: "image" | "video"; path: string; name: string; note?: string }
  | { kind: "link"; url: string; name: string; note?: string };

export const MAX_REFS = 8;
export const REF_TYPES: Record<string, { kind: "image" | "video"; ext: string; max: number }> = {
  "image/jpeg": { kind: "image", ext: "jpg", max: 15 << 20 },
  "image/png": { kind: "image", ext: "png", max: 15 << 20 },
  "image/webp": { kind: "image", ext: "webp", max: 15 << 20 },
  "video/mp4": { kind: "video", ext: "mp4", max: 50 << 20 },
  "video/quicktime": { kind: "video", ext: "mov", max: 50 << 20 },
  "video/webm": { kind: "video", ext: "webm", max: 50 << 20 },
};

export const refsPrefix = (workspaceId: string, companyId: string) => `${workspaceId}/refs/${companyId}/`;

/** what a create form sent, kept only when it is this workspace's and company's own upload (or an https link) */
export function cleanRefs(raw: unknown, workspaceId: string, companyId: string): Ref[] {
  const list = Array.isArray(raw) ? raw : [];
  const prefix = refsPrefix(workspaceId, companyId);
  const out: Ref[] = [];
  for (const r of list.slice(0, MAX_REFS)) {
    if (!r || typeof r !== "object") continue;
    const x = r as Record<string, unknown>;
    const name = String(x.name ?? "").slice(0, 120);
    const note = typeof x.note === "string" && x.note.trim() ? x.note.trim().slice(0, 300) : undefined;
    if ((x.kind === "image" || x.kind === "video") && typeof x.path === "string" && x.path.startsWith(prefix) && /^[\w./-]+$/.test(x.path) && !x.path.includes("..")) out.push({ kind: x.kind, path: x.path, name, ...(note ? { note } : {}) });
    else if (x.kind === "link" && typeof x.url === "string") {
      try { const u = new URL(x.url); if (u.protocol === "https:") out.push({ kind: "link", url: u.toString().slice(0, 500), name: name || u.host, ...(note ? { note } : {}) }); } catch { /* not a link */ }
    }
  }
  return out;
}
