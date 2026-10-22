import "server-only";
// "Everything captured": every screen (with its full-page shot), every UI part and every image a capture saved — the
// ones its profile picked first, marked — read from the capture's packs (capture-cache.ts). The files are served by
// /api/brand/files/<captureId>/… to members of the capture's workspace.
import fs from "node:fs";
import path from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import { captureDir, listImages } from "./capture-cache";

type Screen = { id: string; file?: string; view?: string; label?: string; app?: boolean; customer?: boolean; shows?: string };
type Part = { id: string; file: string | null; shows?: string; feature?: string };
type Image = { file: string; kind?: string; note?: string; alt?: string; demo?: boolean };
type Profile = { screens?: Screen[]; parts?: Part[]; images?: Image[]; logo?: { file: string } | null };

export type GalleryScreen = { id: string; label: string; shows: string; group: "customer" | "app" | "public" | "other"; thumb: string; full: string; picked: boolean; blank: boolean };
export type CaptureGallery = {
  screens: GalleryScreen[];
  parts: { id: string; label: string; url: string; picked: boolean }[];
  images: { kind: string; note: string; url: string; picked: boolean; demo: boolean }[];
};

const base = (p?: string | null) => (p ? path.basename(p) : "");

export async function captureGallery(workspaceId: string, captureId: string): Promise<CaptureGallery | null> {
  const { data: cap } = await createAdminClient().from("live_brand_captures").select("profile").eq("id", captureId).eq("workspace_id", workspaceId).maybeSingle();
  if (!cap) return null;
  const dir = await captureDir(workspaceId, captureId);
  if (!dir) return null;
  const profile = (cap.profile ?? {}) as Profile;
  const url = (rel: string) => `/api/brand/files/${captureId}/${rel.split(path.sep).map(encodeURIComponent).join("/")}`;
  const has = (rel: string) => fs.existsSync(path.join(dir, rel));

  // screens: the profile's (its labels and groups), then the pages it left out; a near-empty shot (a bare success
  // page) goes last
  const views = listImages(dir, "screens").filter((f) => /\.view\.[a-z]+$/i.test(f.rel));
  const sizes = views.map((v) => v.bytes).sort((a, b) => a - b);
  const median = sizes[Math.floor(sizes.length / 2)] ?? 0;
  const bytesOf = (rel: string) => { try { return fs.statSync(path.join(dir, rel)).size; } catch { return 0; } };
  const screens: GalleryScreen[] = [];
  const seen = new Set<string>();
  for (const s of profile.screens ?? []) {
    const thumbRel = [s.view, `screens/${s.id}.view.jpg`].find((r) => r && has(r));
    if (!thumbRel) continue;
    const fullRel = [s.file, `screens/${s.id}.full.jpg`].find((r) => r && has(r)) ?? thumbRel;
    seen.add(s.id);
    screens.push({ id: s.id, label: s.label ?? s.id, shows: s.shows ?? "", group: s.customer ? "customer" : s.app ? "app" : "public", thumb: url(thumbRel), full: url(fullRel), picked: true, blank: median > 0 && bytesOf(thumbRel) < median * 0.35 });
  }
  for (const v of views) {
    const id = base(v.rel).replace(/\.view\.[a-z]+$/i, "");
    if (seen.has(id)) continue;
    const fullRel = `screens/${id}.full.jpg`;
    screens.push({ id, label: id.replace(/^\d+-/, "").replace(/-/g, " "), shows: "", group: "other", thumb: url(v.rel), full: url(has(fullRel) ? fullRel : v.rel), picked: false, blank: median > 0 && v.bytes < median * 0.35 });
  }
  const order = { customer: 0, app: 1, public: 2, other: 3 };
  screens.sort((a, b) => Number(a.blank) - Number(b.blank) || order[a.group] - order[b.group]);

  // UI parts: every block cut from every screen; the profile's picks first, with their descriptions
  const picked = new Map((profile.parts ?? []).filter((p) => p.file).map((p) => [base(p.file), p]));
  const labelOfScreen = new Map(screens.map((s) => [s.id, s.label]));
  const parts = listImages(dir, "parts").map((f) => {
    const name = base(f.rel), p = picked.get(name), screen = name.replace(/-p\d+\.[a-z]+$/i, "");
    return { id: name.replace(/\.[a-z]+$/i, ""), label: p?.shows || p?.feature || labelOfScreen.get(screen) || screen.replace(/^\d+-/, "").replace(/-/g, " "), url: url(f.rel), picked: Boolean(p) };
  });
  // a picked part saved only in the library pack
  for (const f of listImages(dir, "library/parts")) if (!parts.some((p) => base(p.url) === encodeURIComponent(base(f.rel)))) { const p = picked.get(base(f.rel)); parts.push({ id: base(f.rel), label: p?.shows || base(f.rel), url: url(f.rel), picked: true }); }
  parts.sort((a, b) => Number(b.picked) - Number(a.picked));

  // images: the library's folders by kind (the profile's picks marked), then every image taken from the site
  const pickedImg = new Map((profile.images ?? []).map((i) => [base(i.file), i]));
  const images: CaptureGallery["images"] = [];
  const taken = new Set<string>();
  for (const f of listImages(dir, "library")) {
    const kind = f.rel.split(path.sep)[1] ?? "";
    if (["screens", "parts", "logo"].includes(kind) || taken.has(base(f.rel))) continue; // one file filed under two kinds shows once
    const i = pickedImg.get(base(f.rel));
    taken.add(base(f.rel).replace(/-[0-9a-f]{10}(\.[a-z]+)$/i, "$1"));
    taken.add(base(f.rel));
    images.push({ kind, note: i?.note || i?.alt || "", url: url(f.rel), picked: Boolean(i), demo: Boolean(i?.demo) });
  }
  for (const f of listImages(dir, "assets/images")) {
    if (taken.has(base(f.rel)) || f.bytes < 1500) continue; // tiny icons / spacers
    images.push({ kind: "site", note: "", url: url(f.rel), picked: false, demo: false });
  }
  images.sort((a, b) => Number(b.picked) - Number(a.picked));
  return { screens, parts, images };
}
