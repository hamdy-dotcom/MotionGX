"use client";

import { useRef, useState, type DragEvent } from "react";
import { useTranslations } from "next-intl";
import { getBrowserClient } from "@/lib/supabase/browser";
import { LIVE_BUCKET } from "@/lib/live-engine/protocol";
import { MAX_REFS, REF_TYPES, type Ref } from "@/lib/refs";

type Item = Ref & { key: string; preview?: string; status: "uploading" | "ready" | "failed" };

/** References for a piece being created: images and short videos (uploaded straight to storage) and links, each with
 *  an optional note ("this is the new checkout", "use this colour"). The director and the post writer see them. */
export function RefsPicker({ companyId, value, onChange }: { companyId: string; value: Item[]; onChange: (items: Item[] | ((prev: Item[]) => Item[])) => void }) {
  const t = useTranslations("refs");
  const input = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState("");
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(files: FileList | File[]) {
    setError(null);
    for (const file of [...files].slice(0, MAX_REFS - value.length)) {
      const type = REF_TYPES[file.type];
      if (!type) { setError(t("badType", { name: file.name })); continue; }
      if (file.size > type.max) { setError(t("tooBig", { name: file.name, mb: Math.round(type.max / 1048576) })); continue; }
      const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      onChange((v) => [...v, { key, kind: type.kind, path: "", name: file.name, preview: URL.createObjectURL(file), status: "uploading" }]);
      try {
        const r = await fetch("/api/refs/sign", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId, type: file.type, size: file.size }) });
        const s = (await r.json()) as { path?: string; token?: string };
        if (!r.ok || !s.path || !s.token) throw new Error("sign");
        const { error: up } = await getBrowserClient().storage.from(LIVE_BUCKET).uploadToSignedUrl(s.path, s.token, file, { contentType: file.type });
        if (up) throw up;
        onChange((v) => v.map((x) => (x.key === key ? ({ ...x, path: s.path!, status: "ready" } as Item) : x)));
      } catch {
        onChange((v) => v.map((x) => (x.key === key ? { ...x, status: "failed" } : x)));
      }
    }
  }
  const addLink = () => {
    try {
      const u = new URL(link.trim().startsWith("http") ? link.trim() : `https://${link.trim()}`);
      if (u.protocol !== "https:") throw new Error();
      onChange((v) => [...v, { key: `l-${Date.now()}`, kind: "link", url: u.toString(), name: u.host, status: "ready" }]);
      setLink("");
    } catch { setError(t("badLink")); }
  };
  const drop = (e: DragEvent) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files.length) void add(e.dataTransfer.files); };

  return (
    <div className="s-refs">
      <div className={`s-refs-drop${over ? " over" : ""}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}>
        <button type="button" className="s-btn ghost small" onClick={() => input.current?.click()} disabled={value.length >= MAX_REFS}>＋ {t("add")}</button>
        <span>{t("dropHint")}</span>
        <input ref={input} type="file" multiple hidden accept={Object.keys(REF_TYPES).join(",")} onChange={(e) => { if (e.target.files) void add(e.target.files); e.target.value = ""; }} />
      </div>
      {value.length ? (
        <ul className="s-refs-list">
          {value.map((r) => (
            <li key={r.key} className={r.status}>
              <span className="s-refs-thumb">
                {r.kind === "image" && r.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local preview
                  <img src={r.preview} alt="" />
                ) : r.kind === "video" && r.preview ? <video src={r.preview} muted playsInline /> : <b>🔗</b>}
              </span>
              <span className="s-refs-body">
                <span className="s-refs-name" dir="auto">{r.name}{r.status === "uploading" ? ` · ${t("uploading")}` : r.status === "failed" ? ` · ${t("failed")}` : ""}</span>
                <input value={r.note ?? ""} onChange={(e) => onChange((v) => v.map((x) => (x.key === r.key ? { ...x, note: e.target.value } : x)))} placeholder={t("notePlaceholder")} aria-label={t("note", { name: r.name })} dir="auto" />
              </span>
              <button type="button" className="s-refs-x" onClick={() => onChange((v) => v.filter((x) => x.key !== r.key))} aria-label={t("remove", { name: r.name })}>×</button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="s-refs-link">
        <input value={link} onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }} placeholder={t("linkPlaceholder")} dir="ltr" aria-label={t("linkPlaceholder")} />
        <button type="button" className="s-btn ghost small" onClick={addLink} disabled={!link.trim() || value.length >= MAX_REFS}>{t("addLink")}</button>
      </div>
      {error ? <p className="s-refs-err" role="alert">{error}</p> : null}
    </div>
  );
}

export type RefItem = Item;
/** what the create actions get: the uploaded / linked references, without previews */
export const refsForForm = (items: Item[]): Ref[] => items.filter((r) => r.status === "ready").map((r) => (r.kind === "link" ? { kind: "link", url: r.url, name: r.name, ...(r.note ? { note: r.note } : {}) } : { kind: r.kind, path: r.path, name: r.name, ...(r.note ? { note: r.note } : {}) }));
