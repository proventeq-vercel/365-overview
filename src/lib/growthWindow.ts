const DAY_MS = 86_400_000

export const GROWTH_WINDOW_DAYS = 28
export const OLDEST_DETAIL_REPORT_DAYS = 29

const dayOf = (isoDate: string): number => Date.parse(`${isoDate}T00:00:00Z`)
const isoDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10)

export function growthBaselineDate(reportRefreshDate: string, today: Date): string {
  const todayMs = dayOf(today.toISOString().slice(0, 10))
  const refresh = dayOf(reportRefreshDate)
  const reference = Number.isNaN(refresh) ? todayMs : refresh
  const wanted = reference - GROWTH_WINDOW_DAYS * DAY_MS
  const oldest = todayMs - OLDEST_DETAIL_REPORT_DAYS * DAY_MS
  return isoDay(wanted < oldest && oldest < reference ? oldest : wanted)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((dayOf(to) - dayOf(from)) / DAY_MS)
}
