'use client'

import type { Position } from '@/services/polymarket'

import { Fragment, useMemo, useState } from 'react'

import { formatCents, formatUsd } from './format'

import { usePolyMarketClosedPositions, usePolyMarketOrderBook, usePolyMarketPositions, useRedeemPositions, useSellPosition } from '@/hooks/polymarket'
import { quoteSellShares } from '@/services/polymarket'

type PositionsTab = 'active' | 'claim' | 'closed'

const SELL_PRESETS = [
  { label: '25%', fraction: 0.25 },
  { label: '50%', fraction: 0.5 },
  { label: 'Max', fraction: 1 },
]

const floor2 = (value: number) => Math.floor(value * 100 + 1e-9) / 100

const formatSignedUsd = (value: number) => `${value >= 0 ? '+' : '-'}${formatUsd(Math.abs(value))}`

const pnlClass = (value: number) => (value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')

const thClass = 'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap'

/**
 * Account positions:
 * - Active — markets still trading; each can be sold back to the book (cash out).
 * - Claim  — resolved markets; winning shares are redeemed 1:1 for pUSD.
 * - Closed — fully sold or redeemed positions (realized P&L).
 *
 * `canTrade` = onboarding finished (CLOB credentials + approvals), required to sell/redeem.
 */
export function PositionsPanel({ canTrade }: { canTrade: boolean }) {
  const [tab, setTab] = useState<PositionsTab>('active')
  const { data: positions = [], isLoading } = usePolyMarketPositions()
  const { data: closed = [], isLoading: closedLoading } = usePolyMarketClosedPositions()
  const redeem = useRedeemPositions()

  const active = positions.filter((p) => !p.redeemable)
  const resolved = positions.filter((p) => p.redeemable)
  const winnings = resolved.filter((p) => p.currentValue > 0)
  const claimableUsd = winnings.reduce((sum, p) => sum + p.currentValue, 0)

  const tabs: { id: PositionsTab; label: string; count?: number }[] = [
    { id: 'active', label: 'Active', count: active.length },
    { id: 'claim', label: 'Claim', count: resolved.length },
    { id: 'closed', label: 'Closed' },
  ]

  const claimAll = () => redeem.mutate(winnings.map((p) => p.conditionId))

  return (
    <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
      <div className='p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 space-y-4'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>Positions</h3>
          <div className='flex gap-1 bg-gray-100 dark:bg-gray-900 rounded-lg p-1 self-start'>
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {t.label}
                {!!t.count && <span className='ml-1.5 text-xs text-gray-400'>{t.count}</span>}
              </button>
            ))}
          </div>
        </div>

        {claimableUsd > 0 && (
          <div className='flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4'>
            <div className='flex-1'>
              <p className='font-medium text-green-800 dark:text-green-300'>You have {formatUsd(claimableUsd)} to claim</p>
              <p className='text-sm text-green-700/80 dark:text-green-400/80'>
                {winnings.length} resolved {winnings.length === 1 ? 'prediction' : 'predictions'} won. Claiming redeems your winning shares for pUSD.
              </p>
            </div>
            <button
              onClick={claimAll}
              disabled={!canTrade || redeem.isPending}
              className='px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0'
            >
              {redeem.isPending ? 'Claiming...' : 'Claim all'}
            </button>
          </div>
        )}
        {redeem.error && <p className='text-sm text-red-500 break-words'>{redeem.error.message}</p>}
        {!canTrade && positions.length > 0 && (
          <p className='text-sm text-orange-600 dark:text-orange-400'>Finish setting up your account above to sell or claim positions.</p>
        )}
      </div>

      {tab === 'active' && <ActivePositions positions={active} isLoading={isLoading} canTrade={canTrade} />}
      {tab === 'claim' && <ResolvedPositions positions={resolved} isLoading={isLoading} canTrade={canTrade} redeem={redeem} />}
      {tab === 'closed' && <ClosedPositions positions={closed} isLoading={closedLoading} />}
    </div>
  )
}

