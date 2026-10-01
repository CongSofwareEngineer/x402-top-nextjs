'use client'

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useWalletClient } from 'wagmi'

import { usePolyMarketWalletAddress } from './account'
import { usePolymarketCredentials, usePolymarketTradingClient } from './session'

import { REACT_QUERY_POLY_MARKET } from '@/constants/reactQuery'
import { cancelOrder, listOpenOrders, placeMarketOrder, redeemPositions, type MarketOrder, type Position } from '@/services/polymarket'

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
    REACT_QUERY_POLY_MARKET.ORDER_BOOK,
  ]
  const invalidate = () => keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }))

  invalidate()
  setTimeout(invalidate, DATA_API_LAG_MS)
}

/** Open (resting) orders — needs trading enabled, but signs nothing. */
export function usePolyMarketOpenOrders() {
  const { data: credentials } = usePolymarketCredentials()
  const { data: wallet } = usePolyMarketWalletAddress()
  const { data: walletClient } = useWalletClient()
  const getClient = usePolymarketTradingClient()

  return useQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.OPEN_ORDERS, wallet],
    queryFn: async () => listOpenOrders(await getClient({ readOnly: true })),
    enabled: !!credentials && !!wallet && !!walletClient,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

/** Place a market BUY / SELL (see `prepareMarketOrder`) from the account wallet. */
export function usePlaceMarketOrder() {
  const queryClient = useQueryClient()
  const getClient = usePolymarketTradingClient()

  return useMutation({
    mutationFn: async (order: MarketOrder) => placeMarketOrder(await getClient(), order),
    onSuccess: () => refreshAccount(queryClient),
  })
}

export function useCancelOrder() {
  const queryClient = useQueryClient()
  const getClient = usePolymarketTradingClient()

  return useMutation({
    mutationFn: async (orderId: string) => cancelOrder(await getClient({ readOnly: true }), orderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [REACT_QUERY_POLY_MARKET.OPEN_ORDERS] }),
  })
}

/** Claim winnings of resolved markets (one gasless redeem per `conditionId`). */
export function useRedeemPositions() {
  const queryClient = useQueryClient()
  const getClient = usePolymarketTradingClient()
  const { data: wallet } = usePolyMarketWalletAddress()

  return useMutation({
    mutationFn: async (conditionIds: string[]) =>
      redeemPositions(await getClient(), conditionIds, (conditionId) =>
        // Hide the claimed rows right away; the Data API catches up later.
        queryClient.setQueryData<Position[]>([REACT_QUERY_POLY_MARKET.POSITIONS, wallet], (prev) =>
          prev?.filter((position) => position.conditionId !== conditionId)
        )
      ),
    onSettled: () => refreshAccount(queryClient),
  })
}
