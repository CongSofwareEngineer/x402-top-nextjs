'use client'

import { type ReactNode } from 'react'
import { useAppKitAccount, useAppKitNetwork, useAppKit } from '@reown/appkit/react'
import { base, baseSepolia } from '@reown/appkit/networks'

export type TabType = 'markets' | 'trade' | 'profile' | 'history'

interface PolymarketLayoutProps {
  children: ReactNode
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export function PolymarketLayout({ children, activeTab, onTabChange }: PolymarketLayoutProps) {
  const { address, isConnected } = useAppKitAccount()
  const { chainId, switchNetwork } = useAppKitNetwork()
  const { open } = useAppKit()

  const tabs: { id: TabType; label: string; icon: ReactNode }[] = [
    { id: 'markets', label: 'Markets', icon: '📊' },
    { id: 'trade', label: 'Trade', icon: '💹' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'history', label: 'History', icon: '📜' },
  ]

  const handleConnect = () => {
    open({ view: 'Connect' })
  }

  const handleSwitchNetwork = async () => {
    try {
      await switchNetwork(base)
    } catch (error) {
      console.error('Failed to switch network:', error)
    }
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <header className='bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between h-16'>
            <div className='flex items-center gap-8'>
              <h1 className='text-xl font-bold text-gray-900 dark:text-white'>Polymarket</h1>
              <nav className='flex items-center gap-1'>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
            <div className='flex items-center gap-4'>
              {!isConnected ? (
                <button onClick={handleConnect} className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700'>
                  Connect Wallet
                </button>
              ) : (
                <div className='flex items-center gap-3'>
                  {address && (
                    <span className='text-sm text-gray-600 dark:text-gray-400 font-mono'>
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </span>
                  )}

                  <button
                    onClick={() => open({ view: 'Account' })}
                    className='px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600'
                  >
                    Account
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>{children}</main>
    </div>
  )
}
