"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { createPost } from "../posts/new/actions";
import { createVideo } from "../videos/new/actions";
import { KindIcon, PlatformIcon } from "@/components/studio/platform-icon";
import { DIALECTS, GOALS, type Dialect } from "@/lib/types";
import { RefsPicker, refsForForm, type RefItem } from "@/components/studio/refs-picker";
import { CONTENT_TYPES, type ContentType } from "@/lib/refs";

type Kind = "video" | "image" | "carousel" | "text";
const KINDS: Kind[] = ["video", "image", "carousel", "text"];
const PLATFORMS = { instagram: "4:5", facebook: "4:5", tiktok: "9:16", linkedin: "4:5", x: "16:9" } as const;

export type CreateProps = {
  brand: { id: string; name: string; dialect: Dialect; mark: ReactNode };
  initial: { kind: Kind; brief: string; day: string | null; ideaId: string | null; platforms: string[]; contentType?: ContentType };
  prices: { post: string; video: Record<15 | 30 | 60, string>; currency: string };
};

/** The create screen: what, its options, the idea, and the brand-coloured summary that starts it. */
export function CreateForm({ brand, initial, prices }: CreateProps) {
  const t = useTranslations("create");
  const tg = useTranslations("goals");
  const td = useTranslations("dialects");
  const ta = useTranslations("posts.aiImages");
  const te = useTranslations("aiErrors");
  const tc = useTranslations("common");
  const tp = useTranslations("posts.platform");
  const [kind, setKind] = useState<Kind>(initial.kind);
  const [format, setFormat] = useState<"9:16" | "1:1" | "16:9">("9:16");
  const [length, setLength] = useState<15 | 30 | 60>(30);
  const [goal, setGoal] = useState<(typeof GOALS)[number]>("sell");
  const [plats, setPlats] = useState<string[]>(initial.platforms.length ? initial.platforms : ["instagram", "facebook"]);
  const [ai, setAi] = useState<"auto" | "yes" | "no">("auto");
  const [dialect, setDialect] = useState<Dialect>(brand.dialect);
  const [brief, setBrief] = useState(initial.brief);
  const [contentType, setContentType] = useState<ContentType>(initial.contentType ?? "standard");
  const [refs, setRefs] = useState<RefItem[]>([]);
  const uploading = refs.some((r) => r.status === "uploading");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const video = kind === "video";
  const chip = (on: boolean, onClick: () => void, children: ReactNode, key?: string) => <button key={key} type="button" className="s-chip" aria-pressed={on} onClick={onClick}>{children}</button>;

  function go() {
    if (!brief.trim()) { setError(t("briefRequired")); return; }
    if (!video && !plats.length) { setError(t("platformsRequired")); return; }
    if (uploading) { setError(t("waitUploads")); return; }
    setError(null);
    const fd = new FormData();
    fd.set("brief", brief.trim()); fd.set("company_id", brand.id); fd.set("dialect", dialect);
    if (initial.day) fd.set("scheduled_on", initial.day);
    if (initial.ideaId) fd.set("plan_idea_id", initial.ideaId);
    fd.set("content_type", contentType);
    fd.set("refs", JSON.stringify(refsForForm(refs)));
    start(async () => {
      let res: { error?: string; aiError?: string } | undefined;
      if (video) { fd.set("goal", goal); fd.set("format", format); fd.set("length_s", String(length)); fd.set("pace", "medium"); res = await createVideo({}, fd); }
      else { fd.set("type", kind === "image" ? "single" : kind); fd.set("ai_image", kind === "text" ? "no" : ai); plats.forEach((p) => fd.append("platforms", p)); res = await createPost({}, fd); }
      if (res?.aiError) setError(te(res.aiError as "ai_failed"));
      else if (res?.error) setError(res.error === "briefRequired" ? t("briefRequired") : res.error === "platformsRequired" ? t("platformsRequired") : tc("error"));
    });
  }

  return (
    <div className="s-grid2">
      <div className="s-stack">
        <div className="s-panel">
          <p className="s-label">{t("what")}</p>
          <div className="s-types" role="radiogroup" aria-label={t("what")}>
            {KINDS.map((k) => { const [label, desc] = t.raw(`types.${k}`) as [string, string]; return (
              <button key={k} type="button" className="s-type" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}>
                <span className="ico"><KindIcon k={k} size={22} /></span><b>{label}</b><small>{desc}</small>
              </button>
            ); })}
          </div>
        </div>
        <div className="s-panel">
          {video ? (
            <>
              <div className="s-opt"><p className="s-label">{t("size")}</p><div className="s-chips">{(["9:16", "1:1", "16:9"] as const).map((f) => chip(format === f, () => setFormat(f), <span dir="ltr">{f}</span>, f))}</div></div>
              <div className="s-opt"><p className="s-label">{t("length")}</p><div className="s-chips">{([15, 30, 60] as const).map((n) => chip(length === n, () => setLength(n), t("seconds", { n }), String(n)))}</div></div>
              <div className="s-opt"><p className="s-label">{t("goal")}</p><div className="s-chips">{GOALS.map((g) => chip(goal === g, () => setGoal(g), tg(g), g))}</div></div>
            </>
          ) : (
            <>
              <div className="s-opt"><p className="s-label">{t("platforms")}</p><div className="s-chips">{Object.entries(PLATFORMS).map(([p, size]) => chip(plats.includes(p), () => setPlats((v) => (v.includes(p) ? v.filter((x) => x !== p) : [...v, p])), <><PlatformIcon p={p} />{tp(p as "x")} <span dir="ltr">{size}</span></>, p))}</div></div>
              {kind === "text" ? null : <div className="s-opt"><p className="s-label">{t("aiImage")}</p><div className="s-chips">{(["auto", "yes", "no"] as const).map((v) => chip(ai === v, () => setAi(v), ta(v), v))}</div></div>}
            </>
          )}
          <div className="s-opt"><p className="s-label">{t("dialect")}</p><div className="s-chips">{DIALECTS.map((d) => chip(dialect === d, () => setDialect(d), td(d), d))}</div></div>
        </div>
        <div className="s-panel">
          <div className="s-opt"><p className="s-label">{t("contentType")}</p><div className="s-chips">{CONTENT_TYPES.map((c) => chip(contentType === c, () => setContentType(c), t(`ctype.${c}`), c))}</div></div>
          <label className="s-label" htmlFor="brief">{contentType === "product_update" ? t("updateBrief") : t("brief")}</label>
          <textarea id="brief" className="s-textarea" value={brief} onChange={(e) => setBrief(e.target.value)} maxLength={2000} placeholder={contentType === "product_update" ? t("updatePlaceholder") : t("briefPlaceholder")} />
        </div>
        <div className="s-panel">
          <p className="s-label">{contentType === "product_update" ? t("updateRefs") : t("refs")}</p>
          <p className="s-hint" style={{ margin: "0 0 10px", fontSize: 12.5, color: "var(--s-muted)" }}>{contentType === "product_update" ? t("updateRefsHint") : t("refsHint")}</p>
          <RefsPicker companyId={brand.id} value={refs} onChange={setRefs} />
        </div>
      </div>
      <aside className="s-sum">
        <p className="s-label">{t("summary")}</p>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>{brand.mark}<b style={{ fontSize: 17 }}>{brand.name}</b></div>
        <div className="tags">
          <span>{(t.raw(`types.${kind}`) as [string, string])[0]}</span>
          {video ? <span dir="ltr">{format} · {length}S</span> : plats.map((p) => <span key={p}>{p.toUpperCase()}</span>)}
          <span>{td(dialect)}</span>
          {contentType !== "standard" ? <span>{t(`ctype.${contentType}`)}</span> : null}
          {refs.length ? <span>{t("refsCount", { n: refs.length })}</span> : null}
        </div>
        <div className="fine">{t("priceAt", { currency: prices.currency })}</div>
        <div className="price">{video ? prices.video[length] : prices.post}</div>
        <div className="fine">{t("free")}</div>
        <button type="button" className="go" onClick={go} disabled={pending || uploading}>{pending ? t("going") : t("go")}</button>
        {error ? <p className="err" role="alert">{error}</p> : null}
      </aside>
    </div>
  );
}
