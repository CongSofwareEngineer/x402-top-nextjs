import { zeroAddress } from 'viem'
import { deriveBeaconDepositWallet } from '@polymarket/builder-relayer-client/dist/builder/derive'

import WebBase from '../baseWeb3'

import { FACTORY_BEACON_SELECTOR } from '@/config/polymarket'
import { CONTRACT_POLY_MARKET } from '@/constants/contractPolyMarket'
import { decodeAddressReturnData, deriveSafeWallet, deriveUupsDepositWallet, isContractRevert } from '@/utils/relay'

export type PolymarketWalletType = 'DEPOSIT_WALLET' | 'SAFE'

export interface PolymarketAccountWallet {
  /** Account/funder wallet that holds pUSD and positions. */
  address: string
  type: PolymarketWalletType
  deployed: boolean
}

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

  /**
   * Resolve the Polymarket account wallet for a signer (EOA).
   *
   * Accounts created on polymarket.com before May 4, 2026 trade from a legacy
   * Gnosis Safe ("v1"); newer accounts use a Deposit Wallet. Querying the EOA
   * itself returns no positions/activity.
   *
   * Order: `preferred` (Gamma profile's `proxyWallet`) when it is one of the
   * signer's derivable wallets → deployed Deposit Wallet → deployed Safe →
   * new (undeployed) Deposit Wallet.
   */
  public async resolveAccountWallet(signer: string, preferred?: string | null): Promise<PolymarketAccountWallet> {
    const depositWallet = await this.deriveDepositWalletAddress(signer)
    const safeWallet = deriveSafeWallet(signer)
    const [depositDeployed, safeDeployed] = await Promise.all([this.isContractDeployed(depositWallet), this.isContractDeployed(safeWallet)])

    const deposit: PolymarketAccountWallet = { address: depositWallet, type: 'DEPOSIT_WALLET', deployed: depositDeployed }
    const safe: PolymarketAccountWallet = { address: safeWallet, type: 'SAFE', deployed: safeDeployed }

    const preferredLower = preferred?.toLowerCase()

    if (preferredLower === safeWallet.toLowerCase()) return safe
    if (preferredLower === depositWallet.toLowerCase()) return deposit
    if (depositDeployed) return deposit
    if (safeDeployed) return safe

    return deposit
  }
}

export default RelayWeb3
