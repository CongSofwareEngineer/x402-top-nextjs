import type { Address, Hex } from 'viem'
import type { OrderDraft, SignTypedData } from '../types'
import type { ExchangeOrder, SignedOrderPayload } from './type'

import {
  EXCHANGE_ADDRESS,
  EXCHANGE_DOMAIN_NAME,
  EXCHANGE_DOMAIN_VERSION,
  EXCHANGE_ORDER_TYPES,
  ORDER_SIDE,
  POLYMOON_CHAIN_ID,
  SIGNATURE_TYPE,
  TOKEN_DECIMALS,
  ZERO_BYTES32,
} from '@/constants/polymarket'

export function isNegativeRisk(market: { negRisk?: boolean }): boolean {
  return !!market.negRisk
}

/** Exchange contract to use for a given market. */
export function exchangeAddressFor(market: { negRisk?: boolean }): string {
  return isNegativeRisk(market) ? EXCHANGE_ADDRESS.NEG_RISK : EXCHANGE_ADDRESS.STANDARD
}

const UNIT = 10 ** TOKEN_DECIMALS
const EPSILON = 1e-9

/** Truncate `value` to `decimals` places and return it in 6-decimal base units. */
function toUnitsFloor(value: number, decimals: number): number {
  const truncated = Math.floor(value * 10 ** decimals + EPSILON)

  return truncated * 10 ** (TOKEN_DECIMALS - decimals)
}

/**
 * Fixed-point (6 decimals) amounts for an order.
 *
 * Limit (GTC/GTD), `size` in shares truncated to 2 decimals:
 * - BUY:  makerAmount = price × size (collateral), takerAmount = size (shares)
 * - SELL: makerAmount = size (shares), takerAmount = price × size (collateral)
 *
 * Market (FOK/FAK with `amount`) — CLOB accepts maker ≤ 2 decimals, taker ≤ 4:
 * - BUY:  makerAmount = amount USDC, takerAmount = amount / price shares
 * - SELL: makerAmount = amount shares, takerAmount = amount × price USDC
 */
export function computeOrderAmounts(draft: Pick<OrderDraft, 'side' | 'price' | 'size' | 'amount'>): {
  makerAmount: string
  takerAmount: string
} {
  if (draft.amount != null) {
    const maker = toUnitsFloor(draft.amount, 2)
    const counter = draft.side === ORDER_SIDE.BUY ? maker / UNIT / draft.price : (maker / UNIT) * draft.price

    return { makerAmount: String(maker), takerAmount: String(toUnitsFloor(counter, 4)) }
  }

  const sizeUnits = toUnitsFloor(draft.size, 2)
  const collateralUnits = Math.round((sizeUnits / UNIT) * draft.price * UNIT)

  if (draft.side === ORDER_SIDE.BUY) {
    return { makerAmount: String(collateralUnits), takerAmount: String(sizeUnits) }
  }

  return { makerAmount: String(sizeUnits), takerAmount: String(collateralUnits) }
}

/** Result of walking the order book for a market order. */
export interface MarketQuote {
  /** Shares bought / sold. */
  shares: number
  /** USDC spent (BUY) or received (SELL). */
  usd: number
  avgPrice: number
  /** Worst level touched — used as the FOK limit price. */
  worstPrice: number
  /** `false` when the book does not have enough depth. */
  filled: boolean
}

type BookLevel = { price: number; size: number }

/** BUY: spend `usd` against the asks (cheapest first). */
export function quoteBuyUsd(asks: BookLevel[], usd: number): MarketQuote {
  const levels = [...asks].sort((a, b) => a.price - b.price)
  let remaining = usd
  let shares = 0
  let worstPrice = levels[0]?.price ?? 0

  for (const level of levels) {
    if (remaining <= EPSILON) break
    const cost = level.price * level.size

    worstPrice = level.price
    if (cost >= remaining) {
      shares += remaining / level.price
      remaining = 0
    } else {
      shares += level.size
      remaining -= cost
    }
  }

  const spent = usd - remaining

  return { shares, usd: spent, avgPrice: shares > 0 ? spent / shares : 0, worstPrice, filled: remaining <= EPSILON }
}

/** SELL: shares needed to receive `usd` from the bids (highest first). */
export function quoteSellUsd(bids: BookLevel[], usd: number): MarketQuote {
  const levels = [...bids].sort((a, b) => b.price - a.price)
  let remaining = usd
  let shares = 0
  let worstPrice = levels[0]?.price ?? 0

  for (const level of levels) {
    if (remaining <= EPSILON) break
    const value = level.price * level.size

    worstPrice = level.price
    if (value >= remaining) {
      shares += remaining / level.price
      remaining = 0
    } else {
      shares += level.size
      remaining -= value
    }
  }

  const received = usd - remaining

  return { shares, usd: received, avgPrice: shares > 0 ? received / shares : 0, worstPrice, filled: remaining <= EPSILON }
}

/** SELL: USDC received for selling exactly `shares` into the bids. */
export function quoteSellShares(bids: BookLevel[], shares: number): MarketQuote {
  const levels = [...bids].sort((a, b) => b.price - a.price)
  let remaining = shares
  let usd = 0
  let worstPrice = levels[0]?.price ?? 0

  for (const level of levels) {
    if (remaining <= EPSILON) break
    const take = Math.min(remaining, level.size)

    worstPrice = level.price
    usd += take * level.price
    remaining -= take
  }

  const sold = shares - remaining

  return { shares: sold, usd, avgPrice: sold > 0 ? usd / sold : 0, worstPrice, filled: remaining <= EPSILON }
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
