'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { usePolymarketTradingClient } from './session'

import { REACT_QUERY_POLY_MARKET } from '@/constants/reactQuery'
import { createWithdrawalAddress, getBridgeStatus, getSupportedAssets, transferToBridge } from '@/services/polymarket'

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

export interface WithdrawParams {
  /** Polymarket account wallet on Polygon (source of the pUSD). */
  address: string
  toChainId: string
  toTokenAddress: string
  recipientAddr: string
  /** pUSD amount, decimal string (e.g. `"12.5"`). */
  amount: string
}

/**
 * Full withdrawal: create the bridge withdrawal address, then send the pUSD
 * there from the Polymarket wallet (one gasless signature). The bridge
 * forwards it to `recipientAddr` on the destination chain.
 */
export function useWithdraw() {
  const queryClient = useQueryClient()
  const getClient = usePolymarketTradingClient()

  return useMutation({
    mutationFn: async ({ amount, ...destination }: WithdrawParams) => {
      const { address } = await createWithdrawalAddress(destination)
      const transactionHash = await transferToBridge(await getClient(), { bridgeAddress: address.evm, amount })

      return { bridgeAddress: address.evm, transactionHash }
    },
    onSettled: () =>
      [REACT_QUERY_POLY_MARKET.CASH_BALANCE, REACT_QUERY_POLY_MARKET.PORTFOLIO_VALUE].forEach((key) =>
        queryClient.invalidateQueries({ queryKey: [key] })
      ),
  })
}
