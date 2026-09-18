import { encodeFunctionData, erc1155Abi, erc20Abi, Hex, maxUint256, prepareEncodeFunctionData } from 'viem'

import { lowerCase } from './functions'

import { DEPOSIT_WALLET_DOMAIN_NAME, DEPOSIT_WALLET_DOMAIN_VERSION, TransactionType } from '@/constants/polymarket'
import { DEPOSIT_WALLET_TYPES } from '@/constants/abi'
import { CONTRACT_POLY_MARKET } from '@/constants/contractPolyMarket'
import { DOMAIN_REF } from '@/config/app'
import { ProxyApprovalRow } from '@/services/polymarket/data/type'

// Deposit Wallet types

export interface DepositWalletCall {
  target: string
  value?: string
  data: string
}

export interface DepositWalletTransactionArgs {
  from: string
  chainId: number
  walletAddress: string
  nonce: string
  deadline: string
  calls: DepositWalletCall[]
}

export function createApproveCall(token: ProxyApprovalRow) {
  if (lowerCase(token?.standard) === 'erc20') {
    const calldata = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [token?.spender! as Hex, maxUint256],
    })

    return {
      target: token.token!,
      value: '0',
      data: calldata,
    }
  } else {
    const calldata = encodeFunctionData({
      abi: erc1155Abi,
      functionName: 'setApprovalForAll',
      args: [token?.spender! as Hex, true],
    })

    return {
      target: token.token!,
      value: '0',
      data: calldata,
    }
  }
}

export const generateSignTypeDatApproveToken = (
  chainId: number,
  walletAddress: string,
  arrToken: Array<ProxyApprovalRow> = [],
  deadline: string,
  nonce: string
) => {
  const domain = {
    name: DEPOSIT_WALLET_DOMAIN_NAME,
    version: DEPOSIT_WALLET_DOMAIN_VERSION,
    chainId,
    verifyingContract: walletAddress as Hex,
  }
  const approveCall = arrToken.map((token) => createApproveCall(token))

  return {
    domain,
    types: DEPOSIT_WALLET_TYPES,
    primaryType: 'Batch',
    message: {
      wallet: walletAddress,
      nonce: BigInt(nonce),
      deadline: BigInt(deadline),
      calls: approveCall.map((c) => ({
        target: c.target,
        value: BigInt(c.value),
        data: c.data,
      })),
    },
  }
}

export function buildDepositWalletBatchRequest(signature: string, args: DepositWalletTransactionArgs) {
  return {
    type: TransactionType.WALLET,
    from: args.from,
    to: CONTRACT_POLY_MARKET.DepositWalletFactory,
    nonce: args.nonce,
    signature,
    metadata: 'wallet action approve',
    depositWalletParams: {
      depositWallet: args.walletAddress,
      deadline: args.deadline,
      calls: args.calls.map((c) => ({
        target: c.target,
        value: c.value?.toString(),
        data: c.data,
      })),
    },
    // userRequestContext: {
    //   domain: DOMAIN_REF,
    // },
  }
}
