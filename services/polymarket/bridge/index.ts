import { zeroAddress } from 'viem'

import { baseUrl, requestJson } from '../client'
import { BRIDGE_ADDRESS_TYPE_BY_CHAIN, BUILDER_CODE, NATIVE_TOKEN_PLACEHOLDER } from '../constants'
import { type BridgeAddresses, type BridgeStatusResponse, type BridgeWithdrawResponse, type SupportedAsset } from '../types'

/**
 * Bridge API — deposit/withdraw addresses and transfer status.
 * Base URL: https://bridge.polymarket.com
 */
const BRIDGE = () => baseUrl('BRIDGE')

/**
 * `GET /supported-assets` — chains/tokens accepted for deposits & withdrawals.
 * Native tokens are normalized to the zero address.
 */
export async function getSupportedAssets(): Promise<SupportedAsset[]> {
  const data = await requestJson<{ supportedAssets?: SupportedAsset[] }>(BRIDGE(), '/supported-assets')

  return (data.supportedAssets ?? []).map((asset) =>
    asset.token.address?.toLowerCase() === NATIVE_TOKEN_PLACEHOLDER ? { ...asset, token: { ...asset.token, address: zeroAddress } } : asset
  )
}

/**
 * Deposit address for a bridge chain id (`/supported-assets` `chainId`).
 * Unlisted chains are EVM; `undefined` when the chain takes no deposit address.
 */
export function getDepositAddress(addresses: BridgeAddresses | undefined, chainId: string | undefined): string | undefined {
  const mapped = chainId ? BRIDGE_ADDRESS_TYPE_BY_CHAIN[chainId] : undefined
  const type = mapped === undefined ? 'evm' : mapped

  return type ? addresses?.[type] : undefined
}

/**
 * `POST /withdraw` — bridge addresses configured for a specific withdrawal
 * destination. pUSD is then sent from the Polymarket wallet to `evm`.
 * `X-Builder-Code` defaults to the app's `BUILDER_CODE` for attribution.
 */
export async function createWithdrawalAddress(params: {
  address: string
  toChainId: string
  toTokenAddress: string
  recipientAddr: string
  builderCode?: string
}): Promise<BridgeWithdrawResponse> {
  return requestJson<BridgeWithdrawResponse>(BRIDGE(), '/withdraw', {
    method: 'POST',
    headers: { 'X-Builder-Code': params.builderCode ?? BUILDER_CODE },
    body: JSON.stringify({
      address: params.address,
      toChainId: params.toChainId,
      toTokenAddress: params.toTokenAddress,
      recipientAddr: params.recipientAddr,
    }),
  })
}

/** `GET /status/{address}` — deposits/withdrawals observed at a bridge address. */
export async function getBridgeStatus(address: string, limit = 50): Promise<BridgeStatusResponse> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return { transactions: [], nextCursor: null }
  }

  return requestJson<BridgeStatusResponse>(BRIDGE(), `/status/${address}?limit=${limit}`)
}
