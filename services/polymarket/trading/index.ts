import type { WalletClient } from 'viem'

import { createPublicClient, createSecureClient, OrderSide, OrderType, remoteBuilderSigning } from '@polymarket/client'
import { signerFrom } from '@polymarket/client/viem'

import { toNumber } from '../client'
import { ORDER_SIDE, STORAGE_KEY_CLOB_CREDENTIALS } from '../constants'
import { type ClobCredentials, type MarketOrder, type OpenOrder } from '../types'

export type TradingClient = Awaited<ReturnType<typeof createSecureClient>>

/** SDK credential shape (`key` is a branded `ApiKey` string). */
type SdkApiKeyCreds = TradingClient['credentials']

/** Minimal key/value storage (`localStorage`-compatible) for cached CLOB credentials. */
export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

let publicClient: ReturnType<typeof createPublicClient> | null = null

/**
 * On-chain check of the approvals `setupTradingApprovals()` grants (pUSD +
 * Conditional Tokens → exchanges/adapters). Read-only, no signer needed.
 */
export async function fetchTradingApprovalsState(wallet: string) {
  publicClient ??= createPublicClient()

  return publicClient.fetchTradingApprovalsState({ user: wallet })
}

/** CLOB L2 credentials a connected client is using (SDK `key` → `apiKey`). */
export function credentialsOf(client: TradingClient): ClobCredentials {
  const { key, secret, passphrase } = client.credentials

  return { apiKey: key, secret, passphrase }
}

function browserStorage(): KeyValueStorage | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined
  } catch {
    return undefined
  }
}

export interface TradingSessionOptions {
  /** App route that signs Builder-authenticated requests server-side (see `relayer/buildBuilderHeaders`). */
  builderSignUrl: string
  /** Where CLOB credentials are cached. Defaults to `localStorage` in the browser, memory-only elsewhere. */
  storage?: KeyValueStorage
}

export interface ConnectParams {
  /** Connected wallet client of the signer (EOA). */
  walletClient: WalletClient
  /** Signer address — the key for cached credentials. */
  signer: string
  /** The signer's Polymarket account wallet (Deposit Wallet / Safe) — see `resolveAccountWallet`. */
  wallet: string
  /** Ignore cached credentials and ask for a new `ClobAuth` signature. */
  fresh?: boolean
}

/**
 * Manages the `@polymarket/client` SecureClient for a signer acting on its
 * account wallet:
 *
 * - First connect (no cached credentials): prompts one EIP-712 `ClobAuth`
 *   signature and creates/derives the CLOB L2 API key ("enable trading").
 * - Later connects reuse the cached credentials silently (re-signing only if
 *   they were revoked) and the same client instance.
 *
 * Builder auth for gasless relayer calls goes through `builderSignUrl`, so
 * the Builder secret stays on the server.
 */
export function createTradingSession({ builderSignUrl, storage = browserStorage() }: TradingSessionOptions) {
  const clients = new Map<string, Promise<TradingClient>>()
  const storageKey = (signer: string) => `${STORAGE_KEY_CLOB_CREDENTIALS}:${signer.toLowerCase()}`

  function loadCredentials(signer: string | undefined): ClobCredentials | null {
    if (!signer || !storage) return null
    try {
      const parsed = JSON.parse(storage.getItem(storageKey(signer)) ?? 'null') as ClobCredentials | null

      return parsed?.apiKey && parsed.secret && parsed.passphrase ? parsed : null
    } catch {
      return null
    }
  }

  function saveCredentials(signer: string, credentials: ClobCredentials) {
    try {
      storage?.setItem(storageKey(signer), JSON.stringify(credentials))
    } catch {
      // storage unavailable (private mode) — credentials stay in memory only
    }
  }

  async function connect({ walletClient, signer, wallet, fresh = false }: ConnectParams): Promise<TradingClient> {
    const key = `${signer}:${wallet}:${walletClient.uid}`.toLowerCase()
    const cached = clients.get(key)

    if (cached && !fresh) return cached

    const credentials = fresh ? null : loadCredentials(signer)
    const pending = createSecureClient({
      signer: signerFrom(walletClient),
      wallet,
      apiKey: remoteBuilderSigning({ url: builderSignUrl }),
      ...(credentials && {
        credentials: { key: credentials.apiKey, secret: credentials.secret, passphrase: credentials.passphrase } as SdkApiKeyCreds,
      }),
    }).then((client) => {
      // Credentials may be re-derived if the cached ones were revoked.
      saveCredentials(signer, credentialsOf(client))

      return client
    })

    clients.set(key, pending)
    pending.catch(() => clients.delete(key))

    return pending
  }

  return { loadCredentials, connect }
}

