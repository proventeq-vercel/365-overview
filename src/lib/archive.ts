import type { StorageRow } from '@/types/storage'
import type { HealthStatus } from './thresholds'

export const ARCHIVE_WATCH_SHARE = 0.05
export const ARCHIVE_ATTENTION_SHARE = 0.5

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function inactiveSince(asOf: string, years: number, today: Date): string {
  const reference = ISO_DATE.test(asOf) ? asOf : today.toISOString().slice(0, 10)
  const [year, month, day] = reference.split('-').map(Number)
  return new Date(Date.UTC(year - years, month - 1, day)).toISOString().slice(0, 10)
}

export function isInactiveSince(row: StorageRow, cutoff: string): boolean {
  return row.lastActivityDate !== null && row.lastActivityDate < cutoff
}

export function archiveStatus(share: number): HealthStatus {
  if (share > ARCHIVE_ATTENTION_SHARE) return 'attention'
  if (share > ARCHIVE_WATCH_SHARE) return 'watch'
  return 'healthy'
}
