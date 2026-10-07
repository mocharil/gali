import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin file tracing to this package. Vercel builds it on its own (Root Directory packages/web); a tracing root
  // above it (explicit, or inferred from the repo-level package-lock.json) makes the packaging step look for
  // /vercel/path1/vercel/path1/.next and fail.
  outputFileTracingRoot: __dirname,
  // docs/METRICS.md is imported as text so the Methodology page is bundled with the build.
  webpack(config) {
    config.module.rules.push({ test: /\.md$/, type: "asset/source" });
    return config;
  },
  // All /api/* requests go through the native route so mode selection is explicit.
  async rewrites() {
    return [
      { source: "/health", destination: "/api/health" },
      { source: "/ready", destination: "/api/ready" },
    ];
  },
};
export default nextConfig;