export type TradingSession = ReturnType<typeof createTradingSession>

/* --------------------------------------------------------------- actions */

/** Submit a market order built by `prepareMarketOrder`. Throws when the CLOB rejects it. */
export async function placeMarketOrder(client: TradingClient, order: MarketOrder) {
  const orderType = order.orderType === 'FAK' ? OrderType.FAK : OrderType.FOK
  const response =
    order.side === ORDER_SIDE.BUY
      ? await client.placeMarketOrder({ assetId: order.tokenId, side: OrderSide.BUY, amount: order.amount, maxPrice: order.maxPrice, orderType })
      : await client.placeMarketOrder({ assetId: order.tokenId, side: OrderSide.SELL, shares: order.shares, minPrice: order.minPrice, orderType })

  if (!response.ok) throw new Error(response.message)

  return response
}

/** Open (resting) orders of the account. */
export async function listOpenOrders(client: TradingClient): Promise<OpenOrder[]> {
  const orders: OpenOrder[] = []

  for await (const page of client.listOpenOrders()) {
    for (const order of page.items) {
      orders.push({
        id: order.id,
        market: order.conditionId,
        assetId: order.assetId,
        side: order.side === ORDER_SIDE.SELL ? ORDER_SIDE.SELL : ORDER_SIDE.BUY,
        outcome: order.outcome,
        price: toNumber(order.price),
        originalSize: toNumber(order.originalSize),
        sizeMatched: toNumber(order.sizeMatched),
        createdAt: Date.parse(order.createdAt),
      })
    }
  }

  return orders
}

export async function cancelOrder(client: TradingClient, orderId: string) {
  return client.cancelOrder({ orderId })
}

/**
 * Redeem every held position of each resolved market (`conditionId`) for pUSD:
 * one gasless transaction per market, run in order. `onRedeemed` fires after
 * each confirmation.
 */
export async function redeemPositions(client: TradingClient, conditionIds: string[], onRedeemed?: (conditionId: string) => void): Promise<string[]> {
  const redeemed: string[] = []

  for (const conditionId of new Set(conditionIds)) {
    const handle = await client.redeemPositions({ conditionId })

    await handle.wait()
    redeemed.push(conditionId)
    onRedeemed?.(conditionId)
  }

  return redeemed
}

/* ------------------------------------------------------------ onboarding */

export const ONBOARDING_STEP = {
  DEPLOY: 'deploy',
  ENABLE_TRADING: 'enable_trading',
  APPROVE: 'approve',
  DONE: 'done',
} as const

export type OnboardingStep = (typeof ONBOARDING_STEP)[keyof typeof ONBOARDING_STEP]

/**
 * First unfinished account-setup step. New accounts get a Deposit Wallet;
 * legacy accounts keep their deployed Safe, so DEPLOY is already done:
 *
 * 1. Deploy         — WALLET-CREATE via relayer (gasless, server).   no signature
 * 2. Enable trading — ClobAuth → CLOB L2 API credentials.           1 signTypedData
 * 3. Approve        — pUSD + CTF approvals as one gasless batch.     1 signTypedData
 */
export function getOnboardingStep(status: { isDeployed: boolean; isTradingEnabled: boolean; isApproved: boolean }): OnboardingStep {
  if (!status.isDeployed) return ONBOARDING_STEP.DEPLOY
  if (!status.isTradingEnabled) return ONBOARDING_STEP.ENABLE_TRADING
  if (!status.isApproved) return ONBOARDING_STEP.APPROVE

  return ONBOARDING_STEP.DONE
}
