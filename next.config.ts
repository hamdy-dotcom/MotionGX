import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Every screen is per-user (session cookie), so Cache Components stays off for now.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The studio preview runs in a sandboxed (opaque-origin) iframe, which loads the runtime cross-origin.
  async headers() {
    return [{ source: "/preview/:path*", headers: [{ key: "Access-Control-Allow-Origin", value: "*" }, { key: "Cross-Origin-Resource-Policy", value: "cross-origin" }] }];
  },
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
  // Server-side rendering of MP4s: keep the renderer / bundler / sandbox SDK out of the server bundle.
  serverExternalPackages: ["@remotion/bundler", "@remotion/renderer", "@remotion/vercel", "@vercel/sandbox", "esbuild"],
  // The prebuilt Remotion bundle ships with the studio route (renders run in `after()` of its export action).
  outputFileTracingIncludes: {
    "/[locale]/videos/*": ["./.remotion-bundle/**/*"],
  },
};

export default withNextIntl(nextConfig);
