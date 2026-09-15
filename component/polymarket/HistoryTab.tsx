'use client'

import { useState } from 'react'
import { useAppKitAccount } from '@reown/appkit/react'

import { useCancelOrder, useClobSession, usePolymarketActivity, usePolymarketOpenOrders } from '@/hooks/polymarket'
import { EXPLORERS } from '@/constants/polymarket'

export function HistoryTab() {
  const { address, isConnected } = useAppKitAccount()
  const [activeTab, setActiveTab] = useState<'trades' | 'orders'>('trades')

  const { data: activity, isLoading: tradesLoading, isError: tradesError } = usePolymarketActivity(address)
  const { isAuthenticated, authenticate, isLoading: authLoading, error: authError } = useClobSession()
  const { data: orders = [], isLoading: ordersLoading } = usePolymarketOpenOrders()
  const { mutate: cancelOrder, isPending: cancelPending } = useCancelOrder()

  const trades = activity?.items ?? []

  if (!isConnected) {
    return (
      <div className='text-center py-12'>
        <div className='w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center'>
          <svg className='w-10 h-10 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
        </div>
        <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-2'>Connect Wallet</h2>
        <p className='text-gray-500 dark:text-gray-400'>Connect your wallet to view your trading history and open orders.</p>
      </div>
    )
  }

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const handleCancelOrder = (orderId: string) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      cancelOrder(orderId)
    }
  }

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>History</h2>
        <p className='text-gray-500 dark:text-gray-400'>View your trading activity and manage open orders</p>
      </div>

      <div className='flex gap-2 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700'>
        <button
          onClick={() => setActiveTab('trades')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'trades' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Activity ({trades.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'orders' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Open Orders ({orders.length})
        </button>
      </div>

      {activeTab === 'trades' && (
        <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
          {tradesLoading && trades.length === 0 ? (
            <div className='p-6 text-center'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto' />
              <p className='mt-2 text-gray-500 dark:text-gray-400'>Loading activity...</p>
            </div>
          ) : tradesError ? (
            <div className='p-6 text-center text-red-500'>Failed to load activity. Please try again.</div>
          ) : trades.length === 0 ? (
            <div className='p-12 text-center text-gray-500 dark:text-gray-400'>No activity found. Start trading to see your history here.</div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-gray-50 dark:bg-gray-800/50'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Date</th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Type</th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Market</th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Side</th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Outcome</th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Price</th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Size</th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Total</th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Tx Hash</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                  {trades.map((trade, i) => (
                    <tr key={`${trade.timestamp}-${i}`} className='hover:bg-gray-50 dark:hover:bg-gray-800/50'>
                      <td className='px-6 py-4 text-sm text-gray-900 dark:text-white'>{formatDate(trade.timestamp)}</td>
                      <td className='px-6 py-4'>
                        <span className='px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 uppercase'>
                          {trade.type.toLowerCase()}
                        </span>
                      </td>
                      <td className='px-6 py-4'>
                        <div className='text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs'>{trade.title}</div>
                      </td>
                      <td className='px-6 py-4'>
                        {trade.side && (
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              trade.side === 'BUY'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                          >
                            {trade.side}
                          </span>
                        )}
                      </td>
                      <td className='px-6 py-4'>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            trade.outcome === 'Yes'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}
                        >
                          {trade.outcome}
                        </span>
                      </td>
                      <td className='px-6 py-4 text-sm text-gray-900 dark:text-white'>${trade.price.toFixed(4)}</td>
                      <td className='px-6 py-4 text-sm text-gray-900 dark:text-white'>{formatNumber(trade.size)}</td>
                      <td className='px-6 py-4 text-sm font-medium text-gray-900 dark:text-white'>{formatCurrency(trade.usdcSize)}</td>
                      <td className='px-6 py-4'>
                        {trade.transactionHash ? (
                          <a
                            href={`${EXPLORERS.POLYGON}/tx/${trade.transactionHash}`}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='text-sm font-mono text-blue-600 dark:text-blue-400 hover:underline truncate max-w-xs block'
                          >
                            {trade.transactionHash.slice(0, 10)}...
                          </a>
                        ) : (
                          <span className='text-sm text-gray-400'>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'orders' && (
        <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
          {!isAuthenticated ? (
            <div className='p-12 text-center'>
              <p className='text-gray-700 dark:text-gray-300 mb-4'>Enable trading with Polymarket to see and manage your open orders.</p>
              {authError && <p className='text-sm text-red-500 mb-4'>{authError.message}</p>}
              <button
                onClick={() => authenticate().catch(() => {})}
                disabled={authLoading}
                className='px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50'
              >
                {authLoading ? 'Signing message...' : 'Enable trading'}
              </button>
            </div>
          ) : ordersLoading && orders.length === 0 ? (
            <div className='p-6 text-center'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto' />
              <p className='mt-2 text-gray-500 dark:text-gray-400'>Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className='p-12 text-center text-gray-500 dark:text-gray-400'>No open orders. Place a trade to see your orders here.</div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-gray-50 dark:bg-gray-800/50'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Date</th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Market</th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Side</th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Outcome</th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Price</th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Size</th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Filled</th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Actions</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                  {orders.map((order) => (
                    <tr key={order.id} className='hover:bg-gray-50 dark:hover:bg-gray-800/50'>
                      <td className='px-6 py-4 text-sm text-gray-900 dark:text-white'>{formatDate(order.createdAt * 1000)}</td>
                      <td className='px-6 py-4'>
                        <div className='text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs'>{order.title ?? order.market}</div>
                      </td>
                      <td className='px-6 py-4'>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            order.side === 'BUY'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}
                        >
                          {order.side}
                        </span>
                      </td>
                      <td className='px-6 py-4'>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            order.outcome === 'YES'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}
                        >
                          {order.outcome}
                        </span>
                      </td>
                      <td className='px-6 py-4 text-sm text-gray-900 dark:text-white'>${order.price.toFixed(4)}</td>
                      <td className='px-6 py-4 text-sm text-gray-900 dark:text-white'>{formatNumber(order.originalSize)}</td>
                      <td className='px-6 py-4 text-sm text-gray-900 dark:text-white'>{formatNumber(order.sizeMatched)}</td>
                      <td className='px-6 py-4'>
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={cancelPending}
                          className='px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium disabled:opacity-50'
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatNumber(num: number) {
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`

  return num.toFixed(2)
}

const formatCurrency = (num: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(num)
