"use client";

// The live creation screen (the approved prototype), driven by the real job: each step lights up when the worker
// reaches it, and what the step found appears as it happens — the brand's colours and logo, the copy being written,
// the kind of picture chosen (the brand's recent ones crossed out), the image forming, the check, the exact sizes.
import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Heading, boldTag } from "@/components/heading";
import { PLATFORM_ICON } from "@/lib/posts/mockups";
import type { PostPlatformKey } from "@/lib/posts/config";
import type { PreviewBrand } from "./platform-preview";

const STEPS = ["brand", "write", "format", "image", "check", "sizes"] as const;
type StepKey = (typeof STEPS)[number];
const FORMATS = ["people_moment", "product_in_use", "object_metaphor", "typographic", "illustration", "fact_highlight", "detail_closeup", "place_scene", "brand_pattern"] as const;
const DUR: Record<StepKey, number> = { brand: 5, write: 14, format: 2, image: 30, check: 6, sizes: 2 };
const NAMES: Record<string, string> = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", linkedin: "LinkedIn", x: "X" };

type Gen = {
  stage?: string; started_at?: string; cost_usd?: number;
  progress?: {
    brand?: { palette?: Record<string, string> | null; display?: string | null; theme?: string | null };
    write?: { headline?: string | null; texts?: Record<string, string> };
    format?: { format?: string | null; recent?: string[] };
    image?: { path: string }[];
    check?: { ok: boolean; problems: string[]; attempt: number }[];
    sizes?: { sizes?: Record<string, [number, number]> };
  };
};

