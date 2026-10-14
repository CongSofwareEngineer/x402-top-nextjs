import type { BookLevel, LiveQuote } from '../types'
import type { WsBookMessage, WsMarketMessage, WsPriceChangeMessage } from './type'

import { toNumber } from '../client'
import { API_POLYMARKET, CLOB_WS_FLUSH_MS, CLOB_WS_PING_MS, CLOB_WS_RECONNECT_MS, ORDER_SIDE } from '../constants'

const PING_MESSAGE = 'PING'

/** price → size per side; a level with size 0 is removed. */
interface LiveBook {
  bids: Map<number, number>
  asks: Map<number, number>
}

function toLevels(levels: Map<number, number>, descending: boolean): BookLevel[] {
  return [...levels.entries()].map(([price, size]) => ({ price, size })).sort((a, b) => (descending ? b.price - a.price : a.price - b.price))
}

function toQuote(assetId: string, book: LiveBook): LiveQuote {
  const bids = toLevels(book.bids, true)
  const asks = toLevels(book.asks, false)

  return { assetId, bids, asks, bestBid: bids[0]?.price, bestAsk: asks[0]?.price }
}

function setLevel(levels: Map<number, number>, price: number, size: number) {
  if (size > 0) levels.set(price, size)
  else levels.delete(price)
}

/**
 * Live orderbooks from the CLOB market WebSocket (the feed polymarket.com uses).
 *
 * - `book` messages replace an asset's book (sent on subscribe and after trades).
 * - `price_change` messages update single levels (`size` = new total at `price`).
 *
 * Changed assets are emitted (full book + best bid/ask) at most every
 * `CLOB_WS_FLUSH_MS`, so bursts of updates cause one render. Keeps the socket alive
 * with `PING` and reconnects after drops (the server re-sends `book` snapshots).
 * Returns an unsubscribe function that closes the socket for good.
 */
export function subscribeMarketQuotes(tokenIds: string[], onQuote: (quote: LiveQuote) => void): () => void {
  const books = new Map<string, LiveBook>()
  let socket: WebSocket | null = null
  let pingTimer: ReturnType<typeof setInterval> | undefined
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined
  let flushTimer: ReturnType<typeof setTimeout> | undefined
  const dirty = new Set<string>()
  let stopped = false

  if (tokenIds.length === 0) return () => {}

  const bookOf = (assetId: string) => {
    let book = books.get(assetId)

    if (!book) {
      book = { bids: new Map(), asks: new Map() }
      books.set(assetId, book)
    }

    return book
  }

  const flush = () => {
    flushTimer = undefined
    dirty.forEach((assetId) => onQuote(toQuote(assetId, bookOf(assetId))))
    dirty.clear()
  }

  const markDirty = (assetId: string) => {
    dirty.add(assetId)
    flushTimer ??= setTimeout(flush, CLOB_WS_FLUSH_MS)
  }

  const handleBook = (msg: WsBookMessage) => {
    const book = bookOf(msg.asset_id)

    book.bids = new Map((msg.bids ?? []).map((l) => [toNumber(l.price), toNumber(l.size)]))
    book.asks = new Map((msg.asks ?? []).map((l) => [toNumber(l.price), toNumber(l.size)]))
    markDirty(msg.asset_id)
  }

  const handlePriceChange = (msg: WsPriceChangeMessage) => {
    for (const change of msg.price_changes ?? []) {
      if (!tokenIds.includes(change.asset_id)) continue
      const book = bookOf(change.asset_id)

      setLevel(change.side === ORDER_SIDE.BUY ? book.bids : book.asks, toNumber(change.price), toNumber(change.size))
      markDirty(change.asset_id)
    }
  }

  const handleMessage = (raw: unknown) => {
    if (typeof raw !== 'string' || !(raw.startsWith('{') || raw.startsWith('['))) return // `PONG`
    const parsed = JSON.parse(raw) as WsMarketMessage | WsMarketMessage[]

    for (const msg of Array.isArray(parsed) ? parsed : [parsed]) {
      if ('price_changes' in msg) handlePriceChange(msg)
      else if ('bids' in msg || 'asks' in msg) handleBook(msg as WsBookMessage)
    }
  }

  const connect = () => {
    socket = new WebSocket(API_POLYMARKET.CLOB_WS)
    socket.onopen = () => {
      socket?.send(JSON.stringify({ assets_ids: tokenIds, type: 'market' }))
      pingTimer = setInterval(() => socket?.send(PING_MESSAGE), CLOB_WS_PING_MS)
    }
    socket.onmessage = (event) => {
      try {
        handleMessage(event.data)
      } catch {
        // Ignore malformed frames — the next `book` snapshot resyncs.
      }
    }
    socket.onclose = () => {
      clearInterval(pingTimer)
      if (!stopped) reconnectTimer = setTimeout(connect, CLOB_WS_RECONNECT_MS)
    }
    socket.onerror = () => socket?.close()
  }

  connect()

  return () => {
    stopped = true
    clearInterval(pingTimer)
    clearTimeout(reconnectTimer)
    clearTimeout(flushTimer)
    socket?.close()
  }
}
