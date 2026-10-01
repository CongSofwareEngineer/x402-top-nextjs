'use client'

import type { Address } from 'viem'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppKitAccount } from '@reown/appkit/react'
import { useChainId, useSwitchChain, useWalletClient } from 'wagmi'
import { polygon } from 'viem/chains'

import { usePolyMarketWalletAddress } from './account'

import { STORAGE_KEYS } from '@/constants/polymarket'
import { ClobSession, type ClobCredentials } from '@/services/polymarket'
import { connectSecureClient, toClobCredentials, type PolymarketSecureClient } from '@/services/polymarket/secure'

const storageKey = (address: string) => `${STORAGE_KEYS.CLOB_CREDENTIALS}:${address.toLowerCase()}`
const loginKey = (address: string) => `${STORAGE_KEYS.LOGIN}:${address.toLowerCase()}`

export function loadCredentials(address: string | undefined): ClobCredentials | null {
  if (!address || typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(storageKey(address))

    if (!raw) return null
    const parsed = JSON.parse(raw) as ClobCredentials

    if (parsed.apiKey && parsed.secret && parsed.passphrase) return parsed

    return null
  } catch {
    return null
  }
}

export function saveCredentials(address: string, credentials: ClobCredentials) {
  try {
    window.localStorage.setItem(storageKey(address), JSON.stringify(credentials))
  } catch {
    // storage unavailable (private mode) — credentials stay in memory only
  }
}

export function loadLoginFlag(address: string | undefined): boolean {
  if (!address || typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(loginKey(address)) === '1'
  } catch {
    return false
  }
}

export function saveLoginFlag(address: string) {
  try {
    window.localStorage.setItem(loginKey(address), '1')
  } catch {
    // ignore
  }
}

/**
 * EIP-712 domains for ClobAuth / Deposit Wallet batches use chainId 137 and
 * most wallets refuse to sign them while connected to another chain.
 */
export function useEnsurePolygon() {
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()

  return useCallback(async () => {
    if (chainId !== polygon.id) {
      await switchChainAsync({ chainId: polygon.id })
    }
  }, [chainId, switchChainAsync])
}

export interface ClobSessionResult {
  session: ClobSession | null
  isAuthenticated: boolean
  isLoading: boolean
  error: Error | null
  authenticate: () => Promise<ClobCredentials>
  address: string | undefined
}

/**
 * Derive + cache the L2 CLOB credentials for the connected wallet.
 *
 * The first call signs an EIP-712 `ClobAuth` message with the connected
 * wallet; the returned apiKey/secret/passphrase are cached in localStorage.
 */
export function useClobSession(): ClobSessionResult {
  const { address, isConnected } = useAppKitAccount()
  const { data: walletClient } = useWalletClient()
  const { data: wallet } = usePolyMarketWalletAddress()
  const ensurePolygon = useEnsurePolygon()

  const [credentials, setCredentials] = useState<ClobCredentials | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (isConnected) {
      setCredentials(loadCredentials(address))
    } else {
      setCredentials(null)
    }
    setError(null)
  }, [address, isConnected])

  const authenticate = useCallback(async (): Promise<ClobCredentials> => {
    if (!address || !walletClient) throw new Error('Wallet not connected')
    if (!wallet) throw new Error('Polymarket wallet not resolved yet')
    setIsLoading(true)
    setError(null)
    try {
      await ensurePolygon()
      const client = await connectSecureClient({ walletClient, wallet: wallet })
      const creds = toClobCredentials(client)

      saveCredentials(address, creds)
      setCredentials(creds)

      return creds
    } catch (err) {
      const wrapped = err instanceof Error ? err : new Error(String(err))

      setError(wrapped)
      throw wrapped
    } finally {
      setIsLoading(false)
    }
  }, [address, walletClient, wallet, ensurePolygon])

  const session = useMemo(() => (credentials && address ? new ClobSession(credentials, address as Address) : null), [credentials, address])

  return { session, isAuthenticated: !!session, isLoading, error, authenticate, address }
}

/** One SecureClient per signer + account wallet, shared by every component. */
const secureClients = new Map<string, Promise<PolymarketSecureClient>>()

/**
 * Lazily connect the `@polymarket/client` SecureClient acting on the account
 * wallet (Deposit Wallet / Safe) — needed for anything that moves funds held
 * there (market sells, redeems). Reuses the cached CLOB credentials from
 * onboarding, so normally no extra signature is asked for.
 */
export function usePolymarketSecureClient() {
  const { address } = useAppKitAccount()
  const { data: walletClient } = useWalletClient()
  const { data: wallet } = usePolyMarketWalletAddress()
  const ensurePolygon = useEnsurePolygon()

  return useCallback(async (): Promise<PolymarketSecureClient> => {
    if (!address || !walletClient) throw new Error('Wallet not connected')
    if (!wallet) throw new Error('Polymarket wallet not resolved yet')

    await ensurePolygon()

    const key = `${address}:${wallet}`.toLowerCase()
    const cached = secureClients.get(key)

    if (cached) return cached

    const pending = connectSecureClient({ walletClient, wallet, credentials: loadCredentials(address) }).then((client) => {
      saveCredentials(address, toClobCredentials(client))

      return client
    })

    secureClients.set(key, pending)
    pending.catch(() => secureClients.delete(key))

    return pending
  }, [address, walletClient, wallet, ensurePolygon])
}
