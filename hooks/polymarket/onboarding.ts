'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppKitAccount } from '@reown/appkit/react'
import { useSignMessage, useWalletClient } from 'wagmi'
import { SiweMessage } from 'siwe'

import { usePolyMarketAccountWallet, usePolyMarketIsDeploy, usePolyMarketWalletAddress } from './account'
import { useDeployDepositWallet } from './deploy'
import { loadCredentials, loadLoginFlag, saveCredentials, saveLoginFlag, useEnsurePolygon } from './session'

import { REACT_QUERY_POLY_MARKET } from '@/constants/reactQuery'
import { type ClobCredentials } from '@/services/polymarket'
import { getChallenge, login } from '@/services/polymarket/gamma'
import { connectSecureClient, fetchTradingApprovalsState, toClobCredentials, type PolymarketSecureClient } from '@/services/polymarket/secure'

export const ONBOARDING_STEP = {
  LOGIN: 'login',
  DEPLOY: 'deploy',
  ENABLE_TRADING: 'enable_trading',
  APPROVE: 'approve',
  DONE: 'done',
} as const

export type OnboardingStep = (typeof ONBOARDING_STEP)[keyof typeof ONBOARDING_STEP]

/** On-chain trading approval state of the account wallet (Safe or Deposit Wallet). */
export function usePolyMarketTradingApprovals() {
  const { data: wallet } = usePolyMarketWalletAddress()
  const { data: isDeploy } = usePolyMarketIsDeploy()

  return useQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.TRADING_APPROVALS, wallet?.toLowerCase()],
    queryFn: () => fetchTradingApprovalsState(wallet!),
    enabled: !!wallet && !!isDeploy,
    staleTime: 60_000,
  })
}

/**
 * Account onboarding. New accounts get a Deposit Wallet; legacy (v1) accounts
 * keep their existing Safe, so step 2 is already done for them:
 *
 * 1. Login          — SIWE sign-in with Polymarket (Gamma).          1 signMessage
 * 2. Deploy         — WALLET-CREATE via relayer (gasless, server).    no signature
 * 3. Enable trading — ClobAuth → CLOB L2 API credentials.            1 signTypedData
 * 4. Approve all    — pUSD + CTF approvals as one gasless batch.     1 signTypedData
 *
 * Each step is idempotent and its status is derived from chain/API state
 * (or cached credentials), so a reload resumes at the first unfinished step.
 */
export function usePolymarketOnboarding() {
  const { address, isConnected } = useAppKitAccount()
  const { data: walletClient } = useWalletClient()
  const { signMessageAsync } = useSignMessage()
  const queryClient = useQueryClient()
  const ensurePolygon = useEnsurePolygon()

  const walletQuery = usePolyMarketWalletAddress()
  const { data: accountWallet } = usePolyMarketAccountWallet()
  const isDeployQuery = usePolyMarketIsDeploy()
  const approvalsQuery = usePolyMarketTradingApprovals()
  const deployMutation = useDeployDepositWallet()

  const wallet = walletQuery.data
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [credentials, setCredentials] = useState<ClobCredentials | null>(null)
  const secureClientRef = useRef<{ key: string; client: PolymarketSecureClient } | null>(null)

  useEffect(() => {
    setIsLoggedIn(isConnected && loadLoginFlag(address))
    setCredentials(isConnected ? loadCredentials(address) : null)
    secureClientRef.current = null
  }, [address, isConnected])

  /** Reuse one SecureClient per signer+wallet; cached creds avoid re-signing. */
  const getSecureClient = useCallback(
    async (creds: ClobCredentials | null): Promise<PolymarketSecureClient> => {
      if (!address || !walletClient) throw new Error('Wallet not connected')
      if (!wallet) throw new Error('Polymarket wallet not resolved yet')

      const key = `${address}:${wallet}`.toLowerCase()

      if (secureClientRef.current?.key === key) return secureClientRef.current.client

      await ensurePolygon()
      const client = await connectSecureClient({ walletClient, wallet: wallet, credentials: creds })
      const fresh = toClobCredentials(client)

      // Credentials may be re-derived if the cached ones were revoked.
      saveCredentials(address, fresh)
      setCredentials(fresh)
      secureClientRef.current = { key, client }

      return client
    },
    [address, walletClient, wallet, ensurePolygon]
  )

  const loginMutation = useMutation({
    mutationFn: async () => {
      if (!address) throw new Error('Wallet not connected')

      const challenge = await getChallenge(address)
      const siweMessage = new SiweMessage(challenge.fields)
      const signature = await signMessageAsync({ message: siweMessage.prepareMessage() })

      await login(signature, siweMessage)
      saveLoginFlag(address)
      setIsLoggedIn(true)
    },
  })

  const enableTradingMutation = useMutation({
    mutationFn: async () => {
      secureClientRef.current = null
      await getSecureClient(null)
    },
  })

  const approveAllMutation = useMutation({
    mutationFn: async () => {
      const client = await getSecureClient(credentials)

      // Checks on-chain state and submits only missing approvals; waits for confirmation.
      await client.setupTradingApprovals()
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [REACT_QUERY_POLY_MARKET.TRADING_APPROVALS] })
    },
  })

  const isDeployed = !!isDeployQuery.data
  const isTradingEnabled = !!credentials
  const isApproved = !!approvalsQuery.data?.isFullyApproved

  let currentStep: OnboardingStep = ONBOARDING_STEP.DONE

  if (!isLoggedIn) currentStep = ONBOARDING_STEP.LOGIN
  else if (!isDeployed) currentStep = ONBOARDING_STEP.DEPLOY
  else if (!isTradingEnabled) currentStep = ONBOARDING_STEP.ENABLE_TRADING
  else if (!isApproved) currentStep = ONBOARDING_STEP.APPROVE

  return {
    address,
    wallet,
    walletType: accountWallet?.type,
    currentStep,
    isLoading: walletQuery.isLoading || isDeployQuery.isLoading || (isDeployed && approvalsQuery.isLoading),
    status: { isLoggedIn, isDeployed, isTradingEnabled, isApproved },
    missingApprovals: approvalsQuery.data?.missing,
    steps: {
      login: { run: () => loginMutation.mutate(), isPending: loginMutation.isPending, error: loginMutation.error },
      deploy: {
        run: () => address && deployMutation.mutate({ address }),
        isPending: deployMutation.isPending,
        error: deployMutation.error,
      },
      enableTrading: {
        run: () => enableTradingMutation.mutate(),
        isPending: enableTradingMutation.isPending,
        error: enableTradingMutation.error,
      },
      approveAll: { run: () => approveAllMutation.mutate(), isPending: approveAllMutation.isPending, error: approveAllMutation.error },
    },
  }
}
