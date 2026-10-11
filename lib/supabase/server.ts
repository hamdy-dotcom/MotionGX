import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const unmemoizedFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, signal: init?.signal ?? new AbortController().signal });

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Next memoizes identical GET fetches for the whole render pass, so a re-read after a write
      // (e.g. membership after bootstrap_workspace) would get the stale first response.
      // A per-call AbortSignal opts each request out of memoization; React cache() still dedupes getAppContext.
      global: { fetch: unmemoizedFetch },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component — the proxy refreshes the session instead.
          }
        },
      },
    },
  );
}
