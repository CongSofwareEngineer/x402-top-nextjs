/**
 * Polymarket protocol constants — API hosts, contracts, chain parameters.
 *
 * This folder (`services/polymarket`) is framework-agnostic: no React, no
 * React Query, no `@/` imports. It only depends on `viem` and
 * `@polymarket/client`, so it can be copied into a standalone SDK package.
 */

export enum API_POLYMARKET {
  /** Bridge API — deposit/withdraw addresses, supported assets, status. */
  BRIDGE = 'https://bridge.polymarket.com',
  /** Relayer API — gasless wallet operations. */
  RELAYER = 'https://relayer-v2.polymarket.com',
  /** Gamma API — market/event discovery, public profiles. */
  GAMMA = 'https://gamma-api.polymarket.com',
  /** CLOB API — order books. */
  CLOB = 'https://clob.polymarket.com',
  /** Data API v2 — wallet portfolios, positions, activity. */
  DATA = 'https://data-api.polymarket.com',
}

/** Public builder attribution code (sent as `X-Builder-Code`). Builder API secrets stay in server env. */
export const BUILDER_CODE = '0xdf09a57d8a75afa56ff0e919432d5dcde3500a7364bc0626333704b506d57ee9'

export const POLYGON_CHAIN_ID = 137

/** Collateral token used for all Polymarket trading (pUSD on Polygon). */
export const PUSD_ADDRESS = '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB'

export const TOKEN_DECIMALS = 6

/** Smallest USDC amount the CLOB accepts for a market BUY. */
export const MIN_MARKET_ORDER_USD = 1

/** Max price move a market order tolerates beyond the quoted worst level (5%). */
export const MARKET_ORDER_SLIPPAGE = 0.05

export const ORDER_SIDE = {
  BUY: 'BUY',
  SELL: 'SELL',
} as const

export const CONTRACTS = {
  DepositWalletFactory: '0x00000000000Fb5C9ADea0298D729A0CB3823Cc07',
  DepositWalletImplementation: '0x58CA52ebe0DadfdF531Cde7062e76746de4Db1eB',
  SafeFactory: '0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b',
  ConditionalTokens: '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045',
  /** The CLOB checks pUSD allowance + CTF operator approval for it on neg-risk orders. */
  NegRiskAdapter: '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296',
} as const

/** CLOB `/balance-allowance` asset types (SDK `AssetType`). */
export const CLOB_ASSET_TYPE = {
  COLLATERAL: 'COLLATERAL',
  CONDITIONAL: 'CONDITIONAL',
} as const

/** `beacon()` selector on the Deposit Wallet factory. */
export const FACTORY_BEACON_SELECTOR = '0x49493a4d'

export const SAFE_INIT_CODE_HASH = '0x2bce2127ff07fb632d16c8347c4ebf501f4841168bed00d9e6ef715ddb6fcecf'

/** Solady LibClone ERC1967 / ERC1967-beacon init code fragments (Deposit Wallet address derivation). */
export const ERC1967 = {
  PREFIX: BigInt('0x61003d3d8160233d3973'),
  CONST1: '0xcc3735a920a3ca505d382bbc545af43d6000803e6038573d6000fd5b3d6000f3',
  CONST2: '0x5155f3363d3d373d3d363d7f360894a13ba1a3210667c828492db98dca3e2076',
  BEACON_PREFIX: BigInt('0x6100523d8160233d3973'),
  BEACON_CONST1: '0xb3582b35133d50545afa5036515af43d6000803e604d573d6000fd5b3d6000f3',
  BEACON_CONST2: '0x1b60e01b36527fa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6c',
  BEACON_CONST3: '0x60195155f3363d3d373d3d363d602036600436635c60da',
} as const

/** Placeholder the Bridge API uses for native tokens. */
export const NATIVE_TOKEN_PLACEHOLDER = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'

/** Bridge chain ids (as returned by `/supported-assets`) that are not EVM. */
export const BRIDGE_NON_EVM_CHAINS = {
  SOLANA: '1151111081099710',
  BITCOIN: '8253038',
  TRON: '728126428',
  LIGHTNING: '29780',
} as const

/**
 * Which `bridge.address` key receives deposits for a chain. Every chain not
 * listed is EVM. Lightning needs an invoice, so it has no deposit address.
 */
export const BRIDGE_ADDRESS_TYPE_BY_CHAIN: Record<string, 'evm' | 'svm' | 'btc' | 'tron' | null> = {
  [BRIDGE_NON_EVM_CHAINS.SOLANA]: 'svm',
  [BRIDGE_NON_EVM_CHAINS.BITCOIN]: 'btc',
  [BRIDGE_NON_EVM_CHAINS.TRON]: 'tron',
  [BRIDGE_NON_EVM_CHAINS.LIGHTNING]: null,
}

export const RELAYER_SUBMIT_PATH = '/submit'

export const STORAGE_KEY_CLOB_CREDENTIALS = 'polymarket_clob_credentials'
