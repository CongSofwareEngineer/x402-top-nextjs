'use client'

import type { Address } from 'viem'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppKitAccount } from '@reown/appkit/react'
import { useSignTypedData } from 'wagmi'

import { useClobSession } from './session'

import { REACT_QUERY_POLY_MARKET } from '@/constants/reactQuery'
import {
  signExchangeOrder,
  type CancelOrderResponse,
  type OpenOrder,
  type OrderDraft,
  type PlaceOrderResponse,
  type SignTypedData,
} from '@/services/polymarket'

export function usePolyMarketOpenOrders() {
  const { session } = useClobSession()

  return useQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.OPEN_ORDERS, session?.address?.toLowerCase()],
    queryFn: (): Promise<OpenOrder[]> => session!.getOrders(),
    enabled: !!session,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

interface PlaceOrderParams {
  draft: OrderDraft
  negRisk: boolean
}

/** Sign a CTF Order and submit it via the authenticated CLOB session. */
export function usePlaceOrder() {
  const queryClient = useQueryClient()
  const { address } = useAppKitAccount()
  const { session } = useClobSession()
  const { signTypedDataAsync } = useSignTypedData()

  return useMutation({
    mutationFn: async ({ draft, negRisk }: PlaceOrderParams): Promise<PlaceOrderResponse> => {
      if (!address) throw new Error('Wallet not connected')
      if (!session) throw new Error('Authenticate with Polymarket first (enable trading)')

      const payload = await signExchangeOrder(draft, address as Address, negRisk, signTypedDataAsync as SignTypedData)

      return session.placeOrder(payload)
    },
    onSuccess: () => {
      const accountKey = address?.toLowerCase()

      queryClient.invalidateQueries({ queryKey: [REACT_QUERY_POLY_MARKET.OPEN_ORDERS, accountKey] })
      queryClient.invalidateQueries({ queryKey: [REACT_QUERY_POLY_MARKET.ACTIVITY] })
      queryClient.invalidateQueries({ queryKey: [REACT_QUERY_POLY_MARKET.POSITIONS] })
      queryClient.invalidateQueries({ queryKey: [REACT_QUERY_POLY_MARKET.PORTFOLIO_VALUE] })
      queryClient.invalidateQueries({ queryKey: [REACT_QUERY_POLY_MARKET.ORDER_BOOK] })
    },
  })
}

export function useCancelOrder() {
  const queryClient = useQueryClient()
  const { address } = useAppKitAccount()
  const { session } = useClobSession()

  return useMutation({
    mutationFn: async (orderId: string): Promise<CancelOrderResponse> => {
      if (!session) throw new Error('Authenticate with Polymarket first (enable trading)')

      return session.cancelOrder(orderId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [REACT_QUERY_POLY_MARKET.OPEN_ORDERS, address?.toLowerCase()],
      })
    },
  })
}
