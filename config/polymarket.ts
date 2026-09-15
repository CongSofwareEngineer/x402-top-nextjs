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
