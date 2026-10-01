'use client'

import { useQuery } from '@tanstack/react-query'
import { useAppKitAccount } from '@reown/appkit/react'

import { REACT_QUERY_POLY_MARKET } from '@/constants/reactQuery'
import {
  getActivity,
  getCashBalance,
  getPortfolioValue,
  getPositions,
  getProfileByAddress,
  getUserStats,
  resolveAccountWallet,
  type PolymarketAccountWallet,
  type PublicProfile,
} from '@/services/polymarket'

function useAccountWalletQueryOptions() {
  const { address, isConnected } = useAppKitAccount()

  return {
    queryKey: [REACT_QUERY_POLY_MARKET.ACCOUNT_WALLET, address?.toLowerCase()],
    queryFn: (): Promise<PolymarketAccountWallet> => resolveAccountWallet(address!),
    enabled: !!address && isConnected,
    staleTime: Infinity,
  }
}

/** The connected signer's Polymarket account wallet (Safe or Deposit Wallet) and its deployment status. */
export function usePolyMarketAccountWallet() {
  return useQuery(useAccountWalletQueryOptions())
}

/** Address of the account wallet (see `usePolyMarketAccountWallet`). */
export function usePolyMarketWalletAddress() {
  return useQuery({ ...useAccountWalletQueryOptions(), select: (wallet) => wallet.address })
}

/**
 * Public profile + bridge deposit address for the account wallet.
 * A new account has no Gamma profile yet (404) — the result then only
 * carries `proxyWallet` and `bridge`.
 */
export function usePolyMarketProfile() {
  const { data: accountWallet } = usePolyMarketAccountWallet()
  const wallet = accountWallet?.address

  return useQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.PROFILE, wallet],
    queryFn: async (): Promise<PublicProfile> => (await getProfileByAddress(wallet!)) ?? { proxyWallet: wallet },
    enabled: !!wallet && !!accountWallet?.deployed,
    staleTime: 600_000,
    retry: false,
  })
}

export function usePolyMarketPortfolio() {
  const { data: wallet } = usePolyMarketWalletAddress()

  return useQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.PORTFOLIO_VALUE, wallet],
    queryFn: () => getPortfolioValue(wallet!),
    enabled: !!wallet,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function usePolyMarketPositions() {
  const { data: wallet } = usePolyMarketWalletAddress()

  return useQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.POSITIONS, wallet],
    queryFn: () => getPositions(wallet!, 'OPEN'),
    enabled: !!wallet,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

/** Resolved positions that were redeemed or fully sold. */
export function usePolyMarketClosedPositions() {
  const { data: wallet } = usePolyMarketWalletAddress()

  return useQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.CLOSED_POSITIONS, wallet],
    queryFn: () => getPositions(wallet!, 'CLOSED'),
    enabled: !!wallet,
    staleTime: 60_000,
  })
}

/** pUSD held by the account wallet — cash available to trade. */
export function usePolyMarketCashBalance() {
  const { data: wallet } = usePolyMarketWalletAddress()

  return useQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.CASH_BALANCE, wallet],
    queryFn: () => getCashBalance(wallet!),
    enabled: !!wallet,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function usePolyMarketActivity(limit = 50) {
  const { data: wallet } = usePolyMarketWalletAddress()

  return useQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.ACTIVITY, wallet, limit],
    queryFn: () => getActivity(wallet!, limit),
    enabled: !!wallet,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function usePolyMarketUserStats() {
  const { data: wallet } = usePolyMarketWalletAddress()

  return useQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.USER_STATS, wallet],
    queryFn: () => getUserStats(wallet!),
    enabled: !!wallet,
    staleTime: 3_600_000,
  })
}
