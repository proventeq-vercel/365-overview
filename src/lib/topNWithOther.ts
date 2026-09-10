export interface TopNSlice {
  label: string
  value: number
}

export const OTHER_LABEL = 'Other'

export function topNWithOther<T>(
  items: T[],
  n: number,
  label: (item: T) => string,
  value: (item: T) => number,
): TopNSlice[] {
  if (n < 1) return []
  const sorted = [...items].sort((a, b) => value(b) - value(a))
  const top = sorted.slice(0, n).map((item) => ({ label: label(item), value: value(item) }))
  if (sorted.length <= n) return top
  const otherValue = sorted.slice(n).reduce((sum, item) => sum + value(item), 0)
  if (otherValue <= 0) return top
  return [...top, { label: OTHER_LABEL, value: otherValue }]
}
