import { createPublicClient, http } from 'viem'

import { CHAIN_SUPPORT } from '@/config/appkit'

class WebBase {
  readonly publicClient
  constructor(chainId: string | number | undefined) {
    const chain = CHAIN_SUPPORT.find((chain) => chain.id === chainId)

    this.publicClient = createPublicClient({
      chain,
      transport: http(chain?.rpcUrls.default.http[0]),
    })
  }
}

export default WebBase
