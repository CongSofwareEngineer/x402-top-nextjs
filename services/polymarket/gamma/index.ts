import type { GammaEventRow, GammaMarketRow } from './type'

import { PolymarketApiError, baseUrl, parseJsonArray, requestJson, toNumber } from '../client'
import { BUILDER_CODE } from '../constants'
import { type EventsResult, type Market, type MarketFilters, type PolyEvent, type PublicProfile } from '../types'

function mapGammaMarket(row: GammaMarketRow): Market {
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
function isYesNoMarket(market: Market): boolean {
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
function mapGammaEvent(row: GammaEventRow): PolyEvent {
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
  if (filters.endDateMin) params.set('end_date_min', filters.endDateMin)
  filters.excludeTagIds?.forEach((id) => params.append('exclude_tag_id', id))

  const data = await requestJson<{ events: GammaEventRow[]; next_cursor?: string }>(baseUrl('GAMMA'), `/events/keyset?${params.toString()}`)

  return {
    events: (data.events ?? []).map(mapGammaEvent).filter((e) => e.markets.length > 0),
    nextCursor: data.next_cursor,
  }
}

/** Fetch a single event by its slug (the `/event/<slug>` part of a polymarket.com URL). */
export async function getEventBySlug(slug: string): Promise<PolyEvent | null> {
  const rows = await requestJson<GammaEventRow[]>(baseUrl('GAMMA'), `/events?slug=${encodeURIComponent(slug)}`)
  const row = rows?.[0]

  return row ? mapGammaEvent(row) : null
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
    requestJson<PublicProfile>(baseUrl('GAMMA'), `/public-profile?address=${address}`),
    requestJson<NonNullable<PublicProfile['bridge']>>(baseUrl('BRIDGE'), `/deposit`, {
      method: 'POST',
      body: JSON.stringify({
        address: address,
      }),
      headers: {
        'X-Builder-Code': BUILDER_CODE,
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
    const profile = await requestJson<PublicProfile>(baseUrl('GAMMA'), `/public-profile?address=${signer}`)

    return profile.proxyWallet ?? null
  } catch (error) {
    if (error instanceof PolymarketApiError && error.status === 404) return null
    throw error
  }
}
