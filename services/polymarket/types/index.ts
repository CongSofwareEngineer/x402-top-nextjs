import type { Address } from 'viem'

export type OrderSide = 'BUY' | 'SELL'

export interface GammaTag {
  id: string
  label?: string | null
  slug?: string | null
}

export interface GammaCategory {
  id: string
  label?: string | null
  slug?: string | null
  title?: string | null
}

export interface GammaEvent {
  id: string
  slug?: string | null
  title?: string | null
  negRisk?: boolean
  negRiskMarketID?: string | null
  series?: { id: string; slug?: string | null; title?: string | null }[] | null
}

/**
 * Normalized market returned by Gamma API (`/markets`, `/markets/keyset`).
 */
export interface Market {
  id: string
  slug?: string | null
  question?: string | null
  description?: string | null
  conditionId?: string | null
  /** Parsed `clobTokenIds` — YES/NO outcome token ids. */
  clobTokenIds: string[]
  /** Parsed `outcomes` — ['Yes', 'No']. */
  outcomes: string[]
  /** Parsed `outcomePrices` — 0..1. */
  outcomePrices: number[]
  volume: number
  volume24h: number
  liquidity: number
  active?: boolean
  closed?: boolean
  negRisk?: boolean
  tickSize?: number
  minOrderSize?: number
  image?: string | null
  icon?: string | null
  startDate?: string
  endDate?: string | null
  lastTradePrice?: number
  oneDayPriceChange?: number
  tags?: GammaTag[]
  categories?: GammaCategory[]
  events?: GammaEvent[]
  eventId?: string
  eventSlug?: string
  /** Short label inside a multi-market event, e.g. "December 31". */
  groupItemTitle?: string | null
  /** Display order inside a multi-market event. */
  groupItemThreshold?: number
  /** Best bid / ask of the YES token. */
  bestBid?: number
  bestAsk?: number
  acceptingOrders?: boolean
}

export interface MarketFilters {
  tagId?: string
  closed?: boolean
  limit?: number
  cursor?: string
  /** Gamma `/events/keyset` order field, e.g. `volume24hr`, `volume`, `liquidity`, `startDate`, `endDate`, `competitive`. */
  sort?: string
  ascending?: boolean
}

/** Normalized Gamma event — only binary (Yes/No) open markets are kept. */
export interface PolyEvent {
  id: string
  slug: string
  title: string
  image?: string | null
  icon?: string | null
  volume: number
  volume24h: number
  liquidity: number
  startDate?: string | null
  endDate?: string | null
  negRisk: boolean
  markets: Market[]
}

export interface EventsResult {
  events: PolyEvent[]
  nextCursor?: string
}

/** Data API v2 — `GET /v2/value`. */
export interface PortfolioValue {
  proxyWallet: Address
  value: number
}

/** Data API v2 — `GET /v2/positions` row. */
export interface Position {
  proxyWallet: Address
  tokenId: string
  conditionId: string
  title?: string
  slug?: string
  icon?: string
  eventId?: string
  eventSlug?: string
  outcome?: string
  outcomeIndex?: number
  currentSize: number
  avgPrice: number
  entryCostUsdc: number
  /** Entry cost including fees. */
  totalCostUsdc: number
  currentPrice: number
  currentValue: number
  totalSize: number
  realizedPnl: number
  unrealizedPnl: number
  totalPnl: number
  percentPnl: number
  /** `OPEN` (still trading), `REDEEMABLE` (market resolved, not yet redeemed) or `CLOSED`. */
  status?: string
  /** Market resolved — the position can be redeemed (worth `currentValue`, 0 for a losing outcome). */
  redeemable: boolean
  mergeable: boolean
  negativeRisk?: boolean
  oppositeOutcome?: string
  endDate?: string
  lastEventAt?: number
}

/** Data API v2 — `GET /v2/activity` row. */
export interface ActivityItem {
  proxyWallet: Address
  timestamp: number
  type: string
  size: number
  usdcSize: number
  transactionHash?: string
  price: number
  tokenId?: string
  side?: OrderSide
  outcomeIndex?: number
  title?: string
  slug?: string
  icon?: string
  eventSlug?: string
  outcome?: string
  isCombo?: boolean
}

