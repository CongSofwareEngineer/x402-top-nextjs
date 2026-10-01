export const KEYRING_PRO_WALLET_ID = '47bb07617af518642f3413a201ec5859faa63acb1dd175ca95085d35d38afb83'
export const KEYRING_PRO_IMAGE_ID = 'dda0f0fb-34e8-4a57-dcea-b008e7d1ff00'
export const KEYRING_PRO_HOMEPAGE_URL = 'https://keyring.app/'
export const KEYRING_PRO_DEEPLINK = 'keyring://'
export const KEYRING_PRO_APP_STORE_URL = 'https://apps.apple.com/us/app/keyring-pro-wallet-management/id1546824976'
export const KEYRING_PRO_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=co.bacoor.keyring'
export const KEYRING_PRO_IMAGE_URL = `https://ipfs.pantograph.app/ipfs/QmaoSr7ybLM2XBWVbzQg5cUxePGex4qoUfDWEybf967EYS`

export const KEYRING_PRO_WALLET = {
  id: KEYRING_PRO_WALLET_ID,
  name: 'KEYRING PRO',
  homepage: KEYRING_PRO_HOMEPAGE_URL,
  image_id: KEYRING_PRO_IMAGE_ID,
  image_url: KEYRING_PRO_IMAGE_URL,
  order: 1100,
  mobile_link: KEYRING_PRO_DEEPLINK,
  desktop_link: KEYRING_PRO_DEEPLINK,
  webapp_link: null,
  app_store: KEYRING_PRO_APP_STORE_URL,
  play_store: KEYRING_PRO_PLAY_STORE_URL,
  rdns: null,
  chrome_store: null,
  injected: null,
  badge_type: 'none',
} as const
