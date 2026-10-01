'use client'

import { useQuery } from '@tanstack/react-query'
import { useAppKitAccount } from '@reown/appkit/react'
import { polygon } from 'viem/chains'

import { REACT_QUERY_POLY_MARKET } from '@/constants/reactQuery'
import {
  getActivity,
  getProfileWallet,
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
import RelayWeb3, { type PolymarketAccountWallet } from '@/web3/relay'

function useAccountWalletQueryOptions() {
  const { address, isConnected } = useAppKitAccount()

  return {
    queryKey: [REACT_QUERY_POLY_MARKET.ACCOUNT_WALLET, address?.toLowerCase()],
    queryFn: async (): Promise<PolymarketAccountWallet> => {
      const profileWallet = await getProfileWallet(address!).catch(() => null)

      return new RelayWeb3(polygon.id).resolveAccountWallet(address!, profileWallet)
    },
    enabled: !!address && isConnected,
    staleTime: Infinity,
  }
}

/**
 * The connected signer's Polymarket account wallet — a legacy Gnosis Safe
 * ("v1" polymarket.com accounts) or a Deposit Wallet — with its deployment
 * status. This, not the EOA, holds pUSD/positions and is what Data / Gamma /
 * Bridge APIs and the SDK must be queried with.
 */
export function usePolyMarketAccountWallet() {
  return useQuery(useAccountWalletQueryOptions())
}

/** Address of the account wallet (see `usePolyMarketAccountWallet`). */
export function usePolyMarketWalletAddress() {
  return useQuery({ ...useAccountWalletQueryOptions(), select: (wallet) => wallet.address })
}

export function usePolyMarketIsDeploy() {
  return useQuery({ ...useAccountWalletQueryOptions(), select: (wallet) => wallet.deployed })
}

/**
 * Public profile + bridge deposit address for the account wallet.
 * A new account has no Gamma profile yet (404) — the result then only
 * carries `proxyWallet` and `bridge`.
 */
export function usePolyMarketProfile() {
  const { address } = useAppKitAccount()
  const { data: depositWallet } = usePolyMarketWalletAddress()
  const { data: isDeploy } = usePolyMarketIsDeploy()

  return useQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.PROFILE, address?.toLowerCase()],
    queryFn: async (): Promise<PublicProfile> => {
      const res = await getProfileByAddress(depositWallet!)

      return res ?? ({ proxyWallet: depositWallet! } as PublicProfile)
    },
    enabled: !!depositWallet && !!isDeploy,
    staleTime: 600_000,
    retry: false,
  })
}

export function usePolyMarketPortfolio() {
  const { data: depositWallet } = usePolyMarketWalletAddress()

  return useQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.PORTFOLIO_VALUE, depositWallet],
    queryFn: (): Promise<PortfolioValue | null> => getPortfolioValue(depositWallet!),
    enabled: !!depositWallet,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function usePolyMarketPositions() {
  const { data: depositWallet } = usePolyMarketWalletAddress()

  return useQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.POSITIONS, depositWallet],
    queryFn: (): Promise<Position[]> => getPositions(depositWallet!, 'OPEN'),
    enabled: !!depositWallet,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function usePolyMarketActivity(limit = 50) {
  const { data: depositWallet } = usePolyMarketWalletAddress()

  return useQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.ACTIVITY, depositWallet, limit],
    queryFn: (): Promise<{ items: ActivityItem[]; nextCursor: string | null }> => getActivity(depositWallet!, limit),
    enabled: !!depositWallet,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function usePolyMarketUserStats() {
  const { data: depositWallet } = usePolyMarketWalletAddress()

  return useQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.USER_STATS, depositWallet],
    queryFn: (): Promise<UserStats | null> => getUserStats(depositWallet!),
    enabled: !!depositWallet,
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
