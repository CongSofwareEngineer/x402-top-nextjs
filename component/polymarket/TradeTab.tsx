'use client'

import type { Market, OrderSide } from '@/services/polymarket'

import { useMemo, useState } from 'react'

import { useClobSession, usePlaceOrder, usePolyMarketOrderBook } from '@/hooks/polymarket'
import { ORDER_SIDE, ORDER_TYPE } from '@/constants/polymarket'

interface TradeTabProps {
  market: Market
}

export function TradeTab({ market }: TradeTabProps) {
  const outcomes = market.outcomes ?? []
  const tokenIds = market.clobTokenIds ?? []
  const prices = market.outcomePrices ?? []

  const [outcomeIndex, setOutcomeIndex] = useState(0)
  const [side, setSide] = useState<OrderSide>(ORDER_SIDE.BUY)
  const [price, setPrice] = useState('')
  const [size, setSize] = useState('')

  const tokenId = tokenIds[outcomeIndex]

  const { data: orderBook } = usePolyMarketOrderBook(tokenId)
  const { isAuthenticated, authenticate, isLoading: authLoading, error: authError } = useClobSession()
  const { mutate: placeOrder, isPending: orderPending, error: orderError, data: orderResult } = usePlaceOrder()

  const outcomeName = outcomes[outcomeIndex] ?? ''

  const prefillPrice = (value: string) => setPrice(value)

  const preview = useMemo(() => {
    const p = parseFloat(price)
    const s = parseFloat(size)

    if (!Number.isFinite(p) || !Number.isFinite(s) || p <= 0 || s <= 0) return null

    return { total: p * s }
  }, [price, size])

  const submit = () => {
    const p = parseFloat(price)
    const s = parseFloat(size)

    if (!tokenId || !Number.isFinite(p) || !Number.isFinite(s) || p <= 0 || s <= 0) return

    placeOrder({
      draft: {
        tokenId,
        side,
        price: p,
        size: s,
        orderType: ORDER_TYPE.GTC,
      },
      negRisk: !!market.negRisk,
    })
  }

  if (!tokenId) {
    return <div className='text-center py-12 text-gray-500 dark:text-gray-400'>This market has no tradable outcome tokens.</div>
  }

  const visibleAsks = [...(orderBook?.asks ?? [])].sort((a, b) => a.price - b.price).slice(0, 6)
  const visibleBids = [...(orderBook?.bids ?? [])].sort((a, b) => b.price - a.price).slice(0, 6)

  return (
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto'>
      <div className='space-y-6'>
        <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6'>
          <div className='flex items-start gap-3 mb-4'>
            {market.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={market.image} alt={market.question ?? ''} className='w-14 h-14 rounded-lg object-cover flex-shrink-0' />
            )}
            <div>
              <h2 className='text-lg font-bold text-gray-900 dark:text-white'>{market.question}</h2>
              {market.endDate && (
                <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>Ends {new Date(market.endDate).toLocaleDateString()}</p>
              )}
            </div>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>Outcome</label>
            <div className='grid grid-cols-2 gap-3'>
              {outcomes.map((outcome, i) => {
                const selected = i === outcomeIndex
                const price = prices[i] ?? 0

                return (
                  <button
                    key={`${outcome}-${i}`}
                    onClick={() => setOutcomeIndex(i)}
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      selected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                    }`}
                  >
                    <div
                      className={`text-sm font-semibold ${outcome === 'Yes' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                    >
                      {outcome}
                    </div>
                    <div className='text-lg font-bold text-gray-900 dark:text-white mt-1'>{(price * 100).toFixed(1)}¢</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {!isAuthenticated && (
          <div className='bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6'>
            <p className='text-sm text-amber-800 dark:text-amber-300 mb-3'>
              Enable trading to place and manage orders. This signs a one-time message with your wallet.
            </p>
            {authError && <p className='text-sm text-red-500 mb-3'>{authError.message}</p>}
            <button
              onClick={() => authenticate().catch(() => {})}
              disabled={authLoading}
              className='px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50'
            >
              {authLoading ? 'Signing message...' : 'Enable trading'}
            </button>
          </div>
        )}

        {isAuthenticated && (
          <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>Place Order</h3>

            <div className='flex gap-2 mb-4'>
              {(Object.keys(ORDER_SIDE) as OrderSide[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    side === s
                      ? s === ORDER_SIDE.BUY
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {s === ORDER_SIDE.BUY ? 'Buy' : 'Sell'}
                </button>
              ))}
            </div>

            <div className='flex items-center justify-between mb-1'>
              <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>Price</label>
              <span className='text-xs text-gray-500 dark:text-gray-400'>
                {orderBook &&
                  (side === ORDER_SIDE.BUY
                    ? `Best ask ${((orderBook.asks[0]?.price ?? 0) * 100).toFixed(1)}¢`
                    : `Best bid ${((orderBook.bids[0]?.price ?? 0) * 100).toFixed(1)}¢`)}
              </span>
            </div>
            <div className='relative mb-4'>
              <input
                type='number'
                step='0.01'
                min='0.01'
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder='0.50'
                className='w-full px-4 py-2 pr-14 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              />
              <span className='absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400'>USDC</span>
            </div>
            {orderBook && (
              <div className='flex flex-wrap gap-2 mb-4'>
                {side === ORDER_SIDE.BUY
                  ? orderBook.bids.slice(0, 3).map((bid) => (
                      <button
                        key={`bp-${bid.price}`}
                        onClick={() => prefillPrice(String(bid.price))}
                        className='px-2 py-1 text-xs text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      >
                        {bid.price.toFixed(2)}
                      </button>
                    ))
                  : orderBook.asks.slice(0, 3).map((ask) => (
                      <button
                        key={`ap-${ask.price}`}
                        onClick={() => prefillPrice(String(ask.price))}
                        className='px-2 py-1 text-xs text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded hover:bg-red-50 dark:hover:bg-red-900/20'
                      >
                        {ask.price.toFixed(2)}
                      </button>
                    ))}
              </div>
            )}

            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Size</label>
            <div className='relative mb-4'>
              <input
                type='number'
                step='0.01'
                min='0.01'
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder={orderBook ? `${orderBook.minOrderSize}` : '1'}
                className='w-full px-4 py-2 pr-12 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              />
              <span className='absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400'>shares</span>
            </div>

            <div className='flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4 px-1'>
              <span>{side === ORDER_SIDE.BUY ? 'Total cost' : 'Total proceeds'}</span>
              <span className='font-semibold text-gray-900 dark:text-white'>{preview ? `$${preview.total.toFixed(2)}` : '—'}</span>
            </div>

            {orderError && <p className='text-sm text-red-500 mb-4'>{(orderError as Error).message}</p>}
            {orderResult && !orderResult.success && orderResult.errorMsg && <p className='text-sm text-red-500 mb-4'>{orderResult.errorMsg}</p>}
            {orderResult?.success && (
              <p className='text-sm text-green-600 dark:text-green-400 mb-4'>
                Order placed ({orderResult.orderID?.slice(0, 10)}...) — status {orderResult.status}
              </p>
            )}

            <button
              onClick={submit}
              disabled={orderPending || !price || !size}
              className={`w-full px-4 py-3 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                side === ORDER_SIDE.BUY ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {orderPending ? 'Submitting...' : `${side === ORDER_SIDE.BUY ? 'Buy' : 'Sell'} ${outcomeName}`}
            </button>
          </div>
        )}
      </div>

      {orderBook && (
        <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 h-fit'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>Order Book</h3>
          <div className='flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2 px-1'>
            <span>Price</span>
            <span>Size</span>
          </div>

          <div className='space-y-1'>
            {visibleAsks.map((ask, i) => (
              <div key={`ask-${i}`} className='flex items-center justify-between px-2 py-1 rounded bg-red-50/60 dark:bg-red-900/10'>
                <span className='text-sm font-medium text-red-600 dark:text-red-400'>{ask.price.toFixed(2)}</span>
                <span className='text-xs text-gray-500 dark:text-gray-400'>{formatNumber(ask.size)}</span>
              </div>
            ))}
          </div>

          <div className='my-3 px-2 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-center text-sm font-semibold text-gray-900 dark:text-white'>
            Mid: ${orderBook.lastTradePrice?.toFixed(2) ?? '—'}
          </div>

          <div className='space-y-1'>
            {visibleBids.map((bid, i) => (
              <div key={`bid-${i}`} className='flex items-center justify-between px-2 py-1 rounded bg-green-50/60 dark:bg-green-900/10'>
                <span className='text-sm font-medium text-green-600 dark:text-green-400'>{bid.price.toFixed(2)}</span>
                <span className='text-xs text-gray-500 dark:text-gray-400'>{formatNumber(bid.size)}</span>
              </div>
            ))}
          </div>

          <div className='mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex justify-between'>
            <span>Min order: {orderBook.minOrderSize}</span>
            <span>Tick: {orderBook.tickSize}</span>
          </div>
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
