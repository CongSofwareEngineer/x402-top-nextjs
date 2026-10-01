import type { Address, Hex } from 'viem'

/** Outcome names for a standard binary market. */
export type TradeOutcome = 'Yes' | 'No'

export type OrderSide = 'BUY' | 'SELL'
export type OrderType = 'GTC' | 'GTD' | 'FAK' | 'FOK'
export type CLOBOrderStatus = 'live' | 'matched' | 'delayed' | 'unmatched'

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
  tagIds?: string[]
  closed?: boolean
  limit?: number
  cursor?: string
  /** Gamma `/markets/keyset` order field, e.g. `volume`, `liquidity`, `volume24hr`, `startDate`, `endDate`, `competitive`. */
  sort?: string
  ascending?: boolean
  sportsMarketTypes?: string[]
  search?: string
}

export interface MarketsResult {
  markets: Market[]
  nextCursor?: string
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

/** CLOB `GET /data/orders` row. */
export interface OpenOrder {
  id: string
  status: string
  owner: string
  makerAddress: string
  market: string
  assetId: string
  side: OrderSide
  originalSize: number
  sizeMatched: number
  price: number
  outcome: 'YES' | 'NO'
  expiration: string
  orderType: OrderType
  associateTrades?: string[]
  createdAt: number
  /** Enriched market title from Gamma (filled by the app). */
  title?: string
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

export interface OrderDraft {
  tokenId: string
  side: OrderSide
  /** Limit price; for market orders the worst price walked on the book. */
  price: number
  /** Shares for limit orders (ignored when `amount` is set). */
  size: number
  orderType: OrderType
  expiration?: number
  /** Market order amount — BUY: USDC to spend, SELL: shares to sell. */
  amount?: number
}

export interface PlaceOrderResponse {
  success: boolean
  errorMsg?: string
  orderID?: string
  status?: CLOBOrderStatus
  makingAmount?: string
  takingAmount?: string
  transactionsHashes?: string[]
  tradeIDs?: string[]
}

export interface CancelOrderResponse {
  canceled: string[]
  notCanceled: Record<string, string>
}

/** Bridge API. */
export interface BridgeAddresses {
  evm: string
  svm: string
  btc: string
  tron: string
}

export interface BridgeDepositResponse {
  transactionID: string
  state?: string
}

export interface SupportedAsset {
  chainId: string
  chainName: string
  token: { name: string; symbol: string; address: string; decimals: number }
  minCheckoutUsd: number
}

export interface BridgeQuoteRequest {
  fromAmountBaseUnit: string
  fromChainId: string
  fromTokenAddress: string
  recipientAddress: string
  toChainId: string
  toTokenAddress: string
}

export interface BridgeQuote {
  quoteId: string
  estInputUsd: number
  estOutputUsd: number
  estToTokenBaseUnit: string
  estCheckoutTimeMs: number
  estFeeBreakdown?: {
    appFeeLabel?: string
    appFeeUsd?: number
    gasUsd?: number
    minReceived?: number
    maxSlippage?: number
    swapImpactUsd?: number
    totalImpactUsd?: number
  }
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
    address: {
      evm: string
      svm: string
      btc: string
      tron: string
    }
    note: string
  }
}

/** Signature function compatible with wagmi `signTypedDataAsync`. */
export type SignTypedData = (typedData: unknown) => Promise<Hex>

export type { Address, Hex }
