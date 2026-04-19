import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Emit a self-contained server bundle at .next/standalone so the Docker image
  // can ship a minimal node_modules tree. Harmless for `next dev` and `next start`.
  output: "standalone",
  serverExternalPackages: ["pdf-parse", "pdf-parse/worker", "pdfjs-dist", "@napi-rs/canvas"],
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb"
    }
  }
};

export default nextConfig;
