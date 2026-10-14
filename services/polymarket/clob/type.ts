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

/** CLOB market WebSocket `book` message — full snapshot of one asset. */
export interface WsBookMessage {
  event_type?: 'book'
  market?: string
  asset_id: string
  bids?: { price: string; size: string }[]
  asks?: { price: string; size: string }[]
}

/** CLOB market WebSocket `price_change` message — `size` is the new total at `price`. */
export interface WsPriceChangeMessage {
  event_type?: 'price_change'
  market?: string
  price_changes?: { asset_id: string; price: string; size: string; side: 'BUY' | 'SELL'; best_bid?: string; best_ask?: string }[]
}

export type WsMarketMessage = WsBookMessage | WsPriceChangeMessage
