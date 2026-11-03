"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowIcon, SparkIcon, SpinnerIcon } from "@/components/icons";
import { boldTag } from "@/components/heading";
import { EMPTY_FACTS, type BrandDraft } from "@/lib/brand/types";
import { BRAND_LANGUAGES, type BrandLanguage, type Direction, type FileBrief, type Identity, type NextQuestion, type Turn } from "@/lib/brand-studio/types";
import { CreatedBrandFiles, PackButton } from "@/components/studio/created-brand";
import { Preview, type Extra } from "./brand-preview";
import type { CreatedBrand as StoredBrand } from "@/lib/brand-studio/stored";
import { cleanCountries } from "@/lib/market/countries";
import { BrandEditor } from "../brand-editor";

type Done = { identity: Identity; pack?: string; stored?: StoredBrand; packUrl?: string; logoUrl?: string; files?: number; siteHtml?: string; world?: { kind: string; label?: string; url: string }[] };
type Step = "start" | "talk" | "choose" | "refine" | "done";
type Saved = { step: Step; language: BrandLanguage; business: string; fileBrief: FileBrief | null; turns: Turn[]; question: NextQuestion | null; brief: string; directions: Direction[]; rounds: number; extras: Record<string, Extra>; chosen: Direction | null; notes: string; done: Done | null };
const KEY = "mgx-brand-studio";
const FRESH: Saved = { step: "start", language: "ar", business: "", fileBrief: null, turns: [], question: null, brief: "", directions: [], rounds: 0, extras: {}, chosen: null, notes: "", done: null };
const load = (): Saved | null => { try { const v = localStorage.getItem(KEY); return v ? { ...FRESH, ...(JSON.parse(v) as Saved) } : null; } catch { return null; } };
const store = (s: Saved) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };
const forget = () => { try { localStorage.removeItem(KEY); } catch {} };

