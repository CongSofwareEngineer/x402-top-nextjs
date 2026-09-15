'use client'

import type { Market } from '@/services/polymarket'

import { useState } from 'react'

import { PolymarketLayout, type TabType } from '@/component/polymarket/PolymarketLayout'
import { MarketsTab } from '@/component/polymarket/MarketsTab'
import { TradeTab } from '@/component/polymarket/TradeTab'
import { ProfileTab } from '@/component/polymarket/ProfileTab'
import { HistoryTab } from '@/component/polymarket/HistoryTab'

const PolyMarketPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>('markets')
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null)

  const handleMarketSelect = (market: Market) => {
    setSelectedMarket(market)
    setActiveTab('trade')
  }

  return (
    <PolymarketLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'markets' && <MarketsTab onMarketSelect={handleMarketSelect} />}
      {activeTab === 'trade' &&
        (selectedMarket ? (
          <TradeTab market={selectedMarket} />
        ) : (
          <div className='text-center py-12 text-gray-500 dark:text-gray-400'>Select a market from the Markets tab to start trading.</div>
        ))}
      {activeTab === 'profile' && <ProfileTab />}
      {activeTab === 'history' && <HistoryTab />}
    </PolymarketLayout>
  )
}

export default PolyMarketPage
