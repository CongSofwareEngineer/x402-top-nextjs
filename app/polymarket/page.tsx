'use client'

import { useState } from 'react'

import { PolymarketLayout, type TabType } from '@/component/polymarket/PolymarketLayout'
import { MarketsTab } from '@/component/polymarket/MarketsTab'
import { TradeTab, type TradeSelection } from '@/component/polymarket/TradeTab'
import { ProfileTab } from '@/component/polymarket/ProfileTab'
import { HistoryTab } from '@/component/polymarket/HistoryTab'

const PolyMarketPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>('markets')
  const [selection, setSelection] = useState<TradeSelection | null>(null)

  const handleSelect = (next: TradeSelection) => {
    setSelection(next)
    setActiveTab('trade')
  }

  return (
    <PolymarketLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'markets' && <MarketsTab onSelect={handleSelect} />}
      {activeTab === 'trade' &&
        (selection ? (
          <TradeTab key={`${selection.event.id}-${selection.marketId}-${selection.outcomeIndex}`} selection={selection} />
        ) : (
          <div className='text-center py-12 text-gray-500 dark:text-gray-400'>Select a market from the Markets tab to start trading.</div>
        ))}
      {activeTab === 'profile' && <ProfileTab />}
      {activeTab === 'history' && <HistoryTab />}
    </PolymarketLayout>
  )
}

export default PolyMarketPage
