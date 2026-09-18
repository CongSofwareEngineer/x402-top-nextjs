import type { Hex } from 'viem'

import type { OrderDraft, OrderSide } from '../types'

import { SIGNATURE_TYPE } from '@/constants/polymarket'

/** Signed exchange order ready for CLOB submission. */
export interface ExchangeOrder {
  salt: number
  maker: string
  signer: string
  tokenId: string
  makerAmount: string
  takerAmount: string
  side: OrderSide
  signature: Hex
  signatureType: typeof SIGNATURE_TYPE.EOA
  expiration: string
  timestamp: string
  metadata: string
  builder: string
}

/** Payload containing the signed order and its type. */
export interface SignedOrderPayload {
  order: ExchangeOrder
  orderType: OrderDraft['orderType']
}
