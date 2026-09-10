import type { Slice } from '@/types/storage'

export function topNWithOther<T>(
  items: T[],
  n: number,
  value: (item: T) => number,
  label: (item: T) => string,
  otherLabel = 'Other',
): Slice[] {
  const sorted = [...items].sort((a, b) => value(b) - value(a))
  const head = sorted.slice(0, n).map((item) => ({ name: label(item), value: value(item) }))
  const tail = sorted.slice(n).reduce((sum, item) => sum + value(item), 0)
  return tail > 0 ? [...head, { name: otherLabel, value: tail }] : head
}
