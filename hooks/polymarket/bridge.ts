'use client'

import { useMutation, useQuery } from '@tanstack/react-query'

import { REACT_QUERY_POLYMARKET } from '@/constants/reactQuery'
import {
  createDepositAddress,
  createWithdrawalAddress,
  getBridgeQuote,
  getBridgeStatus,
  getSupportedAssets,
  type BridgeDepositResponse,
  type BridgeQuote,
  type BridgeQuoteRequest,
  type BridgeStatusResponse,
  type SupportedAsset,
} from '@/services/polymarket'

/** Assets accepted by the bridge (deposit/withdraw destinations). */
export function useSupportedAssets() {
  return useQuery({
    queryKey: [REACT_QUERY_POLYMARKET.SUPPORTED_ASSETS],
    queryFn: (): Promise<SupportedAsset[]> => getSupportedAssets(),
    staleTime: 3_600_000,
  })
}

/** Deposit/withdraw transactions observed at a wallet's bridge address. */
export function useBridgeStatus(address: string | undefined) {
  return useQuery({
    queryKey: [REACT_QUERY_POLYMARKET.BRIDGE_STATUS, address?.toLowerCase()],
    queryFn: (): Promise<BridgeStatusResponse> => getBridgeStatus(address!),
    enabled: !!address,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

/**
 * Create (or refresh) the wallet's deposit address. The user sends Base USDC
 * to this address to fund their Polymarket account.
 */
export function useCreateDepositAddress() {
  return useMutation({
    mutationFn: (params: { address: string; builderCode?: string }): Promise<BridgeDepositResponse> =>
      createDepositAddress(params.address, params.builderCode),
  })
}

/**
 * Configure a withdrawal destination (pUSD → USDC on the target chain).
 * The transfer must be initiated from the Polymarket wallet itself.
 */
export function useCreateWithdrawalAddress() {
  return useMutation({
    mutationFn: (params: {
      address: string
      toChainId: string
      toTokenAddress: string
      recipientAddr: string
      builderCode?: string
    }): Promise<BridgeDepositResponse> => createWithdrawalAddress(params),
  })
}

/** Quote a deposit/withdrawal swap across chains. */
export function useBridgeQuote() {
  return useMutation({
    mutationFn: (request: BridgeQuoteRequest): Promise<BridgeQuote> => getBridgeQuote(request),
  })
}
