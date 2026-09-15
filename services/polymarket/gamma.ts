import { PolymarketApiError, baseUrl, parseJsonArray, requestJson, toNumber } from './client'
import { type GammaCategory, type GammaEvent, type GammaTag, type Market, type MarketFilters, type MarketsResult, type PublicProfile } from './types'

interface GammaMarketRow {
  id: string
  slug?: string | null
  question?: string | null
  description?: string | null
  conditionId?: string | null
  clobTokenIds?: string | null
  outcomes?: string | null
  outcomePrices?: string | null
  volume?: string | null
  volumeNum?: number | null
  liquidity?: string | null
  liquidityNum?: number | null
  volume24hr?: string | null
  active?: boolean | null
  closed?: boolean | null
  image?: string | null
  icon?: string | null
  startDate?: string | null
  endDate?: string | null
  lastTradePrice?: string | null
  oneDayPriceChange?: string | null
  orderPriceMinTickSize?: string | null
  orderMinSize?: string | null
  tags?: GammaTag[] | null
  categories?: GammaCategory[] | null
  events?: GammaEvent[] | null
}

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
    negRisk: event?.negRisk ?? undefined,
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
  }
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

/** Public profile for a wallet. Returns null when the address has no profile. */
export async function getProfileByAddress(address: string): Promise<PublicProfile | null> {
  try {
    return await requestJson<PublicProfile>(baseUrl('GAMA'), `/public-profile?address=${address}`)
  } catch (error) {
    if (error instanceof PolymarketApiError && error.status === 404) return null
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
