import type { RawBook } from './type'

import { baseUrl, requestJson, toNumber } from '../client'
import { type OrderBook } from '../types'

/** `GET /book?token_id=` — orderbook + trading constraints. */
export async function getOrderBook(tokenId: string): Promise<OrderBook> {
  const data = await requestJson<RawBook>(baseUrl('CLOB'), `/book?token_id=${encodeURIComponent(tokenId)}`)

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
