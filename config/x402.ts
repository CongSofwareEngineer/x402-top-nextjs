import { Address } from "viem";

export const NETWORK = "eip155:84532"; // Base Sepolia
export const PAY_TO = process.env.PAY_TO as Address;
export const DOMAIN = process.env.NEXT_PUBLIC_SITE_URL as string;

export const X402_PAID_API_URL = `${DOMAIN}/api/report`;

export const PRICES_USD = {
  "agent-insight": "0.01",
  "dispatch-asset": "0.01",
} as const;

export const DESCRIPTIONS = {
  "agent-insight": "premium agent insight analysis",
  "dispatch-asset": "asset dispatch for autonomous agents",
} as const satisfies Record<keyof typeof PRICES_USD, string>;
