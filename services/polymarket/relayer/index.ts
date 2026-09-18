import type { BuilderAuthConfig, DeploySafeResult, RelayPayloadResponse, RelayerTransactionResponse, SubmitResponse } from './type'

import { createHmac } from 'node:crypto'

import { baseUrl, requestJson } from '../client'
import { builderHeader } from '../bridge'

import { SUBMIT_TRANSACTION, TransactionType } from '@/constants/polymarket'
import { buildDepositWalletBatchRequest } from '@/utils/tokens'
import { KEY_POLY_MARKET } from '@/config/polymarket'

/**
 * Build the canonical HMAC-SHA256 signature for Builder-authenticated
 * relayer requests.
 *
 * message = timestamp + method + requestPath + body
 * signature = base64url(HMAC-SHA256(base64Decode(secret), message))
 */
function buildBuilderHeaders(config: BuilderAuthConfig, method: string, requestPath: string, body?: string): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000)
  const message = `${timestamp}${method}${requestPath}${body ?? ''}`

  const key = Buffer.from(config.secret, 'base64')
  const signature = createHmac('sha256', key).update(message, 'utf8').digest()
  const sigBase64 = signature.toString('base64').replace(/\+/g, '-').replace(/\//g, '_')

  return {
    POLY_BUILDER_API_KEY: config.apiKey,
    POLY_BUILDER_TIMESTAMP: String(timestamp),
    POLY_BUILDER_PASSPHRASE: config.passphrase,
    POLY_BUILDER_SIGNATURE: sigBase64,
  }
}

/**
 * Fetch the relayer (Safe singleton) address and nonce for a signer.
 * GET /relay-payload?address=<signer>&type=SAFE
 */
export async function getRelayPayload(signerAddress: string): Promise<RelayPayloadResponse> {
  return requestJson<RelayPayloadResponse>(baseUrl('RELAYER'), `/relay-payload?address=${signerAddress}&type=SAFE`)
}

/**
 * Submit a SAFE-CREATE request to the relayer.
 * POST /submit with Builder API Key auth headers.
 */
async function submitSafeCreate(signerAddress: string, toAddress: string, auth: BuilderAuthConfig): Promise<SubmitResponse> {
  const body = JSON.stringify({
    type: 'SAFE-CREATE',
    from: signerAddress,
    to: toAddress,
    metadata: 'Deploy Safe Wallet',
  })
  const headers = buildBuilderHeaders(auth, 'POST', '/submit', body)

  return requestJson<SubmitResponse>(baseUrl('RELAYER'), '/submit', {
    method: 'POST',
    headers,
    body,
  })
}

/**
 * Poll GET /transaction?id=<id> until the transaction reaches a terminal state.
 */
async function pollTransaction(transactionId: string, timeoutMs = 90_000, intervalMs = 3_000): Promise<RelayerTransactionResponse> {
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    const result = await requestJson<RelayerTransactionResponse[]>(baseUrl('RELAYER'), `/transaction?id=${transactionId}`)

    const tx = result[0]

    if (!tx) {
      throw new Error('Transaction not found')
    }

    if (tx.state === 'STATE_CONFIRMED' || tx.state === 'STATE_FAILED' || tx.state === 'STATE_INVALID') {
      return tx
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  throw new Error('Deploy timed out')
}

/**
 * Deploy the signer's Polymarket Safe wallet via the relayer (gasless).
 *
 * Steps:
 * 1. GET /relay-payload — obtain the Safe singleton address.
 * 2. POST /submit — submit a SAFE-CREATE transaction with Builder HMAC auth.
 * 3. Poll GET /transaction until STATE_CONFIRMED.
 *
 * Requires POLYMARKET_BUILDER_API_KEY / _PASSPHRASE / _SECRET env vars.
 */
export async function deploySafe(signerAddress: string): Promise<DeploySafeResult> {
  const auth: BuilderAuthConfig = {
    apiKey: process.env.POLYMARKET_BUILDER_API_KEY!,
    passphrase: process.env.POLYMARKET_BUILDER_PASSPHRASE!,
    secret: process.env.POLYMARKET_BUILDER_SECRET!,
  }

  if (!auth.apiKey || !auth.passphrase || !auth.secret) {
    throw new Error('POLYMARKET_BUILDER_API_KEY, POLYMARKET_BUILDER_PASSPHRASE and POLYMARKET_BUILDER_SECRET must be configured')
  }

  const payload = await getRelayPayload(signerAddress)

  const submitResult = await submitSafeCreate(signerAddress, payload.address, auth)

  const tx = await pollTransaction(submitResult.transactionID)

  if (tx.state === 'STATE_FAILED' || tx.state === 'STATE_INVALID') {
    throw new Error(`Safe deployment failed: ${tx.error_msg || tx.state}`)
  }

  return {
    transactionHash: tx.transactionHash,
    proxyAddress: tx.proxyAddress,
    state: tx.state,
  }
}

export const approveAllToken = async (body: Record<string, any>) => {
  const method = 'POST'
  const path = SUBMIT_TRANSACTION
  const bodyString = JSON.stringify(body)

  const headers = await builderHeader(method, path, bodyString)

  return requestJson<SubmitResponse>(baseUrl('RELAYER'), path, {
    method,
    headers,
    body: bodyString,
  })
}

export const getNonce = async (address: string) => {
  return requestJson<{ nonce: string }>(baseUrl('RELAYER'), `/nonce?type=${TransactionType.WALLET}&address=${address}`)
}

export type { BuilderAuthConfig, RelayPayloadResponse, SubmitResponse, RelayerTransactionResponse, DeploySafeResult }
