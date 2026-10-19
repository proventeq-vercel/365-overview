import { describe, expect, it } from 'vitest'
import { storageBreakdown } from './storageBreakdown'

const empty = {
  sharePointUsedBytes: 0,
  oneDriveUsedBytes: 0,
  teamsBytes: 0,
  inactiveBytes: 0,
  deletedSiteBytes: 0,
  deletedDriveBytes: 0,
  deletedCount: 0,
  freeBytes: 0,
}

describe('storageBreakdown', () => {
  it('gives every part a zero share, not a division by zero, on an empty tenant', () => {
    const breakdown = storageBreakdown(empty)
    expect(breakdown.totalBytes).toBe(0)
    expect(breakdown.segments.map((segment) => segment.share)).toEqual([0, 0, 0, 0, 0, 0, 0])
  })

  it('takes deleted OneDrives out of the OneDrive part and puts them in the deleted part', () => {
    const breakdown = storageBreakdown({ ...empty, oneDriveUsedBytes: 100, deletedDriveBytes: 30, deletedSiteBytes: 5 })
    const bytes = Object.fromEntries(breakdown.segments.map((segment) => [segment.key, segment.bytes]))
    expect(bytes.oneDrive).toBe(70)
    expect(bytes.deleted).toBe(35)
    expect(bytes.sharePoint).toBe(0)
  })

  it('never measures versions', () => {
    const breakdown = storageBreakdown({ ...empty, sharePointUsedBytes: 100 })
    expect(breakdown.segments.find((segment) => segment.key === 'versions')).toEqual({
      key: 'versions',
      bytes: null,
      share: 0,
    })
  })
})
