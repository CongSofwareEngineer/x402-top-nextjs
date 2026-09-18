import { API_POLYMARKET } from '@/config/polymarket'

export class PolymarketApiError extends Error {
  status: number
  details?: string

  constructor(status: number, message: string, details?: string) {
    super(message)
    this.name = 'PolymarketApiError'
    this.status = status
    this.details = details
  }
}

/** Shared JSON client used against all Polymarket public APIs. */
export async function requestJson<T>(baseUrl: string, path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let details: string | undefined

    try {
      const parsed = JSON.parse(text) as { error?: string; errorMsg?: string; message?: string }

      details = parsed.error ?? parsed.errorMsg ?? parsed.message
    } catch {
      details = text.slice(0, 500)
    }
    throw new PolymarketApiError(response.status, details || `HTTP ${response.status}`, text)
  }

  return response.json() as Promise<T>
}

export function baseUrl(api: keyof typeof API_POLYMARKET): string {
  return API_POLYMARKET[api]
}

/** Convert a possibly-string / null numeric value to a finite number. */
export function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback
  const n = typeof value === 'string' ? parseFloat(value) : Number(value)

  return Number.isFinite(n) ? n : fallback
}

/** Parse a JSON-encoded array string (Gamma stores arrays as strings). */
export function parseJsonArray<T>(value: unknown, fallback: T[] = []): T[] {
  if (Array.isArray(value)) return value as T[]
  if (typeof value !== 'string') return fallback
  try {
    const parsed: unknown = JSON.parse(value)

    return Array.isArray(parsed) ? (parsed as T[]) : fallback
  } catch {
    return fallback
  }
}

export function parseBigIntString(value: unknown, fallback = 0): number {
  if (typeof value !== 'string') return fallback
  try {
    return Number(BigInt(value))
  } catch {
    return fallback
  }
}
