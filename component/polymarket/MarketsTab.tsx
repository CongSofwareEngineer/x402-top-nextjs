'use client'

import type { TradeSelection } from './TradeTab'

import { useMemo, useState } from 'react'

import { formatCents, formatChance, formatDate, formatVolume } from './format'

import { usePolyMarketEvents } from '@/hooks/polymarket'
import { getEventBySlug, marketLabel, outcomeQuotes, parsePolymarketUrl, yesChance, type Market, type PolyEvent } from '@/services/polymarket'
import {
  EXPIRY_SORT_EXCLUDED_TAG_IDS,
  EXPIRY_SORT_OPTIONS,
  EXPIRY_SORT_ORDER,
  MARKET_SORT_PRESETS,
  MARKETS_PAGE_SIZE,
  POLYMARKET_CATEGORIES,
  type ExpirySortKey,
  type MarketSortKey,
} from '@/constants/polymarket'

interface MarketsTabProps {
  onSelect: (selection: TradeSelection) => void
}

export function MarketsTab({ onSelect }: MarketsTabProps) {
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined)
  const [sortKey, setSortKey] = useState<MarketSortKey>('trending')
  // End-date sort picked from the select — overrides the preset chips while set.
  const [expirySort, setExpirySort] = useState<ExpirySortKey | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [linkError, setLinkError] = useState<string | null>(null)
  const [linkLoading, setLinkLoading] = useState(false)

  const queryFilters = useMemo(() => {
    const preset = MARKET_SORT_PRESETS.find((p) => p.key === sortKey) ?? MARKET_SORT_PRESETS[0]
    const expiry = EXPIRY_SORT_OPTIONS.find((o) => o.key === expirySort)

    return {
      closed: false,
      limit: MARKETS_PAGE_SIZE,
      sort: expiry ? EXPIRY_SORT_ORDER : preset.order,
      ascending: expiry ? expiry.ascending : preset.ascending,
      tagId: categoryId,
      // Skip events already past their end date (still open, awaiting resolution).
      endDateMin: expiry ? new Date().toISOString() : undefined,
      excludeTagIds: expiry ? EXPIRY_SORT_EXCLUDED_TAG_IDS : undefined,
    }
  }, [sortKey, expirySort, categoryId])

  const { data, isLoading, error, refetch, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage } = usePolyMarketEvents(queryFilters)

  const events = useMemo(() => {
    const seen = new Set<string>()

    return (data?.pages ?? []).flatMap((page) => page.events).filter((e) => !seen.has(e.id) && seen.add(e.id))
  }, [data])

  const parsedLink = useMemo(() => parsePolymarketUrl(searchQuery), [searchQuery])

  const filteredEvents = useMemo(() => {
    if (!searchQuery || parsedLink) return events
    const query = searchQuery.toLowerCase()

    return events.filter((e) => e.title.toLowerCase().includes(query) || e.markets.some((m) => m.question?.toLowerCase().includes(query)))
  }, [events, searchQuery, parsedLink])

  const openLink = async () => {
    if (!parsedLink) return
    setLinkError(null)
    setLinkLoading(true)
    try {
      const event = await getEventBySlug(parsedLink.eventSlug)

      if (!event) throw new Error('Event not found')
      const market = event.markets.find((m) => m.slug === parsedLink.marketSlug) ?? event.markets[0]

      if (!market) throw new Error('This event has no open Yes/No market')
      onSelect({ event, marketId: market.id, outcomeIndex: 0 })
    } catch (err) {
      setLinkError((err as Error).message)
    } finally {
      setLinkLoading(false)
    }
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
        <div className='flex-1 max-w-xl'>
          <label className='sr-only'>Search markets</label>
          <div className='relative flex gap-2'>
            <div className='relative flex-1'>
              <input
                type='text'
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setLinkError(null)
                }}
                onKeyDown={(e) => e.key === 'Enter' && openLink()}
                placeholder='Search markets or paste a polymarket.com link...'
                className='w-full px-4 py-2 pl-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              />
              <svg className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
              </svg>
            </div>
            {parsedLink && (
              <button
                onClick={openLink}
                disabled={linkLoading}
                className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50'
              >
                {linkLoading ? 'Opening...' : 'Open'}
              </button>
            )}
          </div>
          {linkError && <p className='text-sm text-red-500 mt-1'>{linkError}</p>}
        </div>
        <button onClick={() => refetch()} className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2'>
          Refresh
        </button>
      </div>

      <div className='flex flex-wrap items-center gap-2'>
        {MARKET_SORT_PRESETS.map((preset) => (
          <FilterChip
            key={preset.key}
            active={!expirySort && sortKey === preset.key}
            onClick={() => {
              setSortKey(preset.key)
              setExpirySort(null)
            }}
          >
            {preset.label}
          </FilterChip>
        ))}
        <select
          aria-label='Sort by end date'
          value={expirySort ?? ''}
          onChange={(e) => setExpirySort((e.target.value as ExpirySortKey) || null)}
          className={`px-3 py-1.5 text-sm font-medium rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            expirySort
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
          }`}
        >
          <option value='' className='bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'>
            End date: Any
          </option>
          {EXPIRY_SORT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key} className='bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'>
              End date: {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className='flex flex-wrap gap-2'>
        <FilterChip active={!categoryId} onClick={() => setCategoryId(undefined)}>
          All
        </FilterChip>
        {POLYMARKET_CATEGORIES.map((c) => (
          <FilterChip key={c.id} active={categoryId === c.id} onClick={() => setCategoryId(c.id)}>
            {c.label}
          </FilterChip>
        ))}
      </div>

      {isLoading ? (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
          {[...Array(8)].map((_, i) => (
            <div key={i} className='h-[180px] bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse'>
              <div className='flex gap-3 mb-6'>
                <div className='w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-md' />
                <div className='flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded mt-2' />
              </div>
              <div className='h-9 bg-gray-200 dark:bg-gray-700 rounded mb-2' />
              <div className='h-9 bg-gray-200 dark:bg-gray-700 rounded' />
            </div>
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className='text-center py-12 text-gray-500 dark:text-gray-400'>
          {parsedLink ? 'Press Open to load this Polymarket event.' : 'No markets found matching your criteria.'}
        </div>
      ) : (
        <>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} onSelect={onSelect} />
            ))}
          </div>
          {hasNextPage && (
            <div className='flex justify-center'>
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className='px-6 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50'
              >
                {isFetchingNextPage ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
      {isFetching && !isLoading && !isFetchingNextPage && <div className='text-center text-xs text-gray-400'>Updating...</div>}
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

function EventCard({ event, onSelect }: { event: PolyEvent; onSelect: (selection: TradeSelection) => void }) {
  const single = event.markets.length === 1
  const firstMarket = event.markets[0]
  const select = (market: Market, outcomeIndex: number) => onSelect({ event, marketId: market.id, outcomeIndex })

  return (
    <div
      onClick={() => select(firstMarket, 0)}
      className='h-[180px] flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 cursor-pointer transition-all hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600'
    >
      <div className='flex items-start gap-3 mb-3'>
        {event.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.image} alt='' className='w-10 h-10 rounded-md object-cover flex-shrink-0' />
        )}
        <h3 className='flex-1 font-semibold text-sm leading-snug text-gray-900 dark:text-white line-clamp-2'>{event.title}</h3>
        {single && <ChanceGauge chance={yesChance(firstMarket)} />}
      </div>

      <div className='flex-1 min-h-0'>
        {single ? (
          <div className='grid grid-cols-2 gap-2 h-full items-end pb-1'>
            <OutcomeButton tone='yes' label='Yes' onClick={() => select(firstMarket, 0)} />
            <OutcomeButton tone='no' label='No' onClick={() => select(firstMarket, 1)} />
          </div>
        ) : (
          <div className='h-full overflow-y-auto space-y-1.5 pr-1'>
            {event.markets.map((market) => {
              const quotes = outcomeQuotes(market, 'BUY')

              return (
                <div key={market.id} className='flex items-center gap-2 text-sm'>
                  <span className='flex-1 truncate text-gray-700 dark:text-gray-300'>{marketLabel(market)}</span>
                  <span className='font-semibold text-gray-900 dark:text-white w-10 text-right'>{formatChance(yesChance(market))}</span>
                  <OutcomeButton tone='yes' label='Yes' compact title={formatCents(quotes.yes)} onClick={() => select(market, 0)} />
                  <OutcomeButton tone='no' label='No' compact title={formatCents(quotes.no)} onClick={() => select(market, 1)} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className='flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-4'>
        <span>{formatVolume(event.volume)} Vol.</span>
        {event.endDate && <span className='text-orange-500'>Ends {formatDate(event.endDate)}</span>}
      </div>
    </div>
  )
}

function OutcomeButton({
  tone,
  label,
  title,
  compact,
  onClick,
}: {
  tone: 'yes' | 'no'
  label: string
  title?: string
  compact?: boolean
  onClick: () => void
}) {
  const color =
    tone === 'yes'
      ? 'bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white dark:text-green-400'
      : 'bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white dark:text-red-400'

  return (
    <button
      title={title}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`${color} rounded-md font-medium transition-colors ${compact ? 'px-2 py-0.5 text-xs' : 'py-2 text-sm w-full'}`}
    >
      {label}
    </button>
  )
}

function ChanceGauge({ chance }: { chance: number }) {
  const radius = 22
  const circumference = Math.PI * radius
  const color = chance >= 0.5 ? '#22c55e' : '#ef4444'

  return (
    <div className='relative w-14 h-9 flex-shrink-0 flex flex-col items-center'>
      <svg viewBox='0 0 52 30' className='w-14 h-8'>
        <path d='M4 28 A22 22 0 0 1 48 28' fill='none' stroke='currentColor' strokeWidth='4' className='text-gray-200 dark:text-gray-700' />
        <path
          d='M4 28 A22 22 0 0 1 48 28'
          fill='none'
          stroke={color}
          strokeWidth='4'
          strokeDasharray={`${circumference * chance} ${circumference}`}
        />
      </svg>
      <span className='absolute top-3 text-xs font-bold text-gray-900 dark:text-white'>{formatChance(chance)}</span>
      <span className='text-[10px] leading-none text-gray-500 dark:text-gray-400'>chance</span>
    </div>
  )
}
