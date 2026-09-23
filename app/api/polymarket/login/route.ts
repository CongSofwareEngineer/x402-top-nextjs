import type { NextRequest } from 'next/server'

import { NextResponse } from 'next/server'

import { requestJson } from '@/services/polymarket'
import { baseUrl } from '@/services/polymarket/client'

export async function POST(request: NextRequest) {
  const body = await request.json()

  try {
    const combined = `${JSON.stringify(body.siweData)}:::${body.signature}`

    const finalToken = btoa(combined)
    const data = await requestJson(baseUrl('GAMA'), `/v1/login`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${finalToken}`,
        Referer: 'https://polymarket.com/',
      },
    })

    return NextResponse.json(data, { status: 200 })
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
