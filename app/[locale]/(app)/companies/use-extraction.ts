"use client";

import { useState } from "react";
import { EXTRACT_STEPS, emptyDraft, type BrandDraft, type ExtractEvent, type ExtractStep } from "@/lib/brand/types";
import type { AiErrorCode } from "@/lib/ai/errors";

export type StepState = "pending" | "done" | "failed";
export type Steps = Record<ExtractStep, StepState>;

const all = (state: StepState) => Object.fromEntries(EXTRACT_STEPS.map((s) => [s, state])) as Steps;

export function normalizeInputUrl(url: string) {
  const u = url.trim();
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

type LiveProgress = { status: string; waitingCode: boolean; askedTo: string | null; log: string[]; error: string | null; brand: BrandDraft | null; raw: Record<string, unknown> | null; costUsd?: number; free?: boolean };
const sleep = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

/** Streams POST /api/brand/extract (NDJSON) and ticks each step as it finishes.
 *  live (VIDEO_ENGINE=live): starts the sandbox capture + profile (/api/brand/capture, ~10 min) and polls it —
 *  the step log and the SMS-code ask come from the worker. */
export function useExtraction(live = false) {
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<Steps>(all("pending"));
  const [errorCode, setErrorCode] = useState<AiErrorCode | null>(null);
  const [invalidUrl, setInvalidUrl] = useState(false);
  const [started, setStarted] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [ask, setAsk] = useState<{ captureId: string; to: string } | null>(null);
  // the capture's billed cost so far (free while it is the workspace's first)
  const [cost, setCost] = useState<{ usd: number; free: boolean } | null>(null);

  async function runLive(target: string, refresh: boolean, companyId?: string) {
    setLog([]);
    setAsk(null);
    setCost(null);
    const res = await fetch("/api/brand/capture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: target, refresh, companyId }) });
    if (res.status === 400) return "invalid" as const;
    const start = (await res.json().catch(() => ({}))) as { captureId?: string; reused?: boolean; error?: AiErrorCode };
    if (!res.ok || !start.captureId) {
      setErrorCode(start.error ?? "ai_failed");
      return null;
    }
    for (;;) {
      const r = await fetch(`/api/brand/capture?id=${start.captureId}`, { cache: "no-store" }).catch(() => null);
      const p = r?.ok ? ((await r.json()) as LiveProgress) : null;
      if (p) {
        setLog(p.log);
        setCost({ usd: Number(p.costUsd ?? 0), free: Boolean(p.free) });
        setAsk(p.waitingCode ? { captureId: start.captureId, to: p.askedTo ?? "" } : null);
        if (p.status === "done" && p.brand) return { brand: p.brand, raw: p.raw, cached: Boolean(start.reused) };
        if (p.status === "failed") {
          setErrorCode("ai_failed");
          return null;
        }
      }
      await sleep(3000);
    }
  }

  async function sendCode(code: string) {
    if (!ask) return false;
    const r = await fetch("/api/brand/capture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ captureId: ask.captureId, code }) });
    const ok = r.ok && ((await r.json()) as { ok: boolean }).ok;
    if (ok) setAsk(null);
    return ok;
  }

  async function run(url: string, refresh: boolean, companyId?: string): Promise<{ brand: BrandDraft; raw: Record<string, unknown> | null; cached: boolean } | null> {
    const target = normalizeInputUrl(url);
    setRunning(true);
    setStarted(true);
    setErrorCode(null);
    setInvalidUrl(false);
    setSteps(all("pending"));

    if (live) {
      const out = await runLive(target, refresh, companyId).catch(() => {
        setErrorCode("ai_failed");
        return null;
      });
      setRunning(false);
      setAsk(null);
      if (out === "invalid") {
        setInvalidUrl(true);
        return null;
      }
      if (!out) {
        setSteps(all("failed"));
        return { brand: emptyDraft(target), raw: null, cached: false };
      }
      // every field comes from brand.json at once; the live engine keeps no page zip
      setSteps({ ...all("done"), snapshot: "pending" });
      return out;
    }

    let result: Extract<ExtractEvent, { type: "result" }> | null = null;
    try {
      const res = await fetch("/api/brand/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target, refresh }),
      });
      if (res.status === 400) {
        setInvalidUrl(true);
        setRunning(false);
        return null;
      }
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as ExtractEvent;
          if (event.type === "step") setSteps((s) => ({ ...s, [event.step]: event.status }));
          else if (event.type === "error") setErrorCode(event.code);
          else result = event;
        }
      }
    } catch {
      setErrorCode("ai_failed");
    }
    setRunning(false);
    if (!result) {
      setSteps(all("failed"));
      return { brand: emptyDraft(target), raw: null, cached: false };
    }
    return { brand: result.brand, raw: result.raw, cached: result.cached };
  }

  // Brand fields the user must fill in by hand (the page snapshot is a bonus, not a field).
  const failed = EXTRACT_STEPS.filter((s) => s !== "snapshot" && steps[s] === "failed");
  return { run, running, steps, errorCode, invalidUrl, started, failed, log, ask, sendCode, live, cost };
}
