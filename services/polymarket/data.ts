import type { Address } from 'viem'

import { baseUrl, requestJson, toNumber } from './client'
import { type ActivityItem, type PaginationEnvelope, type PortfolioValue, type Position, type UserStats } from './types'

/**
 * Data API v2 — read-only wallet & activity feeds.
 * Base URL: https://data-api.polymarket.com/v2
 */
const v2 = (path: string) => `/v2${path}`

/** `GET /v2/value` — portfolio value in USDC. */
export async function getPortfolioValue(user: string): Promise<PortfolioValue | null> {
  const data = await requestJson<PaginationEnvelope<PortfolioValue | null>>(baseUrl('DATA'), v2(`/value?user=${encodeURIComponent(user)}`))

  return data.data ?? null
}

interface PositionRow {
  proxy_wallet?: string
  token_id?: string
  condition_id?: string
  title?: string
  slug?: string
  icon?: string
  event_id?: string
  event_slug?: string
  outcome?: string
  outcome_index?: number
  current_size?: number
  avg_price?: number
  entry_cost_usdc?: number
  current_price?: number
  current_value?: number
  total_size?: number
  realized_pnl?: number
  unrealized_pnl?: number
  total_pnl?: number
  percent_pnl?: number
  status?: string
  negative_risk?: boolean
  end_date?: string
  last_event_at?: number
}

function mapPosition(row: PositionRow): Position {
  return {
    proxyWallet: row.proxy_wallet as Address,
    tokenId: row.token_id!,
    conditionId: row.condition_id!,
    title: row.title,
    slug: row.slug,
    icon: row.icon,
    eventId: row.event_id,
    eventSlug: row.event_slug,
    outcome: row.outcome,
    outcomeIndex: row.outcome_index,
    currentSize: toNumber(row.current_size),
    avgPrice: toNumber(row.avg_price),
    entryCostUsdc: toNumber(row.entry_cost_usdc),
    currentPrice: toNumber(row.current_price),
    currentValue: toNumber(row.current_value),
    totalSize: toNumber(row.total_size),
    realizedPnl: toNumber(row.realized_pnl),
    unrealizedPnl: toNumber(row.unrealized_pnl),
    totalPnl: toNumber(row.total_pnl),
    percentPnl: toNumber(row.percent_pnl),
    status: row.status,
    negativeRisk: row.negative_risk,
    endDate: row.end_date,
    lastEventAt: row.last_event_at,
  }
}

/**
 * `GET /v2/positions` — positions for a wallet.
 * `status` is one of `OPEN` (default), `REDEEMABLE`, `CLOSED`.
 */
export async function getPositions(user: string, status: 'OPEN' | 'REDEEMABLE' | 'CLOSED' = 'OPEN', limit = 100): Promise<Position[]> {
  const data = await requestJson<PaginationEnvelope<PositionRow[] | null>>(
    baseUrl('DATA'),
    v2(encodeURI(`/positions?user=${user}&status=${status}&limit=${limit}`))
  )

  return (data.data ?? []).map(mapPosition)
}

interface ActivityRow {
  proxy_wallet?: string
  timestamp?: number
  type?: string
  size?: number
  usdc_size?: number
  transaction_hash?: string
  price?: number
  token_id?: string
  side?: 'BUY' | 'SELL'
  outcome_index?: number
  title?: string
  slug?: string
  icon?: string
  event_slug?: string
  outcome?: string
  is_combo?: boolean
}

function mapActivity(row: ActivityRow): ActivityItem {
  return {
    proxyWallet: row.proxy_wallet as Address,
    timestamp: toNumber(row.timestamp),
    type: row.type ?? 'TRADE',
    size: toNumber(row.size),
    usdcSize: toNumber(row.usdc_size),
    transactionHash: row.transaction_hash,
    price: toNumber(row.price),
    tokenId: row.token_id,
    side: row.side,
    outcomeIndex: row.outcome_index,
    title: row.title,
    slug: row.slug,
    icon: row.icon,
    eventSlug: row.event_slug,
    outcome: row.outcome,
    isCombo: row.is_combo,
  }
}

/**
 * `GET /v2/activity` — account activity feed (trades, splits, redeems, …).
 * Returns the most recent `limit` items plus the next cursor if present.
 */
export async function getActivity(user: string, limit = 50, cursor?: string): Promise<{ items: ActivityItem[]; nextCursor: string | null }> {
  const query = new URLSearchParams({ user, limit: String(limit) })

  if (cursor) query.set('cursor', cursor)

  const data = await requestJson<PaginationEnvelope<ActivityRow[] | null>>(baseUrl('DATA'), v2(`/activity?${query.toString()}`))

  return {
    items: (data.data ?? []).map(mapActivity),
    nextCursor: data.pagination?.next_cursor ?? null,
  }
}

/** `GET /v2/user-stats` — profile stats for a wallet. */
export async function getUserStats(user: string): Promise<UserStats | null> {
  const data = await requestJson<PaginationEnvelope<UserStats | null>>(baseUrl('DATA'), v2(`/user-stats?user=${encodeURIComponent(user)}`))

  if (!data.data) return null

  return {
    proxyWallet: data.data.proxyWallet,
    trades: toNumber(data.data.trades),
    biggestWin: toNumber(data.data.biggestWin),
    views: toNumber(data.data.views),
    joinDate: data.data.joinDate,
    allTimePnl: data.data.allTimePnl ?? null,
  }
}
