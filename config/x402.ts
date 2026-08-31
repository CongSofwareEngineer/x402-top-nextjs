import { Address } from "viem";

export const NETWORK = "eip155:8453"; // Base
export const PAY_TO = "0xbeab7b87280b63bf90c3e8fa04d7285e3895cd07" as Address;
export const DOMAIN = process.env.NEXT_PUBLIC_SITE_URL as string;

export const X402_PAID_API_URL = `${DOMAIN}/api/report`;

export const PRICES_USD = {
  report: "0.001",
  "send-token": "0.001",
} as const;

export const DESCRIPTIONS = {
  report: "premium agent insight analysis",
  "send-token": "asset dispatch for autonomous agents",
} as const satisfies Record<keyof typeof PRICES_USD, string>;
