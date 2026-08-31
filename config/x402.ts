import { Address } from "viem";

export const NETWORK = "eip155:84532"; // Base Sepolia
export const PAY_TO = process.env.PAY_TO as Address;
export const DOMAIN = process.env.NEXT_PUBLIC_SITE_URL as string;

export const X402_PAID_API_URL =
  process.env.X402_API_URL ?? "https://x402.vercel.app/protected";

export const PRICES_USD = {
  report: "0.01",
  "send-token": "0.01",
} as const;

export const DESCRIPTIONS = {
  report: "AI-generated report",
  "send-token": "ERC-20 token dispatch",
} as const satisfies Record<keyof typeof PRICES_USD, string>;
