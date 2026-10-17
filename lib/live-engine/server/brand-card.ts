import "server-only";
// The "هوية الشركة" card: the brand's real homepage hero (its live UI clone, as embedClones embeds it), or —
// without a clone — the brand's own tokens (background/gradient, display font, primary button, logo surface).
import { createAdminClient } from "@/lib/supabase/admin";
import { LIVE_BUCKET, storagePath } from "../protocol";

export type BrandCardData = {
  hero: { html: string; fontsCss: string; w: number; h: number; dir: string } | null;
  tokens: {
    background: string;
    gradient: string | null;
    ink: string;
    primary: string;
    display: string;
    body: string;
    buttonRadius: number;
    logo: { url: string; onDark: boolean } | null;
  } | null;
};

type Profile = { palette?: Record<string, string>; fonts?: { display?: string; body?: string }; logo?: { file: string; on_dark?: boolean } | null; look?: string };
type Manifest = { pages?: { id: string; clones?: { screen?: { file: string } } }[] };

/** the clone's {{B}}/… asset paths → signed URLs (the card renders in a sandboxed frame, which carries no session) */
async function inlineAssets(texts: string[], prefix: string) {
  const bucket = createAdminClient().storage.from(LIVE_BUCKET);
  const rels = [...new Set(texts.flatMap((t) => [...t.matchAll(/\{\{B\}\}\/([^"'()\s\\]+)/g)].map((m) => m[1])))];
  const urls = new Map<string, string>();
  for (let i = 0; i < rels.length; i += 100) {
    const { data } = await bucket.createSignedUrls(rels.slice(i, i + 100).map((r) => `${prefix}/${r}`), 60 * 60);
    (data ?? []).forEach((d, j) => d.signedUrl && !d.error && urls.set(rels[i + j], d.signedUrl));
  }
  return texts.map((t) => t.replace(/\{\{B\}\}\/([^"'()\s\\]+)/g, (whole, rel: string) => urls.get(rel) ?? whole));
}

export async function brandCard(workspaceId: string, captureId: string): Promise<BrandCardData | null> {
  const db = createAdminClient();
  const { data: cap } = await db.from("live_brand_captures").select("profile, manifest").eq("id", captureId).eq("workspace_id", workspaceId).maybeSingle();
  if (!cap) return null;
  const prefix = storagePath("brand/x", { workspaceId, captureId }).replace(/\/x$/, "");
  const bucket = db.storage.from(LIVE_BUCKET);
  const profile = (cap.profile ?? {}) as Profile;
  const p = profile.palette ?? {};

  // 1. the first public page's screen clone (its top is the hero)
  let hero: BrandCardData["hero"] = null;
  const first = (cap.manifest as Manifest | null)?.pages?.[0];
  const cloneFile = first?.clones?.screen?.file ?? (first ? `clones/${first.id}.json` : null);
  if (cloneFile) {
    const [{ data: cloneBlob }, { data: fontsBlob }] = await Promise.all([bucket.download(`${prefix}/${cloneFile}`), bucket.download(`${prefix}/clones/fonts.css`)]);
    if (cloneBlob) {
      const c = JSON.parse(await cloneBlob.text()) as { html: string; w: number; h: number; dir?: string };
      const [html, fontsCss] = await inlineAssets([c.html, fontsBlob ? await fontsBlob.text() : ""], prefix);
      hero = { html, fontsCss, w: c.w, h: c.h, dir: c.dir || "ltr" };
    }
  }

  // 2. tokens for the fallback card
  let logo: NonNullable<BrandCardData["tokens"]>["logo"] = null;
  if (profile.logo?.file) {
    const { data } = await bucket.createSignedUrl(`${prefix}/${profile.logo.file}`, 60 * 60);
    if (data?.signedUrl) logo = { url: data.signedUrl, onDark: Boolean(profile.logo.on_dark) };
  }
  const tokens = p.background
    ? {
        background: p.background,
        gradient: p.gradient && /gradient\(/.test(p.gradient) ? p.gradient : null,
        ink: p.ink ?? "#ffffff",
        primary: p.primary ?? p.accent ?? "#5558E3",
        display: profile.fonts?.display ?? "",
        body: profile.fonts?.body ?? "",
        buttonRadius: /pill|rounded-full|capsule/i.test(profile.look ?? "") ? 999 : 12,
        logo,
      }
    : null;
  return { hero, tokens };
}
