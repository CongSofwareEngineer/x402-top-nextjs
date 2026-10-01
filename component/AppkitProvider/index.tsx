'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit } from '@reown/appkit/react'
import { type ReactNode } from 'react'
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi'

import { CHAIN_SUPPORT, DEFAULT_NETWORK, projectId, wagmiAdapter } from '@/config/appkit'
import { KEYRING_PRO_WALLET } from '@/constants/keyringPro'
import { useReCustomWeb3Modal } from '@/hooks/useReCustomWeb3Modal'

// Set up queryClient
const queryClient = new QueryClient()

if (!projectId) {
  throw new Error('Project ID is not defined')
}

// Set up metadata
const metadata = {
  name: 'appkit-example',
  description: 'AppKit Example',
  url: 'https://appkitexampleapp.com', // origin must match your domain & subdomain
  icons: ['https://avatars.githubusercontent.com/u/179229932'],
}

// Create the modal
export const appkit = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [...CHAIN_SUPPORT] as any,
  defaultNetwork: DEFAULT_NETWORK,
  metadata: metadata,
  features: {
    analytics: true, // Optional - defaults to your Cloud configuration
  },
  enableReconnect: true,
  allowUnsupportedChain: true,
  featuredWalletIds: [KEYRING_PRO_WALLET.id],
  // customWallets: [KEYRING_PRO_WALLET],
})

function AppkitProvider({ children, cookies }: { children: ReactNode; cookies: string | null }) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies)

  useReCustomWeb3Modal()

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}

export default AppkitProvider