async function call<T>(body: object): Promise<T> {
  const res = await fetch("/api/brand/studio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "failed");
  return (await res.json()) as T;
}

const familyUrl = (families: string[]) => `https://fonts.googleapis.com/css2?${[...new Set(families.filter(Boolean))].map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;700;800`).join("&")}&display=swap`;

export function BrandStudio({ price }: { price: string }) {
  const t = useTranslations("companies.studio"), locale = useLocale();
  const [s, setS] = useState<Saved>(FRESH);
  const [busy, setBusy] = useState<"files" | "question" | "directions" | "build" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [steps, setSteps] = useState<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => { const v = load(); if (v) setS(v); }, []); // eslint-disable-line react-hooks/set-state-in-effect -- browser storage exists only after mount
  const patch = (p: Partial<Saved>) => setS((prev) => { const next = { ...prev, ...p }; store(next); return next; });
  const fail = (e: unknown) => setError(e instanceof Error && e.message === "insufficient_balance" ? t("errorBalance") : t("errorGeneric"));

  const fonts = [...s.directions.flatMap((d) => Object.values(d.fonts)), ...(s.done ? Object.values(s.done.identity.fonts) : [])];
  const base = { language: s.language, fileBrief: s.fileBrief };

  async function run<T>(what: NonNullable<typeof busy>, fn: () => Promise<T>) {
    setBusy(what); setError(null);
    try { return await fn(); } catch (e) { fail(e); return null; } finally { setBusy(null); }
  }

  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    if (!files.length) return;
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    setBusy("files"); setError(null);
    const res = await fetch("/api/brand/studio", { method: "POST", body: form }).catch(() => null);
    setBusy(null);
    if (!res?.ok) return setError(t("filesBad"));
    patch({ fileBrief: ((await res.json()) as { brief: FileBrief }).brief });
  }

  const makeDirections = (brief: string, base2 = base, seen: string[] = [], rounds = 0, existing: Direction[] = []) => run("directions", async () => {
    const r = await call<{ directions: Direction[] }>({ action: "directions", ...base2, brief, seen, round: rounds });
    patch({ step: "choose", brief, directions: [...existing, ...r.directions], rounds: rounds + 1 });
    // each direction's page and photo arrive by themselves, so the choice is on screen at once
    const put = (name: string, e: Extra) => setS((prev) => { const next = { ...prev, extras: { ...prev.extras, [name]: { ...prev.extras[name], ...e } } }; store(next); return next; });
    for (const d of r.directions) {
      void call<{ html: string }>({ action: "previewPage", ...base2, brief, chosen: d }).then((x) => put(d.name, { html: x.html })).catch(() => {});
      void call<{ url: string }>({ action: "previewPhoto", ...base2, brief, chosen: d }).then((x) => put(d.name, { photo: x.url })).catch(() => {});
    }
  });

  const ask = (turns: Turn[], business = s.business) => run("question", async () => {
    const q = await call<NextQuestion>({ action: "question", ...base, locale, business, turns });
    patch({ step: "talk", turns, question: q, brief: q.brief, business });
    setAnswer(""); setPicked([]);
    if (q.done) await makeDirections(q.brief);
  });

  function start() {
    if (s.fileBrief?.complete) return void makeDirections([s.business, s.fileBrief.summary].filter(Boolean).join("\n\n"));
    void ask([]);
  }
  const reply = (text: string) => { if (s.question) void ask([...s.turns, { q: s.question.question, a: text }]); };

  const build = () => s.chosen && run("build", async () => {
    setSteps([]);
    const res = await fetch("/api/brand/studio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "build", ...base, brief: s.brief, chosen: s.chosen, notes: s.notes }) });
    if (!res.ok || !res.body) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "failed");
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines.filter(Boolean)) {
        const m = JSON.parse(line) as { step?: string; result?: Done; error?: string };
        if (m.step) setSteps((p) => [...p, m.step!]);
        if (m.error) throw new Error(m.error);
        if (m.result) patch({ step: "done", done: m.result });
      }
    }
  });

  const reset = () => { forget(); setS(FRESH); setError(null); setAnswer(""); setPicked([]); };

  const draft = (d: Done): BrandDraft => {
    const { identity: id } = d, P = id.palette;
    return {
      name: s.language === "ar" && id.name_ar ? id.name_ar : id.name, websiteUrl: "", logoUrl: d.stored?.logoUrl ?? d.logoUrl ?? null, logoOnDark: false,
      colors: [{ hex: P.primary.toUpperCase(), role: "primary" }, { hex: P.accent.toUpperCase(), role: "accent" }, { hex: P.ink.toUpperCase(), role: "ink" }, { hex: P.background.toUpperCase(), role: "background" }],
      fonts: { arabic: id.fonts.arabic_display || "Readex Pro", latin: id.fonts.display || "Inter" }, tone: id.voice.summary, tagline: id.tagline, defaultDialect: id.dialect ?? (s.language === "en" ? "en" : "eg"),
      facts: { ...EMPTY_FACTS, what_it_does: id.summary.slice(0, 600), audience: id.audience.slice(0, 400), key_features: id.features },
    };
  };

  return (
    <div className="space-y-5">
      {fonts.length ? <link rel="stylesheet" href={familyUrl(fonts)} /> : null}
      {error ? <p role="alert" className="text-sm text-danger-ink">{error}</p> : null}

      {s.step === "start" ? (
        <div className="panel space-y-5">
          <fieldset>
            <legend className="label mb-2 block">{t("languageLabel")}</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup">
              {BRAND_LANGUAGES.map((l) => <button key={l} type="button" role="radio" aria-checked={s.language === l} onClick={() => patch({ language: l })} className="chip chip-white">{t(`language_${l}`)}</button>)}
            </div>
          </fieldset>
          <div>
            <label htmlFor="business" className="label mb-2 block">{t("businessLabel")}</label>
            <textarea id="business" dir="auto" rows={4} value={s.business} onChange={(e) => patch({ business: e.target.value })} placeholder={t("businessPlaceholder")} className="w-full rounded-3xl bg-white p-4 text-sm text-navy outline-none placeholder:text-ink-muted/70" />
          </div>
          <div>
            <p className="label mb-2">{t("filesLabel")}</p>
            <input ref={fileInput} type="file" multiple hidden accept=".pdf,.docx,.pptx,.txt,.md,.csv,.json,.svg,image/png,image/jpeg,image/webp,image/gif" onChange={upload} />
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="btn btn-soft" disabled={busy === "files"} onClick={() => fileInput.current?.click()}>{busy === "files" ? <SpinnerIcon className="size-4" /> : null}{busy === "files" ? t("filesReading") : t("filesAdd")}</button>
              <span className="text-sm text-ink-muted">{s.fileBrief ? (s.fileBrief.complete ? t("filesComplete") : t("filesRead")) : t("filesHint")}</span>
            </div>
          </div>
          <button type="button" className="btn btn-primary" disabled={Boolean(busy) || (!s.business.trim() && !s.fileBrief)} onClick={start}>
            {busy ? <SpinnerIcon className="size-4" /> : null}{busy === "directions" ? t("makingPreviews") : busy === "question" ? t("thinking") : t("start")}{busy ? null : <ArrowIcon className="size-4" />}
          </button>
        </div>
      ) : null}

      {s.step === "talk" ? (
        <div className="panel space-y-4">
          {s.turns.map((turn, i) => (
            <div key={i} className="space-y-1 text-sm" dir="auto">
              <p className="text-ink-muted">{turn.q}</p>
              <p className="font-medium text-navy">{turn.a}</p>
            </div>
          ))}
          {busy === "directions" ? <p className="flex items-center gap-2 text-sm text-ink-muted"><SpinnerIcon className="size-4" />{t("makingPreviews")}</p> : s.question && !s.question.done ? (
            <div className="divider space-y-3 pt-4">
              <p className="label">{t("questionOf", { n: s.turns.length + 1 })}</p>
              <p className="text-lg font-medium text-navy" dir="auto">{s.question.question}</p>
              <div className="flex flex-wrap gap-2">
                {s.question.suggestions.map((x) => s.question?.multiple ? (
                  <button key={x} type="button" aria-pressed={picked.includes(x)} className="chip chip-white" onClick={() => setPicked((p) => (p.includes(x) ? p.filter((v) => v !== x) : [...p, x]))}>{x}</button>
                ) : (
                  <button key={x} type="button" disabled={Boolean(busy)} className="chip chip-white" onClick={() => reply(x)}>{x}</button>
                ))}
              </div>
              <form className="flex flex-col gap-2 rounded-[28px] bg-white p-1.5 sm:flex-row sm:rounded-full" onSubmit={(e) => { e.preventDefault(); const text = [...picked, answer.trim()].filter(Boolean).join("، "); if (text) reply(text); }}>
                <input dir="auto" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder={t("answerPlaceholder")} className="field bg-transparent text-start" />
                <button type="submit" className="btn btn-primary" disabled={Boolean(busy) || (!answer.trim() && !picked.length)}>{busy ? <SpinnerIcon className="size-4" /> : null}{busy ? t("thinking") : t("send")}</button>
              </form>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-soft" disabled={Boolean(busy)} onClick={() => reply("(skipped)")}>{t("skip")}</button>
                {s.turns.length >= 3 ? <button type="button" className="btn btn-soft" disabled={Boolean(busy)} onClick={() => void makeDirections(s.brief)}><SparkIcon className="size-4" />{t("makePreviews")}</button> : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {s.step === "choose" ? (
        <>
          <div>
            <h2 className="text-xl font-semibold text-navy">{t("chooseTitle")}</h2>
            <p className="text-sm text-ink-muted">{t("chooseHint")}</p>
          </div>
          <div className="grid gap-6">
            {s.directions.map((d, i) => <Preview key={`${d.name}-${i}`} d={d} extra={s.extras[d.name]} language={s.language} label={t("choose")} onChoose={() => patch({ step: "refine", chosen: d })} />)}
          </div>
          {s.rounds < 2 ? (
            <button type="button" className="btn btn-soft" disabled={Boolean(busy)} onClick={() => void makeDirections(s.brief, base, s.directions.map((d) => d.name), s.rounds, s.directions)}>
              {busy ? <SpinnerIcon className="size-4" /> : <SparkIcon className="size-4" />}{busy ? t("makingPreviews") : t("more")}
            </button>
          ) : <p className="text-sm text-ink-muted">{t("moreDone")}</p>}
        </>
      ) : null}

      {s.step === "refine" && s.chosen ? (
        <div className="grid gap-5">
          <Preview d={s.chosen} extra={s.extras[s.chosen.name]} language={s.language} label={t("back")} onChoose={() => { if (!busy) patch({ step: "choose" }); }} />
          <div className="panel space-y-4">
            <label htmlFor="notes" className="label block">{t("notesLabel")}</label>
            <textarea id="notes" dir="auto" rows={4} value={s.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder={t("notesPlaceholder")} className="w-full rounded-3xl bg-white p-4 text-sm text-navy outline-none placeholder:text-ink-muted/70" />
            <p className="text-sm text-ink-muted">{t("priceNote", { price })}</p>
            <button type="button" className="btn btn-primary" disabled={Boolean(busy)} onClick={() => void build()}>{busy ? <SpinnerIcon className="size-4" /> : null}{t("buildCta")}</button>
            {busy === "build" ? (
              <div className="space-y-2">
                <p className="text-sm text-ink-muted">{t("building")}</p>
                <ul className="space-y-1 text-sm">
                  {(["identity", "website", "photos", "pack"] as const).map((k) => (
                    <li key={k} className={`flex items-center gap-2 ${steps.includes(k) ? "text-navy" : "text-ink-muted"}`}>
                      {steps.includes(k) ? <span aria-hidden>✓</span> : <SpinnerIcon className="size-3" />}{t(`step_${k}`)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {s.step === "done" && s.done ? (
        <>
          <div className="panel space-y-3">
            <h2 className="text-2xl font-semibold text-navy">{t.rich("doneTitle", { ...boldTag, name: s.done.identity.name })}</h2>
            <p className="text-sm text-warning-ink">{t("trademark")}</p>
          </div>
          {s.done.stored ? <CreatedBrandFiles brand={s.done.stored} /> : s.done.packUrl ? <PackButton url={s.done.packUrl} /> : null}
          <div>
            <h2 className="mb-3 text-xl font-semibold text-navy">{t("saveTitle")}</h2>
            <BrandEditor brand={draft(s.done)} raw={s.done.pack ? { source: "created", pack: s.done.pack } : null} captureId={null} market={{ industry: s.done.identity.industry ?? null, countries: cleanCountries(s.done.identity.countries), socials: {} }} />
          </div>
          <button type="button" className="btn btn-soft" onClick={reset}>{t("startOver")}</button>
        </>
      ) : null}
    </div>
  );
}
