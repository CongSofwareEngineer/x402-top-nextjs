'use client'

import { useMemo, useState } from 'react'

import { usePolymarketMarkets } from '@/hooks/polymarket'
import { type Market } from '@/services/polymarket'
import { MARKET_SORT_PRESETS, PAGINATION, POLYMARKET_CATEGORIES, type MarketSortKey } from '@/constants/polymarket'

interface MarketsTabProps {
  onMarketSelect: (market: Market) => void
}

export function MarketsTab({ onMarketSelect }: MarketsTabProps) {
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined)
  const [sortKey, setSortKey] = useState<MarketSortKey>('trending')
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState('')

  const queryFilters = useMemo(() => {
    const preset = MARKET_SORT_PRESETS.find((p) => p.key === sortKey) ?? MARKET_SORT_PRESETS[0]

    return {
      closed: false,
      limit: PAGINATION.MARKETS_PAGE_SIZE,
      sort: preset.order,
      ascending: preset.ascending,
      tagId: categoryId,
      cursor,
    }
  }, [sortKey, categoryId, cursor])

  const { data, isLoading, error, refetch, isFetching } = usePolymarketMarkets(queryFilters)

  const markets = data?.markets ?? []

  const filteredMarkets = useMemo(() => {
    if (!searchQuery) return markets
    const query = searchQuery.toLowerCase()

    return markets.filter(
      (m) => m.question?.toLowerCase().includes(query) || m.description?.toLowerCase().includes(query) || m.slug?.toLowerCase().includes(query)
    )
  }, [markets, searchQuery])

  const loadMore = () => setCursor(data?.nextCursor)

  if (isLoading && markets.length === 0) {
    return (
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
        {[...Array(8)].map((_, i) => (
          <div key={i} className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse'>
            <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4' />
            <div className='h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2' />
            <div className='h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3' />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className='text-center py-12'>
        <p className='text-red-500'>Failed to load markets: {(error as Error).message}</p>
        <button onClick={() => refetch()} className='mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div className='flex-1 max-w-md'>
          <label className='sr-only'>Search markets</label>
          <div className='relative'>
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search markets...'
              className='w-full px-4 py-2 pl-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            />
            <svg className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
            </svg>
          </div>
        </div>
        <button onClick={() => refetch()} className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2'>
          Refresh
        </button>
      </div>

      <div className='flex flex-wrap gap-2'>
        <FilterChip
          active={!categoryId}
          onClick={() => {
            setCategoryId(undefined)
            setCursor(undefined)
          }}
        >
          All
        </FilterChip>
        {POLYMARKET_CATEGORIES.map((c) => (
          <FilterChip
            key={c.id}
            active={categoryId === c.id}
            onClick={() => {
              setCategoryId(c.id)
              setCursor(undefined)
            }}
          >
            {c.label}
          </FilterChip>
        ))}
      </div>

      <div className='flex flex-wrap gap-2'>
        {MARKET_SORT_PRESETS.map((preset) => (
          <FilterChip
            key={preset.key}
            active={sortKey === preset.key}
            onClick={() => {
              setSortKey(preset.key)
              setCursor(undefined)
            }}
          >
            {preset.label}
          </FilterChip>
        ))}
      </div>

      <div className='text-sm text-gray-500 dark:text-gray-400'>{isFetching ? 'Loading...' : `Showing ${filteredMarkets.length} markets`}</div>

      {filteredMarkets.length === 0 ? (
        <div className='text-center py-12 text-gray-500 dark:text-gray-400'>No markets found matching your criteria.</div>
      ) : (
        <>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
            {filteredMarkets.map((market) => (
              <MarketCard key={market.id} market={market} onClick={() => onMarketSelect(market)} />
            ))}
          </div>
          {data?.nextCursor && (
            <div className='flex justify-center'>
              <button
                onClick={loadMore}
                disabled={isFetching}
                className='px-6 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50'
              >
                {isFetching ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors ${
        active
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
      }`}
    >
      {children}
    </button>
  )
}

function MarketCard({ market, onClick }: { market: Market; onClick: () => void }) {
  const priceYes = market.outcomePrices?.[0] ?? 0
  const priceNo = market.outcomePrices?.[1] ?? 0

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
    if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`

    return `$${num.toFixed(2)}`
  }

  const formatPrice = (price: number) => `${(price * 100).toFixed(1)}¢`

  return (
    <div
      onClick={onClick}
      className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer transition-all hover:shadow-lg'
    >
      <div className='flex items-start justify-between gap-2 mb-3'>
        {market.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={market.image} alt={market.question ?? ''} className='w-12 h-12 rounded-lg object-cover flex-shrink-0' />
        )}
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
            market.active
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          {market.active ? 'Active' : 'Closed'}
        </span>
      </div>

      <h3 className='font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 text-sm'>{market.question}</h3>

      {market.description && <p className='text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2'>{market.description}</p>}

      <div className='grid grid-cols-2 gap-2 mb-4'>
        <div className='bg-green-50 dark:bg-green-900/20 p-2 rounded-lg'>
          <div className='text-xs text-green-700 dark:text-green-400'>YES</div>
          <div className='font-semibold text-green-900 dark:text-green-300'>{formatPrice(priceYes)}</div>
        </div>
        <div className='bg-red-50 dark:bg-red-900/20 p-2 rounded-lg'>
          <div className='text-xs text-red-700 dark:text-red-400'>NO</div>
          <div className='font-semibold text-red-900 dark:text-red-300'>{formatPrice(priceNo)}</div>
        </div>
      </div>

      <div className='flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-3'>
        <span>Vol: {formatNumber(market.volume)}</span>
        {market.endDate && <span>Ends: {new Date(market.endDate).toLocaleDateString()}</span>}
      </div>
    </div>
  )
}
