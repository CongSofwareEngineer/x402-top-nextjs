import { NextResponse } from 'next/server'

import { buildHmacSignature } from '@/utils/relay'

export const POST = async (req: Request) => {
  const { secret, timestamp, method, requestPath, body } = await req.json()

  const signature = await buildHmacSignature(secret, timestamp, method, requestPath, body)

  return NextResponse.json(
    { signature },
    {
      status: 200,
    }
  )
}
