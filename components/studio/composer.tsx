"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { createPost } from "@/app/[locale]/(app)/posts/new/actions";
import { createVideo } from "@/app/[locale]/(app)/videos/new/actions";
import { KindIcon, PlatformIcon } from "./platform-icon";

type Kind = "image" | "carousel" | "video" | "text";
const KINDS: Kind[] = ["image", "carousel", "video", "text"];
const PLATFORMS = ["instagram", "facebook", "tiktok", "linkedin", "x"] as const;
// the composer stays off the screens that have their own form or are the making itself
const HIDDEN = ["/create", "/plans", "/videos", "/posts", "/companies", "/brand"];

export type ComposerBrand = { id: string; name: string; dialect: string; palette: string[]; example: string };

/** The docked composer: one line of idea, a type, a day and the platforms — it starts the real video or post and opens
 *  its creating screen. */
export function Composer({ brand, days, prices }: { brand: ComposerBrand | null; days: { key: string; label: string }[]; prices: { post: string; video: string } }) {
  const t = useTranslations("compose");
  const path = usePathname();
  const [kind, setKind] = useState<Kind>("image");
  const [plats, setPlats] = useState<string[]>(["instagram", "facebook"]);
  const [day, setDay] = useState(days[0]?.key ?? "");
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [snap, setSnap] = useState(false);
  const [pending, start] = useTransition();
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement as HTMLElement)?.tagName ?? "")) { e.preventDefault(); area.current?.focus(); } };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  useEffect(() => { if (!msg) return; const h = setTimeout(() => setMsg(null), 2400); return () => clearTimeout(h); }, [msg]);

  if (!brand || HIDDEN.some((h) => path.startsWith(h))) return null;

  function submit() {
    const brief = text.trim();
    if (!brief) { area.current?.focus(); setMsg(t("empty")); return; }
    if (kind !== "video" && !plats.length) { setMsg(t("platforms")); return; }
    setSnap(false); requestAnimationFrame(() => setSnap(true));
    const fd = new FormData();
    fd.set("brief", brief); fd.set("company_id", brand!.id); fd.set("dialect", brand!.dialect); fd.set("scheduled_on", day);
    start(async () => {
      let res: { error?: string; aiError?: string } | undefined;
      if (kind === "video") {
        fd.set("goal", "sell"); fd.set("format", "9:16"); fd.set("length_s", "30"); fd.set("pace", "medium");
        res = await createVideo({}, fd);
      } else {
        fd.set("type", kind === "image" ? "single" : kind); fd.set("ai_image", kind === "text" ? "no" : "auto");
        plats.forEach((p) => fd.append("platforms", p));
        res = await createPost({}, fd);
      }
      if (res?.error || res?.aiError) setMsg(t("failed"));
    });
  }

  return (
    <>
      <form className={`s-dock${snap ? " snap" : ""}`} onSubmit={(e) => { e.preventDefault(); submit(); }} autoComplete="off">
        <div className="s-dstrip" aria-hidden="true">{brand.palette.map((h, i) => <i key={`${h}-${i}`} style={{ background: h }} />)}</div>
        <textarea
          ref={area}
          rows={1}
          aria-label={t("idea")}
          value={text}
          placeholder={t("placeholder", { name: brand.name, example: brand.example })}
          onChange={(e) => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${e.target.scrollHeight}px`; }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
        />
        <div className="s-drow">
          <div className="s-dscroll">
            <div className="s-dseg" role="group">
              {KINDS.map((k) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}><KindIcon k={k} size={14} />{t(`kinds.${k}`)}</button>)}
            </div>
            <select className="s-dsel" aria-label={t("day")} value={day} onChange={(e) => setDay(e.target.value)}>
              {days.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
            {kind === "video" ? null : (
              <div className="s-dplats">
                {PLATFORMS.map((p) => <button key={p} type="button" className="s-dplat" aria-pressed={plats.includes(p)} title={p} onClick={() => setPlats((v) => (v.includes(p) ? v.filter((x) => x !== p) : [...v, p]))}><PlatformIcon p={p} /></button>)}
              </div>
            )}
          </div>
          <div className="s-dend">
            <span className="s-dprice"><span className="lbl">{t("atDownload")} </span><b>{kind === "video" ? prices.video : prices.post}</b></span>
            <button className="s-btn lit" type="submit" disabled={pending}>{pending ? t("making") : t("make")}</button>
          </div>
        </div>
      </form>
      <div className={`s-toast${msg ? " on" : ""}`} role="status">{msg}</div>
    </>
  );
}
