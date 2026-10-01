'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppKitAccount } from '@reown/appkit/react'
import { useChainId, useSwitchChain, useWalletClient } from 'wagmi'
import { polygon } from 'viem/chains'

import { usePolyMarketWalletAddress } from './account'

import { POLYMARKET_ROUTES } from '@/constants/polymarket'
import { REACT_QUERY_POLY_MARKET } from '@/constants/reactQuery'
import { createTradingSession, credentialsOf, type TradingClient } from '@/services/polymarket'

/** One trading session (client cache + credential storage) shared by the whole app. */
export const tradingSession = createTradingSession({ builderSignUrl: POLYMARKET_ROUTES.BUILDER_SIGN })

/**
 * EIP-712 domains for ClobAuth / orders / Deposit Wallet batches use chainId
 * 137 and most wallets refuse to sign them while connected to another chain.
 */
export function useEnsurePolygon() {
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()

  return useCallback(async () => {
    if (chainId !== polygon.id) {
      await switchChainAsync({ chainId: polygon.id })
    }
  }, [chainId, switchChainAsync])
}

/** Cached CLOB credentials of the connected signer — `null` until trading is enabled. */
export function usePolymarketCredentials() {
  const { address } = useAppKitAccount()

  return useQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.CLOB_CREDENTIALS, address?.toLowerCase()],
    queryFn: () => tradingSession.loadCredentials(address),
    enabled: !!address,
    staleTime: Infinity,
  })
}

/**
 * Returns `getClient()` — connects (or reuses) the trading client acting on
 * the account wallet. `fresh` forces a new ClobAuth signature ("enable
 * trading"); `readOnly` skips the chain switch for calls that sign nothing.
 */
export function usePolymarketTradingClient() {
  const queryClient = useQueryClient()
  const { address } = useAppKitAccount()
  const { data: walletClient } = useWalletClient()
  const { data: wallet } = usePolyMarketWalletAddress()
  const ensurePolygon = useEnsurePolygon()

  return useCallback(
    async ({ fresh = false, readOnly = false } = {}): Promise<TradingClient> => {
      if (!address || !walletClient) throw new Error('Wallet not connected')
      if (!wallet) throw new Error('Polymarket wallet not resolved yet')
      if (!readOnly) await ensurePolygon()

      const client = await tradingSession.connect({ walletClient, signer: address, wallet, fresh })

      queryClient.setQueryData([REACT_QUERY_POLY_MARKET.CLOB_CREDENTIALS, address.toLowerCase()], credentialsOf(client))

      return client
    },
    [queryClient, address, walletClient, wallet, ensurePolygon]
  )
}
