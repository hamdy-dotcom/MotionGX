"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  anotherDirection,
  exportVideoAction,
  getGenerationStatus,
  getRenderStatus,
  renderDownloadUrl,
  requestEdit,
  saveLines,
  setMusicEnabled,
  type ActionResult,
} from "./actions";
import { toLocal } from "@/lib/pricing";
import { formatMoney, formatNumber } from "@/lib/format";
import { formatKey } from "@/lib/video-labels";
import type { BrandColor, Video } from "@/lib/types";
import type { Plan } from "@/lib/motion/plan";
import type { MotionSpec } from "@/lib/motion/spec";
import type { RuntimeInput } from "@/remotion/runtime-input";
import type { ScriptBeat } from "@motiongx/primitives";
import { getBrowserClient } from "@/lib/supabase/browser";
import { Heading, boldTag } from "@/components/heading";
import { StatusChip } from "@/components/status-chip";
import { TimelineSlider } from "@/components/timeline-slider";
import { CompanyMark } from "@/components/company-mark";
import { MotionPreview, type PreviewHandle, type PreviewProps } from "@/components/motion-preview";
import { CheckIcon, DownloadIcon, PlayIcon, SendIcon, SparkIcon, SpinnerIcon } from "@/components/icons";

type Notice = { tone: "ok" | "info" | "error"; text: string; topUp?: boolean } | null;
export type RenderInfo = { id: string; status: string; progress: number; downloadUrl: string | null };
export type StudioVersion = {
  version: number;
  spec: MotionSpec;
  custom: Record<string, string>;
  input: RuntimeInput;
  plan: Plan;
  beats: ScriptBeat[];
  /** validation rounds + background taste verdict */
  qa: { validation?: { stage: string }[]; taste?: { score: number; note: string } | null };
  mixUrl: string | null;
  sfxUrl: string | null;
};

const STAGES = ["queued", "plan", "spec", "music", "ready", "done"] as const;
type Stage = (typeof STAGES)[number];

