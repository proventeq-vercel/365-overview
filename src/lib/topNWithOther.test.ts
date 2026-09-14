import { describe, it, expect } from 'vitest'
import { topNWithOther } from './topNWithOther'

const items = [
  { name: 'a', bytes: 100 },
  { name: 'b', bytes: 50 },
  { name: 'c', bytes: 30 },
  { name: 'd', bytes: 20 },
  { name: 'e', bytes: 10 },
]
const value = (i: (typeof items)[number]) => i.bytes
const label = (i: (typeof items)[number]) => i.name

describe('topNWithOther', () => {
  it('keeps the top N and folds the tail into Other', () => {
    expect(topNWithOther(items, 3, value, label)).toEqual([
      { name: 'a', value: 100 },
      { name: 'b', value: 50 },
      { name: 'c', value: 30 },
      { name: 'Other', value: 30 },
    ])
  })

  it('adds no Other slice when the list fits', () => {
    expect(topNWithOther(items.slice(0, 2), 3, value, label)).toEqual([
      { name: 'a', value: 100 },
      { name: 'b', value: 50 },
    ])
  })

  it('sorts descending regardless of input order', () => {
    const shuffled = [items[3], items[0], items[2]]
    expect(topNWithOther(shuffled, 2, value, label).map((s) => s.name)).toEqual([
      'a',
      'c',
      'Other',
    ])
  })

  it('omits an Other slice that would be zero', () => {
    const withZeroTail = [...items.slice(0, 2), { name: 'z', bytes: 0 }]
    expect(topNWithOther(withZeroTail, 2, value, label)).toHaveLength(2)
  })

  it('uses the caller-supplied label for the tail slice', () => {
    expect(topNWithOther(items, 2, value, label, 'All other sites').at(-1)).toEqual({
      name: 'All other sites',
      value: 60,
    })
  })

  it('leaves the caller array untouched', () => {
    const input = [items[3], items[0], items[2]]
    topNWithOther(input, 2, value, label)
    expect(input.map((i) => i.name)).toEqual(['d', 'a', 'c'])
  })

  it('returns an empty array for no items', () => {
    expect(topNWithOther([], 3, value, label)).toEqual([])
  })
})
