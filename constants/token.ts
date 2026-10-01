export const ADDRESS_NULL_OTHER = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'

/** Native Circle USDC per EVM chain id — the stablecoin shown as "wallet balance" on the connected chain. */
export const USDC_BY_CHAIN: Record<number, { address: `0x${string}`; decimals: number; symbol: string }> = {
  1: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, symbol: 'USDC' },
  10: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6, symbol: 'USDC' },
  56: { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18, symbol: 'USDC' },
  137: { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6, symbol: 'USDC' },
  8453: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, symbol: 'USDC' },
  42161: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6, symbol: 'USDC' },
  84532: { address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', decimals: 6, symbol: 'USDC' },
}
