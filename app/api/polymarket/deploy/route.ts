import type { NextRequest } from 'next/server'

import { NextResponse } from 'next/server'

import { deploySafe } from '@/services/polymarket/relayer'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)

  if (!body || !body.address) {
    return NextResponse.json({ error: 'Missing address parameter' }, { status: 400 })
  }

  const address = String(body.address)

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
  }

  try {
    const result = await deploySafe(address)

    return NextResponse.json({
      success: true,
      transactionHash: result.transactionHash,
      proxyAddress: result.proxyAddress,
      state: result.state,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Deploy failed',
      },
      { status: 500 }
    )
  }
}
