/** Display formatting only — market logic lives in the SDK (`services/polymarket`). */

/** Polymarket-style compact volume: `$2.1m`, `$540k`, `$12`. */
export function formatVolume(num: number) {
  if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}b`
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}m`
  if (num >= 1e3) return `$${Math.round(num / 1e3)}k`

  return `$${Math.round(num)}`
}

export function formatUsd(num: number) {
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Probability (0..1) → `59%`, `<1%`, `>99%`. */
export function formatChance(price: number) {
  const pct = price * 100

  if (pct > 0 && pct < 1) return '<1%'
  if (pct > 99 && pct < 100) return '>99%'

  return `${Math.round(pct)}%`
}

/** Price (0..1) → `59.4¢`. */
export function formatCents(price: number) {
  const cents = price * 100

  return `${Number.isInteger(Math.round(cents * 10) / 10) ? cents.toFixed(0) : cents.toFixed(1)}¢`
}

export const formatSignedUsd = (value: number) => `${value >= 0 ? '+' : '-'}${formatUsd(Math.abs(value))}`
