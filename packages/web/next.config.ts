import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.API_URL || "http://127.0.0.1:8000"}/v1/:path*`,
      },
      {
        source: "/health",
        destination: `${process.env.API_URL || "http://127.0.0.1:8000"}/health`,
      },
      {
        source: "/api/health",
        destination: `${process.env.API_URL || "http://127.0.0.1:8000"}/health`,
      },
      {
        source: "/ready",
        destination: `${process.env.API_URL || "http://127.0.0.1:8000"}/ready`,
      },
    ];
  },
};

export default nextConfig;