function ActivePositions({ positions, isLoading, canTrade }: { positions: Position[]; isLoading: boolean; canTrade: boolean }) {
  const [sellingTokenId, setSellingTokenId] = useState<string | null>(null)

  if (isLoading) return <EmptyRow text='Loading positions...' />
  if (positions.length === 0) return <EmptyRow text='No active positions.' />

  return (
    <div className='overflow-x-auto'>
      <table className='w-full'>
        <thead className='bg-gray-50 dark:bg-gray-800/50'>
          <tr>
            <th className={thClass}>Market</th>
            <th className={thClass}>Avg → Now</th>
            <th className={thClass}>Shares</th>
            <th className={thClass}>Value</th>
            <th className={thClass}>P&L</th>
            <th className={thClass} />
          </tr>
        </thead>
        <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
          {positions.map((position) => {
            const isSelling = sellingTokenId === position.tokenId

            return (
              <Fragment key={position.tokenId}>
                <tr className='hover:bg-gray-50 dark:hover:bg-gray-800/50'>
                  <td className='px-4 py-4'>
                    <MarketCell position={position} />
                  </td>
                  <td className='px-4 py-4 text-sm text-gray-900 dark:text-white whitespace-nowrap'>
                    {formatCents(position.avgPrice)} → {formatCents(position.currentPrice)}
                  </td>
                  <td className='px-4 py-4 text-sm text-gray-900 dark:text-white'>{position.currentSize.toFixed(2)}</td>
                  <td className='px-4 py-4 text-sm text-gray-900 dark:text-white'>{formatUsd(position.currentValue)}</td>
                  <td className='px-4 py-4 text-sm whitespace-nowrap'>
                    <span className={`font-medium ${pnlClass(position.totalPnl)}`}>{formatSignedUsd(position.totalPnl)}</span>
                    <span className='block text-xs text-gray-400'>{position.percentPnl.toFixed(2)}%</span>
                  </td>
                  <td className='px-4 py-4 text-right'>
                    <button
                      onClick={() => setSellingTokenId(isSelling ? null : position.tokenId)}
                      disabled={!canTrade}
                      className='px-3 py-1.5 text-sm font-medium rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed'
                    >
                      {isSelling ? 'Close' : 'Sell'}
                    </button>
                  </td>
                </tr>
                {isSelling && (
                  <tr>
                    <td colSpan={6} className='px-4 pb-4 bg-gray-50 dark:bg-gray-900/40'>
                      <SellForm position={position} onDone={() => setSellingTokenId(null)} />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** Market SELL of an active position against the current bids (cash out). */
function SellForm({ position, onDone }: { position: Position; onDone: () => void }) {
  const heldShares = floor2(position.currentSize)
  const [amount, setAmount] = useState(String(heldShares))
  const [formError, setFormError] = useState<string | null>(null)

  const { data: book, isLoading: bookLoading, refetch: refetchBook } = usePolyMarketOrderBook(position.tokenId)
  const sell = useSellPosition()

  const shares = floor2(parseFloat(amount) || 0)
  const quote = useMemo(() => (book && shares > 0 ? quoteSellShares(book.bids, shares) : null), [book, shares])

  const submit = async () => {
    setFormError(null)
    if (shares <= 0) return setFormError('Enter the number of shares to sell.')
    if (shares > heldShares) return setFormError(`You only hold ${heldShares} shares.`)

    const { data: freshBook } = await refetchBook()
    const fresh = quoteSellShares((freshBook ?? book)?.bids ?? [], shares)

    if (fresh.shares <= 0) return setFormError('No buyers for this outcome right now.')
    if (!fresh.filled) return setFormError(`Not enough liquidity — only ${floor2(fresh.shares)} shares can be sold right now.`)

    // Never fill below the worst bid we quoted against.
    sell.mutate({ tokenId: position.tokenId, shares, minPrice: fresh.worstPrice })
  }

  if (sell.isSuccess) {
    const sold = Number(sell.data.makingAmount)
    const received = Number(sell.data.takingAmount)

    return (
      <div className='flex flex-col sm:flex-row sm:items-center gap-3 pt-4'>
        <p className='flex-1 text-sm text-green-700 dark:text-green-400'>
          {sold > 0 ? `Sold ${sold.toFixed(2)} shares for ${formatUsd(received)}.` : 'Order placed but nothing was filled.'}
        </p>
        <button onClick={onDone} className='px-3 py-1.5 text-sm rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'>
          Done
        </button>
      </div>
    )
  }

  return (
    <div className='pt-4 space-y-3'>
      <div className='flex flex-col sm:flex-row sm:items-end gap-3'>
        <div className='flex-1'>
          <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
            Shares to sell (held: {heldShares}) · {position.outcome}
          </label>
          <input
            type='number'
            min={0}
            step='0.01'
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              setFormError(null)
            }}
            className='w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent'
          />
        </div>
        <div className='flex gap-2'>
          {SELL_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => setAmount(String(floor2(heldShares * preset.fraction)))}
              className='px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className='flex flex-col sm:flex-row sm:items-center gap-3'>
        <div className='flex-1 text-sm text-gray-600 dark:text-gray-300'>
          {bookLoading ? (
            'Loading order book...'
          ) : quote && quote.shares > 0 ? (
            <>
              You receive ≈ <span className='font-semibold text-gray-900 dark:text-white'>{formatUsd(quote.usd)}</span>
              <span className='text-gray-400'> · avg {formatCents(quote.avgPrice)}</span>
              {!quote.filled && (
                <span className='block text-orange-600 dark:text-orange-400'>Only {floor2(quote.shares)} shares can be filled now.</span>
              )}
            </>
          ) : (
            <span className='text-orange-600 dark:text-orange-400'>No bids on the order book.</span>
          )}
        </div>
        <button
          onClick={submit}
          disabled={sell.isPending || shares <= 0}
          className='px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {sell.isPending ? 'Selling...' : `Sell ${shares || ''} ${position.outcome ?? ''}`.trim()}
        </button>
      </div>

      {(formError || sell.error) && <p className='text-sm text-red-500 break-words'>{formError ?? sell.error?.message}</p>}
    </div>
  )
}

function ResolvedPositions({
  positions,
  isLoading,
  canTrade,
  redeem,
}: {
  positions: Position[]
  isLoading: boolean
  canTrade: boolean
  redeem: ReturnType<typeof useRedeemPositions>
}) {
  if (isLoading) return <EmptyRow text='Loading positions...' />
  if (positions.length === 0) return <EmptyRow text='Nothing to claim. Resolved predictions show up here.' />

  const pendingIds = redeem.isPending ? (redeem.variables ?? []) : []

  return (
    <div className='overflow-x-auto'>
      <table className='w-full'>
        <thead className='bg-gray-50 dark:bg-gray-800/50'>
          <tr>
            <th className={thClass}>Market</th>
            <th className={thClass}>Shares</th>
            <th className={thClass}>Cost</th>
            <th className={thClass}>Result</th>
            <th className={thClass} />
          </tr>
        </thead>
        <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
          {positions.map((position) => {
            const won = position.currentValue > 0
            const pending = pendingIds.includes(position.conditionId)

            return (
              <tr key={position.tokenId} className='hover:bg-gray-50 dark:hover:bg-gray-800/50'>
                <td className='px-4 py-4'>
                  <MarketCell position={position} />
                </td>
                <td className='px-4 py-4 text-sm text-gray-900 dark:text-white'>{position.currentSize.toFixed(2)}</td>
                <td className='px-4 py-4 text-sm text-gray-900 dark:text-white'>{formatUsd(position.totalCostUsdc)}</td>
                <td className='px-4 py-4 text-sm whitespace-nowrap'>
                  {won ? (
                    <span className='font-medium text-green-600 dark:text-green-400'>Won {formatUsd(position.currentValue)}</span>
                  ) : (
                    <span className='font-medium text-red-600 dark:text-red-400'>Lost</span>
                  )}
                </td>
                <td className='px-4 py-4 text-right'>
                  <button
                    onClick={() => redeem.mutate([position.conditionId])}
                    disabled={!canTrade || redeem.isPending}
                    title={won ? 'Redeem winning shares for pUSD' : 'Redeem the losing shares (no payout) to clear this position'}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                      won
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {pending ? 'Claiming...' : won ? 'Claim' : 'Clear'}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ClosedPositions({ positions, isLoading }: { positions: Position[]; isLoading: boolean }) {
  if (isLoading) return <EmptyRow text='Loading positions...' />
  if (positions.length === 0) return <EmptyRow text='No closed positions yet.' />

  return (
    <div className='overflow-x-auto'>
      <table className='w-full'>
        <thead className='bg-gray-50 dark:bg-gray-800/50'>
          <tr>
            <th className={thClass}>Market</th>
            <th className={thClass}>Avg price</th>
            <th className={thClass}>Total bought</th>
            <th className={thClass}>Cost</th>
            <th className={thClass}>Realized P&L</th>
          </tr>
        </thead>
        <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
          {positions.map((position) => (
            <tr key={position.tokenId} className='hover:bg-gray-50 dark:hover:bg-gray-800/50'>
              <td className='px-4 py-4'>
                <MarketCell position={position} />
              </td>
              <td className='px-4 py-4 text-sm text-gray-900 dark:text-white'>{formatCents(position.avgPrice)}</td>
              <td className='px-4 py-4 text-sm text-gray-900 dark:text-white'>{position.totalSize.toFixed(2)}</td>
              <td className='px-4 py-4 text-sm text-gray-900 dark:text-white'>{formatUsd(position.totalCostUsdc)}</td>
              <td className={`px-4 py-4 text-sm font-medium whitespace-nowrap ${pnlClass(position.realizedPnl)}`}>
                {formatSignedUsd(position.realizedPnl)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MarketCell({ position }: { position: Position }) {
  const isPositive = position.outcomeIndex === 0

  return (
    <div className='flex items-center gap-3 min-w-[220px] max-w-sm'>
      {position.icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={position.icon} alt='' className='w-9 h-9 rounded-md object-cover flex-shrink-0' />
      ) : (
        <div className='w-9 h-9 rounded-md bg-gray-100 dark:bg-gray-700 flex-shrink-0' />
      )}
      <div className='min-w-0'>
        <a
          href={position.eventSlug ? `https://polymarket.com/event/${position.eventSlug}` : undefined}
          target='_blank'
          rel='noreferrer'
          className='block text-sm font-medium text-gray-900 dark:text-white truncate hover:underline'
        >
          {position.title}
        </a>
        <span
          className={`inline-block mt-0.5 px-2 py-0.5 text-xs font-medium rounded-full ${
            isPositive
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}
        >
          {position.outcome}
        </span>
      </div>
    </div>
  )
}

function EmptyRow({ text }: { text: string }) {
  return <div className='p-8 text-center text-sm text-gray-500 dark:text-gray-400'>{text}</div>
}
