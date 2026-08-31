import {
  DESCRIPTIONS,
  DOMAIN,
  NETWORK,
  PAY_TO,
  PRICES_USD,
} from "@/config/x402";
import { bazaarDeclaration } from "@/lib/bazaar";
import { server } from "@/lib/x402";
import { Network, withX402 } from "@x402/next";
import { NextRequest } from "next/server";

export const buildApi = (
  handler: (request: NextRequest) => any,
  path: string,
) => {
  return withX402(
    handler,
    {
      accepts: {
        scheme: "exact",
        price: `$${PRICES_USD[path as keyof typeof PRICES_USD]}`,
        network: NETWORK as Network,
        payTo: PAY_TO,
        maxTimeoutSeconds: 3600,
      },
      description: DESCRIPTIONS[path as keyof typeof DESCRIPTIONS],
      resource: `${DOMAIN}/api/${path}`,
      extensions: bazaarDeclaration(),
    },
    server,
  );
};
