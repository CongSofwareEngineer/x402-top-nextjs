'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppKitAccount } from '@reown/appkit/react'
import { useWalletClient } from 'wagmi'

import { usePolyMarketAccountWallet } from './account'
import { usePolymarketCredentials, usePolymarketTradingClient } from './session'

import { ONBOARDING_TRACKING, POLYMARKET_ROUTES } from '@/constants/polymarket'
import { REACT_QUERY_POLY_MARKET } from '@/constants/reactQuery'
import {
  fetchTradingApprovalsState,
  getOnboardingStep,
  ONBOARDING_STEP,
  requestDeployDepositWallet,
  resolveAccountWallet,
  setupTradingApprovals,
  type OnboardingStep,
} from '@/services/polymarket'
import { sleep } from '@/utils/functions'

/** Re-reads `read` until `isConfirmed` holds, throwing after `ONBOARDING_TRACKING.MAX_ATTEMPTS` reads. */
async function trackUntil<T>(read: () => Promise<T>, isConfirmed: (value: T) => boolean, errorMessage: string): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const value = await read()

    if (isConfirmed(value)) return value
    if (attempt >= ONBOARDING_TRACKING.MAX_ATTEMPTS) throw new Error(errorMessage)
    await sleep(ONBOARDING_TRACKING.INTERVAL_MS)
  }
}

/** On-chain trading approval state of the account wallet. */
export function usePolyMarketTradingApprovals() {
  const { data: accountWallet } = usePolyMarketAccountWallet()
  const wallet = accountWallet?.address

  return useQuery({
    queryKey: [REACT_QUERY_POLY_MARKET.TRADING_APPROVALS, wallet?.toLowerCase()],
    queryFn: () => fetchTradingApprovalsState(wallet!),
    enabled: !!wallet && !!accountWallet?.deployed,
    staleTime: 60_000,
  })
}

/**
 * Account setup (see `getOnboardingStep`) as one "Create wallet" action:
 * Deploy → Enable trading (login) → Approve (incl. auto-redeem). Each step's
 * result is tracked on-chain until confirmed (then cached) before the next one
 * starts. Steps already done are skipped, so a retry resumes where it failed.
 */
export function usePolymarketOnboarding() {
  const { address } = useAppKitAccount()
  const queryClient = useQueryClient()
  const getClient = usePolymarketTradingClient()
  const { data: walletClient } = useWalletClient()
  const { data: accountWallet, isLoading: walletLoading } = usePolyMarketAccountWallet()
  const { data: credentials } = usePolymarketCredentials()
  const approvals = usePolyMarketTradingApprovals()
  // Step being run by `createWallet`, for progress labels.
  const [runningStep, setRunningStep] = useState<OnboardingStep | null>(null)

  const status = {
    isDeployed: !!accountWallet?.deployed,
    isTradingEnabled: !!credentials,
    isApproved: !!approvals.data?.isFullyApproved,
  }

  const createWallet = useMutation({
    mutationFn: async () => {
      if (!address || !walletClient || !accountWallet?.address) throw new Error('Wallet not connected')

      let wallet = accountWallet

      if (!status.isDeployed) {
        setRunningStep(ONBOARDING_STEP.DEPLOY)
        await requestDeployDepositWallet(address, POLYMARKET_ROUTES.DEPLOY)
        wallet = await trackUntil(
          () => resolveAccountWallet(address),
          (resolved) => resolved.deployed,
          'Wallet deployment not confirmed on-chain yet, please retry'
        )
        queryClient.setQueryData([REACT_QUERY_POLY_MARKET.ACCOUNT_WALLET, address.toLowerCase()], wallet)
        queryClient.invalidateQueries({ queryKey: [REACT_QUERY_POLY_MARKET.PROFILE] })
      }

      // Reuses cached CLOB credentials, otherwise prompts one ClobAuth signature; stores them in the query cache.
      setRunningStep(ONBOARDING_STEP.ENABLE_TRADING)
      const client = await getClient()

      if (!status.isApproved) {
        // One gasless batch of every missing approval (incl. NegRiskAdapter + auto-redeem): one signature; waits for confirmation.
        setRunningStep(ONBOARDING_STEP.APPROVE)
        await setupTradingApprovals(client, wallet.address, walletClient)
        const approved = await trackUntil(
          () => fetchTradingApprovalsState(wallet.address),
          (state) => state.isFullyApproved,
          'Approvals not confirmed on-chain yet, please retry'
        )

        queryClient.setQueryData([REACT_QUERY_POLY_MARKET.TRADING_APPROVALS, wallet.address.toLowerCase()], approved)
      }
    },
    // On success the confirmed state is already cached; refetching could read a lagging RPC node.
    onError: () => queryClient.invalidateQueries({ queryKey: [REACT_QUERY_POLY_MARKET.TRADING_APPROVALS] }),
    onSettled: () => setRunningStep(null),
  })

  return {
    wallet: accountWallet?.address,
    walletType: accountWallet?.type,
    currentStep: getOnboardingStep(status),
    isLoading: walletLoading || (status.isDeployed && approvals.isLoading),
    status,
    createWallet: {
      run: () => createWallet.mutate(),
      isPending: createWallet.isPending,
      error: createWallet.error,
      runningStep,
    },
  }
}
