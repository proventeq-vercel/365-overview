import { describe, expect, it } from 'vitest'
import { storageBreakdown } from './storageBreakdown'

const empty = {
  sharePointUsedBytes: 0,
  teamsBytes: 0,
  inactiveBytes: 0,
  deletedSiteBytes: 0,
  deletedCount: 0,
  freeBytes: 0,
  siteFiguresRead: true,
}

describe('storageBreakdown', () => {
  it('gives every part a zero share, not a division by zero, on an empty tenant', () => {
    const breakdown = storageBreakdown(empty)
    expect(breakdown.totalBytes).toBe(0)
    expect(breakdown.segments.map((segment) => segment.share)).toEqual([0, 0, 0, 0, 0])
  })

  it('draws only SharePoint storage against the SharePoint entitlement', () => {
    const breakdown = storageBreakdown({ ...empty, sharePointUsedBytes: 100, deletedSiteBytes: 5, freeBytes: 900 })
    const bytes = Object.fromEntries(breakdown.segments.map((segment) => [segment.key, segment.bytes]))
    expect(bytes).toEqual({ sharePoint: 95, teams: 0, deleted: 5, inactive: 0, free: 900 })
    expect(breakdown.totalBytes).toBe(1000)
  })

  it('leaves the free part out, never an unknown one, when the entitlement is unknown', () => {
    const breakdown = storageBreakdown({ ...empty, sharePointUsedBytes: 100, freeBytes: null })
    expect(breakdown.segments.map((segment) => segment.key)).toEqual([
      'sharePoint',
      'teams',
      'deleted',
      'inactive',
    ])
    expect(breakdown.totalBytes).toBe(100)
  })

  it('draws SharePoint storage as one part when the site usage report did not come back', () => {
    const breakdown = storageBreakdown({ ...empty, sharePointUsedBytes: 100, freeBytes: 900, siteFiguresRead: false })
    expect(breakdown.segments.map((segment) => [segment.key, segment.bytes])).toEqual([
      ['sharePoint', 100],
      ['free', 900],
    ])
  })

  it('has no versions segment', () => {
    const breakdown = storageBreakdown({ ...empty, sharePointUsedBytes: 100 })
    expect(breakdown.segments.map((segment) => String(segment.key))).not.toContain('versions')
  })
})
