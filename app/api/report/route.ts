import { NextResponse } from "next/server";
import { buildApi } from "@/utils/x402";

/**
 * The protected handler. It only runs after payment is verified, and the
 * payment is settled only if this returns a successful response (status < 400).
 *
 * @returns The AI-generated report.
 */
const handler = async () => {
  return NextResponse.json(
    { status: "ok" },
    {
      status: 200,
    },
  );
};
// withX402 gates this route with x402. The CDP facilitator (wired in ../../x402)
// verifies and settles the payment — no other change from a self-hosted setup.
export const GET = buildApi(handler, "report");
