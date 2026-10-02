'use client'

import { useState } from 'react'
import { useAppKitAccount } from '@reown/appkit/react'
import { isAddress } from 'viem'

import { DepositCard } from './DepositCard'
import { PositionsPanel } from './PositionsPanel'

import {
  useBridgeStatus,
  usePolyMarketCashBalance,
  usePolyMarketPortfolio,
  usePolyMarketPositions,
  usePolyMarketProfile,
  usePolyMarketUserStats,
  usePolymarketOnboarding,
  useSupportedAssets,
  useWithdraw,
} from '@/hooks/polymarket'
import { useWalletBalance } from '@/hooks/useWalletBalance'
import { EXPLORERS } from '@/constants/polymarket'
import { BRIDGE_ADDRESS_TYPE_BY_CHAIN, ONBOARDING_STEP, type OnboardingStep } from '@/services/polymarket'

export function ProfileTab() {
  const { address, isConnected } = useAppKitAccount()
  const { data: portfolio, isLoading: portfolioLoading } = usePolyMarketPortfolio()
  const { data: positions = [], isLoading: positionsLoading } = usePolyMarketPositions()
  const { data: profile } = usePolyMarketProfile()
  const { data: cash, isLoading: cashLoading } = usePolyMarketCashBalance()
  const { data: stats } = usePolyMarketUserStats()
  const walletBalance = useWalletBalance()
  const depositAddress = profile?.bridge?.address?.evm
  // `/status/{address}` takes the bridge address that received funds, not the wallet.
  const { data: bridge = { transactions: [] } } = useBridgeStatus(depositAddress)
  const { data: supportedAssets = [] } = useSupportedAssets()
  const onboarding = usePolymarketOnboarding()

  const { mutate: withdraw, reset: resetWithdrawal, isPending: withdrawalPending, error: withdrawalError, data: withdrawal } = useWithdraw()
  const [withdrawChainId, setWithdrawChainId] = useState('8453')
  const [recipientInput, setRecipientInput] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  // Bridge progress of the pUSD sent to the withdrawal address.
  const { data: withdrawalStatus } = useBridgeStatus(withdrawal?.bridgeAddress)
  const withdrawalTx = withdrawalStatus?.transactions[0]

  // `/v2/value` = open positions only; polymarket.com's Portfolio = positions + cash.
  const positionsValue = portfolio?.value ?? positions.reduce((sum, p) => sum + p.currentValue, 0)
  const portfolioValue = positionsValue + (cash ?? 0)
  const activeCount = positions.filter((p) => !p.redeemable).length
  const pnl = stats?.allTimePnl?.economicPnl ?? 0
  const volume = stats?.allTimePnl?.volumeUsdc ?? 0
  const displayName =
    profile?.name ||
    profile?.pseudonym ||
    (onboarding.wallet ? `${onboarding.wallet.slice(0, 6)}...${onboarding.wallet.slice(-4)}` : 'Unnamed profile')
  const joinedAt = stats?.joinDate ? new Date(stats.joinDate * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : null

  if (!isConnected) {
    return (
      <div className='text-center py-12'>
        <div className='w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center'>
          <svg className='w-10 h-10 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 10V3L4 14h7v7l9-11h-7z' />
          </svg>
        </div>
        <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-2'>Connect Wallet</h2>
        <p className='text-gray-500 dark:text-gray-400'>Connect your wallet to view your Polymarket profile and manage funds.</p>
      </div>
    )
  }

  // One withdraw token per chain — USDC when the bridge supports it there.
  const withdrawAssets = Array.from(new Set(supportedAssets.map((a) => a.chainId)), (chainId) => {
    const onChain = supportedAssets.filter((a) => a.chainId === chainId)

    return onChain.find((a) => a.token.symbol === 'USDC') ?? onChain[0]
  })
  const selectedAsset = withdrawAssets.find((a) => a.chainId === withdrawChainId)

  // Unlisted bridge chains are EVM; only those can fall back to the connected (EVM) wallet.
  const isEvmWithdrawChain = BRIDGE_ADDRESS_TYPE_BY_CHAIN[withdrawChainId] === undefined
  const recipient = recipientInput.trim() || (isEvmWithdrawChain ? (address ?? '') : '')
  const recipientError = !recipient
    ? `Enter a ${selectedAsset?.chainName ?? 'destination'} recipient address`
    : isEvmWithdrawChain && !isAddress(recipient)
      ? 'Invalid EVM address'
      : null

  // A destination is bound to chain + recipient — drop the old one when either changes.
  const handleWithdrawChainChange = (chainId: string) => {
    setWithdrawChainId(chainId)
    resetWithdrawal()
  }

  const handleRecipientChange = (value: string) => {
    setRecipientInput(value)
    resetWithdrawal()
  }

  const amount = Number(withdrawAmount)
  const amountError = !withdrawAmount
    ? null
    : !(amount > 0)
      ? 'Enter a valid amount'
      : selectedAsset && amount < selectedAsset.minCheckoutUsd
        ? `Minimum is $${selectedAsset.minCheckoutUsd.toFixed(2)}`
        : amount > (cash ?? 0)
          ? 'Insufficient pUSD balance'
          : null

  const handleWithdraw = () => {
    if (!onboarding.wallet || !selectedAsset || recipientError || !withdrawAmount || amountError) return
    withdraw({
      address: onboarding.wallet,
      toChainId: withdrawChainId,
      toTokenAddress: selectedAsset.token.address,
      recipientAddr: recipient,
      amount: withdrawAmount.trim(),
    })
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div>
          <h2 className='text-2xl font-bold text-gray-900 dark:text-white'>Profile</h2>
          <p className='text-gray-500 dark:text-gray-400'>Manage your Polymarket account and funds</p>
        </div>
        <div className='flex items-center gap-2'>
          <span className='px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-sm font-medium'>
            Connected
          </span>
          <span className='font-mono text-sm text-gray-500 dark:text-gray-400'>
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        </div>
      </div>

      {(portfolioLoading || positionsLoading) && (
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {[1, 2, 3].map((i) => (
            <div key={i} className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse'>
              <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2' />
              <div className='h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2' />
            </div>
          ))}
        </div>
      )}

      {profile && (
        <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6'>
          <div className='flex items-center gap-4'>
            {profile.profileImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.profileImage}
                alt={profile.name ?? profile.pseudonym ?? 'profile'}
                className='w-16 h-16 rounded-full object-cover flex-shrink-0'
              />
            ) : (
              <div className='w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0'>
                <span className='text-lg font-semibold text-gray-400'>{(profile.name || profile.pseudonym || '?').slice(0, 1)}</span>
              </div>
            )}
            <div className='min-w-0'>
              <div className='flex items-center gap-2 flex-wrap'>
                <h3 className='text-lg font-bold text-gray-900 dark:text-white truncate'>{displayName}</h3>
                {profile.verifiedBadge && (
                  <span className='text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded-full px-2 py-0.5'>
                    Verified
                  </span>
                )}
              </div>
              {profile.pseudonym && profile.pseudonym !== profile.name && (
                <p className='text-sm text-gray-500 dark:text-gray-400'>@{profile.pseudonym}</p>
              )}
              {profile.xUsername && (
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                  X: <span className='text-blue-600 dark:text-blue-400'>@{profile.xUsername}</span>
                </p>
              )}
              {profile.bio && <p className='text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2'>{profile.bio}</p>}
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                {joinedAt && <>Joined {joinedAt} · </>}
                {formatNumber(stats?.trades ?? 0)} trades
                {onboarding.wallet && (
                  <>
                    {' · '}
                    <a
                      href={`${EXPLORERS.POLYGON}/address/${onboarding.wallet}`}
                      target='_blank'
                      rel='noreferrer'
                      className='font-mono text-blue-600 dark:text-blue-400 hover:underline'
                    >
                      {onboarding.wallet.slice(0, 6)}...{onboarding.wallet.slice(-4)}
                    </a>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {onboarding.status.isDeployed && <PositionsPanel canTrade={onboarding.currentStep === ONBOARDING_STEP.DONE} />}

      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6'>
        <BalanceCard
          title='Portfolio'
          value={formatCurrency(portfolioValue)}
          subtitle={`${formatCurrency(positionsValue)} in ${activeCount} active ${activeCount === 1 ? 'position' : 'positions'}`}
          icon={<ChartIcon className='w-6 h-6' />}
        />
        <BalanceCard
          title='Cash'
          value={cashLoading ? 'Loading...' : formatCurrency(cash ?? 0)}
          subtitle='pUSD on Polygon · available to trade'
          icon={<WalletIcon className='w-6 h-6' />}
        />
        <BalanceCard
          title='Wallet Balance'
          value={walletBalanceLabel(walletBalance)}
          subtitle={
            walletBalance.isSupported
              ? `${walletBalance.token!.symbol} on ${walletBalance.chain!.name}`
              : `No USDC on ${walletBalance.chain?.name ?? 'this network'}`
          }
          icon={<WalletIcon className='w-6 h-6' />}
          action={
            walletBalance.isSupported && (
              <button onClick={() => walletBalance.refetch()} className='text-xs text-blue-600 dark:text-blue-400 hover:underline'>
                Refresh
              </button>
            )
          }
        />
        <BalanceCard
          title='Profit/Loss'
          value={`${pnl >= 0 ? '+' : '-'}${formatCurrency(Math.abs(pnl))}`}
          valueClassName={pnl > 0 ? 'text-green-600 dark:text-green-400' : pnl < 0 ? 'text-red-600 dark:text-red-400' : undefined}
          subtitle={`All-time · ${formatCurrency(volume)} volume`}
          icon={<ChartIcon className='w-6 h-6' />}
        />
      </div>

      {onboarding.currentStep !== ONBOARDING_STEP.DONE && <OnboardingCard onboarding={onboarding} />}

      {onboarding.status.isDeployed && <DepositCard />}

      {onboarding.status.isDeployed && (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
              <WithdrawIcon className='w-5 h-5 text-green-600' />
              Withdraw USDC
            </h3>
            <p className='text-sm text-gray-500 dark:text-gray-400 mb-4'>
              Send pUSD from your Polymarket wallet through the bridge. One gasless signature, then the bridge delivers it on the destination chain.
            </p>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Destination chain</label>
                <select
                  value={withdrawChainId}
                  onChange={(e) => handleWithdrawChainChange(e.target.value)}
                  className='w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent'
                >
                  {withdrawAssets.map((asset) => (
                    <option key={asset.chainId} value={asset.chainId}>
                      {asset.chainName} · {asset.token.symbol}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className='flex items-center justify-between mb-1'>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>Recipient address</label>
                  {recipientInput && isEvmWithdrawChain && address && (
                    <button
                      type='button'
                      onClick={() => handleRecipientChange('')}
                      className='text-xs text-green-600 dark:text-green-400 hover:underline'
                    >
                      Use connected wallet
                    </button>
                  )}
                </div>
                <input
                  type='text'
                  value={recipientInput}
                  onChange={(e) => handleRecipientChange(e.target.value)}
                  placeholder={isEvmWithdrawChain ? (address ?? '0x...') : `${selectedAsset?.chainName ?? ''} address`}
                  spellCheck={false}
                  autoComplete='off'
                  className='w-full px-4 py-2 font-mono text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent'
                />
                <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                  {isEvmWithdrawChain
                    ? 'Defaults to your connected wallet when left empty.'
                    : `${selectedAsset?.chainName ?? 'This chain'} is not EVM — enter a recipient address on that chain.`}
                </p>
                {recipientInput && recipientError && <p className='mt-1 text-xs text-red-500'>{recipientError}</p>}
              </div>
              <div>
                <div className='flex items-center justify-between mb-1'>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>Amount (pUSD)</label>
                  <button
                    type='button'
                    onClick={() => setWithdrawAmount(String(cash ?? 0))}
                    disabled={!cash}
                    className='text-xs text-green-600 dark:text-green-400 hover:underline disabled:opacity-50 disabled:no-underline'
                  >
                    Max {formatCurrency(cash ?? 0)}
                  </button>
                </div>
                <input
                  type='number'
                  inputMode='decimal'
                  min={0}
                  step='any'
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder='0.00'
                  className='w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent'
                />
                {amountError && <p className='mt-1 text-xs text-red-500'>{amountError}</p>}
              </div>
              {selectedAsset && (
                <p className='text-xs text-gray-500 dark:text-gray-400'>
                  Withdrawing to {selectedAsset.chainName} as {selectedAsset.token.symbol} (min checkout ${selectedAsset.minCheckoutUsd.toFixed(2)})
                </p>
              )}
              <button
                onClick={handleWithdraw}
                disabled={withdrawalPending || !onboarding.wallet || !selectedAsset || !!recipientError || !withdrawAmount || !!amountError}
                className='w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
              >
                {withdrawalPending ? 'Withdrawing... confirm in your wallet' : 'Withdraw'}
              </button>
              {withdrawalError && <p className='text-sm text-red-500'>{withdrawalError.message}</p>}
              {withdrawal && (
                <div className='bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700 space-y-1 text-xs'>
                  <p className='text-gray-500 dark:text-gray-400'>
                    pUSD sent to the bridge ·{' '}
                    <a
                      href={`${EXPLORERS.POLYGON}/tx/${withdrawal.transactionHash}`}
                      target='_blank'
                      rel='noreferrer'
                      className='font-mono text-blue-600 dark:text-blue-400 hover:underline'
                    >
                      {withdrawal.transactionHash.slice(0, 10)}...{withdrawal.transactionHash.slice(-8)}
                    </a>
                  </p>
                  <p className='text-gray-500 dark:text-gray-400'>
                    Bridge status:{' '}
                    <span className='px-2 py-0.5 font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 uppercase'>
                      {withdrawalTx?.status ?? 'waiting'}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {bridge.transactions.length > 0 && (
        <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
          <div className='p-6 border-b border-gray-200 dark:border-gray-700'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>Recent Transfers</h3>
          </div>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead className='bg-gray-50 dark:bg-gray-800/50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Chain</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Amount</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Status</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                {bridge.transactions.map((tx, i) => (
                  <tr key={i} className='hover:bg-gray-50 dark:hover:bg-gray-800/50'>
                    <td className='px-6 py-4 text-sm text-gray-900 dark:text-white'>{tx.fromChainId}</td>
                    <td className='px-6 py-4 text-sm text-gray-900 dark:text-white'>{(Number(tx.fromAmountBaseUnit) / 1e6).toFixed(2)} USDC</td>
                    <td className='px-6 py-4'>
                      <span className='px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 uppercase'>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

const ONBOARDING_STEPS: {
  key: Exclude<OnboardingStep, typeof ONBOARDING_STEP.DONE>
  title: string
  description: string
  action: string
  pendingLabel: string
}[] = [
  {
    key: ONBOARDING_STEP.DEPLOY,
    title: 'Deploy wallet',
    description: 'Create your Polymarket Deposit Wallet on Polygon. Gasless, no signature needed.',
    action: 'Deploy',
    pendingLabel: 'Deploying...',
  },
  {
    key: ONBOARDING_STEP.ENABLE_TRADING,
    title: 'Enable trading',
    description: 'Sign once to create your trading API credentials.',
    action: 'Enable',
    pendingLabel: 'Enabling...',
  },
  {
    key: ONBOARDING_STEP.APPROVE,
    title: 'Approve tokens',
    description: 'Approve pUSD and outcome tokens for the exchanges in one gasless transaction.',
    action: 'Approve all',
    pendingLabel: 'Approving...',
  },
]

function OnboardingCard({ onboarding }: { onboarding: ReturnType<typeof usePolymarketOnboarding> }) {
  const { currentStep, status, steps, wallet, walletType, isLoading } = onboarding

  const isDone = {
    [ONBOARDING_STEP.DEPLOY]: status.isDeployed,
    [ONBOARDING_STEP.ENABLE_TRADING]: status.isTradingEnabled,
    [ONBOARDING_STEP.APPROVE]: status.isApproved,
  }
  const actions = {
    [ONBOARDING_STEP.DEPLOY]: steps.deploy,
    [ONBOARDING_STEP.ENABLE_TRADING]: steps.enableTrading,
    [ONBOARDING_STEP.APPROVE]: steps.approveAll,
  }
  const isBusy = isLoading || Object.values(actions).some((action) => action.isPending)

  return (
    <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6'>
      <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2'>
        <DeployIcon className='w-5 h-5 text-orange-600' />
        Set up your Polymarket account
      </h3>
      {wallet && (
        <p className='text-xs text-gray-500 dark:text-gray-400 mb-4'>
          {walletType === 'SAFE' ? 'Polymarket wallet (Safe)' : 'Deposit wallet'}: <span className='font-mono break-all'>{wallet}</span>
        </p>
      )}
      <ol className='space-y-3'>
        {ONBOARDING_STEPS.map((step, index) => {
          const done = isDone[step.key]
          const active = currentStep === step.key
          const action = actions[step.key]

          return (
            <li
              key={step.key}
              className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border p-4 ${
                active ? 'border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-900/10' : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className='flex items-start gap-3 flex-1 min-w-0'>
                <span
                  className={`w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center text-sm font-semibold ${
                    done
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : active
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-100 text-gray-400 dark:bg-gray-700'
                  }`}
                >
                  {done ? '✓' : index + 1}
                </span>
                <div className='min-w-0'>
                  <p className='font-medium text-gray-900 dark:text-white'>{step.title}</p>
                  <p className='text-sm text-gray-500 dark:text-gray-400'>{step.description}</p>
                  {action.error && <p className='text-sm text-red-500 mt-1 break-words'>{action.error.message}</p>}
                </div>
              </div>
              {active && (
                <button
                  onClick={action.run}
                  disabled={isBusy}
                  className='px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0'
                >
                  {action.isPending ? step.pendingLabel : step.action}
                </button>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function formatNumber(num: number) {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`

  return num.toFixed(2)
}

const formatCurrency = (num: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(num)

function walletBalanceLabel({ isSupported, isLoading, isError, balance }: ReturnType<typeof useWalletBalance>) {
  if (!isSupported) return '—'
  if (isError) return 'Unavailable'
  if (isLoading || balance === undefined) return 'Loading...'

  return formatCurrency(balance)
}

function BalanceCard({
  title,
  value,
  valueClassName = 'text-gray-900 dark:text-white',
  subtitle,
  icon,
  action,
}: {
  title: string
  value: string
  valueClassName?: string
  subtitle: string
  icon: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6'>
      <div className='flex items-center justify-between'>
        <div>
          <p className='text-sm text-gray-500 dark:text-gray-400'>{title}</p>
          <p className={`text-2xl font-bold mt-1 ${valueClassName}`}>{value}</p>
          <p className='text-sm text-gray-500 dark:text-gray-400'>{subtitle}</p>
        </div>
        <div className='p-3 rounded-xl'>{icon}</div>
      </div>
      {action && <div className='mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end'>{action}</div>}
    </div>
  )
}

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z'
      />
    </svg>
  )
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
      />
    </svg>
  )
}

function DeployIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' />
    </svg>
  )
}

function WithdrawIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 20V4m-8 8h16' />
    </svg>
  )
}
