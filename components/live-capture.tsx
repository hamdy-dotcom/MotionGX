"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SendIcon, SpinnerIcon } from "@/components/icons";

/** the live engine's SMS-code input (progress panel in the studio, "Add company" while the capture runs) */
export function CaptureCodeForm({ askedTo, onSend }: { askedTo: string; onSend: (code: string) => Promise<boolean> }) {
  const t = useTranslations("studio");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  // not a <form>: on "Add company" it sits inside the URL form
  async function submit() {
    if (!code.trim() || sending) return;
    setSending(true);
    setFailed(false);
    const ok = await onSend(code).catch(() => false);
    setSending(false);
    if (ok) setCode("");
    else setFailed(true);
  }
  return (
    <div role="group" aria-labelledby="sms-code-label" className="mt-4">
      <label id="sms-code-label" htmlFor="sms-code" className="label mb-2 block">
        {t("codeTitle")}
      </label>
      <div className="flex items-end gap-2 rounded-[22px] bg-white p-1.5">
        <input id="sms-code" value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={12} onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
          aria-invalid={failed || undefined} className="min-h-pill flex-1 bg-transparent px-3 py-2 text-sm outline-none" />
        <button type="button" onClick={() => void submit()} disabled={sending || !code.trim()} className="btn btn-primary shrink-0">
          {sending ? <SpinnerIcon className="size-4" /> : <SendIcon className="size-4" />}
          {t("codeSend")}
        </button>
      </div>
      <p className="mt-2 text-xs text-ink-muted">{t("codeHint", { to: askedTo })}</p>
    </div>
  );
}

/** the worker's latest log lines, as it works */
export function StepLog({ lines }: { lines: string[] }) {
  if (!lines.length) return null;
  return (
    <ol className="mt-4 space-y-0.5 rounded-2xl bg-white/60 px-4 py-3 text-xs text-ink-muted" dir="ltr" aria-live="polite">
      {lines.map((l, i) => (
        <li key={i} className="truncate font-mono">
          {l.trim()}
        </li>
      ))}
    </ol>
  );
}
