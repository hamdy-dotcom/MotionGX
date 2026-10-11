"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { exportVideoAction, requestEditAction, rewriteSceneAction, saveVersion } from "./actions";
import { toLocal } from "@/lib/pricing";
import { formatMoney, formatNumber } from "@/lib/format";
import { ASPECT, formatKey } from "@/lib/video-labels";
import type { BrandProfile, Scene, Video } from "@/lib/types";
import { FilmStrip } from "@/components/film-strip";
import { Heading, boldTag } from "@/components/heading";
import { StatusChip } from "@/components/status-chip";
import { TimelineSlider } from "@/components/timeline-slider";
import { Waveform } from "@/components/illustrations";
import { CompanyMark } from "@/components/company-mark";
import { CheckIcon, DownloadIcon, PlayIcon, SendIcon, SpeakerIcon, SparkIcon, SpinnerIcon } from "@/components/icons";

type Notice = { tone: "ok" | "info" | "error"; text: string; topUp?: boolean } | null;

export function Studio({
  video,
  companyName,
  brand,
  voiceName,
  version,
  initialScenes,
  costUsd,
  fxRate,
  currency,
}: {
  video: Video;
  companyName: string;
  brand: BrandProfile | null;
  voiceName: string | null;
  version: number;
  initialScenes: Scene[];
  costUsd: number;
  fxRate: number;
  currency: string;
}) {
  const t = useTranslations("studio");
  const tc = useTranslations("common");
  const tf = useTranslations("formats");
  const td = useTranslations("dialects");
  const ta = useTranslations("art");
  const locale = useLocale();

  const [scenes, setScenes] = useState<Scene[]>(initialScenes);
  const [selected, setSelected] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [request, setRequest] = useState("");
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"save" | "rewrite" | "export" | "request" | null>(null);

  const scriptDir = video.dialect === "en" ? "ltr" : "rtl";
  const scriptLang = video.dialect === "en" ? "en" : "ar";
  const colors = brand?.colors ?? [];
  const primary = colors[0]?.hex ?? "#5558E3";
  const ink = colors[1]?.hex ?? "#10184A";
  const accent = colors[2]?.hex ?? primary;
  const total = scenes.reduce((s, x) => s + x.duration_s, 0) || 1;
  const price = formatMoney(toLocal(costUsd, fxRate), currency, locale);

  const starts = useMemo(
    () => scenes.map((_, i) => scenes.slice(0, i).reduce((sum, s) => sum + s.duration_s, 0)),
    [scenes],
  );

  const sceneAt = (sec: number) => {
    for (let i = scenes.length - 1; i >= 0; i--) if (sec >= starts[i]) return i;
    return 0;
  };

  // Mock playback: advance the playhead through the scenes. PHASE 3: real Remotion preview.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setTime((prev) => {
        const next = prev + 0.1;
        if (next >= total) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [playing, total]);

  const current = playing ? sceneAt(time) : selected;
  const scene = scenes[current];

  function selectScene(i: number) {
    setPlaying(false);
    setSelected(i);
    setTime(starts[i] ?? 0);
  }

  function seek(pct: number) {
    setPlaying(false);
    const sec = (pct / 100) * total;
    setTime(sec);
    setSelected(sceneAt(sec));
  }

  function updateScene(patch: Partial<Scene>) {
    setScenes((all) => all.map((s, i) => (i === selected ? { ...s, ...patch } : s)));
    setDirty(true);
  }

  function run(kind: NonNullable<typeof busy>, fn: () => Promise<void>) {
    setBusy(kind);
    setNotice(null);
    startTransition(async () => {
      try {
        await fn();
      } catch {
        setNotice({ tone: "error", text: tc("error") });
      } finally {
        setBusy(null);
      }
    });
  }

  const onSave = () =>
    run("save", async () => {
      const res = await saveVersion(video.id, scenes);
      if (!res.ok) throw new Error();
      setDirty(false);
      setNotice({ tone: "ok", text: t("saved", { n: formatNumber(res.version, locale) }) });
    });

  const onRewrite = () =>
    run("rewrite", async () => {
      const next = await rewriteSceneAction(scenes[selected], video.dialect);
      updateScene({ on_screen_text: next.on_screen_text, voiceover_line: next.voiceover_line });
    });

  const onRequest = (e: FormEvent) => {
    e.preventDefault();
    if (!request.trim()) return;
    run("request", async () => {
      await requestEditAction(video.id, request);
      setRequest("");
      setNotice({ tone: "info", text: t("requestSaved") });
    });
  };

  const onExport = () =>
    run("export", async () => {
      if (dirty) {
        const saved = await saveVersion(video.id, scenes);
        if (!saved.ok) throw new Error();
        setDirty(false);
      }
      const res = await exportVideoAction(video.id);
      if (res.ok) {
        setNotice({ tone: "ok", text: t("exportQueued", { price: formatMoney(toLocal(res.costUsd, fxRate), currency, locale) }) });
      } else if (res.error === "insufficient") {
        setNotice({ tone: "error", text: t("insufficient"), topUp: true });
      } else {
        throw new Error();
      }
    });

  const markers = starts.slice(1).map((s) => (s / total) * 100);
  const exporting = video.status === "exporting";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <CompanyMark name={companyName} colors={colors} size="size-11" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold tracking-tight">{video.title}</h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
            <span>{companyName}</span>
            <span aria-hidden="true">·</span>
            <span>
              {tf(formatKey(video.format))} <span dir="ltr">{video.format}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>{tc("seconds", { n: formatNumber(video.length_s, locale) })}</span>
            <span aria-hidden="true">·</span>
            <span>{td(video.dialect)}</span>
            <span aria-hidden="true">·</span>
            <span>{t("version", { n: formatNumber(version, locale) })}</span>
          </p>
        </div>
        <StatusChip status={video.status} />
        <button type="button" onClick={onExport} disabled={pending || exporting} className="btn btn-primary">
          {busy === "export" ? <SpinnerIcon className="size-4" /> : <DownloadIcon className="size-4" />}
          {busy === "export" ? t("exporting") : t("export", { price })}
        </button>
      </div>

      {notice ? (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className={`flex flex-wrap items-center gap-3 rounded-full px-5 py-2.5 text-sm ${
            notice.tone === "ok" ? "bg-success-bg text-success-ink" : notice.tone === "error" ? "bg-danger-bg text-danger-ink" : "bg-primary-light text-primary-dark"
          }`}
        >
          {notice.tone === "ok" ? <CheckIcon className="size-4" /> : null}
          <span className="flex-1">{notice.text}</span>
          {notice.topUp ? (
            <Link href="/wallet" className="btn btn-white min-h-9 px-4">
              {t("topUp")}
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[260px_1fr_340px]">
        {/* Scene list */}
        <section className="panel">
          <Heading as="h2" className="mb-3 text-lg">
            {t.rich("scenes", boldTag)}
          </Heading>
          <ol className="flex gap-2 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible">
            {scenes.map((s, i) => (
              <li key={s.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => selectScene(i)}
                  aria-current={i === current ? "step" : undefined}
                  className={`flex min-h-pill w-full items-center gap-3 rounded-full p-1.5 pe-4 text-start text-sm transition-colors ${
                    i === current ? "bg-white shadow-[inset_0_0_0_1.5px_var(--primary)]" : "bg-white/60 hover:bg-white"
                  }`}
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      i === current ? "bg-primary text-white" : "bg-primary-light text-primary-dark"
                    }`}
                  >
                    {formatNumber(i + 1, locale)}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium" lang="ar" dir="rtl">
                    {s.title}
                  </span>
                  <span className="text-xs text-ink-muted">{tc("seconds", { n: formatNumber(s.duration_s, locale) })}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>

        {/* Preview */}
        <section className="min-w-0">
          <FilmStrip holes={12}>
            <div className="flex justify-center bg-field p-4">
              <div
                className={`@container relative w-full overflow-hidden rounded-xl ${ASPECT[video.format]} ${
                  video.format === "9:16" ? "max-w-[260px]" : video.format === "1:1" ? "max-w-[400px]" : ""
                }`}
                style={{ backgroundColor: ink }}
                dir={scriptDir}
                lang={scriptLang}
              >
                <div className="absolute inset-0 flex flex-col justify-between p-[7%]">
                  <div className="flex items-center gap-2">
                    <CompanyMark name={companyName} colors={colors} size="size-8" />
                    <span className="text-xs font-semibold text-white/80">{companyName}</span>
                  </div>
                  <p
                    key={`${current}-${scene?.on_screen_text}`}
                    className="text-[clamp(1.1rem,4.5cqw,2.4rem)] leading-snug font-bold"
                    style={{ color: current % 2 === 0 ? "#FFFFFF" : primary, fontFamily: brand?.fonts?.arabic }}
                  >
                    {scene?.on_screen_text}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: primary }} />
                    <span className="h-1.5 w-1/4 rounded-full" style={{ backgroundColor: accent }} />
                  </div>
                </div>
                {!playing ? (
                  <button
                    type="button"
                    onClick={() => {
                      setTime(starts[selected] ?? 0);
                      setPlaying(true);
                    }}
                    aria-label={t("play")}
                    className="absolute inset-0 m-auto flex size-16 items-center justify-center rounded-full bg-primary text-white shadow-card transition-transform hover:scale-105"
                  >
                    <PlayIcon className="size-7 translate-x-0.5" />
                  </button>
                ) : null}
              </div>
            </div>
          </FilmStrip>
        </section>

        {/* Scene properties */}
        <section className="panel space-y-4">
          <Heading as="h2" className="text-lg">
            {t.rich("properties", boldTag)}
          </Heading>
          <p className="text-sm font-semibold text-primary-dark">
            {t("sceneN", { n: formatNumber(current + 1, locale) })} · <span lang="ar">{scene?.title}</span>
          </p>
          <div>
            <label htmlFor="ost" className="label mb-2 block">
              {t("onScreenText")}
            </label>
            <textarea
              id="ost"
              rows={2}
              dir={scriptDir}
              lang={scriptLang}
              value={scene?.on_screen_text ?? ""}
              onChange={(e) => updateScene({ on_screen_text: e.target.value })}
              className="w-full resize-y rounded-[20px] bg-white p-3 text-sm outline-none focus:shadow-[inset_0_0_0_1.5px_var(--primary)]"
            />
          </div>
          <div>
            <label htmlFor="vol" className="label mb-2 block">
              {t("voiceoverLine")}
            </label>
            <textarea
              id="vol"
              rows={3}
              dir={scriptDir}
              lang={scriptLang}
              value={scene?.voiceover_line ?? ""}
              onChange={(e) => updateScene({ voiceover_line: e.target.value })}
              className="w-full resize-y rounded-[20px] bg-white p-3 text-sm outline-none focus:shadow-[inset_0_0_0_1.5px_var(--primary)]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setNotice({ tone: "info", text: t("listenSoon") })}
              className="btn btn-white"
            >
              <SpeakerIcon className="size-4" />
              {t("listen")}
            </button>
            <button type="button" onClick={onRewrite} disabled={pending} className="btn btn-white">
              {busy === "rewrite" ? <SpinnerIcon className="size-4" /> : <SparkIcon className="size-4" />}
              {t("rewrite")}
            </button>
          </div>
          <button type="button" onClick={onSave} disabled={pending || !dirty} className="btn btn-primary w-full">
            {busy === "save" ? <SpinnerIcon className="size-4" /> : <CheckIcon className="size-4" />}
            {busy === "save" ? tc("saving") : t("saveChanges")}
          </button>

          <div className="divider" />

          <form onSubmit={onRequest}>
            <label htmlFor="req" className="label mb-2 block">
              {t("requestEdit")}
            </label>
            <div className="flex items-end gap-2 rounded-[22px] bg-white p-1.5">
              <textarea
                id="req"
                rows={2}
                value={request}
                onChange={(e) => setRequest(e.target.value)}
                placeholder={t("requestPlaceholder")}
                className="min-h-pill flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-ink-muted/70"
              />
              <button type="submit" disabled={pending || !request.trim()} aria-label={t("send")} className="btn btn-primary size-11 shrink-0 px-0">
                {busy === "request" ? <SpinnerIcon className="size-4" /> : <SendIcon className="size-4" />}
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* Timeline */}
      <section className="panel">
        <div className="flex items-center justify-between gap-3">
          <Heading as="h2" className="text-lg">
            {t.rich("timeline", boldTag)}
          </Heading>
          <span className="text-sm text-ink-muted tabular-nums">
            {tc("seconds", { n: formatNumber(time, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) })} /{" "}
            {tc("seconds", { n: formatNumber(total, locale) })}
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[640px] space-y-3">
            <div className="flex gap-1.5">
              {scenes.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectScene(i)}
                  style={{ flexGrow: s.duration_s, flexBasis: 0, backgroundColor: i % 2 === 0 ? ink : primary }}
                  className={`h-14 min-w-0 overflow-hidden rounded-xl px-2 text-start text-[11px] leading-tight text-white ${
                    i === current ? "ring-2 ring-primary ring-offset-2 ring-offset-field" : "opacity-80 hover:opacity-100"
                  }`}
                  dir={scriptDir}
                  lang={scriptLang}
                >
                  <span className="line-clamp-2">{s.on_screen_text}</span>
                </button>
              ))}
            </div>
            <TimelineSlider
              value={(time / total) * 100}
              markers={markers}
              onChange={seek}
              label={t("playhead")}
              valueText={`${formatNumber(Math.round(time), locale)} / ${formatNumber(total, locale)}`}
            />
            <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2">
              <SpeakerIcon className="size-4 shrink-0 text-teal-ink" />
              <span className="shrink-0 text-xs font-medium text-ink-2">
                {video.voiceover ? `${t("voiceTrack")} · ${voiceName ?? ""}` : t("noVoice")}
              </span>
              <Waveform label={ta("waveform")} active={video.voiceover} seed={video.length_s} className="h-8 w-full" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
