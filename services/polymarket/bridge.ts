import type { Address } from 'viem'

import { baseUrl, requestJson } from './client'
import { type BridgeDepositResponse, type BridgeQuote, type BridgeQuoteRequest, type BridgeStatusResponse, type SupportedAsset } from './types'

/**
 * Bridge API — deposit/withdraw addresses, quotes and transfer status.
 * Base URL: https://bridge.polymarket.com
 */
const BRIDGE = () => baseUrl('BRIDGE')

/**
 * `GET /supported-assets` — chains/tokens accepted for deposits & withdrawals.
 */
export async function getSupportedAssets(): Promise<SupportedAsset[]> {
  const data = await requestJson<{ supportedAssets?: SupportedAsset[] }>(BRIDGE(), '/supported-assets')

  return data.supportedAssets ?? []
}

/**
 * `POST /deposit` — bridge addresses where funds should be sent to credit
 * the wallet with pUSD.
 */
export async function createDepositAddress(walletAddress: string, builderCode?: string): Promise<BridgeDepositResponse> {
  return requestJson<BridgeDepositResponse>(BRIDGE(), '/deposit', {
    method: 'POST',
    headers: builderCode ? { 'X-Builder-Code': builderCode } : undefined,
    body: JSON.stringify({ address: walletAddress }),
  })
}

/**
 * `POST /withdraw` — bridge addresses configured for a specific withdrawal
 * destination. pUSD is then sent from the Polymarket wallet to `evm`.
 */
export async function createWithdrawalAddress(params: {
  address: string
  toChainId: string
  toTokenAddress: string
  recipientAddr: string
  builderCode?: string
}): Promise<BridgeDepositResponse> {
  return requestJson<BridgeDepositResponse>(BRIDGE(), '/withdraw', {
    method: 'POST',
    headers: params.builderCode ? { 'X-Builder-Code': params.builderCode } : undefined,
    body: JSON.stringify({
      address: params.address,
      toChainId: params.toChainId,
      toTokenAddress: params.toTokenAddress,
      recipientAddr: params.recipientAddr,
    }),
  })
}

/** `POST /quote` — preview output & fees for a bridge transfer. */
export async function getBridgeQuote(request: BridgeQuoteRequest): Promise<BridgeQuote> {
  return requestJson<BridgeQuote>(BRIDGE(), '/quote', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

/** `GET /status/{address}` — deposits/withdrawals observed at a bridge address. */
export async function getBridgeStatus(address: string, limit = 50): Promise<BridgeStatusResponse> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return { transactions: [], nextCursor: null }
  }

  return requestJson<BridgeStatusResponse>(BRIDGE(), `/status/${address}?limit=${limit}`)
}

export type { Address }
