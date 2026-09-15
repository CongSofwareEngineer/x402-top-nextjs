'use client'

import { useQuery } from '@tanstack/react-query'

import { REACT_QUERY } from '@/constants/reactQuery'
import { REACT_QUERY_POLYMARKET } from '@/constants/reactQuery'
import { getMarketPrice, getMidpoint, getOrderBook, listMarkets, listTags, type MarketFilters } from '@/services/polymarket'

export interface Category {
  id: string
  label: string
  count: number
}

/** Fetch markets and extract unique tags as categories sorted by count. */
export function usePolymarketCategories() {
  return useQuery<Category[]>({
    queryKey: [REACT_QUERY_POLYMARKET.CATEGORIES],
    queryFn: async () => {
      const { markets } = await listMarkets({ limit: 500 })
      const tagMap = new Map<string, { id: string; label: string; count: number }>()

      markets.forEach((market) => {
        market.tags?.forEach((tag) => {
          const existing = tagMap.get(tag.id)
          if (existing) {
            existing.count++
          } else {
            tagMap.set(tag.id, {
              id: tag.id,
              label: tag.label ?? tag.id,
              count: 1,
            })
          }
        })
      })

      const categories = Array.from(tagMap.values()).sort((a, b) => b.count - a.count)
      return [{ id: 'all', label: 'All', count: markets.length }, ...categories]
    },
    staleTime: 3_600_000,
  })
}

/** Cursor-paginated market list (Gamma `/markets/keyset`). */
export function usePolymarketMarkets(filters: MarketFilters) {
  return useQuery({
    queryKey: [REACT_QUERY.LIST_MARKET_POLMARKET, filters],
    queryFn: () => listMarkets(filters),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

/** Available market categories with images. */
export function usePolymarketTags() {
  return useQuery({
    queryKey: [REACT_QUERY_POLYMARKET.TAGS],
    queryFn: () => listTags(),
    staleTime: 3_600_000,
  })
}

/** CLOB orderbook for an outcome token. */
export function usePolymarketOrderBook(tokenId: string | undefined) {
  return useQuery({
    queryKey: [REACT_QUERY_POLYMARKET.ORDER_BOOK, tokenId],
    queryFn: () => getOrderBook(tokenId!),
    enabled: !!tokenId,
    staleTime: 5_000,
    refetchInterval: 10_000,
  })
}

/** Best bid (BUY) or ask (SELL) for an outcome token. */
export function usePolymarketPrice(tokenId: string | undefined, side: 'BUY' | 'SELL') {
  return useQuery({
    queryKey: [REACT_QUERY_POLYMARKET.MARKET_PRICE, tokenId, side],
    queryFn: () => getMarketPrice(tokenId!, side),
    enabled: !!tokenId,
    staleTime: 5_000,
    refetchInterval: 10_000,
  })
}

/** Midpoint of best bid/ask for an outcome token. */
export function usePolymarketMidpoint(tokenId: string | undefined) {
  return useQuery({
    queryKey: [REACT_QUERY_POLYMARKET.MARKET_PRICE, tokenId, 'midpoint'],
    queryFn: () => getMidpoint(tokenId!),
    enabled: !!tokenId,
    staleTime: 5_000,
    refetchInterval: 10_000,
  })
}
