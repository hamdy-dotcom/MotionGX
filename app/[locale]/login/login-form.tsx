"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { sendMagicLink, type LoginState } from "./actions";
import { ArrowIcon, CheckIcon, SpinnerIcon } from "@/components/icons";

export function LoginForm({ linkError }: { linkError: boolean }) {
  const t = useTranslations("login");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div role="status" className="flex items-start gap-3 rounded-panel bg-success-bg p-5 text-success-ink">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-white">
          <CheckIcon className="size-4" />
        </span>
        <div>
          <p className="font-semibold">{t("sent")}</p>
          <p className="mt-1 text-sm">{t("sentHint", { email: state.email ?? "" })}</p>
        </div>
      </div>
    );
  }

  const error = state.status === "error" ? (state.error === "invalidEmail" ? t("invalidEmail") : tc("error")) : linkError ? t("linkError") : null;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      <label htmlFor="email" className="label block">
        {t("email")}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="email"
          name="email"
          type="email"
          required
          dir="ltr"
          autoComplete="email"
          defaultValue={state.email}
          placeholder={t("emailPlaceholder")}
          aria-invalid={state.status === "error" || undefined}
          className="field text-start"
        />
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? <SpinnerIcon className="size-4" /> : null}
          {pending ? t("sending") : t("submit")}
          {!pending ? <ArrowIcon className="size-4" /> : null}
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger-ink">
          {error}
        </p>
      ) : null}
    </form>
  );
}
