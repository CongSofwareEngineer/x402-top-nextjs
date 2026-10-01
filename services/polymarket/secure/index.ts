import type { WalletClient } from 'viem'

import { createPublicClient, createSecureClient, remoteBuilderSigning } from '@polymarket/client'
import { signerFrom } from '@polymarket/client/viem'

import { type ClobCredentials } from '../types'

/** Next.js route that signs builder-authenticated requests server-side. */
export const BUILDER_SIGN_URL = '/api/polymarket/builder-sign'

export type PolymarketSecureClient = Awaited<ReturnType<typeof createSecureClient>>

/** SDK credential shape (`key` is a branded `ApiKey` string). */
type SdkApiKeyCreds = PolymarketSecureClient['credentials']

let publicClient: ReturnType<typeof createPublicClient> | null = null

/**
 * On-chain check of the approvals `setupTradingApprovals()` grants (pUSD +
 * Conditional Tokens → exchanges/adapters). Read-only, no signer needed.
 */
export async function fetchTradingApprovalsState(wallet: string) {
  publicClient ??= createPublicClient()

  return publicClient.fetchTradingApprovalsState({ user: wallet })
}

interface ConnectSecureClientParams {
  /** Connected wagmi/viem wallet client (must have an account). */
  walletClient: WalletClient
  /** The user's deployed Deposit Wallet (account/funder wallet). */
  wallet: string
  /** Cached L2 credentials — when valid, no ClobAuth signature is requested. */
  credentials?: ClobCredentials | null
}

/**
 * Create an authenticated `@polymarket/client` SecureClient for the
 * connected wallet acting on its Deposit Wallet.
 *
 * - Without `credentials`: prompts one EIP-712 `ClobAuth` signature and
 *   creates/derives the CLOB L2 API key ("enable trading").
 * - With `credentials`: verifies them against the CLOB and reuses them
 *   silently; falls back to a new signature if they were revoked.
 *
 * Builder auth for gasless relayer calls goes through `BUILDER_SIGN_URL`, so
 * the Builder secret stays on the server.
 */
export async function connectSecureClient({ walletClient, wallet, credentials }: ConnectSecureClientParams): Promise<PolymarketSecureClient> {
  const options = {
    signer: signerFrom(walletClient),
    wallet,
    apiKey: remoteBuilderSigning({ url: BUILDER_SIGN_URL }),
  }

  if (!credentials) return createSecureClient(options)

  return createSecureClient({
    ...options,
    credentials: { key: credentials.apiKey, secret: credentials.secret, passphrase: credentials.passphrase } as SdkApiKeyCreds,
  })
}

/** SDK credentials (`key`) → app storage shape (`apiKey`). */
export function toClobCredentials(client: PolymarketSecureClient): ClobCredentials {
  const { key, secret, passphrase } = client.credentials

  return { apiKey: key, secret, passphrase }
}
