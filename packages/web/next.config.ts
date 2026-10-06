import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
  // All /api/* requests go through the native route so mode selection is explicit.
  async rewrites() {
    return [
      { source: "/health", destination: "/api/health" },
      { source: "/ready", destination: "/api/ready" },
    ];
  },
};
export default nextConfig;
