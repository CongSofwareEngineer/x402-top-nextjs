import { polygon } from 'viem/chains'

import { ABI_CLOB_AUTH_DOMAIN } from '@/constants/abi'

export const getClobAuthTypedData = (address: string, nonce: string) => {
  const timestamp = Math.floor(Date.now() / 1000)
  const domain = {
    name: 'ClobAuthDomain',
    version: '1',
    chainId: polygon.id,
  }

  return {
    domain,
    types: ABI_CLOB_AUTH_DOMAIN,
    primaryType: 'ClobAuth',
    message: {
      address,
      timestamp: timestamp.toString(),
      nonce: nonce,
      message: 'This message attests that I control the given wallet',
    },
  }
}
