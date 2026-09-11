const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const
const REPORT_LOCALE = 'en-GB'

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < UNITS.length - 1) {
    value /= 1024
    unitIndex++
  }
  const formatted = value.toFixed(1).replace(/\.0$/, '')
  return `${formatted} ${UNITS[unitIndex]}`
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat(REPORT_LOCALE).format(n)
}

export function formatPercent(ratio: number, digits = 0): string {
  return `${(ratio * 100).toFixed(digits)}%`
}

export function formatSignedPercent(pct: number, digits = 1): string {
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(digits)}%`
}

export function formatLongMonthYear(isoDate: string): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return isoDate
  return new Intl.DateTimeFormat(REPORT_LOCALE, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
}
