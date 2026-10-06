'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  type Address,
  type EIP1193Provider,
  type Hex,
  createPublicClient,
  createWalletClient,
  custom,
  encodeFunctionData,
  erc20Abi,
  http,
  isAddressEqual,
} from 'viem'
import { useConnection, useDisconnect, useSendTransaction, useSignMessage, useSignTypedData } from 'wagmi'

import {
  ATOMIC_STATUS,
  type AtomicStatus,
  CALLS_STATUS,
  EIP7702_DELEGATION_PREFIX,
  ERC7702_DELEGATOR_IMPL,
  SIGN_TYPED_DATA_DEMO,
  SUPPORTED_CHAINS_7702,
  TX_STATUS,
  type TxStatus,
} from '@/constants/erc7702'
import { REACT_QUERY_ERC7702 } from '@/constants/reactQuery'

// ============================================================================
// Types
// ============================================================================

export interface Transfer {
  to: Address
  amount: bigint
  /** ERC20 token address — omit for the native coin */
  token?: Address
}

export interface SignResult {
  signature: Hex
  isValid: boolean
}

export interface SentTx {
  hash: Hex
  status: TxStatus
}

interface TxRequest {
  to: Address
  value?: bigint
  data?: Hex
}

// ============================================================================
// Helpers (pure viem)
// ============================================================================

/** Reads the delegate address from EIP-7702 code (`0xef0100 || address`), null if not delegated */
const getDelegateAddress = (code?: Hex): Address | null => {
  if (!code || !code.toLowerCase().startsWith(EIP7702_DELEGATION_PREFIX)) return null

  return `0x${code.slice(EIP7702_DELEGATION_PREFIX.length)}` as Address
}

const toTxRequest = ({ to, amount, token }: Transfer): TxRequest =>
  token ? { to: token, data: encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [to, amount] }) } : { to, value: amount }

// ============================================================================
// Hook
// ============================================================================

/**
 * EIP-7702 smart account through the connected wallet (extension or WalletConnect).
 *
 * All data (calldata, reads, receipts, signature checks) is built with viem; wagmi is only
 * used for the connection and to hand single requests to the wallet.
 *
 * Dapps can't sign a 7702 authorization, so the upgrade is an atomic `wallet_sendCalls` (EIP-5792):
 * the wallet signs the authorization and upgrades the EOA in the same type-4 tx. MetaMask points it at
 * EIP7702StatelessDeleGatorImpl; other wallets use their own implementation.
 * Transfers are batched the same way when the wallet supports atomic calls, otherwise sent one tx at a time.
 */
