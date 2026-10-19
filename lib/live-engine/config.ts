// Live engine switches. The live engine is the default (approved 2026-10-17); the legacy engine stays reachable
// for one week behind VIDEO_ENGINE=legacy, then it is deleted.
//   VIDEO_ENGINE=legacy              new videos use the old engine (edits always follow the engine of the version they edit)
//   LIVE_ENGINE_RUNNER=local|sandbox where the worker runs (default: a Vercel Sandbox on Vercel, a local child process elsewhere)
//   LIVE_ENGINE_CALLBACK_URL        the app's public URL the worker reports to (default: VERCEL_URL, else localhost:3000)
export const liveEngineEnabled = () => process.env.VIDEO_ENGINE !== "legacy";
//   VIDEO_ENGINE=director            new videos use the director engine (lib/director-engine, the /brag method);
//                                    DIRECTOR_MODEL (default claude-opus-5-5), DIRECTOR_MAX_USD (default 6 per video)
export const directorEngineEnabled = () => process.env.VIDEO_ENGINE === "director";
export const directorSettings = () => ({ model: process.env.DIRECTOR_MODEL || "claude-opus-5-5", maxUsd: Number(process.env.DIRECTOR_MAX_USD) > 0 ? Number(process.env.DIRECTOR_MAX_USD) : 6 });
//   LIVE_FLOW_CLIPS=1               experiment: captures record the agent's input → result flows as real clips, videos play them
export const flowClipsEnabled = () => process.env.LIVE_FLOW_CLIPS === "1";
export const runnerKind = (): "local" | "sandbox" => {
  const set = process.env.LIVE_ENGINE_RUNNER;
  if (set === "sandbox" || set === "local") return set;
  return process.env.VERCEL ? "sandbox" : "local";
};
export const callbackBase = () => (process.env.LIVE_ENGINE_CALLBACK_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")).replace(/\/$/, "");
