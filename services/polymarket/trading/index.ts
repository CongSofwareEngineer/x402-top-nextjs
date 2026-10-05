import { encodeFunctionData, erc1155Abi, erc20Abi, maxUint256, parseUnits, type Address, type WalletClient } from 'viem'
import { createPublicClient, createSecureClient, OrderSide, OrderType, remoteBuilderSigning } from '@polymarket/client'
import { prepareGaslessTransaction, updateBalanceAllowance, type GaslessWorkflow } from '@polymarket/client/actions'
import { signerFrom } from '@polymarket/client/viem'

import { toNumber } from '../client'
import {
  CLOB_ASSET_TYPE,
  CONTRACTS,
  ORDER_SIDE,
  PUSD_ADDRESS,
  STORAGE_KEY_CLOB_CREDENTIALS,
  TOKEN_DECIMALS,
  TRADING_APPROVALS_METADATA,
} from '../constants'
import { type ClobCredentials, type MarketOrder, type OpenOrder } from '../types'
import { polygonClient } from '../wallet'

export type TradingClient = Awaited<ReturnType<typeof createSecureClient>>

/** SDK credential shape (`key` is a branded `ApiKey` string). */
type SdkApiKeyCreds = TradingClient['credentials']

/** SDK `AssetType` enum (lives in `@polymarket/bindings`, not re-exported by the client). */
type ClobAssetType = Parameters<typeof updateBalanceAllowance>[1]['assetType']

/** Minimal key/value storage (`localStorage`-compatible) for cached CLOB credentials. */
export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

let publicClient: ReturnType<typeof createPublicClient> | null = null

/**
 * NegRiskAdapter approvals the CLOB requires for neg-risk orders but the SDK's
 * `setupTradingApprovals()` leaves out (as of 0.12.0): pUSD allowance and
 * Conditional Tokens operator approval.
 */
async function fetchNegRiskAdapterApprovals(wallet: string) {
  const client = polygonClient()
  const [allowance, isOperator] = await Promise.all([
    client.readContract({ address: PUSD_ADDRESS, abi: erc20Abi, functionName: 'allowance', args: [wallet as Address, CONTRACTS.NegRiskAdapter] }),
    client.readContract({
      address: CONTRACTS.ConditionalTokens,
      abi: erc1155Abi,
      functionName: 'isApprovedForAll',
      args: [wallet as Address, CONTRACTS.NegRiskAdapter],
    }),
  ])

  // Granted as `max`; half of it still means "unlimited" if the token ever decrements it.
  return { collateral: allowance >= maxUint256 / BigInt(2), conditionalTokens: isOperator }
}

/**
 * On-chain check of the approvals `setupTradingApprovals()` grants (pUSD +
 * Conditional Tokens → exchanges/adapters, incl. the NegRiskAdapter). Read-only, no signer needed.
 */
export async function fetchTradingApprovalsState(wallet: string) {
  publicClient ??= createPublicClient()

  const [state, negRiskAdapter] = await Promise.all([publicClient.fetchTradingApprovalsState({ user: wallet }), fetchNegRiskAdapterApprovals(wallet)])

  return {
    ...state,
    negRiskAdapter,
    isFullyApproved: state.isFullyApproved && negRiskAdapter.collateral && negRiskAdapter.conditionalTokens,
  }
}

/**
 * Answers the signing requests of a gasless workflow with the wallet's signer
 * (mirrors the SDK's internal driver, which is not exported).
 */
async function runGaslessWorkflow(walletClient: WalletClient, workflow: GaslessWorkflow) {
  const signer = signerFrom(walletClient)
  let step = await workflow.next()

  while (!step.done) {
    const request = step.value

    try {
      switch (request.kind) {
        case 'requestAddress':
          step = await workflow.next(await signer.getAddress())
          break
        case 'signGaslessTypedData':
          step = await workflow.next(await signer.signTypedData(request.payload))
          break
        case 'signGaslessMessage':
          step = await workflow.next(await signer.signMessage(request.payload))
          break
        default:
          throw new Error('Unsupported gasless workflow request')
      }
    } catch (error) {
      step = await workflow.throw(error)
    }
  }

  return step.value
}

/**
 * Grant every missing trading approval of `wallet` as ONE gasless batch, so the
 * user signs once: the approvals the SDK's `setupTradingApprovals()` would grant
 * (its `missing` list, built the same way) plus the NegRiskAdapter ones it leaves
 * out. Finally refreshes the CLOB's cached pUSD allowance, otherwise orders keep
 * failing with "allowance: 0".
 *
 * The SDK's list also covers auto-redeem (AutoRedeemOperator as operator of the
 * CTF + PositionManager tokens), so resolved winnings are claimed without the
 * user pressing Claim; `isFullyApproved` stays false until it is granted.
 */
export async function setupTradingApprovals(client: TradingClient, wallet: string, walletClient: WalletClient) {
  const { missing, negRiskAdapter } = await fetchTradingApprovalsState(wallet)
  const erc20 = [
    ...missing.erc20,
    ...(negRiskAdapter.collateral ? [] : [{ tokenAddress: PUSD_ADDRESS, spenderAddress: CONTRACTS.NegRiskAdapter, amount: maxUint256 }]),
  ]
  const erc1155 = [
    ...missing.erc1155,
    ...(negRiskAdapter.conditionalTokens ? [] : [{ tokenAddress: CONTRACTS.ConditionalTokens, operatorAddress: CONTRACTS.NegRiskAdapter }]),
  ]
  const calls = [
    ...erc20.map((approval) => ({
      to: approval.tokenAddress,
      data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [approval.spenderAddress as Address, approval.amount] }),
    })),
    ...erc1155.map((approval) => ({
      to: approval.tokenAddress,
      data: encodeFunctionData({ abi: erc1155Abi, functionName: 'setApprovalForAll', args: [approval.operatorAddress as Address, true] }),
    })),
  ]

  if (calls.length > 0) {
    const workflow = await prepareGaslessTransaction(client, { calls, metadata: TRADING_APPROVALS_METADATA })
    const handle = await runGaslessWorkflow(walletClient, workflow)

    await handle.wait()
  }

  await updateBalanceAllowance(client, { assetType: CLOB_ASSET_TYPE.COLLATERAL as ClobAssetType })
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

/**
 * Submit a market order built by `prepareMarketOrder`. Throws when the CLOB rejects it.
 * Defaults to FAK (SDK default): fills what the book takes now, cancels the rest, never rests.
 */
export async function placeMarketOrder(client: TradingClient, order: MarketOrder) {
  const orderType = order.orderType === 'FOK' ? OrderType.FOK : OrderType.FAK
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

/**
 * Withdraw step 2: send `amount` pUSD from the account wallet to a bridge
 * withdrawal address (`createWithdrawalAddress` → `address.evm`) as one
 * gasless transaction. The bridge then forwards it to the destination chain.
 * Resolves with the Polygon transaction hash once settled.
 */
export async function transferToBridge(client: TradingClient, params: { bridgeAddress: string; amount: string }): Promise<string> {
  const handle = await client.transferErc20({
    amount: parseUnits(params.amount, TOKEN_DECIMALS),
    recipientAddress: params.bridgeAddress,
    tokenAddress: PUSD_ADDRESS,
  })
  const { transactionHash } = await handle.wait()

  return transactionHash
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