export function CreatingStudio({ generation, imageUrl, brand, platforms, change, onCancel, cancelling }: { generation: Gen; imageUrl: string | null; brand: PreviewBrand; platforms: PostPlatformKey[]; change: boolean; onCancel: () => void; cancelling: boolean }) {
  const t = useTranslations("posts.studio");
  const p = generation.progress ?? {};
  const stage = String(generation.stage ?? "queued");
  // while the job starts, the first step is already the one at work
  const current = stage === "queued" ? 0 : STEPS.indexOf(stage as StepKey);
  const state = (i: number) => (stage === "done" || (current >= 0 && i < current) ? "done" : i === current ? "active" : "pending");
  const known = brand.colors.map((c, i) => [`c${i}`, c.hex] as [string, string]).filter(([, v]) => /^#/.test(v));
  const read = Object.entries(p.brand?.palette ?? {}).filter(([, v]) => typeof v === "string" && /^#/.test(v)) as [string, string][];
  const palette = read.length ? read : known;

  // the clock and the cost, ticking
  const started = generation.started_at ? new Date(generation.started_at).getTime() : null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 100); return () => clearInterval(iv); }, []);
  const target = Number(generation.cost_usd ?? 0);
  const [cost, setCost] = useState(target);
  useEffect(() => { const iv = setInterval(() => setCost((c) => (Math.abs(target - c) < 0.0005 ? target : c + (target - c) * 0.15)), 60); return () => clearInterval(iv); }, [target]);

  // the image: blurred in, then sharp
  const [sharp, setSharp] = useState(false);
  useEffect(() => { if (!imageUrl) return; const to = setTimeout(() => setSharp(true), 1400); return () => clearTimeout(to); }, [imageUrl]);

  const forming = ["pst-forming", palette.length ? "pst-palette" : "", p.brand || brand.logoUrl ? "pst-logo" : "", stage === "image" ? "pst-working" : "", imageUrl ? "pst-reveal" : "", sharp ? "pst-sharp" : ""].join(" ");
  const checks = p.check ?? [], lastCheck = checks.at(-1), retried = checks.find((c) => !c.ok && c.attempt === 0);

  // a step that takes much longer than usual (most often the worker fetching the brand's files on a slow network):
  // say so, so the screen never looks frozen
  const stamps = Object.entries(generation as Record<string, unknown>).filter(([k, v]) => k.startsWith("at_") && typeof v === "string").map(([, v]) => Date.parse(v as string)).filter(Number.isFinite);
  const lastMove = Math.max(started ?? 0, ...stamps);
  const slow = stage !== "done" && lastMove > 0 && now - lastMove > (p.brand ? 75_000 : 40_000);

  // the feed: newest first
  const events: ReactNode[] = [];
  if (!p.brand)
    events.push(
      <Event key="start" icon="◐">
        <p>{t.rich(stage === "queued" ? "starting" : "brandReading", { ...boldTag, name: brand.name })}</p>
        {slow ? <p style={{ marginTop: 6, fontSize: 13, color: "var(--pst-muted, #8b8996)" }}>{t("slowNetwork")}</p> : null}
        <div className="pst-swatchRow">{known.map(([k, v], i) => <i key={k} style={{ background: v, animation: `pst-pop .4s ${i * 0.12}s both` }} />)}</div>
        <span className="pst-dots" aria-hidden="true"><i /><i /><i /></span>
      </Event>,
    );
  if (p.brand)
    events.push(
      <Event key="brand" icon="◐">
        <p>{t.rich("brandRead", { ...boldTag, name: brand.name })}</p>
        <div className={"pst-swatchRow"}>{palette.map(([k, v]) => <i key={k} title={`${k} ${v}`} style={{ background: v }} />)}</div>
        <small dir="ltr" style={{ display: "block", marginBlockStart: 6 }}>{[p.brand.display, p.brand.theme].filter(Boolean).join(" · ")}</small>
      </Event>,
      <Event key="logo" icon="✓" ok>
        <p>{t("logoReady")}</p>
      </Event>,
    );
  if (stage === "write" || p.write)
    events.push(
      <Event key="write" icon="✎">
        <p>{t.rich("writing", boldTag)}</p>
        <div className={"pst-caps"}>
          {platforms.map((pl, k) => (
            <div key={pl} className={"pst-cap"}>
              <b dir="ltr">{NAMES[pl]}</b>
              {p.write?.texts?.[pl] ? <Type text={p.write.texts[pl]} speed={22} delay={k * 450} /> : <span className={"pst-caret"} />}
            </div>
          ))}
        </div>
      </Event>,
    );
  if (p.format) events.push(<FormatEvent key="format" picked={p.format.format ?? null} recent={p.format.recent ?? []} />);
  if (stage === "image" || p.image?.length)
    events.push(
      <Event key="image" icon="✦">
        <p>{t.rich("image", boldTag)}</p>
      </Event>,
    );
  if (retried) events.push(<Event key="retry" icon="↻"><p>{t("retry", { problem: retried.problems[0] ?? "" })}</p></Event>);
  if (stage === "check" || checks.length) events.push(<CheckEvent key="check" done={Boolean(lastCheck)} ok={Boolean(lastCheck?.ok)} problems={lastCheck?.problems ?? []} />);
  if (p.sizes || stage === "sizes")
    events.push(
      <Event key="sizes" icon="▣" ok>
        <p>{t.rich("sizes", boldTag)}</p>
        <small dir="ltr">{Object.entries(p.sizes?.sizes ?? {}).map(([c, [w, h]]) => `${w}×${h} · ${c}`).join("  ·  ")}</small>
      </Event>,
    );

  return (
    <div>
      <Heading as="h1" className="mt-2 text-3xl sm:text-4xl">{t.rich(change ? "titleChange" : "title", boldTag)}</Heading>
      <p className="mt-2 mb-5 leading-relaxed text-ink-2">{t("sub")}</p>
      <div className={"pst-rail"}>
        {STEPS.map((s, i) => (
          <div key={s} className={`pst-step ${state(i) === "active" ? "pst-active" : state(i) === "done" ? "pst-done" : ""}`} style={{ ["--dur" as string]: `${DUR[s]}s` }}>
            <span>{t(`stepsSub.${s}`)}</span>
            <b>{t(`steps.${s}`)}</b>
            <span className={"pst-bar"} />
          </div>
        ))}
      </div>
      <div className={"pst-studio"}>
        <div className={"pst-stageCard"}>
          <div className={"pst-canvasWrap"}>
            <div className={forming}>
              <div className={"pst-swatches"}>{palette.map(([k, v]) => <i key={k} style={{ background: v }} />)}</div>
              <div className={"pst-img"} style={imageUrl ? { backgroundImage: `url(${JSON.stringify(imageUrl)})` } : undefined} />
              <div className={"pst-sweep"} />
              <div className={`pst-logoIn ${brand.logoOnDark ? "pst-dark" : ""}`}>
                {brand.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a signed storage URL
                  <img src={brand.logoUrl} alt="" />
                ) : null}
              </div>
              <div className={"pst-head"} dir="auto">{p.write?.headline ? <Type text={p.write.headline} speed={70} delay={300} /> : null}</div>
            </div>
          </div>
          <div className={"pst-meters"}>
            <div className={"pst-meter"}><span>{t("time")}</span><b>{t("seconds", { n: started ? ((now - started) / 1000).toFixed(1) : "0.0" })}</b></div>
            <div className={"pst-meter"}><span>{t("cost")}</span><b dir="ltr">${cost.toFixed(3)}</b></div>
            <div className={"pst-meter"}><span>{t("step")}</span><b style={{ fontSize: 15 }}>{current >= 0 ? t(`steps.${STEPS[current]}`) : t("queued")}</b></div>
          </div>
          {slow && p.brand ? <p style={{ marginTop: 8, fontSize: 13, color: "var(--pst-muted, #8b8996)" }} role="status">{t("slowStep")}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={onCancel} disabled={cancelling} className="btn btn-white">{t("cancel")}</button>
          </div>
        </div>
        <div className={"pst-feed"} aria-live="polite">{events.reverse()}</div>
      </div>
    </div>
  );
}

