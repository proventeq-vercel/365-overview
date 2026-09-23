export type HealthStatus = 'healthy' | 'watch' | 'attention'

export interface Thresholds {
  watch: number
  attention: number
}

export const STORAGE_THRESHOLDS: Thresholds = { watch: 0.85, attention: 0.95 }

export function utilizationStatus(
  used: number,
  total: number,
  t: Thresholds,
): HealthStatus {
  if (total <= 0) return 'healthy'
  const ratio = used / total
  if (ratio >= t.attention) return 'attention'
  if (ratio >= t.watch) return 'watch'
  return 'healthy'
}
