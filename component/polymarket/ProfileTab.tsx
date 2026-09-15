'use client'

import { useEffect, useState } from 'react'
import { useAppKitAccount } from '@reown/appkit/react'

import {
  useBridgeStatus,
  useCreateDepositAddress,
  useCreateWithdrawalAddress,
  usePolymarketPortfolio,
  usePolymarketPositions,
  usePolymarketProfile,
  useSupportedAssets,
} from '@/hooks/polymarket'
import { useWalletBalance } from '@/hooks/useWalletBalance'
import { EXPLORERS } from '@/constants/polymarket'

export function ProfileTab() {
  const { address, isConnected } = useAppKitAccount()
  const { data: portfolio, isLoading: portfolioLoading } = usePolymarketPortfolio(address)
  const { data: positions = [], isLoading: positionsLoading } = usePolymarketPositions(address)
  const { data: profile } = usePolymarketProfile(address)
  const { data: walletBalance, refetch: refetchWalletBalance } = useWalletBalance()
  const { data: bridge = { transactions: [] } } = useBridgeStatus(address)
  const { data: supportedAssets = [] } = useSupportedAssets()

  const { mutate: createDeposit, data: depositResult, isPending: depositPending, error: depositError } = useCreateDepositAddress()
  const { mutate: createWithdrawal, data: withdrawalResult, isPending: withdrawalPending, error: withdrawalError } = useCreateWithdrawalAddress()

  const [withdrawChainId, setWithdrawChainId] = useState('8453')

  useEffect(() => {
    if (isConnected && address && !depositResult) {
      createDeposit({ address })
    }
  }, [isConnected, address, depositResult, createDeposit])

  const depositAddress = depositResult?.address?.evm
  const withdrawalAddress = withdrawalResult?.address?.evm
  const portfolioValue = portfolio?.value ?? 0
  const positionsValue = positions.reduce((sum, p) => sum + p.currentValue, 0)

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

  const handleCreateWithdrawal = () => {
    if (!address) return
    createWithdrawal({
      address,
      toChainId: withdrawChainId,
      toTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      recipientAddr: address,
    })
  }

  const selectedAsset = supportedAssets.find((a) => a.chainId === withdrawChainId)

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
                <span className='text-lg font-semibold text-gray-400'>{(profile.name ?? profile.pseudonym ?? '?').slice(0, 1)}</span>
              </div>
            )}
            <div className='min-w-0'>
              <div className='flex items-center gap-2 flex-wrap'>
                <h3 className='text-lg font-bold text-gray-900 dark:text-white truncate'>{profile.name ?? profile.pseudonym ?? 'Unnamed profile'}</h3>
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
            </div>
          </div>
        </div>
      )}

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        <BalanceCard
          title='Polymarket Balance'
          value={formatCurrency(portfolioValue)}
          subtitle='pUSD value'
          icon={<WalletIcon className='w-6 h-6' />}
          color='blue'
        />
        <BalanceCard
          title='Wallet Balance'
          value={walletBalance !== null && walletBalance !== undefined ? formatCurrency(walletBalance) : 'Loading...'}
          subtitle='USDC on Base'
          icon={<WalletIcon className='w-6 h-6' />}
          color='green'
          action={
            <button onClick={() => refetchWalletBalance()} className='text-xs text-blue-600 dark:text-blue-400 hover:underline'>
              Refresh
            </button>
          }
        />
        <BalanceCard
          title='Open Positions'
          value={formatNumber(positions.length)}
          subtitle={formatCurrency(positionsValue)}
          icon={<ChartIcon className='w-6 h-6' />}
          color='purple'
        />
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
            <DepositIcon className='w-5 h-5 text-blue-600' />
            Deposit USDC
          </h3>
          <p className='text-sm text-gray-500 dark:text-gray-400 mb-4'>
            Send USDC from your wallet to the deposit address below to fund your Polymarket trading account.
          </p>
          {depositError && <p className='text-sm text-red-500 mb-4'>{(depositError as Error).message}</p>}
          {depositPending ? (
            <p className='text-sm text-gray-500 dark:text-gray-400 animate-pulse'>Fetching deposit address...</p>
          ) : depositAddress ? (
            <div className='space-y-3'>
              <div className='bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700'>
                <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>Deposit address (Base USDC)</label>
                <div className='flex items-center gap-2'>
                  <code className='flex-1 text-xs font-mono text-gray-900 dark:text-white break-all'>{depositAddress}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(depositAddress)}
                    className='px-2 py-1 text-xs text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 flex-shrink-0'
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className='flex flex-wrap gap-2'>
                <a
                  href={`${EXPLORERS.BASE}/address/${depositAddress}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20'
                >
                  View on BaseScan
                </a>
                <button
                  onClick={() => createDeposit({ address: address! })}
                  className='px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700'
                >
                  Refresh address
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
            <WithdrawIcon className='w-5 h-5 text-green-600' />
            Withdraw USDC
          </h3>
          <p className='text-sm text-gray-500 dark:text-gray-400 mb-4'>
            Create a withdrawal destination, then send pUSD from your Polymarket wallet to the address below.
          </p>
          <div className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Destination chain</label>
              <select
                value={withdrawChainId}
                onChange={(e) => setWithdrawChainId(e.target.value)}
                className='w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent'
              >
                {supportedAssets.length > 0 ? (
                  supportedAssets.map((asset) => (
                    <option key={`${asset.chainId}-${asset.token.address}`} value={asset.chainId}>
                      {asset.chainName} · {asset.token.symbol}
                    </option>
                  ))
                ) : (
                  <option value='8453'>Base · USDC</option>
                )}
              </select>
            </div>
            {selectedAsset && (
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                Withdrawing to {selectedAsset.chainName} as {selectedAsset.token.symbol} (min checkout ${selectedAsset.minCheckoutUsd.toFixed(2)})
              </p>
            )}
            <button
              onClick={handleCreateWithdrawal}
              disabled={withdrawalPending}
              className='w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
            >
              {withdrawalPending ? 'Creating destination...' : 'Create withdrawal destination'}
            </button>
            {withdrawalError && <p className='text-sm text-red-500'>{(withdrawalError as Error).message}</p>}
            {withdrawalAddress && (
              <div className='bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700'>
                <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>Withdrawal address (send pUSD here)</label>
                <div className='flex items-center gap-2'>
                  <code className='flex-1 text-xs font-mono text-gray-900 dark:text-white break-all'>{withdrawalAddress}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(withdrawalAddress)}
                    className='px-2 py-1 text-xs text-green-600 dark:text-green-400 border border-green-300 dark:border-green-700 rounded hover:bg-green-50 dark:hover:bg-green-900/20 flex-shrink-0'
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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

      {!positionsLoading && positions.length > 0 && (
        <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
          <div className='p-6 border-b border-gray-200 dark:border-gray-700'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>Open Positions</h3>
          </div>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead className='bg-gray-50 dark:bg-gray-800/50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Market</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Outcome</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Shares</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Avg Price</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Value</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>P&L</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                {positions.map((position, i) => (
                  <tr key={`${position.tokenId}-${i}`} className='hover:bg-gray-50 dark:hover:bg-gray-800/50'>
                    <td className='px-6 py-4'>
                      <div className='text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs'>{position.title}</div>
                    </td>
                    <td className='px-6 py-4'>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          position.outcome === 'Yes'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {position.outcome}
                      </span>
                    </td>
                    <td className='px-6 py-4 text-sm text-gray-900 dark:text-white'>{formatNumber(position.currentSize)}</td>
                    <td className='px-6 py-4 text-sm text-gray-900 dark:text-white'>${position.avgPrice.toFixed(4)}</td>
                    <td className='px-6 py-4 text-sm text-gray-900 dark:text-white'>{formatCurrency(position.currentValue)}</td>
                    <td className='px-6 py-4'>
                      <span
                        className={`text-sm font-medium ${position.totalPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                      >
                        {position.totalPnl >= 0 ? '+' : ''}
                        {formatCurrency(position.totalPnl)}
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

function formatNumber(num: number) {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`

  return num.toFixed(2)
}

const formatCurrency = (num: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(num)

function BalanceCard({
  title,
  value,
  subtitle,
  icon,
  color,
  action,
}: {
  title: string
  value: string
  subtitle: string
  icon: React.ReactNode
  color: 'blue' | 'green' | 'purple'
  action?: React.ReactNode
}) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
  }

  return (
    <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6'>
      <div className='flex items-center justify-between'>
        <div>
          <p className='text-sm text-gray-500 dark:text-gray-400'>{title}</p>
          <p className='text-2xl font-bold text-gray-900 dark:text-white mt-1'>{value}</p>
          <p className='text-sm text-gray-500 dark:text-gray-400'>{subtitle}</p>
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>{icon}</div>
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

function DepositIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
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
