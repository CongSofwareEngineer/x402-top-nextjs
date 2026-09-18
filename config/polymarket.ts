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

export const KEY_POLY_MARKET = {
  Builder: {
    Name: 'cong-8d6e',
    Address: 'Address',
    Code: '0x79c84ef72719578065fef7b0cfd9f467a920d2824db3eed74ac3c8303ba49e0f',
    ApiKey: '01a0a886-df79-7126-9d9b-95cb2db05312',
    Secret: '2IoHpGLBa_APfmij0NEQsYKjckm0wF7jxhVJdArjTWc=',
    Passphrase: '4288e5d343ec7408a2e40850eb0f26b1219ba8b8fb09a68ac2dc3abf512b2a19',
  },
  Relay: {
    ApiKey: '01a0a88a-c453-7f0f-8270-3252e40b4f05',
    Address: '0x91f9f4b03748ba9e2900bdb20dfd0f05eeaf8d6e',
  },
}

export const FACTORY_BEACON_SELECTOR = '0x49493a4d'

// export const KEY_POLY_MARKET = {
//   Builder: {
//     Name: 'cong-8d6e',
//     Address: '0xa8405cf4fb501f20ecdf7b8f599a741d366c878a',
//     Code: '0xbf5e59b27b7bc70cee72483fe79688f0b26dfd23c6462a371f7bf8ebf25d961a',
//     ApiKey: '01a0b3d4-f857-71ad-8099-683eadfbbf23',
//     Secret: 'A0IVUUQt02-a9yMeCxP6OxhpHPFOdxcShnmb-0O728g=',
//     Passphrase: '80197b6846f14d4e81930b689ab48cbce67b800a56d34c202720a47f86f993a4',
//   },
//   Relay: {
//     ApiKey: '01a0b3d5-dea9-73d2-9ad3-74b51cd8af60',
//     Address: '0x1a72284f6a803ae3bbdc8b2322f566f39e9b3def',
//   },
// }
