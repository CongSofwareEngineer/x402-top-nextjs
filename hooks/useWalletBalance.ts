'use client'

import { erc20Abi, formatUnits, type Address } from 'viem'
import { useConnection, useReadContract } from 'wagmi'

import { USDC_BY_CHAIN } from '@/constants/token'

/**
 * USDC balance of the connected wallet on the chain it is connected to.
 * `token` is undefined when that chain has no known USDC (or is not configured).
 */
export function useWalletBalance() {
  const { address, chain, chainId } = useConnection()
  const token = chainId ? USDC_BY_CHAIN[chainId] : undefined

  const query = useReadContract({
    chainId,
    address: token?.address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address as Address],
    query: {
      // `chain` is undefined for networks missing from the wagmi config (no RPC transport).
      enabled: !!address && !!token && !!chain,
      staleTime: 30_000,
      refetchInterval: 60_000,
    },
  })

  return {
    balance: query.data !== undefined && token ? Number(formatUnits(query.data, token.decimals)) : undefined,
    token,
    chain,
    isSupported: !!token && !!chain,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  }
}
