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
    return [{ source: "/preview/:path*", headers: [{ key: "Access-Control-Allow-Origin", value: "*" }, { key: "Cross-Origin-Resource-Policy", value: "cross-origin" }, { key: "Access-Control-Allow-Private-Network", value: "true" }] }];
  },
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
  // Server-side rendering of MP4s: keep the renderer / bundler / sandbox SDK out of the server bundle.
  serverExternalPackages: ["@remotion/bundler", "@remotion/renderer", "@remotion/vercel", "@vercel/sandbox", "esbuild", "harfbuzzjs", "ffmpeg-static"],
  // The prebuilt Remotion bundle ships with the studio route (renders run in `after()` of its export action).
  outputFileTracingIncludes: {
    // Runtime files reached through projectPath() (not traced automatically).
    // live engine: the sandbox runner bundles the worker and ships its in-page script + vendor files
    "/[locale]/videos/**": ["./lib/live-engine/worker/**/*", "./node_modules/ffmpeg-static/ffmpeg"],
    "/api/live-engine/**": ["./lib/live-engine/worker/**/*"],
    // these routes start workers too (a brand capture, a relaunch): the sandbox runner bundles the worker from source
    "/api/brand/capture": ["./lib/live-engine/worker/**/*"],
    "/api/live-engine/watchdog": ["./lib/live-engine/worker/**/*"],
    // the studio's create screen, composer and plans start video and post jobs from these routes
    "/[locale]": ["./lib/live-engine/worker/**/*"],
    "/[locale]/create": ["./lib/live-engine/worker/**/*"],
    "/[locale]/library": ["./lib/live-engine/worker/**/*"],
    "/[locale]/calendar": ["./lib/live-engine/worker/**/*"],
    "/[locale]/plans": ["./lib/live-engine/worker/**/*"],
    "/[locale]/wallet": ["./lib/live-engine/worker/**/*"],
    "/[locale]/posts/**": ["./lib/live-engine/worker/**/*"],
    "/[locale]/videos/*": ["./.remotion-bundle/**/*", "./packages/primitives/**/*", "./scripts/motion/**/*", "./scripts/music/*.py", "./data/motion-refs.json", "./tsconfig*.json", "./data/assets/**/*", "./node_modules/lucide-static/icons/**/*", "./node_modules/@phosphor-icons/core/assets/**/*", "./node_modules/flag-icons/flags/4x3/**/*", "./node_modules/harfbuzzjs/dist/**/*"],
  },
};

export default withNextIntl(nextConfig);
