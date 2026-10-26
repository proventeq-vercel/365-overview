const DAY_MS = 86_400_000

export const OLDEST_DETAIL_REPORT_DAYS = 26

const dayOf = (isoDate: string): number => Date.parse(`${isoDate}T00:00:00Z`)
const isoDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10)

export function growthWindowDates(reportRefreshDate: string, today: Date): string[] {
  const todayMs = dayOf(today.toISOString().slice(0, 10))
  const refresh = dayOf(reportRefreshDate)
  const last = Number.isNaN(refresh) ? todayMs : Math.min(refresh, todayMs)
  const first = todayMs - OLDEST_DETAIL_REPORT_DAYS * DAY_MS
  if (last <= first) return []
  return Array.from({ length: (last - first) / DAY_MS + 1 }, (_, i) => isoDay(first + i * DAY_MS))
}

export function daysBetween(from: string, to: string): number {
  return Math.round((dayOf(to) - dayOf(from)) / DAY_MS)
}
