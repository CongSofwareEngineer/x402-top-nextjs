'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppKitAccount } from '@reown/appkit/react'

import { usePolyMarketAccountWallet } from './account'
import { usePolymarketCredentials, usePolymarketTradingClient } from './session'

import { POLYMARKET_ROUTES } from '@/constants/polymarket'
import { REACT_QUERY_POLY_MARKET } from '@/constants/reactQuery'
import { fetchTradingApprovalsState, getOnboardingStep, requestDeployDepositWallet, setupTradingApprovals } from '@/services/polymarket'

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
 * Account setup (see `getOnboardingStep`): Deploy → Enable trading → Approve.
 * Each step's status comes from chain/API state or cached credentials, so a
 * reload resumes at the first unfinished step.
 */
export function usePolymarketOnboarding() {
  const { address } = useAppKitAccount()
  const queryClient = useQueryClient()
  const getClient = usePolymarketTradingClient()
  const { data: accountWallet, isLoading: walletLoading } = usePolyMarketAccountWallet()
  const { data: credentials } = usePolymarketCredentials()
  const approvals = usePolyMarketTradingApprovals()

  const deploy = useMutation({
    mutationFn: () => {
      if (!address) throw new Error('Wallet not connected')

      return requestDeployDepositWallet(address, POLYMARKET_ROUTES.DEPLOY)
    },
    onSuccess: (wallet) => {
      queryClient.setQueryData([REACT_QUERY_POLY_MARKET.ACCOUNT_WALLET, address?.toLowerCase()], wallet)
      queryClient.invalidateQueries({ queryKey: [REACT_QUERY_POLY_MARKET.PROFILE] })
    },
  })

  const enableTrading = useMutation({ mutationFn: () => getClient({ fresh: true }) })

  const approveAll = useMutation({
    // Checks on-chain state and submits only missing approvals (incl. NegRiskAdapter); waits for confirmation.
    mutationFn: async () => {
      if (!accountWallet?.address) throw new Error('Wallet not connected')

      return setupTradingApprovals(await getClient(), accountWallet.address)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [REACT_QUERY_POLY_MARKET.TRADING_APPROVALS] }),
  })

  const status = {
    isDeployed: !!accountWallet?.deployed,
    isTradingEnabled: !!credentials,
    isApproved: !!approvals.data?.isFullyApproved,
  }
  const step = (mutation: typeof deploy | typeof enableTrading | typeof approveAll) => ({
    run: () => mutation.mutate(),
    isPending: mutation.isPending,
    error: mutation.error,
  })

  return {
    wallet: accountWallet?.address,
    walletType: accountWallet?.type,
    currentStep: getOnboardingStep(status),
    isLoading: walletLoading || (status.isDeployed && approvals.isLoading),
    status,
    steps: { deploy: step(deploy), enableTrading: step(enableTrading), approveAll: step(approveAll) },
  }
}
