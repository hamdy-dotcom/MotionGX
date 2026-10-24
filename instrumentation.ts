// Runs once when the Next server starts. Local dev has no Vercel cron, so the live-engine watchdog runs here: every minute
// it calls /api/live-engine/watchdog, which relaunches (resumes) or fails jobs whose worker went silent. It authenticates
// with a token minted for this server process (on Vercel the cron calls the route with CRON_SECRET instead).

export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.VERCEL || process.env.LIVE_ENGINE_RUNNER === "sandbox") return;
  const g = globalThis as { __liveWatchdog?: ReturnType<typeof setInterval> };
  if (g.__liveWatchdog) return;
  // Web Crypto (no node:crypto import: this file is also compiled for the Edge runtime, where it returns at once)
  process.env.LIVE_WATCHDOG_TOKEN ||= Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
  const base = (process.env.LIVE_ENGINE_CALLBACK_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, "");
  g.__liveWatchdog = setInterval(() => {
    void fetch(`${base}/api/live-engine/watchdog`, { headers: { authorization: `Bearer ${process.env.LIVE_WATCHDOG_TOKEN}` } })
      .then(async (r) => { const j = (await r.json().catch(() => ({}))) as { revived?: number }; if (j.revived) console.log(`[live] watchdog: ${j.revived} stalled job(s) handled`); })
      .catch(() => {});
  }, 60_000);
  console.log("[live] local watchdog on (every 60 s)");
}
