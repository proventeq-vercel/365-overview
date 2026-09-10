import { describe, expect, it } from 'vitest'
import { topNWithOther } from './topNWithOther'

interface Site {
  url: string
  links: number
}

const SITES: Site[] = [
  { url: 'alpha', links: 5 },
  { url: 'bravo', links: 50 },
  { url: 'charlie', links: 20 },
  { url: 'delta', links: 3 },
  { url: 'echo', links: 2 },
]

const label = (s: Site) => s.url
const value = (s: Site) => s.links

describe('topNWithOther', () => {
  it('returns the highest values first', () => {
    expect(topNWithOther(SITES, 3, label, value)).toEqual([
      { label: 'bravo', value: 50 },
      { label: 'charlie', value: 20 },
      { label: 'alpha', value: 5 },
      { label: 'Other', value: 5 },
    ])
  })

  it('omits Other when every item fits', () => {
    expect(topNWithOther(SITES, 5, label, value)).toHaveLength(5)
    expect(topNWithOther(SITES, 9, label, value).map((s) => s.label)).not.toContain('Other')
  })

  it('omits Other when the remainder sums to zero', () => {
    const withZeroes: Site[] = [
      { url: 'alpha', links: 4 },
      { url: 'bravo', links: 0 },
      { url: 'charlie', links: 0 },
    ]
    expect(topNWithOther(withZeroes, 1, label, value)).toEqual([{ label: 'alpha', value: 4 }])
  })

  it('leaves the input array untouched', () => {
    const input = [...SITES]
    topNWithOther(input, 2, label, value)
    expect(input.map((s) => s.url)).toEqual(['alpha', 'bravo', 'charlie', 'delta', 'echo'])
  })

  it('returns nothing for a non-positive n', () => {
    expect(topNWithOther(SITES, 0, label, value)).toEqual([])
  })
})
