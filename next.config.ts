import type { NextConfig } from "next";

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

export default nextConfig;