function Event({ icon, ok, children }: { icon: string; ok?: boolean; children: ReactNode }) {
  return (
    <div className={`pst-event ${ok ? "pst-ok" : ""}`}>
      <span className={"pst-dot"}>{icon}</span>
      <div>{children}</div>
    </div>
  );
}

/** text typed out once (it never restarts when the page re-reads the post) */
function Type({ text, speed = 38, delay = 0 }: { text: string; speed?: number; delay?: number }) {
  const [n, setN] = useState(0);
  // runs again only when the text changes (a page refresh with the same text keeps what is typed)
  useEffect(() => {
    let i = 0, iv: ReturnType<typeof setInterval> | undefined;
    const to = setTimeout(() => { iv = setInterval(() => { i += 1; setN(i); if (i >= text.length && iv) clearInterval(iv); }, speed); }, delay);
    return () => { clearTimeout(to); if (iv) clearInterval(iv); };
  }, [text, speed, delay]);
  return <span className={n < text.length ? "pst-caret" : undefined}>{text.slice(0, n)}</span>;
}

/** the nine kinds of picture: the brand's recent ones crossed out, a short scan, then the one the writer chose */
function FormatEvent({ picked, recent }: { picked: string | null; recent: string[] }) {
  const t = useTranslations("posts.studio");
  const [scan, setScan] = useState<number | null>(0);
  const free = FORMATS.map((f, i) => (recent.includes(f) ? -1 : i)).filter((i) => i >= 0);
  useEffect(() => {
    let k = 0;
    const iv = setInterval(() => setScan(free[k++ % free.length] ?? null), 160);
    const to = setTimeout(() => { clearInterval(iv); setScan(null); }, 1700);
    return () => { clearInterval(iv); clearTimeout(to); };
    // the scan runs once, when the format arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Event icon="◇">
      <p>{t.rich(recent.length ? "format" : "formatFirst", boldTag)}</p>
      <div className={"pst-formats"}>
        {FORMATS.map((f, i) => (
          <span key={f} className={recent.includes(f) ? "pst-used" : scan === null && f === picked ? "pst-pick" : scan === i ? "pst-scan" : ""}>
            {t(`formats.${f}`)}
          </span>
        ))}
      </div>
    </Event>
  );
}

/** the four checks, ticked one by one once the image has been read back */
function CheckEvent({ done, ok, problems }: { done: boolean; ok: boolean; problems: string[] }) {
  const t = useTranslations("posts.studio");
  const items = ["words", "logo", "ui", "real"] as const;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!done) return;
    const iv = setInterval(() => setShown((n) => (n >= items.length ? n : n + 1)), 420);
    return () => clearInterval(iv);
  }, [done, items.length]);
  const bad = (k: (typeof items)[number]) => !ok && problems.some((pr) => (k === "words" ? /word|letter|spell|text/i : k === "logo" ? /logo/i : k === "ui" ? /device|screen|interface|other text/i : /impossible|physic/i).test(pr));
  return (
    <Event icon="⌕" ok={done && ok}>
      <p>{t.rich("check", boldTag)}</p>
      <div className={"pst-checks"}>
        {items.map((k, i) => (
          <div key={k} className={i < shown ? (bad(k) ? "pst-badItem" : "pst-okItem") : ""}>
            <i>{i < shown && bad(k) ? "!" : "✓"}</i>
            {t(`checks.${k}`)}
          </div>
        ))}
      </div>
    </Event>
  );
}

export { PLATFORM_ICON };
