import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbo: {
    resolveAlias: {
      "@wagmi/core/tempo": "@wagmi/core",
    },
  },
};

export default nextConfig;
