'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

import { REACT_QUERY_POLY_MARKET } from '@/constants/reactQuery'
import { getEventBySlug, getOrderBook, listEvents, type MarketFilters, type PolyEvent } from '@/services/polymarket'

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

/** CLOB orderbook for an outcome token. */
export function usePolyMarketOrderBook(tokenId: string | undefined) {
  return useQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.ORDER_BOOK, tokenId],
    queryFn: () => getOrderBook(tokenId!),
    enabled: !!tokenId,
    staleTime: 5_000,
    refetchInterval: 10_000,
  })
}
