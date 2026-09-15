'use client'

import type { Address } from 'viem'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppKitAccount } from '@reown/appkit/react'
import { useSignTypedData } from 'wagmi'

import { STORAGE_KEYS } from '@/constants/polymarket'
import { ClobSession, deriveClobCredentials, type ClobCredentials, type SignTypedData } from '@/services/polymarket'

const storageKey = (address: string) => `${STORAGE_KEYS.CLOB_CREDENTIALS}:${address.toLowerCase()}`

function loadCredentials(address: string | undefined): ClobCredentials | null {
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
  const { signTypedDataAsync } = useSignTypedData()

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
    if (!address) throw new Error('Wallet not connected')
    setIsLoading(true)
    setError(null)
    try {
      const creds = await deriveClobCredentials(address, signTypedDataAsync as SignTypedData)

      window.localStorage.setItem(storageKey(address), JSON.stringify(creds))
      setCredentials(creds)

      return creds
    } catch (err) {
      const wrapped = err instanceof Error ? err : new Error(String(err))

      setError(wrapped)
      throw wrapped
    } finally {
      setIsLoading(false)
    }
  }, [address, signTypedDataAsync])

  const session = useMemo(() => (credentials && address ? new ClobSession(credentials, address as Address) : null), [credentials, address])

  return { session, isAuthenticated: !!session, isLoading, error, authenticate, address }
}
