// Live engine switches (approved: default stays legacy until Hamdy approves).
//   VIDEO_ENGINE=live|legacy        which engine new videos use (edits follow the engine of the version they edit)
//   LIVE_ENGINE_RUNNER=local|sandbox where the worker runs (local child process, or a Vercel Sandbox)
//   LIVE_ENGINE_CALLBACK_URL        the app's public URL the worker reports to (default: VERCEL_URL, else localhost:3000)
export const liveEngineEnabled = () => process.env.VIDEO_ENGINE === "live";
export const runnerKind = (): "local" | "sandbox" => (process.env.LIVE_ENGINE_RUNNER === "sandbox" ? "sandbox" : "local");
export const callbackBase = () => (process.env.LIVE_ENGINE_CALLBACK_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")).replace(/\/$/, "");
