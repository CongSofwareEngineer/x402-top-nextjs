import type { Hex } from 'viem'

import { baseUrl, requestJson, toNumber } from './client'
import { type CancelOrderResponse, type ClobCredentials, type OpenOrder, type OrderBook, type PlaceOrderResponse, type SignTypedData } from './types'

import { CLOB_AUTH_DOMAIN, CLOB_AUTH_MESSAGE, CLOB_AUTH_TYPES } from '@/constants/polymarket'

const CLOB = () => baseUrl('CLOB')

type ClobOrderSide = 'BUY' | 'SELL'

const decodeBase64 = (value: string): Uint8Array => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)

  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

const encodeBase64Url = (bytes: Uint8Array): string => {
  let binary = ''

  for (const byte of bytes) binary += String.fromCharCode(byte)

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_')
}

/**
 * HMAC-SHA256 over `base64Decode(secret)` — matches the CLOB L2 signing spec:
 *
 *   message = timestamp + method + request_path + body
 *   signature = urlsafeBase64WithPadding(HMAC-SHA256(base64Decode(secret), message))
 */
async function l2Signature(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', decodeBase64(secret) as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))

  return encodeBase64Url(new Uint8Array(signature))
}

/* ---------------------------------------------------------------- public */

interface RawBook {
  market?: string
  asset_id?: string
  timestamp?: string
  hash?: string
  bids?: { price: string; size: string }[]
  asks?: { price: string; size: string }[]
  min_order_size?: string
  tick_size?: string
  neg_risk?: boolean
  last_trade_price?: string
}

/** `GET /book?token_id=` — orderbook + trading constraints. */
export async function getOrderBook(tokenId: string): Promise<OrderBook> {
  const data = await requestJson<RawBook>(CLOB(), `/book?token_id=${encodeURIComponent(tokenId)}`)

  return {
    market: data.market,
    assetId: data.asset_id!,
    timestamp: data.timestamp,
    hash: data.hash,
    bids: (data.bids ?? []).map((level) => ({ price: toNumber(level.price), size: toNumber(level.size) })),
    asks: (data.asks ?? []).map((level) => ({ price: toNumber(level.price), size: toNumber(level.size) })),
    minOrderSize: toNumber(data.min_order_size),
    tickSize: toNumber(data.tick_size),
    negRisk: data.neg_risk ?? false,
    lastTradePrice: data.last_trade_price != null ? toNumber(data.last_trade_price) : undefined,
  }
}

/** `GET /price?token_id=&side=` — best bid (BUY) or ask (SELL). */
export async function getMarketPrice(tokenId: string, side: ClobOrderSide): Promise<number> {
  const data = await requestJson<{ price: number }>(CLOB(), `/price?token_id=${encodeURIComponent(tokenId)}&side=${side}`)

  return toNumber(data.price)
}

/** `GET /midpoint?token_id=` — midpoint of best bid/ask. */
export async function getMidpoint(tokenId: string): Promise<number> {
  const data = await requestJson<{ midpoint?: number }>(CLOB(), `/midpoint?token_id=${encodeURIComponent(tokenId)}`)

  return toNumber(data.midpoint)
}

/** `GET /market?condition_id=` — all CLOB-level parameters for a market. */
export async function getClobMarketInfo(conditionId: string): Promise<{
  conditionId: string
  tokens: { tokenId: string; outcome: string }[]
  tickSize: number
  negRisk: boolean
  feesEnabled: boolean
  rfqEnabled: boolean
  baseFeeRate: number
}> {
  const data = await requestJson<{
    condition_id?: string
    tokens?: { token_id?: string; outcome?: string }[]
    tick_size?: string
    neg_risk?: boolean
    fees_enabled?: boolean
    rfq_enabled?: boolean
    base_fee_rate?: string
  }>(CLOB(), `/market?condition_id=${encodeURIComponent(conditionId)}`)

  return {
    conditionId: data.condition_id ?? conditionId,
    tokens: (data.tokens ?? []).map((t) => ({ tokenId: t.token_id!, outcome: t.outcome ?? '' })),
    tickSize: toNumber(data.tick_size),
    negRisk: data.neg_risk ?? false,
    feesEnabled: data.fees_enabled ?? false,
    rfqEnabled: data.rfq_enabled ?? false,
    baseFeeRate: toNumber(data.base_fee_rate),
  }
}

/* ------------------------------------------------------------------ auth */

/**
 * Create an L1 ownership attestation and derive L2 credentials.
 *
 * Signs the `ClobAuth` EIP-712 typed data with the caller-provided signer
 * (the connected wallet), then calls `GET /auth/derive-api-key`.
 */
