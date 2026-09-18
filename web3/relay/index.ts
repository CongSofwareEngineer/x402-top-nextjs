import { zeroAddress } from 'viem'
import { deriveBeaconDepositWallet } from '@polymarket/builder-relayer-client/dist/builder/derive'

import WebBase from '../baseWeb3'

import { FACTORY_BEACON_SELECTOR } from '@/config/polymarket'
import { CONTRACT_POLY_MARKET } from '@/constants/contractPolyMarket'
import { decodeAddressReturnData, deriveUupsDepositWallet, isContractRevert } from '@/utils/relay'

class RelayWeb3 extends WebBase {
  private async getDepositWalletFactoryBeacon(factory: string): Promise<string> {
    try {
      const { data } = await this.publicClient.call({
        to: factory as `0x${string}`,
        data: FACTORY_BEACON_SELECTOR,
      })

      return decodeAddressReturnData(data)
    } catch (error) {
      if (isContractRevert(error)) {
        return zeroAddress
      }
      throw error
    }
  }

  private async isContractDeployed(address: string): Promise<boolean> {
    const code = await this.publicClient.getCode({ address: address as `0x${string}` })

    return code !== undefined && code !== '0x'
  }

  public async deriveDepositWalletAddress(address: string): Promise<string> {
    const uupsAddress = deriveUupsDepositWallet(address, CONTRACT_POLY_MARKET.DepositWalletFactory, CONTRACT_POLY_MARKET.DepositWalletImplementation)

    const beacon = await this.getDepositWalletFactoryBeacon(CONTRACT_POLY_MARKET.DepositWalletFactory)

    if (beacon.toLowerCase() === zeroAddress) {
      return uupsAddress
    }
    if (await this.isContractDeployed(uupsAddress)) {
      return uupsAddress
    }

    return deriveBeaconDepositWallet(address, CONTRACT_POLY_MARKET.DepositWalletFactory, beacon)
  }
}

export default RelayWeb3
