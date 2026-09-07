import type { NextConfig } from "next";
const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
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

if (isProduction) {
  nextConfig.cleanDistDir = true;
  nextConfig.compiler = {
    removeConsole: true,
    styledComponents: {
      displayName: true,
      ssr: true,
    },
  };
  nextConfig.experimental = {
    optimizeCss: true,
    gzipSize: true,
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
  };
}

export default nextConfig;
