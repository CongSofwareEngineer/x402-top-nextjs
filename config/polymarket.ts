export enum API_POLYMARKET {
  /** Bridge API — deposit/withdraw addresses, quotes, status. */
  BRIDGE = 'https://bridge.polymarket.com',
  /** Relayer API — gasless wallet operations. */
  RELAYER = 'https://relayer-v2.polymarket.com',
  /** Combos RFQ API. */
  COMBOS = 'https://combos-rfq-api.polymarket.com/v1',
  /** Gamma API — market/event discovery. */
  GAMA = 'https://gamma-api.polymarket.com',
  /** CLOB API — live market state + order placement. */
  CLOB = 'https://clob.polymarket.com',
  /** Data API v2 — wallet portfolios, activity, trades. */
  DATA = 'https://data-api.polymarket.com',
}

/**
 * Public builder identifiers only. Builder API key / secret / passphrase live in
 * server env (POLYMARKET_BUILDER_*) and are used by `/api/polymarket/*` routes.
 */
export const KEY_POLY_MARKET = {
  Builder: {
    Name: 'cong-8BF7Fb',
    Address: '0x4c259feb4e1e20a4214c8d629888bc2ec1dc191e',
    Code: '0xdf09a57d8a75afa56ff0e919432d5dcde3500a7364bc0626333704b506d57ee9',
  },
  Relay: {
    ApiKey: '01a0f55c-7076-7552-bd36-70785c190dd4',
    Address: '0x0613b45D2799BD00fcf8D1fF8A8BDBc6df8BF7Fb',
  },
}

export const FACTORY_BEACON_SELECTOR = '0x49493a4d'
