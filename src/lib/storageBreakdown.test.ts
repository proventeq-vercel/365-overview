import { describe, expect, it } from 'vitest'
import { storageBreakdown } from './storageBreakdown'

const empty = {
  sharePointUsedBytes: 0,
  teamsBytes: 0,
  inactiveBytes: 0,
  deletedSiteBytes: 0,
  deletedCount: 0,
  freeBytes: 0,
}

describe('storageBreakdown', () => {
  it('gives every part a zero share, not a division by zero, on an empty tenant', () => {
    const breakdown = storageBreakdown(empty)
    expect(breakdown.totalBytes).toBe(0)
    expect(breakdown.segments.map((segment) => segment.share)).toEqual([0, 0, 0, 0, 0, 0])
  })

  it('draws only SharePoint storage against the SharePoint entitlement', () => {
    const breakdown = storageBreakdown({ ...empty, sharePointUsedBytes: 100, deletedSiteBytes: 5, freeBytes: 900 })
    const bytes = Object.fromEntries(breakdown.segments.map((segment) => [segment.key, segment.bytes]))
    expect(bytes).toEqual({ sharePoint: 95, teams: 0, deleted: 5, inactive: 0, versions: null, free: 900 })
    expect(breakdown.totalBytes).toBe(1000)
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
