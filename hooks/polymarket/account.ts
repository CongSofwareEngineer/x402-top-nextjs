'use client'

import { useQuery } from '@tanstack/react-query'
import { useAppKitAccount } from '@reown/appkit/react'

import { REACT_QUERY_POLYMARKET } from '@/constants/reactQuery'
import {
  getActivity,
  getPortfolioValue,
  getPositions,
  getProfileByAddress,
  getUserStats,
  type ActivityItem,
  type PortfolioValue,
  type Position,
  type PublicProfile,
  type UserStats,
} from '@/services/polymarket'

export function usePolymarketProfile(address: string | undefined) {
  return useQuery({
    queryKey: [REACT_QUERY_POLYMARKET.PROFILE, address?.toLowerCase()],
    queryFn: (): Promise<PublicProfile | null> => getProfileByAddress(address!),
    enabled: !!address,
    staleTime: 600_000,
    retry: false,
  })
}

export function usePolymarketPortfolio(address: string | undefined) {
  return useQuery({
    queryKey: [REACT_QUERY_POLYMARKET.PORTFOLIO_VALUE, address],
    queryFn: (): Promise<PortfolioValue | null> => getPortfolioValue(address!),
    enabled: !!address,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function usePolymarketPositions(address: string | undefined) {
  return useQuery({
    queryKey: [REACT_QUERY_POLYMARKET.POSITIONS, address],
    queryFn: (): Promise<Position[]> => getPositions(address!, 'OPEN'),
    enabled: !!address,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function usePolymarketActivity(address: string | undefined, limit = 50) {
  return useQuery({
    queryKey: [REACT_QUERY_POLYMARKET.ACTIVITY, address, limit],
    queryFn: (): Promise<{ items: ActivityItem[]; nextCursor: string | null }> => getActivity(address!, limit),
    enabled: !!address,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function usePolymarketUserStats(address: string | undefined) {
  return useQuery({
    queryKey: [REACT_QUERY_POLYMARKET.USER_STATS, address],
    queryFn: (): Promise<UserStats | null> => getUserStats(address!),
    enabled: !!address,
    staleTime: 3_600_000,
  })
}

/**
 * All wallet-derived queries for the currently connected account.
 * Returns null when disconnected.
 */
export function usePolymarketAccount() {
  const { address } = useAppKitAccount()
  const portfolio = usePolymarketPortfolio(address)
  const positions = usePolymarketPositions(address)
  const activity = usePolymarketActivity(address)
  const stats = usePolymarketUserStats(address)

  return {
    address,
    portfolio,
    positions,
    activity,
    stats,
  }
}
