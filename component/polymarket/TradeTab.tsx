'use client'

import type { Market, MarketOrderInput, MarketQuote, OrderBook, OrderSide, PolyEvent } from '@/services/polymarket'

import { useState } from 'react'

import { formatCents, formatChance, formatDateTime, formatUsd, formatVolumeFull } from './format'

import { usePlaceMarketOrder, usePolymarketOnboarding, usePolyMarketEvent, usePolyMarketOrderBook, usePolyMarketPositions } from '@/hooks/polymarket'
import { SLIPPAGE_OPTIONS } from '@/constants/polymarket'
import {
  ceil2,
  floor2,
  MARKET_ORDER_SLIPPAGE,
  MIN_MARKET_ORDER_USD,
  marketLabel,
  ONBOARDING_STEP,
  ORDER_SIDE,
  outcomeQuotes,
  prepareMarketOrder,
  quoteMarketOrder,
  quoteSellShares,
  slippagePrice,
  yesChance,
} from '@/services/polymarket'

export interface TradeSelection {
  event: PolyEvent
  marketId: string
  /** 0 = Yes, 1 = No. */
  outcomeIndex: number
}

const BUY_PRESETS = [1, 5, 10, 100]
const SELL_PRESETS = [0.25, 0.5]

export function TradeTab({ selection }: { selection: TradeSelection }) {
  const { data: freshEvent } = usePolyMarketEvent(selection.event.slug, selection.event)
  const event = freshEvent ?? selection.event

  const [marketId, setMarketId] = useState(selection.marketId)
  const [outcomeIndex, setOutcomeIndex] = useState(selection.outcomeIndex)
  const [side, setSide] = useState<OrderSide>(ORDER_SIDE.BUY)
  const [amount, setAmount] = useState('')
  const [sellAll, setSellAll] = useState(false)
  const [slippage, setSlippage] = useState(MARKET_ORDER_SLIPPAGE)
  const [formError, setFormError] = useState<string | null>(null)

  const market = event.markets.find((m) => m.id === marketId) ?? selection.event.markets.find((m) => m.id === marketId) ?? event.markets[0]
  const tokenId = market?.clobTokenIds[outcomeIndex]
  const outcomeName = outcomeIndex === 0 ? 'Yes' : 'No'

  const { data: orderBook, refetch: refetchBook } = usePolyMarketOrderBook(tokenId)
  const { data: positions } = usePolyMarketPositions()
  const { currentStep } = usePolymarketOnboarding()
  const { mutate: placeOrder, isPending: orderPending, error: orderError, data: orderResult, reset: resetOrder } = usePlaceMarketOrder()

  const heldShares = positions?.find((p) => p.tokenId === tokenId)?.currentSize ?? 0
  const usd = parseFloat(amount)
  const input = toOrderInput(side, usd, sellAll, positions ? heldShares : undefined)
  const quote = quoteMarketOrder(orderBook, input)

  const changeAmount = (value: string) => {
    setAmount(value)
    setSellAll(false)
    setFormError(null)
  }

  const choose = (nextMarketId: string, nextOutcome: number, nextSide: OrderSide = side) => {
    setMarketId(nextMarketId)
    setOutcomeIndex(nextOutcome)
    setSide(nextSide)
    setSellAll(false)
    setFormError(null)
    resetOrder()
  }

  const sellPreset = (fraction: number) => {
    if (!orderBook || heldShares <= 0) return
    const value = quoteSellShares(orderBook.bids, heldShares * fraction).usd

    setAmount(floor2(value).toFixed(2))
    setSellAll(fraction === 1)
    setFormError(null)
  }

  const submit = async () => {
    setFormError(null)
    if (!tokenId) return

    // Re-quote against a fresh book so the price limit matches what fills now.
    const { data: book } = await refetchBook()
    const prepared = prepareMarketOrder(tokenId, book ?? orderBook, input, slippage)

    if ('error' in prepared) return setFormError(prepared.error)
    placeOrder(prepared.order, { onSuccess: () => setAmount('') })
  }

  if (!market || !tokenId) {
    return <div className='text-center py-12 text-gray-500 dark:text-gray-400'>This event has no open Yes/No market.</div>
  }

  const quotes = outcomeQuotes(market, side)
  const isBuy = side === ORDER_SIDE.BUY
  // Same rule as `prepareMarketOrder` (amount truncated to cents) — surfaced before submit.
  const belowMinBuy = isBuy && usd > 0 && floor2(usd) < MIN_MARKET_ORDER_USD

  return (
    <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto'>
      <div className='lg:col-span-2 space-y-6'>
        <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6'>
          <div className='flex items-start gap-4'>
            {event.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.image} alt='' className='w-16 h-16 rounded-lg object-cover flex-shrink-0' />
            )}
            <div className='flex-1'>
              <h2 className='text-xl font-bold text-gray-900 dark:text-white'>{event.title}</h2>
              <div className='flex flex-wrap gap-x-4 text-sm text-gray-500 dark:text-gray-400 mt-1'>
                <span>{formatVolumeFull(event.volume)} Vol.</span>
                {(market.endDate || event.endDate) && <span>Ends {formatDateTime((market.endDate || event.endDate)!)}</span>}
              </div>
            </div>
          </div>

          {event.markets.length > 1 && (
            <div className='mt-6 divide-y divide-gray-100 dark:divide-gray-700'>
              {event.markets.map((m) => (
                <MarketRow
                  key={m.id}
                  market={m}
                  selected={m.id === market.id}
                  selectedOutcome={outcomeIndex}
                  onChoose={(i) => choose(m.id, i, ORDER_SIDE.BUY)}
                />
              ))}
            </div>
          )}
        </div>

        {orderBook && <OrderBookPanel orderBook={orderBook} outcomeName={outcomeName} />}
      </div>

      <div className='lg:sticky lg:top-24 h-fit bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5'>
        <div className='flex items-center gap-3 mb-4'>
          {(market.image || event.image) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={market.image || event.image || ''} alt='' className='w-10 h-10 rounded-md object-cover' />
          )}
          <span className='text-sm font-semibold text-gray-900 dark:text-white line-clamp-2'>
            {event.markets.length > 1 ? marketLabel(market) : market.question}
          </span>
        </div>

        <div className='flex gap-4 border-b border-gray-200 dark:border-gray-700 mb-4'>
          {(Object.keys(ORDER_SIDE) as OrderSide[]).map((s) => (
            <button
              key={s}
              onClick={() => choose(market.id, outcomeIndex, s)}
              className={`pb-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                side === s ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white' : 'border-transparent text-gray-500'
              }`}
            >
              {s === ORDER_SIDE.BUY ? 'Buy' : 'Sell'}
            </button>
          ))}
        </div>

        <div className='grid grid-cols-2 gap-2 mb-5'>
          {[quotes.yes, quotes.no].map((price, i) => {
            const selected = i === outcomeIndex
            const tone = i === 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'

            return (
              <button
                key={i}
                onClick={() => choose(market.id, i)}
                className={`py-3 rounded-lg text-sm font-semibold transition-colors ${
                  selected ? tone : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {i === 0 ? 'Yes' : 'No'} {formatCents(price)}
              </button>
            )
          })}
        </div>

        {currentStep !== ONBOARDING_STEP.DONE ? (
          <div className='bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4'>
            <p className='text-sm text-amber-800 dark:text-amber-300'>Create your wallet in the Profile tab to place orders.</p>
          </div>
        ) : (
          <>
            <div className='flex items-center justify-between mb-2'>
              <div>
                <div className='text-sm font-medium text-gray-900 dark:text-white'>Amount</div>
                {isBuy && <div className='text-xs text-gray-500 dark:text-gray-400'>Min. {formatUsd(MIN_MARKET_ORDER_USD)}</div>}
                {!isBuy && (
                  <div className='text-xs text-gray-500 dark:text-gray-400'>
                    You hold {heldShares.toFixed(2)} {outcomeName}
                  </div>
                )}
              </div>
              <div className='relative w-40'>
                <span className='absolute left-3 top-1/2 -translate-y-1/2 text-2xl font-semibold text-gray-400'>$</span>
                <input
                  type='number'
                  inputMode='decimal'
                  min='0'
                  step='0.01'
                  value={amount}
                  onChange={(e) => changeAmount(e.target.value)}
                  placeholder='0'
                  className='w-full pl-8 pr-2 py-1 text-right text-3xl font-semibold bg-transparent text-gray-900 dark:text-white focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none'
                />
              </div>
            </div>

            <div className='flex justify-end gap-2 mb-5'>
              {isBuy
                ? BUY_PRESETS.map((v) => (
                    <PresetButton key={v} onClick={() => changeAmount(String(floor2((Number.isFinite(usd) ? usd : 0) + v)))}>
                      +${v}
                    </PresetButton>
                  ))
                : SELL_PRESETS.map((f) => (
                    <PresetButton key={f} onClick={() => sellPreset(f)} disabled={heldShares <= 0}>
                      {f * 100}%
                    </PresetButton>
                  ))}
              <PresetButton onClick={() => (isBuy ? changeAmount('') : sellPreset(1))} disabled={!isBuy && heldShares <= 0}>
                {isBuy ? 'Clear' : 'Max'}
              </PresetButton>
            </div>

            <div className='flex items-center justify-between mb-4'>
              <span className='text-sm text-gray-500 dark:text-gray-400'>Slippage</span>
              <div className='flex gap-2'>
                {SLIPPAGE_OPTIONS.map((s) => (
                  <PresetButton key={s} active={slippage === s} onClick={() => setSlippage(s)}>
                    {s * 100}%
                  </PresetButton>
                ))}
              </div>
            </div>

            <QuoteSummary quote={quote} side={side} slippage={slippage} tickSize={orderBook?.tickSize} />

            {belowMinBuy && <p className='text-sm text-amber-600 mb-3'>Minimum buy amount is {formatUsd(MIN_MARKET_ORDER_USD)}.</p>}
            {formError && <p className='text-sm text-red-500 mb-3'>{formError}</p>}
            {orderError && <p className='text-sm text-red-500 mb-3 break-words'>{orderError.message}</p>}
            {orderResult && (
              <p className='text-sm text-green-600 dark:text-green-400 mb-3'>
                Order filled ({orderResult.orderId.slice(0, 10)}...) — status {orderResult.status}
              </p>
            )}

            <button
              onClick={submit}
              disabled={orderPending || !quote || belowMinBuy}
              className={`w-full px-4 py-3 rounded-lg text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${
                outcomeIndex === 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {orderPending ? 'Submitting...' : `${isBuy ? 'Buy' : 'Sell'} ${outcomeName}`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/** BUY spends `usd`; SELL receives `usd`, or dumps every held share (`sellAll`). */
function toOrderInput(side: OrderSide, usd: number, sellAll: boolean, heldShares: number | undefined): MarketOrderInput {
  const amount = Number.isFinite(usd) ? usd : 0

  if (side === ORDER_SIDE.BUY) return { side: ORDER_SIDE.BUY, usd: amount }
  if (sellAll) return { side: ORDER_SIDE.SELL, shares: floor2(heldShares ?? 0), heldShares }

  return { side: ORDER_SIDE.SELL, usd: amount, heldShares }
}

function QuoteSummary({
  quote,
  side,
  slippage,
  tickSize,
}: {
  quote: MarketQuote | null
  side: OrderSide
  slippage: number
  tickSize: number | undefined
}) {
  const isBuy = side === ORDER_SIDE.BUY
  // Worst price the order accepts — same limit `prepareMarketOrder` sends.
  const limit = quote && tickSize ? slippagePrice(quote.worstPrice, tickSize, side, slippage) : null
  const rows = quote
    ? isBuy
      ? [
          ['Avg. price', formatCents(quote.avgPrice)],
          ['Shares', quote.shares.toFixed(2)],
          ['Potential return', `${(((quote.shares - quote.usd) / quote.usd) * 100).toFixed(0)}%`],
          ...(limit
            ? [
                [`Max price (${slippage * 100}% slippage)`, formatCents(limit)],
                ['Min. shares', (quote.usd / limit).toFixed(2)],
              ]
            : []),
        ]
      : [
          ['Avg. price', formatCents(quote.avgPrice)],
          ['Shares to sell', ceil2(quote.shares).toFixed(2)],
          ...(limit
            ? [
                [`Min price (${slippage * 100}% slippage)`, formatCents(limit)],
                ['Min. received', formatUsd(ceil2(quote.shares) * limit)],
              ]
            : []),
        ]
    : []

  return (
    <div className='mb-4 space-y-1.5 text-sm'>
      {rows.map(([label, value]) => (
        <div key={label} className='flex justify-between text-gray-500 dark:text-gray-400'>
          <span>{label}</span>
          <span className='text-gray-900 dark:text-white'>{value}</span>
        </div>
      ))}
      <div className='flex justify-between items-baseline pt-1'>
        <span className='font-medium text-gray-900 dark:text-white'>{isBuy ? 'To win 💵' : "You'll receive"}</span>
        <span className='text-2xl font-bold text-green-600 dark:text-green-400'>{quote ? formatUsd(isBuy ? quote.shares : quote.usd) : '$0.00'}</span>
      </div>
      {quote && !quote.filled && <p className='text-xs text-amber-600'>Order book depth is not enough for the full amount.</p>}
    </div>
  )
}

function PresetButton({
  onClick,
  disabled,
  active,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-2.5 py-1 text-xs font-medium rounded-md border disabled:opacity-40 ${
        active
          ? 'bg-blue-600 text-white border-blue-600'
          : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      {children}
    </button>
  )
}

function MarketRow({
  market,
  selected,
  selectedOutcome,
  onChoose,
}: {
  market: Market
  selected: boolean
  selectedOutcome: number
  onChoose: (outcomeIndex: number) => void
}) {
  const quotes = outcomeQuotes(market, 'BUY')
  const active = (i: number) => selected && selectedOutcome === i

  return (
    <div className={`flex items-center gap-3 py-3 px-2 rounded-lg ${selected ? 'bg-gray-50 dark:bg-gray-900/40' : ''}`}>
      <div className='flex-1 min-w-0'>
        <div className='font-medium text-gray-900 dark:text-white truncate'>{marketLabel(market)}</div>
        <div className='text-xs text-gray-500 dark:text-gray-400'>
          {formatVolumeFull(market.volume)} Vol.{market.endDate && ` · Ends ${formatDateTime(market.endDate)}`}
        </div>
      </div>
      <div className='text-xl font-bold text-gray-900 dark:text-white w-16 text-right'>{formatChance(yesChance(market))}</div>
      <button
        onClick={() => onChoose(0)}
        className={`w-28 py-2 rounded-lg text-sm font-medium transition-colors ${
          active(0) ? 'bg-green-500 text-white' : 'bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20'
        }`}
      >
        Buy Yes {formatCents(quotes.yes)}
      </button>
      <button
        onClick={() => onChoose(1)}
        className={`w-28 py-2 rounded-lg text-sm font-medium transition-colors ${
          active(1) ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20'
        }`}
      >
        Buy No {formatCents(quotes.no)}
      </button>
    </div>
  )
}

function OrderBookPanel({ orderBook, outcomeName }: { orderBook: OrderBook; outcomeName: string }) {
  const asks = [...orderBook.asks]
    .sort((a, b) => a.price - b.price)
    .slice(0, 6)
    .reverse()
  const bids = [...orderBook.bids].sort((a, b) => b.price - a.price).slice(0, 6)
  const spread = asks.length && bids.length ? asks[asks.length - 1].price - bids[0].price : undefined

  return (
    <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6'>
      <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>Order Book · Trade {outcomeName}</h3>
      <div className='grid grid-cols-3 text-xs text-gray-500 dark:text-gray-400 mb-2 px-2'>
        <span>Price</span>
        <span className='text-right'>Shares</span>
        <span className='text-right'>Total</span>
      </div>

      <div className='space-y-1'>
        {asks.map((ask, i) => (
          <BookRow key={`ask-${i}`} level={ask} tone='ask' />
        ))}
      </div>

      <div className='my-2 px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 flex justify-between border-y border-gray-100 dark:border-gray-700'>
        <span>Last: {orderBook.lastTradePrice != null ? formatCents(orderBook.lastTradePrice) : '—'}</span>
        <span>Spread: {spread != null ? formatCents(spread) : '—'}</span>
      </div>

      <div className='space-y-1'>
        {bids.map((bid, i) => (
          <BookRow key={`bid-${i}`} level={bid} tone='bid' />
        ))}
      </div>
    </div>
  )
}

function BookRow({ level, tone }: { level: { price: number; size: number }; tone: 'ask' | 'bid' }) {
  return (
    <div
      className={`grid grid-cols-3 px-2 py-1 rounded text-sm ${tone === 'ask' ? 'bg-red-50/60 dark:bg-red-900/10' : 'bg-green-50/60 dark:bg-green-900/10'}`}
    >
      <span className={`font-medium ${tone === 'ask' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
        {formatCents(level.price)}
      </span>
      <span className='text-right text-gray-600 dark:text-gray-300'>{level.size.toFixed(2)}</span>
      <span className='text-right text-gray-500 dark:text-gray-400'>{formatUsd(level.price * level.size)}</span>
    </div>
  )
}
