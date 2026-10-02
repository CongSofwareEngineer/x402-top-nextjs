/** Display formatting only — market logic lives in the SDK (`services/polymarket`). */

import { DISPLAY_TIME_ZONE } from '@/constants/polymarket'

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

/**
 * API dates are UTC — always shown in `DISPLAY_TIME_ZONE`, whatever the viewer's
 * browser timezone is, so testers on any machine read the same time.
 */
const DATE_PARTS_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: DISPLAY_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZoneName: 'shortOffset',
})

function dateParts(value: string | number | Date) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return null

  return Object.fromEntries(DATE_PARTS_FORMAT.formatToParts(date).map((p) => [p.type, p.value])) as Record<Intl.DateTimeFormatPartTypes, string>
}

/** Date (ISO string / ms / Date) → `DD/MM/YYYY` in `DISPLAY_TIME_ZONE`; empty for invalid input. */
export function formatDate(value: string | number | Date) {
  const p = dateParts(value)

  return p ? `${p.day}/${p.month}/${p.year}` : ''
}

/** Date → `DD/MM/YYYY HH:mm GMT+7` in `DISPLAY_TIME_ZONE`; empty for invalid input. */
export function formatDateTime(value: string | number | Date) {
  const p = dateParts(value)

  return p ? `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute} ${p.timeZoneName}` : ''
}
