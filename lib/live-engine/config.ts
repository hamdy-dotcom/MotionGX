// Live engine switches. The live engine is the default (approved 2026-10-17); the legacy engine stays reachable
// for one week behind VIDEO_ENGINE=legacy, then it is deleted.
//   VIDEO_ENGINE=legacy              new videos use the old engine (edits always follow the engine of the version they edit)
//   LIVE_ENGINE_RUNNER=local|sandbox where the worker runs (default: a Vercel Sandbox on Vercel, a local child process elsewhere)
//   LIVE_ENGINE_CALLBACK_URL        the app's public URL the worker reports to (default: VERCEL_URL, else localhost:3000)
export const liveEngineEnabled = () => process.env.VIDEO_ENGINE !== "legacy";
export const runnerKind = (): "local" | "sandbox" => {
  const set = process.env.LIVE_ENGINE_RUNNER;
  if (set === "sandbox" || set === "local") return set;
  return process.env.VERCEL ? "sandbox" : "local";
};
export const callbackBase = () => (process.env.LIVE_ENGINE_CALLBACK_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")).replace(/\/$/, "");
