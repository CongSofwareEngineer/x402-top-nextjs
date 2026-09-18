/**
 * Polymarket trading constants shared across the app.
 *
 * Base URLs live in `config/polymarket.ts`; everything below is chain /
 * protocol constants and formatting rules — never hardcode these in UI code.
 */

export const POLYMOON_CHAIN_ID = 137

/** CTF v2 exchange contracts (EIP-712 verifyingContract). */
export const EXCHANGE_ADDRESS = {
  STANDARD: '0xE111180000d2663C0091e4f400237545B87B996B',
  NEG_RISK: '0xe2222d279d744050d28e00520010520000310F59',
} as const

/** Collateral token used for all Polymarket trading (pUSD on Polygon). */
export const PUSD_ADDRESS = '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB'

/** Native Circle USDC on Base — used for deposits from Base. */
export const USDC_BASE_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

export const TOKEN_DECIMALS = 6
export const SHARE_DECIMALS = 6

export const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000'

export const SIGNATURE_TYPE = {
  EOA: 0,
  POLY_PROXY: 1,
  POLY_GNOSIS_SAFE: 2,
  DEPOSIT_WALLET: 3,
} as const

export const ORDER_SIDE = {
  BUY: 'BUY',
  SELL: 'SELL',
} as const

export const ORDER_TYPE = {
  GTC: 'GTC',
  GTD: 'GTD',
  FAK: 'FAK',
  FOK: 'FOK',
} as const

export const ORDER_STATUS = {
  LIVE: 'LIVE',
  MATCHED: 'MATCHED',
  CANCELED: 'CANCELED',
  CANCELED_MARKET_RESOLVED: 'CANCELED_MARKET_RESOLVED',
  INVALID: 'INVALID',
} as const

export const DATA_ACTIVITY_TYPES = ['TRADE', 'SPLIT', 'MERGE', 'REDEEM', 'REWARD', 'CONVERSION'] as const

/** EIP-712 domain used for the CLOB L1 ownership attestation. */
export const CLOB_AUTH_DOMAIN = {
  name: 'ClobAuthDomain',
  version: '1',
  chainId: POLYMOON_CHAIN_ID,
}

export const CLOB_AUTH_TYPES = {
  ClobAuth: [
    { name: 'address', type: 'address' },
    { name: 'timestamp', type: 'string' },
    { name: 'nonce', type: 'uint256' },
    { name: 'message', type: 'string' },
  ],
} as const

export const CLOB_AUTH_MESSAGE = 'This message attests that I control the given wallet'

/** CTF exchange `Order` EIP-712 type for proxy/safe/EOA signers. */
export const EXCHANGE_ORDER_TYPES = {
  Order: [
    { name: 'salt', type: 'uint256' },
    { name: 'maker', type: 'address' },
    { name: 'signer', type: 'address' },
    { name: 'tokenId', type: 'uint256' },
    { name: 'makerAmount', type: 'uint256' },
    { name: 'takerAmount', type: 'uint256' },
    { name: 'side', type: 'uint8' },
    { name: 'signatureType', type: 'uint8' },
    { name: 'timestamp', type: 'uint256' },
    { name: 'metadata', type: 'bytes32' },
    { name: 'builder', type: 'bytes32' },
  ],
} as const

export const EXCHANGE_DOMAIN_NAME = 'Polymarket CTF Exchange'
export const EXCHANGE_DOMAIN_VERSION = '2'

/** Default filter set for the markets browser. */
export const DEFAULT_MARKET_FILTERS = {
  closed: false,
  limit: 24,
  sort: 'volume',
  ascending: false,
} as const

export const SPORTS_MARKET_TYPES = ['moneyline', 'spreads', 'totals'] as const

/**
 * Curated homepage categories (mirrors polymarket.com nav).
 * `id` = Gamma top-level tag id, verified via `/events?tag_slug=<slug>`.
 */
export const POLYMARKET_CATEGORIES = [
  { id: '1', label: 'Sports' },
  { id: '2', label: 'Politics' },
  { id: '21', label: 'Crypto' },
  { id: '84', label: 'Weather' },
  { id: '74', label: 'Science' },
  { id: '225', label: 'Economics' },
  { id: '120', label: 'Finance' },
  { id: '144', label: 'Elections' },
  { id: '100265', label: 'Geopolitics' },
  { id: '64', label: 'Esports' },
  { id: '18', label: 'Awards' },
  { id: '404', label: 'Energy' },
  { id: '1401', label: 'Tech' },
  { id: '315', label: 'Entertainment' },
] as const

export type MarketSortKey = 'trending' | 'new' | 'volume' | 'liquidity' | 'endingSoon' | 'competitive'

/**
 * Gallery sort presets matching Polymarket homepage views.
 * `order`/`ascending` are passed straight to Gamma `/markets/keyset`
 * (verified live: `volume24hr`, `startDate`, `competitive`, `endDate` ascending).
 */
export const MARKET_SORT_PRESETS: { key: MarketSortKey; label: string; order: string; ascending: boolean }[] = [
  { key: 'trending', label: 'Trending', order: 'volume24hr', ascending: false },
  { key: 'new', label: 'New', order: 'startDate', ascending: false },
  { key: 'volume', label: 'Volume', order: 'volume', ascending: false },
  { key: 'liquidity', label: 'Liquidity', order: 'liquidity', ascending: false },
  { key: 'endingSoon', label: 'Ending Soon', order: 'endDate', ascending: true },
  { key: 'competitive', label: 'Competitive', order: 'competitive', ascending: false },
]

export const STORAGE_KEYS = {
  CLOB_CREDENTIALS: 'polymarket_clob_credentials',
  MARKET_FILTERS: 'polymarket_market_filters',
} as const

/** Explorer links. */
export const EXPLORERS = {
  BASE: 'https://basescan.org',
  POLYGON: 'https://polygonscan.com',
} as const

/** Bridge destination chain ids used by the withdraw flow. */
export const BRIDGE_DESTINATION_CHAINS = {
  ETHEREUM: '1',
  BASE: '8453',
  POLYGON: '137',
  ARBITRUM: '42161',
  OPTIMISM: '10',
} as const

export const PAGINATION = {
  MARKETS_PAGE_SIZE: 24,
  ACTIVITY_PAGE_SIZE: 50,
  POSITIONS_PAGE_SIZE: 100,
  MAX_LIMIT: 1000,
} as const

export const GET_NONCE = '/nonce'
export const GET_RELAY_PAYLOAD = '/relay-payload'
export const GET_TRANSACTION = '/transaction'
export const GET_TRANSACTIONS = '/transactions'
export const SUBMIT_TRANSACTION = '/submit'
export const GET_DEPLOYED = '/deployed'

export enum TransactionType {
  SAFE = 'SAFE',
  PROXY = 'PROXY',
  SAFE_CREATE = 'SAFE-CREATE',
  WALLET = 'WALLET',
  WALLET_CREATE = 'WALLET-CREATE',
}

export const SAFE_INIT_CODE_HASH = '0x2bce2127ff07fb632d16c8347c4ebf501f4841168bed00d9e6ef715ddb6fcecf'

export const PROXY_INIT_CODE_HASH = '0xd21df8dc65880a8606f09fe0ce3df9b8869287ab0b058be05aa9e8af6330a00b'

export const SAFE_FACTORY_NAME = 'Polymarket Contract Proxy Factory'

export const DEPOSIT_WALLET_DOMAIN_NAME = 'DepositWallet'
export const DEPOSIT_WALLET_DOMAIN_VERSION = '1'