export async function deriveClobCredentials(signerAddress: string, signTypedData: SignTypedData): Promise<ClobCredentials> {
  const timestamp = String(Math.floor(Date.now() / 1000))
  const nonce = '0'

  const signature = await signTypedData({
    domain: CLOB_AUTH_DOMAIN,
    types: CLOB_AUTH_TYPES,
    primaryType: 'ClobAuth',
    message: {
      address: signerAddress,
      timestamp,
      nonce,
      message: CLOB_AUTH_MESSAGE,
    },
  })

  return requestJson<ClobCredentials>(CLOB(), '/auth/derive-api-key', {
    headers: {
      POLY_ADDRESS: signerAddress,
      POLY_SIGNATURE: signature,
      POLY_TIMESTAMP: timestamp,
      POLY_NONCE: nonce,
    },
  })
}

/**
 * Authenticated CLOB session bound to one signer + L2 credentials.
 */
export class ClobSession {
  constructor(
    private readonly credentials: ClobCredentials,
    private readonly signerAddress: Hex
  ) {}

  /** L1 wallet this session authenticates as. */
  get address(): Hex {
    return this.signerAddress
  }

  private async authHeaders(method: string, signedPath: string, body?: string): Promise<Record<string, string>> {
    const timestamp = String(Math.floor(Date.now() / 1000))
    const message = timestamp + method + signedPath + (body ?? '')

    return {
      POLY_ADDRESS: this.signerAddress,
      POLY_TIMESTAMP: timestamp,
      POLY_API_KEY: this.credentials.apiKey,
      POLY_PASSPHRASE: this.credentials.passphrase,
      POLY_SIGNATURE: await l2Signature(this.credentials.secret, message),
    }
  }

  /** `GET /data/orders` — the user's orders (optionally filtered). */
  async getOrders(params: { market?: string; assetId?: string; id?: string } = {}): Promise<OpenOrder[]> {
    const query = new URLSearchParams()

    if (params.market) query.set('market', params.market)
    if (params.assetId) query.set('asset_id', params.assetId)
    if (params.id) query.set('id', params.id)
    const qs = query.toString()

    const data = await requestJson<{
      data?: Array<{
        id?: string
        status?: string
        owner?: string
        maker_address?: string
        market?: string
        asset_id?: string
        side?: ClobOrderSide
        original_size?: string
        size_matched?: string
        price?: string
        outcome?: 'YES' | 'NO'
        expiration?: string
        order_type?: 'GTC' | 'GTD' | 'FAK' | 'FOK'
        associate_trades?: string[]
        created_at?: number
      }>
    }>(CLOB(), `/data/orders${qs ? `?${qs}` : ''}`, {
      headers: await this.authHeaders('GET', '/data/orders'),
    })

    return (data.data ?? []).map((order) => ({
      id: order.id!,
      status: order.status ?? 'LIVE',
      owner: order.owner ?? '',
      makerAddress: order.maker_address ?? '',
      market: order.market ?? '',
      assetId: order.asset_id ?? '',
      side: order.side ?? 'BUY',
      originalSize: toNumber(order.original_size),
      sizeMatched: toNumber(order.size_matched),
      price: toNumber(order.price),
      outcome: order.outcome ?? 'YES',
      expiration: order.expiration ?? '0',
      orderType: order.order_type ?? 'GTC',
      associateTrades: order.associate_trades,
      createdAt: order.created_at ?? 0,
    }))
  }

  /** `DELETE /order` — cancel a single order by its id. */
  async cancelOrder(orderId: string): Promise<CancelOrderResponse> {
    const body = JSON.stringify({ orderID: orderId })

    return requestJson<CancelOrderResponse>(CLOB(), '/order', {
      method: 'DELETE',
      headers: await this.authHeaders('DELETE', '/order', body),
      body,
    })
  }

  /**
   * `POST /order` — submit a pre-signed order.
   *
   * `payload` contains the EIP-712-signed order plus `orderType`; the exact
   * serialized body is what gets HMAC-signed.
   */
  async placeOrder(payload: { orderType: string; order: object }): Promise<PlaceOrderResponse> {
    const body = JSON.stringify({
      deferExec: false,
      order: payload.order,
      orderType: payload.orderType,
      owner: this.credentials.apiKey,
    })

    const data = await requestJson<{
      success?: boolean
      errorMsg?: string
      orderID?: string
      status?: string
      makingAmount?: string
      takingAmount?: string
      transactionsHashes?: string[]
      tradeIDs?: string[]
    }>(CLOB(), '/order', {
      method: 'POST',
      headers: await this.authHeaders('POST', '/order', body),
      body,
    })

    return {
      success: data.success ?? false,
      errorMsg: data.errorMsg,
      orderID: data.orderID,
      status: data.status as PlaceOrderResponse['status'],
      makingAmount: data.makingAmount,
      takingAmount: data.takingAmount,
      transactionsHashes: data.transactionsHashes,
      tradeIDs: data.tradeIDs,
    }
  }
}
