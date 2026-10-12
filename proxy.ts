import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";

const intl = createIntlMiddleware(routing);

// The studio preview iframe is sandboxed (opaque origin), so its module loads are cross-origin and,
// on a local address, Chrome preflights them (Private Network Access). Answer those preflights here;
// the GET headers come from next.config.ts.
const PREVIEW_PREFLIGHT = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Private-Network": "true",
  "Access-Control-Max-Age": "86400",
};

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/preview/")) {
    return request.method === "OPTIONS" ? new NextResponse(null, { status: 204, headers: PREVIEW_PREFLIGHT }) : NextResponse.next();
  }
  // 1. Locale: redirects `/` → `/ar` (Accept-Language, then NEXT_LOCALE cookie).
  const response = intl(request);
  if (response.headers.get("location")) return response;

  // 2. Supabase session refresh — cookies are written onto the intl response.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  // 3. Guard: everything except /login needs a session.
  const [, locale = routing.defaultLocale, ...rest] = request.nextUrl.pathname.split("/");
  const isLogin = rest[0] === "login";

  if (!signedIn && !isLogin) return redirectKeepingCookies(request, response, `/${locale}/login`);
  if (signedIn && isLogin) return redirectKeepingCookies(request, response, `/${locale}`);

  return response;
}

function redirectKeepingCookies(request: NextRequest, from: NextResponse, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  // Skip Next internals, static files and the auth callback route.
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)", "/preview/:path*"],
};
