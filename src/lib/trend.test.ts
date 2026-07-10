import { describe, it, expect } from 'vitest'
import { percentDelta } from './trend'

describe('percentDelta', () => {
  it('computes percent change from first to last', () => {
    expect(percentDelta([100, 110])).toBeCloseTo(10)
    expect(percentDelta([200, 150])).toBeCloseTo(-25)
  })
  it('returns null for fewer than two points', () => {
    expect(percentDelta([5])).toBeNull()
    expect(percentDelta([])).toBeNull()
  })
  it('returns null when the first value is zero', () => {
    expect(percentDelta([0, 50])).toBeNull()
  })
})
