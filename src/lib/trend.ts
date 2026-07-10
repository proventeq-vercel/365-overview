/** Percent change from the first to the last point (e.g. 14.8).
 *  Returns null if there are fewer than two points or the first is zero. */
export function percentDelta(series: number[]): number | null {
  if (series.length < 2) return null
  const first = series[0]
  const last = series[series.length - 1]
  if (first === 0) return null
  return ((last - first) / first) * 100
}