export function useERC7702() {
  const { address, chain, chainId, connector, isConnected } = useConnection()
  const [txs, setTxs] = useState<SentTx[]>([])
  const [isConfirming, setIsConfirming] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)

  const sendTransactionMutation = useSendTransaction()
  const signMessageMutation = useSignMessage()
  const signTypedDataMutation = useSignTypedData()
  const disconnectMutation = useDisconnect()

  const publicClient = useMemo(() => (chain ? createPublicClient({ chain, transport: http() }) : undefined), [chain])

  const isSupportedChain = !!chainId && (SUPPORTED_CHAINS_7702 as readonly number[]).includes(chainId)

  /** viem wallet client on top of the connector's EIP-1193 provider (injected or WalletConnect) */
  const getWalletClient = async () => {
    if (!address || !chain || !connector) throw new Error('Wallet not connected')
    const provider = (await connector.getProvider()) as EIP1193Provider

    return createWalletClient({ account: address, chain, transport: custom(provider) })
  }

  const delegation = useQuery({
    queryKey: [REACT_QUERY_ERC7702.DELEGATION, chainId, address],
    queryFn: () => publicClient!.getCode({ address: address! }),
    enabled: !!address && !!publicClient,
  })
  const delegate = useMemo(() => getDelegateAddress(delegation.data), [delegation.data])
  const isUpgraded = !!delegate && isAddressEqual(delegate, ERC7702_DELEGATOR_IMPL)

  /** Wallets without EIP-5792 throw on `wallet_getCapabilities` → treated as unsupported */
  const capabilities = useQuery({
    queryKey: [REACT_QUERY_ERC7702.CAPABILITIES, chainId, address, connector?.id],
    queryFn: async (): Promise<AtomicStatus> => {
      try {
        const walletClient = await getWalletClient()
        const result = await walletClient.getCapabilities({ account: address!, chainId: chainId! })

        return result.atomic?.status ?? ATOMIC_STATUS.UNSUPPORTED
      } catch {
        return ATOMIC_STATUS.UNSUPPORTED
      }
    },
    enabled: !!address && !!chainId && !!connector,
  })
  const atomicStatus = capabilities.data
  // `ready` = plain EOA: an atomic batch would make the wallet upgrade it, so only batch once already upgraded
  const canBatch = atomicStatus === ATOMIC_STATUS.SUPPORTED

  const updateTx = (hash: Hex, status: TxStatus) => setTxs((list) => list.map((tx) => (tx.hash === hash ? { ...tx, status } : tx)))

  /** Sends the txs one after another — each one waits for its receipt before the next is requested */
  const sendSequential = async (requests: TxRequest[]) => {
    if (!publicClient) throw new Error('Wallet not connected')
    setTxs([])
    setIsConfirming(true)
    try {
      const hashes: Hex[] = []

      for (const request of requests) {
        const hash = await sendTransactionMutation.mutateAsync(request)

        hashes.push(hash)
        setTxs((list) => [...list, { hash, status: TX_STATUS.PENDING }])

        const { status } = await publicClient.waitForTransactionReceipt({ hash })

        updateTx(hash, status)
        if (status === TX_STATUS.REVERTED) throw new Error(`Transaction ${hash} reverted`)
      }

      return hashes
    } finally {
      setIsConfirming(false)
    }
  }

  /** Sends the requests as 1 atomic `wallet_sendCalls` bundle and waits until it is mined */
  const sendAtomic = async (requests: TxRequest[]) => {
    const walletClient = await getWalletClient()
    const { id } = await walletClient.sendCalls({ calls: requests, forceAtomic: true })
    const { status, receipts = [] } = await walletClient.waitForCallsStatus({ id })

    const sent = receipts.map(({ transactionHash, status: receiptStatus }) => ({ hash: transactionHash, status: receiptStatus }))

    setTxs(sent)
    if (status !== CALLS_STATUS.SUCCESS) throw new Error(`Call bundle ${id} failed`)

    return sent.map((tx) => tx.hash)
  }

  /** Re-reads the EOA code and wallet capabilities. Returns the current delegate, null for a plain EOA */
  const refreshDelegation = async () => {
    const [{ data: code }] = await Promise.all([delegation.refetch(), capabilities.refetch()])

    return getDelegateAddress(code)
  }

  /**
   * Upgrades the plain EOA to a 7702 smart account: an atomic empty self-call makes the wallet
   * sign the authorization and send it with the call. Returns the new delegate.
   */
  const upgrade = async () => {
    if (!address) throw new Error('Wallet not connected')
    if (!isSupportedChain) throw new Error('EIP-7702 is not supported on this network')
    if (delegate) throw new Error(`Account is already delegated to ${delegate}`)
    if (atomicStatus !== ATOMIC_STATUS.READY) throw new Error('This wallet cannot upgrade the account to a smart account')

    setTxs([])
    setIsUpgrading(true)
    try {
      await sendAtomic([{ to: address, value: BigInt(0) }])

      return await refreshDelegation()
    } finally {
      setIsUpgrading(false)
    }
  }

  /** Smart account → 1 batch via `wallet_sendCalls`; plain EOA → 1 tx per transfer (never upgrades on its own) */
  const sendTransfers = async (transfers: Transfer[]) => {
    const requests = transfers.map(toTxRequest)

    if (!canBatch) return sendSequential(requests)

    setIsConfirming(true)
    try {
      return await sendAtomic(requests)
    } finally {
      setIsConfirming(false)
    }
  }

  /** Signs a message and verifies it on-chain (ERC-1271 once upgraded, ecrecover otherwise) */
  const signMessage = async (message: string): Promise<SignResult> => {
    if (!address || !publicClient) throw new Error('Wallet not connected')
    const signature = await signMessageMutation.mutateAsync({ message })
    const isValid = await publicClient.verifyMessage({ address, message, signature })

    return { signature, isValid }
  }

  /** Signs the demo EIP-712 payload and verifies it on-chain */
  const signTypedData = async (contents: string): Promise<SignResult> => {
    if (!address || !publicClient || !chainId) throw new Error('Wallet not connected')
    const typedData = {
      ...SIGN_TYPED_DATA_DEMO,
      domain: { ...SIGN_TYPED_DATA_DEMO.domain, chainId },
      message: { from: address, contents },
    }
    const signature = await signTypedDataMutation.mutateAsync(typedData)
    const isValid = await publicClient.verifyTypedData({ ...typedData, address, signature })

    return { signature, isValid }
  }

  return {
    address,
    chainId,
    isConnected,
    isSupportedChain,

    // Delegation state
    delegate,
    isUpgraded,
    atomicStatus,
    canBatch,
    isCheckingDelegation: delegation.isLoading || capabilities.isLoading,
    isRefreshingDelegation: delegation.isFetching || capabilities.isFetching,
    refreshDelegation,

    // Upgrade
    upgrade,
    isUpgrading,

    // Transactions
    sendTransfers,
    isSending: sendTransactionMutation.isPending || isConfirming,
    txs,

    // Signing
    signMessage,
    signTypedData,
    isSigning: signMessageMutation.isPending || signTypedDataMutation.isPending,

    // Connection
    disconnect: () => {
      setTxs([])
      disconnectMutation.mutate()
    },
    isDisconnecting: disconnectMutation.isPending,
  }
}
