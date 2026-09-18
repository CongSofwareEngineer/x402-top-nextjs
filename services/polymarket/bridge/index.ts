import { zeroAddress, type Address, type Hex } from 'viem'

import { baseUrl, requestJson } from '../client'
import { type BridgeDepositResponse, type BridgeQuote, type BridgeQuoteRequest, type BridgeStatusResponse, type SupportedAsset } from '../types'

import { KEY_POLY_MARKET } from '@/config/polymarket'
import { lowerCase, sleep } from '@/utils/functions'
import { CONTRACT_POLY_MARKET } from '@/constants/contractPolyMarket'
import { SUBMIT_TRANSACTION } from '@/constants/polymarket'
import { buildHmacSignature } from '@/utils/relay'
import { ADDRESS_NULL_OTHER } from '@/constants/token'

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

  const listTokens = data.supportedAssets ?? []

  return listTokens.map((token) => {
    if (lowerCase(token.token.address || zeroAddress) === ADDRESS_NULL_OTHER) {
      return {
        ...token,
        token: {
          ...token.token,
          address: zeroAddress,
        },
      }
    }

    return token
  })
}

export const builderHeader = async (method: string, path: string, bodyString: string, timestamp: number) => {
  const timestampTemp = timestamp ?? Math.floor(Date.now() / 1000)
  const builderSecret = KEY_POLY_MARKET.Builder.Secret
  const builderApiKey = KEY_POLY_MARKET.Builder.ApiKey
  const builderPassphrase = KEY_POLY_MARKET.Builder.Passphrase
  const signature = await buildHmacSignature(builderSecret, timestampTemp, method, path, bodyString)

  return {
    POLY_BUILDER_API_KEY: builderApiKey,
    POLY_BUILDER_TIMESTAMP: `${timestamp}`,
    POLY_BUILDER_PASSPHRASE: builderPassphrase,
    POLY_BUILDER_SIGNATURE: signature,
  }
}

/**
 * `POST /deposit` — bridge addresses where funds should be sent to credit
 * the wallet with pUSD.
 */
export async function createDepositAddress(address: string | Hex): Promise<BridgeDepositResponse> {
  const timestamp = Math.floor(Date.now() / 1000)
  const method = 'POST'
  const path = SUBMIT_TRANSACTION

  const bodyString = JSON.stringify({
    type: 'WALLET-CREATE',
    from: address,
    to: CONTRACT_POLY_MARKET.DepositWalletFactory,
    metadata: 'Deploy Deposit Wallet',
  })

  const headers = await builderHeader(method, path, bodyString, timestamp)

  const res = await requestJson<BridgeDepositResponse>(baseUrl('RELAYER'), path, {
    method,
    headers,
    body: bodyString,
  })

  let isSuccess = false
  const transactionID = res?.transactionID

  while (isSuccess === false) {
    await sleep(2000)
    const resTemp = await requestJson<BridgeDepositResponse>(baseUrl('RELAYER'), `/transaction?id=${transactionID}`)

    if (Array.isArray(resTemp)) {
      const e = resTemp[0]

      if (e?.state === 'STATE_CONFIRMED') {
        isSuccess = true
      }
    } else {
      if (resTemp?.state === 'STATE_CONFIRMED') {
        isSuccess = true
      }
    }
  }

  return res
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
