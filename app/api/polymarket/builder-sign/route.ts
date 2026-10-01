import type { NextRequest } from 'next/server'

import { NextResponse } from 'next/server'

import { buildBuilderHeaders, getBuilderAuthConfig } from '@/services/polymarket/relayer'

/**
 * Remote Builder Signing endpoint for `@polymarket/client`'s
 * `remoteBuilderSigning({ url: '/api/polymarket/builder-sign' })`.
 *
 * The SDK posts `{ method, path, body }` and expects the four
 * `POLY_BUILDER_*` headers back. The Builder secret never leaves the server.
 *
 * TODO: authenticate the caller (session cookie / JWT) before signing —
 * as-is any client can obtain builder-signed headers.
 */
export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null)

  const method = payload?.method
  const path = payload?.path
  const body = payload?.body

  if (typeof method !== 'string' || typeof path !== 'string' || !path.startsWith('/') || (body !== undefined && typeof body !== 'string')) {
    return NextResponse.json({ error: 'Invalid signing request' }, { status: 400 })
  }

  try {
    const headers = buildBuilderHeaders(getBuilderAuthConfig(), method.toUpperCase(), path, body)

    return NextResponse.json(headers)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Signing failed' }, { status: 500 })
  }
}
