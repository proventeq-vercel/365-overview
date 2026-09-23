import { describe, expect, it } from 'vitest'
import { capacityRatio, shareOf } from './share'

describe('shareOf', () => {
  it('is the part over the whole', () => {
    expect(shareOf(250, 1000)).toBe(0.25)
  })

  it('is zero of an empty whole rather than a division by zero', () => {
    expect(shareOf(0, 0)).toBe(0)
  })
})

describe('capacityRatio', () => {
  it('is the storage used over the allocation', () => {
    expect(capacityRatio({ storageUsedBytes: 900, allocatedBytes: 1000 })).toBe(0.9)
  })

  it('is unknown for a row with no allocation, which SharePoint rows never carry', () => {
    expect(capacityRatio({ storageUsedBytes: 900 })).toBeNull()
    expect(capacityRatio({ storageUsedBytes: 900, allocatedBytes: 0 })).toBeNull()
  })
})
