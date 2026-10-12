"use client";

import { useTranslations } from "next-intl";
import { EXTRACT_STEPS, type ExtractStep } from "@/lib/brand/types";
import type { AiErrorCode } from "@/lib/ai/errors";
import { CheckIcon, SpinnerIcon } from "@/components/icons";
import type { Steps } from "./use-extraction";

export const STEP_LABEL: Record<ExtractStep, "stepLogo" | "stepColors" | "stepFonts" | "stepTone" | "stepFacts"> = {
  logo: "stepLogo",
  colors: "stepColors",
  fonts: "stepFonts",
  tone: "stepTone",
  facts: "stepFacts",
};

export function ExtractSteps({ steps, running, errorCode }: { steps: Steps; running: boolean; errorCode: AiErrorCode | null }) {
  const t = useTranslations("companies");
  const te = useTranslations("aiErrors");
  return (
    <>
      <ol className="mt-4 flex flex-wrap gap-2" aria-live="polite">
        {EXTRACT_STEPS.map((step) => {
          const state = steps[step];
          const active = state === "pending" && running;
          return (
            <li
              key={step}
              data-step={step}
              data-state={state}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm ${
                state === "done"
                  ? "bg-success-bg text-success-ink"
                  : state === "failed"
                    ? "bg-warning-bg text-warning-ink"
                    : active
                      ? "bg-white text-primary-dark"
                      : "bg-white/60 text-ink-muted"
              }`}
            >
              {state === "done" ? (
                <CheckIcon className="size-4" />
              ) : state === "failed" ? (
                <span aria-hidden="true" className="flex size-4 items-center justify-center font-bold">
                  !
                </span>
              ) : active ? (
                <SpinnerIcon className="size-4" />
              ) : (
                <span className="size-4" />
              )}
              {t(STEP_LABEL[step])}
              {state === "failed" ? <span className="sr-only">{t("stepFailed")}</span> : null}
            </li>
          );
        })}
      </ol>
      {errorCode ? (
        <p role="alert" className="mt-3 rounded-2xl bg-warning-bg px-4 py-2 text-sm text-warning-ink">
          {te(errorCode)}
        </p>
      ) : null}
    </>
  );
}
