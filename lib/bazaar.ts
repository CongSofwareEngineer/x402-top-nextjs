import { declareDiscoveryExtension } from "@x402/extensions/bazaar";

export function bazaarDeclaration() {
  return declareDiscoveryExtension({
    input: {},
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
    output: {
      example: { status: "ok" },
      schema: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["ok"],
            description: "confirmed once the gateway fee has been cleared",
          },
        },
        required: ["status"],
        additionalProperties: false,
      },
    },
  });
}