/** Data API v2 — `GET /v2/user-stats`. */
export interface UserStats {
  proxyWallet: string
  trades: number
  biggestWin: number
  views: number
  joinDate?: number | null
  allTimePnl?: {
    realizedPnl?: number
    unrealizedPnl?: number
    economicPnl?: number
    volumeUsdc?: number
    tradeCount?: number
    deposits?: number
    withdrawals?: number
    [k: string]: unknown
  } | null
}

export interface PaginationEnvelope<T> {
  data: T
  pagination?: {
    limit: number
    offset: number
    has_more: boolean
    next_cursor: string | null
  }
}

/** CLOB L2 credentials returned by `/auth/derive-api-key`. */
export interface ClobCredentials {
  apiKey: string
  secret: string
  passphrase: string
}

/** CLOB `GET /book` summary. */
export interface OrderBook {
  market?: string
  assetId: string
  timestamp?: string
  hash?: string
  bids: { price: number; size: number }[]
  asks: { price: number; size: number }[]
  minOrderSize: number
  tickSize: number
  negRisk: boolean
  lastTradePrice?: number
}

/** Bridge API. */
export interface BridgeAddresses {
  evm: string
  svm: string
  btc: string
  tron: string
}

/** Bridge `POST /withdraw` — addresses that forward pUSD to the chosen destination. */
export interface BridgeWithdrawResponse {
  address: BridgeAddresses
  note?: string
}

export interface SupportedAsset {
  chainId: string
  chainName: string
  token: { name: string; symbol: string; address: string; decimals: number }
  minCheckoutUsd: number
}

export interface BridgeTransaction {
  fromChainId: string
  fromTokenAddress: string
  fromAmountBaseUnit: string
  toChainId: string
  toTokenAddress: string
  status: string
  txHash?: string
  createdTimeMs?: number
}

export interface BridgeStatusResponse {
  transactions: BridgeTransaction[]
  nextCursor: string | null
}

/** Gamma `GET /public-profile`. */
export interface PublicProfile {
  createdAt?: string
  proxyWallet?: string
  profileImage?: string
  bio?: string
  pseudonym?: string
  name?: string
  users?: [
    {
      id: string
      creator: boolean
      mod: boolean
    },
  ]
  xUsername?: string
  verifiedBadge?: boolean
  bridge?: {
    address: BridgeAddresses
    note: string
  }
}

/** The signer's Polymarket account wallet — holds pUSD and positions. */
export interface PolymarketAccountWallet {
  address: string
  /** `SAFE` = legacy polymarket.com account, `DEPOSIT_WALLET` = accounts created after May 4, 2026. */
  type: 'DEPOSIT_WALLET' | 'SAFE'
  deployed: boolean
}

/** Open (resting) CLOB order of the account. */
export interface OpenOrder {
  id: string
  /** Condition id. */
  market: string
  assetId: string
  side: OrderSide
  outcome: string
  price: number
  originalSize: number
  sizeMatched: number
  /** Epoch milliseconds. */
  createdAt: number
}

export type BookLevel = { price: number; size: number }

/** Result of walking the order book for a market order. */
export interface MarketQuote {
  /** Shares bought / sold. */
  shares: number
  /** USDC spent (BUY) or received (SELL). */
  usd: number
  avgPrice: number
  /** Worst level touched — used as the order's price limit. */
  worstPrice: number
  /** `false` when the book does not have enough depth. */
  filled: boolean
}

/** What the user asks for: BUY spends `usd`; SELL receives `usd` or sells exactly `shares`. */
export type MarketOrderInput =
  { side: 'BUY'; usd: number } | { side: 'SELL'; usd: number; heldShares?: number } | { side: 'SELL'; shares: number; heldShares?: number }

/** Validated market order, ready for `placeMarketOrder`. */
export type MarketOrder = { tokenId: string; orderType?: 'FOK' | 'FAK' } & (
  { side: 'BUY'; amount: number; maxPrice: number } | { side: 'SELL'; shares: number; minPrice: number }
)
