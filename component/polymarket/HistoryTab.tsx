'use client'

import type { ActivityItem } from '@/services/polymarket'

import { useState } from 'react'
import { useAppKitAccount } from '@reown/appkit/react'

import { formatDateTime } from './format'

import {
  useCancelOrder,
  usePolymarketCredentials,
  usePolyMarketActivity,
  usePolyMarketMarketStatuses,
  usePolyMarketOpenOrders,
} from '@/hooks/polymarket'
import { EXPLORERS, POLYMARKET_WEB_URL } from '@/constants/polymarket'

/** Activity rows that point to a market can be reopened in the Trade tab. */
const isTradable = (item: ActivityItem) => !!item.eventSlug && !!(item.tokenId || item.slug)

/** Market page on polymarket.com (`/event/<eventSlug>[/<marketSlug>]`). */
const polymarketUrl = (item: ActivityItem) =>
  item.eventSlug ? `${POLYMARKET_WEB_URL}/event/${item.eventSlug}${item.slug ? `/${item.slug}` : ''}` : undefined

const thClass = 'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap'

export function HistoryTab({ onTrade }: { onTrade: (item: ActivityItem) => void }) {
  const { isConnected } = useAppKitAccount()
  const [activeTab, setActiveTab] = useState<'trades' | 'orders'>('trades')

  const { data: activity, isLoading: tradesLoading, isError: tradesError } = usePolyMarketActivity()
  const { data: credentials } = usePolymarketCredentials()
  const { data: orders = [], isLoading: ordersLoading } = usePolyMarketOpenOrders()
  const { mutate: cancelOrder, isPending: cancelPending } = useCancelOrder()

  const trades = activity?.items ?? []
  const { data: endedBySlug = {} } = usePolyMarketMarketStatuses(trades.flatMap((t) => (t.slug ? [t.slug] : [])))

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

      <div className='inline-flex gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700'>
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
            <>
              <p className='px-6 py-3 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700'>
                Click a market to buy more or sell your shares.
              </p>
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead className='bg-gray-50 dark:bg-gray-800/50'>
                    <tr>
                      <th className={thClass}>Market</th>
                      <th className={thClass}>Activity</th>
                      <th className={thClass}>Price</th>
                      <th className={thClass}>Shares</th>
                      <th className={thClass}>Total</th>
                      <th className={thClass}>Date</th>
                      <th className={thClass}>Tx</th>
                      <th className={thClass} />
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                    {trades.map((trade, i) => {
                      const tradable = isTradable(trade)
                      const ended = trade.slug ? endedBySlug[trade.slug] : undefined
                      const marketUrl = polymarketUrl(trade)

                      return (
                        <tr
                          key={`${trade.timestamp}-${i}`}
                          onClick={tradable ? () => onTrade(trade) : undefined}
                          onKeyDown={tradable ? (e) => e.key === 'Enter' && onTrade(trade) : undefined}
                          tabIndex={tradable ? 0 : undefined}
                          title={tradable ? 'Trade this market' : undefined}
                          className={`group ${tradable ? 'cursor-pointer hover:bg-blue-50/60 dark:hover:bg-blue-900/10 focus:outline-none focus-visible:bg-blue-50/60 dark:focus-visible:bg-blue-900/10' : ''}`}
                        >
                          <td className='px-4 py-3'>
                            <div className='flex items-center gap-3 min-w-[240px] max-w-sm'>
                              {trade.icon ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={trade.icon} alt='' className='w-9 h-9 rounded-md object-cover flex-shrink-0' />
                              ) : (
                                <div className='w-9 h-9 rounded-md bg-gray-100 dark:bg-gray-700 flex-shrink-0' />
                              )}
                              <div className='min-w-0'>
                                <div
                                  className={`text-sm font-medium text-gray-900 dark:text-white truncate ${tradable ? 'group-hover:text-blue-600 dark:group-hover:text-blue-400' : ''}`}
                                >
                                  {trade.title}
                                </div>
                                <div className='flex flex-wrap items-center gap-1.5 mt-0.5'>
                                  {trade.outcome && (
                                    <span
                                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                        trade.outcome === 'Yes'
                                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                      }`}
                                    >
                                      {trade.outcome}
                                    </span>
                                  )}
                                  {ended !== undefined && <MarketStatusBadge ended={ended} />}
                                </div>
                                {marketUrl && (
                                  <a
                                    href={marketUrl}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                    onClick={(e) => e.stopPropagation()}
                                    className='inline-flex items-center gap-0.5 mt-1 text-xs text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'
                                  >
                                    View on Polymarket
                                    <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                      <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={2}
                                        d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
                                      />
                                    </svg>
                                  </a>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className='px-4 py-3 whitespace-nowrap'>
                            <div className='flex items-center gap-1.5'>
                              <span className='px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 uppercase'>
                                {trade.type.toLowerCase()}
                              </span>
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
                            </div>
                          </td>
                          <td className='px-4 py-3 text-sm text-gray-900 dark:text-white'>${trade.price.toFixed(4)}</td>
                          <td className='px-4 py-3 text-sm text-gray-900 dark:text-white'>{formatNumber(trade.size)}</td>
                          <td className='px-4 py-3 text-sm font-medium text-gray-900 dark:text-white'>{formatCurrency(trade.usdcSize)}</td>
                          <td className='px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap'>
                            {formatDateTime(trade.timestamp * 1000)}
                          </td>
                          <td className='px-4 py-3'>
                            {trade.transactionHash ? (
                              <a
                                href={`${EXPLORERS.POLYGON}/tx/${trade.transactionHash}`}
                                target='_blank'
                                rel='noopener noreferrer'
                                onClick={(e) => e.stopPropagation()}
                                className='text-sm font-mono text-blue-600 dark:text-blue-400 hover:underline'
                              >
                                {trade.transactionHash.slice(0, 10)}...
                              </a>
                            ) : (
                              <span className='text-sm text-gray-400'>—</span>
                            )}
                          </td>
                          <td className='px-4 py-3 text-right'>
                            {tradable && (
                              <span className='inline-flex items-center gap-1 text-xs font-medium text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 whitespace-nowrap'>
                                Trade
                                <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                                </svg>
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'orders' && (
        <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
          {!credentials ? (
            <div className='p-12 text-center text-gray-700 dark:text-gray-300'>
              Enable trading in the Profile tab to see and manage your open orders.
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
                      <td className='px-6 py-4 text-sm text-gray-900 dark:text-white'>{formatDateTime(order.createdAt)}</td>
                      <td className='px-6 py-4'>
                        <div className='text-sm font-mono text-gray-900 dark:text-white truncate max-w-xs' title={order.market}>
                          {order.market.slice(0, 10)}...
                        </div>
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
                            order.outcome.toLowerCase() === 'yes'
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

/** Live = market still trading, Ended = closed/resolved (see `isMarketEnded`). */
function MarketStatusBadge({ ended }: { ended: boolean }) {
  if (ended) {
    return <span className='px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'>Ended</span>
  }

  return (
    <span className='inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'>
      <span className='w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse' />
      Live
    </span>
  )
}

function formatNumber(num: number) {
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`

  return num.toFixed(2)
}

const formatCurrency = (num: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(num)
