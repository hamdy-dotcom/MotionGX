"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PlatformIcon } from "@/components/studio/platform-icon";
import type { Work } from "@/lib/data/works";
import { dayMono } from "@/lib/dates";

/** The portfolio: filters, search, the grid of prints, and a drawer with the piece. */
export function LibraryView({ works, latin }: { works: Work[]; latin: string }) {
  const t = useTranslations("library");
  const ts = useTranslations("status");
  const [filter, setFilter] = useState<"all" | "video" | "post">("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Work | null>(null);
  const list = works.filter((w) => (filter === "all" || w.kind === filter) && (!q.trim() || w.title.includes(q.trim())));
  const tall = (w: Work) => w.kind === "video" && w.type === "9:16";
  const status = (s: string) => (["draft", "ready", "review", "exporting", "failed", "generating", "needs_direction"].includes(s) ? ts(s as "ready") : s);

  return (
    <>
      <div className="s-slate-line"><span>PORTFOLIO</span><i /><span dir="ltr">{list.length} WORKS · {latin}</span></div>
      <h1 className="s-big"><span className="w">{t("title")}</span></h1>
      <div className="s-row" style={{ marginBottom: 22 }}>
        <div className="s-chips">
          {(["all", "video", "post"] as const).map((f) => <button key={f} type="button" className="s-chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>{t(f === "all" ? "all" : f === "video" ? "videos" : "posts")}</button>)}
        </div>
        <input className="s-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} />
      </div>
      {list.length ? (
        <div className="s-sheetgrid">
          {list.map((w, i) => (
            <button key={w.id} type="button" className="s-shot" style={{ animationDelay: `${i * 70}ms` }} onClick={() => setOpen(w)}>
              <div className={`img${tall(w) ? " v" : ""}`}>
                {w.thumb ? <i style={{ backgroundImage: `url(${w.thumb})` }} /> : <span className="tile" dir="auto">{w.title}</span>}
                <span className={`s-tag${w.kind === "video" ? " v" : ""}`}>{w.kind === "video" ? "VIDEO" : "POST"}</span>
                <span className="s-fno">#{String(list.length - i).padStart(3, "0")}</span>
              </div>
              <span className="t" dir="auto">{w.title}</span>
              <span className="m">{w.platforms.map((p) => <PlatformIcon key={p} p={p} />)}<span>{dayMono(w.day)} · {status(w.status)}</span></span>
            </button>
          ))}
        </div>
      ) : (
        <p style={{ color: "var(--s-muted)" }}>{t("empty")} <Link href="/create" className="s-btn lit small">{t("makeFirst")}</Link></p>
      )}
      {open ? (
        <div className="s-drawer" role="dialog" aria-label={open.title}>
          <div className="s-row"><span className={`s-tag${open.kind === "video" ? " v" : ""}`} style={{ position: "static" }}>{open.kind === "video" ? "VIDEO" : "POST"} · {status(open.status)}</span><button type="button" className="s-btn ghost small" onClick={() => setOpen(null)}>{t("close")}</button></div>
          <div className={`art${tall(open) ? " v" : ""}`} style={open.thumb ? { backgroundImage: `url(${open.thumb})` } : undefined} />
          <h2 style={{ margin: "0 0 6px", fontSize: 22 }} dir="auto">{open.title}</h2>
          <p className="s-mono" style={{ color: "var(--s-muted)", margin: "0 0 12px", fontSize: 11, display: "flex", gap: 6, alignItems: "center" }}>{latin} · {dayMono(open.day)} · {open.platforms.map((p) => <PlatformIcon key={p} p={p} />)}</p>
          <p style={{ color: "var(--s-ink-2)", fontSize: 13 }}>{open.kind === "post" ? t(`types.${open.type as "single"}`) : <span dir="ltr">{open.type}</span>}</p>
          <div className="s-chips"><Link href={open.href} className="s-btn lit small">{t("open")}</Link><Link href="/calendar" className="s-btn ghost small">{t("schedule")}</Link></div>
        </div>
      ) : null}
    </>
  );
}
