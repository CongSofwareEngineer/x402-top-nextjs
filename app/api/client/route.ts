import { payForApi } from "@/utils/client";
import { NextResponse } from "next/server";

export const GET = async () => {
  const client = await payForApi();
  console.log({ client });

  return NextResponse.json(
    { status: "ok" },
    {
      status: 200,
    },
  );
};
