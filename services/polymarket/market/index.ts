import { MARKET_ORDER_SLIPPAGE, MIN_MARKET_ORDER_USD, ORDER_SIDE } from '../constants'
import { type BookLevel, type Market, type MarketOrder, type MarketOrderInput, type MarketQuote, type OrderBook, type OrderSide } from '../types'

const EPSILON = 1e-9

/** Truncate to 2 decimals (CLOB share / USDC precision). */
export const floor2 = (value: number) => Math.floor(value * 100 + EPSILON) / 100
export const ceil2 = (value: number) => Math.ceil(value * 100 - EPSILON) / 100

/** BUY: spend `usd` against the asks (cheapest first). */
export function quoteBuyUsd(asks: BookLevel[], usd: number): MarketQuote {
  const levels = [...asks].sort((a, b) => a.price - b.price)
  let remaining = usd
  let shares = 0
  let worstPrice = levels[0]?.price ?? 0

  for (const level of levels) {
    if (remaining <= EPSILON) break
    const cost = level.price * level.size

    worstPrice = level.price
    if (cost >= remaining) {
      shares += remaining / level.price
      remaining = 0
    } else {
      shares += level.size
      remaining -= cost
    }
  }

  const spent = usd - remaining

  return { shares, usd: spent, avgPrice: shares > 0 ? spent / shares : 0, worstPrice, filled: remaining <= EPSILON }
}

/** SELL: shares needed to receive `usd` from the bids (highest first). */
export function quoteSellUsd(bids: BookLevel[], usd: number): MarketQuote {
  const levels = [...bids].sort((a, b) => b.price - a.price)
  let remaining = usd
  let shares = 0
  let worstPrice = levels[0]?.price ?? 0

  for (const level of levels) {
    if (remaining <= EPSILON) break
    const value = level.price * level.size

    worstPrice = level.price
    if (value >= remaining) {
      shares += remaining / level.price
      remaining = 0
    } else {
      shares += level.size
      remaining -= value
    }
  }

  const received = usd - remaining

  return { shares, usd: received, avgPrice: shares > 0 ? received / shares : 0, worstPrice, filled: remaining <= EPSILON }
}

/** SELL: USDC received for selling exactly `shares` into the bids. */
export function quoteSellShares(bids: BookLevel[], shares: number): MarketQuote {
  const levels = [...bids].sort((a, b) => b.price - a.price)
  let remaining = shares
  let usd = 0
  let worstPrice = levels[0]?.price ?? 0

  for (const level of levels) {
    if (remaining <= EPSILON) break
    const take = Math.min(remaining, level.size)

    worstPrice = level.price
    usd += take * level.price
    remaining -= take
  }

  const sold = shares - remaining

  return { shares: sold, usd, avgPrice: sold > 0 ? usd / sold : 0, worstPrice, filled: remaining <= EPSILON }
}

/** Walk the book for a market order. `null` until there is a book and a positive amount. */
export function quoteMarketOrder(book: Pick<OrderBook, 'bids' | 'asks'> | undefined, input: MarketOrderInput): MarketQuote | null {
  if (!book) return null
  if (input.side === ORDER_SIDE.BUY) return input.usd > 0 ? quoteBuyUsd(book.asks, input.usd) : null
  if ('shares' in input) return input.shares > 0 ? quoteSellShares(book.bids, input.shares) : null

  return input.usd > 0 ? quoteSellUsd(book.bids, input.usd) : null
}

/**
 * Price limit `MARKET_ORDER_SLIPPAGE` beyond the quoted worst level, snapped to
 * the tick (away from the quote) and kept inside the tradable range [tick, 1 - tick].
 */
