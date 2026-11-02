"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SpinnerIcon } from "@/components/icons";
import { sendPasswordReset, setNewPassword, signIn, signUp, type AuthState } from "./actions";

type Mode = "login" | "signup" | "forgot" | "reset";
const ACTIONS = { login: signIn, signup: signUp, forgot: sendPasswordReset, reset: setNewPassword };

function Form({ mode, linkError, onForgot, onBack }: { mode: Mode; linkError: boolean; onForgot: () => void; onBack: () => void }) {
  const t = useTranslations("auth"), locale = useLocale();
  const [state, action, pending] = useActionState<AuthState, FormData>(ACTIONS[mode], { status: "idle" });
  if (state.status === "confirm" || state.status === "resetSent") {
    return (
      <div role="status" className="done">
        <b>{t("checkInbox")}</b>
        <p>{t(state.status === "confirm" ? "confirmHint" : "resetHint", { email: state.email ?? "" })}</p>
      </div>
    );
  }
  const error = state.status === "error" ? t(`error_${state.error ?? "generic"}`) : linkError ? t("error_link") : null;
  return (
    <form action={action}>
      <input type="hidden" name="locale" value={locale} />
      {mode !== "reset" ? (
        <label>{t("email")}<input name="email" type="email" required dir="ltr" autoComplete="email" defaultValue={state.email} placeholder="name@company.com" /></label>
      ) : null}
      {mode !== "forgot" ? (
        <label>
          <span className="row">{mode === "reset" ? t("newPassword") : t("password")}{mode === "login" ? <button type="button" onClick={onForgot}>{t("forgot")}</button> : null}</span>
          <input name="password" type="password" required dir="ltr" minLength={mode === "login" ? undefined : 8} autoComplete={mode === "login" ? "current-password" : "new-password"} />
          {mode === "login" ? null : <small>{t("passwordHint")}</small>}
        </label>
      ) : null}
      {error ? <p role="alert" className="err">{error}</p> : null}
      <button type="submit" disabled={pending} className="s-btn lit">{pending ? <SpinnerIcon className="size-4" /> : null}{t(`${mode}Submit`)}</button>
      {mode === "forgot" ? <button type="button" className="back" onClick={onBack}>{t("backToLogin")}</button> : null}
    </form>
  );
}

export function AuthForm({ mode: start, linkError = false }: { mode: "login" | "signup" | "reset"; linkError?: boolean }) {
  const [mode, setMode] = useState<Mode>(start);
  const t = useTranslations("auth");
  return (
    <>
      <h1>{t(`${mode}Title`)}</h1>
      <p className="lead">{t(`${mode}Lead`)}</p>
      <Form key={mode} mode={mode} linkError={linkError && mode === start} onForgot={() => setMode("forgot")} onBack={() => setMode("login")} />
    </>
  );
}
