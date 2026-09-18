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
}