function slippagePrice(worstPrice: number, tickSize: number, side: OrderSide) {
  if (!(tickSize > 0)) return worstPrice

  const decimals = Math.max(0, Math.round(-Math.log10(tickSize)))
  const ticks = Math.round(worstPrice / tickSize)
  const limitTicks =
    side === ORDER_SIDE.BUY
      ? Math.min(Math.ceil(ticks * (1 + MARKET_ORDER_SLIPPAGE) - EPSILON), Math.round(1 / tickSize) - 1)
      : Math.max(Math.floor(ticks * (1 - MARKET_ORDER_SLIPPAGE) + EPSILON), 1)

  return Number((limitTicks * tickSize).toFixed(decimals))
}

/**
 * Validate a market order against a (fresh) order book and build the request
 * for `placeMarketOrder`. The price limit is the worst level touched plus
 * `MARKET_ORDER_SLIPPAGE`, so a small book move between quote and match does
 * not kill the order, and it never fills worse than that.
 */
export function prepareMarketOrder(
  tokenId: string,
  book: Pick<OrderBook, 'bids' | 'asks' | 'tickSize'> | undefined,
  input: MarketOrderInput
): { order: MarketOrder; quote: MarketQuote } | { error: string } {
  const quote = quoteMarketOrder(book, input)

  if (!quote) return { error: 'Enter an amount' }
  if (quote.shares <= 0) return { error: 'No liquidity in the order book' }

  if (input.side === ORDER_SIDE.BUY) {
    if (!quote.filled) return { error: 'Not enough liquidity in the order book for this amount' }
    const amount = floor2(input.usd)

    if (amount < MIN_MARKET_ORDER_USD) return { error: `Minimum order is $${MIN_MARKET_ORDER_USD}` }

    return { quote, order: { tokenId, side: ORDER_SIDE.BUY, amount, maxPrice: slippagePrice(quote.worstPrice, book!.tickSize, ORDER_SIDE.BUY) } }
  }

  const held = input.heldShares
  const requested = 'shares' in input ? input.shares : quote.shares

  if (held !== undefined && requested > held + 1e-6) return { error: `You only hold ${floor2(held)} shares` }
  if (!quote.filled) return { error: `Not enough liquidity — only ${floor2(quote.shares)} shares can be sold right now` }

  const target = 'shares' in input ? input.shares : ceil2(quote.shares)
  const shares = floor2(held !== undefined ? Math.min(target, held) : target)

  if (shares <= 0) return { error: 'Amount too small' }

  return { quote, order: { tokenId, side: ORDER_SIDE.SELL, shares, minPrice: slippagePrice(quote.worstPrice, book!.tickSize, ORDER_SIDE.SELL) } }
}

/** Implied probability of `Yes` (0..1). */
export function yesChance(market: Market) {
  return market.outcomePrices[0] ?? 0
}

/**
 * Price to pay / receive for each outcome, like the Yes/No buttons on
 * polymarket.com. Buy Yes = best ask, Buy No = 1 − best bid (and the reverse
 * for sells). Falls back to the mid price when the book is empty.
 */
export function outcomeQuotes(market: Market, side: OrderSide) {
  const mid = yesChance(market)
  const bid = market.bestBid || mid
  const ask = market.bestAsk || mid

  return side === ORDER_SIDE.BUY ? { yes: ask, no: 1 - bid } : { yes: bid, no: 1 - ask }
}

/** Label of a market inside its event (`December 31`) or its full question. */
export function marketLabel(market: Market) {
  return market.groupItemTitle || market.question || ''
}

/**
 * Parse a polymarket.com link:
 * `https://polymarket.com/event/<eventSlug>[/<marketSlug>]`.
 */
export function parsePolymarketUrl(input: string): { eventSlug: string; marketSlug?: string } | null {
  try {
    const url = new URL(input.trim())

    if (!url.hostname.endsWith('polymarket.com')) return null
    const [kind, eventSlug, marketSlug] = url.pathname.split('/').filter(Boolean)

    if (kind !== 'event' || !eventSlug) return null

    return { eventSlug, marketSlug }
  } catch {
    return null
  }
}
