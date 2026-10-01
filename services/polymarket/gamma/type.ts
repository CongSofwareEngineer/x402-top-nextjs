import type { GammaCategory, GammaEvent, GammaTag } from '../types'

/** Raw market row from Gamma API — mixed string/number fields. */
export interface GammaMarketRow {
  id: string
  slug?: string | null
  question?: string | null
  description?: string | null
  conditionId?: string | null
  clobTokenIds?: string | null
  outcomes?: string | null
  outcomePrices?: string | null
  volume?: string | null
  volumeNum?: number | null
  liquidity?: string | null
  liquidityNum?: number | null
  volume24hr?: string | null
  active?: boolean | null
  closed?: boolean | null
  image?: string | null
  icon?: string | null
  startDate?: string | null
  endDate?: string | null
  lastTradePrice?: string | null
  oneDayPriceChange?: string | null
  orderPriceMinTickSize?: string | null
  orderMinSize?: string | null
  tags?: GammaTag[] | null
  categories?: GammaCategory[] | null
  events?: GammaEvent[] | null
  negRisk?: boolean | null
  groupItemTitle?: string | null
  groupItemThreshold?: string | null
  bestBid?: number | string | null
  bestAsk?: number | string | null
  acceptingOrders?: boolean | null
}

/** Raw event row from Gamma `/events`, `/events/keyset`. */
export interface GammaEventRow {
  id: string
  slug?: string | null
  title?: string | null
  image?: string | null
  icon?: string | null
  volume?: number | string | null
  volume24hr?: number | string | null
  liquidity?: number | string | null
  startDate?: string | null
  endDate?: string | null
  negRisk?: boolean | null
  markets?: GammaMarketRow[] | null
}
