import { describe, it, expect } from 'vitest'
import { parseSubscribedSkus } from './licensing'

describe('parseSubscribedSkus', () => {
  it('computes available seats', () => {
    const skus = parseSubscribedSkus([
      { skuId: '1', skuPartNumber: 'ENTERPRISEPACK', consumedUnits: 80, prepaidUnits: { enabled: 100 } },
    ])
    expect(skus[0]).toEqual({ skuId: '1', skuPartNumber: 'ENTERPRISEPACK', consumed: 80, enabled: 100, available: 20 })
  })

  it('handles multiple skus', () => {
    const skus = parseSubscribedSkus([
      { skuId: 'a', skuPartNumber: 'SKU_A', consumedUnits: 10, prepaidUnits: { enabled: 50 } },
      { skuId: 'b', skuPartNumber: 'SKU_B', consumedUnits: 0, prepaidUnits: { enabled: 0 } },
    ])
    expect(skus).toHaveLength(2)
    expect(skus[0].available).toBe(40)
    expect(skus[1].available).toBe(0)
  })

  it('handles empty input', () => {
    expect(parseSubscribedSkus([])).toEqual([])
  })
})
