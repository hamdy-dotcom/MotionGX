import "server-only";
// "ملفات البراند": what the capture + profile produced (the sandbox's brand profile panel), with signed URLs.
import { createAdminClient } from "@/lib/supabase/admin";
import { LIVE_BUCKET, storagePath } from "../protocol";

type Screen = { id: string; file: string; view: string; label: string; app: boolean; shows: string; features?: string[]; customer?: boolean };
type Part = { id: string; file: string | null; shows: string; feature?: string; kind?: string };
type Image = { file: string; kind: string; note?: string; alt?: string; demo?: boolean };
type Brand = { name?: string; name_ar?: string; tagline?: string; logo?: { file: string; on_dark?: boolean } | null; screens?: Screen[]; parts?: Part[]; images?: Image[]; features?: { name: string; evidence?: string[] }[] };
type TraceRow = { step: number; url: string; action: string; input?: Record<string, unknown>; target?: string; result?: string };

export type BrandFiles = {
  logo: { url: string; onDark: boolean } | null;
  screens: { group: "customer" | "app" | "public"; id: string; label: string; shows: string; features: string[]; thumb: string | null; full: string | null }[];
  parts: { id: string; shows: string; feature: string; url: string | null }[];
  /** demo: from the capture agent's own test actions (sample marketplace products, test orders) — not brand photos */
  images: { kind: string; note: string; url: string | null; demo: boolean }[];
  trace: { step: number; url: string; action: string; detail: string; result: string; shot: string | null }[];
};

/** typed values stay visible except passwords (the test identity's throwaway password) */
const detail = (r: TraceRow) => {
  const i = { ...(r.input ?? {}) };
  if (typeof i.text === "string" && /type=password/i.test(r.target ?? "")) i.text = "••••••";
  const parts = [r.target?.replace(/\s+/g, " ").slice(0, 160), Object.keys(i).length ? JSON.stringify(i).slice(0, 240) : ""].filter(Boolean);
  return parts.join(" · ");
};

export async function brandFiles(workspaceId: string, captureId: string): Promise<BrandFiles | null> {
  const db = createAdminClient();
  const { data: cap } = await db.from("live_brand_captures").select("profile, status").eq("id", captureId).eq("workspace_id", workspaceId).maybeSingle();
  const brand = cap?.profile as Brand | null;
  if (!brand) return null;
  const prefix = storagePath("brand/x", { workspaceId, captureId }).replace(/\/x$/, "");
  const bucket = db.storage.from(LIVE_BUCKET);

  const { data: traceBlob } = await bucket.download(`${prefix}/agent/trace.json`);
  const trace = traceBlob ? ((JSON.parse(await traceBlob.text()) as TraceRow[]) ?? []) : [];
  const { data: agentFiles } = await bucket.list(`${prefix}/agent`, { limit: 1000 });
  const shots = new Set((agentFiles ?? []).map((f) => f.name).filter((n) => /^\d+\.jpg$/.test(n)));

  const want = new Set<string>();
  const rel = (p?: string | null) => (p ? (want.add(p), p) : null);
  rel(brand.logo?.file);
  for (const s of brand.screens ?? []) {
    rel(s.view);
    rel(s.file);
  }
  for (const p of brand.parts ?? []) rel(p.file);
  for (const i of brand.images ?? []) rel(i.file);
  const shotName = (n: number) => `agent/${String(n).padStart(2, "0")}.jpg`;
  for (const t of trace) if (shots.has(shotName(t.step).slice(6))) want.add(shotName(t.step));

  const list = [...want];
  const urls = new Map<string, string>();
  for (let i = 0; i < list.length; i += 100) {
    const { data } = await bucket.createSignedUrls(list.slice(i, i + 100).map((p) => `${prefix}/${p}`), 60 * 60);
    (data ?? []).forEach((d, j) => d.signedUrl && !d.error && urls.set(list[i + j], d.signedUrl));
  }
  const url = (p?: string | null) => (p ? (urls.get(p) ?? null) : null);

  const group = (s: Screen) => (s.customer ? "customer" : s.app ? "app" : "public") as BrandFiles["screens"][number]["group"];
  const order = { customer: 0, app: 1, public: 2 };
  const proves = (s: Screen) => (s.features?.length ? s.features : (brand.features ?? []).filter((f) => f.evidence?.some((e) => e === s.id || e.startsWith(`${s.id}-`))).map((f) => f.name));
  return {
    logo: brand.logo?.file && url(brand.logo.file) ? { url: url(brand.logo.file)!, onDark: Boolean(brand.logo.on_dark) } : null,
    screens: (brand.screens ?? [])
      .map((s) => ({ group: group(s), id: s.id, label: s.label, shows: s.shows, features: proves(s), thumb: url(s.view), full: url(s.file) ?? url(s.view) }))
      .sort((a, b) => order[a.group] - order[b.group]),
    parts: (brand.parts ?? []).map((p) => ({ id: p.id, shows: p.shows, feature: p.feature ?? "", url: url(p.file) })),
    images: (brand.images ?? []).map((i) => ({ kind: i.kind, note: i.note || i.alt || "", url: url(i.file), demo: Boolean(i.demo) })),
    trace: trace.map((t) => ({ step: t.step, url: t.url, action: t.action, detail: detail(t), result: String(t.result ?? "").slice(0, 300), shot: url(shotName(t.step)) })),
  };
}
