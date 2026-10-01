import type { BuilderAuthConfig, DeployDepositWalletResult, RelayerTransactionResponse, SubmitResponse } from './type'

import { createHmac } from 'node:crypto'

import { baseUrl, requestJson } from '../client'

import { SUBMIT_TRANSACTION, TransactionType } from '@/constants/polymarket'
import { CONTRACT_POLY_MARKET } from '@/constants/contractPolyMarket'

/**
 * SERVER ONLY — reads the Builder API secret from env and uses `node:crypto`.
 * Never import this module from client components.
 */

/** Builder API credentials from env (Polymarket → Settings → Builders). */
export function getBuilderAuthConfig(): BuilderAuthConfig {
  const auth: BuilderAuthConfig = {
    apiKey: process.env.POLYMARKET_BUILDER_API_KEY ?? '',
    passphrase: process.env.POLYMARKET_BUILDER_PASSPHRASE ?? '',
    secret: process.env.POLYMARKET_BUILDER_SECRET ?? '',
  }

  if (!auth.apiKey || !auth.passphrase || !auth.secret) {
    throw new Error('POLYMARKET_BUILDER_API_KEY, POLYMARKET_BUILDER_PASSPHRASE and POLYMARKET_BUILDER_SECRET must be configured')
  }

  return auth
}

/**
 * Build the canonical HMAC-SHA256 signature for Builder-authenticated
 * relayer / CLOB requests.
 *
 * message = timestamp + method + requestPath + body
 * signature = urlsafeBase64WithPadding(HMAC-SHA256(base64Decode(secret), message))
 */
export function buildBuilderHeaders(config: BuilderAuthConfig, method: string, requestPath: string, body?: string): Record<string, string> {
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
 * Submit a WALLET-CREATE request to the relayer.
 * POST /submit with Builder API Key auth headers.
 */
async function submitWalletCreate(signerAddress: string, auth: BuilderAuthConfig): Promise<SubmitResponse> {
  const body = JSON.stringify({
    type: TransactionType.WALLET_CREATE,
    from: signerAddress,
    to: CONTRACT_POLY_MARKET.DepositWalletFactory,
    metadata: 'Deploy Deposit Wallet',
  })
  const headers = buildBuilderHeaders(auth, 'POST', SUBMIT_TRANSACTION, body)

  return requestJson<SubmitResponse>(baseUrl('RELAYER'), SUBMIT_TRANSACTION, {
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
 * Deploy the signer's Polymarket Deposit Wallet via the relayer (gasless).
 *
 * All Polymarket accounts created after May 4, 2026 use a Deposit Wallet
 * (relayer type `WALLET`). The legacy `SAFE-CREATE` flow deploys a Gnosis Safe
 * at a different address, which the Data / Gamma / CLOB APIs will not
 * associate with the new-account flow.
 *
 * Steps:
 * 1. POST /submit — WALLET-CREATE with Builder HMAC auth.
 * 2. Poll GET /transaction until STATE_CONFIRMED. `proxyAddress` is the wallet.
 */
export async function deployDepositWallet(signerAddress: string): Promise<DeployDepositWalletResult> {
  const auth = getBuilderAuthConfig()
  const submitResult = await submitWalletCreate(signerAddress, auth)
  const tx = await pollTransaction(submitResult.transactionID)

  if (tx.state === 'STATE_FAILED' || tx.state === 'STATE_INVALID') {
    throw new Error(`Deposit wallet deployment failed: ${tx.error_msg || tx.state}`)
  }

  return {
    transactionHash: tx.transactionHash,
    proxyAddress: tx.proxyAddress,
    state: tx.state,
  }
}

export type { BuilderAuthConfig, SubmitResponse, RelayerTransactionResponse, DeployDepositWalletResult }
