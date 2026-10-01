import type { Challenge, GammaEventRow, GammaMarketRow } from './type'

import { PolymarketApiError, baseUrl, parseJsonArray, requestJson, toNumber } from '../client'
import { type EventsResult, type GammaTag, type Market, type MarketFilters, type MarketsResult, type PolyEvent, type PublicProfile } from '../types'

import { KEY_POLY_MARKET } from '@/config/polymarket'

export function mapGammaMarket(row: GammaMarketRow): Market {
  const outcomes = parseJsonArray<string>(row.outcomes, [])
  const outcomePrices = parseJsonArray<number>(row.outcomePrices, [])
  const clobTokenIds = parseJsonArray<string>(row.clobTokenIds, [])
  const event = row.events?.[0]

  return {
    id: row.id,
    slug: row.slug,
    question: row.question,
    description: row.description,
    conditionId: row.conditionId,
    clobTokenIds,
    outcomes,
    outcomePrices,
    volume: toNumber(row.volumeNum ?? row.volume),
    volume24h: toNumber(row.volume24hr),
    liquidity: toNumber(row.liquidityNum ?? row.liquidity),
    active: row.active ?? undefined,
    closed: row.closed ?? undefined,
    negRisk: row.negRisk ?? event?.negRisk ?? undefined,
    tickSize: toNumber(row.orderPriceMinTickSize, undefined),
    minOrderSize: toNumber(row.orderMinSize, undefined),
    image: row.image,
    icon: row.icon,
    startDate: row.startDate ?? undefined,
    endDate: row.endDate,
    lastTradePrice: toNumber(row.lastTradePrice, undefined),
    oneDayPriceChange: toNumber(row.oneDayPriceChange, undefined),
    tags: row.tags ?? undefined,
    categories: row.categories ?? undefined,
    events: row.events ?? undefined,
    eventId: event?.id,
    eventSlug: event?.slug ?? undefined,
    groupItemTitle: row.groupItemTitle,
    groupItemThreshold: toNumber(row.groupItemThreshold, undefined),
    bestBid: toNumber(row.bestBid, undefined),
    bestAsk: toNumber(row.bestAsk, undefined),
    acceptingOrders: row.acceptingOrders ?? undefined,
  }
}

/** Open market whose outcomes are exactly `Yes` / `No`. */
export function isYesNoMarket(market: Market): boolean {
  const [first, second] = market.outcomes.map((o) => o.toLowerCase())

  return (
    market.outcomes.length === 2 &&
    first === 'yes' &&
    second === 'no' &&
    market.clobTokenIds.length === 2 &&
    !market.closed &&
    market.acceptingOrders !== false
  )
}

/**
 * Map a Gamma event keeping only its open Yes/No markets.
 * Neg-risk events (mutually exclusive outcomes) are ordered by chance like
 * polymarket.com; the rest (e.g. "by date…") keep Gamma's threshold order.
 */
export function mapGammaEvent(row: GammaEventRow): PolyEvent {
  const negRisk = !!row.negRisk
  const markets = (row.markets ?? [])
    .map((m) => ({ ...mapGammaMarket(m), negRisk: m.negRisk ?? negRisk, eventId: row.id, eventSlug: row.slug ?? undefined }))
    .filter(isYesNoMarket)
    .sort((a, b) => (negRisk ? (b.outcomePrices[0] ?? 0) - (a.outcomePrices[0] ?? 0) : (a.groupItemThreshold ?? 0) - (b.groupItemThreshold ?? 0)))

  return {
    id: row.id,
    slug: row.slug ?? '',
    title: row.title ?? '',
    image: row.image,
    icon: row.icon,
    volume: toNumber(row.volume),
    volume24h: toNumber(row.volume24hr),
    liquidity: toNumber(row.liquidity),
    startDate: row.startDate,
    endDate: row.endDate,
    negRisk,
    markets,
  }
}

/**
 * List events via Gamma `/events/keyset` — the same feed polymarket.com uses
 * for its homepage (Trending = `order=volume24hr`). Events left without any
 * Yes/No market are dropped.
 */
export async function listEvents(filters: MarketFilters = {}): Promise<EventsResult> {
  const params = new URLSearchParams()

  params.set('closed', String(filters.closed ?? false))
  params.set('order', filters.sort ?? 'volume24hr')
  params.set('ascending', String(filters.ascending ?? false))
  if (filters.limit != null) params.set('limit', String(filters.limit))
  if (filters.cursor) params.set('after_cursor', filters.cursor)
  if (filters.tagId) params.set('tag_id', filters.tagId)

  const data = await requestJson<{ events: GammaEventRow[]; next_cursor?: string }>(baseUrl('GAMA'), `/events/keyset?${params.toString()}`)

  return {
    events: (data.events ?? []).map(mapGammaEvent).filter((e) => e.markets.length > 0),
    nextCursor: data.next_cursor,
  }
}

/** Fetch a single event by its slug (the `/event/<slug>` part of a polymarket.com URL). */
export async function getEventBySlug(slug: string): Promise<PolyEvent | null> {
  const rows = await requestJson<GammaEventRow[]>(baseUrl('GAMA'), `/events?slug=${encodeURIComponent(slug)}`)
  const row = rows?.[0]

  return row ? mapGammaEvent(row) : null
}

/**
 * List markets via Gamma `/markets/keyset` (cursor pagination).
 * `sortedVolOver100k` style filters are exposed through `filters.sort`.
 */
