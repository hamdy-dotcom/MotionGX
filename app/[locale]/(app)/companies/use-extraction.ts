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

/** Streams POST /api/brand/extract (NDJSON) and ticks each step as it finishes. */
export function useExtraction() {
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<Steps>(all("pending"));
  const [errorCode, setErrorCode] = useState<AiErrorCode | null>(null);
  const [invalidUrl, setInvalidUrl] = useState(false);
  const [started, setStarted] = useState(false);

  async function run(url: string, refresh: boolean): Promise<{ brand: BrandDraft; raw: Record<string, unknown> | null; cached: boolean } | null> {
    const target = normalizeInputUrl(url);
    setRunning(true);
    setStarted(true);
    setErrorCode(null);
    setInvalidUrl(false);
    setSteps(all("pending"));

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

  const failed = EXTRACT_STEPS.filter((s) => steps[s] === "failed");
  return { run, running, steps, errorCode, invalidUrl, started, failed };
}
