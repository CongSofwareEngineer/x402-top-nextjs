import type { Market } from '@/services/polymarket'

/** Polymarket-style compact volume: `$2.1m`, `$540k`, `$12`. */
export function formatVolume(num: number) {
  if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}b`
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}m`
  if (num >= 1e3) return `$${Math.round(num / 1e3)}k`

  return `$${Math.round(num)}`
}

export function formatUsd(num: number) {
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Probability (0..1) → `59%`, `<1%`, `>99%`. */
export function formatChance(price: number) {
  const pct = price * 100

  if (pct > 0 && pct < 1) return '<1%'
  if (pct > 99 && pct < 100) return '>99%'

  return `${Math.round(pct)}%`
}

/** Price (0..1) → `59.4¢`. */
export function formatCents(price: number) {
  const cents = price * 100

  return `${Number.isInteger(Math.round(cents * 10) / 10) ? cents.toFixed(0) : cents.toFixed(1)}¢`
}

export function yesChance(market: Market) {
  return market.outcomePrices[0] ?? 0
}

/**
 * Price to pay / receive for each outcome, like the Yes/No buttons on
 * polymarket.com. Buy Yes = best ask, Buy No = 1 − best bid (and the reverse
 * for sells). Falls back to the mid price when the book is empty.
 */
export function outcomeQuotes(market: Market, side: 'BUY' | 'SELL') {
  const mid = yesChance(market)
  const bid = market.bestBid || mid
  const ask = market.bestAsk || mid

  return side === 'BUY' ? { yes: ask, no: 1 - bid } : { yes: bid, no: 1 - ask }
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
