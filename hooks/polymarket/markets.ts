'use client'

import { useEffect, useMemo, useState } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

import { REACT_QUERY_POLY_MARKET } from '@/constants/reactQuery'
import { UP_DOWN_REFETCH_MS, type UpDownSeries } from '@/constants/polymarket'
import {
  getEventBySlug,
  getMarketsBySlugs,
  getOrderBook,
  getUpDownEvent,
  isMarketEnded,
  listEvents,
  subscribeMarketQuotes,
  upDownWindowStart,
  type LiveQuote,
  type Market,
  type MarketFilters,
  type PolyEvent,
} from '@/services/polymarket'

/** Homepage event feed (Gamma `/events/keyset`), appended page by page. */
export function usePolyMarketEvents(filters: Omit<MarketFilters, 'cursor'>) {
  return useInfiniteQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.EVENTS, filters],
    queryFn: ({ pageParam }) => listEvents({ ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

/** Single event by slug, kept fresh while trading. */
export function usePolyMarketEvent(slug: string | undefined, initialData?: PolyEvent) {
  return useQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.EVENT, slug],
    queryFn: () => getEventBySlug(slug!),
    enabled: !!slug,
    initialData,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

/**
 * Current window of a recurring Up/Down series (e.g. BTC 5m). The window start
 * is part of the query key and rolls over at each boundary, so the next
 * window's event is fetched automatically.
 */
export function usePolyMarketUpDownEvent(series: UpDownSeries) {
  const [windowStart, setWindowStart] = useState(() => upDownWindowStart(series.intervalSec))

  useEffect(() => {
    const nextStartMs = (windowStart + series.intervalSec) * 1000
    const timer = setTimeout(() => setWindowStart(upDownWindowStart(series.intervalSec)), Math.max(nextStartMs - Date.now(), 0))

    return () => clearTimeout(timer)
  }, [windowStart, series.intervalSec])

  return useQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.UP_DOWN_EVENT, series.slugPrefix, windowStart],
    queryFn: () => getUpDownEvent(series.slugPrefix, windowStart),
    staleTime: UP_DOWN_REFETCH_MS,
    refetchInterval: UP_DOWN_REFETCH_MS,
  })
}

/** Live CLOB book of one token over WebSocket; `undefined` until its first snapshot. */
function useLiveQuote(tokenId: string | undefined) {
  const [quote, setQuote] = useState<LiveQuote>()

  useEffect(() => {
    if (!tokenId) return

    return subscribeMarketQuotes([tokenId], setQuote)
  }, [tokenId])

  // Drop the previous token's book until the new one arrives.
  return quote?.assetId === tokenId ? quote : undefined
}

/**
 * CLOB orderbook for an outcome token. REST `/book` gives the snapshot + trading
 * constraints (tick size, min size); bids/asks are then kept live via WebSocket.
 * `refetch()` still returns the REST book (used to re-quote right before submit).
 */
export function usePolyMarketOrderBook(tokenId: string | undefined) {
  const query = useQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.ORDER_BOOK, tokenId],
    queryFn: () => getOrderBook(tokenId!),
    enabled: !!tokenId,
    staleTime: 5_000,
    refetchInterval: 10_000,
  })
  const live = useLiveQuote(tokenId)
  const data = useMemo(() => (query.data && live ? { ...query.data, bids: live.bids, asks: live.asks } : query.data), [query.data, live])

  return { ...query, data }
}

/**
 * Market with live best bid/ask of its first (Yes/Up) token. Chance = midpoint
 * like polymarket.com — Gamma's `outcomePrices` is cached and lags the book.
 */
export function usePolyMarketLiveMarket(market: Market | undefined) {
  const live = useLiveQuote(market?.clobTokenIds[0])

  return useMemo(() => {
    if (!market || live?.bestBid == null || live.bestAsk == null) return market
    const mid = (live.bestBid + live.bestAsk) / 2

    return { ...market, bestBid: live.bestBid, bestAsk: live.bestAsk, outcomePrices: [mid, 1 - mid] }
  }, [market, live])
}

/** Live/ended state per market slug (`true` = ended), e.g. for the History tab. */
export function usePolyMarketMarketStatuses(slugs: string[]) {
  const uniqueSlugs = [...new Set(slugs)].sort()

  return useQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.MARKET_STATUSES, uniqueSlugs],
    queryFn: () => getMarketsBySlugs(uniqueSlugs),
    enabled: uniqueSlugs.length > 0,
    select: (markets): Record<string, boolean> => Object.fromEntries(markets.filter((m) => m.slug).map((m) => [m.slug!, isMarketEnded(m)])),
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
}
