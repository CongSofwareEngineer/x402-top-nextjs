'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { REACT_QUERY_POLY_MARKET } from '@/constants/reactQuery'
import { type PolymarketAccountWallet } from '@/web3/relay'

interface DeployDepositWalletRequest {
  address: string
}

interface DeployDepositWalletResponse {
  success: boolean
  transactionHash: string | null
  proxyAddress?: string
  state: string
  error?: string
}

/**
 * Deploy the signer's Polymarket Deposit Wallet via the relayer (gasless,
 * Builder-authenticated server-side — no user signature needed).
 * On success, refreshes the deployment status and profile queries.
 */
export function useDeployDepositWallet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ address }: DeployDepositWalletRequest): Promise<DeployDepositWalletResponse> => {
      const res = await fetch('/api/polymarket/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      })
      const data = (await res.json().catch(() => null)) as DeployDepositWalletResponse | null

      if (!res.ok || !data?.success) {
        throw new Error(data?.error ?? `Deploy failed: ${res.status}`)
      }

      return data
    },
    onSuccess: (data, variables) => {
      const accountKey = variables.address.toLowerCase()

      // The relayer returns the deployed wallet — trust it over local derivation.
      queryClient.setQueryData<PolymarketAccountWallet>([REACT_QUERY_POLY_MARKET.ACCOUNT_WALLET, accountKey], (prev) =>
        prev || data.proxyAddress ? { address: data.proxyAddress ?? prev!.address, type: 'DEPOSIT_WALLET', deployed: true } : prev
      )
      queryClient.invalidateQueries({ queryKey: [REACT_QUERY_POLY_MARKET.PROFILE, accountKey] })
    },
  })
}
