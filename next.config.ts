import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  allowedDevOrigins: ["127.0.0.1"],
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: "11mb" } },
};

export default nextConfig;
