/** Raw orderbook response from CLOB API — snake_case fields. */
export interface RawBook {
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

/** CLOB order side alias. */
export type ClobOrderSide = 'BUY' | 'SELL'