export async function listMarkets(filters: MarketFilters = {}): Promise<MarketsResult> {
  const params = new URLSearchParams()

  if (filters.limit != null) params.set('limit', String(filters.limit))
  if (filters.closed != null) params.set('closed', String(filters.closed))
  if (filters.cursor) params.set('after_cursor', filters.cursor)
  if (filters.ascending != null) params.set('ascending', String(filters.ascending))

  const sort = filters.sort ?? 'volume'

  if (sort) params.set('order', sort)

  const tagIds = filters.tagId ? [filters.tagId, ...(filters.tagIds ?? [])] : filters.tagIds

  if (tagIds?.length) {
    tagIds.forEach((id) => params.append('tag_id', id))
    params.set('include_tag', 'true')
  }

  if (filters.sportsMarketTypes?.length) {
    filters.sportsMarketTypes.forEach((type) => params.append('sports_market_types', type))
  }

  const data = await requestJson<{ markets: GammaMarketRow[]; next_cursor?: string }>(baseUrl('GAMA'), `/markets/keyset?${params.toString()}`)

  return {
    markets: (data.markets ?? []).map(mapGammaMarket),
    nextCursor: data.next_cursor,
  }
}

/** Fetch a single market by Gamma id. */
export async function getMarket(marketId: string): Promise<Market | null> {
  const row = await requestJson<GammaMarketRow>(baseUrl('GAMA'), `/markets/${marketId}`)

  return mapGammaMarket(row)
}

/** Resolve a market from one of its outcome token ids. */
export async function getMarketByToken(tokenId: string): Promise<Market | null> {
  const row = await requestJson<GammaMarketRow>(baseUrl('GAMA'), `/markets/token/${tokenId}`)

  return mapGammaMarket(row)
}

/** List available tags (used for the category/type filter). */
export async function listTags(limit = 100): Promise<GammaTag[]> {
  const data = await requestJson<GammaTag[]>(baseUrl('GAMA'), `/tags?limit=${limit}`)

  return data ?? []
}

/**
 * Public profile + bridge deposit addresses for a Polymarket account wallet.
 *
 * Gamma only has a public profile once the user finished polymarket.com's
 * profile onboarding (username). A brand-new Deposit Wallet returns
 * `404 profile not found` — that is expected and must not hide the bridge
 * deposit address, so both requests are resolved independently.
 */
export async function getProfileByAddress(address: string): Promise<PublicProfile | null> {
  const [profile, bridge] = await Promise.allSettled([
    requestJson<PublicProfile>(baseUrl('GAMA'), `/public-profile?address=${address}`),
    requestJson<NonNullable<PublicProfile['bridge']>>(baseUrl('BRIDGE'), `/deposit`, {
      method: 'POST',
      body: JSON.stringify({
        address: address,
      }),
      headers: {
        'X-Builder-Code': KEY_POLY_MARKET.Builder.Code,
      },
    }),
  ])

  if (profile.status === 'rejected' && bridge.status === 'rejected') return null

  return {
    ...(profile.status === 'fulfilled' ? profile.value : {}),
    proxyWallet: address,
    bridge: bridge.status === 'fulfilled' ? bridge.value : undefined,
  } as PublicProfile
}

/**
 * `proxyWallet` from the signer's Gamma profile — the account wallet
 * polymarket.com uses for this EOA. `null` when the EOA has no profile.
 */
export async function getProfileWallet(signer: string): Promise<string | null> {
  try {
    const profile = await requestJson<PublicProfile>(baseUrl('GAMA'), `/public-profile?address=${signer}`)

    return profile.proxyWallet ?? null
  } catch (error) {
    if (error instanceof PolymarketApiError && error.status === 404) return null
    throw error
  }
}

export async function getIsDeploy(address: string): Promise<boolean> {
  try {
    const res = await requestJson<{ deployed: boolean }>(baseUrl('RELAYER'), `/deployed?type=WALLET&address=${address}`)

    return res?.deployed
  } catch (error) {
    if (error instanceof PolymarketApiError && error.status === 404) return false
    throw error
  }
}

/** Search events/tags/profiles (used for quick navigation). */
export async function searchPublic(query: string): Promise<{ events: { id: string; slug?: string; title?: string }[]; tags: GammaTag[] }> {
  const data = await requestJson<{
    events: { id: string; slug?: string; title?: string }[]
    tags: GammaTag[]
  }>(baseUrl('GAMA'), `/public-search?q=${encodeURIComponent(query)}`)

  return { events: data.events ?? [], tags: data.tags ?? [] }
}

/** Search events/tags/profiles (used for quick navigation). */
export async function getReferralCodes(code: string) {
  const body = JSON.stringify({
    code: code,
  })
  const data = await requestJson(baseUrl('GAMA'), `/referral-codes`, {
    method: 'POST',
    body: body,
  })

  return data
}

export async function getChallenge(address: string) {
  const body = JSON.stringify({ siwe: { address: address } })
  const res = await fetch('/api/polymarket/challenge', {
    method: 'POST',
    body,
  })
  const data = await res.json()

  return data as Challenge
}

export async function login(signature: string, siweData: Record<string, any>) {
  const body = JSON.stringify({ signature, siweData })
  const res = await fetch('/api/polymarket/login', {
    method: 'POST',
    body,
  })
  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.error ?? `Login failed: ${res.status}`)
  }

  return data
}