export function Studio({
  video,
  generation,
  companyName,
  companyColors,
  current,
  costUsd,
  fxRate,
  currency,
  initialRender,
}: {
  video: Video;
  generation: Record<string, unknown> | null;
  companyName: string;
  companyColors: BrandColor[];
  current: StudioVersion | null;
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
  const previewRef = useRef<PreviewHandle>(null);

  const [beats, setBeats] = useState<ScriptBeat[]>(current?.beats ?? []);
  const [musicOn, setMusicOn] = useState(video.music_enabled !== false);
  const [selected, setSelected] = useState(0);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [request, setRequest] = useState("");
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"save" | "direction" | "export" | "request" | "music" | null>(null);
  const [render, setRender] = useState<RenderInfo | null>(initialRender);
  const [status, setStatus] = useState(video.status);
  const [gen, setGen] = useState<Record<string, unknown> | null>(generation);
  // The preview iframe needs window.location.origin, so it mounts client-side only.
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const fps = current?.input.fps ?? 30;
  const total = current?.input.durationInFrames ?? Math.round(video.length_s * 30);
  const { width, height } = current?.input ?? { width: 1080, height: 1920 };
  const scriptDir = video.dialect === "en" ? "ltr" : "rtl";
  const price = formatMoney(toLocal(costUsd, fxRate), currency, locale);
  const seconds = frame / fps;
  const beatAt = (s: number) => Math.max(0, beats.findLastIndex((b) => s >= b.start_s));
  const active = playing ? beatAt(seconds) : selected;
  const beat = beats[active];
  const generating = status === "generating";
  const stage = String(gen?.stage ?? "queued");

  // The props the sandbox receives. Lines edited here re-render live (the composition reads them from props).
  const previewProps: PreviewProps | null = useMemo(() => {
    if (!current) return null;
    return {
      spec: current.spec,
      custom: current.custom,
      input: { ...current.input, script: { ...current.input.script, beats } },
      audio: { music: musicOn ? current.mixUrl : current.sfxUrl, sfx: null, voiceover: null },
    };
  }, [current, beats, musicOn]);

  // Generation progress: poll while the background job runs; refresh when a version lands.
  useEffect(() => {
    if (!generating) return;
    const poll = setInterval(async () => {
      const s = await getGenerationStatus(video.id);
      if (!s) return;
      setGen(s.generation);
      if (s.status !== "generating") {
        setStatus(s.status as Video["status"]);
        const g = String(s.generation.stage ?? "");
        if (g === "edit_failed") setNotice({ tone: "info", text: t("editFailed") });
        else if (g === "needs_direction" && current) setNotice({ tone: "info", text: t("directionFailed") });
        else if (g === "error") setNotice({ tone: "error", text: tc("error") });
        router.refresh();
      }
    }, 3000);
    return () => clearInterval(poll);
  }, [generating, video.id, router, t, tc, current]);

  // Render progress: Supabase Realtime on `renders`, with a polling fallback.
  const renderId = render?.id;
  const renderActive = render?.status === "queued" || render?.status === "rendering";
  useEffect(() => {
    if (!renderId || !renderActive) return;
    const onUpdate = async (s: string, progress: number) => {
      setRender((r) => (r && r.id === renderId ? { ...r, status: s, progress } : r));
      if (s === "done") {
        const url = await renderDownloadUrl(renderId);
        setRender((r) => (r && r.id === renderId ? { ...r, downloadUrl: url } : r));
        setNotice({ tone: "ok", text: t("renderDone") });
        router.refresh();
      } else if (s === "failed") {
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

  function seekTo(s: number) {
    const f = Math.min(total - 1, Math.max(0, Math.round(s * fps)));
    previewRef.current?.pause();
    previewRef.current?.seek(f);
    setFrame(f);
  }

  function seekToBeat(i: number) {
    setSelected(i);
    seekTo((beats[i]?.start_s ?? 0) + 0.4);
  }

  function setLine(index: number, text: string) {
    setBeats((all) => all.map((b, i) => (i === active ? { ...b, lines: b.lines.map((l, j) => (j === index ? text : l)) } : b)));
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

  const onStarted = (res: ActionResult, text: string) => {
    if (!res.ok) return setNotice({ tone: "error", text: res.error === "generic" ? tc("error") : te(res.error) });
    setStatus("generating");
    setGen({ stage: "queued" });
    setNotice({ tone: "info", text });
  };

  const onSave = () =>
    run("save", async () => {
      const res = await saveLines(video.id, beats);
      if (!res.ok) throw new Error();
      setDirty(false);
      setNotice({ tone: "ok", text: t("saved", { n: formatNumber(res.version, locale) }) });
      router.refresh();
    });

  const onDirection = () => run("direction", async () => onStarted(await anotherDirection(video.id), t("directionStarted")));

  const onRequest = (e: FormEvent) => {
    e.preventDefault();
    if (!request.trim()) return;
    run("request", async () => {
      const res = await requestEdit(video.id, request);
      onStarted(res, t("editStarted"));
      if (res.ok) setRequest("");
    });
  };

  const onToggleMusic = () =>
    run("music", async () => {
      if (!(await setMusicEnabled(video.id, !musicOn))) throw new Error();
      setMusicOn(!musicOn);
    });

  const onExport = () =>
    run("export", async () => {
      if (dirty) {
        const saved = await saveLines(video.id, beats);
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

  const exporting = status === "exporting" || renderActive;
  const plan = current?.plan;
  const energy = plan?.energy;
  const taste = current?.qa.taste ?? null;
  const repairRounds = current?.qa.validation?.filter((r) => /patch|fix|finish/.test(r.stage)).length ?? 0;
  const markers = beats.slice(1).map((b) => (b.start_s / video.length_s) * 100);
  const stageIndex = Math.max(0, STAGES.indexOf(stage as Stage));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <CompanyMark name={companyName} colors={companyColors} size="size-11" />
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
            {current ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{t("version", { n: formatNumber(current.version, locale) })}</span>
              </>
            ) : null}
          </p>
        </div>
        <StatusChip status={status} />
        {render?.status === "done" && render.downloadUrl ? (
          <a href={render.downloadUrl} className="btn btn-white" download>
            <DownloadIcon className="size-4" />
            {t("download")}
          </a>
        ) : null}
        <button type="button" onClick={onExport} disabled={pending || exporting || generating || !current} className="btn btn-primary">
          {busy === "export" ? <SpinnerIcon className="size-4" /> : <DownloadIcon className="size-4" />}
          {busy === "export" ? t("exporting") : t("export", { price })}
        </button>
      </div>

      {generating ? (
        <div className="panel" role="status" aria-live="polite">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 font-semibold text-primary-dark">
              <SpinnerIcon className="size-4" />
              {t(`stage_${stage in STAGE_KEYS ? stage : "queued"}` as "stage_queued")}
            </span>
            <span className="text-ink-muted">{t("generatingHint")}</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-primary-lavender">
            <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${Math.max(4, (stageIndex / (STAGES.length - 1)) * 100)}%` }} />
          </div>
        </div>
      ) : null}

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

      {!current && !generating ? (
        <div className="panel flex flex-col items-center gap-3 py-10 text-center">
          <p className="max-w-md text-sm text-ink-muted">{status === "needs_direction" || stage === "needs_direction" ? t("needsDirection") : t("noComposition")}</p>
          <button type="button" onClick={onDirection} disabled={pending} className="btn btn-primary">
            {busy === "direction" ? <SpinnerIcon className="size-4" /> : <SparkIcon className="size-4" />}
            {t("anotherDirection")}
          </button>
        </div>
      ) : null}

      {current && plan ? (
        <>
          <div className="grid gap-5 xl:grid-cols-[320px_1fr_340px]">
            {/* Treatment */}
            <section className="panel space-y-4">
              <Heading as="h2" className="text-lg">
                {t.rich("treatment", boldTag)}
              </Heading>
              <div>
                <p className="label">{t("concept")}</p>
                <p className="mt-1 text-sm leading-relaxed" dir="auto">
                  {plan.concept}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="chip chip-solid" dir="auto">
                  {plan.motion_language}
                </span>
                <span className="chip chip-white">{tm(`mood_${plan.music_mood}` as "mood_energetic")}</span>
                {energy ? (
                  <span className="chip chip-white" dir="ltr">
                    {formatNumber(energy.bpm, locale)} BPM
                  </span>
                ) : null}
              </div>
              <details className="text-sm">
                <summary className="cursor-pointer font-semibold text-primary-dark">{t("treatmentMore")}</summary>
                <p className="mt-2 leading-relaxed" dir="ltr">
                  {plan.summary_en}
                </p>
              </details>
              <ol className="space-y-1.5">
                {beats.map((b, i) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => seekToBeat(i)}
                      aria-current={i === active ? "step" : undefined}
                      className={`flex w-full items-start gap-3 rounded-[18px] p-2 text-start text-sm transition-colors ${
                        i === active ? "bg-white shadow-[inset_0_0_0_1.5px_var(--primary)]" : "bg-white/60 hover:bg-white"
                      }`}
                    >
                      <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i === active ? "bg-primary text-white" : "bg-primary-light text-primary-dark"}`}>
                        {formatNumber(i + 1, locale)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium" dir="auto">
                          {plan.shots.find((x) => x.id === b.id)?.visual ?? b.role}
                        </span>
                        <span className="block truncate text-xs text-ink-muted" dir={scriptDir}>
                          {b.lines.join(" · ")}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-ink-muted" dir="ltr">
                        {formatNumber(b.start_s, locale, { maximumFractionDigits: 1 })}s
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </section>

            {/* Live preview — sandboxed iframe */}
            <section className="min-w-0">
              <div className="overflow-hidden rounded-panel bg-primary-lavender p-3">
                <div
                  className={`mx-auto overflow-hidden rounded-2xl bg-navy ${video.format === "9:16" ? "max-w-[340px]" : video.format === "1:1" ? "max-w-[480px]" : ""}`}
                  style={{ aspectRatio: `${width} / ${height}` }}
                >
                  {mounted && previewProps ? (
                    <MotionPreview
                      ref={previewRef}
                      props={previewProps}
                      title={t("preview")}
                      onFrame={setFrame}
                      onPlaying={setPlaying}
                      onError={() => setNotice({ tone: "error", text: t("previewError") })}
                    />
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <button type="button" onClick={() => previewRef.current?.toggle()} className="btn btn-primary">
                  <PlayIcon className="size-4" />
                  {playing ? t("pause") : t("play")}
                </button>
                <button type="button" role="switch" aria-checked={musicOn} onClick={onToggleMusic} disabled={pending} className={`chip ${musicOn ? "chip-solid" : "chip-white"}`}>
                  {musicOn ? tm("on") : tm("off")}
                </button>
                <button type="button" onClick={onDirection} disabled={pending || generating} className="btn btn-white">
                  {busy === "direction" ? <SpinnerIcon className="size-4" /> : <SparkIcon className="size-4" />}
                  {t("anotherDirection")}
                </button>
              </div>
              <p className="mt-2 text-center text-xs text-ink-muted">{t("anotherDirectionHint")}</p>
            </section>

            {/* Beat lines + change request */}
            <section className="panel space-y-4">
              <Heading as="h2" className="text-lg">
                {t.rich("properties", boldTag)}
              </Heading>
              <p className="text-sm font-semibold text-primary-dark">
                {t("sceneN", { n: formatNumber(active + 1, locale) })} · <span dir="auto">{beat?.role}</span>
              </p>
              <div className="space-y-2">
                <p className="label">{t("onScreenText")}</p>
                {beat?.lines.map((line, i) => (
                  <input
                    key={i}
                    value={line}
                    dir={scriptDir}
                    disabled={pending || generating}
                    maxLength={48}
                    aria-label={t("lineN", { n: i + 1 })}
                    onChange={(e) => setLine(i, e.target.value)}
                    className="field bg-white"
                  />
                ))}
              </div>
              <button type="button" onClick={onSave} disabled={pending || !dirty || generating} className="btn btn-primary w-full">
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
                    disabled={pending || generating}
                    onChange={(e) => setRequest(e.target.value)}
                    placeholder={t("requestPlaceholder")}
                    className="min-h-pill flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-ink-muted/70"
                  />
                  <button type="submit" disabled={pending || generating || !request.trim()} aria-label={t("send")} className="btn btn-primary size-11 shrink-0 px-0">
                    {busy === "request" ? <SpinnerIcon className="size-4" /> : <SendIcon className="size-4" />}
                  </button>
                </div>
                <p className="mt-2 text-xs text-ink-muted">{t("requestHint")}</p>
              </form>

              {taste ? (
                <p className="text-xs text-ink-muted">
                  {t("qaScore", { score: formatNumber(taste.score, locale, { maximumFractionDigits: 1 }), rounds: formatNumber(repairRounds, locale) })}
                </p>
              ) : null}
            </section>
          </div>

          {/* Timeline — beats, energy sections and hits, bound to the preview */}
          <section className="panel">
            <div className="flex items-center justify-between gap-3">
              <Heading as="h2" className="text-lg">
                {t.rich("timeline", boldTag)}
              </Heading>
              <span className="text-sm tabular-nums text-ink-muted">
                {tc("seconds", { n: formatNumber(seconds, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) })} / {tc("seconds", { n: formatNumber(video.length_s, locale) })}
              </span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <div className="min-w-[640px] space-y-2" dir="ltr">
                <div className="relative flex h-5 gap-0.5">
                  {energy?.sections.map((s, i) => (
                    <div
                      key={i}
                      title={s.name}
                      style={{ flexGrow: s.end_s - s.start_s, flexBasis: 0, opacity: 0.25 + s.energy * 0.75 }}
                      className={`rounded-md ${s.kind === "drop" ? "bg-primary" : s.kind === "build" ? "bg-primary/60" : s.kind === "breakdown" ? "bg-navy/40" : "bg-navy/25"}`}
                    />
                  ))}
                  {energy?.hits.map((h, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => seekTo(h.t)}
                      aria-label={t("hitAt", { kind: h.kind, s: formatNumber(h.t, locale, { maximumFractionDigits: 2 }) })}
                      title={`${h.kind} · ${h.t.toFixed(2)}s`}
                      style={{ insetInlineStart: `${(h.t / video.length_s) * 100}%` }}
                      className="absolute top-0 h-5 w-1 -translate-x-1/2 rounded-full bg-white shadow-[0_0_0_1.5px_var(--primary)]"
                    />
                  ))}
                </div>
                <div className="flex gap-1.5">
                  {beats.map((b, i) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => seekToBeat(i)}
                      style={{ flexGrow: b.end_s - b.start_s, flexBasis: 0 }}
                      className={`h-14 min-w-0 overflow-hidden rounded-xl px-2 text-start text-[11px] leading-tight text-white ${
                        i === active ? "bg-primary ring-2 ring-primary ring-offset-2 ring-offset-field" : "bg-navy/80 hover:bg-navy"
                      }`}
                      dir={scriptDir}
                    >
                      <span className="line-clamp-2">{b.lines.join(" ")}</span>
                    </button>
                  ))}
                </div>
                <TimelineSlider
                  value={(frame / Math.max(1, total - 1)) * 100}
                  markers={markers}
                  onChange={(pct) => seekTo((pct / 100) * video.length_s)}
                  label={t("playhead")}
                  valueText={`${formatNumber(Math.round(seconds), locale)} / ${formatNumber(video.length_s, locale)}`}
                />
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

const STAGE_KEYS: Record<string, true> = Object.fromEntries(STAGES.map((s) => [s, true]));
