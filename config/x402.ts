import { Address } from 'viem'

import { CHAIN_APP } from './appkit'

export const NETWORK = `eip155:${CHAIN_APP.id}` // Base
export const PAY_TO = '0xb1f64fc8689a17014Cf0748e8EeaD58C5457Ec74' as Address
export const DOMAIN = process.env.NEXT_PUBLIC_SITE_URL as string

export const X402_PAID_API_URL = `${DOMAIN}/api/report`

export const PRICES_USD = {
  report: '0.001',
  'send-token': '0.001',
} as const

export const DESCRIPTIONS = {
  report: 'premium agent insight analysis',
  'send-token': 'asset dispatch for autonomous agents',
} as const satisfies Record<keyof typeof PRICES_USD, string>
