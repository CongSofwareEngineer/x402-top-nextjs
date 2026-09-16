'use client'

import { useQuery } from '@tanstack/react-query'
import { useAppKitAccount } from '@reown/appkit/react'

import { REACT_QUERY_POLY_MARKET } from '@/constants/reactQuery'
import {
  getActivity,
  getIsDeploy,
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

export function usePolyMarketIsDeploy() {
  const { address, isConnected } = useAppKitAccount()

  return useQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.IS_DEPLOY, address?.toLowerCase()],
    queryFn: (): Promise<boolean> => getIsDeploy(address!),
    enabled: !!address && isConnected,
  })
}

export function usePolyMarketProfile() {
  const { address, isConnected } = useAppKitAccount()

  const { data: isDeploy } = usePolyMarketIsDeploy()

  return useQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.PROFILE, address?.toLowerCase()],
    queryFn: (): Promise<PublicProfile | null> => getProfileByAddress(address!),
    enabled: !!address && isDeploy && isConnected,
    staleTime: 600_000,
    retry: false,
  })
}

export function usePolyMarketPortfolio() {
  const { address, isConnected } = useAppKitAccount()

  return useQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.PORTFOLIO_VALUE, address],
    queryFn: (): Promise<PortfolioValue | null> => getPortfolioValue(address!),
    enabled: !!address && isConnected,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function usePolyMarketPositions() {
  const { address } = useAppKitAccount()

  return useQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.POSITIONS, address],
    queryFn: (): Promise<Position[]> => getPositions(address!, 'OPEN'),
    enabled: !!address,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function usePolyMarketActivity(limit = 50) {
  const { address } = useAppKitAccount()

  return useQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.ACTIVITY, address, limit],
    queryFn: (): Promise<{ items: ActivityItem[]; nextCursor: string | null }> => getActivity(address!, limit),
    enabled: !!address,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function usePolyMarketUserStats() {
  const { address } = useAppKitAccount()

  return useQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.USER_STATS, address],
    queryFn: (): Promise<UserStats | null> => getUserStats(address!),
    enabled: !!address,
    staleTime: 3_600_000,
  })
}

/**
 * All wallet-derived queries for the currently connected account.
 * Returns null when disconnected.
 */
export function usePolyMarketAccount() {
  const { address } = useAppKitAccount()
  const portfolio = usePolyMarketPortfolio()
  const positions = usePolyMarketPositions()
  const activity = usePolyMarketActivity()
  const stats = usePolyMarketUserStats()

  return {
    address,
    portfolio,
    positions,
    activity,
    stats,
  }
}
