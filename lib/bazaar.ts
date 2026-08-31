import { declareDiscoveryExtension } from "@x402/extensions/bazaar";

export function bazaarDeclaration() {
  return declareDiscoveryExtension({
    method: "GET",
    output: {
      example: { status: "ok" },
    },
  } as Parameters<typeof declareDiscoveryExtension>[0]);
}
