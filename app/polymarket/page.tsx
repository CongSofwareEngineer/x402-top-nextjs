'use client'

import type { ActivityItem, PolyEvent } from '@/services/polymarket'

import { useState } from 'react'

import { PolymarketLayout, type TabType } from '@/component/polymarket/PolymarketLayout'
import { MarketsTab } from '@/component/polymarket/MarketsTab'
import { TradeTab, type TradeSelection } from '@/component/polymarket/TradeTab'
import { ProfileTab } from '@/component/polymarket/ProfileTab'
import { HistoryTab } from '@/component/polymarket/HistoryTab'
import { usePolyMarketEvent } from '@/hooks/polymarket'

const PolyMarketPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>('markets')
  const [selection, setSelection] = useState<TradeSelection | null>(null)
  // History rows only carry the event slug + token — the event is fetched before trading.
  const [historyTrade, setHistoryTrade] = useState<ActivityItem | null>(null)

  const { data: historyEvent, isLoading: historyEventLoading } = usePolyMarketEvent(activeTab === 'trade' ? historyTrade?.eventSlug : undefined)

  const handleSelect = (next: TradeSelection) => {
    setHistoryTrade(null)
    setSelection(next)
    setActiveTab('trade')
  }

  const handleTradeFromHistory = (item: ActivityItem) => {
    setHistoryTrade(item)
    setActiveTab('trade')
  }

  const historySelection = historyTrade && historyEvent ? toTradeSelection(historyEvent, historyTrade) : null
  const tradeSelection = historyTrade ? historySelection : selection

  return (
    <PolymarketLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'markets' && <MarketsTab onSelect={handleSelect} />}
      {activeTab === 'trade' &&
        (tradeSelection ? (
          <TradeTab key={`${tradeSelection.event.id}-${tradeSelection.marketId}-${tradeSelection.outcomeIndex}`} selection={tradeSelection} />
        ) : historyTrade && historyEventLoading ? (
          <div className='py-12 text-center'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto' />
            <p className='mt-2 text-gray-500 dark:text-gray-400'>Loading market...</p>
          </div>
        ) : historyTrade ? (
          <div className='text-center py-12 text-gray-500 dark:text-gray-400'>
            <p className='font-medium text-gray-900 dark:text-white'>{historyTrade.title}</p>
            <p className='mt-1'>This market is no longer open for trading.</p>
          </div>
        ) : (
          <div className='text-center py-12 text-gray-500 dark:text-gray-400'>Select a market from the Markets tab to start trading.</div>
        ))}
      {activeTab === 'profile' && <ProfileTab />}
      {activeTab === 'history' && <HistoryTab onTrade={handleTradeFromHistory} />}
    </PolymarketLayout>
  )
}

/** Locate the activity's market/outcome inside its event — by outcome token, else by market slug. */
function toTradeSelection(event: PolyEvent, item: ActivityItem): TradeSelection | null {
  const byToken = item.tokenId ? event.markets.find((m) => m.clobTokenIds.includes(item.tokenId!)) : undefined

  if (byToken) return { event, marketId: byToken.id, outcomeIndex: byToken.clobTokenIds.indexOf(item.tokenId!) }

  const bySlug = event.markets.find((m) => m.slug === item.slug)

  return bySlug ? { event, marketId: bySlug.id, outcomeIndex: item.outcomeIndex ?? 0 } : null
}

export default PolyMarketPage
