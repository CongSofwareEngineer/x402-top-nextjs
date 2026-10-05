/**
 * Polymarket SDK — framework-agnostic logic (no React / React Query / wagmi).
 * The demo app wraps these with React Query hooks in `hooks/polymarket`.
 *
 * Server-only code (Builder secret, `node:crypto`) lives in `./relayer` and is
 * intentionally not exported here.
 */
export * from './types'
export * from './constants'
export { PolymarketApiError } from './client'
export { listEvents, getEventBySlug, getMarketsBySlugs, getProfileByAddress, getProfileWallet } from './gamma'
export { getPortfolioValue, getPositions, getActivity, getUserStats } from './data'
export { getSupportedAssets, getDepositAddress, createWithdrawalAddress, getBridgeStatus } from './bridge'
export { getOrderBook } from './clob'
export {
  floor2,
  ceil2,
  quoteBuyUsd,
  quoteSellUsd,
  quoteSellShares,
  quoteMarketOrder,
  prepareMarketOrder,
  slippagePrice,
  yesChance,
  outcomeQuotes,
  marketLabel,
  isMarketEnded,
  parsePolymarketUrl,
} from './market'
export { resolveAccountWallet, deriveDepositWallet, deriveSafeWallet, getCashBalance, requestDeployDepositWallet } from './wallet'
export {
  createTradingSession,
  credentialsOf,
  fetchTradingApprovalsState,
  setupTradingApprovals,
  placeMarketOrder,
  listOpenOrders,
  cancelOrder,
  redeemPositions,
  transferToBridge,
  getOnboardingStep,
  ONBOARDING_STEP,
  type OnboardingStep,
  type TradingClient,
  type TradingSession,
  type TradingSessionOptions,
  type KeyValueStorage,
} from './trading'
