import type { NextConfig } from "next";
const isProduction = process.env.NODE_ENV === "production";
const nextConfig: NextConfig = {
  cleanDistDir: isProduction,
  compiler: {
    removeConsole: isProduction,
    styledComponents: {
      displayName: true,
      ssr: true,
    },
  },
  experimental: {
    optimizeCss: isProduction,
    gzipSize: isProduction,
    optimizePackageImports: [
      "@wagmi/core",
      "@reown/appkit-adapter-wagmi",
      "@reown/appkit",
      "viem",
      "@x402/core",
      "@x402/evm",
      "@x402/fetch",
      "@x402/next",
      "@x402/svm",
      "wagmi",
      "x402",
    ],
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "Content-Type, Payment-Signature, payment-signature, PAYMENT-SIGNATURE, Payment-Required, payment-required, Authorization",
          },
          // Cho phép Client JavaScript đọc được header trả về từ Server
          {
            key: "Access-Control-Expose-Headers",
            value: "Payment-Required, payment-required, PAYMENT-REQUIRED",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
