"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Player, type PlayerRef } from "@remotion/player";
import { Link, useRouter } from "@/i18n/navigation";
import {
  changeTrack,
  exportVideoAction,
  getRenderStatus,
  renderDownloadUrl,
  requestEditAction,
  rewriteSceneAction,
  saveVersion,
  setMusicEnabled,
} from "./actions";
import { toLocal } from "@/lib/pricing";
import { formatMoney, formatNumber } from "@/lib/format";
import { formatKey } from "@/lib/video-labels";
import { dimensionsFor, type BrandVideoProps, type KitScene } from "@/lib/video/kit";
import { computeTimeline } from "@/lib/video/timeline";
import type { Video } from "@/lib/types";
import type { AiErrorCode } from "@/lib/ai/errors";
import { getBrowserClient } from "@/lib/supabase/browser";
import { BrandVideo } from "@/remotion/BrandVideo";
import { Heading, boldTag } from "@/components/heading";
import { StatusChip } from "@/components/status-chip";
import { TimelineSlider } from "@/components/timeline-slider";
import { CompanyMark } from "@/components/company-mark";
import { CheckIcon, DownloadIcon, PlayIcon, PlusIcon, SendIcon, SparkIcon, SpinnerIcon } from "@/components/icons";

type Notice = { tone: "ok" | "info" | "error"; text: string; topUp?: boolean } | null;
export type RenderInfo = { id: string; status: string; progress: number; downloadUrl: string | null };

const FPS = 30;

