'use client'

import { useQuery } from '@tanstack/react-query'
import { useAppKitAccount } from '@reown/appkit/react'
import { useAccount } from 'wagmi'
import { base, baseSepolia } from 'viem/chains'
import { createPublicClient, http, erc20Abi } from 'viem'

import { USDC_BASE_ADDRESS, TOKEN_DECIMALS } from '@/constants/polymarket'

export function useWalletBalance() {
  const { address } = useAppKitAccount()
  const { chain } = useAccount()

  return useQuery({
    queryKey: ['wallet_balance', address, chain?.id],
    queryFn: async () => {
      if (!address) return null

      const currentChain = chain?.id === base.id ? base : baseSepolia
      const publicClient = createPublicClient({
        chain: currentChain,
        transport: http(),
      })

      const balance = await publicClient.readContract({
        address: USDC_BASE_ADDRESS,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      })

      return Number(balance) / 10 ** TOKEN_DECIMALS
    },
    enabled: !!address,
    staleTime: 30000,
    refetchInterval: 60000,
  })
}
