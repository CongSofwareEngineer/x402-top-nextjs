'use client'

import { useMutation, useQuery } from '@tanstack/react-query'

import { REACT_QUERY_POLY_MARKET } from '@/constants/reactQuery'
import { createWithdrawalAddress, getBridgeStatus, getSupportedAssets } from '@/services/polymarket'

/** Assets accepted by the bridge (deposit/withdraw destinations). */
export function useSupportedAssets() {
  return useQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.SUPPORTED_ASSETS],
    queryFn: getSupportedAssets,
    staleTime: 3_600_000,
  })
}

/** Deposit/withdraw transactions observed at a bridge address. */
export function useBridgeStatus(address: string | undefined) {
  return useQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.BRIDGE_STATUS, address?.toLowerCase()],
    queryFn: () => getBridgeStatus(address!),
    enabled: !!address,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

/**
 * Configure a withdrawal destination (pUSD → USDC on the target chain).
 * The transfer must be initiated from the Polymarket wallet itself.
 */
export function useCreateWithdrawalAddress() {
  return useMutation({ mutationFn: createWithdrawalAddress })
}
