const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

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
  return new Intl.NumberFormat().format(n)
}
