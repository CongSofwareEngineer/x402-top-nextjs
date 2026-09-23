import type { NextRequest } from 'next/server'

import { NextResponse } from 'next/server'

import { getChallenge } from '@/services/polymarket/gamma'
import { requestJson } from '@/services/polymarket'
import { baseUrl } from '@/services/polymarket/client'

export async function POST(request: NextRequest) {
  const body = await request.json()

  try {
    const result = await requestJson(baseUrl('GAMA'), `/v1/challenge`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        Referer: 'https://polymarket.com/',
      },
    })

    return NextResponse.json(result, { status: 200 })
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
