'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { REACT_QUERY_POLY_MARKET } from '@/constants/reactQuery'

interface DeploySafeRequest {
  address: string
}

interface DeploySafeResponse {
  success: boolean
  transactionHash: string | null
  proxyAddress?: string
  state: string
  error?: string
}

/**
 * Deploy the signer's Polymarket Safe wallet via the relayer.
 * On success, invalidates the IS_DEPLOY and PROFILE queries so the
 * UI re-checks deployment status and loads the newly available profile.
 */
export function useDeploySafe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ address }: DeploySafeRequest): Promise<DeploySafeResponse> =>
      fetch('/api/polymarket/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      }).then((res) => {
        if (!res.ok) {
          throw new Error(`Deploy failed: ${res.status}`)
        }

        return res.json()
      }),
    onSuccess: (_, variables) => {
      const accountKey = variables.address.toLowerCase()

      queryClient.invalidateQueries({ queryKey: [REACT_QUERY_POLY_MARKET.IS_DEPLOY, accountKey] })
      queryClient.invalidateQueries({ queryKey: [REACT_QUERY_POLY_MARKET.PROFILE, accountKey] })
    },
  })
}
