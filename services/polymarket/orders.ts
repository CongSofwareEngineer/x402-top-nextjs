import type { Address, Hex } from 'viem'
import type { OrderDraft, OrderSide, SignTypedData } from './types'

import {
  EXCHANGE_ADDRESS,
  EXCHANGE_DOMAIN_NAME,
  EXCHANGE_DOMAIN_VERSION,
  EXCHANGE_ORDER_TYPES,
  ORDER_SIDE,
  POLYMOON_CHAIN_ID,
  SHARE_DECIMALS,
  SIGNATURE_TYPE,
  TOKEN_DECIMALS,
  ZERO_BYTES32,
} from '@/constants/polymarket'

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

export interface SignedOrderPayload {
  order: ExchangeOrder
  orderType: OrderDraft['orderType']
}

export function isNegativeRisk(market: { negRisk?: boolean }): boolean {
  return !!market.negRisk
}

/** Exchange contract to use for a given market. */
export function exchangeAddressFor(market: { negRisk?: boolean }): string {
  return isNegativeRisk(market) ? EXCHANGE_ADDRESS.NEG_RISK : EXCHANGE_ADDRESS.STANDARD
}

/**
 * Fixed-point (6 decimals) amounts for an order.
 *
 * - BUY:  makerAmount = price × size (in collateral), takerAmount = size (shares)
 * - SELL: makerAmount = size (shares), takerAmount = price × size (collateral)
 */
export function computeOrderAmounts(draft: Pick<OrderDraft, 'side' | 'price' | 'size'>): {
  makerAmount: string
  takerAmount: string
} {
  const priceScaled = Math.round(draft.price * 10 ** TOKEN_DECIMALS)
  const sizeScaled = Math.round(draft.size * 10 ** SHARE_DECIMALS)

  if (draft.side === ORDER_SIDE.BUY) {
    return {
      makerAmount: String(priceScaled * draft.size),
      takerAmount: String(sizeScaled),
    }
  }

  return {
    makerAmount: String(sizeScaled),
    takerAmount: String(priceScaled * draft.size),
  }
}

/**
 * Build and EIP-712-sign a CTF `Order` with the connected (EOA) wallet.
 *
 * `negRisk` selects the exchange contract. `signer` and `maker` are the same
 * wallet for signatureType 0 (EOA).
 */
export async function signExchangeOrder(
  draft: OrderDraft,
  signerAddress: Address,
  migRisk: boolean,
  signTypedData: SignTypedData
): Promise<SignedOrderPayload> {
  const { makerAmount, takerAmount } = computeOrderAmounts(draft)
  const salt = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
  const timestamp = String(Date.now())

  const exchange = exchangeAddressFor({ negRisk: migRisk })
  const typedData = {
    domain: {
      name: EXCHANGE_DOMAIN_NAME,
      version: EXCHANGE_DOMAIN_VERSION,
      chainId: POLYMOON_CHAIN_ID,
      verifyingContract: exchange,
    },
    types: EXCHANGE_ORDER_TYPES,
    primaryType: 'Order',
    message: {
      salt,
      maker: signerAddress,
      signer: signerAddress,
      tokenId: draft.tokenId,
      makerAmount: BigInt(makerAmount),
      takerAmount: BigInt(takerAmount),
      side: draft.side === ORDER_SIDE.BUY ? 0 : 1,
      signatureType: SIGNATURE_TYPE.EOA,
      timestamp,
      metadata: ZERO_BYTES32,
      builder: ZERO_BYTES32,
    },
  } as const

  const signature = await signTypedData(typedData)

  const isGtd = draft.orderType === 'GTD' && !!draft.expiration
  const order: ExchangeOrder = {
    salt,
    maker: signerAddress,
    signer: signerAddress,
    tokenId: draft.tokenId,
    makerAmount,
    takerAmount,
    side: draft.side,
    signature,
    signatureType: SIGNATURE_TYPE.EOA,
    expiration: isGtd ? String(draft.expiration!) : '0',
    timestamp,
    metadata: ZERO_BYTES32,
    builder: ZERO_BYTES32,
  }

  return { order, orderType: draft.orderType }
}
