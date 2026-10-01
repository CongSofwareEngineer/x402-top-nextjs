'use client'

import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { OrderSide, OrderType } from '@polymarket/client'

import { usePolyMarketWalletAddress } from './account'
import { usePolymarketSecureClient } from './session'

import { REACT_QUERY_POLY_MARKET } from '@/constants/reactQuery'
import { type Position } from '@/services/polymarket'

/** The Data API indexes fills/redeems a few seconds after they settle. */
const DATA_API_LAG_MS = 5_000

function refreshAccount(queryClient: QueryClient) {
  const keys = [
    REACT_QUERY_POLY_MARKET.POSITIONS,
    REACT_QUERY_POLY_MARKET.CLOSED_POSITIONS,
    REACT_QUERY_POLY_MARKET.PORTFOLIO_VALUE,
    REACT_QUERY_POLY_MARKET.CASH_BALANCE,
    REACT_QUERY_POLY_MARKET.ACTIVITY,
    REACT_QUERY_POLY_MARKET.OPEN_ORDERS,
  ]
  const invalidate = () => keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }))

  invalidate()
  setTimeout(invalidate, DATA_API_LAG_MS)
}

interface SellPositionParams {
  tokenId: string
  /** Shares to sell (≤ 2 decimals). */
  shares: number
  /** Lowest acceptable price per share — the order never fills below it. */
  minPrice: number
}

/**
 * Cash out (part of) an open position before the market resolves:
 * a FAK market SELL from the account wallet, filled against the bids.
 */
export function useSellPosition() {
  const queryClient = useQueryClient()
  const getClient = usePolymarketSecureClient()

  return useMutation({
    mutationFn: async ({ tokenId, shares, minPrice }: SellPositionParams) => {
      const client = await getClient()
      const response = await client.placeMarketOrder({
        assetId: tokenId,
        side: OrderSide.SELL,
        shares,
        minPrice,
        orderType: OrderType.FAK,
      })

      if (!response.ok) throw new Error(response.message)

      return response
    },
    onSuccess: () => refreshAccount(queryClient),
  })
}

/**
 * Claim winnings of resolved markets: redeems every held position of each
 * `conditionId` for pUSD (one gasless transaction per market, run in order).
 */
export function useRedeemPositions() {
  const queryClient = useQueryClient()
  const getClient = usePolymarketSecureClient()
  const { data: wallet } = usePolyMarketWalletAddress()

  return useMutation({
    mutationFn: async (conditionIds: string[]) => {
      const client = await getClient()
      const redeemed: string[] = []

      for (const conditionId of new Set(conditionIds)) {
        const handle = await client.redeemPositions({ conditionId })

        await handle.wait()
        redeemed.push(conditionId)

        // Hide the claimed rows right away; the Data API catches up later.
        queryClient.setQueryData<Position[]>([REACT_QUERY_POLY_MARKET.POSITIONS, wallet], (prev) =>
          prev?.filter((position) => position.conditionId !== conditionId)
        )
      }

      return redeemed
    },
    onSettled: () => refreshAccount(queryClient),
  })
}