export function Studio({
  video,
  companyName,
  version,
  initialProps,
  musicMood,
  costUsd,
  fxRate,
  currency,
  initialRender,
}: {
  video: Video;
  companyName: string;
  version: number;
  initialProps: BrandVideoProps;
  musicMood: string | null;
  costUsd: number;
  fxRate: number;
  currency: string;
  initialRender: RenderInfo | null;
}) {
  const t = useTranslations("studio");
  const tc = useTranslations("common");
  const tf = useTranslations("formats");
  const td = useTranslations("dialects");
  const te = useTranslations("aiErrors");
  const tm = useTranslations("music");
  const locale = useLocale();
  const router = useRouter();
  const playerRef = useRef<PlayerRef>(null);

  const [scenes, setScenes] = useState<KitScene[]>(initialProps.scenes);
  const [music, setMusic] = useState(initialProps.music);
  const [musicOn, setMusicOn] = useState(video.music_enabled !== false && !!initialProps.music);
  const [mood, setMood] = useState(musicMood);
  const [selected, setSelected] = useState(0);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [request, setRequest] = useState("");
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"save" | "rewrite" | "export" | "request" | "music" | null>(null);
  const [render, setRender] = useState<RenderInfo | null>(initialRender);
  // The Player renders client-side only (fonts + delayRender need the DOM).
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const total = Math.round(video.length_s * FPS);
  const bpm = music?.bpm ?? initialProps.bpm;
  const timeline = useMemo(() => computeTimeline(scenes.map((s) => s.duration_beats), { fps: FPS, bpm, lengthS: video.length_s }), [scenes, bpm, video.length_s]);
  const sceneAtFrame = useCallback((f: number) => timeline.findLast((tl) => f >= tl.startFrame)?.index ?? 0, [timeline]);
  const current = playing ? sceneAtFrame(frame) : selected;
  const scene = scenes[current];
  const { width, height } = dimensionsFor(video.format);
  const inputProps: BrandVideoProps = useMemo(() => ({ ...initialProps, scenes, music: musicOn ? music : null }), [initialProps, scenes, music, musicOn]);
  const scriptDir = video.dialect === "en" ? "ltr" : "rtl";
  const price = formatMoney(toLocal(costUsd, fxRate), currency, locale);

  // Bind the timeline to the player.
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    const onFrame = (e: { detail: { frame: number } }) => setFrame(e.detail.frame);
    const onPlay = () => setPlaying(true);
    const onPause = () => {
      setPlaying(false);
      setSelected(sceneAtFrame(p.getCurrentFrame()));
    };
    p.addEventListener("frameupdate", onFrame);
    p.addEventListener("play", onPlay);
    p.addEventListener("pause", onPause);
    return () => {
      p.removeEventListener("frameupdate", onFrame);
      p.removeEventListener("play", onPlay);
      p.removeEventListener("pause", onPause);
    };
  }, [mounted, sceneAtFrame]);

  // Render progress: Supabase Realtime on `renders`, with a polling fallback.
  const renderId = render?.id;
  const renderActive = render?.status === "queued" || render?.status === "rendering";
  useEffect(() => {
    if (!renderId || !renderActive) return;
    const onUpdate = async (status: string, progress: number) => {
      setRender((r) => (r && r.id === renderId ? { ...r, status, progress } : r));
      if (status === "done") {
        const url = await renderDownloadUrl(renderId);
        setRender((r) => (r && r.id === renderId ? { ...r, downloadUrl: url } : r));
        setNotice({ tone: "ok", text: t("renderDone") });
        router.refresh();
      } else if (status === "failed") {
        setNotice({ tone: "error", text: t("renderFailed") });
        router.refresh();
      }
    };
    const sb = getBrowserClient();
    const channel = sb
      .channel(`render-${renderId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "renders", filter: `id=eq.${renderId}` }, (payload: { new: Record<string, unknown> }) => {
        const row = payload.new as { status: string; progress: number };
        void onUpdate(row.status, Number(row.progress ?? 0));
      })
      .subscribe();
    const poll = setInterval(async () => {
      const s = await getRenderStatus(renderId);
      if (s) void onUpdate(s.status, s.progress);
    }, 5000);
    return () => {
      clearInterval(poll);
      void sb.removeChannel(channel);
    };
  }, [renderId, renderActive, router, t]);

  function seekToScene(i: number) {
    setSelected(i);
    playerRef.current?.pause();
    playerRef.current?.seekTo(timeline[i]?.startFrame ?? 0);
  }

  function seek(pct: number) {
    const f = Math.round((pct / 100) * (total - 1));
    playerRef.current?.seekTo(f);
    setFrame(f);
    setSelected(sceneAtFrame(f));
  }

  function updateScene(patch: Partial<KitScene>) {
    setScenes((all) => all.map((s, i) => (i === selected ? ({ ...s, ...patch } as KitScene) : s)));
    setDirty(true);
  }

  function setLine(index: number, text: string) {
    if (!scene) return;
    updateScene({ lines: scene.lines.map((l, i) => (i === index ? text : l)) });
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

  const aiErrorText = (code: AiErrorCode | "generic") => (code === "generic" ? tc("error") : te(code));

  const onSave = () =>
    run("save", async () => {
      const res = await saveVersion(video.id, scenes);
      if (!res.ok) throw new Error();
      setDirty(false);
      setNotice({ tone: "ok", text: t("saved", { n: formatNumber(res.version, locale) }) });
    });

  const onRewrite = () =>
    run("rewrite", async () => {
      const res = await rewriteSceneAction(video.id, scenes, selected);
      if (!res.ok) return setNotice({ tone: "error", text: aiErrorText(res.error) });
      setScenes(res.scenes);
      setDirty(false);
      setNotice({ tone: "ok", text: t("rewritten", { n: formatNumber(res.version, locale) }) });
    });

  const onRequest = (e: FormEvent) => {
    e.preventDefault();
    if (!request.trim()) return;
    run("request", async () => {
      const res = await requestEditAction(video.id, scenes, request);
      if (!res.ok) return setNotice({ tone: "error", text: aiErrorText(res.error) });
      setScenes(res.scenes);
      setDirty(false);
      setSelected((i) => Math.min(i, res.scenes.length - 1));
      setRequest("");
      setNotice({ tone: "ok", text: t("editApplied", { n: formatNumber(res.version, locale), summary: res.summary ?? "" }) });
    });
  };

  const onToggleMusic = () =>
    run("music", async () => {
      const res = await setMusicEnabled(video.id, !musicOn);
      if (!res) throw new Error();
      setMusicOn(res.enabled);
      if (res.music) setMusic(res.music);
      setMood(res.mood ?? mood);
    });

  const onChangeTrack = () =>
    run("music", async () => {
      const res = await changeTrack(video.id);
      if (!res?.music) throw new Error();
      setMusic(res.music);
      setMusicOn(true);
      setMood(res.mood);
    });

  const onExport = () =>
    run("export", async () => {
      if (dirty) {
        const saved = await saveVersion(video.id, scenes);
        if (!saved.ok) throw new Error();
        setDirty(false);
      }
      const res = await exportVideoAction(video.id);
      if (res.ok) {
        setRender({ id: res.renderId, status: "queued", progress: 0, downloadUrl: null });
        setNotice({ tone: "ok", text: t("exportQueued", { price: formatMoney(toLocal(res.costUsd, fxRate), currency, locale) }) });
        router.refresh();
      } else if (res.error === "insufficient") {
        setNotice({ tone: "error", text: t("insufficient"), topUp: true });
      } else {
        throw new Error();
      }
    });

  const exporting = video.status === "exporting" || renderActive;
  const markers = timeline.slice(1).map((tl) => (tl.startFrame / total) * 100);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <CompanyMark name={companyName} colors={initialProps.brand.colors} size="size-11" />
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
        {render?.status === "done" && render.downloadUrl ? (
          <a href={render.downloadUrl} className="btn btn-white" download>
            <DownloadIcon className="size-4" />
            {t("download")}
          </a>
        ) : null}
        <button type="button" onClick={onExport} disabled={pending || exporting} className="btn btn-primary">
          {busy === "export" ? <SpinnerIcon className="size-4" /> : <DownloadIcon className="size-4" />}
          {busy === "export" ? t("exporting") : t("export", { price })}
        </button>
      </div>

      {renderActive ? (
        <div className="panel" role="status" aria-live="polite">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 font-semibold text-primary-dark">
              <SpinnerIcon className="size-4" />
              {render?.status === "queued" ? t("renderQueued") : t("rendering")}
            </span>
            <span className="tabular-nums text-ink-muted">{formatNumber(Math.round((render?.progress ?? 0) * 100), locale)}%</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-primary-lavender">
            <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${Math.max(3, (render?.progress ?? 0) * 100)}%` }} />
          </div>
        </div>
      ) : null}

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

      <div className="grid gap-5 xl:grid-cols-[260px_1fr_360px]">
        {/* Scene list */}
        <section className="panel">
          <Heading as="h2" className="mb-3 text-lg">
            {t.rich("scenes", boldTag)}
          </Heading>
          <ol className="flex gap-2 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible">
            {scenes.map((s, i) => (
              <li key={`${s.id}-${i}`} className="shrink-0">
                <button
                  type="button"
                  onClick={() => seekToScene(i)}
                  aria-current={i === current ? "step" : undefined}
                  className={`flex min-h-pill w-full items-center gap-3 rounded-full p-1.5 pe-4 text-start text-sm transition-colors ${
                    i === current ? "bg-white shadow-[inset_0_0_0_1.5px_var(--primary)]" : "bg-white/60 hover:bg-white"
                  }`}
                >
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i === current ? "bg-primary text-white" : "bg-primary-light text-primary-dark"}`}>
                    {formatNumber(i + 1, locale)}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium" dir={scriptDir}>
                    {s.title}
                  </span>
                  <span className="text-xs text-ink-muted">{tc("seconds", { n: formatNumber(Math.round((timeline[i]?.durationFrames ?? 0) / FPS), locale) })}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>

        {/* Live preview: the real BrandVideo composition */}
        <section className="min-w-0">
          <div className="overflow-hidden rounded-panel bg-primary-lavender p-3">
            <div className={`mx-auto overflow-hidden rounded-2xl bg-navy ${video.format === "9:16" ? "max-w-[340px]" : video.format === "1:1" ? "max-w-[480px]" : ""}`} style={{ aspectRatio: `${width} / ${height}` }}>
              {mounted ? (
                <Player
                  ref={playerRef}
                  component={BrandVideo}
                  inputProps={inputProps}
                  durationInFrames={total}
                  fps={FPS}
                  compositionWidth={width}
                  compositionHeight={height}
                  style={{ width: "100%", height: "100%" }}
                  acknowledgeRemotionLicense
                  clickToPlay
                  spaceKeyToPlayOrPause
                  numberOfSharedAudioTags={4}
                />
              ) : null}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <button type="button" onClick={() => playerRef.current?.toggle()} className="btn btn-primary" aria-label={t("play")}>
              <PlayIcon className="size-4" />
              {playing ? t("pause") : t("play")}
            </button>
            <button type="button" role="switch" aria-checked={musicOn} onClick={onToggleMusic} disabled={pending} className={`chip ${musicOn ? "chip-solid" : "chip-white"}`}>
              {musicOn ? tm("on") : tm("off")}
            </button>
            <button type="button" onClick={onChangeTrack} disabled={pending} className="btn btn-white">
              {busy === "music" ? <SpinnerIcon className="size-4" /> : <SparkIcon className="size-4" />}
              {tm("change")}
            </button>
            {musicOn && mood ? <span className="text-xs text-ink-muted">{tm("mood", { mood: tm(`mood_${mood}` as "mood_energetic") })}</span> : null}
          </div>
        </section>

        {/* Scene properties */}
        <section className="panel space-y-4">
          <Heading as="h2" className="text-lg">
            {t.rich("properties", boldTag)}
          </Heading>
          <p className="text-sm font-semibold text-primary-dark">
            {t("sceneN", { n: formatNumber(current + 1, locale) })} · <span dir={scriptDir}>{scene?.title}</span>
          </p>
          <div className="space-y-2">
            <p className="label">{t("onScreenText")}</p>
            {scene?.lines.map((line, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={line}
                  dir={scriptDir}
                  disabled={pending}
                  maxLength={48}
                  aria-label={t("lineN", { n: i + 1 })}
                  onChange={(e) => setLine(i, e.target.value)}
                  className="field bg-white"
                />
                {scene.lines.length > 1 ? (
                  <button type="button" onClick={() => updateScene({ lines: scene.lines.filter((_, j) => j !== i) })} className="btn btn-soft min-h-10 px-3" aria-label={t("removeLine")}>
                    ×
                  </button>
                ) : null}
              </div>
            ))}
            {scene && scene.lines.length < 3 ? (
              <button type="button" onClick={() => updateScene({ lines: [...scene.lines, "…"] })} className="btn btn-white">
                <PlusIcon className="size-4" />
                {t("addLine")}
              </button>
            ) : null}
          </div>
          {video.voiceover ? (
            <div>
              <label htmlFor="vol" className="label mb-2 block">
                {t("voiceoverLine")}
              </label>
              <textarea
                id="vol"
                rows={3}
                dir={scriptDir}
                value={scene?.voiceover_line ?? ""}
                disabled={pending}
                onChange={(e) => updateScene({ voiceover_line: e.target.value })}
                className="w-full resize-y rounded-[20px] bg-white p-3 text-sm outline-none focus:shadow-[inset_0_0_0_1.5px_var(--primary)]"
              />
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onRewrite} disabled={pending} className="btn btn-white">
              {busy === "rewrite" ? <SpinnerIcon className="size-4" /> : <SparkIcon className="size-4" />}
              {busy === "rewrite" ? t("rewriting") : t("rewrite")}
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
                disabled={pending}
                onChange={(e) => setRequest(e.target.value)}
                placeholder={t("requestPlaceholder")}
                className="min-h-pill flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-ink-muted/70"
              />
              <button type="submit" disabled={pending || !request.trim()} aria-label={t("send")} className="btn btn-primary size-11 shrink-0 px-0">
                {busy === "request" ? <SpinnerIcon className="size-4" /> : <SendIcon className="size-4" />}
              </button>
            </div>
            {busy === "request" ? (
              <p role="status" className="mt-2 text-xs text-ink-muted">
                {t("editing")}
              </p>
            ) : null}
          </form>
        </section>
      </div>

      {/* Timeline — bound to the player */}
      <section className="panel">
        <div className="flex items-center justify-between gap-3">
          <Heading as="h2" className="text-lg">
            {t.rich("timeline", boldTag)}
          </Heading>
          <span className="text-sm tabular-nums text-ink-muted">
            {tc("seconds", { n: formatNumber(frame / FPS, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) })} / {tc("seconds", { n: formatNumber(video.length_s, locale) })}
          </span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[640px] space-y-3">
            <div className="flex gap-1.5">
              {timeline.map((tl) => {
                const s = scenes[tl.index];
                return (
                  <button
                    key={`${s.id}-${tl.index}`}
                    type="button"
                    onClick={() => seekToScene(tl.index)}
                    style={{ flexGrow: tl.durationFrames, flexBasis: 0 }}
                    className={`h-14 min-w-0 overflow-hidden rounded-xl px-2 text-start text-[11px] leading-tight text-white ${
                      tl.index === current ? "bg-primary ring-2 ring-primary ring-offset-2 ring-offset-field" : "bg-navy/80 hover:bg-navy"
                    }`}
                    dir={scriptDir}
                  >
                    <span className="line-clamp-2">{s.lines.join(" ")}</span>
                  </button>
                );
              })}
            </div>
            <TimelineSlider
              value={(frame / Math.max(1, total - 1)) * 100}
              markers={markers}
              onChange={seek}
              label={t("playhead")}
              valueText={`${formatNumber(Math.round(frame / FPS), locale)} / ${formatNumber(video.length_s, locale)}`}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
