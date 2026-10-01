/**
 * Polymarket demo UI constants. Protocol constants (API hosts, contracts,
 * decimals…) live in the SDK: `services/polymarket/constants.ts`.
 */

/** App routes backing the SDK's server-side steps (Builder secret stays on the server). */
export const POLYMARKET_ROUTES = {
  BUILDER_SIGN: '/api/polymarket/builder-sign',
  DEPLOY: '/api/polymarket/deploy',
} as const

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
 * `order`/`ascending` are passed straight to Gamma `/events/keyset`.
 */
export const MARKET_SORT_PRESETS: { key: MarketSortKey; label: string; order: string; ascending: boolean }[] = [
  { key: 'trending', label: 'Trending', order: 'volume24hr', ascending: false },
  { key: 'new', label: 'New', order: 'startDate', ascending: false },
  { key: 'volume', label: 'Volume', order: 'volume', ascending: false },
  { key: 'liquidity', label: 'Liquidity', order: 'liquidity', ascending: false },
  { key: 'endingSoon', label: 'Ending Soon', order: 'endDate', ascending: true },
  { key: 'competitive', label: 'Competitive', order: 'competitive', ascending: false },
]

export const MARKETS_PAGE_SIZE = 24

/** Explorer links. */
export const EXPLORERS = {
  BASE: 'https://basescan.org',
  POLYGON: 'https://polygonscan.com',
} as const

/** Address explorer URL prefix per bridge chain id (`${prefix}/${address}`). */
export const BRIDGE_CHAIN_EXPLORERS: Record<string, string> = {
  '1': 'https://etherscan.io/address',
  '10': 'https://optimistic.etherscan.io/address',
  '56': 'https://bscscan.com/address',
  '137': `${EXPLORERS.POLYGON}/address`,
  '8453': `${EXPLORERS.BASE}/address`,
  '42161': 'https://arbiscan.io/address',
  '143': 'https://monadscan.com/address',
  '999': 'https://hyperevmscan.io/address',
  '57073': 'https://explorer.inkonchain.com/address',
  '1151111081099710': 'https://solscan.io/account',
  '8253038': 'https://mempool.space/address',
  '728126428': 'https://tronscan.org/#/address',
}
