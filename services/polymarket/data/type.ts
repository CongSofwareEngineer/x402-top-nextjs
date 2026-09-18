/** Raw position row from Data API v2 — snake_case fields. */
export interface PositionRow {
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

/** Raw activity row from Data API v2 — snake_case fields. */
export interface ActivityRow {
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

/** Raw contract approval row from `GET /v2/approvals`. */
export interface ProxyApprovalRow {
  id?: string
  feature?: string
  token?: string
  spender?: string
  standard?: string
  amount?: string
  approved?: boolean
}

/** Raw response envelope from `GET /v2/approvals`. */
export interface ProxyApprovalsEnvelope {
  data: {
    address?: string
    chain_id?: number
    checked_at?: string
    contracts?: ProxyApprovalRow[]
  }
}
